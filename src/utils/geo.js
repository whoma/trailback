// Haversine distance between two [lat, lng] points in meters
export function getDistance(p1, p2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(p2[0] - p1[0]);
  const dLng = toRad(p2[1] - p1[1]);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(p1[0])) * Math.cos(toRad(p2[0])) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Total distance of a path (array of [lat, lng])
export function getTotalDistance(path) {
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    total += getDistance(path[i - 1], path[i]);
  }
  return total;
}

// Bearing from p1 to p2 in degrees (0 = north, clockwise)
export function getBearing(p1, p2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const dLng = toRad(p2[1] - p1[1]);
  const y = Math.sin(dLng) * Math.cos(toRad(p2[0]));
  const x =
    Math.cos(toRad(p1[0])) * Math.sin(toRad(p2[0])) -
    Math.sin(toRad(p1[0])) * Math.cos(toRad(p2[0])) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(2)}km`;
}

export function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h${m % 60}m`;
  if (m > 0) return `${m}m${s % 60}s`;
  return `${s}s`;
}
