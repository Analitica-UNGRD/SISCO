/**
 * @fileoverview Script principal para la página de seguimiento precontractual
 * Maneja la visualización de datos de seguimiento precontractual con vistas timeline, gantt y analytics
 */

import { Auth } from '../lib/auth.js';
import { APP_CONFIG } from '../lib/config.js';
import { showLoader, hideLoader } from '../lib/loader.js';
import { stripLeadingNumber } from '../lib/ui.js';

const SPECIAL_EVENT_VARIANTS = [
    {
        key: 'correccion',
        matchers: ['solicitud de correccion', 'solicitud de corrección', 'correccion solicitada'],
        displayLabel: 'Corrección solicitada',
        badge: 'Solicitud de corrección',
        className: 'variant-correccion'
    },
    {
        key: 'subsanacion',
        matchers: ['solicitud de subsanacion', 'solicitud de subsanación', 'subsanacion solicitada'],
        displayLabel: 'Subsanación solicitada',
        badge: 'Solicitud de subsanación',
        className: 'variant-subsanacion'
    },
    {
        key: 'ajuste',
        matchers: ['solicitud de ajuste', 'solicitud de ajustes', 'ajuste solicitado'],
        displayLabel: 'Ajuste solicitado',
        badge: 'Solicitud de ajuste',
        className: 'variant-ajuste'
    }
];

const SPECIAL_EVENT_LOOKUP = new Map();
const FINALIZING_EVENT_KEYWORDS = [
    'finalizado',
    'finalizacion',
    'finalización',
    'cierre administrativo',
    'cierre etapa',
    'cierre del proceso',
    'cierre de etapa'
].map(normalizeEventName);

const RESPONSABLE_GROUPS = {
    'Jefe': 'OAPI',
    'Abogada': 'OAPI',
    'Secretaría General y Contratación': 'Secretaría General y Contratación',
    'GAFC': 'GAFC',
    'Talento Humano': 'Talento Humano',
    'Fiduprevisora': 'Fiduprevisora',
    'Contratista': 'Contratista',
    'Sin responsable asignado': 'Sin asignar'
};

const GROUP_COLORS = {
    'OAPI': '#2563eb',
    'Secretaría General y Contratación': '#0ea5e9',
    'GAFC': '#f59e0b',
    'Talento Humano': '#10b981',
    'Fiduprevisora': '#8b5cf6',
    'Contratista': '#ef4444',
    'Sin asignar': '#6b7280'
};

const PHASE_RESPONSABLES = [
    // Creación
    { etapa: 'Creacion', fase: 10, responsable: 'Jefe' },
    { etapa: 'Creacion', fase: 20, responsable: 'Jefe' },
    { etapa: 'Creacion', fase: 30, responsable: 'Jefe' },
    { etapa: 'Creacion', fase: 40, responsable: 'Sin responsable asignado' },
    { etapa: 'Creacion', fase: 50, responsable: 'Sin responsable asignado' },
    { etapa: 'Creacion', fase: 55, responsable: 'Jefe' },
    { etapa: 'Creacion', fase: 60, responsable: 'Sin responsable asignado' },

    // Solicitud CDP
    { etapa: 'Solicitud CDP', fase: 10, responsable: 'Sin responsable asignado' },
    { etapa: 'Solicitud CDP', fase: 20, responsable: 'Jefe' },
    { etapa: 'Solicitud CDP', fase: 30, responsable: 'Jefe' },
    { etapa: 'Solicitud CDP', fase: 40, responsable: 'Jefe' },
    { etapa: 'Solicitud CDP', fase: 50, responsable: 'Jefe' },
    { etapa: 'Solicitud CDP', fase: 60, responsable: 'Secretaría General y Contratación' },
    { etapa: 'Solicitud CDP', fase: 70, responsable: 'Secretaría General y Contratación' },
    { etapa: 'Solicitud CDP', fase: 80, responsable: 'GAFC' },
    { etapa: 'Solicitud CDP', fase: 90, responsable: 'GAFC' },
    { etapa: 'Solicitud CDP', fase: 100, responsable: 'Talento Humano' },
    { etapa: 'Solicitud CDP', fase: 110, responsable: 'Talento Humano' },

    // SIGEP (fases compartidas con contratista)
    { etapa: 'SIGEP', fase: 10, responsable: 'Secretaría General y Contratación' },
    { etapa: 'SIGEP', fase: 20, responsable: 'Secretaría General y Contratación / Contratista' },
    { etapa: 'SIGEP', fase: 30, responsable: 'Secretaría General y Contratación / Contratista' },
    { etapa: 'SIGEP', fase: 40, responsable: 'Secretaría General y Contratación / Contratista' },
    { etapa: 'SIGEP', fase: 50, responsable: 'Secretaría General y Contratación / Contratista' },
    { etapa: 'SIGEP', fase: 60, responsable: 'Secretaría General y Contratación' },

    // Exámenes Médicos (fases compartidas con contratista)
    { etapa: 'Examenes Medicos', fase: 10, responsable: 'Talento Humano / Contratista' },
    { etapa: 'Examenes Medicos', fase: 20, responsable: 'Talento Humano / Contratista' },
    { etapa: 'Examenes Medicos', fase: 30, responsable: 'Talento Humano / Contratista' },
    { etapa: 'Examenes Medicos', fase: 40, responsable: 'Talento Humano' },

    // Revisión
    { etapa: 'Revision', fase: 10, responsable: 'Abogada' },
    { etapa: 'Revision', fase: 20, responsable: 'Abogada' },
    { etapa: 'Revision', fase: 30, responsable: 'Contratista' },
    { etapa: 'Revision', fase: 40, responsable: 'Abogada' },
    { etapa: 'Revision', fase: 45, responsable: 'Jefe' },
    { etapa: 'Revision', fase: 50, responsable: 'Abogada' },
    { etapa: 'Revision', fase: 60, responsable: 'Abogada' },

    // Fiduprevisora
    { etapa: 'Fiduprevisora', fase: 10, responsable: 'Fiduprevisora' },
    { etapa: 'Fiduprevisora', fase: 20, responsable: 'Fiduprevisora' },
    { etapa: 'Fiduprevisora', fase: 30, responsable: 'Fiduprevisora' },
    { etapa: 'Fiduprevisora', fase: 40, responsable: 'Fiduprevisora' },
    { etapa: 'Fiduprevisora', fase: 50, responsable: 'Fiduprevisora' },
    { etapa: 'Fiduprevisora', fase: 60, responsable: 'Fiduprevisora' },
    { etapa: 'Fiduprevisora', fase: 70, responsable: 'Fiduprevisora' },
    { etapa: 'Fiduprevisora', fase: 80, responsable: 'Fiduprevisora' },
    { etapa: 'Fiduprevisora', fase: 90, responsable: 'Fiduprevisora' },
    { etapa: 'Fiduprevisora', fase: 100, responsable: 'Fiduprevisora' },
    { etapa: 'Fiduprevisora', fase: 110, responsable: 'Fiduprevisora' },
    { etapa: 'Fiduprevisora', fase: 120, responsable: 'Fiduprevisora' },

    // GGC – Registro Presupuestal
    { etapa: 'GGC-Registro Presupuestal', fase: 10, responsable: 'Sin responsable asignado' },
    { etapa: 'GGC-Registro Presupuestal', fase: 20, responsable: 'Sin responsable asignado' },
    { etapa: 'GGC-Registro Presupuestal', fase: 30, responsable: 'Sin responsable asignado' },

    // Acta de Inicio y Designación de Supervisión
    { etapa: 'Acta de Inicio y Designacion de Supervision', fase: 10, responsable: 'Sin responsable asignado' },
    { etapa: 'Acta de Inicio y Designacion de Supervision', fase: 20, responsable: 'Sin responsable asignado' },
    { etapa: 'Acta de Inicio y Designacion de Supervision', fase: 30, responsable: 'Sin responsable asignado' },
    { etapa: 'Acta de Inicio y Designacion de Supervision', fase: 40, responsable: 'Sin responsable asignado' },
    { etapa: 'Acta de Inicio y Designacion de Supervision', fase: 50, responsable: 'Jefe' },
    { etapa: 'Acta de Inicio y Designacion de Supervision', fase: 60, responsable: 'Sin responsable asignado' }
];

