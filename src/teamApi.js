const API_BASE_URL = import.meta.env.VITE_IMAGE_API_BASE_URL || 'http://localhost:5174';
export const TEAM_SESSION_STORAGE_KEY = 'vistamz.teamSession.v1';

function parseJson(value, fallback = null) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function getStoredSession() {
  if (typeof window === 'undefined') return null;
  return parseJson(window.localStorage.getItem(TEAM_SESSION_STORAGE_KEY) || 'null');
}

export function getAccessToken() {
  return getStoredSession()?.accessToken || '';
}

export function storeTeamSession(session) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TEAM_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearTeamSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TEAM_SESSION_STORAGE_KEY);
}

async function request(path, options = {}) {
  const token = options.token ?? getAccessToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) {
    const error = new Error(payload.error || '团队服务暂时不可用，请稍后再试。');
    error.status = response.status;
    error.code = payload.code || '';
    throw error;
  }
  return payload;
}

export async function restoreTeamSession() {
  const stored = getStoredSession();
  if (!stored?.accessToken) return null;
  try {
    const result = await request('/api/auth/session', { token: stored.accessToken });
    return { ...stored, user: result.user };
  } catch {
    clearTeamSession();
    return null;
  }
}

export async function activateTeamInvite({ inviteHash, displayName, email, requestedRole, password }) {
  const result = await request('/api/auth/activate-invite', {
    method: 'POST',
    token: '',
    body: JSON.stringify({ inviteHash, displayName, email, requestedRole, password })
  });
  const session = {
    accessToken: result.accessToken,
    expiresAt: result.expiresAt,
    user: result.user
  };
  storeTeamSession(session);
  return session;
}

export async function loginTeamAccount({ email, password }) {
  const result = await request('/api/auth/login', {
    method: 'POST',
    token: '',
    body: JSON.stringify({ email, password })
  });
  const session = {
    accessToken: result.accessToken,
    expiresAt: result.expiresAt,
    user: result.user
  };
  storeTeamSession(session);
  return session;
}

export async function logoutTeamSession() {
  const token = getAccessToken();
  try {
    if (token) await request('/api/auth/logout', { method: 'POST', token });
  } finally {
    clearTeamSession();
  }
}

export async function listTeamProjects() {
  const result = await request('/api/projects');
  return result.projects || [];
}

export async function createTeamProject(payload) {
  const result = await request('/api/projects', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  return result.project;
}

export async function updateTeamProject(projectId, payload) {
  const result = await request(`/api/projects/${encodeURIComponent(projectId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
  return result.project;
}

export function getTeamApiBaseUrl() {
  return API_BASE_URL;
}
