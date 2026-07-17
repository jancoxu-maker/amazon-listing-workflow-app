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
  const timeoutMs = Math.max(1000, Number(options.timeoutMs || 15000));
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  const { token: _token, timeoutMs: _timeoutMs, ...fetchOptions } = options;
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
      ...(fetchOptions.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(fetchOptions.headers || {})
      }
    });
  } catch (error) {
    if (controller.signal.aborted) {
      const timeoutError = new Error('团队服务响应超时，请检查网络后重试。');
      timeoutError.code = 'REQUEST_TIMEOUT';
      throw timeoutError;
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
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

export async function listTrashedTeamProjects() {
  const result = await request('/api/projects/trash');
  return result.projects || [];
}

export async function listTeamBrands() {
  const result = await request('/api/brands');
  return result.brands || [];
}

export async function createTeamBrand(brand) {
  const result = await request('/api/brands', {
    method: 'POST',
    body: JSON.stringify({ id: brand?.id, name: brand?.name, rules: brand })
  });
  return result.brand;
}

export async function updateTeamBrand(brand) {
  const result = await request(`/api/brands/${encodeURIComponent(brand.id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ name: brand?.name, rules: brand })
  });
  return result.brand;
}

export async function deleteTeamBrand(brandId) {
  await request(`/api/brands/${encodeURIComponent(brandId)}`, { method: 'DELETE' });
}

export async function uploadTeamBrandLogo({ brandId, assetId, imageDataUrl }) {
  const result = await request('/api/brand-assets', {
    method: 'POST',
    timeoutMs: 60000,
    body: JSON.stringify({ brandId, assetId, imageDataUrl })
  });
  return result.asset;
}

export async function signProjectAssets(projectId, storageKeys = []) {
  const result = await request('/api/sign-assets', {
    method: 'POST',
    body: JSON.stringify({ projectId, storageKeys })
  });
  return result.assets || [];
}

export async function listGenerationTasks(projectId, limit = 50) {
  const result = await request(`/api/generation-tasks?projectId=${encodeURIComponent(projectId)}&limit=${encodeURIComponent(limit)}`);
  return result.tasks || [];
}

export async function cancelGenerationTask(projectId, taskId) {
  const result = await request(`/api/generation-tasks/${encodeURIComponent(taskId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ projectId, action: 'cancel' })
  });
  return result.task;
}

export async function listAdminGenerationTasks(limit = 100) {
  const result = await request(`/api/admin/generation-tasks?limit=${encodeURIComponent(limit)}`);
  return { tasks: result.tasks || [], summary: result.summary || {} };
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

export async function upgradeTeamProjectBrandSnapshot(projectId) {
  const result = await request(`/api/projects/${encodeURIComponent(projectId)}/brand-snapshot/upgrade`, {
    method: 'POST'
  });
  return result.project;
}

export async function trashTeamProject(projectId) {
  const result = await request(`/api/projects/${encodeURIComponent(projectId)}`, { method: 'DELETE' });
  return result.project;
}

export async function restoreTrashedTeamProject(projectId) {
  const result = await request(`/api/projects/${encodeURIComponent(projectId)}/restore`, { method: 'POST' });
  return result.project;
}

export async function uploadTeamProjectAsset({ projectId, referenceId, assetId, imageDataUrl }) {
  const result = await request('/api/project-assets', {
    method: 'POST',
    timeoutMs: 60000,
    body: JSON.stringify({ projectId, referenceId, assetId, imageDataUrl })
  });
  return result.asset;
}

export async function listTeamUsers() {
  const result = await request('/api/admin/users');
  return result.users || [];
}

export async function assignTeamProject(projectId, { userId, assignmentRole }) {
  await request(`/api/projects/${encodeURIComponent(projectId)}/assignments`, {
    method: 'POST',
    body: JSON.stringify({ userId, assignmentRole })
  });
}

export function getTeamApiBaseUrl() {
  return API_BASE_URL;
}
