import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, MessageSquare, AlertTriangle, Zap, Clock, Target, Calendar, BarChart2, Heart, Reply, Send, History, ExternalLink, Share2, Loader2 } from 'lucide-react';
import { Trigger, SocialPost, Comment, TrapLabel, Game } from '../types';
import { storageService } from '../services/storage';
import { ALL_GAMES } from '../constants';
import { useNavigate } from 'react-router-dom';
import * as htmlToImage from 'html-to-image';
import { ShareStatusChangeCard, ShareModal } from './ShareComponents';

// --- Triggers Pills ---
export const TriggersPills: React.FC<{ triggers: Trigger[]; label: TrapLabel }> = ({ triggers, label }) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (triggers.length === 0) return null;

  const getTheme = () => {
    switch (label) {
      case TrapLabel.CITY: 
        // Dominant Red
        return {
          container: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50',
          headerText: 'text-[#cc0000] dark:text-red-400',
          iconBg: 'bg-[#cc0000] text-white',
          pillActive: 'bg-[#cc0000] border-[#cc0000] text-white ring-2 ring-red-200 dark:ring-red-900',
          pillInactive: 'bg-white dark:bg-slate-900 border-red-200 dark:border-red-800 text-[#cc0000] dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20',
          explanation: 'text-slate-800 dark:text-slate-200 border-red-100 dark:border-red-900 bg-red-50/50 dark:bg-red-900/10'
        };
      case TrapLabel.DETECTED: 
        // Restrained (White/Bordered)
        return {
          container: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
          headerText: 'text-slate-700 dark:text-slate-300',
          iconBg: 'bg-slate-100 dark:bg-slate-800 text-red-600 dark:text-red-400',
          pillActive: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 ring-1 ring-red-100 dark:ring-red-900',
          pillInactive: 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-red-200 dark:hover:border-red-800 hover:text-red-600',
          explanation: 'text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900'
        };
      case TrapLabel.POTENTIAL:
      default:
        // Light Yellow Theme
        return {
          container: 'bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800',
          headerText: 'text-yellow-700 dark:text-yellow-200',
          iconBg: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
          pillActive: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-100',
          pillInactive: 'bg-white dark:bg-slate-800 border-yellow-200 dark:border-yellow-800 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20',
          explanation: 'text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800 bg-white dark:bg-slate-900'
        };
    }
  };

  const theme = getTheme();
  const getIcon = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes('rest') || t.includes('schedule') || t.includes('time')) return <Clock size={14} />;
    if (t.includes('letdown') || t.includes('hangover') || t.includes('motivation') || t.includes('freeze')) return <Zap size={14} />;
    if (t.includes('rivalry') || t.includes('public') || t.includes('reverse')) return <Target size={14} />;
    if (t.includes('date') || t.includes('spot')) return <Calendar size={14} />;
    return <AlertTriangle size={14} />;
  };

  return (
    <div className={`rounded-xl border ${theme.container} p-4 transition-colors duration-200`}>
      <div className="flex items-center gap-2 mb-4">
        <div className={`p-1.5 rounded-full ${theme.iconBg}`}><AlertTriangle size={16} /></div>
        <h4 className={`text-sm font-bold ${theme.headerText} uppercase tracking-wide`}>Trap Triggers</h4>
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        {triggers.map((trigger, idx) => {
          const isActive = selectedIndex === idx;
          return (
            <button key={idx} onClick={(e) => { e.stopPropagation(); setSelectedIndex(isActive ? null : idx); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-bold transition-all shadow-sm ${isActive ? theme.pillActive : theme.pillInactive}`}>
              {getIcon(trigger.title)}<span>{trigger.title}</span><ChevronDown size={14} className={`transition-transform duration-200 ${isActive ? 'rotate-180' : ''}`} />
            </button>
          );
        })}
      </div>
      {selectedIndex !== null && triggers[selectedIndex] && (
        <div className={`rounded-lg border p-3 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200 ${theme.explanation}`}>
          <p className="text-sm font-medium leading-relaxed">{triggers[selectedIndex].explanation}</p>
        </div>
      )}
    </div>
  );
};

export const TrapHistory: React.FC<{ game: Game }> = ({ game }) => {
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [shareData, setShareData] = useState<{prev: string, curr: string, homeLogo?: string, awayLogo?: string} | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const hiddenCardRef = useRef<HTMLDivElement>(null);

  const history = game.trapHistory;
  if (!history || history.length === 0) return null;
  const sortedHistory = [...history].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Helper to convert image URL to base64
  const convertImageToBase64 = async (url: string): Promise<string> => {
      try {
          // This fetch attempt might fail if CORS is strictly blocked and no proxy is available,
          // but ESPN CDN usually allows it.
          const response = await fetch(url, { mode: 'cors' });
          const blob = await response.blob();
          return new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = () => resolve(url); // Fallback to URL
              reader.readAsDataURL(blob);
          });
      } catch (e) {
          console.warn("Failed to convert image to base64, falling back to URL", e);
          return url;
      }
  };

  const handleShare = async (e: React.MouseEvent, index: number, currentLabel: string) => {
      e.stopPropagation();
      const prevLabel = index < sortedHistory.length - 1 ? sortedHistory[index + 1].label : 'Safe';
      
      setIsGenerating(index.toString());
      
      try {
          // Pre-fetch images as base64 to ensure they render on mobile canvas
          const [homeLogo, awayLogo] = await Promise.all([
              convertImageToBase64(game.homeTeam.logoUrl),
              convertImageToBase64(game.awayTeam.logoUrl)
          ]);
          
          setShareData({ prev: prevLabel, curr: currentLabel, homeLogo, awayLogo });
          
          // Wait for state update and render
          await new Promise(resolve => setTimeout(resolve, 200));
          
          if (hiddenCardRef.current) {
              const dataUrl = await htmlToImage.toPng(hiddenCardRef.current, { 
                  quality: 1.0, 
                  pixelRatio: 2, // Higher pixel ratio for sharper text
                  cacheBust: true,
                  useCORS: true,
                  skipAutoScale: true // Helps with mobile scaling issues
              });
              setPreviewImage(dataUrl);
          }
      } catch (err) {
          console.error("Failed to generate image", err);
          setShareData(null);
      } finally {
          setIsGenerating(null);
      }
  };

  const closeShareModal = () => {
      setPreviewImage(null);
      setShareData(null);
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 p-1.5 rounded-full border border-slate-100 dark:border-slate-700"><History size={16} /></div>
        <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">Status History</h4>
      </div>
      
      {/* Hidden Card for Generation */}
      {shareData && (
          <ShareStatusChangeCard 
            game={game} 
            prevStatus={shareData.prev} 
            newStatus={shareData.curr} 
            elementRef={hiddenCardRef}
            homeLogoBase64={shareData.homeLogo}
            awayLogoBase64={shareData.awayLogo}
          />
      )}

      {/* Share Modal */}
      <ShareModal 
        isOpen={!!previewImage} 
        onClose={closeShareModal} 
        imageData={previewImage} 
        game={game}
        statusText={`${shareData?.prev} → ${shareData?.curr}`}
      />

      <div className="relative pl-4 ml-1 border-l-2 border-slate-100 dark:border-slate-800 space-y-4">
        {sortedHistory.map((event, idx) => {
           let labelStyle = '';
           let dotStyle = '';
           
           if (event.label === TrapLabel.CITY) {
              labelStyle = 'bg-[#cc0000] text-white border-[#cc0000]';
              dotStyle = 'bg-[#cc0000] ring-red-200 dark:ring-red-900/30';
           } else if (event.label === TrapLabel.DETECTED) {
              labelStyle = 'bg-white dark:bg-slate-800 text-[#cc0000] dark:text-red-400 border border-red-200 dark:border-red-900/50';
              // Standard Red Solid Dot for uniformity
              dotStyle = 'bg-red-500 ring-red-100 dark:ring-red-900/30';
           } else {
              // Potential (Yellow)
              labelStyle = 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800';
              dotStyle = 'bg-yellow-400 dark:bg-yellow-600 ring-yellow-100 dark:ring-yellow-900/30';
           }
           
           const dateObj = new Date(event.timestamp);
           const isLoading = isGenerating === idx.toString();

           return (
             <div key={idx} className="relative group">
                <div className={`absolute -left-[23px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 shadow-sm ${dotStyle} z-10`}></div>
                <div className="flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-100/50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-all">
                   <div><span className={`inline-block text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded border shadow-sm ${labelStyle}`}>{event.label}</span></div>
                   <div className="flex items-center gap-3">
                        <div className="text-right">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">{dateObj.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})}</span>
                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide block">{dateObj.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                        </div>
                        <button 
                            onClick={(e) => handleShare(e, idx, event.label)}
                            disabled={!!isGenerating}
                            className="p-1.5 text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                        >
                            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
                        </button>
                   </div>
                </div>
             </div>
           );
        })}
      </div>
    </div>
  );
};

export const PeopleSayingFeed: React.FC<{ posts: SocialPost[]; limit?: number }> = ({ posts, limit }) => {
  const displayPosts = limit ? posts.slice(0, limit) : posts;
  if (posts.length === 0) return <div className="text-sm text-slate-400 italic py-2">No chatter yet...</div>;
  return (
    <div className="space-y-3">
      {displayPosts.map(post => {
        const Wrapper = post.url ? 'a' : 'div';
        const props = post.url ? { 
            href: post.url, 
            target: "_blank", 
            rel: "noopener noreferrer",
            className: "block bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700 text-sm hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors group cursor-pointer"
        } : { 
            className: "block bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700 text-sm"
        };

        return (
            <Wrapper key={post.id} {...props}>
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${post.source === 'X' ? 'bg-black text-white dark:bg-slate-950' : post.source === 'Reddit' ? 'bg-orange-600 text-white' : 'bg-blue-600 text-white'}`}>{post.source}</span>
                  <span className={`font-semibold text-slate-700 dark:text-slate-300 ${post.url ? 'group-hover:text-blue-600 dark:group-hover:text-blue-400 underline-offset-2 group-hover:underline' : ''}`}>{post.authorName}</span>
                  {post.url && <ExternalLink size={12} className="text-slate-400 group-hover:text-blue-500" />}
                </div>
                <span className="text-xs text-slate-400">{post.timestamp}</span>
              </div>
              <p className="text-slate-800 dark:text-slate-300 leading-relaxed">{post.text}</p>
            </Wrapper>
        );
      })}
    </div>
  );
};

export const PeopleSayingSection: React.FC<{ posts: SocialPost[] }> = ({ posts }) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-blue-100 dark:border-blue-900/30 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 p-1.5 rounded-full border border-blue-100 dark:border-blue-900/30"><MessageSquare size={16} /></div>
        <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">What the people are saying</h4>
      </div>
      <PeopleSayingFeed posts={posts} limit={3} />
    </div>
  );
};

