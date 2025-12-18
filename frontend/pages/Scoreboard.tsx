import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { storageService } from '../services/storage';
import { LeaderboardEntry } from '../types';
import { Trophy, Flame, Target, Users, Share2, Loader2, ArrowLeft, Home, UserPlus, UserCheck, Lock } from 'lucide-react';
import { ShareStatsCard } from '../components/ShareComponents';
import * as htmlToImage from 'html-to-image';

const Scoreboard: React.FC = () => {
    const navigate = useNavigate();
    const [userState, setUserState] = useState(storageService.getUserState());
    const [activeTab, setActiveTab] = useState<'GLOBAL' | 'FOLLOWING'>('GLOBAL');
    const [timeWindow, setTimeWindow] = useState<'TODAY' | 'WEEK' | 'ALL_TIME'>('WEEK');
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [generatingShare, setGeneratingShare] = useState(false);
    const shareRef = useRef<HTMLDivElement>(null);

    // Data Fetch
    useEffect(() => {
        setLoading(true);
        // Simulate network delay for effect
        setTimeout(() => {
            const data = storageService.getLeaderboard(timeWindow, activeTab === 'FOLLOWING');
            setLeaderboard(data);
            setLoading(false);
        }, 300);

        const unsub = storageService.subscribeToChanges(() => {
            setUserState(storageService.getUserState());
            const updatedData = storageService.getLeaderboard(timeWindow, activeTab === 'FOLLOWING');
            setLeaderboard(updatedData);
        });
        return unsub;
    }, [timeWindow, activeTab]);

    const currentUserEntry = leaderboard.find(e => e.isCurrentUser) || (activeTab === 'FOLLOWING' ? null : leaderboard.find(e => e.uid === userState.user?.uid));
    const displayList = leaderboard.filter(e => e.rank > 0).slice(0, 50); // Top 50

    const handleFollowToggle = (uid: string) => {
        storageService.toggleFollow(uid);
    };

    const handleShareStats = async () => {
        if (!shareRef.current || !currentUserEntry) return;
        setGeneratingShare(true);
        try {
            const dataUrl = await htmlToImage.toPng(shareRef.current, { quality: 1.0, pixelRatio: 1 });
            const link = document.createElement('a');
            link.download = `trapwatch-stats-${currentUserEntry.username}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error(err);
        } finally {
            setGeneratingShare(false);
        }
    };

    const isAuthenticated = userState.isAuthenticated;

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
                    <div className="w-8"></div> {/* Spacer */}
                </div>
                
                {/* Tabs */}
                <div className="max-w-lg mx-auto px-4 pb-2">
                    <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                        <button 
                            onClick={() => setActiveTab('GLOBAL')}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'GLOBAL' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                        >
                            Global Top 10
                        </button>
                        <button 
                            onClick={() => setActiveTab('FOLLOWING')}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'FOLLOWING' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                        >
                            Following
                        </button>
                    </div>
                </div>
            </div>

            {/* Time Filter */}
            <div className="max-w-lg mx-auto px-4 py-4 overflow-x-auto no-scrollbar">
                <div className="flex gap-2">
                    {(['TODAY', 'WEEK', 'ALL_TIME'] as const).map(w => (
                        <button 
                            key={w}
                            onClick={() => setTimeWindow(w)}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-colors ${timeWindow === w ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}
                        >
                            {w === 'TODAY' ? 'Today' : w === 'WEEK' ? 'Last 7 Days' : 'All Time'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="max-w-lg mx-auto px-4 space-y-6">
                
                {/* Personal Stats Card */}
                {isAuthenticated ? (
                    currentUserEntry && (
                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Trophy size={120} />
                            </div>
                            
                            {/* Hidden Share Generator */}
                            <ShareStatsCard entry={currentUserEntry} elementRef={shareRef} />

                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide">Your Stats</h3>
                                        <div className="flex items-baseline gap-2 mt-1">
                                            <span className="text-3xl font-black">{currentUserEntry.rank > 0 ? `#${currentUserEntry.rank}` : 'Unranked'}</span>
                                            {currentUserEntry.rank === 0 && <span className="text-xs text-slate-400">(Min 5 votes)</span>}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={handleShareStats}
                                        disabled={generatingShare}
                                        className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-colors"
                                    >
                                        {generatingShare ? <Loader2 size={20} className="animate-spin" /> : <Share2 size={20} />}
                                    </button>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
                                        <div className="flex justify-center mb-1 text-orange-400"><Target size={16} /></div>
                                        <div className="text-2xl font-bold">{currentUserEntry.accuracy.toFixed(1)}%</div>
                                        <div className="text-[10px] text-slate-400 uppercase font-bold">Accuracy</div>
                                    </div>
                                    <div className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
                                        <div className="flex justify-center mb-1 text-blue-400"><Users size={16} /></div>
                                        <div className="text-2xl font-bold">{currentUserEntry.correctVotes}/{currentUserEntry.totalCountedVotes}</div>
                                        <div className="text-[10px] text-slate-400 uppercase font-bold">Record</div>
                                    </div>
                                    <div className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
                                        <div className="flex justify-center mb-1 text-red-400"><Flame size={16} /></div>
                                        <div className="text-2xl font-bold">{currentUserEntry.streak}</div>
                                        <div className="text-[10px] text-slate-400 uppercase font-bold">Streak</div>
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
                            <p className="text-slate-400 text-sm mb-6 max-w-xs mx-auto">Log in to track your voting record, build your streak, and appear on the leaderboard.</p>
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
                            {activeTab === 'GLOBAL' ? 'Global Leaderboard' : 'Following Leaderboard'}
                        </h3>
                    </div>
                    
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="animate-spin text-orange-500" size={32} />
                        </div>
                    ) : displayList.length === 0 ? (
                        <div className="text-center py-20 px-6">
                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                {activeTab === 'GLOBAL' ? <Trophy size={24} /> : <Users size={24} />}
                            </div>
                            <h4 className="font-bold text-slate-900 dark:text-white mb-1">
                                {activeTab === 'GLOBAL' ? 'No qualified players yet' : 'No one here yet'}
                            </h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {activeTab === 'GLOBAL' 
                                    ? 'Place 5 votes in this window to appear on the board.' 
                                    : 'Follow top players from the Global list to see them here.'}
                            </p>
                            {activeTab === 'FOLLOWING' && (
                                <button 
                                    onClick={() => setActiveTab('GLOBAL')}
                                    className="mt-4 text-orange-600 dark:text-orange-500 font-bold text-sm hover:underline"
                                >
                                    Find people to follow
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {displayList.map((entry) => (
                                <div key={entry.uid} className={`p-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${entry.isCurrentUser ? 'bg-orange-50/50 dark:bg-orange-900/10' : ''}`}>
                                    <div className="w-6 text-center font-bold text-slate-400 text-sm">
                                        {entry.rank}
                                    </div>
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm ${entry.avatarUrl || 'bg-slate-400'}`}>
                                        {entry.username.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-slate-900 dark:text-white text-sm truncate">
                                                {entry.username} {entry.isCurrentUser && '(You)'}
                                            </p>
                                            {entry.streak > 2 && (
                                                <span className="text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 rounded flex items-center gap-0.5">
                                                    <Flame size={8} /> {entry.streak}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {entry.correctVotes} / {entry.totalCountedVotes} Correct
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-black text-slate-900 dark:text-white">{entry.accuracy.toFixed(1)}%</div>
                                        {/* Follow Button logic */}
                                        {!entry.isCurrentUser && isAuthenticated && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleFollowToggle(entry.uid); }}
                                                className="mt-1 text-xs font-bold text-slate-400 hover:text-orange-600 flex items-center justify-end gap-1 ml-auto"
                                            >
                                                {storageService.isFollowing(entry.uid) ? (
                                                    <span className="text-green-500 flex items-center gap-1"><UserCheck size={12}/> Following</span>
                                                ) : (
                                                    <span className="flex items-center gap-1"><UserPlus size={12}/> Follow</span>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Scoreboard;