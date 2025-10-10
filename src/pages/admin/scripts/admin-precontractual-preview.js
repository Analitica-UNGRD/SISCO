// Admin Precontractual Preview Component Script
export default class AdminPrecontractualPreview {
  constructor(adminManager) {
    this.adminManager = adminManager;
    this.currentPersonaId = null;
    this.timelineData = [];
    this.init();
  }

  init() {
    this.setupElements();
    this.bindEvents();
  }

  setupElements() {
    this.personaInfo = document.getElementById('prePersonaInfo');
    this.timelineContainer = document.getElementById('preTimelineContainer');
    this.timelineChart = document.getElementById('preTimelineChart');
    this.timelineEmpty = document.getElementById('preTimelineEmpty');
    this.refreshBtn = document.getElementById('precontractualPreviewRefresh');
    
    // Stats elements
    this.statTotalDays = document.getElementById('statTotalDays');
    this.statActiveStages = document.getElementById('statActiveStages');
    this.statCompletedStages = document.getElementById('statCompletedStages');
  }

  bindEvents() {
    if (this.refreshBtn) {
      this.refreshBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await this.refreshTimelineWithSpinner();
      });
    }
  }

  // Called when persona context changes
  updatePersonaContext(personaId, personaName) {
    this.currentPersonaId = personaId;
    this.updatePersonaInfo(personaName);
    
    if (personaId) {
      this.loadTimelineData(personaId);
    } else {
      this.showEmptyState();
    }
  }

  updatePersonaInfo(personaName) {
    if (!this.personaInfo) return;
    
    if (personaName && personaName !== 'Persona seleccionada') {
      this.personaInfo.innerHTML = `
        <div class="persona-info-active">
          <span class="material-icons">person</span>
          <div class="persona-details">
            <div class="persona-name">${personaName}</div>
            <div class="persona-id">ID: ${this.currentPersonaId || 'N/A'}</div>
          </div>
        </div>
      `;
    } else {
      this.personaInfo.innerHTML = `
        <div class="persona-info-placeholder">
          <span class="material-icons">person_outline</span>
          <span>Selecciona una persona para ver su progreso</span>
        </div>
      `;
    }
  }

  async loadTimelineData(personaId) {
    try {
      // Load precontractual events for this persona
      const response = await this.adminManager.apiFetch('listPrecontractual', {});
      
      if (response.ok && response.items) {
        // Filter events for current persona
        const personaEvents = response.items.filter(event => 
          event.persona_id === personaId || event.persona_id === String(personaId)
        );
        
        // Pre-fetch fase metadata per etapa to know fases order and which fases Finaliza_etapa = true
        const etapas = Array.from(new Set(personaEvents.map(e => e.Etapa).filter(Boolean)));
        const etapaFinalizaMap = {};
        const etapaFasesMap = {};
        await Promise.all(etapas.map(async (etapa) => {
          try {
            const res = await this.adminManager.apiFetch('listFases', { etapa });
            if (res.ok && Array.isArray(res.items)) {
              etapaFasesMap[etapa] = res.items; // keep array of fases (with FaseEtiqueta, Finaliza_etapa, etc.)
              etapaFinalizaMap[etapa] = new Set(res.items.filter(f => f.Finaliza_etapa).map(f => f.FaseEtiqueta));
            } else {
              etapaFasesMap[etapa] = [];
              etapaFinalizaMap[etapa] = new Set();
            }
          } catch (e) {
            etapaFasesMap[etapa] = [];
            etapaFinalizaMap[etapa] = new Set();
          }
        }));

        this.processTimelineData(personaEvents, etapaFinalizaMap, etapaFasesMap);
        this.renderTimeline();
      } else {
        this.showEmptyState();
      }
    } catch (error) {
      console.error('Error loading timeline data:', error);
      this.showEmptyState();
    }
  }

  processTimelineData(events, etapaFinalizaMap, etapaFasesMap) {
    // Group events by Etapa and Intento
    const etapasMap = new Map();
    
    events.forEach(event => {
      const key = `${event.Etapa}_${event.Intento || 1}`;
      if (!etapasMap.has(key)) {
        etapasMap.set(key, {
          etapa: event.Etapa,
          intento: event.Intento || 1,
          events: []
        });
      }
      etapasMap.get(key).events.push(event);
    });

    // Process each etapa to calculate duration and status
    this.timelineData = Array.from(etapasMap.values()).map(etapaGroup => {
  const finalizaSet = (etapaFinalizaMap && etapaFinalizaMap[etapaGroup.etapa]) || new Set();
  const fasesArr = (etapaFasesMap && etapaFasesMap[etapaGroup.etapa]) || [];
  return this.calculateEtapaDuration(etapaGroup, finalizaSet, fasesArr);
    }).sort((a, b) => {
      // Sort by etapa name, then by intento
      if (a.etapa !== b.etapa) {
        return a.etapa.localeCompare(b.etapa);
      }
      return a.intento - b.intento;
    });
  }

  calculateEtapaDuration(etapaGroup, finalizaSet, fasesArr) {
    const { etapa, intento, events } = etapaGroup;
    
    // Sort events by date
  const sortedEvents = events.sort((a, b) => new Date(a.Fecha) - new Date(b.Fecha));
  const correctionsCount = sortedEvents.filter(e => String(e.Evento || '').trim() === 'Solicitud de Correccion').length;
    
    // Encontrar todas las fechas de la etapa
    const fechasEtapa = sortedEvents.map(e => new Date(e.Fecha));
    
    // Encontrar fecha más temprana (inicio) y más tardía (fin) de toda la etapa
    const startDate = fechasEtapa.length > 0 ? new Date(Math.min(...fechasEtapa)) : null;
    const fechaMasTardia = fechasEtapa.length > 0 ? new Date(Math.max(...fechasEtapa)) : null;
    
    // Find end by Regla A: last "Finalizado" event whose Fase is in finalizaSet
    let endEvent = null;
    if (finalizaSet && finalizaSet.size > 0) {
      for (let i = sortedEvents.length - 1; i >= 0; i--) {
        const e = sortedEvents[i];
        if (e.Estado === 'Finalizado' && finalizaSet.has(e.Fase)) { endEvent = e; break; }
      }
    }

    let closure_por_evento = false;

    // Regla B: if no Regla A, find last event with Estado=Finalizado AND Evento='Cierre administrativo'
    if (!endEvent) {
      for (let i = sortedEvents.length - 1; i >= 0; i--) {
        const e = sortedEvents[i];
        if (e.Estado === 'Finalizado' && String(e.Evento || '').trim() === 'Cierre administrativo') {
          endEvent = e;
          closure_por_evento = true;
          break;
        }
      }
    }

    // Determine the end date for calculations
    let endDate;
    const isFinished = !!endEvent;
    
    if (isFinished) {
      // Si está finalizada, usar la fecha más tardía de toda la etapa
      endDate = fechaMasTardia;
    } else {
      // Si no está finalizada, usar la fecha actual
      endDate = new Date();
    }
    
    // Calculate duration using earliest and latest dates
    let durationDays = 0;
    if (startDate && endDate) {
      const durationMs = endDate - startDate;
      durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir ambos días
    }
    
    // Determine status
    const status = isFinished ? 'Finalizado' : 'En proceso';
    
    return {
      etapa,
      intento,
      startDate,
      endDate: isFinished ? endDate : null,
      durationDays: Math.max(0, durationDays),
      status,
      isFinished,
      closure_por_evento: !!closure_por_evento,
      eventCount: events.length,
      correctionsCount,
      _events: events,
      _fases: fasesArr
    };
  }

  // Extended: calculate per-phase statuses for this etapaGroup using phases metadata (fasesArr)
  calculatePhaseStatuses(etapaGroup, fasesArr) {
    const events = (etapaGroup && etapaGroup.events) || [];
    // sort events by date asc
    const sortedEvents = events.slice().sort((a, b) => new Date(a.Fecha) - new Date(b.Fecha));

    // Derive list of phase labels in order
    let phaseLabels = [];
    if (Array.isArray(fasesArr) && fasesArr.length > 0) {
      phaseLabels = fasesArr.map(f => f.FaseEtiqueta);
    } else {
      // fallback: collect unique fases from events in order
      const seen = new Set();
      sortedEvents.forEach(e => { if (e.Fase && !seen.has(e.Fase)) { seen.add(e.Fase); phaseLabels.push(e.Fase); } });
    }

    // Determine latest event for overall current phase
    const latestEvent = sortedEvents.length ? sortedEvents[sortedEvents.length - 1] : null;

  // Determine current phase: prefer last event's phase, otherwise first non-finalized phase
  const lastEvent = sortedEvents.length ? sortedEvents[sortedEvents.length - 1] : null;
    let currentPhaseLabel = lastEvent ? String(lastEvent.Fase || '').trim() : null;

    if (!currentPhaseLabel) {
      // find first phase that is not finalized
      for (let i = 0; i < phaseLabels.length; i++) {
        const lbl = phaseLabels[i];
        const evs = sortedEvents.filter(e => String(e.Fase || '').trim() === String(lbl || '').trim());
        if (!evs.some(pe => pe.Estado === 'Finalizado')) { currentPhaseLabel = lbl; break; }
      }
    }

  const phases = phaseLabels.map(label => {
  const phaseEvents = sortedEvents.filter(e => String(e.Fase || '').trim() === String(label || '').trim());
  const corrections = phaseEvents.filter(pe => String(pe.Evento || '').trim() === 'Solicitud de Correccion').length;
      let status = 'Pendiente';
      if (phaseEvents.some(pe => pe.Estado === 'Finalizado')) {
        status = 'Finalizado';
      } else if (phaseEvents.some(pe => pe.Estado === 'En proceso')) {
        status = 'En proceso';
      } else if (phaseEvents.length > 0) {
        // any event for this phase but not finalized
        status = 'En proceso';
      } else if (latestEvent && String(latestEvent.Fase || '').trim() === String(label || '').trim()) {
        status = (latestEvent.Estado === 'Finalizado') ? 'Finalizado' : 'En proceso';
      }

  const isCurrent = currentPhaseLabel && String(label || '').trim() === String(currentPhaseLabel).trim();
      // determine representative date for phase (use latest Fecha if present)
      const dateVals = phaseEvents.map(pe => pe.Fecha).filter(Boolean).map(d => new Date(d));
      const repDate = dateVals.length ? new Date(Math.max(...dateVals.map(d=>d.getTime()))) : null;
  return { label, status, current: !!isCurrent, count: phaseEvents.length, corrections, events: phaseEvents, date: repDate };
    });

    return phases;
  }

  // Return the list of phases to render: only those that have at least one event with Fecha or any events (diligenciados)
  getVisiblePhasesForRendering(etapaGroup, fasesArr) {
    const fases = this.calculatePhaseStatuses(etapaGroup, fasesArr || []);
    // Only include phases that have at least one event with Fecha OR at least one event at all
    const visible = fases.filter(f => {
      if (!f) return false;
      if (f.count && f.count > 0) return true; // has events
      return false;
    });

    return visible;
  }

  renderTimeline() {
    if (!this.timelineChart || this.timelineData.length === 0) {
      this.showEmptyState();
      return;
    }

    this.showTimelineContainer();
    
    // Generate timeline visualization with clear hierarchy between etapas and fases
    const barsHtml = this.timelineData.map(item => {
  const statusClass = item.isFinished ? 'finalizado' : 'en-proceso';
  const intentoLabel = item.intento > 1 ? ` (Intento ${item.intento})` : '';
  const correctionsBadge = item.correctionsCount > 0 ? `<span class="etapa-correcciones">Correcciones: ${item.correctionsCount}</span>` : '';
      
      const startDateStr = item.startDate ? item.startDate.toLocaleDateString('es-CO') : 'N/A';
      const endDateStr = item.endDate ? item.endDate.toLocaleDateString('es-CO') : 'Hoy';
      
      // Get visible phases that have events/dates
      const visiblePhases = this.getVisiblePhasesForRendering(
        { etapa: item.etapa, intento: item.intento, events: (item._events || []) }, 
        item._fases || item.fases || []
      );

      // Only render if we have phases to show
      let phasesContent = '';
      if (Array.isArray(visiblePhases) && visiblePhases.length) {
        const phasesHtml = visiblePhases.map((phase, idx) => {
          // Solo mostrar finalizado o asignar un color según su posición
          const phaseClass = phase.status === 'Finalizado' ? 'phase-finalizado' : '';
          const currentClass = phase.current ? ' phase-current' : '';
          
          // Asignar un color sutil basado en la posición (cíclico, máximo 12 colores)
          const colorIdx = (idx % 12) + 1;
          const colorClass = phase.status !== 'Finalizado' ? ` phase-color-${colorIdx}` : '';
          
          const safeLabel = (phase.label || '').toString().replace(/"/g, '&quot;');
          const phaseDate = phase.date ? phase.date.toLocaleDateString('es-CO') : '';
          
          return `
            <div class="timeline-phase ${phaseClass}${currentClass}${colorClass}" data-phase-idx="${idx}">
              <div class="timeline-phase-header">
                <div class="phase-connector">
                  <div class="phase-line left ${idx === 0 ? 'hidden' : ''}"></div>
                  <div class="phase-dot" title="${safeLabel}"></div>
                  <div class="phase-line right ${idx === visiblePhases.length - 1 ? 'hidden' : ''}"></div>
                </div>
                <div class="phase-label">${phase.label}</div>
              </div>
              <div class="phase-info">
                <div class="phase-date">${phaseDate}</div>
                ${phase.status === 'Finalizado' ? `<div class="phase-status-badge phase-finalizado">Finalizado</div>` : ''}
                ${phase.corrections > 0 ? `<div class="phase-corrections">Correcciones: ${phase.corrections}</div>` : ''}
              </div>
            </div>
          `;
        }).join('');

        phasesContent = `
          <div class="timeline-phases-container">
            <h6 class="phases-title">Fases con eventos</h6>
            <div class="timeline-phases">
              ${phasesHtml}
            </div>
          </div>
        `;
      }

      // Build the etapa card with both the main timeline bar and phases
      return `
        <div class="timeline-etapa-card ${statusClass}">
          <div class="etapa-header">
            <div class="etapa-title-section">
              <h5 class="etapa-title">${item.etapa}${intentoLabel}</h5>
              <span class="status-badge ${statusClass}">${item.status}</span>
              ${item.intento > 1 ? `<span class="status-pill intento">Intento ${item.intento}</span>` : ''}
              ${correctionsBadge}
            </div>
            <div class="etapa-dates">
              <span class="start-date">${startDateStr}</span>
              <span class="date-separator">-</span>
              <span class="end-date">${endDateStr}</span>
              <span class="duration-days">(${item.durationDays} días)</span>
            </div>
          </div>
          
          <div class="timeline-progress-container">
            <div class="timeline-progress-bar ${statusClass}" 
                style="width: ${Math.min(100, Math.max(5, item.isFinished ? 100 : 60))}%"
                title="${item.etapa}: ${startDateStr} - ${endDateStr} (${item.durationDays} días, ${item.eventCount} eventos)">
            </div>
          </div>
          
          ${phasesContent}
        </div>
      `;
    }).join('');
    
    this.timelineChart.innerHTML = barsHtml;
    
    // Update stats
    this.updateStats();

    // Attach click handlers for phases
    try {
      const phaseElements = this.timelineChart.querySelectorAll('.timeline-phase');
      phaseElements.forEach((phaseEl) => {
        phaseEl.addEventListener('click', (e) => {
          const etapaCard = e.target.closest('.timeline-etapa-card');
          const phaseEl = e.target.closest('.timeline-phase');
          if (!etapaCard || !phaseEl) return;
          
          // Find the etapa index
          const etapaIndex = Array.from(this.timelineChart.querySelectorAll('.timeline-etapa-card')).indexOf(etapaCard);
          if (etapaIndex === -1) return;
          
          // Find phase index
          const phaseIdx = Number(phaseEl.getAttribute('data-phase-idx') || 0);
          
          const timelineItem = this.timelineData[etapaIndex];
          if (!timelineItem) return;
          
          const visiblePhases = this.getVisiblePhasesForRendering(
            { etapa: timelineItem.etapa, intento: timelineItem.intento, events: (timelineItem._events || []) }, 
            timelineItem._fases || timelineItem.fases || []
          );
          
          const phase = visiblePhases[phaseIdx];
          if (phase) this.showPhaseDetails(timelineItem.etapa, phase);
        });
      });
    } catch (e) { console.warn('phase click binding failed', e); }
  }

  // Show event list for a specific phase under the timeline
  showPhaseDetails(etapa, phase) {
    try {
      const detailsEl = document.getElementById('prePhaseDetails');
      if (!detailsEl) return;

      const events = phase.events || [];
  const correctionsCount = events.filter(evt => String(evt.Evento || '').trim() === 'Solicitud de Correccion').length;
      
      // Create header with etapa and phase info
      const headerHtml = `
        <div class="phase-details-header">
          <div class="phase-details-title">
            <div class="phase-details-etapa">${etapa}</div>
            <div class="phase-details-label">
              <strong>${phase.label}</strong>
              ${phase.status === 'Finalizado' ? 
                `<span class="phase-details-badge finalizado">Finalizado</span>` : 
                ''}
              ${correctionsCount > 0 ? `<span class="phase-details-badge correcciones">Correcciones: ${correctionsCount}</span>` : ''}
            </div>
          </div>
          <div class="phase-details-count">${events.length} evento${events.length !== 1 ? 's' : ''}</div>
        </div>
      `;
      
      if (!events.length) {
        detailsEl.innerHTML = `
          <div class="phase-details-box">
            ${headerHtml}
            <div class="phase-details-empty">
              <span class="material-icons">event_busy</span>
              <p>No hay eventos registrados en esta fase</p>
            </div>
          </div>
        `;
        detailsEl.classList.remove('hidden');
        return;
      }

      // Sort events by date descending (newest first)
      const sortedEvents = events.slice().sort((a, b) => 
        new Date(b.Fecha || 0) - new Date(a.Fecha || 0)
      );

      const rows = sortedEvents.map(ev => {
        const fecha = ev.Fecha ? new Date(ev.Fecha).toLocaleString('es-CO') : '-';
        const descripcion = ev.Observaciones || '';
        const isCorrection = String(ev.Evento || '').trim() === 'Solicitud de Correccion';
        const statusBadges = [
          (ev.Estado === 'Finalizado') ? '<div class="event-status finalizado">Finalizado</div>' : '',
          isCorrection ? '<div class="event-status correccion">Corrección solicitada</div>' : ''
        ].filter(Boolean).join('');
        
        return `
          <div class="phase-event-card">
            <div class="event-header">
              <div class="event-title">${ev.Evento || ev.Fase || 'Evento'}</div>
              <div class="event-date">
                <span class="material-icons">event</span>
                ${fecha}
              </div>
            </div>
            ${descripcion ? `<div class="event-description">${descripcion}</div>` : ''}
            ${statusBadges}
          </div>
        `;
      }).join('');

      detailsEl.innerHTML = `
        <div class="phase-details-box">
          ${headerHtml}
          <div class="phase-events-list">
            ${rows}
          </div>
        </div>
      `;
      detailsEl.classList.remove('hidden');
      
      // Scroll the details into view with smooth animation
      setTimeout(() => {
        detailsEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    } catch (e) {
      console.warn('showPhaseDetails failed', e);
    }
  }

  updateStats() {
    const totalDays = this.timelineData.reduce((sum, item) => sum + item.durationDays, 0);
    const activeStages = this.timelineData.filter(item => !item.isFinished).length;
    const completedStages = this.timelineData.filter(item => item.isFinished).length;
    
    if (this.statTotalDays) this.statTotalDays.textContent = totalDays;
    if (this.statActiveStages) this.statActiveStages.textContent = activeStages;
    if (this.statCompletedStages) this.statCompletedStages.textContent = completedStages;
  }

  showTimelineContainer() {
    if (this.timelineContainer) this.timelineContainer.classList.remove('hidden');
    if (this.timelineEmpty) this.timelineEmpty.classList.add('hidden');
  }

  showEmptyState() {
    if (this.timelineContainer) this.timelineContainer.classList.add('hidden');
    if (this.timelineEmpty) this.timelineEmpty.classList.remove('hidden');
  }

  refreshTimeline() {
    if (this.currentPersonaId) {
      this.loadTimelineData(this.currentPersonaId);
    }
  }

  async refreshTimelineWithSpinner() {
    const btn = this.refreshBtn;
    if (!btn) return;
    try {
      btn.disabled = true;
      const icon = btn.querySelector('.material-icons');
      if (icon) icon.classList.add('animate-spin');

      if (this.currentPersonaId) {
        await this.loadTimelineData(this.currentPersonaId);
      }
    } catch (e) {
      console.warn('refreshTimelineWithSpinner failed', e);
    } finally {
      if (btn) {
        btn.disabled = false;
        const icon = btn.querySelector('.material-icons');
        if (icon) icon.classList.remove('animate-spin');
      }
    }
  }

  // Called when persona context is cleared
  clearPersonaContext() {
    this.currentPersonaId = null;
    this.timelineData = [];
    this.updatePersonaInfo(null);
    this.showEmptyState();
  }
}
