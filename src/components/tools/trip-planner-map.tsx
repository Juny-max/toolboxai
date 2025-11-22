'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { TripPlannerOutput } from '@/ai/flows/trip-planner';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

type TripPlannerMapProps = {
  day?: TripPlannerOutput['itinerary'][number];
  destination: string;
};

type MarkerPoint = {
  lat: number;
  lng: number;
  label: string;
  displayName?: string;
};

export function TripPlannerMap({ day, destination }: TripPlannerMapProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Ensure Leaflet is properly initialized
    setIsReady(true);
  }, []);

  if (!isReady) {
    return (
      <div className="flex h-[360px] w-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        Preparing map…
      </div>
    );
  }

  // Use a unique key per day to force full DOM teardown between itinerary changes
  const mapKey = day ? `map-day-${day.day}-${day.activities.map(a => a.locationName).join('-')}` : 'map-empty';

  return (
    <TripPlannerMapContainer key={mapKey} day={day} destination={destination} />
  );
}

function TripPlannerMapContainer({ day, destination }: TripPlannerMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  
  const markers: MarkerPoint[] = useMemo(() => {
    if (!day) {
      return [];
    }
    return day.activities
      .filter((activity) => Boolean(activity.resolvedLocation))
      .map((activity) => {
        const resolved = activity.resolvedLocation!;
        return {
          lat: resolved.lat,
          lng: resolved.lng,
          label: activity.locationName,
          displayName: resolved.displayName ?? resolved.address,
        } satisfies MarkerPoint;
      });
  }, [day]);

  const bounds = useMemo(() => 
    markers.map((marker) => [marker.lat, marker.lng] as [number, number]),
    [markers]
  );

  // Always return a LatLngTuple ([number, number]) for center
  const center: [number, number] = markers.length > 0
    ? [markers[0].lat, markers[0].lng]
    : [0, 0];

  const zoom = markers.length > 0 ? 13 : 2;

  return (
    <div className="relative h-[360px] w-full overflow-hidden rounded-lg border">
      <MapContainer
        ref={mapRef}
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="h-full w-full"
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer 
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <AutoFitBounds positions={bounds} />
        {markers.map((marker, index) => (
          <Marker 
            key={`${marker.lat}-${marker.lng}-${index}`} 
            position={[marker.lat, marker.lng]}
          >
            <Popup>
              <div className="space-y-1">
                <p className="font-semibold">{marker.label}</p>
                {marker.displayName && (
                  <p className="text-xs text-muted-foreground">{marker.displayName}</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {markers.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80 text-center text-sm text-muted-foreground backdrop-blur-sm">
          <span>No mapped locations yet.</span>
          <span>Verified spots in {destination} will appear here.</span>
        </div>
      )}
    </div>
  );
}

type AutoFitBoundsProps = {
  positions: [number, number][];
};

function AutoFitBounds({ positions }: AutoFitBoundsProps) {
  const map = useMap();

  useEffect(() => {
    if (positions.length === 0 || !map) {
      return;
    }

    try {
      const latLngBounds = L.latLngBounds(positions);
      map.fitBounds(latLngBounds, { 
        padding: [32, 32],
        animate: false // Disable animation to prevent conflicts
      });
    } catch (error) {
      console.warn('Error fitting bounds:', error);
    }
  }, [positions, map]);

  return null;
}