export const VoteBar: React.FC<{ gameId: string }> = ({ gameId }) => {
  const [userVote, setUserVote] = useState(storageService.getVote(gameId)?.selection);
  const [stats, setStats] = useState(storageService.getGameStats(gameId));
  
  const game = ALL_GAMES.find(g => g.id === gameId);
  const isExpired = game ? new Date(game.startTime).getTime() < Date.now() : false;

  useEffect(() => {
    setStats(storageService.getGameStats(gameId));
    setUserVote(storageService.getVote(gameId)?.selection);

    const unsub = storageService.subscribeToChanges(() => {
        setUserVote(storageService.getVote(gameId)?.selection);
        setStats(storageService.getGameStats(gameId));
    });
    return unsub;
  }, [gameId]);

  const handleVote = (vote: 'TRAP' | 'NOT_TRAP') => {
    if (isExpired) return;
    setUserVote(vote);
    storageService.setVote(gameId, vote);
  };

  const total = stats.trap + stats.not;
  const trapPercent = total === 0 ? 0 : Math.round((stats.trap / total) * 100);
  const safePercent = total === 0 ? 0 : 100 - trapPercent;
  
  const showResults = !!userVote || isExpired;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
      <div className="flex items-center justify-between mb-4">
         <div className="flex items-center gap-2">
            <div className="bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-500 p-1.5 rounded-full border border-orange-100 dark:border-orange-900/30"><BarChart2 size={16} /></div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">Community Consensus</h4>
         </div>
         <div className="flex gap-2">
            {isExpired && !userVote && <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 flex items-center gap-1">🔒 Closed</span>}
            {trapPercent > 75 && <span className="text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded border border-orange-100 dark:border-orange-900/30 flex items-center gap-1">🔥 Danger Zone</span>}
         </div>
      </div>
      {!showResults ? (
        <div className="flex gap-3">
          <button onClick={(e) => { e.stopPropagation(); handleVote('TRAP'); }} className="flex-1 bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20 dark:hover:bg-orange-900/30 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400 font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"><span className="text-lg">⚠️</span> It's a TRAP</button>
          <button onClick={(e) => { e.stopPropagation(); handleVote('NOT_TRAP'); }} className="flex-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"><span className="text-lg">🛡️</span> Safe</button>
        </div>
      ) : (
        <div className="space-y-4 pt-1 animate-in fade-in duration-300">
           <div>
              <div className="flex justify-between items-center mb-1.5">
                 <span className="text-xs font-bold text-orange-700 dark:text-orange-400 flex items-center gap-1.5">⚠️ It's a TRAP{userVote === 'TRAP' && <span className="bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-200 text-[10px] px-1.5 py-0.5 rounded-full border border-orange-200 dark:border-orange-800">You</span>}</span>
                 <span className="text-sm font-black text-slate-900 dark:text-white">{trapPercent}%</span>
              </div>
              <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-orange-500 transition-all duration-1000 ease-out" style={{ width: `${trapPercent}%` }} /></div>
           </div>
           <div>
              <div className="flex justify-between items-center mb-1.5">
                 <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">🛡️ Safe{userVote === 'NOT_TRAP' && <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-200 text-[10px] px-1.5 py-0.5 rounded-full border border-slate-300 dark:border-slate-600">You</span>}</span>
                 <span className="text-sm font-black text-slate-900 dark:text-white">{safePercent}%</span>
              </div>
              <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-slate-400 transition-all duration-1000 ease-out" style={{ width: `${safePercent}%` }} /></div>
           </div>
           <div className="text-right border-t border-slate-100 dark:border-slate-800 pt-2"><span className="text-[10px] text-slate-400 font-medium">{total.toLocaleString()} votes</span></div>
        </div>
      )}
    </div>
  );
};

