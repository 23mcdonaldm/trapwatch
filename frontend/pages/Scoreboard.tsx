import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Target, Loader2, Home, Lock, ChevronRight } from 'lucide-react';
import { useAppSelector } from '../store/hooks';
import { recordsApiService } from '../services/fetch.records';
import { ApiLeaderboardEntry, ApiRecord, winPct } from '@/types/records';
import { SystemRecordStrip } from '../components/SystemRecordStrip';

// Minimum decided picks (wins+losses) to qualify for the Win % ranking —
// stops a 1-0 user from topping the board.
const MIN_PICKS_FOR_PCT = 5;

type RankMode = 'WINS' | 'PCT';

const fmtRecord = (r: ApiRecord): string =>
  `${r.wins}-${r.losses}${r.pushes ? `-${r.pushes}` : ''}`;

const Scoreboard: React.FC = () => {
    const navigate = useNavigate();
    const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
    const myUid = useAppSelector((state) => state.auth.userData?.uid);

    const [rankMode, setRankMode] = useState<RankMode>('WINS');
    const [entries, setEntries] = useState<ApiLeaderboardEntry[]>([]);
    const [myRecord, setMyRecord] = useState<ApiRecord | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const board = await recordsApiService.getLeaderboard(100);
                setEntries(board.leaderboard);
                if (isAuthenticated) {
                    try {
                        const mine = await recordsApiService.getMyRecord();
                        setMyRecord(mine.record);
                    } catch { /* personal card is optional */ }
                }
            } catch (err) {
                console.error('Failed to load leaderboard:', err);
                setError('Failed to load the leaderboard');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [isAuthenticated]);

    // Backend returns top N by wins; Win % mode re-ranks client-side with a
    // minimum-picks qualifier. Exact at current scale (< limit users).
    const ranked = useMemo(() => {
        if (rankMode === 'WINS') {
            return entries.filter(e => e.record.wins + e.record.losses > 0);
        }
        return entries
            .filter(e => e.record.wins + e.record.losses >= MIN_PICKS_FOR_PCT)
            .slice()
            .sort((a, b) => (winPct(b.record) ?? 0) - (winPct(a.record) ?? 0));
    }, [entries, rankMode]);

    const myRank = myUid ? ranked.findIndex(e => e.userId === myUid) + 1 : 0;
    const myPct = myRecord ? winPct(myRecord) : null;

    return (
        <div className="min-h-screen bg-gradient-to-b from-white to-slate-100 dark:from-slate-900 dark:to-[#020617] pb-20 transition-colors duration-200">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
                <div className="px-4 h-14 flex items-center justify-between max-w-lg mx-auto">
                    <button onClick={() => navigate('/')} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
                        <Home size={20} />
                    </button>
                    <h1 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Trophy className="text-orange-500" size={18} /> Scoreboard
                    </h1>
                    <button onClick={() => navigate('/picks')} className="text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 p-1" aria-label="My Picks">
                        <Target size={20} />
                    </button>
                </div>

                {/* Ranking toggle */}
                <div className="max-w-lg mx-auto px-4 pb-2">
                    <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                        <button
                            onClick={() => setRankMode('WINS')}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${rankMode === 'WINS' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                        >
                            Most Wins
                        </button>
                        <button
                            onClick={() => setRankMode('PCT')}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${rankMode === 'PCT' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                        >
                            Win % <span className="font-normal text-[10px] opacity-70">(min {MIN_PICKS_FOR_PCT})</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">

                {/* System record */}
                <div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2 px-1">TrapWatch vs The Public</h3>
                    <SystemRecordStrip />
                </div>

                {/* Personal Stats Card */}
                {isAuthenticated ? (
                    myRecord && (
                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Trophy size={120} />
                            </div>
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide">Your Stats</h3>
                                        <div className="flex items-baseline gap-2 mt-1">
                                            <span className="text-3xl font-black">{myRank > 0 ? `#${myRank}` : 'Unranked'}</span>
                                            {myRank === 0 && rankMode === 'PCT' && <span className="text-xs text-slate-400">(min {MIN_PICKS_FOR_PCT} decided picks)</span>}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => navigate('/picks')}
                                        className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg transition-colors flex items-center gap-1 text-sm font-bold"
                                    >
                                        My Picks <ChevronRight size={16} />
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
                                        <div className="flex justify-center mb-1 text-orange-400"><Target size={16} /></div>
                                        <div className="text-2xl font-bold">{myPct === null ? '—' : `${myPct.toFixed(1)}%`}</div>
                                        <div className="text-[10px] text-slate-400 uppercase font-bold">Win Rate</div>
                                    </div>
                                    <div className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
                                        <div className="flex justify-center mb-1 text-blue-400"><Trophy size={16} /></div>
                                        <div className="text-2xl font-bold">{fmtRecord(myRecord)}</div>
                                        <div className="text-[10px] text-slate-400 uppercase font-bold">Record</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                ) : (
                    <div className="bg-slate-900 rounded-2xl p-6 text-center text-white relative overflow-hidden shadow-lg">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-red-600"></div>
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3 text-orange-400">
                                <Lock size={24} />
                            </div>
                            <h3 className="text-xl font-black mb-2">Claim Your Spot</h3>
                            <p className="text-slate-400 text-sm mb-6 max-w-xs mx-auto">Log in to track your voting record and appear on the leaderboard.</p>
                            <button
                                onClick={() => navigate('/alerts')}
                                className="bg-white text-slate-900 font-bold py-3 px-8 rounded-xl hover:bg-slate-200 transition-colors shadow-lg"
                            >
                                Log In / Sign Up
                            </button>
                        </div>
                    </div>
                )}

                {/* Leaderboard List */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden min-h-[300px]">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                        <h3 className="font-bold text-slate-700 dark:text-slate-300">
                            {rankMode === 'WINS' ? 'Most Wins' : `Best Win % (min ${MIN_PICKS_FOR_PCT} picks)`}
                        </h3>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="animate-spin text-orange-500" size={32} />
                        </div>
                    ) : error ? (
                        <div className="text-center py-20 px-6">
                            <p className="text-sm text-slate-500 dark:text-slate-400">{error}</p>
                        </div>
                    ) : ranked.length === 0 ? (
                        <div className="text-center py-20 px-6">
                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                <Trophy size={24} />
                            </div>
                            <h4 className="font-bold text-slate-900 dark:text-white mb-1">No qualified players yet</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {rankMode === 'PCT'
                                    ? `Get ${MIN_PICKS_FOR_PCT} picks graded to qualify for the Win % board.`
                                    : 'Vote on games — records appear once picks are graded.'}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {ranked.slice(0, 50).map((entry, i) => {
                                const isMe = entry.userId === myUid;
                                const pct = winPct(entry.record);
                                return (
                                    <div key={entry.userId} className={`p-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${isMe ? 'bg-orange-50/50 dark:bg-orange-900/10' : ''}`}>
                                        <div className="w-6 text-center font-bold text-slate-400 text-sm">
                                            {i + 1}
                                        </div>
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm bg-slate-400 dark:bg-slate-600">
                                            {entry.displayName.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-900 dark:text-white text-sm truncate">
                                                {entry.displayName} {isMe && '(You)'}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                {fmtRecord(entry.record)}
                                            </p>
                                        </div>
                                        <div className="text-right font-black text-slate-900 dark:text-white">
                                            {rankMode === 'WINS'
                                                ? <>{entry.record.wins} <span className="text-[10px] font-bold text-slate-400 uppercase">W</span></>
                                                : (pct === null ? '—' : `${pct.toFixed(1)}%`)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Scoreboard;
