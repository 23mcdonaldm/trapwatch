import React from 'react';
import { Game } from '../types';
import { winningSide, systemOutcome, Outcome } from '../utils/grading';

interface ScoreInfo {
  status?: string;
  liveScore?: { home: number; away: number } | null;
  finalScore?: { home: number; away: number } | null;
  scoresUpdatedAt?: string | null;
}

const updatedAgo = (iso?: string | null): string | null => {
  if (!iso) return null;
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
};

/**
 * Compact live/final score chip for game cards and rows.
 * Live freshness = scores poller cadence — we show "updated Xm ago" honestly
 * instead of implying a game clock (The Odds API has no period/clock data).
 */
export const ScoreBadge: React.FC<{
  score: ScoreInfo;
  awayAbbr: string;
  homeAbbr: string;
  size?: 'sm' | 'md';
}> = ({ score, awayAbbr, homeAbbr, size = 'sm' }) => {
  const isLive = score.status === 'live';
  const isFinal = score.status === 'completed';
  const points = isFinal ? score.finalScore : isLive ? score.liveScore : null;
  if (!isLive && !isFinal) return null;

  const textSize = size === 'md' ? 'text-sm' : 'text-[11px]';
  const homeWon = points ? points.home > points.away : false;
  const awayWon = points ? points.away > points.home : false;
  const ago = isLive ? updatedAgo(score.scoresUpdatedAt) : null;

  return (
    <span className={`inline-flex items-center gap-1.5 ${textSize} font-bold whitespace-nowrap`}>
      {isLive ? (
        <span className="flex items-center gap-1 text-red-600 dark:text-red-400 uppercase">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          Live
        </span>
      ) : (
        <span className="text-slate-500 dark:text-slate-400 uppercase bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-[10px]">
          Final
        </span>
      )}
      {points && (
        <span className="font-mono text-slate-900 dark:text-white">
          <span className={awayWon ? 'font-black' : 'text-slate-500 dark:text-slate-400'}>{awayAbbr} {points.away}</span>
          <span className="text-slate-300 dark:text-slate-600 mx-1">-</span>
          <span className={homeWon ? 'font-black' : 'text-slate-500 dark:text-slate-400'}>{homeAbbr} {points.home}</span>
        </span>
      )}
      {ago && <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 normal-case">upd {ago}</span>}
    </span>
  );
};

const OUTCOME_STYLE: Record<Outcome, { label: string; cls: string }> = {
  win: { label: 'W', cls: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' },
  loss: { label: 'L', cls: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800' },
  push: { label: 'P', cls: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700' },
};

/**
 * How the system's trap flag did on a completed game's flagged market
 * (system wins when the public side loses). Renders nothing until final.
 */
export const SystemOutcomeChip: React.FC<{ game: Game }> = ({ game }) => {
  if (game.status !== 'completed' || !game.finalScore || !game.trapMarket || !game.trapSide) return null;
  const winner = winningSide(game.trapMarket, game.trapLine, game.finalScore.home, game.finalScore.away);
  if (winner === null) return null;
  const outcome = systemOutcome(game.trapSide, winner);
  const { label, cls } = OUTCOME_STYLE[outcome];
  return (
    <span
      className={`inline-flex items-center justify-center w-6 h-6 rounded-md border text-xs font-black ${cls}`}
      title={`System ${outcome} on ${game.trapMarket}`}
    >
      {label}
    </span>
  );
};
