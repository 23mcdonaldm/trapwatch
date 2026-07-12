import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Trophy, Loader2, ChevronRight } from 'lucide-react';
import { Game, TrapLabel, TRAP_STATUS_MAP } from '../types';
import { ApiGame, ApiGameSummary, ApiOddsSide } from '@/types/odds';
import { ApiMarket } from '@/types/social';
import { VoteBar, CommentsSection } from '../components/GameComponents';
import { ScoreBadge } from '../components/ScoreBadge';
import { gamesApiService } from '../services/fetch.games';
import { mapApiGameToGame, mapSummaryTeams, parseGameTimeET } from '../utils/apiMapper';

const fmtOdds = (odds: number): string => (odds > 0 ? `+${odds}` : `${odds}`);

// Handle/Bets split for one side of a market
const SideSplit: React.FC<{ label: string; odds: number; handlePct: number; betsPct: number }> = ({ label, odds, handlePct, betsPct }) => (
  <div className="flex-1 min-w-0">
    <div className="flex items-baseline justify-between mb-2">
      <span className="font-bold text-slate-900 dark:text-white text-sm truncate">{label}</span>
      <span className="font-mono font-bold text-slate-700 dark:text-slate-300 text-sm bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded ml-2 shrink-0">{fmtOdds(odds)}</span>
    </div>
    <div className="space-y-2">
      <div>
        <div className="flex justify-between text-[10px] font-bold uppercase tracking-wide mb-1">
          <span className="text-slate-400">Handle</span>
          <span className="text-slate-700 dark:text-slate-200">{Math.round(handlePct)}%</span>
        </div>
        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-orange-500 transition-all duration-700 ease-out" style={{ width: `${Math.min(100, Math.max(0, handlePct))}%` }} />
        </div>
      </div>
      <div>
        <div className="flex justify-between text-[10px] font-bold uppercase tracking-wide mb-1">
          <span className="text-slate-400">Bets</span>
          <span className="text-slate-700 dark:text-slate-200">{Math.round(betsPct)}%</span>
        </div>
        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-slate-400 transition-all duration-700 ease-out" style={{ width: `${Math.min(100, Math.max(0, betsPct))}%` }} />
        </div>
      </div>
    </div>
  </div>
);

