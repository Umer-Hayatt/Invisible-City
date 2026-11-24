"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useMemo } from "react";
import { Circle, MapContainer, Marker, Popup, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import { CITY_CENTER } from "@/lib/geo";
import type { NeighborhoodStat } from "@/lib/insights";
import { dirOf, getLocale, t } from "@/lib/i18n";
import { Issue, SEVERITY_WEIGHT, isActive } from "@/lib/types";
import { pinColor } from "./pin";
import { CategoryIcon, CriticalTag, StatusBadge, categoryLabel } from "./ui";

const LIGHT_TILES = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}";
// Esri dark grey canvas, so the map does not glare in dark mode.
const DARK_TILES = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}";
const DARK_LABELS = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}";

/** Popups sit inside the left-to-right map, so they take the page's direction back explicitly. */
const dir = () => dirOf(getLocale());

export type MapLayer = "issues" | "heat" | "sectors";

export interface MapProps {
  issues?: Issue[];
  neighborhoods?: NeighborhoodStat[];
  layer?: MapLayer;
  picked?: [number, number] | null;
  onPick?: (lat: number, lng: number) => void;
  focus?: [number, number] | null;
  zoom?: number;
  /** Always the dark tiles, whatever the theme. */
  night?: boolean;
  /** A picture of the map: no zooming, dragging or popups. */
  still?: boolean;
  className?: string;
}

function HeatLayer({ issues }: { issues: Issue[] }) {
  const map = useMap();
  useEffect(() => {
    let layer: L.Layer | null = null;
    let cancelled = false;
    (async () => {
      // leaflet.heat 1.x exports the layer class instead of adding L.heatLayer; its types still describe 0.x.
      const { HeatLayer: Heat } = (await import("leaflet.heat")) as unknown as {
        HeatLayer: new (points: [number, number, number][], options: L.HeatMapOptions) => L.Layer;
      };
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
      layer = new Heat(pts, {
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

/** A teardrop pin. The colour is the status, or red for a critical Issue that is still waiting. */
function pinIcon(color: string, size: number) {
  return L.divIcon({
    className: "pin",
    iconSize: [size, size * 1.34],
    iconAnchor: [size / 2, size * 1.34],
    popupAnchor: [0, -size],
    html: `<svg aria-hidden="true" viewBox="0 0 24 32" style="color:${color}"><path d="M12 1A11 11 0 0 0 1 12c0 8 11 19 11 19s11-11 11-19A11 11 0 0 0 12 1Z" fill="currentColor" stroke="var(--color-char)" stroke-width="1.5"/><circle cx="12" cy="12" r="4.2" fill="var(--color-char)"/></svg>`,
  });
}

const PICKED = pinIcon("var(--color-lime)", 32);

function IssuePin({ i, still, faint }: { i: Issue; still: boolean; faint: boolean }) {
  const critical = i.severity === "critical" && isActive(i.status);
  const icon = useMemo(() => pinIcon(pinColor(i.status, critical), critical ? 30 : 24), [i.status, critical]);
  const done = !isActive(i.status);
  return (
    <Marker
      position={[i.lat, i.lng]}
      icon={icon}
      title={i.title}
      alt={i.title}
      interactive={!still}
      keyboard={!still}
      opacity={faint ? 0.5 : done ? 0.75 : 1}
      zIndexOffset={critical ? 500 : done ? -500 : 0}
    >
      {!still && (
        <Popup>
          <div dir={dir()} className="min-w-[210px] font-sans">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted">
              <CategoryIcon category={i.category} size={14} /> {categoryLabel(i.category)}
            </div>
            <div className="mb-2 mt-1 text-base font-semibold leading-snug">{i.title}</div>
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusBadge status={i.status} />
              <CriticalTag severity={i.severity} status={i.status} />
            </div>
            <div className="my-2 text-sm text-muted">{t(i.report_count === 1 ? "map.reportedOnce" : "map.reportedBy", { n: i.report_count, place: i.neighborhood })}</div>
            <Link href={`/issues/${i.id}`} className="!text-brand text-sm font-semibold hover:underline">
              {t("map.openIssue", { id: i.id })}
            </Link>
          </div>
        </Popup>
      )}
    </Marker>
  );
}

export default function MapInner({
  issues = [],
  neighborhoods = [],
  layer = "issues",
  picked,
  onPick,
  focus,
  zoom = 12,
  night = false,
  still = false,
  className = "h-[480px]",
}: MapProps) {
  const themeDark = useTheme().resolvedTheme === "dark";
  const dark = night || themeDark;
  return (
    <MapContainer
      center={focus ?? CITY_CENTER}
      zoom={zoom}
      scrollWheelZoom={!still}
      dragging={!still}
      zoomControl={!still}
      attributionControl={!still}
      keyboard={!still}
      className={`z-0 w-full ${className}`}
    >
      <TileLayer
        attribution="&copy; Esri &middot; &copy; OpenStreetMap"
        url={dark ? DARK_TILES : LIGHT_TILES}
        maxZoom={19}
        maxNativeZoom={dark ? 16 : 19}
      />
      {dark && <TileLayer url={DARK_LABELS} maxZoom={19} maxNativeZoom={16} />}
      {focus && <Recenter focus={focus} />}
      {onPick && <ClickPicker onPick={onPick} />}

      {layer === "heat" && <HeatLayer issues={issues} />}

      {/* Sectors: how much of what was reported there has been fixed. */}
      {layer === "sectors" &&
        neighborhoods
          .filter((n) => n.total > 0)
          .map((n) => {
            const pct = Math.round(n.resolutionRate * 100);
            return (
              <Circle
                key={n.name}
                center={[n.lat, n.lng]}
                radius={850}
                pathOptions={{ color: "var(--color-lime)", weight: 1.5, fillColor: "var(--color-lime-600)", fillOpacity: 0.12 + 0.68 * n.resolutionRate }}
              >
                <Tooltip direction="center" permanent className="area-label">
                  {n.name} {pct}%
                </Tooltip>
                <Popup>
                  <div dir={dir()} className="font-sans">
                    <div className="text-base font-semibold">{n.name}</div>
                    <div className="mt-0.5 text-sm text-muted">{t("map.hoodPopup", { pct })}</div>
                  </div>
                </Popup>
              </Circle>
            );
          })}

      {layer !== "sectors" && issues.map((i) => <IssuePin key={i.id} i={i} still={still} faint={layer === "heat"} />)}

      {picked && (
        <Marker position={picked} icon={PICKED}>
          <Tooltip permanent direction="top" offset={[0, -38]}>
            {t("map.pickedLabel")}
          </Tooltip>
        </Marker>
      )}
    </MapContainer>
  );
}
