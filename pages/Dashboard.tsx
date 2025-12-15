import React, { useState, useMemo, useEffect } from 'react';
import { Bell, User, Calendar, Moon, Sun, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MOCK_GAMES } from '../constants';
import { FilterState } from '../types';
import TrapGameCard from '../components/TrapGameCard';
import { FiltersBar } from '../components/FiltersBar';
import { storageService } from '../services/storage';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  // We keep state logic simple in case we want to re-add filters later.
  const [filters, setFilters] = useState<FilterState>({
    league: 'ALL',
    search: '',
    label: 'ALL'
  });
  
  const isAuthenticated = storageService.isAuthenticated();

  const filteredGames = useMemo(() => {
    return MOCK_GAMES.filter(game => {
      const matchesLeague = filters.league === 'ALL' || game.league === filters.league;
      const matchesLabel = filters.label === 'ALL' || game.trapLabel === filters.label;
      const matchesSearch = filters.search === '' || 
        game.homeTeam.name.toLowerCase().includes(filters.search.toLowerCase()) || 
        game.awayTeam.name.toLowerCase().includes(filters.search.toLowerCase());
      
      return matchesLeague && matchesLabel && matchesSearch;
    }).sort((a, b) => b.severityScore - a.severityScore);
  }, [filters]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-100 dark:from-slate-900 dark:to-[#020617] pb-10 transition-colors duration-200">
      
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
             {/* Scoreboard Link (Always visible) */}
             <button 
                  onClick={() => navigate('/scoreboard')}
                  className="flex items-center gap-2 p-2 rounded-full text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors md:px-3 md:rounded-lg"
                  aria-label="Scoreboard"
             >
                   <Trophy size={20} className="text-orange-500" />
                   <span className="hidden md:inline font-bold text-sm text-slate-700 dark:text-slate-200">Scoreboard</span>
             </button>

             {/* Mobile: Get Alerts Icon (Only if not auth) */}
             {!isAuthenticated && (
                <button 
                  onClick={() => navigate('/alerts')}
                  className="md:hidden w-9 h-9 flex items-center justify-center rounded-full bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-500 border border-orange-100 dark:border-orange-800"
                >
                  <Bell size={18} />
                </button>
             )}

             {/* Desktop: Actions */}
             {!isAuthenticated ? (
               <button 
                 onClick={() => navigate('/alerts')}
                 className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg border border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-500 font-bold text-sm hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
               >
                 <Bell size={16} />
                 <span>Get alerts</span>
               </button>
             ) : (
                <button 
                  onClick={() => navigate('/settings')}
                  className="flex items-center gap-2 pl-4 border-l border-slate-200 dark:border-slate-800 hover:opacity-75 transition-opacity"
                >
                    <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                      <User size={16} />
                    </div>
                </button>
             )}
          </div>

        </div>
      </header>
      
      <FiltersBar filters={filters} setFilters={setFilters} />

      {/* --- Hero Section --- */}
      <div className="max-w-5xl mx-auto px-4 pt-10 pb-8 text-center">
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-6 tracking-tight">
          Today's <span className="bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">Trap Games</span>
        </h1>
        
        <div className="inline-flex items-center gap-2 bg-white dark:bg-slate-900 px-5 py-2.5 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm">
          <Calendar size={18} className="text-orange-500" />
          <span className="font-bold text-slate-700 dark:text-slate-300 text-sm md:text-base">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* --- Games List --- */}
      <div className="max-w-5xl mx-auto px-4 space-y-6">
        {filteredGames.length > 0 ? (
          filteredGames.map(game => (
            <TrapGameCard key={game.id} game={game} />
          ))
        ) : (
          <div className="text-center py-10 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-slate-400 font-medium">No traps found matching your filters.</p>
            <button 
              onClick={() => setFilters({ league: 'ALL', search: '', label: 'ALL' })}
              className="mt-2 text-orange-600 font-bold hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;