const RESPONSABLE_LOOKUP = buildPhaseResponsableLookup(PHASE_RESPONSABLES);

function normalizeEventName(name) {
    return (name || '')
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
}

SPECIAL_EVENT_VARIANTS.forEach(variant => {
    variant.matchers.forEach(alias => {
        SPECIAL_EVENT_LOOKUP.set(normalizeEventName(alias), variant);
    });
});

function getVariantForEvent(eventName) {
    return SPECIAL_EVENT_LOOKUP.get(normalizeEventName(eventName)) || null;
}

function normalizeEtapaKey(name = '') {
    return normalizeEventName(name)
        .replace(/[^a-z0-9]/gi, '')
        .trim();
}

function extractPhaseNumber(faseLabel) {
    if (faseLabel === null || faseLabel === undefined) return NaN;
    if (typeof faseLabel === 'number') return Number(faseLabel);
    const match = String(faseLabel).trim().match(/^(\d+)/);
    return match ? Number(match[1]) : NaN;
}

function parseResponsablesList(responsable = '') {
    return String(responsable || '')
        .split('/')
        .map(r => r.trim())
        .filter(Boolean);
}

function resolveResponsableGroup(responsable = '') {
    const responsables = parseResponsablesList(responsable);
    const primary = responsables[0] || '';
    return RESPONSABLE_GROUPS[primary] || 'Sin asignar';
}

function resolveResponsableGroups(responsable = '') {
    const responsables = Array.isArray(responsable) ? responsable : parseResponsablesList(responsable);
    const grupos = responsables.map(r => RESPONSABLE_GROUPS[r] || 'Sin asignar');
    return [...new Set(grupos.length ? grupos : ['Sin asignar'])];
}

function buildPhaseResponsableLookup(items = []) {
    const map = new Map();
    items.forEach(item => {
        const key = `${normalizeEtapaKey(item.etapa)}#${item.fase}`;
        const responsables = parseResponsablesList(item.responsable);
        const grupos = resolveResponsableGroups(responsables);
        map.set(key, {
            responsable: responsables[0] || 'Sin responsable asignado',
            grupo: grupos[0] || 'Sin asignar',
            responsables: responsables.length ? responsables : ['Sin responsable asignado'],
            grupos: grupos.length ? grupos : ['Sin asignar']
        });
    });
    return map;
}

function getPhaseResponsible(etapaNombre, faseLabel) {
    const numero = extractPhaseNumber(faseLabel);
    if (Number.isNaN(numero)) {
        return {
            responsable: 'Sin responsable asignado',
            grupo: 'Sin asignar',
            responsables: ['Sin responsable asignado'],
            grupos: ['Sin asignar']
        };
    }
    const key = `${normalizeEtapaKey(etapaNombre)}#${numero}`;
    return RESPONSABLE_LOOKUP.get(key) || {
        responsable: 'Sin responsable asignado',
        grupo: 'Sin asignar',
        responsables: ['Sin responsable asignado'],
        grupos: ['Sin asignar']
    };
}

function getGroupColor(nombreGrupo) {
    return GROUP_COLORS[nombreGrupo] || GROUP_COLORS['Sin asignar'];
}

