import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Loader2, Target, Lock, ChevronRight } from 'lucide-react';
import { useAppSelector } from '../store/hooks';
import { recordsApiService } from '../services/fetch.records';
import { ApiPick, ApiRecord, PickResult, winPct } from '@/types/records';

const PAGE_SIZE = 20;

const RESULT_STYLE: Record<PickResult, { label: string; cls: string }> = {
  win: { label: 'W', cls: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' },
  loss: { label: 'L', cls: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800' },
  push: { label: 'P', cls: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700' },
  pending: { label: '–', cls: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
};

// gameId format: "{league}_{gameTimeET}_{homeTeam}_{awayTeam}" (teams contain no underscores)
const parseMatchup = (gameId: string): string => {
  const parts = gameId.split('_');
  if (parts.length < 4) return gameId;
  return `${parts[3]} @ ${parts[2]}`;
};

// The side of a pick as shown to the user ("PIT Pirates", "Over", ...)
const sideLabel = (pick: ApiPick): string => {
  const parts = pick.gameId.split('_');
  if (pick.side === 'home') return parts[2] || 'Home';
  if (pick.side === 'away') return parts[3] || 'Away';
  return pick.side === 'over' ? 'Over' : 'Under';
};

const marketLabel = (market: string): string =>
  market === 'moneyline' ? 'Moneyline' : market === 'spread' ? 'Spread' : 'Total';

const PickRow: React.FC<{ pick: ApiPick }> = ({ pick }) => {
  const navigate = useNavigate();
  const { label, cls } = RESULT_STYLE[pick.result] || RESULT_STYLE.pending;
  return (
    <button
      onClick={() => navigate(`/game/${pick.gameId}`)}
      className="w-full p-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
    >
      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border text-sm font-black shrink-0 ${cls}`}>
        {label}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-slate-900 dark:text-white text-sm truncate">{parseMatchup(pick.gameId)}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {marketLabel(pick.market)} · <span className="font-bold text-slate-600 dark:text-slate-300">{sideLabel(pick)}</span>
          <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
          {new Date(pick.generatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
        </p>
      </div>
      <ChevronRight size={16} className="text-slate-300 dark:text-slate-600 shrink-0" />
    </button>
  );
};

const MyPicks: React.FC = () => {
  const navigate = useNavigate();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  const [record, setRecord] = useState<ApiRecord | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [picks, setPicks] = useState<ApiPick[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [recordRes, picksRes] = await Promise.all([
          recordsApiService.getMyRecord(),
          recordsApiService.getMyPicks(PAGE_SIZE),
        ]);
        setRecord(recordRes.record);
        setDisplayName(recordRes.displayName);
        setPicks(picksRes.picks);
        setNextCursor(picksRes.nextCursor);
      } catch (err) {
        console.error('Failed to load picks:', err);
        setError('Failed to load your picks');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isAuthenticated]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await recordsApiService.getMyPicks(PAGE_SIZE, nextCursor);
      setPicks(prev => [...prev, ...res.picks]);
      setNextCursor(res.nextCursor);
    } catch (err) {
      console.error('Failed to load more picks:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const pct = record ? winPct(record) : null;
  const pendingCount = picks.filter(p => p.result === 'pending').length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-100 dark:from-slate-900 dark:to-[#020617] pb-20 transition-colors duration-200">
      {/* Header */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
              <ArrowLeft size={24} className="text-slate-700 dark:text-slate-200" />
            </button>
            <h1 className="text-2xl font-black tracking-tighter flex items-center gap-2">
              <Target size={22} className="text-orange-500" />
              <span className="text-slate-900 dark:text-white">My</span>
              <span className="bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">Picks</span>
            </h1>
          </div>
          <button
            onClick={() => navigate('/scoreboard')}
            className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
            aria-label="Scoreboard"
          >
            <Trophy size={20} className="text-orange-500" />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {!isAuthenticated ? (
          <div className="bg-slate-900 rounded-2xl p-6 text-center text-white relative overflow-hidden shadow-lg">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-red-600"></div>
            <div className="relative z-10">
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3 text-orange-400">
                <Lock size={24} />
              </div>
              <h3 className="text-xl font-black mb-2">Track Your Record</h3>
              <p className="text-slate-400 text-sm mb-6 max-w-xs mx-auto">Log in to see your picks graded after every game and your all-time record.</p>
              <button
                onClick={() => navigate('/alerts')}
                className="bg-white text-slate-900 font-bold py-3 px-8 rounded-xl hover:bg-slate-200 transition-colors shadow-lg"
              >
                Log In / Sign Up
              </button>
            </div>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-orange-500" size={32} />
          </div>
        ) : error ? (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <p className="text-slate-400 font-medium">{error}</p>
          </div>
        ) : (
          <>
            {/* Record card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Target size={120} />
              </div>
              <div className="relative z-10">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-4">{displayName} · All-Time</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
                    <div className="text-2xl font-bold">
                      {record ? `${record.wins}-${record.losses}${record.pushes ? `-${record.pushes}` : ''}` : '0-0'}
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Record (W-L{record?.pushes ? '-P' : ''})</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
                    <div className="text-2xl font-bold">{pct === null ? '—' : `${pct.toFixed(1)}%`}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Win Rate</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
                    <div className="text-2xl font-bold">{pendingCount}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Pending</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pick history */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                <h3 className="font-bold text-slate-700 dark:text-slate-300">Pick History</h3>
              </div>
              {picks.length === 0 ? (
                <div className="text-center py-16 px-6">
                  <p className="text-slate-500 dark:text-slate-400 text-sm">No picks yet — vote on a game to start your record.</p>
                  <button onClick={() => navigate('/')} className="mt-3 text-orange-600 font-bold text-sm hover:underline">
                    See today's traps
                  </button>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {picks.map(pick => (
                      <PickRow key={`${pick.gameId}_${pick.market}`} pick={pick} />
                    ))}
                  </div>
                  {nextCursor && (
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="w-full py-3 text-sm font-bold text-orange-600 dark:text-orange-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-t border-slate-100 dark:border-slate-800"
                    >
                      {loadingMore ? 'Loading…' : 'Load older picks'}
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MyPicks;
