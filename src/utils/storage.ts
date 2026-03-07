import type { LatLng, Route } from '../types';

const ROUTES_KEY = 'pathtracer_routes';
const PIN_KEY = 'pathtracer_pin';

export function getSavedRoutes(): Route[] {
  try {
    const data = localStorage.getItem(ROUTES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveRoute(route: Route): void {
  const routes = getSavedRoutes();
  routes.unshift(route);
  localStorage.setItem(ROUTES_KEY, JSON.stringify(routes));
}

export function deleteRoute(id: string): void {
  const routes = getSavedRoutes().filter((r) => r.id !== id);
  localStorage.setItem(ROUTES_KEY, JSON.stringify(routes));
}

export function getSavedPin(): LatLng | null {
  try {
    const data = localStorage.getItem(PIN_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function savePin(pin: LatLng): void {
  localStorage.setItem(PIN_KEY, JSON.stringify(pin));
}

export function deletePin(): void {
  localStorage.removeItem(PIN_KEY);
}