const CommentItem: React.FC<{ comment: Comment; gameId: string; depth?: number }> = ({ comment, gameId, depth = 0 }) => {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    storageService.toggleLike(gameId, comment.id);
  };

  const handleReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    storageService.addReply(gameId, comment.id, replyText);
    setReplyText('');
    setIsReplying(false);
  };

  const colors = ['bg-pink-500', 'bg-purple-500', 'bg-indigo-500', 'bg-blue-500', 'bg-teal-500', 'bg-emerald-500', 'bg-orange-500'];
  const colorIndex = comment.displayName.length % colors.length;
  const avatarColor = colors[colorIndex];

  return (
    <div id={`comment-${comment.id}`} className={`flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ${depth > 0 ? 'mt-3 relative' : ''}`}>
      {depth > 0 && <div className="absolute -left-6 top-0 w-6 h-6 border-l-2 border-b-2 border-slate-200 dark:border-slate-700 rounded-bl-xl"></div>}
      <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full shrink-0 flex items-center justify-center text-white font-bold text-xs md:text-sm shadow-sm ${avatarColor} bg-gradient-to-br from-white/20 to-transparent`}>{comment.displayName.charAt(0)}</div>
      <div className="flex-1 min-w-0">
        <div className="bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors rounded-2xl rounded-tl-none p-3 border border-slate-200/60 dark:border-slate-700 shadow-sm relative group">
          <div className="flex justify-between items-center mb-1">
             <span className="font-bold text-slate-800 dark:text-slate-200 text-xs md:text-sm">{comment.displayName}</span>
             <span className="text-[10px] text-slate-400">1h ago</span>
          </div>
          <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">{comment.text}</p>
        </div>
        <div className="flex items-center gap-4 mt-1.5 ml-1">
          <button onClick={handleLike} className={`flex items-center gap-1.5 text-xs font-semibold transition-all duration-200 ${comment.isLiked ? 'text-red-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
            <Heart size={14} className={`transition-transform duration-200 ${comment.isLiked ? 'fill-red-500 scale-110' : ''}`} />{comment.upvotes > 0 && <span>{comment.upvotes}</span>}
          </button>
          <button onClick={(e) => { e.stopPropagation(); setIsReplying(!isReplying); }} className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-orange-600 dark:hover:text-orange-500 transition-colors"><Reply size={14} />Reply</button>
        </div>
        {isReplying && (
          <form onSubmit={handleReplySubmit} className="mt-3 flex gap-2 animate-in fade-in slide-in-from-top-1">
             <input type="text" autoFocus value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder={`Replying to ${comment.displayName}...`} className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm" onClick={(e) => e.stopPropagation()} />
             <button type="submit" className="bg-orange-500 text-white p-2 rounded-lg hover:bg-orange-600 transition-colors shadow-sm" onClick={(e) => e.stopPropagation()}><Send size={16} /></button>
          </form>
        )}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2 flex flex-col gap-1">{comment.replies.map(reply => <CommentItem key={reply.id} comment={reply} gameId={gameId} depth={depth + 1} />)}</div>
        )}
      </div>
    </div>
  );
};

