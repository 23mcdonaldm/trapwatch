import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Comment } from '../types';
import { storageService } from '../services/storage';
import { MessageSquare, ArrowRight } from 'lucide-react';
import { MOCK_GAMES } from '../constants';

export const LiveChatBanner: React.FC = () => {
  const navigate = useNavigate();
  const [activeComment, setActiveComment] = useState<{gameId: string, comment: Comment, teamName: string} | null>(null);
  const [isExiting, setIsExiting] = useState(false);

  // Subscribe to new comments
  useEffect(() => {
    const unsub = storageService.subscribeToComments((gameId, comment) => {
        const game = MOCK_GAMES.find(g => g.id === gameId);
        const teamName = game ? `${game.awayTeam.shortName} vs ${game.homeTeam.shortName}` : 'Unknown Game';
        
        if (activeComment) {
            // Animate out current, then set new
            setIsExiting(true);
            setTimeout(() => {
                setActiveComment({ gameId, comment, teamName });
                setIsExiting(false);
            }, 300); // Match transition duration
        } else {
            setActiveComment({ gameId, comment, teamName });
            setIsExiting(false);
        }
    });
    return unsub;
  }, [activeComment]);

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    // Only set timer if we have a comment and we aren't already in the process of exiting
    // (either due to a new message coming in or a previous dismiss timer)
    if (activeComment && !isExiting) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => {
            setActiveComment(null);
            setIsExiting(false);
        }, 300);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [activeComment, isExiting]);

  if (!activeComment) return null;

  const handleClick = () => {
      navigate(`/game/${activeComment.gameId}`, { state: { scrollToComment: activeComment.comment.id } });
      setActiveComment(null);
      setIsExiting(false);
  };

  return (
      <div 
        onClick={handleClick}
        className={`fixed bottom-4 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-[480px] z-50 cursor-pointer transition-all duration-300 transform ease-in-out ${isExiting ? 'translate-y-[150%] opacity-0' : 'translate-y-0 opacity-100'}`}
      >
        <div className="bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-3 hover:scale-[1.02] active:scale-95 transition-transform ring-1 ring-white/10">
             <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shrink-0 shadow-lg border border-white/20">
                <MessageSquare size={18} className="text-white" />
             </div>
             <div className="flex-1 min-w-0">
                 <div className="flex justify-between items-baseline mb-0.5">
                     <span className="font-bold text-xs text-orange-400 uppercase tracking-wide truncate pr-2">{activeComment.teamName}</span>
                     <span className="text-[10px] text-slate-400">Just now</span>
                 </div>
                 <div className="flex items-center gap-2">
                     <span className="font-bold text-sm text-white truncate max-w-[80px]">{activeComment.comment.displayName}:</span>
                     <span className="text-sm text-slate-300 truncate flex-1">{activeComment.comment.text}</span>
                 </div>
             </div>
             <div className="text-slate-500 pl-2">
                <ArrowRight size={18} />
             </div>
        </div>
      </div>
  );
};