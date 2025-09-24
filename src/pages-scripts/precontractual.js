/**
 * @fileoverview Script principal para la página de seguimiento precontractual
 * Maneja la visualización de datos de seguimiento precontractual con vistas timeline, gantt y analytics
 */

import { Auth } from '../lib/auth.js';
import { APP_CONFIG } from '../lib/config.js';

class PrecontractualManager {
    constructor() {
        this.data = [];
        this.filteredData = [];
        this.currentView = 'timeline';
        this.charts = {};
        this.ganttInstance = null;
        
        // Verificar autenticación
        if (!Auth.isAuthenticated()) {
            window.location.href = '/src/pages/login.html';
            return;
        }
        
        this.init();
    }
    
    async init() {
        try {
            this.setupEventListeners();
            await this.loadData();
            this.renderView();
        } catch (error) {
            console.error('Error initializing precontractual manager:', error);
            this.showError('Error al cargar la página');
        }
    }
    
    setupEventListeners() {
        // Tabs
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const tabId = e.target.id || e.target.closest('button').id;
                const view = tabId.replace('tab-', '');
                this.switchView(view);
            });
        });
        
        // Filtros
        document.getElementById('candidateFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('stageFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('statusFilter').addEventListener('change', () => this.applyFilters());
        
        // Refresh button
        document.getElementById('refreshData').addEventListener('click', () => this.loadData());
        
        // Sample data button
        document.getElementById('loadSampleData').addEventListener('click', () => this.loadSampleData());
    }
    
    async loadData() {
        this.showLoading(true);
        
        try {
            // Intentar cargar datos reales
            const [precontractualData, personasData] = await Promise.all([
                this.fetchPrecontractualData(),
                this.fetchPersonasData()
            ]);
            
            // Combinar datos
            this.data = this.processData(precontractualData, personasData);
            this.filteredData = [...this.data];
            
            // Actualizar filtros
            this.updateFilters();

            // Aplicar filtro desde localStorage (si proviene del dashboard)
            try {
                const raw = localStorage.getItem('precontractual_filtro');
                if (raw) {
                    const filtro = JSON.parse(raw);
                    if (filtro && filtro.tipo === 'persona' && filtro.valor) {
                        // Buscar el nombre del candidato por persona_id y aplicarlo en el select
                        const match = this.data.find(d => d.persona_id === filtro.valor);
                        if (match && match.nombrePersona) {
                            const candidateSelect = document.getElementById('candidateFilter');
                            if (candidateSelect) {
                                // Asegurar que las opciones ya fueron pobladas
                                // Las opciones usan el nombre como value
                                const nombre = match.nombrePersona;
                                // Si existe la opción correspondiente, setear y aplicar filtros
                                const opt = Array.from(candidateSelect.options).find(o => o.value === nombre);
                                if (opt) {
                                    candidateSelect.value = nombre;
                                    this.applyFilters();
                                }
                            }
                        }
                    }
                    // Borrar el filtro para no reaplicarlo en recargas subsecuentes
                    localStorage.removeItem('precontractual_filtro');
                }
            } catch (e) {
                console.warn('Error aplicando precontractual_filtro desde localStorage:', e);
            }
            
            // Actualizar métricas
            this.updateMetrics();
            
            // Renderizar vista actual
            this.renderView();
            
        } catch (error) {
            console.error('Error loading data:', error);
            
            // Si no hay datos reales, mostrar opción de usar datos de prueba
            if (this.data.length === 0) {
                this.showNoDataMessage();
            } else {
                this.showError('Error al cargar los datos');
            }
        } finally {
            this.showLoading(false);
        }
    }
    
    showNoDataMessage() {
        const container = document.querySelector('main .max-w-7xl');
        const noDataDiv = document.createElement('div');
        noDataDiv.id = 'no-data-message';
        noDataDiv.className = 'bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6';
        noDataDiv.innerHTML = `
            <div class="flex items-center">
                <span class="material-icons text-yellow-600 mr-3">info</span>
                <div class="flex-1">
                    <h3 class="text-lg font-medium text-yellow-800">No hay datos precontractuales disponibles</h3>
                    <p class="text-yellow-700 mt-1">
                        No se encontraron datos en el sistema. Puedes usar datos de prueba para explorar la funcionalidad
                        o verificar que el servidor esté configurado correctamente.
                    </p>
                </div>
                <button id="loadSampleDataInline" class="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 ml-4">
                    Cargar datos de prueba
                </button>
            </div>
        `;
        
        // Insertar después del header
        const header = container.querySelector('.mb-6');
        header.parentNode.insertBefore(noDataDiv, header.nextSibling);
        
        // Agregar event listener
        document.getElementById('loadSampleDataInline').addEventListener('click', () => {
            // Remover mensaje
            noDataDiv.remove();
            // Cargar datos de prueba
            this.loadSampleData();
        });
    }
    
    async fetchPrecontractualData() {
        const response = await fetch(`${APP_CONFIG.BASE_URL}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                path: 'listPrecontractual',
                payload: {}
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        if (!result.ok) {
            throw new Error(result.error || 'Error fetching precontractual data');
        }
        
        return result.items || [];
    }
    
    async fetchPersonasData() {
        const response = await fetch(`${APP_CONFIG.BASE_URL}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                path: 'listPersonas',
                payload: {}
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        if (!result.ok) {
            throw new Error(result.error || 'Error fetching personas data');
        }
        
        return result.items || [];
    }
    
    processData(precontractualData, personasData) {
        // Crear un mapa de personas para acceso rápido
        const personasMap = new Map();
        
        // Debug: verificar la estructura de personas
        console.log('Estructura de personasData:', personasData.slice(0, 2));
        
        personasData.forEach(persona => {
            personasMap.set(persona.persona_id, persona);
        });
        
        console.log('PersonasMap creado:', Array.from(personasMap.entries()).slice(0, 2));
        
        // Agrupar datos por persona_id
        const groupedData = new Map();
        
        precontractualData.forEach(item => {
            const personaId = item.persona_id;
            if (!groupedData.has(personaId)) {
                const personaInfo = personasMap.get(personaId);
                console.log(`Buscando persona ${personaId}:`, personaInfo);
                
                // Intentar diferentes campos para el nombre
                let nombrePersona = 'Persona sin nombre';
                if (personaInfo) {
                    nombrePersona = personaInfo.nombre_completo || 
                                  personaInfo.Nombre || 
                                  personaInfo.nombre || 
                                  personaInfo.NombreCompleto ||
                                  `Persona ${personaId}`;
                }
                
                groupedData.set(personaId, {
                    persona: personaInfo || { persona_id: personaId },
                    nombrePersona: nombrePersona,
                    etapas: new Map()
                });
            }
            
            const personData = groupedData.get(personaId);
            const etapa = item.Etapa;
            
            if (!personData.etapas.has(etapa)) {
                personData.etapas.set(etapa, {
                    etapa: etapa,
                    eventos: [],
                    estado: 'En proceso',
                    fechaInicio: null,
                    fechaFin: null,
                    duracionDias: 0,
                    intento: 1
                });
            }
            
            personData.etapas.get(etapa).eventos.push(item);
        });
        
        // Procesar cada etapa para calcular duraciones y estados
        const processedData = [];
        
        groupedData.forEach((personData, personaId) => {
            const candidato = {
                persona_id: personaId,
                nombre: personData.nombrePersona,
                etapas: [],
                tiempoTotal: 0,
                estadoGeneral: 'En proceso'
            };
            
            personData.etapas.forEach((etapaData, etapaNombre) => {
                const etapa = this.processEtapa(etapaData);
                candidato.etapas.push(etapa);
                candidato.tiempoTotal += etapa.duracionDias;
            });
            
            // Determinar estado general
            const todasFinalizadas = candidato.etapas.every(e => e.estado === 'Finalizado');
            candidato.estadoGeneral = todasFinalizadas ? 'Finalizado' : 'En proceso';
            
            processedData.push(candidato);
        });
        
        console.log('Datos procesados:', processedData.slice(0, 2));
        return processedData;
    }
    
    processEtapa(etapaData) {
        const eventos = etapaData.eventos.sort((a, b) => new Date(a.Fecha) - new Date(b.Fecha));
        
        // Encontrar todas las fechas de la etapa
        const fechasEtapa = eventos.map(e => new Date(e.Fecha));
        
        // Encontrar fecha más temprana (inicio) y más tardía (fin) de toda la etapa
        const fechaInicio = fechasEtapa.length > 0 ? new Date(Math.min(...fechasEtapa)) : null;
        const fechaFin = fechasEtapa.length > 0 ? new Date(Math.max(...fechasEtapa)) : null;
        
        // Calcular duración usando la fecha más temprana y más tardía
        let duracionDias = 0;
        if (fechaInicio && fechaFin) {
            duracionDias = Math.ceil((fechaFin - fechaInicio) / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir ambos días
        } else if (fechaInicio) {
            // Si no hay fecha de fin, usar fecha actual para etapas en proceso
            duracionDias = Math.ceil((new Date() - fechaInicio) / (1000 * 60 * 60 * 24));
        }
        
        // Determinar estado basándose en si todas las fases están finalizadas
        const eventosFin = eventos.filter(e => e.Estado === 'Finalizado');
        const estado = eventosFin.length === eventos.length ? 'Finalizado' : 'En proceso';
        
        return {
            etapa: etapaData.etapa,
            estado: estado,
            fechaInicio: fechaInicio,
            fechaFin: estado === 'Finalizado' ? fechaFin : null,
            duracionDias: duracionDias,
            eventos: eventos,
            intento: Math.max(...eventos.map(e => e.Intento || 1))
        };
    }
    
    updateFilters() {
        // Obtener valores únicos para los filtros
        const candidatos = [...new Set(this.data.map(d => d.nombre))].sort();
        const etapas = [...new Set(this.data.flatMap(d => d.etapas.map(e => e.etapa)))].sort();
        
        // Actualizar select de candidatos
        const candidateSelect = document.getElementById('candidateFilter');
        candidateSelect.innerHTML = '<option value="">Todos los candidatos</option>';
        candidatos.forEach(nombre => {
            candidateSelect.innerHTML += `<option value="${nombre}">${nombre}</option>`;
        });
        
        // Actualizar select de etapas
        const stageSelect = document.getElementById('stageFilter');
        stageSelect.innerHTML = '<option value="">Todas las etapas</option>';
        etapas.forEach(etapa => {
            stageSelect.innerHTML += `<option value="${etapa}">${etapa}</option>`;
        });
    }
    
    applyFilters() {
        const candidateFilter = document.getElementById('candidateFilter').value;
        const stageFilter = document.getElementById('stageFilter').value;
        const statusFilter = document.getElementById('statusFilter').value;
        
        this.filteredData = this.data.filter(candidato => {
            // Filtro por candidato
            if (candidateFilter && candidato.nombre !== candidateFilter) {
                return false;
            }
            
            // Filtro por estado general
            if (statusFilter && candidato.estadoGeneral !== statusFilter) {
                return false;
            }
            
            // Filtro por etapa (si el candidato tiene esa etapa)
            if (stageFilter) {
                const tieneEtapa = candidato.etapas.some(e => e.etapa === stageFilter);
                if (!tieneEtapa) {
                    return false;
                }
            }
            
            return true;
        });
        
        this.updateMetrics();
        this.renderView();
    }
    
    updateMetrics() {
        const data = this.filteredData;
        
        // Total candidatos
        document.getElementById('totalCandidates').textContent = data.length;
        
        // En proceso vs Finalizados
        const enProceso = data.filter(d => d.estadoGeneral === 'En proceso').length;
        const finalizados = data.filter(d => d.estadoGeneral === 'Finalizado').length;
        
        document.getElementById('inProgressCount').textContent = enProceso;
        document.getElementById('completedCount').textContent = finalizados;
        
        // Tiempo promedio
        const tiempos = data.map(d => d.tiempoTotal).filter(t => t > 0);
        const promedio = tiempos.length > 0 ? Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length) : 0;
        document.getElementById('averageTime').textContent = promedio;
    }
    
    switchView(view) {
        // Actualizar tabs
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active', 'border-blue-500', 'text-blue-600');
            btn.classList.add('border-transparent', 'text-gray-500');
        });
        
        document.getElementById(`tab-${view}`).classList.add('active', 'border-blue-500', 'text-blue-600');
        document.getElementById(`tab-${view}`).classList.remove('border-transparent', 'text-gray-500');
        
        // Ocultar todos los contenidos
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });
        
        // Mostrar contenido seleccionado
        document.getElementById(`content-${view}`).classList.remove('hidden');
        
        this.currentView = view;
        this.renderView();
    }
    
    renderView() {
        switch (this.currentView) {
            case 'timeline':
                this.renderTimeline();
                break;
            case 'progreso':
                this.renderProgreso();
                break;
            case 'analytics':
                this.renderAnalytics();
                break;
        }
    }
    
    renderTimeline() {
        const container = document.getElementById('candidateTimeline');
        
        if (this.filteredData.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <span class="material-icons text-6xl text-gray-300 mb-4">timeline</span>
                    <p class="text-gray-500 text-lg">No hay datos para mostrar</p>
                    <p class="text-gray-400 text-sm">Intenta ajustar los filtros o verifica que haya datos precontractuales registrados</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        
        this.filteredData.forEach((candidato, index) => {
            const maxDuracion = Math.max(...candidato.etapas.map(e => e.duracionDias));
            
            html += `
                <div class="candidate-timeline-item bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-4">
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center">
                            <div class="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold mr-3">
                                ${index + 1}
                            </div>
                            <h3 class="text-lg font-semibold text-gray-900">${candidato.nombre}</h3>
                        </div>
                        <div class="flex items-center space-x-3">
                            <span class="status-badge status-${candidato.estadoGeneral.toLowerCase().replace(' ', '-')}">
                                <span class="status-indicator ${candidato.estadoGeneral.toLowerCase().replace(' ', '-')}"></span>
                                ${candidato.estadoGeneral}
                            </span>
                            <div class="text-right">
                                <p class="text-sm text-gray-500">Tiempo total</p>
                                <p class="text-lg font-semibold text-gray-900">${candidato.tiempoTotal} días</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="stage-timeline">
            `;
            
            candidato.etapas.forEach((etapa, etapaIndex) => {
                const width = maxDuracion > 0 ? Math.max((etapa.duracionDias / maxDuracion) * 100, 15) : 15;
                const fechaInicio = etapa.fechaInicio ? etapa.fechaInicio.toLocaleDateString('es-ES') : '-';
                const fechaFin = etapa.fechaFin ? etapa.fechaFin.toLocaleDateString('es-ES') : 'En curso';
                
                html += `
                    <div class="stage-item">
                        <div class="stage-label tooltip" data-tooltip="Etapa ${etapaIndex + 1} de ${candidato.etapas.length}">
                            ${etapa.etapa}
                        </div>
                        <div class="stage-bar-container">
                            <div class="stage-bar-fill stage-${etapa.estado.toLowerCase().replace(' ', '-')}" 
                                 style="width: ${width}%"
                                 title="${etapa.duracionDias} días - ${fechaInicio} a ${fechaFin}">
                                ${etapa.duracionDias}d
                            </div>
                        </div>
                        <div class="stage-duration">
                            <div class="text-xs text-gray-500">${fechaInicio}</div>
                            <div class="text-xs text-gray-600">${fechaFin}</div>
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                    
                    <div class="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-sm text-gray-500">
                        <span>${candidato.etapas.length} etapa${candidato.etapas.length !== 1 ? 's' : ''}</span>
                        <span>Promedio: ${Math.round(candidato.tiempoTotal / candidato.etapas.length)} días por etapa</span>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }
    
    renderProgreso() {
        const container = document.getElementById('progreso-content');
        
        if (this.filteredData.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <span class="material-icons text-6xl text-gray-300 mb-4">people_outline</span>
                    <p class="text-gray-500 text-lg">No hay candidatos para mostrar</p>
                    <p class="text-gray-400 text-sm">El progreso se mostrará cuando haya datos precontractuales disponibles</p>
                </div>
            `;
            return;
        }
        
        // Generar las tarjetas de progreso por candidato
        const candidatosHtml = this.filteredData.map(candidato => {
            const totalEtapas = candidato.etapas.length;
            const etapasFinalizadas = candidato.etapas.filter(e => e.estado === 'Finalizado').length;
            const porcentajeProgreso = totalEtapas > 0 ? Math.round((etapasFinalizadas / totalEtapas) * 100) : 0;
            
            // Determinar estado general
            let estadoGeneral = 'En proceso';
            let estadoColor = 'yellow';
            if (etapasFinalizadas === totalEtapas && totalEtapas > 0) {
                estadoGeneral = 'Completado';
                estadoColor = 'green';
            } else if (etapasFinalizadas === 0) {
                estadoGeneral = 'Sin iniciar';
                estadoColor = 'gray';
            }
            
            // Generar timeline de etapas
            const etapasHtml = candidato.etapas.map((etapa, index) => {
                const fechaInicio = etapa.fechaInicio ? etapa.fechaInicio.toLocaleDateString('es-CO') : 'N/A';
                const fechaFin = etapa.fechaFin ? etapa.fechaFin.toLocaleDateString('es-CO') : 'En progreso';
                
                // Agrupar eventos por fase
                const fasesPorNombre = new Map();
                (etapa.eventos || []).forEach(evento => {
                    const fase = evento.Fase || 'Sin clasificar';
                    if (!fasesPorNombre.has(fase)) {
                        fasesPorNombre.set(fase, []);
                    }
                    fasesPorNombre.get(fase).push(evento);
                });
                
                const fasesHtml = Array.from(fasesPorNombre.entries()).map(([fase, eventos]) => {
                    const ultimoEvento = eventos.sort((a, b) => new Date(b.Fecha) - new Date(a.Fecha))[0];
                    const estadoFase = ultimoEvento ? ultimoEvento.Estado : 'Pendiente';
                    
                    return `
                        <div class="fase-item" data-candidato="${candidato.persona_id}" data-etapa="${etapa.etapa}" data-fase="${fase}">
                            <div class="fase-header">
                                <div class="fase-nombre">${fase}</div>
                                <div class="fase-estado ${estadoFase.toLowerCase().replace(' ', '-')}">${estadoFase}</div>
                            </div>
                            <div class="fase-eventos-count">${eventos.length} evento${eventos.length !== 1 ? 's' : ''}</div>
                        </div>
                    `;
                }).join('');
                
                return `
                    <div class="etapa-card ${etapa.estado.toLowerCase().replace(' ', '-')}" data-candidato="${candidato.persona_id}" data-etapa="${etapa.etapa}">
                        <div class="etapa-header">
                            <div class="etapa-info">
                                <h4 class="etapa-titulo">${etapa.etapa}</h4>
                                <div class="etapa-metadata">
                                    <span class="etapa-duracion">
                                        <span class="material-icons">schedule</span>
                                        ${etapa.duracionDias} días
                                    </span>
                                    <span class="etapa-estado ${etapa.estado.toLowerCase().replace(' ', '-')}">${etapa.estado}</span>
                                </div>
                            </div>
                            <button class="etapa-toggle" onclick="this.closest('.etapa-card').classList.toggle('expanded')">
                                <span class="material-icons">expand_more</span>
                            </button>
                        </div>
                        
                        <div class="etapa-progress">
                            <div class="progress-line ${etapa.estado.toLowerCase().replace(' ', '-')}"></div>
                            <div class="progress-dates">
                                <span class="fecha-inicio">${fechaInicio}</span>
                                <span class="fecha-fin">${fechaFin}</span>
                            </div>
                        </div>
                        
                        <div class="etapa-details">
                            <div class="fases-section">
                                <h5>Fases de la Etapa</h5>
                                <div class="fases-list">
                                    ${fasesHtml.length > 0 ? fasesHtml : '<p class="no-fases">No hay fases registradas</p>'}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            
            return `
                <div class="candidato-card">
                    <div class="candidato-header">
                        <div class="candidato-info">
                            <h3 class="candidato-nombre">
                                <span class="material-icons">person</span>
                                ${candidato.nombre}
                            </h3>
                            <div class="candidato-stats">
                                <span class="total-tiempo">
                                    <span class="material-icons">timer</span>
                                    Total: ${candidato.tiempoTotal} días
                                </span>
                                <span class="estado-general ${estadoColor}">
                                    <span class="material-icons">flag</span>
                                    ${estadoGeneral}
                                </span>
                            </div>
                        </div>
                        <div class="progreso-general">
                            <div class="progreso-circular">
                                <svg width="60" height="60" viewBox="0 0 60 60">
                                    <circle cx="30" cy="30" r="25" fill="none" stroke="#e5e7eb" stroke-width="4"/>
                                    <circle cx="30" cy="30" r="25" fill="none" stroke="${estadoColor === 'green' ? '#10b981' : estadoColor === 'yellow' ? '#f59e0b' : '#6b7280'}" 
                                            stroke-width="4" stroke-dasharray="${157.08 * porcentajeProgreso / 100} 157.08" 
                                            stroke-dashoffset="0" transform="rotate(-90 30 30)"/>
                                </svg>
                                <div class="progreso-texto">${porcentajeProgreso}%</div>
                            </div>
                            <div class="progreso-stats">
                                <div class="stat-completadas">${etapasFinalizadas}/${totalEtapas} etapas</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="candidato-timeline">
                        ${etapasHtml}
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = candidatosHtml;
        
        // Agregar event listeners para interactividad
        this.addProgresoEventListeners();
    }
    
    addProgresoEventListeners() {
        // Event listeners para fases
        document.querySelectorAll('.fase-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const candidatoId = item.dataset.candidato;
                const etapa = item.dataset.etapa;
                const fase = item.dataset.fase;
                
                this.showFaseDetails(candidatoId, etapa, fase);
            });
        });
    }
    
    showFaseDetails(candidatoId, etapaNombre, faseNombre) {
        // Encontrar el candidato y la etapa
        const candidato = this.filteredData.find(c => c.persona_id === candidatoId);
        if (!candidato) return;
        
        const etapa = candidato.etapas.find(e => e.etapa === etapaNombre);
        if (!etapa) return;
        
        // Encontrar eventos de la fase
        const eventosFase = (etapa.eventos || []).filter(evento => 
            (evento.Fase || 'Sin clasificar') === faseNombre
        );
        
        // Crear modal o panel de detalles
        const modal = document.createElement('div');
        modal.className = 'fase-modal';
        modal.innerHTML = `
            <div class="fase-modal-content">
                <div class="fase-modal-header">
                    <h3>${faseNombre}</h3>
                    <button class="close-modal" onclick="this.closest('.fase-modal').remove()">
                        <span class="material-icons">close</span>
                    </button>
                </div>
                <div class="fase-modal-body">
                    <div class="candidato-etapa">
                        <strong>Candidato:</strong> ${candidato.nombre}<br>
                        <strong>Etapa:</strong> ${etapaNombre}
                    </div>
                    <div class="eventos-list">
                        ${eventosFase.map(evento => `
                            <div class="evento-detalle">
                                <div class="evento-fecha">${new Date(evento.Fecha).toLocaleDateString('es-CO')}</div>
                                <div class="evento-estado ${evento.Estado.toLowerCase().replace(' ', '-')}">${evento.Estado}</div>
                                ${evento.Evento ? `<div class="evento-tipo">${evento.Evento}</div>` : ''}
                                ${evento.Responsable ? `<div class="evento-responsable">Responsable: ${evento.Responsable}</div>` : ''}
                                ${evento.Observaciones ? `<div class="evento-observaciones">${evento.Observaciones}</div>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Cerrar modal al hacer clic fuera
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    renderAnalytics() {
        this.renderStageChart();
        this.renderStatusChart();
        this.renderBottlenecks();
        this.renderTimeRanking();
    }
    
    renderStageChart() {
        const ctx = document.getElementById('stageChart').getContext('2d');
        
        // Calcular duración promedio por etapa
        const etapasData = new Map();
        
        this.filteredData.forEach(candidato => {
            candidato.etapas.forEach(etapa => {
                if (!etapasData.has(etapa.etapa)) {
                    etapasData.set(etapa.etapa, []);
                }
                etapasData.get(etapa.etapa).push(etapa.duracionDias);
            });
        });
        
        const labels = Array.from(etapasData.keys());
        const data = labels.map(etapa => {
            const tiempos = etapasData.get(etapa);
            return tiempos.reduce((a, b) => a + b, 0) / tiempos.length;
        });
        
        if (this.charts.stageChart) {
            this.charts.stageChart.destroy();
        }
        
        this.charts.stageChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Días promedio',
                    data: data,
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Días'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Etapas'
                        }
                    }
                }
            }
        });
    }
    
    renderStatusChart() {
        const ctx = document.getElementById('statusChart').getContext('2d');
        
        const enProceso = this.filteredData.filter(d => d.estadoGeneral === 'En proceso').length;
        const finalizados = this.filteredData.filter(d => d.estadoGeneral === 'Finalizado').length;
        
        if (this.charts.statusChart) {
            this.charts.statusChart.destroy();
        }
        
        this.charts.statusChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['En proceso', 'Finalizados'],
                datasets: [{
                    data: [enProceso, finalizados],
                    backgroundColor: [
                        'rgba(251, 191, 36, 0.8)',
                        'rgba(16, 185, 129, 0.8)'
                    ],
                    borderColor: [
                        'rgba(251, 191, 36, 1)',
                        'rgba(16, 185, 129, 1)'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
    
    renderBottlenecks() {
        const container = document.getElementById('bottlenecksList');
        
        // Calcular etapas más lentas
        const etapasData = new Map();
        
        this.filteredData.forEach(candidato => {
            candidato.etapas.forEach(etapa => {
                if (!etapasData.has(etapa.etapa)) {
                    etapasData.set(etapa.etapa, []);
                }
                etapasData.get(etapa.etapa).push(etapa.duracionDias);
            });
        });
        
        const bottlenecks = Array.from(etapasData.entries())
            .map(([etapa, tiempos]) => ({
                etapa,
                promedio: tiempos.reduce((a, b) => a + b, 0) / tiempos.length,
                maximo: Math.max(...tiempos),
                cantidad: tiempos.length
            }))
            .sort((a, b) => b.promedio - a.promedio)
            .slice(0, 5);
        
        let html = '';
        bottlenecks.forEach((item, index) => {
            html += `
                <div class="flex items-center justify-between py-3 ${index < bottlenecks.length - 1 ? 'border-b border-gray-200' : ''}">
                    <div>
                        <p class="font-medium">${item.etapa}</p>
                        <p class="text-sm text-gray-600">${item.cantidad} casos</p>
                    </div>
                    <div class="text-right">
                        <p class="font-semibold">${Math.round(item.promedio)} días</p>
                        <p class="text-sm text-gray-600">máx: ${item.maximo} días</p>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html || '<p class="text-gray-500">No hay datos suficientes</p>';
    }
    
    renderTimeRanking() {
        const container = document.getElementById('timeRankingList');
        
        const ranking = [...this.filteredData]
            .sort((a, b) => b.tiempoTotal - a.tiempoTotal)
            .slice(0, 10);
        
        let html = '';
        ranking.forEach((candidato, index) => {
            html += `
                <div class="flex items-center justify-between py-3 ${index < ranking.length - 1 ? 'border-b border-gray-200' : ''}">
                    <div class="flex items-center">
                        <span class="bg-gray-100 text-gray-600 text-sm font-semibold px-2 py-1 rounded mr-3">${index + 1}</span>
                        <div>
                            <p class="font-medium">${candidato.nombre}</p>
                            <p class="text-sm text-gray-600">${candidato.etapas.length} etapas</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="font-semibold">${candidato.tiempoTotal} días</p>
                        <span class="status-badge status-${candidato.estadoGeneral.toLowerCase().replace(' ', '-')}">${candidato.estadoGeneral}</span>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html || '<p class="text-gray-500">No hay datos para mostrar</p>';
    }
    
    showLoading(show) {
        const loading = document.getElementById('loading');
        if (show) {
            loading.classList.remove('hidden');
        } else {
            loading.classList.add('hidden');
        }
    }
    
    async loadSampleData() {
        this.showLoading(true);
        
        try {
            // Simular datos de prueba
            const samplePrecontractual = this.generateSamplePrecontractualData();
            const samplePersonas = this.generateSamplePersonasData();
            
            // Procesar datos simulados
            this.data = this.processData(samplePrecontractual, samplePersonas);
            this.filteredData = [...this.data];
            
            // Actualizar interfaz
            this.updateFilters();
            this.updateMetrics();
            this.renderView();
            
            // Mostrar mensaje de éxito
            this.showSuccess('Datos de prueba cargados correctamente');
            
        } catch (error) {
            console.error('Error loading sample data:', error);
            this.showError('Error al cargar los datos de prueba');
        } finally {
            this.showLoading(false);
        }
    }
    
    generateSamplePrecontractualData() {
        const personas = ['PERS-001', 'PERS-002', 'PERS-003', 'PERS-004', 'PERS-005'];
        const etapas = ['Creación', 'Solicitud CDP', 'Exámenes médicos', 'Contratación', 'Finalización'];
        const fases = {
            'Creación': ['10 Inicio', '20 Elaboración', '30 Revisión', '40 Finalización'],
            'Solicitud CDP': ['10 Solicitud', '20 Revisión presupuestal', '30 Aprobación'],
            'Exámenes médicos': ['10 Programación', '20 Realización', '30 Resultados'],
            'Contratación': ['10 Elaboración contrato', '20 Revisión jurídica', '30 Firma'],
            'Finalización': ['10 Entrega documentos', '20 Cierre administrativo']
        };
        
        const eventos = [];
        let eventId = 1;
        
        personas.forEach(personaId => {
            etapas.forEach((etapa, etapaIndex) => {
                const fasesEtapa = fases[etapa];
                const fechaBaseEtapa = new Date();
                fechaBaseEtapa.setDate(fechaBaseEtapa.getDate() - (30 * (etapas.length - etapaIndex)));
                
                fasesEtapa.forEach((fase, faseIndex) => {
                    const fechaEvento = new Date(fechaBaseEtapa);
                    fechaEvento.setDate(fechaEvento.getDate() + (faseIndex * Math.random() * 5));
                    
                    // Determinar estado basado en la fecha
                    const esUltimaFase = faseIndex === fasesEtapa.length - 1;
                    const esEtapaReciente = etapaIndex >= etapas.length - 2;
                    const estado = esUltimaFase && !esEtapaReciente ? 'Finalizado' : 
                                  Math.random() > 0.3 ? 'Finalizado' : 'En proceso';
                    
                    eventos.push({
                        pre_id: `PRE-${eventId++}`,
                        persona_id: personaId,
                        Etapa: etapa,
                        Fase: fase,
                        Estado: estado,
                        Evento: faseIndex === 0 ? 'Inicio' : (esUltimaFase ? 'Finalización' : 'Avance'),
                        Intento: 1,
                        Fecha: fechaEvento.toISOString().split('T')[0],
                        Responsable: 'admin@ungrd.gov.co',
                        Observaciones: `Evento ${faseIndex + 1} de la etapa ${etapa}`,
                        Evidencia_URL: ''
                    });
                });
            });
        });
        
        return eventos;
    }
    
    generateSamplePersonasData() {
        const nombres = [
            'Juan Carlos Rodríguez Pérez',
            'María Elena Gómez Vargas',
            'Luis Fernando Castro López',
            'Ana Patricia Jiménez Morales',
            'Carlos Eduardo Vargas Sánchez'
        ];
        
        return nombres.map((nombre, index) => ({
            persona_id: `PERS-${String(index + 1).padStart(3, '0')}`,
            nombre_completo: nombre,
            cedula: `1000000${index + 1}`,
            email: `${nombre.toLowerCase().replace(/\s+/g, '.')}@example.com`,
            telefono: `300${Math.floor(Math.random() * 1000000).toString().padStart(7, '0')}`
        }));
    }
    
    showError(message) {
        this.showToast(message, 'error');
    }
    
    showSuccess(message) {
        this.showToast(message, 'success');
    }
    
    showToast(message, type = 'info') {
        // Crear elemento toast
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full`;
        
        // Estilos según tipo
        const styles = {
            success: 'bg-green-500 text-white',
            error: 'bg-red-500 text-white',
            info: 'bg-blue-500 text-white'
        };
        
        toast.className += ` ${styles[type] || styles.info}`;
        toast.textContent = message;
        
        // Agregar al DOM
        document.body.appendChild(toast);
        
        // Animar entrada
        setTimeout(() => {
            toast.classList.remove('translate-x-full');
        }, 100);
        
        // Remover después de 3 segundos
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new PrecontractualManager();
});

// Agregar estilos CSS para las clases del timeline
const style = document.createElement('style');
style.textContent = `
    .vis-item.gantt-completed {
        background-color: #10b981 !important;
        border-color: #059669 !important;
        color: white !important;
    }
    
    .vis-item.gantt-in-progress {
        background-color: #f59e0b !important;
        border-color: #d97706 !important;
        color: white !important;
    }
    
    .tab-button.active {
        border-color: #3b82f6 !important;
        color: #3b82f6 !important;
    }
    
    .vis-timeline {
        font-family: system-ui, -apple-system, sans-serif !important;
    }
`;
document.head.appendChild(style);
