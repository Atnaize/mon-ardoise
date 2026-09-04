"use client";

import { useEffect, useId, useRef, useState } from "react";

import { money } from "@/lib/format";

export interface ChartPoint {
  year: number;
  value: number;
  label?: string;
}

const PAD_TOP = 22;
const PAD_BOTTOM = 20;
const PAD_X = 4;
const HEIGHT = 168;

/**
 * Une seule courbe, une seule question : au-dessus ou en dessous de zéro.
 *
 * Encodage divergent autour d'une ligne de zéro neutre. Série unique, donc pas de
 * légende : celle du bloc dit ce qui est tracé. Trois étiquettes directes au
 * maximum : jamais un chiffre sur chaque point.
 */
export function NetPositionChart({
  points,
  locale,
  caption,
}: {
  points: ChartPoint[];
  locale: string;
  /** Décrit la courbe aux lecteurs d'écran. La courbe se lit seule, donc pas de légende visible. */
  caption: string;
}) {
  const clipId = useId().replace(/:/g, "");
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(320);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const node = box.current;
    if (!node) return;

    const observer = new ResizeObserver(() => setWidth(node.clientWidth || 320));
    observer.observe(node);
    setWidth(node.clientWidth || 320);

    return () => observer.disconnect();
  }, []);

  if (points.length < 2) {
    return null;
  }

  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const plotW = Math.max(1, width - PAD_X * 2);
  const values = points.map((point) => point.value);
  const lo = Math.min(0, ...values);
  const hi = Math.max(0, ...values);
  const span = hi - lo || 1;

  const x = (index: number) => PAD_X + (index / (points.length - 1)) * plotW;
  const y = (value: number) => PAD_TOP + plotH - ((value - lo) / span) * plotH;
  const zeroY = y(0);

  const line = points.map((point, index) => `${x(index)},${y(point.value)}`).join(" ");
  const area = `M ${PAD_X},${zeroY} L ${line.replaceAll(" ", " L ")} L ${x(points.length - 1)},${zeroY} Z`;

  // Deux fenêtres de découpe, une de chaque côté du zéro. La même aire et la même
  // ligne y sont dessinées deux fois, ce qui coupe net au croisement.
  const halves = [
    { key: "up", clip: `M 0,0 H ${width} V ${zeroY} H 0 Z`, color: "var(--positive)" },
    { key: "down", clip: `M 0,${zeroY} H ${width} V ${HEIGHT} H 0 Z`, color: "var(--negative)" },
  ];

  const marked = points
    .map((point, index) => ({ point, index }))
    .filter(({ point }) => point.label != null);

  const at = hover == null ? null : points[hover];

  const move = (clientX: number, target: SVGSVGElement) => {
    const rect = target.getBoundingClientRect();
    const px = (clientX - rect.left) * (width / rect.width);
    const raw = Math.round(((px - PAD_X) / plotW) * (points.length - 1));

    setHover(Math.max(0, Math.min(points.length - 1, raw)));
  };

  return (
    <figure className="m-0">
      <div ref={box} className="relative">
        <svg
          viewBox={`0 0 ${width} ${HEIGHT}`}
          width="100%"
          height={HEIGHT}
          role="img"
          aria-label={caption}
          className="block cursor-crosshair touch-pan-y"
          onMouseMove={(event) => move(event.clientX, event.currentTarget)}
          onMouseLeave={() => setHover(null)}
          onTouchStart={(event) => move(event.touches[0].clientX, event.currentTarget)}
          onTouchMove={(event) => move(event.touches[0].clientX, event.currentTarget)}
          onTouchEnd={() => setHover(null)}
        >
          <defs>
            {halves.map((half) => (
              <clipPath key={half.key} id={`${clipId}-${half.key}`}>
                <path d={half.clip} />
              </clipPath>
            ))}
          </defs>

          {halves.map((half) => (
            <g key={half.key} clipPath={`url(#${clipId}-${half.key})`}>
              <path d={area} fill={half.color} fillOpacity="0.12" />
              <polyline
                points={line}
                fill="none"
                stroke={half.color}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </g>
          ))}

          {/* Le zéro est la seule règle utile : au-dessus gagnant, en dessous perdant. */}
          <line
            x1={PAD_X}
            x2={width - PAD_X}
            y1={zeroY}
            y2={zeroY}
            stroke="var(--line)"
            strokeWidth="1"
          />

          {marked.map(({ point, index }) => (
            <g key={point.year}>
              <circle
                cx={x(index)}
                cy={y(point.value)}
                r="4.5"
                fill={point.value < 0 ? "var(--negative)" : "var(--positive)"}
                stroke="var(--ground)"
                strokeWidth="2"
              />
              <text
                x={x(index)}
                y={y(point.value) + (point.value < 0 ? 16 : -10)}
                textAnchor={
                  index > points.length * 0.7
                    ? "end"
                    : index < points.length * 0.15
                      ? "start"
                      : "middle"
                }
                className="fill-ink-3 font-sans text-[10px]"
              >
                {point.label}
              </text>
            </g>
          ))}

          {at ? (
            <g>
              <line
                x1={x(hover!)}
                x2={x(hover!)}
                y1={PAD_TOP - 6}
                y2={PAD_TOP + plotH}
                stroke="var(--line)"
                strokeWidth="1"
              />
              <circle
                cx={x(hover!)}
                cy={y(at.value)}
                r="4.5"
                fill={at.value < 0 ? "var(--negative)" : "var(--positive)"}
                stroke="var(--ground)"
                strokeWidth="2"
              />
            </g>
          ) : null}
        </svg>

        {at ? (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-[3px] bg-ink px-1.5 py-1 text-[11.5px] whitespace-nowrap text-ground"
            style={{
              left: `${(x(hover!) / width) * 100}%`,
              top: `${y(at.value) - 8}px`,
            }}
          >
            {at.year} · <b className="tabular-nums">{money(at.value, locale)}</b>
          </div>
        ) : null}
      </div>
    </figure>
  );
}
