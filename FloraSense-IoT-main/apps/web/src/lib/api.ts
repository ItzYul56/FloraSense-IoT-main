const safeGetItem = (k: string) => { try { return typeof window !== 'undefined' ? window.localStorage.getItem(k) : null; } catch(e) { return null; } };
export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  let token = null;
  try {
    if (typeof window !== 'undefined') {
      token = safeGetItem('fs_jwt_token');
    }
  } catch(e) {}
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:3001${endpoint}`, {
    cache: 'no-store',
    ...options,
    headers,
  });

  if (response.status === 401) {
    if (typeof window !== 'undefined') { try { window.localStorage.removeItem('fs_jwt_token'); window.localStorage.removeItem('fs_auth_token'); } catch(e){} window.location.reload(); }
    throw new Error('No autorizado. Sesión expirada.');
  }

  return response;
}
