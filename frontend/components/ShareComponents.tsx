import React, { useRef, useState } from 'react';
import { Link2, Twitter, Instagram, Loader2, X, Copy, Check } from 'lucide-react';
import { Game, TrapLabel, LeaderboardEntry } from '../types';
import * as htmlToImage from 'html-to-image';
import { ArrowRight } from 'lucide-react';

// --- Share Card (Hidden/Preview) ---
export const ShareCard: React.FC<{ game: Game; elementRef: React.RefObject<HTMLDivElement> }> = ({ game, elementRef }) => {
  const getBadgeStyle = (label: TrapLabel) => {
    switch (label) {
      case TrapLabel.CITY: return 'bg-[#bf0000] text-white shadow-red-900/30';
      case TrapLabel.DETECTED: return 'bg-red-500 text-white shadow-red-900/20';
      default: return 'bg-yellow-500 text-slate-900 shadow-yellow-900/20';
    }
  };

  return (
    <div className="fixed left-[-9999px] top-0"> 
      <div 
        ref={elementRef}
        className="w-[1080px] h-[1080px] bg-slate-900 text-white p-12 flex flex-col justify-between font-sans relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}
      >
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-orange-600 rounded-full blur-[150px] opacity-20 translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600 rounded-full blur-[150px] opacity-20 -translate-x-1/2 translate-y-1/2"></div>

        <div className="flex justify-between items-center z-10">
          <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-full border border-white/20">
            <h2 className="text-3xl font-black tracking-tighter">
              <span className="text-white">Trap</span>
              <span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">Watch</span>
            </h2>
          </div>
          <div className={`${getBadgeStyle(game.trapLabel)} px-6 py-3 rounded-full font-bold text-2xl uppercase tracking-wider shadow-lg`}>
            {game.trapLabel}
          </div>
        </div>

        <div className="flex flex-col items-center gap-12 z-10 mt-10">
          <div className="flex items-center justify-center w-full gap-16">
            <div className="flex flex-col items-center gap-6">
              <img src={game.homeTeam.logoUrl} alt="" className="w-48 h-48 object-contain drop-shadow-2xl" crossOrigin="anonymous" />
              <span className="text-5xl font-black">{game.homeTeam.shortName}</span>
              <span className="text-2xl text-slate-400 font-medium">Home</span>
            </div>
            
            <div className="flex flex-col items-center">
              <span className="text-6xl font-black text-slate-600/50">VS</span>
              <span className="text-2xl font-bold text-orange-400 mt-4">{game.odds.spread}</span>
            </div>

            <div className="flex flex-col items-center gap-6">
              <img src={game.awayTeam.logoUrl} alt="" className="w-48 h-48 object-contain drop-shadow-2xl" crossOrigin="anonymous" />
              <span className="text-5xl font-black">{game.awayTeam.shortName}</span>
              <span className="text-2xl text-slate-400 font-medium">Away</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 z-10 mt-12">
          <div className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-sm">
            <p className="text-slate-400 text-xl font-medium uppercase mb-2">Public Money</p>
            <p className="text-7xl font-black text-orange-500">{game.publicMoneyPercent}%</p>
            <p className="text-slate-400 mt-2 text-lg">on the favorite</p>
          </div>
          <div className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-sm">
            <p className="text-slate-400 text-xl font-medium uppercase mb-2">Public Bets</p>
            <p className="text-7xl font-black text-white">{game.publicBetsPercent}%</p>
            <p className="text-slate-400 mt-2 text-lg">ticket count</p>
          </div>
        </div>

        <div className="z-10 mt-8">
           <h3 className="text-2xl font-bold text-slate-300 mb-6 uppercase tracking-widest text-sm">Detected Triggers</h3>
           <div className="flex flex-wrap gap-4">
             {game.trapTriggers.slice(0, 3).map((t, i) => (
               <div key={i} className="bg-orange-500/20 border border-orange-500/50 text-orange-200 px-6 py-4 rounded-xl text-2xl font-semibold">
                 ⚠️ {t.title}
               </div>
             ))}
           </div>
        </div>

        <div className="text-center z-10 pt-8 border-t border-white/10">
          <p className="text-xl text-slate-400">Download the app to see why.</p>
        </div>
      </div>
    </div>
  );
};

