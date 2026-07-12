import React, { useState } from 'react';
import { Game, TrapLabel, TrapHistoryEvent } from '../types';
import { TriggersPills, PeopleSayingSection, CommentsSection, VoteBar, TrapHistory, OddsOverview } from './GameComponents';
import { ScoreBadge, SystemOutcomeChip } from './ScoreBadge';
import { ShareButtons } from './ShareComponents';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Share2 } from 'lucide-react';

interface Props {
  game: Game;
  isDetailView?: boolean;
}

const TrapGameCard: React.FC<Props> = ({ game, isDetailView = false }) => {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(isDetailView);

  const handleHeaderClick = (e: React.MouseEvent) => {
    // If clicking on interactive elements inside header, don't trigger expand
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) {
        return;
    }
    
    if (!isDetailView) {
      toggleExpand(e);
    }
  };

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    setIsExpanded(!isExpanded);
  };

  const handleQuickShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/#/game/${game.id}`;
    if (navigator.share) {
        navigator.share({
            title: `TrapWatch: ${game.awayTeam.shortName} vs ${game.homeTeam.shortName}`,
            text: `Check out this potential trap game! ${game.publicMoneyPercent}% public money on the favorite.`,
            url: url
        }).catch(console.error);
    } else {
        navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
    }
  };

  const getLabelConfig = (label: TrapLabel) => {
    switch (label) {
      case TrapLabel.CITY: 
        // Dominant, high-contrast red.
        return { style: 'bg-[#cc0000] text-white border-[#cc0000] shadow-md shadow-red-900/10', icon: '🚨' }; 
      case TrapLabel.DETECTED: 
        // Restrained warning tone. White/Dark BG with Red accents.
        return { style: 'bg-white dark:bg-slate-900 text-[#cc0000] dark:text-red-400 border border-red-200 dark:border-red-900/50', icon: '⚠️' }; 
      default: 
        // Light Yellow (Potential)
        return { style: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800', icon: '👀' }; 
    }
  };

  const getLastUpdateText = (history: TrapHistoryEvent[] | undefined) => {
    if (!history || history.length === 0) return null;
    const sorted = [...history].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const last = sorted[0];
    const diff = Date.now() - new Date(last.timestamp).getTime();
    
    if (diff < 0) return "Just now";

    const mins = Math.floor(diff / 60000);
    
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    
    const hours = Math.floor(mins / 60);
    if (hours < 24) {
        const rMins = mins % 60;
        if (rMins === 0) return `${hours}h ago`;
        return `${hours}h ${rMins}m ago`;
    }
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const labelConfig = getLabelConfig(game.trapLabel);
  const updateText = getLastUpdateText(game.trapHistory);
  
  // Determine favorite color for Public Money highlighting
  const favoriteColor = (game.isHomeFavorite ? game.homeTeam.primaryColor : game.awayTeam.primaryColor) ?? '#64748b';

  return (
    <div 
      className={`relative bg-white dark:bg-slate-900 rounded-xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)] dark:shadow-none border border-slate-200/60 dark:border-slate-800 overflow-hidden transition-all duration-300 ${!isDetailView ? 'hover:shadow-[0_8px_16px_-4px_rgba(0,0,0,0.1)] dark:hover:shadow-none hover:translate-y-[-1px] dark:hover:border-slate-700' : ''}`}
    >
      {/* --- Update Banner (Absolute Top Right) --- */}
      {updateText && (
          <div className="absolute top-0 right-0 z-10 flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-3 sm:py-1 bg-slate-50 dark:bg-slate-800 rounded-bl-lg sm:rounded-bl-xl border-b border-l border-slate-200/60 dark:border-slate-700 shadow-sm pointer-events-none">
               <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.6)]"></div>
               <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-none pb-[1px]">{updateText}</span>
          </div>
      )}

      {/* --- Card Header --- */}
      <div 
        onClick={handleHeaderClick}
        className={`p-4 sm:p-6 ${!isDetailView ? 'cursor-pointer' : ''}`}
      >
        <div className="flex items-center justify-between gap-3">
            
            {/* Left: Logos & Matchup Info */}
            <div className="flex items-center gap-4 sm:gap-6 min-w-0">
                {/* Logos */}
                <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                    <div className="flex flex-col items-center gap-1.5 w-10 sm:w-16">
                        <img src={game.awayTeam.logoUrl} alt={game.awayTeam.shortName} className="w-10 h-10 sm:w-16 sm:h-16 object-contain drop-shadow-sm" />
                        <div className="h-1 w-full rounded-full opacity-80" style={{ backgroundColor: game.awayTeam.primaryColor ?? '#cbd5e1' }} />
                    </div>
                    <span className="text-[10px] sm:text-xs font-black text-slate-300 dark:text-slate-600 pb-2">VS</span>
                    <div className="flex flex-col items-center gap-1.5 w-10 sm:w-16">
                        <img src={game.homeTeam.logoUrl} alt={game.homeTeam.shortName} className="w-10 h-10 sm:w-16 sm:h-16 object-contain drop-shadow-sm" />
                        <div className="h-1 w-full rounded-full opacity-80" style={{ backgroundColor: game.homeTeam.primaryColor ?? '#cbd5e1' }} />
                    </div>
                </div>
                
                {/* Info */}
                <div className="min-w-0">
                  <h3
                    onClick={(e) => {
                      if (isDetailView) return;
                      e.stopPropagation();
                      navigate(`/game/${game.id}`);
                    }}
                    className={`font-bold text-slate-900 dark:text-white text-base sm:text-xl leading-tight truncate ${!isDetailView ? 'cursor-pointer hover:text-orange-600 dark:hover:text-orange-400 transition-colors' : ''}`}
                    title={!isDetailView ? 'Open game page' : undefined}
                  >
                      {game.awayTeam.shortName} <span className="text-slate-300 dark:text-slate-600 font-normal">vs</span> {game.homeTeam.shortName}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 sm:mt-1.5">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 uppercase tracking-wider">
                          {game.league}
                      </span>
                      {game.status === 'live' || game.status === 'completed' ? (
                        <ScoreBadge
                          score={game}
                          awayAbbr={game.awayTeam.shortName}
                          homeAbbr={game.homeTeam.shortName}
                        />
                      ) : (
                        <span className="text-[10px] sm:text-xs font-medium text-slate-400 dark:text-slate-500">
                            {new Date(game.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      )}
                  </div>
               </div>
            </div>

            {/* Right: Market Odds, Badge, Controls */}
            <div className="flex items-center gap-3 sm:gap-6 shrink-0 pt-3 sm:pt-0">
                {/* Market Odds (Hidden on mobile) - Shows the market that has the trap */}
                <div className="hidden sm:block text-right shrink-0">
                    <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">
                      {game.trapMarket === 'Spread' ? 'Spread' : game.trapMarket === 'Total' ? 'Total' : 'Moneyline'}
                    </div>
                    <div className="text-lg font-bold text-slate-900 dark:text-white font-mono tracking-tight">
                      {game.trapMarket === 'Spread' ? (
                        <>
                          {game.isHomeFavorite ? game.homeTeam.shortName : game.awayTeam.shortName} {game.odds.spread}
                        </>
                      ) : game.trapMarket === 'Total' ? (
                        <>
                          {game.trapSide === 'Over' ? 'Over' : 'Under'} {game.odds.total}
                        </>
                      ) : (
                        <>
                          {game.isHomeFavorite ? game.homeTeam.shortName : game.awayTeam.shortName} {game.odds.moneyline}
                        </>
                      )}
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-4">
                  {/* System result on the flagged market once the game is final */}
                  <SystemOutcomeChip game={game} />

                  {/* Badge (only for games flagged as traps) */}
                  {game.trapLabel && (
                    <div className={`flex items-center justify-center sm:justify-start gap-1.5 w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded-full sm:rounded-lg ${labelConfig.style}`}>
                        <span className="text-sm">{labelConfig.icon}</span>
                        <span className="hidden sm:inline text-xs sm:text-sm font-bold whitespace-nowrap uppercase tracking-tight">{game.trapLabel}</span>
                    </div>
                  )}

                  {/* Controls */}
                  <div className="flex items-center text-slate-400 sm:pl-4 sm:border-l border-slate-100 dark:border-slate-700">
                      <button 
                          onClick={handleQuickShare}
                          className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors hidden sm:block"
                      >
                          <Share2 size={18} />
                      </button>
                      <button 
                          onClick={toggleExpand}
                          className="p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors"
                      >
                          {isExpanded ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
                      </button>
                  </div>
                </div>
            </div>
        </div>
      </div>

      {/* --- Expanded Content --- */}
      {isExpanded && (
        <div className="px-4 sm:px-6 pb-6 animate-in fade-in slide-in-from-top-2 duration-300 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
            {/* Stats Container (Horizontal) */}
            <div className="mt-6 bg-white dark:bg-slate-800 rounded-xl p-2 sm:p-4 flex items-center border border-slate-200/60 dark:border-slate-700 mb-6 shadow-sm">
                
                {/* Public Money */}
                <div 
                  className="flex-1 text-center border-r border-slate-100 dark:border-slate-700 px-2 py-2 sm:py-3 relative group"
                  style={{ '--fav-color': favoriteColor } as React.CSSProperties}
                >
                    <div className="absolute inset-0.5 sm:inset-1 rounded-lg opacity-[0.06] dark:opacity-20 transition-colors bg-[var(--fav-color)]"></div>
                    <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5 sm:mb-1 relative z-10 opacity-70 text-[var(--fav-color)] dark:text-slate-400">
                      {!game.trapMarket || game.trapMarket === 'Moneyline' ? 'Moneyline Handle' : game.trapMarket === 'Spread' ? 'Spread Handle' : 'Total Handle'}
                    </div>
                    <div className="text-2xl sm:text-4xl font-black tracking-tighter relative z-10 text-[var(--fav-color)] dark:text-white">{game.publicMoneyPercent}%</div>
                </div>
                
                {/* Public Bets */}
                <div 
                  className="flex-1 text-center px-2 py-2 sm:py-3 relative group"
                  style={{ '--fav-color': favoriteColor } as React.CSSProperties}
                >
                    <div className="absolute inset-0.5 sm:inset-1 rounded-lg opacity-[0.06] dark:opacity-20 transition-colors bg-[var(--fav-color)]"></div>
                    <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5 sm:mb-1 relative z-10 opacity-70 text-[var(--fav-color)] dark:text-slate-400">
                      {!game.trapMarket || game.trapMarket === 'Moneyline' ? 'Moneyline Bets' : game.trapMarket === 'Spread' ? 'Spread Bets' : 'Total Bets'}
                    </div>
                    <div className="text-2xl sm:text-4xl font-black tracking-tighter relative z-10 text-[var(--fav-color)] dark:text-white">{game.publicBetsPercent}%</div>
                </div>
                
                {/* Market Odds (Desktop) - Shows the market that triggered the trap */}
                <div 
                  className="hidden sm:block flex-1 text-center border-l border-slate-100 dark:border-slate-700 px-2 py-3 relative group"
                  style={{ '--fav-color': favoriteColor } as React.CSSProperties}
                >
                     <div className="absolute inset-1 rounded-lg opacity-[0.06] dark:opacity-20 transition-colors bg-[var(--fav-color)]"></div>
                     <div className="text-[10px] font-bold uppercase tracking-wider mb-1 relative z-10 opacity-70 text-[var(--fav-color)] dark:text-slate-400">
                       {!game.trapMarket || game.trapMarket === 'Moneyline' ? 'Moneyline' : game.trapMarket === 'Spread' ? 'Spread' : 'Total'}
                     </div>
                     <div className="text-2xl font-bold font-mono relative z-10 mt-1 text-[var(--fav-color)] dark:text-white tracking-tight">
                       {!game.trapMarket || game.trapMarket === 'Moneyline' ? game.odds.moneyline : game.trapMarket === 'Spread' ? game.odds.spread : game.trapMarket === 'Total' ? `${game.trapSide === 'Over' ? 'Over' : 'Under'} ${game.odds.total}` : game.odds.total}
                     </div>
                </div>
            </div>
            
            {/* Mobile Odds Info (Visible only on mobile expanded) */}
            <div className="sm:hidden mb-6 p-4 bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-xl flex justify-between items-center shadow-sm">
                <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                      {game.trapMarket === 'Spread' ? 'Spread' : game.trapMarket === 'Total' ? 'Total' : game.trapMarket === 'Moneyline' ? 'Moneyline' : 'Favorite'}
                    </div>
                    <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
                        {game.trapMarket === 'Spread' ? (
                          <span className="font-mono">{game.odds.spread}</span>
                        ) : game.trapMarket === 'Total' ? (
                          <span className="font-mono">{game.trapSide === 'Over' ? 'Over' : 'Under'} {game.odds.total}</span>
                        ) : game.trapMarket === 'Moneyline' ? (
                          <>
                            {game.isHomeFavorite ? game.homeTeam.shortName : game.awayTeam.shortName} <span className="font-mono ml-1 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{game.odds.moneyline}</span>
                          </>
                        ) : (
                          <>
                            {game.isHomeFavorite ? game.homeTeam.shortName : game.awayTeam.shortName} <span className="font-mono ml-1 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{game.odds.spread}</span>
                          </>
                        )}
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                      {game.trapMarket === 'Spread' ? 'Spread' : game.trapMarket === 'Total' ? 'Total' : game.trapMarket === 'Moneyline' ? 'Moneyline' : 'Moneyline'}
                    </div>
                    <div className="text-base font-bold font-mono text-[var(--fav-color)] dark:text-white mt-1" style={{ '--fav-color': favoriteColor } as React.CSSProperties}>
                      {game.trapMarket === 'Spread' ? game.odds.spread : game.trapMarket === 'Total' ? `${game.trapSide === 'Over' ? 'Over' : 'Under'} ${game.odds.total}` : game.odds.moneyline}
                    </div>
                </div>
            </div>

            {/* Vertical Stack of Sections */}
            <div className="flex flex-col gap-6">
                
                {/* 1. Triggers */}
                <TriggersPills triggers={game.trapTriggers} label={game.trapLabel} />

                {/* 2. Odds Overview */}
                <OddsOverview game={game} />

                {/* 3. History */}
                {/* {game.trapHistory && <TrapHistory game={game} />} */}

                {/* 4. People Saying */}
                <PeopleSayingSection posts={game.whatPeopleAreSaying} />

                {/* 5. Community Consensus / Vote Bar */}
                <VoteBar game={game} />

                {/* 6. Comments */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                  <CommentsSection game={game} previewMode={!isDetailView} />
                </div>

                {/* 7. Share Actions */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                   <div className="flex items-center gap-2 mb-3">
                     <Share2 size={14} className="text-slate-400"/>
                     <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Share this Trap</h4>
                   </div>
                   <ShareButtons game={game} />
                </div>

            </div>
        </div>
      )}
    </div>
  );
};

export default TrapGameCard;