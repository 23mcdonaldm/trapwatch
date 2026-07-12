import React, { useMemo, useState } from 'react';
import { ApiHistoryPoint, ApiHistorySide } from '@/types/odds';

type SideKey = 'home' | 'away' | 'over' | 'under';

export interface MovementSideOption {
  key: SideKey;
  label: string; // real team name or Over/Under
}

interface Props {
  points: ApiHistoryPoint[];
  sides: [MovementSideOption, MovementSideOption];
  /** 'odds' = plot the side's American odds (Moneyline). 'line' = step chart of the market line (Spread/Total). */
  mode: 'odds' | 'line';
  /** Spread only: the stored line is home-perspective; flip its sign when the second (away) side is selected. */
  flipLineForSecondSide?: boolean;
}

const W = 560;
const H = 170;
const PAD = { top: 14, right: 16, bottom: 26, left: 44 };

const fmtOdds = (odds: number | null | undefined): string =>
  odds === null || odds === undefined ? '—' : odds > 0 ? `+${odds}` : `${odds}`;

const fmtSigned = (v: number): string => (v > 0 ? `+${v}` : `${v}`);

const fmtTimeET = (iso: string, withDay: boolean): string => {
  const d = new Date(iso);
  const time = d.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' });
  if (!withDay) return time;
  const day = d.toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric' });
  return `${day} ${time}`;
};

/**
 * Compact SVG odds-movement chart. Spread/Total plot the LINE as a step chart
 * (line moves are the story; price is per-point detail) — Moneyline plots the
 * selected side's American odds. Dots render only where something changed
 * (plus first/last); clicking one shows time, price, bets % and handle %.
 */
