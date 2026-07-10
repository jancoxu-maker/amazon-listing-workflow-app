const EVENT_QUEUE_STORAGE_KEY = 'vistamz.eventQueue.v1';
const SESSION_STORAGE_KEY = 'vistamz.sessionId.v1';
const INVITE_ACCESS_STORAGE_KEY = 'vistamz.inviteAccess.v1';
const IMAGE_API_BASE_URL = import.meta.env.VITE_IMAGE_API_BASE_URL || 'http://localhost:5174';
const APP_VERSION = import.meta.env.VITE_APP_VERSION || '0.1-beta';
const FLUSH_INTERVAL_MS = 5000;
const MAX_QUEUE_SIZE = 200;
const MAX_BATCH_SIZE = 25;

let flushTimer = null;
let isFlushing = false;

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function readQueue() {
  if (typeof window === 'undefined') return [];
  const queue = safeJsonParse(window.localStorage.getItem(EVENT_QUEUE_STORAGE_KEY) || '[]', []);
  return Array.isArray(queue) ? queue : [];
}

function writeQueue(queue) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(EVENT_QUEUE_STORAGE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE_SIZE)));
}

function createId(prefix) {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${randomPart}`;
}

export function getAppSessionId() {
  if (typeof window === 'undefined') return 'server';
  const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) return existing;
  const next = createId('session');
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, next);
  return next;
}

function getUserHint() {
  if (typeof window === 'undefined') return '';
  const access = safeJsonParse(window.localStorage.getItem(INVITE_ACCESS_STORAGE_KEY) || 'null', null);
  if (!access) return 'anonymous';
  return `${access.role || 'tester'}:${access.label || access.hash || 'unknown'}`;
}

function cleanPayload(value, depth = 0) {
  if (depth > 5) return '[truncated]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return value.length > 2000 ? `${value.slice(0, 2000)}...` : value;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.slice(0, 80).map((item) => cleanPayload(item, depth + 1));
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).slice(0, 80).map(([key, item]) => [
      key,
      cleanPayload(item, depth + 1)
    ]));
  }
  return String(value);
}

function createEvent(event, payload = {}, options = {}) {
  return {
    ts: new Date().toISOString(),
    event,
    level: options.level || 'info',
    sessionId: getAppSessionId(),
    userHint: options.userHint || getUserHint(),
    projectId: options.projectId || payload.projectId || '',
    step: options.step || payload.step || '',
    traceId: options.traceId || payload.traceId || '',
    payload: cleanPayload(payload),
    client: {
      appVersion: APP_VERSION,
      path: typeof window === 'undefined' ? '' : window.location.pathname,
      userAgent: typeof navigator === 'undefined' ? '' : navigator.userAgent
    }
  };
}

export async function flushEvents() {
  if (typeof window === 'undefined' || isFlushing) return;
  const queue = readQueue();
  if (!queue.length) return;
  isFlushing = true;
  const batch = queue.slice(0, MAX_BATCH_SIZE);
  try {
    const response = await fetch(`${IMAGE_API_BASE_URL}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: batch })
    });
    if (!response.ok) throw new Error('Event API unavailable');
    writeQueue(queue.slice(batch.length));
  } catch {
    writeQueue(queue);
  } finally {
    isFlushing = false;
  }
}

function scheduleFlush() {
  if (typeof window === 'undefined' || flushTimer) return;
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    flushEvents();
  }, FLUSH_INTERVAL_MS);
}

export function logEvent(event, payload = {}, options = {}) {
  if (typeof window === 'undefined') return null;
  const record = createEvent(event, payload, options);
  writeQueue([...readQueue(), record]);
  scheduleFlush();
  return record.traceId || record.sessionId;
}

export function logError(event, error, payload = {}) {
  return logEvent(event, {
    ...payload,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : ''
  }, { level: 'error', projectId: payload.projectId, step: payload.step, traceId: payload.traceId });
}

export function installGlobalErrorLogging() {
  if (typeof window === 'undefined') return;
  window.addEventListener('error', (event) => {
    logError('error.client.runtime', event.error || event.message, {
      source: event.filename,
      line: event.lineno,
      column: event.colno
    });
    flushEvents();
  });
  window.addEventListener('unhandledrejection', (event) => {
    logError('error.client.unhandled_rejection', event.reason || 'Unhandled promise rejection');
    flushEvents();
  });
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushEvents();
  });
  window.addEventListener('beforeunload', () => {
    flushEvents();
  });
}

export const appLogger = {
  log: logEvent,
  error: logError,
  flush: flushEvents
};