export const CommentsSection: React.FC<{ gameId: string; previewMode?: boolean }> = ({ gameId, previewMode = false }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(storageService.isAuthenticated());

  useEffect(() => {
    setComments(storageService.getComments(gameId));
    
    const unsubComments = storageService.subscribeToComments((gid, comment) => {
        if (gid === gameId) {
            setComments(prev => {
                if (prev.find(c => c.id === comment.id)) return prev;
                return [comment, ...prev];
            });
        }
    });
    
    const unsubAuth = storageService.initAuthListener((state) => {
        setIsAuthenticated(state.isAuthenticated);
    });

    return () => {
        unsubComments();
    };
  }, [gameId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    storageService.addComment(gameId, newComment);
    setNewComment('');
  };

  const displayComments = previewMode ? comments.slice(0, 2) : comments;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-slate-400" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                {comments.length} Comments
            </h4>
        </div>
        {!isAuthenticated && (
            <span className="text-xs text-slate-400">Guest Mode</span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mb-6 relative">
          <input 
              type="text" 
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={isAuthenticated ? "Add to the conversation..." : "Comment as Guest..."}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 pr-12 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
          />
          <button 
              type="submit" 
              disabled={!newComment.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-0 transition-all duration-200"
          >
              <Send size={16} />
          </button>
      </form>

      <div className="space-y-4">
        {displayComments.length > 0 ? (
            displayComments.map(comment => (
                <CommentItem key={comment.id} comment={comment} gameId={gameId} />
            ))
        ) : (
            <div className="text-center py-6 text-slate-400 text-sm italic">
                Be the first to call out the trap.
            </div>
        )}
      </div>
      
      {previewMode && comments.length > 2 && (
          <div className="mt-3 text-center">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">View all {comments.length} comments</span>
          </div>
      )}
    </div>
  );
};