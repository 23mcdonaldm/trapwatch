import React, { useState, useEffect } from 'react';
import { recordsApiService } from '../services/fetch.records';
import { ApiRecord, winPct } from '@/types/records';

const TIER_META: Array<{ key: string; icon: string; label: string }> = [
  { key: 'TC', icon: '🚨', label: 'Trap City' },
  { key: 'TD', icon: '⚠️', label: 'Detected' },
  { key: 'TP', icon: '👀', label: 'Potential' },
];

const fmt = (r?: ApiRecord): string =>
  r ? `${r.wins}-${r.losses}${r.pushes ? `-${r.pushes}` : ''}` : '0-0';

/**
 * Compact "system vs the public" record strip — how the trap flags have graded
 * out, overall and per tier. Data from GET /records/system.
 */
export const SystemRecordStrip: React.FC = () => {
  const [records, setRecords] = useState<{ [tier: string]: ApiRecord } | null>(null);

  useEffect(() => {
    recordsApiService.getSystemRecords()
      .then(res => setRecords(res.records))
      .catch(err => console.error('Failed to load system records:', err));
  }, []);

  if (!records) return null;
  const overall = records['overall'];
  const graded = overall ? overall.wins + overall.losses + (overall.pushes || 0) : 0;
  if (graded === 0) return null;
  const pct = overall ? winPct(overall) : null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800 shadow-sm px-4 py-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">System Record</span>
        <span className="font-black text-slate-900 dark:text-white font-mono">{fmt(overall)}</span>
        {pct !== null && (
          <span className={`text-xs font-bold ${pct >= 50 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {pct.toFixed(0)}%
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        {TIER_META.map(({ key, icon, label }) => (
          <span key={key} className="flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300" title={label}>
            <span>{icon}</span>
            <span className="font-mono">{fmt(records[key])}</span>
          </span>
        ))}
      </div>
    </div>
  );
};
