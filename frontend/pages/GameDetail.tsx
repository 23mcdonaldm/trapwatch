import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Trophy } from 'lucide-react';
import { MOCK_GAMES } from '../constants';
import TrapGameCard from '../components/TrapGameCard';
import { storageService } from '../services/storage';

const GameDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const game = MOCK_GAMES.find(g => g.id === id);

  const handleBack = () => {
    // If it's the first item in the history stack (direct link/new tab), go home.
    // React Router assigns 'default' key to the initial location.
    if (location.key === 'default' || window.history.length <= 1) {
        navigate('/');
    } else {
        navigate(-1);
    }
  };

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
        <p>Game not found</p>
        <button onClick={() => navigate('/')} className="ml-2 text-blue-500">Go Home</button>
      </div>
    );
  }

  const relatedGames = MOCK_GAMES.filter(g => g.league === game.league && g.id !== game.id).slice(0, 2);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-100 dark:from-slate-900 dark:to-[#020617] pb-20 transition-colors duration-200">
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 transition-colors duration-200">
        <div className="px-4 h-14 flex items-center gap-4 max-w-md mx-auto relative">
          <button onClick={handleBack} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <ArrowLeft size={24} className="text-slate-700 dark:text-slate-200" />
          </button>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white truncate flex-1">
            {game.awayTeam.name} vs {game.homeTeam.name}
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

      <div className="max-w-md mx-auto px-4 pt-6">
        <TrapGameCard game={game} isDetailView={true} />

        {relatedGames.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase mb-4">Other {game.league} Traps</h3>
            <div className="space-y-4">
              {relatedGames.map(g => (
                <TrapGameCard key={g.id} game={g} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameDetail;