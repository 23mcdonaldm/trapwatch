import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Search, Loader2, LayoutGrid, ChevronRight } from 'lucide-react';
import { FilterState, League } from '../types';
import { ApiGameSummary, ApiUpcomingDay } from '@/types/odds';
import { DatePicker } from '../components/FiltersBar';
import { ScoreBadge } from '../components/ScoreBadge';
import { gamesApiService } from '../services/fetch.games';
import { mapSummaryTeams, parseGameTimeET } from '../utils/apiMapper';

// League display order + API keys
const LEAGUE_SECTIONS: Array<{ apiKey: string; league: League }> = [
  { apiKey: 'americanfootballnfl', league: League.NFL },
  { apiKey: 'americanfootballncaaf', league: League.NCAAF },
  { apiKey: 'basketballnba', league: League.NBA },
  { apiKey: 'basketballncaab', league: League.NCAAB },
  { apiKey: 'baseballmlb', league: League.MLB },
  { apiKey: 'icehockeynhl', league: League.NHL },
];

// One clickable game row — matchup + time only; details live at /game/{id}
const GameRow: React.FC<{ game: ApiGameSummary }> = ({ game }) => {
  const navigate = useNavigate();
  const { homeTeam, awayTeam } = mapSummaryTeams(game);
  const startTime = parseGameTimeET(game.gameTimeET);
  const started = new Date(startTime).getTime() < Date.now();

  return (
    <button
      onClick={() => navigate(`/game/${game.id}`)}
      className="w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)] dark:shadow-none px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between gap-4 hover:shadow-[0_8px_16px_-4px_rgba(0,0,0,0.1)] hover:translate-y-[-1px] dark:hover:border-slate-700 transition-all duration-200 text-left"
    >
      <div className="flex items-center gap-3 sm:gap-5 min-w-0">
        <div className="flex items-center gap-2 shrink-0">
          <img src={awayTeam.logoUrl} alt={awayTeam.shortName} className="w-8 h-8 sm:w-10 sm:h-10 object-contain drop-shadow-sm" />
          <span className="text-[10px] font-black text-slate-300 dark:text-slate-600">@</span>
          <img src={homeTeam.logoUrl} alt={homeTeam.shortName} className="w-8 h-8 sm:w-10 sm:h-10 object-contain drop-shadow-sm" />
        </div>
        <div className="min-w-0">
          <div className="font-bold text-slate-900 dark:text-white text-sm sm:text-base truncate">
            {awayTeam.shortName} <span className="text-slate-300 dark:text-slate-600 font-normal">@</span> {homeTeam.shortName}
          </div>
          <div className="text-[11px] sm:text-xs font-medium text-slate-400 dark:text-slate-500 mt-0.5">
            {game.status === 'live' || game.status === 'completed' ? (
              <ScoreBadge score={game} awayAbbr={awayTeam.shortName} homeAbbr={homeTeam.shortName} />
            ) : (
              <>
                {new Date(startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                {started && <span className="ml-2 text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 uppercase">Started</span>}
              </>
            )}
          </div>
        </div>
      </div>
      <ChevronRight size={18} className="text-slate-300 dark:text-slate-600 shrink-0" />
    </button>
  );
};

// "2026-07-13" -> "Today" / "Tomorrow" / "Sun, Jul 13" (all in ET terms)
const dayLabel = (dateET: string, todayET: string): string => {
  if (dateET === todayET) return 'Today';
  const d = new Date(`${dateET}T12:00:00Z`);
  const t = new Date(`${todayET}T12:00:00Z`);
  if (d.getTime() - t.getTime() === 24 * 3600 * 1000) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
};

const AllGames: React.FC = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FilterState>({
    league: 'ALL',
    search: '',
    label: 'ALL',
    date: 'upcoming'
  });
  const [days, setDays] = useState<ApiUpcomingDay[]>([]);
  const [todayET, setTodayET] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isUpcoming = filters.date === 'upcoming';

  useEffect(() => {
    const fetchGames = async () => {
      setLoading(true);
      setError(null);
      try {
        if (filters.date === 'upcoming') {
          // Default look-ahead: every upcoming day, grouped by day server-side.
          const data = await gamesApiService.getUpcomingGames();
          setDays(data.days);
          setTodayET(data.todayET);
        } else {
          // Specific date from the picker: the existing single-day endpoint.
          const data = await gamesApiService.getGames(filters.date);
          setDays([{ dateET: filters.date, by_league: data.by_league, total: data.total }]);
          setTodayET('');
        }
      } catch (err) {
        console.error('Failed to fetch games:', err);
        setError('Failed to load games');
        setDays([]);
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, [filters.date]);

  const filteredDays = useMemo(() => {
    const search = filters.search.toLowerCase();
    return days
      .map(day => ({
        dateET: day.dateET,
        sections: LEAGUE_SECTIONS
          .filter(section => filters.league === 'ALL' || filters.league === section.league)
          .map(section => ({
            ...section,
            games: (day.by_league[section.apiKey] || []).filter(game =>
              search === '' ||
              game.homeTeam.toLowerCase().includes(search) ||
              game.awayTeam.toLowerCase().includes(search)
            ),
          }))
          .filter(section => section.games.length > 0),
      }))
      .filter(day => day.sections.length > 0);
  }, [filters, days]);

  const totalGames = filteredDays.reduce(
    (sum, day) => sum + day.sections.reduce((s, sec) => s + sec.games.length, 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-100 dark:from-slate-900 dark:to-[#020617] pb-10 transition-colors duration-200 relative">

      {/* --- Header --- */}
      <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 transition-colors duration-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
              <ArrowLeft size={24} className="text-slate-700 dark:text-slate-200" />
            </button>
            <h1 className="text-2xl font-black tracking-tighter flex items-center gap-2">
              <LayoutGrid size={22} className="text-orange-500" />
              <span className="text-slate-900 dark:text-white">All</span>
              <span className="bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">Games</span>
            </h1>
          </div>

          <button
              onClick={() => navigate('/scoreboard')}
              className="flex items-center gap-2 p-2 rounded-full text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors md:px-3 md:rounded-lg"
              aria-label="Scoreboard"
          >
                <Trophy size={20} className="text-orange-500" />
                <span className="hidden md:inline font-bold text-sm text-slate-700 dark:text-slate-200">Scoreboard</span>
          </button>
        </div>
      </header>

      {/* --- Filters --- */}
      <div className="sticky top-16 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 p-3 shadow-sm transition-colors duration-200 overflow-visible">
        <div className="max-w-md mx-auto space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search teams..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-full pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-orange-500 outline-none transition-colors"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            <select
              value={filters.league}
              onChange={(e) => setFilters(prev => ({ ...prev, league: e.target.value as League | 'ALL' }))}
              className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold py-1.5 px-3 rounded-full border-r-8 border-transparent outline-none cursor-pointer transition-colors"
            >
              <option value="ALL">All Leagues</option>
              {Object.values(League).map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <DatePicker filters={filters} setFilters={setFilters} />
          </div>
        </div>
      </div>

      {/* --- Games grouped by league --- */}
      <div className="max-w-3xl mx-auto px-4 pb-12 pt-6 relative z-10">
        {loading ? (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <Loader2 size={32} className="animate-spin mx-auto text-orange-500 mb-4" />
            <p className="text-slate-400 font-medium">Loading games...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-slate-400 font-medium mb-2">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-orange-600 font-bold hover:underline"
            >
              Retry
            </button>
          </div>
        ) : totalGames === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-slate-400 font-medium">No games found for this date.</p>
            <button
              onClick={() => setFilters({ league: 'ALL', search: '', label: 'ALL', date: 'upcoming' })}
              className="mt-2 text-orange-600 font-bold hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          filteredDays.map(day => (
            <div key={day.dateET} className="mb-10">
              {/* Day header (only meaningful in the multi-day Upcoming view) */}
              {isUpcoming && (
                <div className="flex items-center gap-3 mb-4 mt-2">
                  <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
                    {dayLabel(day.dateET, todayET)}
                  </h2>
                  <span className="text-xs font-bold text-slate-400">
                    {new Date(`${day.dateET}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' })}
                  </span>
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                </div>
              )}
              {day.sections.map(section => (
                <section key={`${day.dateET}-${section.apiKey}`} className="mb-8">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white mb-3 px-1 flex items-center gap-2">
                    {section.league}
                    <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                      {section.games.length}
                    </span>
                  </h3>
                  <div className="space-y-3">
                    {section.games.map(game => (
                      <GameRow key={game.id} game={game} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AllGames;