const trapBadge = (status?: string) => {
  if (!status) return null;
  const label = TRAP_STATUS_MAP[status];
  if (!label) return null;
  const style = label === TrapLabel.CITY
    ? 'bg-[#cc0000] text-white border-[#cc0000]'
    : label === TrapLabel.DETECTED
    ? 'bg-white dark:bg-slate-900 text-[#cc0000] dark:text-red-400 border border-red-200 dark:border-red-900/50'
    : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800';
  const icon = label === TrapLabel.CITY ? '🚨' : label === TrapLabel.DETECTED ? '⚠️' : '👀';
  return (
    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-tight ${style}`}>
      <span>{icon}</span>{label}
    </span>
  );
};

// One market section: sides with handle/bets + its own consensus and comments
const MarketSection: React.FC<{
  market: ApiMarket;
  title: string;
  sides: Array<{ label: string; side: ApiOddsSide }>;
  status?: string;
  game: Game;
}> = ({ market, title, sides, status, game }) => (
  <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)] dark:shadow-none overflow-hidden">
    <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
      <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-wide text-sm">{title}</h3>
      {trapBadge(status)}
    </div>

    <div className="p-5">
      <div className="flex flex-col sm:flex-row gap-6 sm:gap-10 mb-6">
        {sides.map(({ label, side }) => (
          <SideSplit key={label} label={label} odds={side.odds} handlePct={side.handlePct} betsPct={side.betsPct} />
        ))}
      </div>

      <div className="flex flex-col gap-5">
        <VoteBar game={game} market={market} />
        <div className="bg-slate-50/60 dark:bg-slate-950/30 rounded-xl border border-slate-200/60 dark:border-slate-800 p-5">
          <CommentsSection game={game} market={market} />
        </div>
      </div>
    </div>
  </section>
);

const GameDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [apiGame, setApiGame] = useState<ApiGame | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [relatedGames, setRelatedGames] = useState<ApiGameSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGame = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const data = await gamesApiService.getGame(id);
        setApiGame(data.event);
        setGame(mapApiGameToGame(data.event));

        // Other games in the same league (same day) — slim rows linking to their detail pages
        try {
          const dateET = data.event.gameTimeET?.slice(0, 10);
          const all = await gamesApiService.getGames(dateET);
          setRelatedGames((all.by_league[data.event.league] || []).filter(g => g.id !== data.event.id).slice(0, 4));
        } catch {
          setRelatedGames([]);
        }
      } catch (err) {
        console.error('Failed to fetch game:', err);
        setError('Game not found');
      } finally {
        setLoading(false);
      }
    };

    fetchGame();
  }, [id]);

  const handleBack = () => {
    // If it's the first item in the history stack (direct link/new tab), go home.
    // React Router assigns 'default' key to the initial location.
    if (location.key === 'default' || window.history.length <= 1) {
        navigate('/');
    } else {
        navigate(-1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 size={32} className="animate-spin text-orange-500" />
      </div>
    );
  }

  if (error || !game || !apiGame) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
        <p>Game not found</p>
        <button onClick={() => navigate('/')} className="ml-2 text-blue-500">Go Home</button>
      </div>
    );
  }

  const odds = apiGame.currentOdds;
  const spreadLine = odds.Spread?.Line;
  const totalLine = odds.Total?.Line;
  // Spread line is stored from the home team's perspective
  const homeSpreadLabel = spreadLine !== undefined ? `${game.homeTeam.shortName} ${spreadLine > 0 ? `+${spreadLine}` : spreadLine}` : game.homeTeam.shortName;
  const awaySpreadLabel = spreadLine !== undefined ? `${game.awayTeam.shortName} ${-spreadLine > 0 ? `+${-spreadLine}` : -spreadLine}` : game.awayTeam.shortName;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-100 dark:from-slate-900 dark:to-[#020617] pb-20 transition-colors duration-200">
      {/* --- Header --- */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 transition-colors duration-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4 relative">
          <button onClick={handleBack} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <ArrowLeft size={24} className="text-slate-700 dark:text-slate-200" />
          </button>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white truncate flex-1">
            {game.awayTeam.name} @ {game.homeTeam.name}
          </h1>

          <button
              onClick={() => navigate('/scoreboard')}
              className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
              aria-label="Scoreboard"
          >
              <Trophy size={20} className="text-orange-500" />
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8">
        {/* --- Game Header --- */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)] dark:shadow-none p-6 mb-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 sm:gap-8">
              <div className="flex items-center gap-3 sm:gap-6">
                <div className="flex flex-col items-center gap-1.5 w-14 sm:w-20">
                  <img src={game.awayTeam.logoUrl} alt={game.awayTeam.shortName} className="w-14 h-14 sm:w-20 sm:h-20 object-contain drop-shadow-sm" />
                  <div className="h-1 w-full rounded-full opacity-80" style={{ backgroundColor: game.awayTeam.primaryColor ?? '#cbd5e1' }} />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{game.awayTeam.shortName}</span>
                </div>
                <span className="text-xs sm:text-sm font-black text-slate-300 dark:text-slate-600">@</span>
                <div className="flex flex-col items-center gap-1.5 w-14 sm:w-20">
                  <img src={game.homeTeam.logoUrl} alt={game.homeTeam.shortName} className="w-14 h-14 sm:w-20 sm:h-20 object-contain drop-shadow-sm" />
                  <div className="h-1 w-full rounded-full opacity-80" style={{ backgroundColor: game.homeTeam.primaryColor ?? '#cbd5e1' }} />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{game.homeTeam.shortName}</span>
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 uppercase tracking-wider">
                  {game.league}
                </span>
                <div className="text-sm font-medium text-slate-400 dark:text-slate-500 mt-1.5">
                  {new Date(game.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' })} · {new Date(game.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </div>
                {(game.status === 'live' || game.status === 'completed') && (
                  <div className="mt-2">
                    <ScoreBadge score={game} awayAbbr={game.awayTeam.shortName} homeAbbr={game.homeTeam.shortName} size="md" />
                  </div>
                )}
              </div>
            </div>
            {game.trapLabel && trapBadge(apiGame.currentOdds[game.trapMarket || 'Moneyline']?.Status)}
          </div>
        </div>

        {/* --- Markets in depth --- */}
        <div className="flex flex-col gap-8">
          {odds.Moneyline && (
            <MarketSection
              market="Moneyline"
              title="Moneyline"
              status={odds.Moneyline.Status}
              game={game}
              sides={[
                { label: game.awayTeam.shortName, side: odds.Moneyline.Away },
                { label: game.homeTeam.shortName, side: odds.Moneyline.Home },
              ]}
            />
          )}

          {odds.Spread && (
            <MarketSection
              market="Spread"
              title="Spread"
              status={odds.Spread.Status}
              game={game}
              sides={[
                { label: awaySpreadLabel, side: odds.Spread.Away },
                { label: homeSpreadLabel, side: odds.Spread.Home },
              ]}
            />
          )}

          {odds.Total && (
            <MarketSection
              market="Total"
              title={`Total${totalLine !== undefined ? ` · ${totalLine}` : ''}`}
              status={odds.Total.Status}
              game={game}
              sides={[
                { label: `Over ${totalLine ?? ''}`.trim(), side: odds.Total.Over },
                { label: `Under ${totalLine ?? ''}`.trim(), side: odds.Total.Under },
              ]}
            />
          )}
        </div>

        {/* --- Related games --- */}
        {relatedGames.length > 0 && (
          <div className="mt-10">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase mb-4">Other {game.league} Games</h3>
            <div className="space-y-3">
              {relatedGames.map(g => {
                const teams = mapSummaryTeams(g);
                const start = parseGameTimeET(g.gameTimeET);
                return (
                  <button
                    key={g.id}
                    onClick={() => navigate(`/game/${g.id}`)}
                    className="w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800 px-4 py-3 flex items-center justify-between gap-4 hover:translate-y-[-1px] dark:hover:border-slate-700 transition-all duration-200 text-left shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={teams.awayTeam.logoUrl} alt="" className="w-8 h-8 object-contain" />
                      <span className="text-[10px] font-black text-slate-300 dark:text-slate-600">@</span>
                      <img src={teams.homeTeam.logoUrl} alt="" className="w-8 h-8 object-contain" />
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 dark:text-white text-sm truncate">
                          {teams.awayTeam.shortName} <span className="text-slate-300 dark:text-slate-600 font-normal">@</span> {teams.homeTeam.shortName}
                        </div>
                        <div className="text-[11px] font-medium text-slate-400">{new Date(start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 dark:text-slate-600 shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameDetail;
