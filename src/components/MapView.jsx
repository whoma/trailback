import { useEffect, useRef, useState, useCallback } from 'react';
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
  carPin,
  onMapReady,
  autoFollow,
  onAutoFollowChange,
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const pathLineRef = useRef(null);
  const backtrackLineRef = useRef(null);
  const targetMarkerRef = useRef(null);
  const startMarkerRef = useRef(null);
  const accuracyCircleRef = useRef(null);
  const tileLayerGroupRef = useRef(null);
  const programmaticMoveRef = useRef(false);
  const carPinMarkerRef = useRef(null);

  const [isSatellite, setIsSatellite] = useState(false);

  // Initialize map
  useEffect(() => {
    if (mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView([39.9, 116.4], 15);

    // Normal tile layer (Gaode)
    const normalLayer = L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
      maxZoom: 18,
      subdomains: '1234',
    });

    const layerGroup = L.layerGroup([normalLayer]).addTo(map);
    tileLayerGroupRef.current = layerGroup;

    // Detect user-initiated map drag to disable auto-follow
    map.on('movestart', () => {
      if (!programmaticMoveRef.current) {
        onAutoFollowChange?.(false);
      }
    });

    mapInstanceRef.current = map;
    onMapReady?.(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Toggle map layer between normal and satellite
  const handleToggleLayer = useCallback(() => {
    const group = tileLayerGroupRef.current;
    if (!group) return;

    group.clearLayers();

    if (!isSatellite) {
      // Switch to satellite + labels
      const satLayer = L.tileLayer('https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}', {
        maxZoom: 18,
        subdomains: '1234',
      });
      const labelLayer = L.tileLayer('https://webst0{s}.is.autonavi.com/appmaptile?style=8&x={x}&y={y}&z={z}', {
        maxZoom: 18,
        subdomains: '1234',
      });
      group.addLayer(satLayer);
      group.addLayer(labelLayer);
    } else {
      // Switch to normal
      const normalLayer = L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
        maxZoom: 18,
        subdomains: '1234',
      });
      group.addLayer(normalLayer);
    }

    setIsSatellite(!isSatellite);
  }, [isSatellite]);

  // Update current position marker with heading + auto-follow
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !position) return;

    const icon = createLocationIcon(heading);

    if (!markerRef.current) {
      markerRef.current = L.marker(position, { icon, zIndexOffset: 1000 }).addTo(map);
      programmaticMoveRef.current = true;
      map.setView(position, 16);
      setTimeout(() => { programmaticMoveRef.current = false; }, 300);
    } else {
      markerRef.current.setLatLng(position);
      markerRef.current.setIcon(icon);

      if (autoFollow) {
        programmaticMoveRef.current = true;
        map.setView(position, map.getZoom(), { animate: true });
        setTimeout(() => { programmaticMoveRef.current = false; }, 300);
      }
    }
  }, [position, heading, autoFollow]);

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

  // Update car pin marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (carPinMarkerRef.current) {
      map.removeLayer(carPinMarkerRef.current);
      carPinMarkerRef.current = null;
    }

    if (carPin) {
      const pinIcon = L.divIcon({
        className: '',
        html: `<div style="
          display:flex;align-items:center;justify-content:center;
          width:32px;height:32px;
          background:#ef4444;
          border:3px solid white;
          border-radius:50%;
          box-shadow:0 2px 8px rgba(239,68,68,0.5);
          font-size:16px;font-weight:bold;color:white;
        ">P</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      carPinMarkerRef.current = L.marker(carPin, { icon: pinIcon, zIndexOffset: 900 }).addTo(map);
    }
  }, [carPin]);

  const btnStyle = {
    width: 40,
    height: 40,
    borderRadius: 8,
    border: 'none',
    background: 'white',
    boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: 18,
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

      {/* Layer toggle button - top right */}
      <button
        onClick={handleToggleLayer}
        style={{
          ...btnStyle,
          position: 'absolute',
          top: 12,
          right: 12,
          zIndex: 1000,
        }}
        title={isSatellite ? '切换普通地图' : '切换卫星地图'}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2">
          {isSatellite ? (
            // Map icon (switch to normal)
            <>
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
              <line x1="8" y1="2" x2="8" y2="18" />
              <line x1="16" y1="6" x2="16" y2="22" />
            </>
          ) : (
            // Satellite/globe icon (switch to satellite)
            <>
              <circle cx="12" cy="12" r="10" />
              <ellipse cx="12" cy="12" rx="4" ry="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
            </>
          )}
        </svg>
      </button>

      {/* Auto-follow button - right side, below layer toggle */}
      <button
        onClick={() => onAutoFollowChange?.(!autoFollow)}
        style={{
          ...btnStyle,
          position: 'absolute',
          top: 62,
          right: 12,
          zIndex: 1000,
          background: autoFollow ? '#4f6df5' : 'white',
          color: autoFollow ? 'white' : '#333',
        }}
        title={autoFollow ? '关闭跟随' : '开启跟随'}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={autoFollow ? 'white' : '#333'} strokeWidth="2">
          <path d="M12 2L12 6" />
          <path d="M12 18L12 22" />
          <path d="M2 12L6 12" />
          <path d="M18 12L22 12" />
          <circle cx="12" cy="12" r="4" />
          {autoFollow && <circle cx="12" cy="12" r="1.5" fill={autoFollow ? 'white' : '#333'} stroke="none" />}
        </svg>
      </button>
    </div>
  );
}
