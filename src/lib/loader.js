/**
 * @fileoverview Utilidades para un loader global consistente en toda la app.
 * Administra variantes visuales, cuenta de solicitudes concurrentes y ofrece
 * funciones convenientes para envolver operaciones asíncronas.
 */

const VARIANT_CLASS = {
  solid: 'app-loader--blocking',
  blocking: 'app-loader--blocking',
  fullscreen: 'app-loader--blocking',
  transparent: 'app-loader--blocking',
  toast: 'app-loader--toast',
  inline: 'app-loader--inline'
};

const VARIANT_CLASS_LIST = ['app-loader--blocking', 'app-loader--toast', 'app-loader--inline'];

const DEFAULT_FETCH_SKIP_PATTERNS = [
  /\/health(\?|$)/i,
  /\/favicon\.ico$/i,
  /\.hot-update\./i
];

const fetchConfig = {
  message: 'Procesando...',
  style: 'blocking',
  minMs: 250,
  skipPatterns: [...DEFAULT_FETCH_SKIP_PATTERNS]
};

let loaderElement = null;
let activeCount = 0;
let fetchPatched = false;
let baseFetch = null;

function normalizeStyle(style) {
  const value = (style || '').toString().toLowerCase();
  return VARIANT_CLASS[value] ? value : 'blocking';
}

function ensureLoaderElement() {
  if (typeof document === 'undefined') return null;
  if (loaderElement && loaderElement.isConnected) return loaderElement;

  let el = document.getElementById('appLoader');
  if (!el) {
    el = document.createElement('div');
    el.id = 'appLoader';
    el.className = 'app-loader app-loader--blocking';
    el.setAttribute('role', 'alert');
    el.setAttribute('aria-live', 'assertive');
    el.innerHTML = `
      <div class="app-loader__backdrop" aria-hidden="true"></div>
      <div class="app-loader__inner" role="status">
        <div class="loader" aria-hidden="true">
          <span class="letter">U</span>
          <span class="letter">N</span>
          <span class="letter">G</span>
          <span class="letter">R</span>
          <span class="letter">D</span>
        </div>
        <p class="app-loader__message" data-role="message"></p>
      </div>
    `;

    if (document.body) {
      document.body.appendChild(el);
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        if (!el.isConnected && document.body) {
          document.body.appendChild(el);
        }
      }, { once: true });
    }
  }

  loaderElement = el;
  return loaderElement;
}

function applyVariant(el, style) {
  if (!el) return;
  const variant = VARIANT_CLASS[normalizeStyle(style)] || VARIANT_CLASS.blocking;
  VARIANT_CLASS_LIST.forEach(cls => el.classList.remove(cls));
  el.classList.add(variant);
}

function setMessage(el, message) {
  if (!el) return;
  const safeMessage = message && message.trim() ? message : 'Cargando...';
  const messageEl = el.querySelector('[data-role="message"]');
  if (messageEl) {
    messageEl.textContent = safeMessage;
    messageEl.hidden = !safeMessage;
  }
  const inner = el.querySelector('.app-loader__inner');
  if (inner) {
    inner.setAttribute('aria-label', safeMessage);
  }
}

function setDatasetActive(el, active) {
  if (!el) return;
  el.dataset.active = active ? 'true' : 'false';
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function shouldSkipUrl(url, patterns) {
  if (!url) return false;
  return patterns.some(pattern => {
    if (!pattern) return false;
    if (pattern instanceof RegExp) {
      return pattern.test(url);
    }
    if (typeof pattern === 'function') {
      try {
        return pattern(url) === true;
      } catch (err) {
        return false;
      }
    }
    const token = String(pattern);
    return token ? url.includes(token) : false;
  });
}

function hasSkipHeader(source) {
  if (!source || typeof source !== 'object') return false;
  const headers = source.headers;
  if (!headers) return false;

  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    return headers.has('X-Skip-Loader');
  }

  if (Array.isArray(headers)) {
    return headers.some(([name]) => String(name || '').toLowerCase() === 'x-skip-loader');
  }

  if (typeof headers === 'object') {
    return Object.keys(headers).some(name => name.toLowerCase() === 'x-skip-loader');
  }

  return false;
}

function isRequest(value) {
  return typeof Request !== 'undefined' && value instanceof Request;
}

function currentUrl(input) {
  if (typeof input === 'string') return input;
  if (isRequest(input)) return input.url;
  if (input && typeof input === 'object' && typeof input.url === 'string') {
    return input.url;
  }
  return '';
}

