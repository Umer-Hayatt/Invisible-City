"use client";

import dynamic from "next/dynamic";
import { t } from "@/lib/i18n";
import type { MapProps } from "./MapInner";

const MapInner = dynamic(() => import("./MapInner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[300px] w-full items-center justify-center bg-sunken text-sm text-muted">
      {t("map.loading")}
    </div>
  ),
});

/**
 * The map itself always lays out left to right, so Leaflet's zoom buttons and attribution stay where Leaflet
 * puts them in Urdu too; the popups inside switch back to the page's direction.
 */
export default function CityMap(props: MapProps) {
  return (
    <div dir="ltr" className="contents">
      <MapInner {...props} />
    </div>
  );
}
export type { MapLayer } from "./MapInner";
export { pinColor } from "./pin";