export const ShareStatusChangeCard: React.FC<{ 
    game: Game; 
    prevStatus: string; 
    newStatus: string; 
    elementRef: React.RefObject<HTMLDivElement>;
    homeLogoBase64?: string;
    awayLogoBase64?: string;
}> = ({ game, prevStatus, newStatus, elementRef, homeLogoBase64, awayLogoBase64 }) => {
    
    const getLabelColor = (label: string) => {
        if (label === TrapLabel.CITY) return 'text-[#bf0000]';
        if (label === TrapLabel.DETECTED) return 'text-red-500';
        if (label === TrapLabel.POTENTIAL) return 'text-yellow-500';
        return 'text-slate-400';
    };

    const getSpreadText = (isHomeTeam: boolean) => {
        const isFavorite = isHomeTeam === game.isHomeFavorite;
        if (isFavorite) return game.odds.spread;
        
        // Invert spread for underdog (assuming spread string is like "-7.5")
        const spread = game.odds.spread;
        if (spread.startsWith('-')) return spread.replace('-', '+');
        if (spread.startsWith('+')) return spread.replace('+', '-');
        return `+${spread}`;
    };

    return (
        <div className="fixed left-[-9999px] top-0"> 
            <div 
                ref={elementRef}
                className="w-[1080px] h-[1080px] bg-slate-950 text-white p-16 flex flex-col justify-between font-sans relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #020617 0%, #1e293b 100%)' }}
            >
                <div className="absolute top-1/2 left-1/2 w-[800px] h-[800px] bg-red-600 rounded-full blur-[200px] opacity-10 -translate-x-1/2 -translate-y-1/2"></div>
                
                <div className="flex justify-end items-center z-10">
                    <div className="flex items-center gap-2">
                        <h2 className="text-4xl font-black tracking-tighter">
                            <span className="text-white">Trap</span>
                            <span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">Watch</span>
                        </h2>
                    </div>
                </div>

                <div className="flex flex-col items-center gap-16 z-10">
                    <div className="flex items-center justify-center w-full gap-20">
                        {/* Away Team */}
                        <div className="flex flex-col items-center gap-6">
                            <div className="w-56 h-56 bg-white/5 rounded-full flex items-center justify-center p-8 border border-white/10 shadow-2xl">
                                <img 
                                    src={awayLogoBase64 || game.awayTeam.logoUrl} 
                                    alt="" 
                                    className="w-full h-full object-contain" 
                                    crossOrigin="anonymous" 
                                />
                            </div>
                            <div className="text-center">
                                <span className="text-5xl font-black tracking-tight block">{game.awayTeam.shortName}</span>
                                <div className="mt-4 bg-white/10 px-6 py-2 rounded-xl inline-block border border-white/5">
                                    <span className="text-4xl font-bold text-white font-mono tracking-tighter">{getSpreadText(false)}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex flex-col items-center">
                            <span className="text-7xl font-black text-slate-700">VS</span>
                        </div>

                        {/* Home Team */}
                        <div className="flex flex-col items-center gap-6">
                            <div className="w-56 h-56 bg-white/5 rounded-full flex items-center justify-center p-8 border border-white/10 shadow-2xl">
                                <img 
                                    src={homeLogoBase64 || game.homeTeam.logoUrl} 
                                    alt="" 
                                    className="w-full h-full object-contain" 
                                    crossOrigin="anonymous" 
                                />
                            </div>
                            <div className="text-center">
                                <span className="text-5xl font-black tracking-tight block">{game.homeTeam.shortName}</span>
                                <div className="mt-4 bg-white/10 px-6 py-2 rounded-xl inline-block border border-white/5">
                                    <span className="text-4xl font-bold text-white font-mono tracking-tighter">{getSpreadText(true)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="z-10 mb-12">
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-12 backdrop-blur-md">
                        <h3 className="text-center text-slate-400 font-bold uppercase tracking-widest mb-10 text-xl">Status Update</h3>
                        <div className="flex items-center justify-center gap-12">
                            <span className={`text-5xl font-black uppercase ${getLabelColor(prevStatus)}`}>{prevStatus}</span>
                            
                            <ArrowRight size={80} className="text-slate-600 animate-pulse" />
                            
                            <div className="relative">
                                <span className={`text-6xl font-black uppercase ${getLabelColor(newStatus)}`}>{newStatus}</span>
                                <div className="absolute -inset-4 bg-white/5 rounded-xl blur-lg -z-10"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="text-center z-10 pt-8 border-t border-white/10">
                    <p className="text-2xl text-slate-400">Track real-time line movement on TrapWatch.</p>
                </div>
            </div>
        </div>
    );
};

export const ShareStatsCard: React.FC<{ entry: LeaderboardEntry; elementRef: React.RefObject<HTMLDivElement> }> = ({ entry, elementRef }) => {
    return (
        <div className="fixed left-[-9999px] top-0"> 
            <div 
                ref={elementRef}
                className="w-[1080px] h-[1080px] bg-slate-900 text-white p-12 flex flex-col justify-between font-sans relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}
            >
                <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-orange-600 rounded-full blur-[200px] opacity-10 translate-x-[-20%] translate-y-[-20%]"></div>
                
                <div className="flex justify-between items-center z-10">
                    <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-full border border-white/20">
                        <h2 className="text-3xl font-black tracking-tighter">
                            <span className="text-white">Trap</span>
                            <span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">Watch</span>
                        </h2>
                    </div>
                </div>

                <div className="flex flex-col items-center z-10 gap-8">
                    <div className="w-40 h-40 rounded-full bg-gradient-to-br from-orange-400 to-red-600 p-1 shadow-2xl">
                         <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-6xl font-black text-white uppercase border-4 border-white/10">
                             {entry.username.charAt(0)}
                         </div>
                    </div>
                    <div className="text-center">
                        <h3 className="text-6xl font-black text-white mb-2">{entry.username}</h3>
                        <p className="text-3xl text-orange-400 font-bold uppercase tracking-widest">Trap Master</p>
                    </div>

                    <div className="grid grid-cols-2 gap-8 w-full max-w-3xl mt-8">
                        <div className="bg-white/5 border border-white/10 p-10 rounded-3xl backdrop-blur-sm text-center">
                            <p className="text-slate-400 text-xl font-bold uppercase mb-2">Accuracy</p>
                            <p className="text-8xl font-black text-orange-500">{entry.accuracy.toFixed(1)}%</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 p-10 rounded-3xl backdrop-blur-sm text-center">
                            <p className="text-slate-400 text-xl font-bold uppercase mb-2">Record</p>
                            <p className="text-8xl font-black text-white">{entry.correctVotes}-{entry.totalCountedVotes - entry.correctVotes}</p>
                        </div>
                    </div>
                    
                    {entry.streak > 2 && (
                         <div className="bg-orange-500/20 border border-orange-500/50 text-orange-100 px-8 py-4 rounded-full text-3xl font-bold flex items-center gap-4 animate-pulse">
                             <span className="text-4xl">🔥</span> {entry.streak} Game Streak
                         </div>
                    )}
                </div>

                <div className="text-center z-10 pt-8 border-t border-white/10">
                    <p className="text-xl text-slate-400">Can you beat my score? Download TrapWatch.</p>
                </div>
            </div>
        </div>
    );
};

// --- Share Modal ---
export const ShareModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    imageData: string | null; 
    game: Game; 
    statusText: string;
}> = ({ isOpen, onClose, imageData, game, statusText }) => {
    const [copySuccess, setCopySuccess] = useState(false);

    if (!isOpen || !imageData) return null;

    const handleCopyImage = async () => {
        try {
            const blob = await (await fetch(imageData)).blob();
            await navigator.clipboard.write([
                new ClipboardItem({
                    [blob.type]: blob
                })
            ]);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (err) {
            console.error('Failed to copy image', err);
            alert('Clipboard access denied or not supported on this browser.');
        }
    };

    const handleInstagram = () => {
        const link = document.createElement('a');
        link.download = `trapwatch-${game.homeTeam.shortName}-vs-${game.awayTeam.shortName}-status.png`;
        link.href = imageData;
        link.click();
        alert('Image downloaded! Open Instagram and add to your story.');
    };

    const handleTwitter = () => {
        const url = `${window.location.origin}/#/game/${game.id}`;
        const text = `🚨 STATUS UPDATE 🚨\n\n${game.awayTeam.name} vs ${game.homeTeam.name}\nMovement Detected: ${statusText}\n\nTrack the line movement on TrapWatch:`;
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">Share Status Update</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 bg-slate-100 dark:bg-slate-950 flex-1 overflow-y-auto flex items-center justify-center">
                    <img src={imageData} alt="Share Preview" className="w-full h-auto rounded-xl shadow-lg border border-slate-200 dark:border-slate-800" />
                </div>

                <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-3">
                    <button 
                        onClick={handleTwitter}
                        className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
                    >
                        <Twitter size={24} className="text-black dark:text-white fill-current" />
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Post to X</span>
                    </button>

                    <button 
                        onClick={handleInstagram}
                        className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
                    >
                        <Instagram size={24} className="text-pink-600" />
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Instagram</span>
                    </button>

                    <button 
                        onClick={handleCopyImage}
                        className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700 relative"
                    >
                        {copySuccess ? <Check size={24} className="text-green-500" /> : <Copy size={24} className="text-blue-500" />}
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{copySuccess ? 'Copied!' : 'Copy Image'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export const ShareButtons: React.FC<{ game: Game }> = ({ game }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/#/game/${game.id}`;
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
  };

  const handleShareX = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/#/game/${game.id}`;
    const text = `🚨 TRAP GAME ALERT 🚨\n\n${game.awayTeam.name} vs ${game.homeTeam.name}\n${game.publicMoneyPercent}% of money is on the favorite.\n\nCheck the analysis on TrapWatch:`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  };

  const handleDownloadImage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!cardRef.current) return;
    
    setIsGenerating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      const dataUrl = await htmlToImage.toPng(cardRef.current, { 
          quality: 1.0, 
          pixelRatio: 1, 
          cacheBust: true, 
          useCORS: true 
      });
      
      const link = document.createElement('a');
      link.download = `trapwatch-${game.homeTeam.shortName}-vs-${game.awayTeam.shortName}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to generate image', err);
      alert('Could not generate image. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
      <ShareCard game={game} elementRef={cardRef} />
      
      <button 
        onClick={handleCopyLink}
        className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-slate-100 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors text-slate-900"
      >
        <Link2 size={16} /> <span className="hidden sm:inline">Link</span>
      </button>
      
      <button 
        onClick={handleShareX}
        className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
      >
        <Twitter size={16} fill="white" /> <span className="hidden sm:inline">Post</span>
      </button>
      
      <button 
        onClick={handleDownloadImage}
        disabled={isGenerating}
        className="flex-[2] flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
      >
        {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Instagram size={16} />}
        <span>Story Image</span>
      </button>
    </div>
  );
};