function isFinalizingEvent(eventName = '') {
    const normalized = normalizeEventName(eventName);
    if (!normalized) {
        return false;
    }

    return FINALIZING_EVENT_KEYWORDS.some(keyword => normalized.includes(keyword));
}

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
        
        // Clear filters button
        document.getElementById('clearFilters').addEventListener('click', () => this.clearFilters());
    }
    
    async loadData() {
    this.showLoading(true, 'Cargando procesos precontractuales...');
        
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
            this.showError('Error al cargar los datos');
        } finally {
            this.showLoading(false);
        }
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

            candidato.tiempoPorGrupo = this.aggregateGroupTotals(candidato.etapas, 'tiempoPorGrupo');
            candidato.tiempoPorGrupoVisible = this.aggregateGroupTotals(candidato.etapas, 'tiempoPorGrupoVisible');
            
            // Determinar estado general
            const todasFinalizadas = candidato.etapas.every(e => e.estado === 'Finalizado');
            candidato.estadoGeneral = todasFinalizadas ? 'Finalizado' : 'En proceso';
            
            processedData.push(candidato);
        });
        
        console.log('Datos procesados:', processedData.slice(0, 2));
        return processedData;
    }
    
    processEtapa(etapaData) {
        const eventosOrdenados = (etapaData.eventos || [])
            .slice()
            .sort((a, b) => new Date(a.Fecha) - new Date(b.Fecha));

        const variantCounters = this.countVariantOccurrences(eventosOrdenados);
        const phaseBlocks = this.buildPhaseBlocks(eventosOrdenados);
        const responsabilidad = this.computeResponsableDurations(eventosOrdenados, etapaData.etapa);

        const fechasEtapa = eventosOrdenados.map(e => new Date(e.Fecha));
        const fechaInicio = fechasEtapa.length > 0 ? new Date(Math.min(...fechasEtapa)) : null;
        const fechaFinEtapa = fechasEtapa.length > 0 ? new Date(Math.max(...fechasEtapa)) : null;

        let duracionDias = 0;
        if (fechaInicio && fechaFinEtapa) {
            duracionDias = Math.ceil((fechaFinEtapa - fechaInicio) / (1000 * 60 * 60 * 24)) + 1;
        } else if (fechaInicio) {
            duracionDias = Math.ceil((Date.now() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24));
        }

        const hasFinalizingEvent = eventosOrdenados.some(evt => (
            evt?.Estado === 'Finalizado' || isFinalizingEvent(evt?.Evento)
        ));
        const todosFinalizados = eventosOrdenados.length > 0 && eventosOrdenados.every(evt => evt.Estado === 'Finalizado');
        const estado = hasFinalizingEvent || todosFinalizados
            ? 'Finalizado'
            : 'En proceso';

        const maxIntento = eventosOrdenados.reduce((max, evt) => {
            const intento = Number(evt.Intento) || 1;
            return intento > max ? intento : max;
        }, 1);

        return {
            etapa: etapaData.etapa,
            estado,
            fechaInicio,
            fechaFin: estado === 'Finalizado' ? fechaFinEtapa : null,
            duracionDias,
            eventos: eventosOrdenados,
            intento: maxIntento,
            correcciones: variantCounters.correccion || 0,
            specialVariantCounters: variantCounters,
            phaseBlocks,
            segmentosResponsables: responsabilidad.segments,
            tiempoPorGrupo: responsabilidad.totals,
            tiempoPorGrupoVisible: responsabilidad.displayTotals
        };
    }

    countVariantOccurrences(events = []) {
        return events.reduce((acc, evt) => {
            const variant = getVariantForEvent(evt?.Evento);
            if (variant) {
                acc[variant.key] = (acc[variant.key] || 0) + 1;
            }
            return acc;
        }, {});
    }

    determinePhaseStatus(events = [], fallback = 'En proceso') {
        if (!events || events.length === 0) {
            return fallback;
        }

        if (events.some(e => e.Estado === 'Finalizado' || isFinalizingEvent(e?.Evento))) {
            return 'Finalizado';
        }

        if (events.some(e => e.Estado === 'En proceso')) {
            return 'En proceso';
        }

        return fallback;
    }

    partitionPhaseEvents(phaseEvents = []) {
        const baseEvents = [];
        const variantBuckets = new Map();

        phaseEvents.forEach(evt => {
            const variant = getVariantForEvent(evt?.Evento);
            if (variant) {
                if (!variantBuckets.has(variant.key)) {
                    variantBuckets.set(variant.key, []);
                }
                variantBuckets.get(variant.key).push(evt);
            } else {
                baseEvents.push(evt);
            }
        });

        return { baseEvents, variantBuckets };
    }

    buildPhaseBlocks(events = []) {
        const sortedEvents = Array.isArray(events)
            ? events.slice().sort((a, b) => new Date(a.Fecha) - new Date(b.Fecha))
            : [];

        const phaseLabels = [];
        const seen = new Set();

        sortedEvents.forEach(evt => {
            const label = evt && evt.Fase ? String(evt.Fase).trim() : '';
            if (label && !seen.has(label)) {
                seen.add(label);
                phaseLabels.push(label);
            }
        });

        const latestEvent = sortedEvents.length ? sortedEvents[sortedEvents.length - 1] : null;
        const currentPhaseLabel = latestEvent && latestEvent.Fase ? String(latestEvent.Fase).trim() : null;
        const latestVariant = latestEvent ? getVariantForEvent(latestEvent.Evento) : null;

        const blocks = [];

        phaseLabels.forEach((label, index) => {
            const normalizedLabel = String(label || '').trim();
            if (!normalizedLabel) {
                return;
            }

            const phaseEvents = sortedEvents.filter(evt => String(evt.Fase || '').trim() === normalizedLabel);
            const { baseEvents, variantBuckets } = this.partitionPhaseEvents(phaseEvents);
            const baseLatest = baseEvents.length
                ? baseEvents[baseEvents.length - 1]
                : (phaseEvents.length ? phaseEvents[phaseEvents.length - 1] : null);
            const baseDate = baseLatest ? new Date(baseLatest.Fecha) : null;
            const baseStatus = this.determinePhaseStatus(baseEvents, phaseEvents.length ? 'En proceso' : 'Pendiente');

            blocks.push({
                baseLabel: normalizedLabel,
                displayLabel: normalizedLabel,
                status: baseStatus,
                current: normalizedLabel === currentPhaseLabel && !latestVariant,
                count: baseEvents.length,
                events: baseEvents,
                date: baseDate,
                variantKey: null,
                variantBadge: null,
                variantClass: null,
                hasVariants: variantBuckets.size > 0,
                orderIndex: index * 10
            });

            variantBuckets.forEach((variantEvents, variantKey) => {
                if (!variantEvents.length) {
                    return;
                }

                const variantConfig = SPECIAL_EVENT_VARIANTS.find(v => v.key === variantKey);
                if (!variantConfig) {
                    return;
                }

                const variantLatest = variantEvents[variantEvents.length - 1];
                const variantDate = variantLatest ? new Date(variantLatest.Fecha) : null;

                blocks.push({
                    baseLabel: normalizedLabel,
                    displayLabel: `${normalizedLabel} · ${variantConfig.displayLabel}`,
                    status: this.determinePhaseStatus(variantEvents, 'En proceso'),
                    current: normalizedLabel === currentPhaseLabel && !!latestVariant && latestVariant.key === variantKey,
                    count: variantEvents.length,
                    events: variantEvents,
                    date: variantDate,
                    variantKey,
                    variantBadge: variantConfig.badge,
                    variantClass: variantConfig.className,
                    hasVariants: false,
                    orderIndex: index * 10 + 1
                });
            });
        });

        const baseSequence = blocks.filter(block => !block.variantKey);
        const lastActiveBaseIndex = baseSequence.reduce((last, block, idx) => (block.count > 0 ? idx : last), -1);

        baseSequence.forEach((block, idx) => {
            if (block.count === 0) {
                if (block.hasVariants) {
                    block.status = 'En proceso';
                }
                return;
            }

            if (idx < lastActiveBaseIndex) {
                block.status = 'Finalizado';
            }
        });

        return blocks
            .filter(block => block.count > 0 || block.variantKey || block.hasVariants)
            .sort((a, b) => a.orderIndex - b.orderIndex || (a.variantKey ? 1 : -1));
    }

    computeResponsableDurations(events = [], etapaNombre = '') {
        const phasesByNumber = new Map();

        (events || []).forEach(evt => {
            const phaseNumber = extractPhaseNumber(evt?.Fase);
            if (Number.isNaN(phaseNumber)) {
                return;
            }
            if (!phasesByNumber.has(phaseNumber)) {
                phasesByNumber.set(phaseNumber, []);
            }
            phasesByNumber.get(phaseNumber).push(evt);
        });

        const phases = Array.from(phasesByNumber.entries()).map(([fase, phaseEvents]) => {
            const fechas = phaseEvents.map(e => new Date(e.Fecha)).filter(d => !Number.isNaN(d.getTime()));
            const fechaCierre = fechas.length ? new Date(Math.max(...fechas.map(d => d.getTime()))) : null;
            const resp = getPhaseResponsible(etapaNombre, fase);
            return {
                fase,
                fecha: fechaCierre,
                responsable: resp.responsable,
                grupo: resp.grupo,
                responsables: resp.responsables,
                grupos: resp.grupos
            };
        }).filter(p => p.fecha);

        phases.sort((a, b) => a.fase - b.fase || a.fecha - b.fecha);

        const segments = [];
        const totals = {};
        const displayTotals = {};

        for (let i = 1; i < phases.length; i++) {
            const prev = phases[i - 1];
            const curr = phases[i];
            if (!prev.fecha || !curr.fecha) {
                continue;
            }
            const diffMs = curr.fecha - prev.fecha;
            const days = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
            const gruposObjetivo = (curr.grupos && curr.grupos.length) ? curr.grupos : ['Sin asignar'];
            const responsablesObjetivo = (curr.responsables && curr.responsables.length)
                ? curr.responsables
                : [curr.responsable || 'Sin responsable asignado'];

            const shareCount = gruposObjetivo.length || 1;
            const diasAsignados = Math.round((days / shareCount) * 10) / 10;

            gruposObjetivo.forEach((grupo, idx) => {
                const responsable = responsablesObjetivo[idx] || responsablesObjetivo[0] || 'Sin responsable asignado';
                displayTotals[grupo] = (displayTotals[grupo] || 0) + days;
                totals[grupo] = (totals[grupo] || 0) + diasAsignados;
                segments.push({
                    desdeFase: prev.fase,
                    hastaFase: curr.fase,
                    dias: days,
                    diasAsignados,
                    responsable,
                    grupo,
                    compartido: gruposObjetivo.length > 1,
                    participantes: gruposObjetivo
                });
            });
        }

        return { segments, totals, displayTotals };
    }

    aggregateGroupTotals(etapas = [], field = 'tiempoPorGrupo') {
        const totals = {};
        (etapas || []).forEach(etapa => {
            const map = etapa[field] || {};
            Object.entries(map).forEach(([grupo, dias]) => {
                totals[grupo] = (totals[grupo] || 0) + dias;
            });
        });
        return totals;
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
        
        // Actualizar select de etapas (mostrar sin número, mantener value con la etapa original para filtrado)
        const stageSelect = document.getElementById('stageFilter');
        stageSelect.innerHTML = '';
        const defaultOpt = document.createElement('option');
        defaultOpt.value = '';
        defaultOpt.textContent = 'Todas las etapas';
        stageSelect.appendChild(defaultOpt);

        etapas.forEach(etapa => {
            const opt = document.createElement('option');
            opt.value = etapa; // mantener valor original para filtros
            opt.textContent = stripLeadingNumber(etapa);
            stageSelect.appendChild(opt);
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
    
    clearFilters() {
        // Resetear todos los selects a su valor por defecto
        document.getElementById('candidateFilter').value = '';
        document.getElementById('stageFilter').value = '';
        document.getElementById('statusFilter').value = '';
        
        // Mostrar todos los datos
        this.filteredData = [...this.data];
        
        // Actualizar métricas y vista
        this.updateMetrics();
        this.renderView();
        
        // Mostrar mensaje de confirmación
        this.showSuccess('Filtros limpiados correctamente');
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
            case 'detallado':
                this.renderDetallado();
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
        
        const legendHtml = `
            <div class="pre-timeline-legend">
                <span class="legend-chip base"><span class="chip-dot"></span>En proceso</span>
                <span class="legend-chip finalizado"><span class="chip-dot"></span>Finalizado</span>
                <span class="legend-chip correccion"><span class="chip-dot"></span>Solicitud de corrección</span>
                <span class="legend-chip subsanacion"><span class="chip-dot"></span>Solicitud de subsanación</span>
                <span class="legend-chip ajuste"><span class="chip-dot"></span>Solicitud de ajuste</span>
            </div>
        `;
        
        let html = legendHtml;
        
        this.filteredData.forEach((candidato, index) => {
            const maxDuracion = Math.max(...candidato.etapas.map(e => e.duracionDias));
            const totalCorrecciones = candidato.etapas.reduce((sum, etapa) => sum + (etapa.correcciones || 0), 0);
            const totalSubsanaciones = candidato.etapas.reduce((sum, etapa) => {
                const counters = etapa.specialVariantCounters || {};
                return sum + (counters.subsanacion || 0);
            }, 0);
            const totalAjustes = candidato.etapas.reduce((sum, etapa) => {
                const counters = etapa.specialVariantCounters || {};
                return sum + (counters.ajuste || 0);
            }, 0);
            const subsanacionesBadge = totalSubsanaciones > 0
                ? `<span class="total-subsanaciones"><span class="material-icons">assignment_late</span>Subsanaciones: ${totalSubsanaciones}</span>`
                : '';
            const ajustesBadge = totalAjustes > 0
                ? `<span class="total-ajustes"><span class="material-icons">build</span>Ajustes: ${totalAjustes}</span>`
                : '';
            const resumenEspeciales = [
                `Correcciones: ${totalCorrecciones}`,
                totalSubsanaciones > 0 ? `Subsanaciones: ${totalSubsanaciones}` : null,
                totalAjustes > 0 ? `Ajustes: ${totalAjustes}` : null
            ].filter(Boolean).join(' · ');
            
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

                const intentoBadge = etapa.intento > 1 ? `<span class="stage-intento">Intento ${etapa.intento}</span>` : '';
                const variantCounters = etapa.specialVariantCounters || {};
                const correccionesCount = variantCounters.correccion || 0;
                const subsanacionCount = variantCounters.subsanacion || 0;
                const ajusteCount = variantCounters.ajuste || 0;
                const correccionesBadge = correccionesCount > 0 ? `<span class="stage-correcciones correccion">Correcciones: ${correccionesCount}</span>` : '';
                const subsanacionBadge = subsanacionCount > 0 ? `<span class="stage-correcciones subsanacion">Subsanaciones: ${subsanacionCount}</span>` : '';
                const ajusteBadge = ajusteCount > 0 ? `<span class="stage-correcciones ajuste">Ajustes: ${ajusteCount}</span>` : '';
                
                // Agregar información de responsables
                const tiemposPorGrupo = etapa.tiempoPorGrupoVisible || etapa.tiempoPorGrupo || {};
                const gruposActivos = Object.entries(tiemposPorGrupo).filter(([g, d]) => d > 0);
                const responsablesBadges = gruposActivos.length > 0 ? gruposActivos.map(([grupo, dias]) => {
                    const color = getGroupColor(grupo);
                    return `<span class="stage-responsible-badge" style="background: ${color}20; border-color: ${color}; color: ${color};" title="${grupo}: ${dias} días">${grupo.substring(0, 4)}: ${dias}d</span>`;
                }).join('') : '';
                
                const stageMetaContent = [intentoBadge, correccionesBadge, subsanacionBadge, ajusteBadge, responsablesBadges].filter(Boolean).join('');
                const stageMetaHtml = stageMetaContent ? `<div class="stage-label-meta">${stageMetaContent}</div>` : '';

                const phaseBlocks = etapa.phaseBlocks || this.buildPhaseBlocks(etapa.eventos || []);
                const phasePills = phaseBlocks.map(block => {
                    const badge = block.variantBadge ? `<span class="phase-pill-badge ${block.variantKey || 'base'}">${block.variantBadge}</span>` : '';
                    const pillClass = block.variantClass ? ` ${block.variantClass}` : '';
                    const statusClass = block.status ? ` status-${block.status.toLowerCase().replace(/\s+/g, '-')}` : '';
                    return `<span class="phase-pill${pillClass}${statusClass}">${stripLeadingNumber(block.displayLabel)}${badge}</span>`;
                }).join('');
                const phasePillsHtml = phasePills ? `<div class="stage-phase-pills">${phasePills}</div>` : '';

                html += `
                    <div class="stage-wrapper">
                        <div class="stage-item">
                            <div class="stage-label tooltip" data-tooltip="Etapa ${etapaIndex + 1} de ${candidato.etapas.length}">
                                ${stripLeadingNumber(etapa.etapa)}
                            </div>
                            ${stageMetaHtml}
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
                        ${phasePillsHtml}
                    </div>
                `;
            });
            
            html += `
                    </div>
                    
                    <div class="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-sm text-gray-500">
                        <span>${candidato.etapas.length} etapa${candidato.etapas.length !== 1 ? 's' : ''}</span>
                        <span>Promedio: ${Math.round(candidato.tiempoTotal / candidato.etapas.length)} días por etapa</span>
                        <span>${resumenEspeciales}</span>
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
            const totalCorrecciones = candidato.etapas.reduce((sum, etapa) => sum + (etapa.correcciones || 0), 0);
            const totalSubsanaciones = candidato.etapas.reduce((sum, etapa) => {
                const counters = etapa.specialVariantCounters || {};
                return sum + (counters.subsanacion || 0);
            }, 0);
            const totalAjustes = candidato.etapas.reduce((sum, etapa) => {
                const counters = etapa.specialVariantCounters || {};
                return sum + (counters.ajuste || 0);
            }, 0);
            const subsanacionesBadge = totalSubsanaciones > 0
                ? `<span class="total-subsanaciones"><span class="material-icons">assignment_late</span>Subsanaciones: ${totalSubsanaciones}</span>`
                : '';
            const ajustesBadge = totalAjustes > 0
                ? `<span class="total-ajustes"><span class="material-icons">build</span>Ajustes: ${totalAjustes}</span>`
                : '';
            
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
                
                const phaseBlocks = etapa.phaseBlocks || this.buildPhaseBlocks(etapa.eventos || []);
                const fasesHtml = phaseBlocks.map(block => {
                    const estadoFase = block.status || 'Pendiente';
                    const estadoClass = estadoFase.toLowerCase().replace(/\s+/g, '-');
                    const eventosCount = block.events.length;
                    const eventosLabel = `${eventosCount} evento${eventosCount !== 1 ? 's' : ''}`;
                    const fechaReferencia = block.date ? block.date.toLocaleDateString('es-CO') : '';
                    const badgePrincipal = block.variantBadge
                        ? `<div class="fase-variant-badge ${block.variantKey}">${block.variantBadge} (${eventosCount})</div>`
                        : '';
                    const badgeInformativo = !block.variantBadge && block.hasVariants
                        ? `<div class="fase-variant-badge info">Tiene solicitudes especiales</div>`
                        : '';
                    const correccionesHtml = block.variantKey === 'correccion' && eventosCount > 0
                        ? `<div class="fase-correcciones">Correcciones: ${eventosCount}</div>`
                        : '';
                    const variantClass = block.variantClass ? ` ${block.variantClass}` : '';
                    const statusClass = estadoClass ? ` status-${estadoClass}` : '';

                    return `
                        <div class="fase-item${variantClass}${statusClass}" data-candidato="${candidato.persona_id}" data-etapa="${etapa.etapa}" data-fase="${block.baseLabel}" data-variant="${block.variantKey || 'base'}">
                            <div class="fase-header">
                                <div class="fase-nombre">${stripLeadingNumber(block.displayLabel)}</div>
                                <div class="fase-estado ${estadoClass}">${estadoFase}</div>
                            </div>
                            <div class="fase-eventos-count">${eventosLabel}${fechaReferencia ? ` · ${fechaReferencia}` : ''}</div>
                            ${badgePrincipal || badgeInformativo || ''}
                            ${correccionesHtml}
                        </div>
                    `;
                }).join('');
                
                // Agregar desglose de responsables si existe
                const tiemposPorGrupo = etapa.tiempoPorGrupoVisible || etapa.tiempoPorGrupo || {};
                const gruposConTiempo = Object.entries(tiemposPorGrupo).filter(([g, d]) => d > 0);
                let responsablesHtml = '';
                if (gruposConTiempo.length > 0) {
                    const responsablesList = gruposConTiempo.map(([grupo, dias]) => {
                        const color = getGroupColor(grupo);
                        const porcentaje = etapa.duracionDias > 0 ? Math.round((dias / etapa.duracionDias) * 100) : 0;
                        return `
                            <div class="etapa-responsible-item" style="border-left: 3px solid ${color};">
                                <div class="etapa-responsible-name">${grupo}</div>
                                <div class="etapa-responsible-stats">
                                    <span>${dias} días</span>
                                    <span class="etapa-responsible-percent">${porcentaje}%</span>
                                </div>
                            </div>
                        `;
                    }).join('');
                    responsablesHtml = `
                        <div class="etapa-responsables-section">
                            <h6 class="etapa-responsables-title">Distribución por responsable</h6>
                            ${responsablesList}
                        </div>
                    `;
                }
                
                return `
                    <div class="etapa-card ${etapa.estado.toLowerCase().replace(' ', '-')}" data-candidato="${candidato.persona_id}" data-etapa="${etapa.etapa}">
                        <div class="etapa-header">
                            <div class="etapa-info">
                                <h4 class="etapa-titulo">${stripLeadingNumber(etapa.etapa)}</h4>
                                <div class="etapa-metadata">
                                    <span class="etapa-duracion">
                                        <span class="material-icons">schedule</span>
                                        ${etapa.duracionDias} días
                                    </span>
                                    ${etapa.intento > 1 ? `<span class="etapa-intento"><span class="material-icons">repeat</span>Intento ${etapa.intento}</span>` : ''}
                                    ${(etapa.correcciones || 0) > 0 ? `<span class="etapa-correcciones"><span class="material-icons">edit_note</span>${etapa.correcciones} correccion${etapa.correcciones !== 1 ? 'es' : ''}</span>` : ''}
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
                            ${responsablesHtml}
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
                                <span class="total-correcciones">
                                    <span class="material-icons">edit_note</span>
                                    Correcciones: ${totalCorrecciones}
                                </span>
                                ${subsanacionesBadge}
                                ${ajustesBadge}
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

    renderDetallado() {
        const container = document.getElementById('detallado-content');
        const resumen = document.getElementById('detalle-resumen');

        if (!container) {
            return;
        }

        if (this.filteredData.length === 0) {
            container.innerHTML = `
                <div class="detail-empty-state">
                    <span class="material-icons" style="font-size: 4rem; margin-bottom: 1rem;">insights</span>
                    <p style="font-size: 1.125rem; font-weight: 500; margin-bottom: 0.5rem;">No hay datos para mostrar</p>
                    <p style="font-size: 0.875rem;">Ajusta filtros o espera a que existan fases registradas</p>
                </div>
            `;
            if (resumen) {
                resumen.textContent = '';
            }
            return;
        }

        const groupOrder = [
            'OAPI',
            'Secretaría General y Contratación',
            'GAFC',
            'Talento Humano',
            'Fiduprevisora',
            'Contratista',
            'Sin asignar'
        ];

        const cards = this.filteredData.map((candidato, candIndex) => {
            const total = Number(candidato.tiempoTotal || 0);
            const baseTotals = { ...(candidato.tiempoPorGrupo || {}) };
            const visibleTotals = { ...(candidato.tiempoPorGrupoVisible || candidato.tiempoPorGrupo || {}) };
            const sumaAsignada = Object.values(baseTotals).reduce((a, b) => a + (Number(b) || 0), 0);
            const brecha = Math.max(0, total - sumaAsignada);
            if (brecha > 0) {
                baseTotals['Sin asignar'] = (baseTotals['Sin asignar'] || 0) + brecha;
            }

            // Recopilar desglose de fases por grupo
            const phasesByGroup = this.getPhaseBreakdownByGroup(candidato);

            const groupRows = groupOrder.map((grupo, groupIndex) => {
                const diasAsignados = Number(baseTotals[grupo] || 0);
                const diasVisibles = Number(visibleTotals[grupo] || diasAsignados);
                if (diasVisibles <= 0 && diasAsignados <= 0) return '';
                const porcentaje = total > 0 ? Math.round((diasAsignados / total) * 100) : 0;
                const diasCompartidos = Math.max(0, diasVisibles - diasAsignados);
                const color = getGroupColor(grupo);
                const groupId = `group-${candIndex}-${groupIndex}`;
                const sharedNote = diasCompartidos > 0
                    ? `<span class="detail-shared-note">Incluye ${diasCompartidos}d compartidos</span>`
                    : '';
                
                // Obtener datos de este grupo
                const groupData = phasesByGroup[grupo] || { phases: [], byResponsable: {}, totalsByResponsable: {} };
                const phasesInGroup = groupData.phases || [];
                const responsables = Object.keys(groupData.totalsByResponsable || {});
                
                // Resumen de responsables si hay más de uno
                let responsableSummary = '';
                if (responsables.length > 1) {
                    const chips = responsables.map(resp => {
                        const respDays = groupData.totalsByResponsable[resp] || 0;
                        const respPercent = diasVisibles > 0 ? Math.round((respDays / diasVisibles) * 100) : 0;
                        return `
                            <div class="detail-responsible-chip">
                                <span class="detail-responsible-name">${resp}</span>
                                <span class="detail-responsible-days">${respDays}d (${respPercent}%)</span>
                            </div>
                        `;
                    }).join('');
                    responsableSummary = `
                        <div class="detail-responsible-summary">
                            ${chips}
                        </div>
                    `;
                }
                
                // Lista de fases agrupadas por responsable
                let phasesList = '';
                if (responsables.length > 1) {
                    // Mostrar agrupado por responsable
                    phasesList = responsables.map(resp => {
                        const respPhases = groupData.byResponsable[resp] || [];
                        const respPhasesHtml = respPhases.map(phase => {
                            const otrosParticipantes = (phase.participantes || []).filter(p => p !== grupo);
                            const compartidoHtml = phase.compartido
                                ? `<div class="detail-phase-shared">Compartido con ${otrosParticipantes.length ? otrosParticipantes.join(', ') : 'otro grupo'}</div>`
                                : '';
                            return `
                            <div class="detail-phase-item">
                                <div class="detail-phase-info">
                                    <div class="detail-phase-name">${stripLeadingNumber(phase.etapa)} - Fase ${phase.desdeFase} → ${phase.hastaFase}</div>
                                    <div class="detail-phase-range">Responsable: ${phase.responsable}</div>
                                    ${compartidoHtml}
                                </div>
                                <div class="detail-phase-duration">
                                    <div class="detail-phase-days">${phase.dias}</div>
                                    <div class="detail-phase-label">días</div>
                                </div>
                            </div>
                        `;
                        }).join('');
                        return `
                            <div class="detail-responsible-section">
                                <div class="detail-responsible-section-header">
                                    <span class="material-icons" style="font-size: 1rem; color: #6b7280;">person</span>
                                    <span class="detail-responsible-section-name">${resp}</span>
                                    <span class="detail-responsible-section-count">(${respPhases.length} fase${respPhases.length !== 1 ? 's' : ''})</span>
                                </div>
                                ${respPhasesHtml}
                            </div>
                        `;
                    }).join('');
                } else {
                    // Mostrar lista simple si solo hay un responsable
                    phasesList = phasesInGroup.length > 0 ? phasesInGroup.map(phase => {
                        const otrosParticipantes = (phase.participantes || []).filter(p => p !== grupo);
                        const compartidoHtml = phase.compartido
                            ? `<div class="detail-phase-shared">Compartido con ${otrosParticipantes.length ? otrosParticipantes.join(', ') : 'otro grupo'}</div>`
                            : '';
                        return `
                        <div class="detail-phase-item">
                            <div class="detail-phase-info">
                                <div class="detail-phase-name">${stripLeadingNumber(phase.etapa)} - Fase ${phase.desdeFase} → ${phase.hastaFase}</div>
                                <div class="detail-phase-range">Responsable: ${phase.responsable}</div>
                                ${compartidoHtml}
                            </div>
                            <div class="detail-phase-duration">
                                <div class="detail-phase-days">${phase.dias}</div>
                                <div class="detail-phase-label">días</div>
                            </div>
                        </div>
                    `;
                    }).join('') : '<p class="detail-empty-state" style="padding: 12px;">No hay fases registradas</p>';
                }

                return `
                    <div class="detail-group-item" data-group-id="${groupId}" onclick="this.classList.toggle('expanded')">
                        <div class="detail-group-header">
                            <div class="detail-group-name">
                                <div class="detail-group-color-indicator" style="background: ${color};"></div>
                                <span class="detail-group-label">${grupo}</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <div class="detail-group-days">
                                    <span>${diasVisibles}</span>
                                    <span style="font-size: 0.85rem; color: #6b7280;">días</span>
                                </div>
                                <div class="detail-group-percentage">${porcentaje}%</div>
                                <span class="material-icons detail-group-expand-icon">expand_more</span>
                            </div>
                        </div>
                        ${sharedNote}
                        <div class="detail-group-bar">
                            <div class="detail-group-fill" style="width: ${porcentaje}%; background: ${color};"></div>
                        </div>
                        <div class="detail-group-breakdown">
                            <div class="detail-breakdown-header">Desglose de fases (${phasesInGroup.length})</div>
                            ${responsableSummary}
                            <div class="detail-phase-list">
                                ${phasesList}
                            </div>
                        </div>
                    </div>
                `;
            }).filter(Boolean).join('');

            return `
                <div class="detail-card">
                    <div class="detail-card-header">
                        <div class="detail-candidate-info">
                            <h3>${candidato.nombre}</h3>
                            <p>${candidato.etapas.length} etapa${candidato.etapas.length !== 1 ? 's' : ''} procesadas</p>
                        </div>
                        <div class="detail-summary-stats">
                            <div class="detail-stat">
                                <div class="detail-stat-value">${total}</div>
                                <div class="detail-stat-label">Días totales</div>
                            </div>
                        </div>
                    </div>
                    <div class="detail-groups-container">
                        ${groupRows || '<p class="detail-empty-state">Sin tramos calculados</p>'}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = cards;
        if (resumen) {
            const totalProcesos = this.filteredData.length;
            resumen.textContent = `${totalProcesos} proceso${totalProcesos !== 1 ? 's' : ''} mostrados`;
        }
    }

    getPhaseBreakdownByGroup(candidato) {
        const byGroup = {};
        
        (candidato.etapas || []).forEach(etapa => {
            const segments = etapa.segmentosResponsables || [];
            segments.forEach(seg => {
                const grupo = seg.grupo || 'Sin asignar';
                if (!byGroup[grupo]) {
                    byGroup[grupo] = {
                        phases: [],
                        byResponsable: {},
                        totalsByResponsable: {}
                    };
                }
                
                const phase = {
                    etapa: etapa.etapa,
                    desdeFase: seg.desdeFase,
                    hastaFase: seg.hastaFase,
                    dias: seg.dias,
                    diasAsignados: seg.diasAsignados,
                    responsable: seg.responsable,
                    compartido: !!seg.compartido,
                    participantes: seg.participantes || []
                };
                
                byGroup[grupo].phases.push(phase);
                
                // Agrupar por responsable dentro del grupo
                const resp = seg.responsable || 'Sin responsable';
                if (!byGroup[grupo].byResponsable[resp]) {
                    byGroup[grupo].byResponsable[resp] = [];
                }
                byGroup[grupo].byResponsable[resp].push(phase);
                
                // Sumar días por responsable
                byGroup[grupo].totalsByResponsable[resp] = 
                    (byGroup[grupo].totalsByResponsable[resp] || 0) + seg.dias;
            });
        });

        // Ordenar fases por días descendente dentro de cada grupo y responsable
        Object.keys(byGroup).forEach(grupo => {
            byGroup[grupo].phases.sort((a, b) => b.dias - a.dias);
            Object.keys(byGroup[grupo].byResponsable).forEach(resp => {
                byGroup[grupo].byResponsable[resp].sort((a, b) => b.dias - a.dias);
            });
        });

        return byGroup;
    }
    
    addProgresoEventListeners() {
        // Event listeners para fases
        document.querySelectorAll('.fase-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const candidatoId = item.dataset.candidato;
                const etapa = item.dataset.etapa;
                const fase = item.dataset.fase;
                const variant = item.dataset.variant || 'base';
                
                this.showFaseDetails(candidatoId, etapa, fase, variant);
            });
        });
    }
    
    showFaseDetails(candidatoId, etapaNombre, faseNombre, variantKey = 'base') {
        // Encontrar el candidato y la etapa
        const candidato = this.filteredData.find(c => c.persona_id === candidatoId);
        if (!candidato) return;
        
        const etapa = candidato.etapas.find(e => e.etapa === etapaNombre);
        if (!etapa) return;
        
        const phaseBlocks = etapa.phaseBlocks || this.buildPhaseBlocks(etapa.eventos || []);
        const block = phaseBlocks.find(b => 
            b.baseLabel === faseNombre && (b.variantKey || 'base') === variantKey
        );
        const eventosFase = block ? block.events : [];
        
        const displayLabel = block ? block.displayLabel : faseNombre;
        const variantBadgeHtml = block && block.variantBadge
            ? `<span class="fase-modal-badge ${block.variantKey}">${block.variantBadge}</span>`
            : '';
        const infoBadgeHtml = block && !block.variantBadge && block.hasVariants
            ? `<span class="fase-modal-badge info">Tiene solicitudes especiales</span>`
            : '';
        const eventosTotal = eventosFase.length;
        const eventosMarkup = eventosFase.map(evento => {
            const fecha = evento.Fecha ? new Date(evento.Fecha).toLocaleDateString('es-CO') : '-';
            const estado = evento.Estado || 'En proceso';
            const estadoClass = estado.toLowerCase().replace(/\s+/g, '-');
            const variante = getVariantForEvent(evento.Evento);
            const estadoExtra = variante ? `<div class="evento-estado-extra ${variante.key}">${variante.badge}</div>` : '';
            return `
                <div class="evento-detalle">
                    <div class="evento-fecha">${fecha}</div>
                    <div class="evento-estado ${estadoClass}">${estado}</div>
                    ${estadoExtra}
                    ${evento.Evento ? `<div class="evento-tipo">${evento.Evento}</div>` : ''}
                    ${evento.Responsable ? `<div class="evento-responsable">Responsable: ${evento.Responsable}</div>` : ''}
                    ${evento.Observaciones ? `<div class="evento-observaciones">${evento.Observaciones}</div>` : ''}
                </div>
            `;
        }).join('');

        // Crear modal o panel de detalles
        const modal = document.createElement('div');
        modal.className = 'fase-modal';
        modal.innerHTML = `
            <div class="fase-modal-content">
                <div class="fase-modal-header">
                    <div class="fase-modal-header-left">
                        <h3>${displayLabel}</h3>
                        <div class="fase-modal-badges">
                            ${variantBadgeHtml}
                            ${infoBadgeHtml}
                        </div>
                    </div>
                    <div class="fase-modal-header-right">
                        <span class="fase-modal-count">${eventosTotal} evento${eventosTotal !== 1 ? 's' : ''}</span>
                        <button class="close-modal" onclick="this.closest('.fase-modal').remove()">
                            <span class="material-icons">close</span>
                        </button>
                    </div>
                </div>
                <div class="fase-modal-body">
                    <div class="candidato-etapa">
                        <strong>Candidato:</strong> ${candidato.nombre}<br>
                        <strong>Etapa:</strong> ${etapaNombre}
                    </div>
                    <div class="eventos-list">
                        ${eventosMarkup}
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
        this.renderAdvancedStats();
        this.renderStageChart();
        this.renderStatusChart();
        this.renderGroupChart();
        this.renderEfficiencyList();
        this.renderBottlenecks();
        this.renderTrendChart();
        this.renderTimeRanking();
        this.renderFastestRanking();
    }
    
    getStageAverages() {
        const etapasData = new Map();
        
        this.filteredData.forEach(candidato => {
            candidato.etapas.forEach(etapa => {
                if (!etapasData.has(etapa.etapa)) {
                    etapasData.set(etapa.etapa, []);
                }
                etapasData.get(etapa.etapa).push(etapa.duracionDias);
            });
        });
        
        return Array.from(etapasData.entries()).map(([etapa, tiempos]) => ({
            etapa,
            promedio: tiempos.reduce((a, b) => a + b, 0) / tiempos.length,
            maximo: Math.max(...tiempos),
            minimo: Math.min(...tiempos),
            cantidad: tiempos.length
        }));
    }
    
    getGroupStats() {
        const groupData = {};
        
        this.filteredData.forEach(candidato => {
            const tiemposPorGrupo = candidato.tiempoPorGrupo || {};
            Object.entries(tiemposPorGrupo).forEach(([grupo, dias]) => {
                if (!groupData[grupo]) {
                    groupData[grupo] = { totalDias: 0, casos: 0 };
                }
                groupData[grupo].totalDias += dias;
                groupData[grupo].casos += 1;
            });
        });
        
        return Object.entries(groupData)
            .map(([grupo, data]) => ({
                grupo,
                totalDias: data.totalDias,
                casos: data.casos,
                promedio: data.totalDias / data.casos
            }))
            .sort((a, b) => b.casos - a.casos);
    }
    
    renderStageChart() {
        const ctx = document.getElementById('stageChart').getContext('2d');
        
        const etapasData = this.getStageAverages();
        
        // Ordenar por promedio y tomar las top 10
        const topEtapas = etapasData
            .sort((a, b) => b.promedio - a.promedio)
            .slice(0, 10);
        
        const labels = topEtapas.map(e => e.etapa);
        const data = topEtapas.map(e => e.promedio);
        
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
                    backgroundColor: data.map(d => 
                        d > 20 ? 'rgba(239, 68, 68, 0.8)' : 
                        d > 10 ? 'rgba(251, 191, 36, 0.8)' : 
                        'rgba(59, 130, 246, 0.8)'
                    ),
                    borderColor: data.map(d => 
                        d > 20 ? 'rgba(239, 68, 68, 1)' : 
                        d > 10 ? 'rgba(251, 191, 36, 1)' : 
                        'rgba(59, 130, 246, 1)'
                    ),
                    borderWidth: 2,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            afterLabel: function(context) {
                                const index = context.dataIndex;
                                const etapa = topEtapas[index];
                                return [
                                    `Casos: ${etapa.cantidad}`,
                                    `Máximo: ${Math.round(etapa.maximo)} días`,
                                    `Mínimo: ${Math.round(etapa.minimo)} días`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Días promedio',
                            font: {
                                weight: 'bold'
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        },
                        grid: {
                            display: false
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
        
        // Actualizar leyenda
        document.getElementById('legend-proceso').textContent = `En proceso: ${enProceso}`;
        document.getElementById('legend-finalizados').textContent = `Finalizados: ${finalizados}`;
        
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
                    borderWidth: 3,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                aspectRatio: 1,
                cutout: '65%',
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const value = context.parsed;
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${context.label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    renderGroupChart() {
        const canvas = document.getElementById('groupChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        const groupStats = this.getGroupStats();
        
        const labels = groupStats.map(g => g.grupo);
        const data = groupStats.map(g => g.totalDias);
        const colors = labels.map(g => getGroupColor(g));
        
        if (this.charts.groupChart) {
            this.charts.groupChart.destroy();
        }
        
        this.charts.groupChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Días totales',
                    data: data,
                    backgroundColor: colors.map(c => c + '80'),
                    borderColor: colors,
                    borderWidth: 2,
                    borderRadius: 6
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            afterLabel: function(context) {
                                const index = context.dataIndex;
                                const grupo = groupStats[index];
                                return [
                                    `Casos: ${grupo.casos}`,
                                    `Promedio: ${Math.round(grupo.promedio)} días/caso`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Días acumulados',
                            font: {
                                weight: 'bold'
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    y: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }
    
    renderEfficiencyList() {
        const container = document.getElementById('efficiencyList');
        if (!container) return;
        
        const groupStats = this.getGroupStats();
        
        let html = '';
        groupStats.forEach((grupo, index) => {
            const eficiencia = grupo.promedio <= 10 ? 'Alta' : grupo.promedio <= 20 ? 'Media' : 'Baja';
            const eficienciaColor = eficiencia === 'Alta' ? 'text-green-600' : 
                                    eficiencia === 'Media' ? 'text-yellow-600' : 'text-red-600';
            const eficienciaIcon = eficiencia === 'Alta' ? 'trending_up' : 
                                   eficiencia === 'Media' ? 'trending_flat' : 'trending_down';
            
            html += `
                <div class="analytics-list-item ${index < groupStats.length - 1 ? 'border-b border-gray-100' : ''}">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center">
                            <div class="w-3 h-3 rounded-full mr-2" style="background-color: ${getGroupColor(grupo.grupo)}"></div>
                            <div>
                                <p class="font-medium text-sm">${grupo.grupo}</p>
                                <p class="text-xs text-gray-500">${grupo.casos} casos</p>
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="flex items-center ${eficienciaColor}">
                                <span class="material-icons text-sm mr-1">${eficienciaIcon}</span>
                                <span class="text-xs font-semibold">${eficiencia}</span>
                            </div>
                            <p class="text-xs text-gray-600">${Math.round(grupo.promedio)} d/caso</p>
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html || '<p class="text-gray-500 text-sm text-center py-4">No hay datos</p>';
    }
    
    renderBottlenecks() {
        const container = document.getElementById('bottlenecksList');
        
        const etapasData = this.getStageAverages();
        
        const bottlenecks = etapasData
            .sort((a, b) => b.promedio - a.promedio)
            .slice(0, 5);
        
        let html = '';
        bottlenecks.forEach((item, index) => {
            const severidad = item.promedio > 20 ? 'Crítico' : item.promedio > 15 ? 'Alto' : 'Moderado';
            const severidadColor = severidad === 'Crítico' ? 'bg-red-100 text-red-700' : 
                                   severidad === 'Alto' ? 'bg-orange-100 text-orange-700' : 
                                   'bg-yellow-100 text-yellow-700';
            
            html += `
                <div class="analytics-bottleneck-item ${index < bottlenecks.length - 1 ? 'border-b border-gray-100' : ''}">
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            <div class="flex items-center mb-1">
                                <span class="material-icons text-red-500 text-sm mr-1">warning</span>
                                <p class="font-semibold text-sm">${item.etapa}</p>
                            </div>
                            <div class="flex items-center gap-3 text-xs text-gray-600">
                                <span class="flex items-center">
                                    <span class="material-icons text-xs mr-1">cases</span>
                                    ${item.cantidad} casos
                                </span>
                                <span class="flex items-center">
                                    <span class="material-icons text-xs mr-1">trending_up</span>
                                    Máx: ${Math.round(item.maximo)} días
                                </span>
                                <span class="flex items-center">
                                    <span class="material-icons text-xs mr-1">trending_down</span>
                                    Mín: ${Math.round(item.minimo)} días
                                </span>
                            </div>
                        </div>
                        <div class="text-right ml-4">
                            <p class="text-xl font-bold text-gray-900">${Math.round(item.promedio)}</p>
                            <p class="text-xs text-gray-500">días prom.</p>
                            <span class="inline-block mt-1 px-2 py-1 rounded text-xs font-semibold ${severidadColor}">
                                ${severidad}
                            </span>
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html || '<p class="text-gray-500 text-center py-4">No hay datos suficientes</p>';
    }
    
    renderTrendChart() {
        const ctx = document.getElementById('trendChart');
        if (!ctx) return;
        
        // Obtener todas las etapas con sus promedios
        const etapasData = this.getStageAverages();
        
        // Tomar las etapas más comunes (top 8-10)
        const topEtapas = etapasData
            .sort((a, b) => b.cantidad - a.cantidad) // Ordenar por cantidad de casos
            .slice(0, 10);
        
        // Preparar labels más cortos
        const labels = topEtapas.map(e => {
            const nombre = e.etapa;
            // Acortar nombres largos
            if (nombre.length > 20) {
                return nombre.substring(0, 20) + '...';
            }
            return nombre;
        });
        
        const data = topEtapas.map(e => e.promedio);
        
        if (this.charts.trendChart) {
            this.charts.trendChart.destroy();
        }
        
        this.charts.trendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Tiempo promedio por etapa',
                    data: data,
                    borderColor: 'rgba(59, 130, 246, 1)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: data.map(d => 
                        d > 20 ? 'rgba(239, 68, 68, 1)' : 
                        d > 10 ? 'rgba(251, 191, 36, 1)' : 
                        'rgba(16, 185, 129, 1)'
                    ),
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                const index = context[0].dataIndex;
                                return topEtapas[index].etapa; // Nombre completo
                            },
                            label: function(context) {
                                const index = context.dataIndex;
                                const etapa = topEtapas[index];
                                return [
                                    `Promedio: ${Math.round(etapa.promedio)} días`,
                                    `Casos: ${etapa.cantidad}`,
                                    `Máximo: ${Math.round(etapa.maximo)} días`,
                                    `Mínimo: ${Math.round(etapa.minimo)} días`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Días',
                            font: {
                                weight: 'bold'
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }
    
    renderTimeRanking() {
        const container = document.getElementById('timeRankingList');
        
        const ranking = [...this.filteredData]
            .sort((a, b) => b.tiempoTotal - a.tiempoTotal)
            .slice(0, 10);
        
        let html = '';
        ranking.forEach((candidato, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
            const statusColor = candidato.estadoGeneral === 'Finalizado' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700';
            
            html += `
                <div class="analytics-ranking-item ${index < ranking.length - 1 ? 'border-b border-gray-100' : ''}">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center flex-1">
                            <span class="analytics-rank-badge ${index < 3 ? 'analytics-rank-badge-top' : ''}">${medal || (index + 1)}</span>
                            <div class="ml-3 flex-1">
                                <p class="font-semibold text-sm">${candidato.nombre}</p>
                                <div class="flex items-center gap-2 text-xs text-gray-600 mt-1">
                                    <span class="flex items-center">
                                        <span class="material-icons text-xs mr-1">layers</span>
                                        ${candidato.etapas.length} etapas
                                    </span>
                                    <span class="px-2 py-0.5 rounded text-xs font-medium ${statusColor}">
                                        ${candidato.estadoGeneral}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div class="text-right ml-3">
                            <p class="text-lg font-bold text-gray-900">${candidato.tiempoTotal}</p>
                            <p class="text-xs text-gray-500">días</p>
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html || '<p class="text-gray-500 text-center py-4">No hay datos para mostrar</p>';
    }
    
    renderFastestRanking() {
        const container = document.getElementById('fastestRankingList');
        if (!container) return;
        
        // Solo procesos finalizados
        const finalizados = this.filteredData.filter(d => d.estadoGeneral === 'Finalizado');
        
        const ranking = [...finalizados]
            .sort((a, b) => a.tiempoTotal - b.tiempoTotal)
            .slice(0, 10);
        
        let html = '';
        ranking.forEach((candidato, index) => {
            const medal = index === 0 ? '🏆' : index === 1 ? '⭐' : index === 2 ? '✨' : '';
            
            html += `
                <div class="analytics-ranking-item ${index < ranking.length - 1 ? 'border-b border-gray-100' : ''}">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center flex-1">
                            <span class="analytics-rank-badge analytics-rank-badge-success">${medal || (index + 1)}</span>
                            <div class="ml-3 flex-1">
                                <p class="font-semibold text-sm">${candidato.nombre}</p>
                                <div class="flex items-center gap-2 text-xs text-gray-600 mt-1">
                                    <span class="flex items-center">
                                        <span class="material-icons text-xs mr-1">speed</span>
                                        ${candidato.etapas.length} etapas
                                    </span>
                                    <span class="text-green-600 font-medium">
                                        ⚡ Rápido
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div class="text-right ml-3">
                            <p class="text-lg font-bold text-green-600">${candidato.tiempoTotal}</p>
                            <p class="text-xs text-gray-500">días</p>
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html || '<p class="text-gray-500 text-center py-4">No hay procesos finalizados</p>';
    }
    
    renderAdvancedStats() {
        const tiemposTotales = this.filteredData.map(d => d.tiempoTotal).filter(t => t > 0);
        
        if (tiemposTotales.length === 0) {
            document.getElementById('stat-max-time').textContent = '-';
            document.getElementById('stat-min-time').textContent = '-';
            document.getElementById('stat-median-time').textContent = '-';
            document.getElementById('stat-std-dev').textContent = '-';
            return;
        }
        
        // Máximo
        const max = Math.max(...tiemposTotales);
        document.getElementById('stat-max-time').textContent = `${max}`;
        
        // Mínimo
        const min = Math.min(...tiemposTotales);
        document.getElementById('stat-min-time').textContent = `${min}`;
        
        // Mediana
        const sorted = [...tiemposTotales].sort((a, b) => a - b);
        const median = sorted.length % 2 === 0 
            ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2 
            : sorted[Math.floor(sorted.length / 2)];
        document.getElementById('stat-median-time').textContent = `${Math.round(median)}`;
        
        // Desviación estándar
        const mean = tiemposTotales.reduce((a, b) => a + b, 0) / tiemposTotales.length;
        const variance = tiemposTotales.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / tiemposTotales.length;
        const stdDev = Math.sqrt(variance);
        document.getElementById('stat-std-dev').textContent = `${Math.round(stdDev)}`;
    }
    
    showLoading(show, message = 'Cargando datos...') {
        const loading = document.getElementById('loading');
        if (show) {
            showLoader(message, 'blocking');
            if (loading) {
                loading.classList.remove('hidden');
            }
        } else {
            hideLoader();
            if (loading) {
                loading.classList.add('hidden');
            }
        }
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
