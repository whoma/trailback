const ROUTES_KEY = 'pathtracer_routes';
const PIN_KEY = 'pathtracer_pin';

export function getSavedRoutes() {
  try {
    const data = localStorage.getItem(ROUTES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveRoute(route) {
  const routes = getSavedRoutes();
  routes.unshift(route);
  localStorage.setItem(ROUTES_KEY, JSON.stringify(routes));
}

export function deleteRoute(id) {
  const routes = getSavedRoutes().filter((r) => r.id !== id);
  localStorage.setItem(ROUTES_KEY, JSON.stringify(routes));
}

export function getSavedPin() {
  try {
    const data = localStorage.getItem(PIN_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function savePin(pin) {
  localStorage.setItem(PIN_KEY, JSON.stringify(pin));
}

export function deletePin() {
  localStorage.removeItem(PIN_KEY);
}
