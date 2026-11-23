"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Link from "next/link";
import { useEffect } from "react";
import { Circle, CircleMarker, MapContainer, Popup, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import { CITY_CENTER } from "@/lib/geo";
import type { NeighborhoodStat } from "@/lib/insights";
import { dirOf, getLocale, t } from "@/lib/i18n";
import { Issue, SEVERITY_WEIGHT, isActive, isFinished } from "@/lib/types";
import { CategoryIcon, SEVERITY_COLOR, SeverityBadge, StatusBadge, categoryLabel, healthColor } from "./ui";

/** Popups sit inside the left-to-right map, so they take the page's direction back explicitly. */
const dir = () => dirOf(getLocale());

export type MapLayer = "issues" | "heat" | "health";

export interface MapProps {
  issues?: Issue[];
  neighborhoods?: NeighborhoodStat[];
  layer?: MapLayer;
  picked?: [number, number] | null;
  onPick?: (lat: number, lng: number) => void;
  focus?: [number, number] | null;
  zoom?: number;
  className?: string;
}

function HeatLayer({ issues }: { issues: Issue[] }) {
  const map = useMap();
  useEffect(() => {
    let layer: L.Layer | null = null;
    let cancelled = false;
    (async () => {
      (window as unknown as { L: typeof L }).L = L;
      await import("leaflet.heat");
      if (cancelled) return;
      const pts = issues
        .filter((i) => isActive(i.status))
        .map(
          (i) =>
            [i.lat, i.lng, (SEVERITY_WEIGHT[i.severity] / 4) * Math.min(1, 0.4 + Math.sqrt(i.report_count) / 4)] as [
              number,
              number,
              number,
            ],
        );
      layer = L.heatLayer(pts, {
        radius: 38,
        blur: 28,
        maxZoom: 15,
        minOpacity: 0.3,
        gradient: { 0.2: "#fde68a", 0.45: "#f59e0b", 0.7: "#e26a1b", 1: "#b91c1c" },
      }).addTo(map);
    })();
    return () => {
      cancelled = true;
      if (layer) map.removeLayer(layer);
    };
  }, [issues, map]);
  return null;
}

function ClickPicker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

function Recenter({ focus, zoom }: { focus: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(focus, zoom ?? Math.max(map.getZoom(), 15));
  }, [focus, zoom, map]);
  return null;
}

export default function MapInner({
  issues = [],
  neighborhoods = [],
  layer = "issues",
  picked,
  onPick,
  focus,
  zoom = 12,
  className = "h-[480px]",
}: MapProps) {
  return (
    <MapContainer center={focus ?? CITY_CENTER} zoom={zoom} scrollWheelZoom className={`z-0 w-full ${className}`}>
      <TileLayer
        attribution="&copy; Esri &middot; &copy; OpenStreetMap"
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
        maxZoom={19}
      />
      {focus && <Recenter focus={focus} />}
      {onPick && <ClickPicker onPick={onPick} />}

      {layer === "heat" && <HeatLayer issues={issues} />}

      {layer === "health" &&
        neighborhoods
          .filter((n) => n.total > 0)
          .map((n) => (
            <Circle
              key={n.name}
              center={[n.lat, n.lng]}
              radius={850}
              pathOptions={{
                color: n.neglected ? "#d1343b" : healthColor(n.healthScore),
                weight: n.neglected ? 2.5 : 1,
                dashArray: n.neglected ? "6 6" : undefined,
                fillColor: healthColor(n.healthScore),
                fillOpacity: 0.28,
              }}
            >
              <Tooltip direction="center" permanent className="area-label">
                {n.name} · {n.healthScore}
              </Tooltip>
              <Popup>
                <div dir={dir()}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{n.name}</div>
                  <div style={{ fontSize: 12, color: "#6f7a74", marginTop: 2 }}>
                    {t("map.hoodPopup", { health: n.healthScore, resolved: n.resolved, total: n.total, open: n.open })}
                  </div>
                  {n.neglected && <div style={{ color: "#d1343b", fontWeight: 600, fontSize: 12, marginTop: 6 }}>{t("home.neglectedTitle")}</div>}
                </div>
              </Popup>
            </Circle>
          ))}

      {layer !== "health" &&
        issues.map((i) => {
          // Finished Issues fade out: green when a Citizen confirmed the Fix, grey when it closed unconfirmed.
          const finished = isFinished(i.status);
          const doneColor = i.status === "resolved" ? "#0e6b48" : "#8a8f98";
          return (
            <CircleMarker
              key={i.id}
              center={[i.lat, i.lng]}
              radius={5 + Math.min(10, Math.sqrt(i.report_count) * 2.5)}
              pathOptions={{
                // Critical Issues still waiting on the city pulse a red ring (CSS .pulse-critical; still for reduced motion).
                color: finished ? doneColor : i.severity === "critical" ? SEVERITY_COLOR.critical : "#ffffff",
                weight: finished ? 1.5 : 2,
                fillColor: finished ? doneColor : SEVERITY_COLOR[i.severity],
                fillOpacity: finished ? 0.18 : layer === "heat" ? 0.45 : 0.92,
                className: !finished && i.severity === "critical" ? "pulse-critical" : undefined,
              }}
            >
              <Popup>
                <div dir={dir()} style={{ minWidth: 210 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: "#6f7a74" }}>
                    <CategoryIcon category={i.category} size={13} /> {categoryLabel(i.category)}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, margin: "4px 0 8px" }}>{i.title}</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <SeverityBadge severity={i.severity} />
                    <StatusBadge status={i.status} />
                  </div>
                  <div style={{ fontSize: 12, color: "#6f7a74", margin: "8px 0" }}>
                    {i.neighborhood} · {t("map.reportCount", { n: i.report_count })}
                  </div>
                  <Link href={`/issues/${i.id}`} style={{ fontWeight: 700, color: "#0e6b48" }}>
                    {t("map.openIssue", { id: i.id })}
                  </Link>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

      {picked && (
        <CircleMarker center={picked} radius={10} pathOptions={{ color: "#ffffff", weight: 4, fillColor: "#0e6b48", fillOpacity: 1 }}>
          <Tooltip permanent direction="top" offset={[0, -12]}>
            {t("map.pickedLabel")}
          </Tooltip>
        </CircleMarker>
      )}
    </MapContainer>
  );
}
