"use client";

import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef } from "react";

import { MAPS_CONFIG } from "@/src/config/maps";
import type { Coordinates } from "@/src/modules/delivery/route-optimizer";

function pin(color: string, label: string) {
  const element = document.createElement("div");
  element.textContent = label;
  element.style.cssText = `background:${color};color:#fff;font:600 12px sans-serif;min-width:28px;height:28px;border-radius:14px;display:flex;align-items:center;justify-content:center;padding:0 8px;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)`;
  return element;
}

export default function TrackingMap({ driver, destination }: { driver: Coordinates | null; destination: Coordinates | null }) {
  const container = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const driverMarker = useRef<mapboxgl.Marker | null>(null);
  const fitted = useRef(false);
  const initial = useRef({ driver, destination });
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  useEffect(() => {
    if (!token || !container.current) return;
    mapboxgl.accessToken = token;
    const start = initial.current.driver ?? initial.current.destination;
    const instance = new mapboxgl.Map({
      container: container.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [start?.longitude ?? MAPS_CONFIG.defaultLongitude, start?.latitude ?? MAPS_CONFIG.defaultLatitude],
      zoom: 14,
    });
    map.current = instance;
    return () => {
      driverMarker.current = null;
      map.current = null;
      fitted.current = false;
      instance.remove();
    };
  }, [token]);

  useEffect(() => {
    const instance = map.current;
    if (!instance || !destination) return;
    const marker = new mapboxgl.Marker({ element: pin("#2B2118", "Tu casa") }).setLngLat([destination.longitude, destination.latitude]).addTo(instance);
    return () => {
      marker.remove();
    };
  }, [destination]);

  useEffect(() => {
    const instance = map.current;
    if (!instance || !driver) return;
    if (!driverMarker.current) driverMarker.current = new mapboxgl.Marker({ element: pin("#D95D39", "🛵 Repartidor") }).setLngLat([driver.longitude, driver.latitude]).addTo(instance);
    else driverMarker.current.setLngLat([driver.longitude, driver.latitude]);

    if (!fitted.current) {
      fitted.current = true;
      if (destination) {
        const bounds = new mapboxgl.LngLatBounds([driver.longitude, driver.latitude], [driver.longitude, driver.latitude]);
        bounds.extend([destination.longitude, destination.latitude]);
        instance.fitBounds(bounds, { padding: 60, maxZoom: 16, duration: 0 });
      }
    } else {
      instance.easeTo({ center: [driver.longitude, driver.latitude], duration: 800 });
    }
  }, [driver, destination]);

  if (!token) return null;
  return <div ref={container} className="h-64 w-full overflow-hidden rounded-2xl border border-border" />;
}
