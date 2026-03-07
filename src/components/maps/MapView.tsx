import { useCallback, useMemo, useState } from 'react';
import Map, { Marker, Popup } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { formatCurrency } from '../../lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  type: 'enquiry' | 'exhibition' | 'sale' | 'art_fair' | 'collector';
  label: string;
  value?: number;
  currency?: string;
  color: string;
  meta?: Record<string, string>;
}

interface MapViewProps {
  markers: MapMarker[];
  onMarkerClick?: (marker: MapMarker) => void;
  height?: string;
  className?: string;
}

const TYPE_COLORS: Record<MapMarker['type'], string> = {
  enquiry: '#3b82f6',    // blue
  exhibition: '#8b5cf6', // purple
  sale: '#c9a96e',       // gold
  art_fair: '#a855f7',   // violet
  collector: '#22c55e',  // green
};

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

// ---------------------------------------------------------------------------
// MapView
// ---------------------------------------------------------------------------
export function MapView({ markers, onMarkerClick, height = '500px', className = '' }: MapViewProps) {
  const [popup, setPopup] = useState<MapMarker | null>(null);

  // Calculate initial viewport from markers
  const initialViewState = useMemo(() => {
    if (markers.length === 0) return { latitude: 47, longitude: 8, zoom: 3 };
    const lats = markers.map((m) => m.lat);
    const lngs = markers.map((m) => m.lng);
    const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const midLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
    const latSpan = Math.max(...lats) - Math.min(...lats);
    const lngSpan = Math.max(...lngs) - Math.min(...lngs);
    const span = Math.max(latSpan, lngSpan);
    const zoom = span > 100 ? 1.5 : span > 50 ? 2.5 : span > 20 ? 3.5 : span > 5 ? 5 : 6;
    return { latitude: midLat, longitude: midLng, zoom };
  }, [markers]);

  const handleMarkerClick = useCallback(
    (marker: MapMarker) => {
      setPopup(marker);
      onMarkerClick?.(marker);
    },
    [onMarkerClick],
  );

  if (!MAPBOX_TOKEN) {
    return (
      <div className={`flex items-center justify-center rounded-lg border border-primary-200 bg-primary-50 ${className}`} style={{ height }}>
        <div className="text-center">
          <p className="text-sm font-medium text-primary-600">Map Not Configured</p>
          <p className="mt-1 text-xs text-primary-400">
            Add <code className="rounded bg-primary-100 px-1">VITE_MAPBOX_TOKEN</code> to your .env file
          </p>
          <p className="mt-2 text-xs text-primary-400">{markers.length} markers ready</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-lg border border-primary-200 ${className}`} style={{ height }}>
      <Map
        initialViewState={initialViewState}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/light-v11"
        style={{ width: '100%', height: '100%' }}
      >
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            latitude={marker.lat}
            longitude={marker.lng}
            anchor="center"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              handleMarkerClick(marker);
            }}
          >
            <div
              className="flex h-4 w-4 cursor-pointer items-center justify-center rounded-full border-2 border-white shadow-md transition-transform hover:scale-125"
              style={{ backgroundColor: marker.color || TYPE_COLORS[marker.type] }}
              title={marker.label}
            />
          </Marker>
        ))}

        {popup && (
          <Popup
            latitude={popup.lat}
            longitude={popup.lng}
            anchor="bottom"
            onClose={() => setPopup(null)}
            closeButton={true}
            closeOnClick={false}
            offset={12}
          >
            <div className="min-w-[140px] p-1">
              <p className="text-xs font-semibold text-gray-900">{popup.label}</p>
              <p className="mt-0.5 text-xs capitalize text-gray-500">{popup.type.replace('_', ' ')}</p>
              {popup.value != null && popup.value > 0 && (
                <p className="mt-0.5 text-xs font-medium text-emerald-600">
                  {formatCurrency(popup.value, popup.currency || 'CHF')}
                </p>
              )}
              {popup.meta &&
                Object.entries(popup.meta).map(([k, v]) => (
                  <p key={k} className="text-xs text-gray-500">
                    {k}: {v}
                  </p>
                ))}
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Legend helper
// ---------------------------------------------------------------------------
export function MapLegend({ items = [] }: { items?: Array<{ label: string; color: string; count: number }> }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-4">
      {items.map((item) => (
        <label key={item.label} className="flex items-center gap-1.5 text-xs text-primary-600">
          <span className="inline-block h-3 w-3 rounded-full border border-white shadow-sm" style={{ backgroundColor: item.color }} />
          {item.label} ({item.count})
        </label>
      ))}
    </div>
  );
}
