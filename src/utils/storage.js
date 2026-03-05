const STORAGE_KEY = 'pathtracer_routes';

export function getSavedRoutes() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveRoute(route) {
  const routes = getSavedRoutes();
  routes.unshift(route);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(routes));
}

export function deleteRoute(id) {
  const routes = getSavedRoutes().filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(routes));
}
