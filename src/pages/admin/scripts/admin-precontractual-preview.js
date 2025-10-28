// Admin Precontractual Preview Component Script

const SPECIAL_EVENT_VARIANTS = [
  {
    key: 'correccion',
    matchers: ['solicitud de correccion', 'solicitud de corrección', 'correccion solicitada'],
    displayLabel: 'Corrección solicitada',
    badge: 'Se solicitó corrección',
    className: 'phase-variant-correccion'
  },
  {
    key: 'subsanacion',
    matchers: ['solicitud de subsanacion', 'solicitud de subsanación', 'subsanacion solicitada'],
    displayLabel: 'Subsanación solicitada',
    badge: 'Se solicitó subsanación',
    className: 'phase-variant-subsanacion'
  },
  {
    key: 'ajuste',
    matchers: ['solicitud de ajuste', 'solicitud de ajustes', 'ajuste solicitado'],
    displayLabel: 'Ajuste solicitado',
    badge: 'Se solicitó ajuste',
    className: 'phase-variant-ajuste'
  }
];

const SPECIAL_EVENT_LOOKUP = new Map();

function normalizeEventName(name) {
  return (name || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function normalizeStageName(name) {
  return normalizeEventName(name);
}

const PRECONTRACTUAL_STAGE_ORDER = [
  'Creacion',
  'Solicitud CDP',
  'SIGEP',
  'Examenes Medicos',
  'Revision',
  'Fiduprevisora',
  'GGC-Registro Presupuestal',
  'Acta de Inicio y Designacion de Supervision'
];

const STAGE_ORDER_LOOKUP = new Map();

PRECONTRACTUAL_STAGE_ORDER.forEach((stage, index) => {
  STAGE_ORDER_LOOKUP.set(normalizeStageName(stage), index);
});

SPECIAL_EVENT_VARIANTS.forEach(variant => {
  variant.matchers.forEach(alias => {
    SPECIAL_EVENT_LOOKUP.set(normalizeEventName(alias), variant);
  });
});

function getVariantForEvent(eventName) {
  const normalized = normalizeEventName(eventName);
  return SPECIAL_EVENT_LOOKUP.get(normalized) || null;
}

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
      const normalizedA = normalizeStageName(a.etapa);
      const normalizedB = normalizeStageName(b.etapa);
      const orderA = STAGE_ORDER_LOOKUP.has(normalizedA) ? STAGE_ORDER_LOOKUP.get(normalizedA) : null;
      const orderB = STAGE_ORDER_LOOKUP.has(normalizedB) ? STAGE_ORDER_LOOKUP.get(normalizedB) : null;

      const hasOrderA = typeof orderA === 'number';
      const hasOrderB = typeof orderB === 'number';

      if (hasOrderA || hasOrderB) {
        if (!hasOrderA) return 1;
        if (!hasOrderB) return -1;
        if (orderA !== orderB) return orderA - orderB;
      }

      const dateA = (a.startDate instanceof Date && !Number.isNaN(a.startDate.getTime()))
        ? a.startDate.getTime()
        : Number.POSITIVE_INFINITY;
      const dateB = (b.startDate instanceof Date && !Number.isNaN(b.startDate.getTime()))
        ? b.startDate.getTime()
        : Number.POSITIVE_INFINITY;
      if (dateA !== dateB) {
        return dateA - dateB;
      }

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
    const variantCounters = this.countVariantOccurrences(sortedEvents);
    const correctionsCount = variantCounters.correccion || 0;
    
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
      specialVariantCounters: variantCounters,
      _events: events,
      _fases: fasesArr,
      phaseBlocks: this.buildPhaseBlocks(sortedEvents, fasesArr)
    };
  }

  // Extended: calculate per-phase statuses for this etapaGroup using phases metadata (fasesArr)
  calculatePhaseStatuses(etapaGroup, fasesArr) {
    const events = (etapaGroup && etapaGroup.events) || [];
    const sortedEvents = events.slice().sort((a, b) => new Date(a.Fecha) - new Date(b.Fecha));
    return this.buildPhaseBlocks(sortedEvents, fasesArr);
  }

  // Return the list of phases to render: only those that have at least one event with Fecha or any events (diligenciados)
  getVisiblePhasesForRendering(etapaGroup, fasesArr) {
    const fases = this.calculatePhaseStatuses(etapaGroup, fasesArr || []);
    return fases.filter(f => f && (f.events.length > 0 || f.variantKey));
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

    if (events.some(e => e.Estado === 'Finalizado')) {
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

  getEarliestDateFromEvents(events = []) {
    if (!Array.isArray(events) || events.length === 0) {
      return null;
    }

    const validDates = events
      .map(evt => {
        if (!evt || !evt.Fecha) return null;
        const parsed = new Date(evt.Fecha);
        return parsed instanceof Date && !Number.isNaN(parsed.getTime()) ? parsed : null;
      })
      .filter(Boolean);

    if (!validDates.length) {
      return null;
    }

    return new Date(Math.min(...validDates.map(date => date.getTime())));
  }

  buildPhaseBlocks(sortedEvents = [], fasesArr = []) {
    const events = Array.isArray(sortedEvents)
      ? sortedEvents.slice().sort((a, b) => new Date(a.Fecha) - new Date(b.Fecha))
      : [];

    let phaseLabels = [];
    if (Array.isArray(fasesArr) && fasesArr.length > 0) {
      phaseLabels = fasesArr
        .map(f => (f && f.FaseEtiqueta) ? String(f.FaseEtiqueta).trim() : '')
        .filter(Boolean);
    }

    const seen = new Set(phaseLabels);
    events.forEach(evt => {
      const lbl = evt && evt.Fase ? String(evt.Fase).trim() : '';
      if (lbl && !seen.has(lbl)) {
        seen.add(lbl);
        phaseLabels.push(lbl);
      }
    });

    const latestEvent = events.length ? events[events.length - 1] : null;
    const currentPhaseLabel = latestEvent && latestEvent.Fase ? String(latestEvent.Fase).trim() : null;
    const latestVariant = latestEvent ? getVariantForEvent(latestEvent.Evento) : null;

    const blocks = [];
    let globalSequence = 0;

    phaseLabels.forEach((label, index) => {
      const normalizedLabel = String(label || '').trim();
      if (!normalizedLabel) {
        return;
      }

      const phaseEvents = events.filter(evt => String(evt.Fase || '').trim() === normalizedLabel);
      const { baseEvents, variantBuckets } = this.partitionPhaseEvents(phaseEvents);
      const earliestPhaseDate = this.getEarliestDateFromEvents(phaseEvents);

      // Render one block per base event so repeated fases appear varias veces
      if (baseEvents.length) {
        baseEvents.forEach((evt) => {
          const eventDate = evt && evt.Fecha ? new Date(evt.Fecha) : null;
          blocks.push({
            label: normalizedLabel,
            displayLabel: normalizedLabel,
            status: this.determinePhaseStatus([evt], phaseEvents.length ? 'En proceso' : 'Pendiente'),
            current: latestEvent === evt && !latestVariant,
            count: 1,
            events: baseEvents,
            date: eventDate,
            corrections: (variantBuckets.get('correccion') || []).length,
            variantKey: null,
            variantBadge: null,
            variantClass: null,
            baseLabel: normalizedLabel,
            alertText: '',
            orderIndex: index * 100 + globalSequence,
            hasVariants: variantBuckets.size > 0,
            sortDate: eventDate
              ? eventDate.getTime()
              : (earliestPhaseDate ? earliestPhaseDate.getTime() : Number.POSITIVE_INFINITY),
            firstEventDate: earliestPhaseDate,
            primaryEvent: evt
          });
          globalSequence += 1;
        });
      }

      // Variant blocks (corrección, subsanación, ajuste, etc.)
      variantBuckets.forEach((variantEvents, variantKey) => {
        if (!variantEvents.length) {
          return;
        }

        const variantConfig = SPECIAL_EVENT_VARIANTS.find(v => v.key === variantKey);
        if (!variantConfig) {
          return;
        }

        const variantEarliest = this.getEarliestDateFromEvents(variantEvents);
        variantEvents.forEach((evt) => {
          const eventDate = evt && evt.Fecha ? new Date(evt.Fecha) : null;
          blocks.push({
            label: normalizedLabel,
            displayLabel: `${normalizedLabel} · ${variantConfig.displayLabel}`,
            status: this.determinePhaseStatus([evt], 'En proceso'),
            current: latestEvent === evt && !!latestVariant && latestVariant.key === variantKey,
            count: 1,
            events: variantEvents,
            date: eventDate,
            corrections: variantKey === 'correccion' ? 1 : 0,
            variantKey,
            variantBadge: variantConfig.badge,
            variantClass: variantConfig.className,
            baseLabel: normalizedLabel,
            alertText: variantConfig.badge,
            orderIndex: index * 100 + globalSequence,
            hasVariants: false,
            sortDate: eventDate
              ? eventDate.getTime()
              : (variantEarliest
                  ? variantEarliest.getTime()
                  : (earliestPhaseDate ? earliestPhaseDate.getTime() : Number.POSITIVE_INFINITY)),
            firstEventDate: variantEarliest || earliestPhaseDate,
            primaryEvent: evt
          });
          globalSequence += 1;
        });
      });
    });

    return blocks
      .filter(block => block.count > 0 || block.variantKey || block.hasVariants)
      .sort((a, b) => {
        const dateA = typeof a.sortDate === 'number' ? a.sortDate : Number.POSITIVE_INFINITY;
        const dateB = typeof b.sortDate === 'number' ? b.sortDate : Number.POSITIVE_INFINITY;

        if (dateA !== dateB) {
          return dateA - dateB;
        }

        const variantWeightA = a.variantKey ? 1 : 0;
        const variantWeightB = b.variantKey ? 1 : 0;
        if (variantWeightA !== variantWeightB) {
          return variantWeightA - variantWeightB;
        }

        if (a.orderIndex !== b.orderIndex) {
          return a.orderIndex - b.orderIndex;
        }

        return (a.displayLabel || a.label || '').localeCompare(b.displayLabel || b.label || '');
      });
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
  const counters = item.specialVariantCounters || {};
  const specialBadges = [];
  if (counters.correccion) {
    specialBadges.push(`<span class="etapa-correcciones correccion">Correcciones: ${counters.correccion}</span>`);
  }
  if (counters.subsanacion) {
    specialBadges.push(`<span class="etapa-correcciones subsanacion">Subsanaciones: ${counters.subsanacion}</span>`);
  }
  if (counters.ajuste) {
    specialBadges.push(`<span class="etapa-correcciones ajuste">Ajustes: ${counters.ajuste}</span>`);
  }
  const specialBadgesHtml = specialBadges.join('');
      
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
          const phaseClass = phase.status === 'Finalizado' ? 'phase-finalizado' : '';
          const currentClass = phase.current ? ' phase-current' : '';

          const colorIdx = (idx % 12) + 1;
          const colorClass = phase.variantClass
            ? ` ${phase.variantClass}`
            : (phase.status !== 'Finalizado' ? ` phase-color-${colorIdx}` : '');

          const safeLabel = (phase.displayLabel || phase.label || '').toString().replace(/"/g, '&quot;');
          const phaseDate = phase.date ? phase.date.toLocaleDateString('es-CO') : '';
          const badgeHtml = phase.variantBadge
            ? `<div class="phase-special-badge ${phase.variantKey}">${phase.variantBadge}</div>`
            : '';
          const correctionsHtml = phase.corrections > 0
            ? `<div class="phase-corrections">Correcciones: ${phase.corrections}</div>`
            : '';

          return `
            <div class="timeline-phase ${phaseClass}${currentClass}${colorClass}" data-phase-idx="${idx}">
              <div class="timeline-phase-header">
                <div class="phase-connector">
                  <div class="phase-line left ${idx === 0 ? 'hidden' : ''}"></div>
                  <div class="phase-dot" title="${safeLabel}"></div>
                  <div class="phase-line right ${idx === visiblePhases.length - 1 ? 'hidden' : ''}"></div>
                </div>
                <div class="phase-label">${phase.displayLabel || phase.label}</div>
              </div>
              <div class="phase-info">
                <div class="phase-date">${phaseDate}</div>
                ${phase.status === 'Finalizado' ? `<div class="phase-status-badge phase-finalizado">Finalizado</div>` : ''}
                ${badgeHtml}
                ${correctionsHtml}
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
              ${specialBadgesHtml}
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
      const variantKey = phase.variantKey || null;
      const variantBadge = phase.variantBadge || '';
      const specialCounts = events.reduce((acc, evt) => {
        const variant = getVariantForEvent(evt?.Evento);
        if (variant) {
          acc[variant.key] = (acc[variant.key] || 0) + 1;
        }
        return acc;
      }, {});
      const correctionsCount = specialCounts.correccion || 0;
      
      // Create header with etapa and phase info
      const headerHtml = `
        <div class="phase-details-header">
          <div class="phase-details-title">
            <div class="phase-details-etapa">${etapa}</div>
            <div class="phase-details-label">
              <strong>${phase.displayLabel || phase.label}</strong>
              ${phase.status === 'Finalizado' ? 
                `<span class="phase-details-badge finalizado">Finalizado</span>` : 
                ''}
              ${variantBadge ? `<span class="phase-details-badge special ${variantKey}">${variantBadge}</span>` : ''}
              ${!variantBadge && phase.hasVariants ? `<span class="phase-details-badge info">Tiene solicitudes especiales</span>` : ''}
              ${correctionsCount > 0 && !variantBadge ? `<span class="phase-details-badge correcciones">Correcciones: ${correctionsCount}</span>` : ''}
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
        const variant = getVariantForEvent(ev?.Evento);
        const statusBadges = [
          (ev.Estado === 'Finalizado') ? '<div class="event-status finalizado">Finalizado</div>' : '',
          variant ? `<div class="event-status ${variant.key}">${variant.badge}</div>` : ''
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