function extractLoaderHints(input, init, config) {
  const hints = {
    init,
    message: config.message,
    style: config.style,
    minMs: config.minMs,
    skip: false
  };

  const url = currentUrl(input);
  if (shouldSkipUrl(url, config.skipPatterns)) {
    hints.skip = true;
    return hints;
  }

  const maybeInit = init && typeof init === 'object' ? init : null;
  if (maybeInit) {
    if (maybeInit.loader === false || maybeInit.loaderSkip === true) {
      hints.skip = true;
    }
    if (typeof maybeInit.loaderMessage === 'string') {
      hints.message = maybeInit.loaderMessage;
    }
    if (typeof maybeInit.loaderStyle === 'string') {
      hints.style = maybeInit.loaderStyle;
    }
    if (typeof maybeInit.loaderMinMs === 'number' && maybeInit.loaderMinMs >= 0) {
      hints.minMs = maybeInit.loaderMinMs;
    }

    const hasCustomKeys = Object.prototype.hasOwnProperty.call(maybeInit, 'loader') ||
      Object.prototype.hasOwnProperty.call(maybeInit, 'loaderSkip') ||
      Object.prototype.hasOwnProperty.call(maybeInit, 'loaderMessage') ||
      Object.prototype.hasOwnProperty.call(maybeInit, 'loaderStyle') ||
      Object.prototype.hasOwnProperty.call(maybeInit, 'loaderMinMs');

    if (hasCustomKeys) {
      hints.init = { ...maybeInit };
      delete hints.init.loader;
      delete hints.init.loaderSkip;
      delete hints.init.loaderMessage;
      delete hints.init.loaderStyle;
      delete hints.init.loaderMinMs;
    }
  }

  if (!hints.skip && hasSkipHeader(init)) {
    hints.skip = true;
  }

  if (!hints.skip && isRequest(input) && hasSkipHeader({ headers: input.headers })) {
    hints.skip = true;
  }

  hints.style = normalizeStyle(hints.style);
  return hints;
}

export function showLoader(msg = 'Cargando...', style = 'blocking') {
  const el = ensureLoaderElement();
  if (!el) return;

  activeCount = Math.max(0, activeCount) + 1;
  applyVariant(el, style);
  setMessage(el, msg);
  setDatasetActive(el, true);

  if (typeof document !== 'undefined' && document.body) {
    document.body.classList.add('app-loader-visible');
  }
}

export function hideLoader(force = false) {
  if (typeof document === 'undefined') return;
  const el = loaderElement && loaderElement.isConnected ? loaderElement : document.getElementById('appLoader');
  if (!force) {
    activeCount = Math.max(0, activeCount - 1);
  } else {
    activeCount = 0;
  }

  if (activeCount > 0) return;

  setDatasetActive(el, false);
  if (document.body) {
    document.body.classList.remove('app-loader-visible');
  }

  if (el) {
    window.setTimeout(() => {
      if (activeCount === 0 && el.parentNode) {
        el.parentNode.removeChild(el);
        loaderElement = null;
      }
    }, 220);
  }
}

export async function showLoaderDuring(promiseOrFunc, msg = 'Procesando...', style = 'blocking', minMs = 300) {
  const start = Date.now();
  showLoader(msg, style);

  try {
    const result = typeof promiseOrFunc === 'function'
      ? await promiseOrFunc()
      : await promiseOrFunc;

    const elapsed = Date.now() - start;
    if (minMs > 0 && elapsed < minMs) {
      await delay(minMs - elapsed);
    }
    return result;
  } finally {
    hideLoader();
  }
}

export function configureLoader(options = {}) {
  if (!options || typeof options !== 'object') return;
  if (typeof options.message === 'string') {
    fetchConfig.message = options.message;
  }
  if (typeof options.style === 'string') {
    fetchConfig.style = normalizeStyle(options.style);
  }
  if (typeof options.minMs === 'number' && options.minMs >= 0) {
    fetchConfig.minMs = options.minMs;
  }
  if (Array.isArray(options.skipPatterns) && options.skipPatterns.length) {
    fetchConfig.skipPatterns.push(...options.skipPatterns);
  }
}

export function isLoaderActive() {
  return activeCount > 0;
}

export function enableFetchLoader(options = {}) {
  configureLoader(options);

  if (fetchPatched) return;
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') return;

  baseFetch = window.fetch.bind(window);
  window.fetch = async function fetchWithLoader(input, init) {
    const hints = extractLoaderHints(input, init, fetchConfig);
    if (hints.skip) {
      return baseFetch(input, hints.init);
    }

    const started = Date.now();
    showLoader(hints.message, hints.style);

    try {
      const response = await baseFetch(input, hints.init);
      const elapsed = Date.now() - started;
      if (hints.minMs > 0 && elapsed < hints.minMs) {
        await delay(hints.minMs - elapsed);
      }
      return response;
    } catch (error) {
      const elapsed = Date.now() - started;
      if (hints.minMs > 0 && elapsed < hints.minMs) {
        await delay(hints.minMs - elapsed);
      }
      throw error;
    } finally {
      hideLoader();
    }
  };

  fetchPatched = true;
}

if (typeof window !== 'undefined') {
  const initialConfig = window.APP_LOADER_CONFIG;
  if (initialConfig) {
    configureLoader(initialConfig);
  }

  enableFetchLoader();

  window.APP_LOADER = window.APP_LOADER || {};
  Object.assign(window.APP_LOADER, {
    showLoader,
    hideLoader,
    showLoaderDuring,
    enableFetchLoader,
    configureLoader,
    isActive: isLoaderActive
  });

  if (!window.showLoader) window.showLoader = showLoader;
  if (!window.hideLoader) window.hideLoader = hideLoader;
  if (!window.showLoaderDuring) window.showLoaderDuring = showLoaderDuring;
}

