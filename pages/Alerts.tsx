import React, { useState, useEffect } from 'react';
import { Bell, ShieldAlert, LogIn, Check, Mail, Smartphone, Search, ArrowRight, ArrowLeft, Home, Loader2, AlertCircle, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { storageService } from '../services/storage';
import { League, Team, UserPreferences } from '../types';
import { ALL_TEAMS } from '../data/teams';

type ViewState = 'AUTH' | 'ONBOARDING_LEAGUES' | 'ONBOARDING_TEAMS' | 'ONBOARDING_PREFS' | 'DASHBOARD';

const Alerts: React.FC = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<ViewState>('AUTH');
  const [userState, setUserState] = useState(storageService.getUserState());
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  
  // Onboarding State
  const [selectedLeagues, setSelectedLeagues] = useState<League[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]); // Keys from ALL_TEAMS
  const [notifications, setNotifications] = useState({
    myTeams: { email: true, sms: false },
    anyTrap: { email: false, sms: false },
    contactEmail: '',
    contactPhone: ''
  });

  // Init Auth Listener
  useEffect(() => {
    storageService.initAuthListener((newState) => {
      setUserState(newState);
      if (newState.isAuthenticated) {
        if (newState.preferences) {
          setView('DASHBOARD');
        } else {
          // New user or no prefs saved yet
          setView('ONBOARDING_LEAGUES');
        }
      } else {
        setView('AUTH');
      }
      setIsLoadingAuth(false);
    });
  }, []);

  // --- Actions ---

  const handleFinishOnboarding = async () => {
    const prefs: UserPreferences = {
      favoriteLeagues: selectedLeagues,
      favoriteTeams: selectedTeams,
      notifications: notifications
    };
    await storageService.savePreferences(prefs);
    setUserState(storageService.getUserState());
    setView('DASHBOARD');
  };

  const handleLogout = async () => {
    await storageService.logout();
    setView('AUTH');
  };

  // --- Sub-Components ---

  const AuthView = () => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleGoogleAuth = async () => {
        setLoading(true);
        setError('');
        try {
            await storageService.loginWithGoogle();
        } catch (err: any) {
            setError(err.message || 'Failed to login with Google');
            setLoading(false);
        }
    };

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        try {
            if (isSignUp) {
                await storageService.registerWithEmail(email, password);
            } else {
                await storageService.loginWithEmail(email, password);
            }
        } catch (err: any) {
            if (err.code === 'auth/invalid-credential') setError('Invalid email or password.');
            else if (err.code === 'auth/email-already-in-use') setError('Email already in use.');
            else if (err.code === 'auth/weak-password') setError('Password should be at least 6 characters.');
            else setError(err.message || 'Authentication failed');
            setLoading(false);
        }
    };

    if (isLoadingAuth) {
        return (
            <div className="flex justify-center pt-20">
                <Loader2 className="animate-spin text-orange-500" size={48} />
            </div>
        );
    }

    return (
      <div className="max-w-md mx-auto px-4 pt-8">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 md:p-8 shadow-xl border border-slate-100 dark:border-slate-800 transition-colors">
           <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldAlert size={32} />
           </div>
           <h2 className="text-2xl font-black text-slate-900 dark:text-white text-center mb-2">
             {isSignUp ? 'Join TrapWatch' : 'Sign in to TrapWatch'}
           </h2>
           <p className="text-slate-500 dark:text-slate-400 text-center mb-8">Get notified instantly when a trap is detected.</p>

           <button 
             onClick={handleGoogleAuth}
             disabled={loading}
             className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors mb-4 disabled:opacity-50"
           >
             {loading ? <Loader2 className="animate-spin" size={20} /> : (
                 <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
             )}
             Continue with Google
           </button>

           <div className="relative my-6">
             <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-800"></div></div>
             <div className="relative flex justify-center text-sm"><span className="px-2 bg-white dark:bg-slate-900 text-slate-400">Or continue with email</span></div>
           </div>

           <form onSubmit={handleEmailAuth}>
             {error && (
                 <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
                     <AlertCircle size={16} /> {error}
                 </div>
             )}
             <div className="space-y-4">
               <div>
                 <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Email</label>
                 <input 
                   type="email" 
                   value={email}
                   onChange={(e) => setEmail(e.target.value)}
                   className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white"
                   placeholder="name@example.com"
                   required
                 />
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Password</label>
                 <input 
                   type="password" 
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                   className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white"
                   placeholder="••••••••"
                   required
                   minLength={6}
                 />
               </div>
               <button 
                 type="submit" 
                 disabled={loading}
                 className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-3 px-6 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
               >
                 {loading && <Loader2 className="animate-spin" size={18} />}
                 {isSignUp ? 'Create Account' : 'Sign In'}
               </button>
             </div>
           </form>
           
           <p className="text-center text-sm text-slate-400 mt-6">
             {isSignUp ? "Already have an account?" : "Don't have an account?"}{' '}
             <button 
                type="button"
                onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
                className="text-orange-600 dark:text-orange-500 font-bold hover:underline"
             >
                {isSignUp ? "Sign In" : "Sign Up"}
             </button>
           </p>
        </div>
        <p className="text-center text-[10px] text-slate-400 mt-8 max-w-xs mx-auto">
            Note: You must configure the firebase.ts file with your own API keys for authentication to work.
        </p>
      </div>
    );
  };

  const LeagueSelectionView = () => {
    const toggleLeague = (l: League) => {
      if (selectedLeagues.includes(l)) {
        setSelectedLeagues(selectedLeagues.filter(i => i !== l));
      } else {
        setSelectedLeagues([...selectedLeagues, l]);
      }
    };

    return (
      <div className="max-w-md mx-auto px-4 pt-6 pb-20">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">What do you follow?</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6">Select your favorite leagues to customize your feed.</p>
        
        <div className="grid grid-cols-2 gap-3">
          {Object.values(League).map(league => {
             const isSelected = selectedLeagues.includes(league);
             return (
               <button 
                 key={league}
                 onClick={() => toggleLeague(league)}
                 className={`p-4 rounded-xl border-2 text-left transition-all ${isSelected ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'}`}
               >
                 <span className={`text-lg font-black ${isSelected ? 'text-orange-600 dark:text-orange-500' : 'text-slate-400 dark:text-slate-500'}`}>{league}</span>
                 {isSelected && <div className="float-right text-orange-500"><Check size={20} /></div>}
               </button>
             )
          })}
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-10">
          <div className="max-w-md mx-auto flex justify-end">
            <button 
              onClick={() => setView('ONBOARDING_TEAMS')}
              disabled={selectedLeagues.length === 0}
              className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-3 px-6 rounded-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const TeamSelectionView = () => {
    const [search, setSearch] = useState('');
    
    // Filter teams based on selected leagues AND search
    const availableTeams = Object.entries(ALL_TEAMS).filter(([key, team]) => {
      const searchMatch = search === '' || 
        team.name.toLowerCase().includes(search.toLowerCase()) || 
        team.shortName.toLowerCase().includes(search.toLowerCase());
      
      return searchMatch;
    });

    const toggleTeam = (key: string) => {
      if (selectedTeams.includes(key)) setSelectedTeams(selectedTeams.filter(k => k !== key));
      else setSelectedTeams([...selectedTeams, key]);
    };

    return (
      <div className="max-w-md mx-auto px-4 pt-6 pb-20">
        <button onClick={() => setView('ONBOARDING_LEAGUES')} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 mb-4 flex items-center gap-1 text-sm font-bold">
            <ArrowLeft size={16}/> Back
        </button>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Pick your squads</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6">We'll highlight traps involving your teams.</p>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-3 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search teams..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white"
          />
        </div>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto no-scrollbar">
          {availableTeams.map(([key, team]) => {
            const isSelected = selectedTeams.includes(key);
            return (
              <button 
                key={key}
                onClick={() => toggleTeam(key)}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-colors ${isSelected ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
              >
                <div className="flex items-center gap-3">
                   <img src={team.logoUrl} alt="" className="w-8 h-8 object-contain" />
                   <span className={`font-bold ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>{team.name}</span>
                </div>
                {isSelected && <div className="text-orange-500"><Check size={20} /></div>}
              </button>
            )
          })}
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-10">
          <div className="max-w-md mx-auto flex justify-end">
            <button 
              onClick={() => setView('ONBOARDING_PREFS')}
              className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-3 px-6 rounded-xl flex items-center gap-2"
            >
              Next <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const PrefsView = () => {
    return (
      <div className="max-w-md mx-auto px-4 pt-6 pb-20">
        <button onClick={() => setView('ONBOARDING_TEAMS')} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 mb-4 flex items-center gap-1 text-sm font-bold">
            <ArrowLeft size={16}/> Back
        </button>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Stay in the loop</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8">How should we reach you?</p>

        <div className="space-y-6">
          {/* My Teams */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4">Notify me for my teams</h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-medium">
                  <Mail size={18} /> Email Alerts
                </div>
                <input 
                  type="checkbox" 
                  checked={notifications.myTeams.email} 
                  onChange={(e) => setNotifications({...notifications, myTeams: {...notifications.myTeams, email: e.target.checked}})}
                  className="w-5 h-5 accent-orange-500" 
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-medium">
                  <Smartphone size={18} /> SMS Alerts
                </div>
                <input 
                  type="checkbox" 
                  checked={notifications.myTeams.sms} 
                  onChange={(e) => setNotifications({...notifications, myTeams: {...notifications.myTeams, sms: e.target.checked}})}
                  className="w-5 h-5 accent-orange-500" 
                />
              </label>
            </div>
          </div>

          {/* Any Trap */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4">Notify me for ANY Trap Update</h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-medium">
                  <Mail size={18} /> Email Alerts
                </div>
                <input 
                  type="checkbox" 
                  checked={notifications.anyTrap.email} 
                  onChange={(e) => setNotifications({...notifications, anyTrap: {...notifications.anyTrap, email: e.target.checked}})}
                  className="w-5 h-5 accent-orange-500" 
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-medium">
                  <Smartphone size={18} /> SMS Alerts
                </div>
                <input 
                  type="checkbox" 
                  checked={notifications.anyTrap.sms} 
                  onChange={(e) => setNotifications({...notifications, anyTrap: {...notifications.anyTrap, sms: e.target.checked}})}
                  className="w-5 h-5 accent-orange-500" 
                />
              </label>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Email Address</label>
              <input 
                type="email" 
                value={notifications.contactEmail} 
                onChange={(e) => setNotifications({...notifications, contactEmail: e.target.value})}
                placeholder="name@example.com"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 outline-none text-slate-900 dark:text-white"
              />
            </div>
            {(notifications.myTeams.sms || notifications.anyTrap.sms) && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Phone Number</label>
                <input 
                  type="tel" 
                  value={notifications.contactPhone} 
                  onChange={(e) => setNotifications({...notifications, contactPhone: e.target.value})}
                  placeholder="(555) 555-5555"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 outline-none text-slate-900 dark:text-white"
                />
              </div>
            )}
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-10">
          <div className="max-w-md mx-auto flex justify-end">
            <button 
              onClick={handleFinishOnboarding}
              className="w-full bg-orange-600 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-orange-200 dark:shadow-none hover:bg-orange-700 transition-all"
            >
              Finish Setup <Check size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const DashboardView = () => {
    return (
      <div className="max-w-md mx-auto px-4 pt-6">
        <div className="flex items-center justify-between mb-8">
           <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 text-lg uppercase">
               {userState.user?.name.charAt(0)}
             </div>
             <div>
               <p className="font-bold text-slate-900 dark:text-white text-lg">{userState.user?.name}</p>
               <p className="text-xs text-slate-500 dark:text-slate-400">{userState.user?.email}</p>
             </div>
           </div>
           <button onClick={handleLogout} className="text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-lg border border-red-100 dark:border-red-900/30">
             Sign Out
           </button>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden mb-6">
          <div className="bg-slate-50 dark:bg-slate-800 p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white">My Teams</h3>
            <button onClick={() => setView('ONBOARDING_TEAMS')} className="text-xs font-bold text-orange-600 dark:text-orange-500">Edit</button>
          </div>
          <div className="p-4">
             {(!userState.preferences?.favoriteTeams || userState.preferences.favoriteTeams.length === 0) ? (
               <p className="text-slate-400 text-sm">No teams selected.</p>
             ) : (
               <div className="flex flex-wrap gap-2">
                 {userState.preferences?.favoriteTeams.map(id => {
                   const team = ALL_TEAMS[id];
                   return team ? (
                     <span key={id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold">
                       <img src={team.logoUrl} alt="" className="w-4 h-4 object-contain"/> {team.shortName}
                     </span>
                   ) : null
                 })}
               </div>
             )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden mb-6">
          <div className="bg-slate-50 dark:bg-slate-800 p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white">Notification Settings</h3>
            <button onClick={() => setView('ONBOARDING_PREFS')} className="text-xs font-bold text-orange-600 dark:text-orange-500">Edit</button>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">My Teams Alerts</span>
              <div className="flex gap-2">
                 <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${userState.preferences?.notifications.myTeams.email ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}>Email</span>
                 <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${userState.preferences?.notifications.myTeams.sms ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}>SMS</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Any Trap Updates</span>
              <div className="flex gap-2">
                 <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${userState.preferences?.notifications.anyTrap.email ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}>Email</span>
                 <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${userState.preferences?.notifications.anyTrap.sms ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}>SMS</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-xl p-4 flex gap-3">
          <Bell className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <div>
            <h4 className="font-bold text-blue-900 dark:text-blue-100 text-sm">You're all set!</h4>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">We'll alert you based on your preferences above.</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-100 dark:from-slate-900 dark:to-[#020617] pb-10 transition-colors duration-200">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 transition-colors duration-200">
        <div className="px-4 h-14 flex items-center justify-center max-w-md mx-auto relative">
          {view === 'DASHBOARD' && (
            <button 
              onClick={() => navigate('/')}
              className="absolute left-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              <Home size={20} />
            </button>
          )}
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">
            {view === 'AUTH' ? (isLoadingAuth ? 'Loading...' : 'Sign In') : view === 'DASHBOARD' ? 'Alerts' : 'Setup Alerts'}
          </h1>
          <button 
                onClick={() => navigate('/scoreboard')}
                className="absolute right-4 text-slate-400 hover:text-orange-600 dark:hover:text-orange-500 p-1 transition-colors"
                aria-label="Scoreboard"
             >
                <Trophy size={20} />
          </button>
        </div>
      </div>

      {/* View Content */}
      <div className="animate-in fade-in duration-300">
        {view === 'AUTH' && <AuthView />}
        {view === 'ONBOARDING_LEAGUES' && <LeagueSelectionView />}
        {view === 'ONBOARDING_TEAMS' && <TeamSelectionView />}
        {view === 'ONBOARDING_PREFS' && <PrefsView />}
        {view === 'DASHBOARD' && <DashboardView />}
      </div>
    </div>
  );
};

export default Alerts;