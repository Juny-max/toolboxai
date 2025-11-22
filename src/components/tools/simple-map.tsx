"use client";

import { useEffect, useRef } from "react";

interface SimpleMapProps {
  positions: Array<{ lat: number; lng: number; label: string }>;
  className?: string;
}

export function SimpleMap({ positions, className = "h-[360px] w-full rounded-lg border" }: SimpleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || positions.length === 0) return;

    const initializeMap = async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");

      // Fix for default markers
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        iconUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      });

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }

      const map = L.map(mapRef.current!).setView(
        [positions[0].lat, positions[0].lng],
        13
      );

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      positions.forEach((pos) => {
        L.marker([pos.lat, pos.lng])
          .addTo(map)
          .bindPopup(pos.label);
      });

      if (positions.length > 1) {
        const group = new L.FeatureGroup(
          positions.map((pos) => L.marker([pos.lat, pos.lng]))
        );
        map.fitBounds(group.getBounds(), { padding: [20, 20] });
      }

      mapInstanceRef.current = map;
    };

    initializeMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [positions]);

  if (positions.length === 0) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground ${className}`}
      >
        No locations to display
      </div>
    );
  }

  return <div ref={mapRef} className={className} />;
}