export const MovementChart: React.FC<Props> = ({ points, sides, mode, flipLineForSecondSide = false }) => {
  const [sideKey, setSideKey] = useState<SideKey>(sides[0].key);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const isSecondSide = sideKey === sides[1].key;
  const signedValues = mode === 'odds' || flipLineForSecondSide;

  const series = useMemo(() => {
    const rows: Array<{ t: number; iso: string; value: number; side: ApiHistorySide }> = [];
    for (const p of points) {
      const side = p[sideKey];
      const raw = mode === 'odds' ? side?.odds : p.line;
      if (raw === null || raw === undefined || !side) continue;
      const value = mode === 'line' && flipLineForSecondSide && isSecondSide ? -raw : raw;
      rows.push({ t: Date.parse(p.t), iso: p.t, value, side });
    }
    return rows;
  }, [points, sideKey, mode, flipLineForSecondSide, isSecondSide]);

  if (series.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-slate-400 dark:text-slate-500">
        Not enough movement data yet.
      </div>
    );
  }

  const tMin = series[0].t;
  const tMax = series[series.length - 1].t;
  const spansDays = tMax - tMin > 24 * 3600 * 1000;
  const values = series.map(r => r.value);
  let vMin = Math.min(...values);
  let vMax = Math.max(...values);
  if (mode === 'odds') {
    // Never tighter than 10 total (5 per tick gap) — a -105 -> -106 move
    // shouldn't render as a dramatic swing. Stretches normally beyond that.
    const mid = (vMin + vMax) / 2;
    const total = Math.max((vMax - vMin) * 1.3, 10);
    vMin = mid - total / 2;
    vMax = mid + total / 2;
  } else if (vMin === vMax) {
    // Flat line series still needs a y-range to draw against
    vMin -= 1;
    vMax += 1;
  } else {
    const pad = (vMax - vMin) * 0.15;
    vMin -= pad;
    vMax += pad;
  }

  const x = (t: number): number =>
    tMax === tMin ? W / 2 : PAD.left + ((t - tMin) / (tMax - tMin)) * (W - PAD.left - PAD.right);
  const y = (v: number): number =>
    PAD.top + ((vMax - v) / (vMax - vMin)) * (H - PAD.top - PAD.bottom);

  // Path: step-after for line mode (a line holds until it moves), straight segments for odds
  let path = `M ${x(series[0].t)} ${y(series[0].value)}`;
  for (let i = 1; i < series.length; i++) {
    if (mode === 'line') {
      path += ` H ${x(series[i].t)} V ${y(series[i].value)}`;
    } else {
      path += ` L ${x(series[i].t)} ${y(series[i].value)}`;
    }
  }

  // Dots only where something changed (value, price, or splits), plus first and last
  const isDot = (i: number): boolean => {
    if (i === 0 || i === series.length - 1) return true;
    const a = series[i - 1];
    const b = series[i];
    return (
      a.value !== b.value ||
      a.side.odds !== b.side.odds ||
      a.side.betsPct !== b.side.betsPct ||
      a.side.handlePct !== b.side.handlePct
    );
  };

  const fmtValue = (v: number): string =>
    mode === 'odds' ? fmtOdds(v) : signedValues ? fmtSigned(v) : `${v}`;

  const yTicks = [vMax, (vMin + vMax) / 2, vMin];
  const active = activeIdx !== null ? series[activeIdx] : null;
  const latest = series[series.length - 1];

  return (
    <div>
      {/* Side toggle (real names) + latest value */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
          {sides.map(s => (
            <button
              key={s.key}
              onClick={() => { setSideKey(s.key); setActiveIdx(null); }}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                sideKey === s.key
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
          Now: <span className="font-mono text-slate-900 dark:text-white">{fmtValue(latest.value)}</span>
          {mode === 'line' && <span className="font-mono text-slate-400 ml-1">({fmtOdds(latest.side.odds)})</span>}
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Odds movement chart">
        {/* Y grid + labels */}
        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} className="stroke-slate-200 dark:stroke-slate-800" strokeWidth={1} strokeDasharray="3 4" />
            <text x={PAD.left - 6} y={y(v) + 3.5} textAnchor="end" className="fill-slate-400 dark:fill-slate-500 font-mono" fontSize={10}>
              {mode === 'odds' ? fmtOdds(Math.round(v)) : signedValues ? fmtSigned(Math.round(v * 2) / 2) : `${Math.round(v * 2) / 2}`}
            </text>
          </g>
        ))}

        {/* X labels: first + last snapshot times (ET) */}
        <text x={x(tMin)} y={H - 8} textAnchor="start" className="fill-slate-400 dark:fill-slate-500" fontSize={10}>
          {fmtTimeET(series[0].iso, spansDays)}
        </text>
        {series.length > 1 && (
          <text x={x(tMax)} y={H - 8} textAnchor="end" className="fill-slate-400 dark:fill-slate-500" fontSize={10}>
            {fmtTimeET(latest.iso, spansDays)}
          </text>
        )}

        {/* Movement path */}
        {series.length > 1 && (
          <path d={path} fill="none" className="stroke-orange-500" strokeWidth={2} strokeLinejoin="round" />
        )}

        {/* Clickable dots at change points */}
        {series.map((r, i) =>
          isDot(i) ? (
            <g key={i} onClick={() => setActiveIdx(activeIdx === i ? null : i)} className="cursor-pointer">
              {/* generous invisible hit area for touch */}
              <circle cx={x(r.t)} cy={y(r.value)} r={12} fill="transparent" />
              <circle
                cx={x(r.t)}
                cy={y(r.value)}
                r={activeIdx === i ? 5.5 : 4}
                className={activeIdx === i ? 'fill-orange-600 stroke-white dark:stroke-slate-900' : 'fill-white dark:fill-slate-900 stroke-orange-500'}
                strokeWidth={2}
              />
            </g>
          ) : null
        )}
      </svg>

      {/* Selected point detail */}
      {active && (
        <div className="mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span className="font-bold text-slate-500 dark:text-slate-400">{fmtTimeET(active.iso, true)} ET</span>
          {mode === 'line' && (
            <span className="text-slate-600 dark:text-slate-300">Line <span className="font-mono font-bold text-slate-900 dark:text-white">{fmtValue(active.value)}</span></span>
          )}
          <span className="text-slate-600 dark:text-slate-300">Price <span className="font-mono font-bold text-slate-900 dark:text-white">{fmtOdds(active.side.odds)}</span></span>
          <span className="text-slate-600 dark:text-slate-300">Bets <span className="font-mono font-bold text-slate-900 dark:text-white">{active.side.betsPct ?? '—'}%</span></span>
          <span className="text-slate-600 dark:text-slate-300">Handle <span className="font-mono font-bold text-slate-900 dark:text-white">{active.side.handlePct ?? '—'}%</span></span>
        </div>
      )}
    </div>
  );
};
