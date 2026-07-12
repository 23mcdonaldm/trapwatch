import React, { useState, useMemo, useEffect } from 'react';
import { Bell, User, Calendar, Moon, Sun, Trophy, TrendingUp, Info, Loader2, LayoutGrid, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MOCK_GAMES } from '../constants';
import { FilterState, TrapLabel, Game } from '../types';
import TrapGameCard from '../components/TrapGameCard';
import { FiltersBar } from '../components/FiltersBar';
import { SystemRecordStrip } from '../components/SystemRecordStrip';
import { useAppSelector } from '../store/hooks';
import { apiService } from '@/services/fetch.feed';
import { mapApiFeedToGames } from '../utils/apiMapper';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  // We keep state logic simple in case we want to re-add filters later.
  const [filters, setFilters] = useState<FilterState>({
    league: 'ALL',
    search: '',
    label: 'ALL',
    date: 'upcoming'
  });
  const [groupedGames, setGroupedGames] = useState<{
    [TrapLabel.CITY]: Game[];
    [TrapLabel.DETECTED]: Game[];
    [TrapLabel.POTENTIAL]: Game[];
  }>({
    [TrapLabel.CITY]: [],
    [TrapLabel.DETECTED]: [],
    [TrapLabel.POTENTIAL]: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const userData = useAppSelector((state) => state.auth.userData);

  // Fetch games from API
  useEffect(() => {
    const fetchGames = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch by ET date (YYYY-MM-DD). "upcoming" uses today's date in ET.
        const ET_TZ = 'America/New_York';
        const todayET = new Intl.DateTimeFormat('en-CA', {
          timeZone: ET_TZ,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(new Date());

        const dateToFetch = filters.date === 'upcoming' ? todayET : filters.date;

        const feedData = await apiService.getFeed(dateToFetch);
        console.log('feedData', feedData);
        const mappedGames = mapApiFeedToGames(feedData);
        console.log('mappedGames', mappedGames);
        setGroupedGames(mappedGames);
      } catch (err) {
        console.error('Failed to fetch games:', err);
        setError('Failed to load games');
        // Fallback to empty groups on error
        setGroupedGames({
          [TrapLabel.CITY]: [],
          [TrapLabel.DETECTED]: [],
          [TrapLabel.POTENTIAL]: [],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, [filters.date]);

  // Apply filters to the already-grouped games
  const filteredGames = useMemo(() => {
    const applyFilters = (games: Game[]) => {
      return games.filter(game => {
        const matchesLeague = filters.league === 'ALL' || game.league === filters.league;
        const matchesSearch = filters.search === '' || 
          game.homeTeam.name.toLowerCase().includes(filters.search.toLowerCase()) || 
          game.awayTeam.name.toLowerCase().includes(filters.search.toLowerCase());
        
        return matchesLeague && matchesSearch;
      });
    };

    // Apply the trap-label filter by emptying tiers that don't match
    const matchesLabel = (label: TrapLabel) => filters.label === 'ALL' || filters.label === label;

    const filtered = {
      [TrapLabel.CITY]: matchesLabel(TrapLabel.CITY) ? applyFilters(groupedGames[TrapLabel.CITY]) : [],
      [TrapLabel.DETECTED]: matchesLabel(TrapLabel.DETECTED) ? applyFilters(groupedGames[TrapLabel.DETECTED]) : [],
      [TrapLabel.POTENTIAL]: matchesLabel(TrapLabel.POTENTIAL) ? applyFilters(groupedGames[TrapLabel.POTENTIAL]) : [],
    };

    return {
      ...filtered,
      total: filtered[TrapLabel.CITY].length + filtered[TrapLabel.DETECTED].length + filtered[TrapLabel.POTENTIAL].length
    };
  }, [filters, groupedGames]);

  const SectionHeader: React.FC<{ title: string; subtitle: string; icon?: React.ReactNode; colorClass: string }> = ({ title, subtitle, icon, colorClass }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    
    return (
      <div className="mb-3 mt-6 px-1 md:mb-4 md:mt-8 flex items-center gap-2 relative z-10">
          <h2 className={`text-lg md:text-2xl font-black flex items-center gap-2 ${colorClass}`}>
              {title} {icon}
          </h2>
          <div className="relative flex items-center">
            <button 
                onClick={(e) => { e.stopPropagation(); setShowTooltip(!showTooltip); }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Info"
            >
                <Info size={16} />
            </button>
            
            {showTooltip && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowTooltip(false)} />
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-28 sm:w-40 p-1.5 sm:p-2 bg-slate-800/95 dark:bg-white/95 backdrop-blur-sm text-white dark:text-slate-900 text-[9px] sm:text-xs font-medium rounded-lg shadow-xl z-50 animate-in fade-in zoom-in-95 duration-200 border border-white/10 dark:border-slate-200/20">
                         {/* Arrow */}
                         <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-1.5 h-1.5 bg-slate-800/95 dark:bg-white/95 rotate-45 border-l border-b border-white/10 dark:border-slate-200/20"></div>
                         {subtitle}
                    </div>
                </>
            )}
          </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-100 dark:from-slate-900 dark:to-[#020617] pb-10 transition-colors duration-200 relative">
      
      {/* --- Header --- */}
      <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 transition-colors duration-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          
          {/* Brand */}
          <div className="flex items-center gap-1 cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
            <h1 className="text-2xl font-black tracking-tighter">
              <span className="text-slate-900 dark:text-white">Trap</span>
              <span className="bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">Watch</span>
            </h1>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
             {/* All Games Link (Always visible) */}
             <button
                  onClick={() => navigate('/games')}
                  className="flex items-center gap-2 p-2 rounded-full text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors md:px-3 md:rounded-lg"
                  aria-label="All Games"
             >
                   <LayoutGrid size={20} className="text-orange-500" />
                   <span className="hidden md:inline font-bold text-sm text-slate-700 dark:text-slate-200">All Games</span>
             </button>

             {/* Scoreboard Link (Always visible) */}
             <button
                  onClick={() => navigate('/scoreboard')}
                  className="flex items-center gap-2 p-2 rounded-full text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors md:px-3 md:rounded-lg"
                  aria-label="Scoreboard"
             >
                   <Trophy size={20} className="text-orange-500" />
                   <span className="hidden md:inline font-bold text-sm text-slate-700 dark:text-slate-200">Scoreboard</span>
             </button>

             {/* My Picks Link (Always visible; page itself gates on auth) */}
             <button
                  onClick={() => navigate('/picks')}
                  className="flex items-center gap-2 p-2 rounded-full text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors md:px-3 md:rounded-lg"
                  aria-label="My Picks"
             >
                   <Target size={20} className="text-orange-500" />
                   <span className="hidden md:inline font-bold text-sm text-slate-700 dark:text-slate-200">My Picks</span>
             </button>

             {/* Auth-dependent buttons */}
             {isAuthenticated ? (
               /* Profile Button (when signed in) */
               <button 
                 onClick={() => navigate('/settings')}
                 className="flex items-center gap-2 pl-4 border-l border-slate-200 dark:border-slate-800 hover:opacity-75 transition-opacity"
                 aria-label="Profile"
               >
                 {userData?.avatarUrl ? (
                   <img 
                     src={userData.avatarUrl} 
                     alt={userData.name || 'Profile'} 
                     className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover"
                   />
                 ) : (
                   <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                     {userData?.name ? (
                       <span className="text-xs font-bold uppercase">{userData.name.charAt(0)}</span>
                     ) : (
                       <User size={16} />
                     )}
                   </div>
                 )}
               </button>
             ) : (
               /* Get Alerts Button (when not signed in) */
               <>
                 {/* Mobile: Get Alerts Icon */}
                 <button 
                   onClick={() => navigate('/alerts')}
                   className="md:hidden w-9 h-9 flex items-center justify-center rounded-full bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-500 border border-orange-100 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors"
                   aria-label="Get Alerts"
                 >
                   <Bell size={18} />
                 </button>
                 
                 {/* Desktop: Get Alerts Button */}
                 <button 
                   onClick={() => navigate('/alerts')}
                   className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg border border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-500 font-bold text-sm hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                 >
                   <Bell size={16} />
                   <span>Get alerts</span>
                 </button>
               </>
             )}
          </div>

        </div>
      </header>
      
      <FiltersBar filters={filters} setFilters={setFilters} />

      {/* --- Hero Section --- */}
      <div className="max-w-5xl mx-auto px-4 pt-8 text-center relative z-10">
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
          Live <span className="bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">Trap Board</span>
        </h1>
        
        <div className="inline-flex items-center gap-2 bg-white dark:bg-slate-900 px-5 py-2.5 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm mb-4">
          <Calendar size={18} className="text-orange-500" />
          <span className="font-bold text-slate-700 dark:text-slate-300 text-sm md:text-base">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </span>
        </div>

        {/* System (Trap City) record vs the public */}
        <div className="max-w-xl mx-auto">
          <SystemRecordStrip />
        </div>
      </div>

      {/* --- Games List Segmented --- */}
      <div className="max-w-5xl mx-auto px-4 pb-12 relative z-10">
        {loading ? (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mt-8">
            <Loader2 size={32} className="animate-spin mx-auto text-orange-500 mb-4" />
            <p className="text-slate-400 font-medium">Loading games...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mt-8">
            <p className="text-slate-400 font-medium mb-2">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-2 text-orange-600 font-bold hover:underline"
            >
              Retry
            </button>
          </div>
        ) : filteredGames.total === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mt-8">
            <p className="text-slate-400 font-medium">No traps found matching your filters.</p>
            <button 
              onClick={() => setFilters({ league: 'ALL', search: '', label: 'ALL', date: 'upcoming' })}
              className="mt-2 text-orange-600 font-bold hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
            <>
                {/* Trap City */}
                {filteredGames[TrapLabel.CITY].length > 0 && (
                    <section>
                        <SectionHeader 
                            title="Trap City" 
                            subtitle="Highest confidence traps with massive public money disparities."
                            icon={<span className="text-lg md:text-2xl">🚨</span>}
                            colorClass="text-[#cc0000]"
                        />
                        <div className="space-y-4">
                            {filteredGames[TrapLabel.CITY].map(game => (
                                <TrapGameCard key={game.id} game={game} />
                            ))}
                        </div>
                    </section>
                )}

                {/* Trap Detected */}
                {filteredGames[TrapLabel.DETECTED].length > 0 && (
                    <section>
                        <SectionHeader 
                            title="Trap Detected" 
                            subtitle="Significant signals detected. Proceed with caution."
                            icon={<span className="text-lg md:text-2xl">⚠️</span>}
                            colorClass="text-slate-900 dark:text-white"
                        />
                        <div className="space-y-4">
                            {filteredGames[TrapLabel.DETECTED].map(game => (
                                <TrapGameCard key={game.id} game={game} />
                            ))}
                        </div>
                    </section>
                )}

                {/* Potential Trap */}
                {filteredGames[TrapLabel.POTENTIAL].length > 0 && (
                    <section>
                        <SectionHeader 
                            title="Trap Potential" 
                            subtitle="Early indicators forming. Keep an eye on line movement."
                            icon={<span className="text-lg md:text-2xl">👀</span>}
                            colorClass="text-slate-600 dark:text-slate-400"
                        />
                        <div className="space-y-4">
                            {filteredGames[TrapLabel.POTENTIAL].map(game => (
                                <TrapGameCard key={game.id} game={game} />
                            ))}
                        </div>
                    </section>
                )}
            </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;