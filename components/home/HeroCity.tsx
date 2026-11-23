"use client";

import { m } from "motion/react";

/**
 * The hero's living map: a stylised street grid draws itself, Report pins drop in and pulse, two Reports of the
 * same problem merge into one Issue, and one pin turns green when its Fix is confirmed. Pure SVG + Motion;
 * it holds still for reduced motion (MotionConfig in MotionProvider).
 */
const STREETS = [
  // the sector grid
  "M0 90 H800", "M0 200 H800", "M0 310 H800", "M0 420 H800",
  "M110 0 V520", "M260 0 V520", "M410 0 V520", "M560 0 V520", "M710 0 V520",
  // the avenues that cut across Islamabad
  "M0 470 L800 40", "M60 0 Q300 260 800 300",
];

const PINS: { x: number; y: number; c: string; d: number }[] = [
  { x: 185, y: 145, c: "#d1343b", d: 1.4 },
  { x: 335, y: 255, c: "#e26a1b", d: 1.8 },
  { x: 485, y: 145, c: "#e0a100", d: 2.2 },
  { x: 635, y: 365, c: "#d1343b", d: 2.6 },
  { x: 185, y: 365, c: "#e0a100", d: 3.0 },
  { x: 635, y: 145, c: "#e26a1b", d: 3.4 },
];

function Pin({ x, y, c, d }: { x: number; y: number; c: string; d: number }) {
  return (
    <g>
      <m.circle
        cx={x}
        cy={y}
        r={10}
        fill="none"
        stroke={c}
        strokeWidth={2}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: [0.6, 2.6], opacity: [0.7, 0] }}
        transition={{ delay: d + 0.4, duration: 2.2, repeat: Infinity, ease: "easeOut" }}
        style={{ transformOrigin: `${x}px ${y}px` }}
      />
      <m.circle
        cx={x}
        cy={y}
        r={7}
        fill={c}
        stroke="#0b1612"
        strokeWidth={3}
        initial={{ y: -40, opacity: 0, scale: 0.4 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ delay: d, type: "spring", stiffness: 380, damping: 14 }}
      />
    </g>
  );
}

export default function HeroCity({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 800 520" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      <defs>
        <radialGradient id="hc-fade" cx="62%" cy="45%" r="65%">
          <stop offset="0%" stopColor="#fff" stopOpacity="1" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id="hc-mask">
          <rect width="800" height="520" fill="url(#hc-fade)" />
        </mask>
        <linearGradient id="hc-street" x1="0" x2="1">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.15" />
          <stop offset="50%" stopColor="#34d399" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0.15" />
        </linearGradient>
      </defs>

      <g mask="url(#hc-mask)">
        {/* city blocks */}
        {[0, 1, 2, 3, 4].map((col) =>
          [0, 1, 2, 3].map((row) => (
            <m.rect
              key={`${col}-${row}`}
              x={120 + col * 150}
              y={100 + row * 110}
              width={130}
              height={90}
              rx={10}
              fill="#ffffff"
              initial={{ opacity: 0 }}
              animate={{ opacity: (col + row) % 3 === 0 ? 0.06 : 0.03 }}
              transition={{ delay: 0.3 + (col + row) * 0.06, duration: 0.8 }}
            />
          )),
        )}

        {/* streets draw themselves */}
        {STREETS.map((d, i) => (
          <m.path
            key={d}
            d={d}
            fill="none"
            stroke="url(#hc-street)"
            strokeWidth={i > 8 ? 3 : 1.5}
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ delay: 0.1 + i * 0.09, duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          />
        ))}

        {/* a light that travels along the avenue */}
        <m.circle
          r={4}
          fill="#f2b300"
          initial={{ offsetDistance: "0%", opacity: 0 }}
          animate={{ offsetDistance: "100%", opacity: [0, 1, 1, 0] }}
          transition={{ delay: 1.6, duration: 6, repeat: Infinity, ease: "linear" }}
          style={{ offsetPath: "path('M0 470 L800 40')" }}
        />

        {PINS.map((p) => (
          <Pin key={`${p.x}-${p.y}`} {...p} />
        ))}

        {/* two Reports of one pothole merge into one Issue */}
        <m.path
          d="M335 255 Q410 205 485 145"
          fill="none"
          stroke="#f2b300"
          strokeWidth={2}
          strokeDasharray="6 6"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: [0, 1, 1, 0.5] }}
          transition={{ delay: 3.8, duration: 1.2 }}
        />

        {/* and one Fix is confirmed: the pin turns green with a check */}
        <m.g initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 4.8, type: "spring", stiffness: 300, damping: 15 }} style={{ transformOrigin: "185px 145px" }}>
          <circle cx={185} cy={145} r={13} fill="#0e6b48" stroke="#34d399" strokeWidth={3} />
          <m.path
            d="M179 145 l4 4 l8 -8"
            fill="none"
            stroke="#fff"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 5.1, duration: 0.4 }}
          />
        </m.g>
      </g>
    </svg>
  );
}
