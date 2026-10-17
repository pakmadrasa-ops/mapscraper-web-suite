import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { useApp } from '../context/AppContext';
import { Crosshair, Layers, MapPin, Search, ZoomIn, ZoomOut, Check, Sliders } from 'lucide-react';

const PRESET_LOCATIONS = [
  { name: 'Lahore (PK)', coords: '31.5204,74.3587', zoom: 14 },
  { name: 'Karachi (PK)', coords: '24.8607,67.0011', zoom: 13 },
  { name: 'Islamabad (PK)', coords: '33.6844,73.0479', zoom: 14 },
  { name: 'Dubai (UAE)', coords: '25.2048,55.2708', zoom: 13 },
  { name: 'London (UK)', coords: '51.5074,-0.1278', zoom: 13 },
  { name: 'New York (US)', coords: '40.7128,-74.0060', zoom: 13 },
  { name: 'San Francisco (US)', coords: '37.7749,-122.4194', zoom: 14 },
];

export const MapSelector: React.FC = () => {
  const { flags, updateFlag } = useApp();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const bboxRectangleRef = useRef<L.Rectangle | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [tileLayerType, setTileLayerType] = useState<'streets' | 'light' | 'satellite'>('streets');
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Parse current geo
  const getCoords = (): [number, number] => {
    if (flags.geo && flags.geo.includes(',')) {
      const parts = flags.geo.split(',').map(s => parseFloat(s.trim()));
      if (!isNaN(parts[0]) && !isNaN(parts[1])) {
        return [parts[0], parts[1]];
      }
    }
    return [31.5204, 74.3587]; // Default Lahore
  };

  // Custom marker icon using crisp SVG
  const createCustomIcon = () => {
    return L.divIcon({
      className: 'custom-map-pin',
      html: `
        <div style="position: relative; width: 34px; height: 34px;">
          <div style="position: absolute; width: 34px; height: 34px; background: rgba(59, 130, 246, 0.25); border-radius: 50%; animation: pulse 2s infinite;"></div>
          <div style="position: absolute; top: 4px; left: 4px; width: 26px; height: 26px; background: #2563eb; border: 3px solid #ffffff; border-radius: 50%; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });
  };

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const [lat, lng] = getCoords();
    const map = L.map(mapContainerRef.current, {
      center: [lat, lng],
      zoom: flags.zoom || 15,
      zoomControl: false,
    });

    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    });
    streetLayer.addTo(map);
    tileLayerRef.current = streetLayer;

    // Pin marker
    const marker = L.marker([lat, lng], {
      icon: createCustomIcon(),
      draggable: true,
    }).addTo(map);

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      const newGeo = `${pos.lat.toFixed(5)},${pos.lng.toFixed(5)}`;
      updateFlag('geo', newGeo);
    });

    // Radius circle
    const circle = L.circle([lat, lng], {
      radius: flags.radius || 10000,
      color: '#2563eb',
      fillColor: '#3b82f6',
      fillOpacity: 0.15,
      weight: 2,
      dashArray: '4, 6',
    }).addTo(map);

    // Click handler to select coordinates anywhere on map
    map.on('click', (e: L.LeafletMouseEvent) => {
      const newGeo = `${e.latlng.lat.toFixed(5)},${e.latlng.lng.toFixed(5)}`;
      updateFlag('geo', newGeo);
      marker.setLatLng(e.latlng);
      circle.setLatLng(e.latlng);
    });

    // Zoom sync with flags
    map.on('zoomend', () => {
      const currentZoom = map.getZoom();
      if (currentZoom !== flags.zoom) {
        updateFlag('zoom', currentZoom);
      }
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;
    circleRef.current = circle;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Sync marker and circle when flags.geo or flags.radius changes externally
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current || !circleRef.current) return;

    const [lat, lng] = getCoords();
    const currentPos = markerRef.current.getLatLng();

    if (Math.abs(currentPos.lat - lat) > 0.0001 || Math.abs(currentPos.lng - lng) > 0.0001) {
      markerRef.current.setLatLng([lat, lng]);
      circleRef.current.setLatLng([lat, lng]);
      mapInstanceRef.current.setView([lat, lng], flags.zoom || 15);
    }

    circleRef.current.setRadius(flags.radius || 10000);
  }, [flags.geo, flags.radius]);

  // Sync zoom level if flags.zoom changed
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (mapInstanceRef.current.getZoom() !== flags.zoom) {
      mapInstanceRef.current.setZoom(flags.zoom);
    }
  }, [flags.zoom]);

  // Switch Tile Layer
  const setTileLayer = (type: 'streets' | 'light' | 'satellite') => {
    if (!mapInstanceRef.current) return;
    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    let url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    let attr = '&copy; OpenStreetMap contributors';

    if (type === 'light') {
      url = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
      attr = '&copy; CARTO';
    } else if (type === 'satellite') {
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      attr = '&copy; Esri World Imagery';
    }

    const newLayer = L.tileLayer(url, { attribution: attr, maxZoom: 19 });
    newLayer.addTo(mapInstanceRef.current);
    tileLayerRef.current = newLayer;
    setTileLayerType(type);
  };

  // Search geocode using OpenStreetMap Nominatim
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const item = data[0];
        const newLat = parseFloat(item.lat);
        const newLng = parseFloat(item.lon);
        const newGeo = `${newLat.toFixed(5)},${newLng.toFixed(5)}`;
        updateFlag('geo', newGeo);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([newLat, newLng], 14);
        }
      }
    } catch {
      // fallback
    } finally {
      setIsSearching(false);
    }
  };

  const handlePresetSelect = (preset: typeof PRESET_LOCATIONS[0]) => {
    updateFlag('geo', preset.coords);
    updateFlag('zoom', preset.zoom);
    if (mapInstanceRef.current) {
      const [lat, lng] = preset.coords.split(',').map(s => parseFloat(s));
      mapInstanceRef.current.setView([lat, lng], preset.zoom);
    }
  };

  // Convert meters to km for friendly display
  const radiusKm = ((flags.radius || 10000) / 1000).toFixed(1);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col">
      {/* Map Control Header */}
      <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <MapPin className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              Interactive Map Target & Radius Picker
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-semibold">
                -geo & -radius
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Click map to set center point or adjust radius circle</p>
          </div>
        </div>

        {/* Search Geocoder */}
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search city, e.g. Lahore, Gulberg..."
              className="bg-slate-900 border border-slate-700 text-sm rounded-xl pl-9 pr-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-64 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1 disabled:opacity-50"
          >
            {isSearching ? 'Locating...' : 'Go'}
          </button>
        </form>
      </div>

      {/* Preset Quick Chips */}
      <div className="px-4 py-2.5 bg-slate-900/60 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto text-sm">
        <span className="text-slate-400 text-xs whitespace-nowrap font-semibold flex items-center gap-1">
          <Crosshair className="w-3.5 h-3.5 text-slate-400" /> Presets:
        </span>
        {PRESET_LOCATIONS.map(p => (
          <button
            key={p.name}
            onClick={() => handlePresetSelect(p)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap border ${
              flags.geo === p.coords
                ? 'bg-blue-600/20 text-blue-300 border-blue-500/40'
                : 'bg-slate-800/70 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Map Viewport Area */}
      <div className="relative w-full h-[360px] bg-slate-950">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Map Overlays: Tile Switcher & Zoom */}
        <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
          {/* Tile Layer Selector */}
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-lg p-1 shadow-lg flex flex-col gap-1">
            <button
              onClick={() => setTileLayer('streets')}
              title="Standard Street Map"
              className={`p-1.5 rounded text-xs transition-colors flex items-center gap-1.5 ${
                tileLayerType === 'streets' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="text-[10px] font-medium">Street</span>
            </button>
            <button
              onClick={() => setTileLayer('light')}
              title="Carto Clean Light"
              className={`p-1.5 rounded text-xs transition-colors flex items-center gap-1.5 ${
                tileLayerType === 'light' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="text-[10px] font-medium">Light</span>
            </button>
            <button
              onClick={() => setTileLayer('satellite')}
              title="Satellite Imagery"
              className={`p-1.5 rounded text-xs transition-colors flex items-center gap-1.5 ${
                tileLayerType === 'satellite' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="text-[10px] font-medium">Satellite</span>
            </button>
          </div>

          {/* Quick Zoom Buttons */}
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-lg p-1 shadow-lg flex flex-col gap-1">
            <button
              onClick={() => mapInstanceRef.current?.zoomIn()}
              className="p-1.5 rounded text-slate-200 hover:bg-slate-800 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => mapInstanceRef.current?.zoomOut()}
              className="p-1.5 rounded text-slate-200 hover:bg-slate-800 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Live Active Coordinates Pill */}
        <div className="absolute bottom-3 left-3 z-[1000] bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-lg px-3 py-1.5 shadow-lg flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-200">
            <Crosshair className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-mono font-medium">{flags.geo}</span>
          </div>
          <span className="h-3 w-px bg-slate-700"></span>
          <div className="text-xs text-blue-400 font-medium">
            Radius: <span className="text-slate-200">{radiusKm} km</span> ({flags.radius}m)
          </div>
          <span className="h-3 w-px bg-slate-700"></span>
          <div className="text-xs text-slate-400 font-medium">
            Zoom: <span className="text-slate-200">{flags.zoom}</span>
          </div>
        </div>
      </div>

      {/* Synchronized Sliders & Manual Inputs */}
      <div className="p-4 bg-slate-950 border-t border-slate-800 grid grid-cols-1 gap-4">
        {/* Geo text box */}
        <div>
          <label className="text-sm font-semibold text-slate-200 block mb-1.5">
            Coordinates Flag (<code className="text-blue-400 font-mono text-xs">-geo</code>)
          </label>
          <div className="relative">
            <input
              type="text"
              value={flags.geo}
              onChange={e => updateFlag('geo', e.target.value)}
              placeholder="lat,lng (e.g. 31.4237,74.2136)"
              className="w-full bg-slate-900 border border-slate-700 text-sm rounded-xl px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Search radius slider */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-sm font-semibold text-slate-200">
              Search Radius (<code className="text-blue-400 font-mono text-xs">-radius</code>)
            </label>
            <span className="text-sm font-mono text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded">{radiusKm} km</span>
          </div>
          <input
            type="range"
            min={500}
            max={50000}
            step={500}
            value={flags.radius}
            onChange={e => updateFlag('radius', parseInt(e.target.value))}
            className="w-full accent-blue-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>500m</span>
            <span>10 km (Default)</span>
            <span>50 km</span>
          </div>
        </div>

        {/* Zoom level slider */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-sm font-semibold text-slate-200">
              Zoom Level (<code className="text-blue-400 font-mono text-xs">-zoom</code>)
            </label>
            <span className="text-sm font-mono text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded">{flags.zoom}</span>
          </div>
          <input
            type="range"
            min={3}
            max={21}
            step={1}
            value={flags.zoom}
            onChange={e => updateFlag('zoom', parseInt(e.target.value))}
            className="w-full accent-blue-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>Wide (3)</span>
            <span>City (15)</span>
            <span>Street (21)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
