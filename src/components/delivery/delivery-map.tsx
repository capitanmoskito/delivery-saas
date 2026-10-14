"use client";

import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef } from "react";

import { MAPS_CONFIG } from "@/src/config/maps";
import type { Coordinates } from "@/src/modules/delivery/route-optimizer";

export type MapPoint = Coordinates & { label: string; kind: "pickup" | "drop" | "origin" };

const colors = { pickup: "#2B2118", drop: "#D95D39", origin: "#2563EB" };

export default function DeliveryMap({ points }: { points: MapPoint[] }) {
  const element = useRef<HTMLDivElement | null>(null);
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  useEffect(() => {
    if (!token || !element.current) return;
    mapboxgl.accessToken = token;
    const first = points[0];
    const map = new mapboxgl.Map({
      container: element.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [first?.longitude ?? MAPS_CONFIG.defaultLongitude, first?.latitude ?? MAPS_CONFIG.defaultLatitude],
      zoom: MAPS_CONFIG.zoom - 3,
    });

    const markers = points.map((point) => {
      const pin = document.createElement("div");
      pin.textContent = point.label;
      pin.style.cssText = `background:${colors[point.kind]};color:#fff;font:600 12px sans-serif;min-width:26px;height:26px;border-radius:13px;display:flex;align-items:center;justify-content:center;padding:0 6px;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)`;
      return new mapboxgl.Marker({ element: pin }).setLngLat([point.longitude, point.latitude]).addTo(map);
    });

    map.on("load", () => {
      if (points.length < 2) return;
      map.addSource("route", {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: points.map((point) => [point.longitude, point.latitude]) } },
      });
      map.addLayer({ id: "route", type: "line", source: "route", paint: { "line-color": "#D95D39", "line-width": 4, "line-dasharray": [2, 1] } });
    });

    if (points.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      points.forEach((point) => bounds.extend([point.longitude, point.latitude]));
      map.fitBounds(bounds, { padding: 50, maxZoom: 15, duration: 0 });
    }

    return () => {
      markers.forEach((marker) => marker.remove());
      map.remove();
    };
  }, [points, token]);

  if (!token) return null;
  return <div ref={element} className="h-72 w-full overflow-hidden rounded-2xl border border-border" />;
}
