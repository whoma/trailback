import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function createLocationIcon(heading) {
  const hasHeading = heading !== null && heading !== undefined;
  const rotation = hasHeading ? heading : 0;

  const svg = `
    <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      ${hasHeading ? `
      <defs>
        <radialGradient id="cone" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="rgba(79,109,245,0.35)"/>
          <stop offset="100%" stop-color="rgba(79,109,245,0)"/>
        </radialGradient>
      </defs>
      <path d="M24 24 L10 4 A22 22 0 0 1 38 4 Z"
            fill="url(#cone)"
            transform="rotate(${rotation}, 24, 24)"/>
      ` : ''}
      <circle cx="24" cy="24" r="7" fill="#4f6df5" stroke="white" stroke-width="3"/>
      <circle cx="24" cy="24" r="3" fill="white" opacity="0.6"/>
    </svg>`;

  return L.divIcon({
    className: '',
    html: svg,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
}

export default function MapView({
  position,
  heading,
  path,
  backtrackPath,
  backtrackTarget,
  onMapReady,
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const pathLineRef = useRef(null);
  const backtrackLineRef = useRef(null);
  const targetMarkerRef = useRef(null);
  const startMarkerRef = useRef(null);
  const accuracyCircleRef = useRef(null);

  // Initialize map
  useEffect(() => {
    if (mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView([39.9, 116.4], 15);

    // Use Gaode (AMap) tiles - better for China
    L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
      maxZoom: 18,
      subdomains: '1234',
    }).addTo(map);

    mapInstanceRef.current = map;
    onMapReady?.(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update current position marker with heading
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !position) return;

    const icon = createLocationIcon(heading);

    if (!markerRef.current) {
      markerRef.current = L.marker(position, { icon, zIndexOffset: 1000 }).addTo(map);
      map.setView(position, 16);
    } else {
      markerRef.current.setLatLng(position);
      markerRef.current.setIcon(icon);
    }
  }, [position, heading]);

  // Update recorded path
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (pathLineRef.current) {
      map.removeLayer(pathLineRef.current);
      pathLineRef.current = null;
    }
    if (startMarkerRef.current) {
      map.removeLayer(startMarkerRef.current);
      startMarkerRef.current = null;
    }

    if (path && path.length >= 2) {
      pathLineRef.current = L.polyline(path, {
        color: '#4f6df5',
        weight: 4,
        opacity: 0.8,
      }).addTo(map);

      // Start point marker
      const startIcon = L.divIcon({
        className: '',
        html: `<div style="
          width:12px;height:12px;
          background:#22c55e;
          border:3px solid white;
          border-radius:50%;
          box-shadow:0 0 8px rgba(34,197,94,0.6);
        "></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });
      startMarkerRef.current = L.marker(path[0], { icon: startIcon }).addTo(map);
    }
  }, [path]);

  // Update backtrack path and target
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (backtrackLineRef.current) {
      map.removeLayer(backtrackLineRef.current);
      backtrackLineRef.current = null;
    }
    if (targetMarkerRef.current) {
      map.removeLayer(targetMarkerRef.current);
      targetMarkerRef.current = null;
    }

    if (backtrackPath && backtrackPath.length >= 2) {
      backtrackLineRef.current = L.polyline(backtrackPath, {
        color: '#22c55e',
        weight: 4,
        opacity: 0.7,
        dashArray: '10, 8',
      }).addTo(map);
    }

    if (backtrackTarget) {
      const targetIcon = L.divIcon({
        className: '',
        html: `<div style="
          width:14px;height:14px;
          background:#ef4444;
          border:3px solid white;
          border-radius:50%;
          box-shadow:0 0 8px rgba(239,68,68,0.6);
        "></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      targetMarkerRef.current = L.marker(backtrackTarget, { icon: targetIcon }).addTo(map);
    }
  }, [backtrackPath, backtrackTarget]);

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
}
