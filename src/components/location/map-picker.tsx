"use client";

import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import { MAPS_CONFIG } from "@/src/config/maps";

type MapPickerProps = {
  latitude: number | null;
  longitude: number | null;
  disabled?: boolean;
  onChange: (coordinates: { latitude: number; longitude: number }) => void;
};

export default function MapPicker({ latitude, longitude, disabled = false, onChange }: MapPickerProps) {
  const mapElement = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const initialCoordinates = useRef({ latitude, longitude });
  const [available] = useState(Boolean(process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN));
  const reportChange = useEffectEvent(onChange);

  useEffect(() => {
    if (!available || !mapElement.current) {
      return;
    }

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";
    const center: [number, number] = [
      initialCoordinates.current.longitude ?? MAPS_CONFIG.defaultLongitude,
      initialCoordinates.current.latitude ?? MAPS_CONFIG.defaultLatitude
    ];
    const mapInstance = new mapboxgl.Map({ container: mapElement.current, style: "mapbox://styles/mapbox/streets-v12", center, zoom: MAPS_CONFIG.zoom });
    const nextMarker = new mapboxgl.Marker({ draggable: !disabled }).setLngLat(center).addTo(mapInstance);
    map.current = mapInstance;
    marker.current = nextMarker;

    nextMarker.on("dragend", () => {
      const position = nextMarker.getLngLat();
      reportChange({ latitude: position.lat, longitude: position.lng });
    });
    mapInstance.on("click", (event) => {
      if (disabled) {
        return;
      }
      nextMarker.setLngLat(event.lngLat);
      reportChange({ latitude: event.lngLat.lat, longitude: event.lngLat.lng });
    });

    return () => {
      marker.current = null;
      map.current = null;
      mapInstance.remove();
    };
  }, [available, disabled]);

  useEffect(() => {
    if (latitude === null || longitude === null || !marker.current || !map.current) {
      return;
    }

    marker.current.setLngLat([longitude, latitude]);
    map.current.flyTo({ center: [longitude, latitude], essential: true });
  }, [latitude, longitude]);

  if (!available) {
    return <div className="flex h-64 items-center justify-center rounded border bg-slate-100 p-4 text-center text-sm text-slate-500">Configura `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` para usar el mapa interactivo.</div>;
  }

  return <div ref={mapElement} className="h-64 w-full overflow-hidden rounded border" aria-label="Mapa para ajustar ubicación" />;
}