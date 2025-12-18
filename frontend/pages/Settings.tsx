import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Moon, Sun, Bell, Shield, LogOut, ChevronRight, Check, Search, ChevronDown, ChevronUp, Loader2, AlertCircle } from 'lucide-react';
import { storageService } from '../services/storage';
import { ALL_TEAMS } from '../data/teams';
import { UserPreferences } from '../types';

const Settings: React.FC = () => {
    const navigate = useNavigate();
    const [userState, setUserState] = useState(storageService.getUserState());
    const [theme, setTheme] = useState<'light' | 'dark'>(storageService.getTheme());
    const [notifications, setNotifications] = useState(userState.preferences?.notifications || {
        myTeams: { email: true, sms: false },
        anyTrap: { email: false, sms: false },
        contactEmail: userState.user?.email || '',
        contactPhone: ''
    });
    const [myTeams, setMyTeams] = useState<string[]>(userState.preferences?.favoriteTeams || []);
    
    // UI State
    const [isTeamsOpen, setIsTeamsOpen] = useState(false);
    const [teamSearch, setTeamSearch] = useState('');
    const [isEmailOpen, setIsEmailOpen] = useState(false);
    const [isPassOpen, setIsPassOpen] = useState(false);
    
    // Form State
    const [newEmail, setNewEmail] = useState('');
    const [newPass, setNewPass] = useState('');
    const [updateStatus, setUpdateStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [statusMsg, setStatusMsg] = useState('');

    useEffect(() => {
        if (!userState.isAuthenticated) {
            navigate('/alerts');
        }
    }, [userState.isAuthenticated, navigate]);

    // Theme Toggle
    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        storageService.setTheme(newTheme);
        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    // Save Prefs Wrapper
    const updatePreferences = async (updatedNotifs = notifications, updatedTeams = myTeams) => {
        // Optimistic UI update
        const newPrefs: UserPreferences = {
            favoriteLeagues: userState.preferences?.favoriteLeagues || [],
            favoriteTeams: updatedTeams,
            notifications: updatedNotifs
        };
        await storageService.savePreferences(newPrefs);
        // Sync local state with storage response
        setUserState(storageService.getUserState());
    };

    // Handlers
    const toggleTeam = (teamId: string) => {
        const newTeams = myTeams.includes(teamId) 
            ? myTeams.filter(id => id !== teamId)
            : [...myTeams, teamId];
        setMyTeams(newTeams);
        updatePreferences(notifications, newTeams);
    };

    const handleNotifChange = (section: 'myTeams' | 'anyTrap', type: 'email' | 'sms', value: boolean) => {
        const newNotifs = {
            ...notifications,
            [section]: {
                ...notifications[section],
                [type]: value
            }
        };
        setNotifications(newNotifs);
        updatePreferences(newNotifs, myTeams);
    };

    const handleContactChange = (field: 'contactEmail' | 'contactPhone', value: string) => {
        const newNotifs = { ...notifications, [field]: value };
        setNotifications(newNotifs);
        // Debounce actual save in production, direct save here for mock
        updatePreferences(newNotifs, myTeams);
    };

    const handleUpdateAccount = async (e: React.FormEvent, type: 'EMAIL' | 'PASS') => {
        e.preventDefault();
        setUpdateStatus('LOADING');
        setStatusMsg('');
        
        try {
            if (type === 'EMAIL') {
                await storageService.updateAccount({ email: newEmail });
                setNewEmail('');
                setIsEmailOpen(false);
            } else {
                await storageService.updateAccount({ password: newPass });
                setNewPass('');
                setIsPassOpen(false);
            }
            setUpdateStatus('SUCCESS');
            setStatusMsg('Account updated successfully');
            setUserState(storageService.getUserState());
            setTimeout(() => setUpdateStatus('IDLE'), 3000);
        } catch (err: any) {
            setUpdateStatus('ERROR');
            setStatusMsg(err.message || 'Update failed');
        }
    };

    const handleLogout = async () => {
        await storageService.logout();
        navigate('/');
    };

    // Filter available teams
    const availableTeams = Object.entries(ALL_TEAMS).filter(([key, team]) => {
        return teamSearch === '' || 
            team.name.toLowerCase().includes(teamSearch.toLowerCase()) || 
            team.shortName.toLowerCase().includes(teamSearch.toLowerCase());
    });

    return (
        <div className="min-h-screen bg-gradient-to-b from-white to-slate-100 dark:from-slate-900 dark:to-[#020617] pb-20 transition-colors duration-200">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
                <div className="px-4 h-14 flex items-center gap-4 max-w-md mx-auto">
                    <button onClick={() => navigate('/')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-600 dark:text-slate-300">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-lg font-bold text-slate-900 dark:text-white">Settings</h1>
                </div>
            </div>

            <div className="max-w-md mx-auto px-4 py-6 space-y-6">
                
                {/* Profile Card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-xl font-bold text-slate-500 dark:text-slate-400">
                        {userState.user?.name.charAt(0)}
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">{userState.user?.name}</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{userState.user?.email}</p>
                    </div>
                </div>

                {/* Status Message */}
                {updateStatus !== 'IDLE' && (
                    <div className={`p-3 rounded-xl flex items-center gap-2 text-sm font-bold ${updateStatus === 'SUCCESS' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {updateStatus === 'LOADING' ? <Loader2 size={16} className="animate-spin" /> : 
                         updateStatus === 'SUCCESS' ? <Check size={16} /> : <AlertCircle size={16} />}
                        {statusMsg || 'Processing...'}
                    </div>
                )}

                {/* Appearance */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Appearance</h3>
                    </div>
                    <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {theme === 'light' ? <Sun size={20} className="text-orange-500" /> : <Moon size={20} className="text-blue-400" />}
                            <span className="font-bold text-slate-700 dark:text-slate-200">Dark Mode</span>
                        </div>
                        <button 
                            onClick={toggleTheme}
                            className={`w-12 h-6 rounded-full transition-colors relative ${theme === 'dark' ? 'bg-blue-600' : 'bg-slate-200'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${theme === 'dark' ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>
                </div>

                {/* Notifications */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                        <Bell size={16} className="text-slate-400" />
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Notifications</h3>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        <div className="p-4 flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">My Teams Alerts</span>
                            <div className="flex gap-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <span className="text-xs font-medium text-slate-500">Email</span>
                                    <input type="checkbox" checked={notifications.myTeams.email} onChange={(e) => handleNotifChange('myTeams', 'email', e.target.checked)} className="accent-orange-500 w-4 h-4" />
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <span className="text-xs font-medium text-slate-500">SMS</span>
                                    <input type="checkbox" checked={notifications.myTeams.sms} onChange={(e) => handleNotifChange('myTeams', 'sms', e.target.checked)} className="accent-orange-500 w-4 h-4" />
                                </label>
                            </div>
                        </div>
                        <div className="p-4 flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Any Trap Updates</span>
                            <div className="flex gap-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <span className="text-xs font-medium text-slate-500">Email</span>
                                    <input type="checkbox" checked={notifications.anyTrap.email} onChange={(e) => handleNotifChange('anyTrap', 'email', e.target.checked)} className="accent-orange-500 w-4 h-4" />
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <span className="text-xs font-medium text-slate-500">SMS</span>
                                    <input type="checkbox" checked={notifications.anyTrap.sms} onChange={(e) => handleNotifChange('anyTrap', 'sms', e.target.checked)} className="accent-orange-500 w-4 h-4" />
                                </label>
                            </div>
                        </div>
                        <div className="p-4 space-y-3 bg-slate-50 dark:bg-slate-950/30">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Contact Email</label>
                                <input 
                                    type="email" 
                                    value={notifications.contactEmail} 
                                    onChange={(e) => handleContactChange('contactEmail', e.target.value)}
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-orange-500 text-slate-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Contact Phone (SMS)</label>
                                <input 
                                    type="tel" 
                                    value={notifications.contactPhone} 
                                    onChange={(e) => handleContactChange('contactPhone', e.target.value)}
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-orange-500 text-slate-900 dark:text-white"
                                    placeholder="+1 (555) 000-0000"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* My Teams */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div 
                        onClick={() => setIsTeamsOpen(!isTeamsOpen)}
                        className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                             <Shield size={16} className="text-slate-400" />
                             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">My Teams</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">{myTeams.length} Selected</span>
                            {isTeamsOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                        </div>
                    </div>
                    
                    {isTeamsOpen && (
                        <div className="p-4 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2">
                             <div className="relative mb-3">
                                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                <input 
                                    type="text"
                                    placeholder="Search teams..."
                                    value={teamSearch}
                                    onChange={(e) => setTeamSearch(e.target.value)}
                                    className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-lg pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
                                />
                             </div>
                             <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                                {availableTeams.map(([key, team]) => {
                                    const isSelected = myTeams.includes(key);
                                    return (
                                        <button 
                                            key={key}
                                            onClick={() => toggleTeam(key)}
                                            className={`w-full flex items-center justify-between p-2.5 rounded-lg text-sm transition-colors ${isSelected ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <img src={team.logoUrl} alt="" className="w-6 h-6 object-contain" />
                                                <span className="font-bold">{team.name}</span>
                                            </div>
                                            {isSelected && <Check size={16} />}
                                        </button>
                                    )
                                })}
                             </div>
                        </div>
                    )}
                </div>

                {/* Account Settings */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Account Security</h3>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        
                        {/* Change Email */}
                        <div>
                            <button 
                                onClick={() => setIsEmailOpen(!isEmailOpen)}
                                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Change Email</span>
                                <ChevronRight size={16} className={`text-slate-400 transition-transform ${isEmailOpen ? 'rotate-90' : ''}`} />
                            </button>
                            {isEmailOpen && (
                                <form onSubmit={(e) => handleUpdateAccount(e, 'EMAIL')} className="p-4 bg-slate-50 dark:bg-slate-950/30">
                                    <input 
                                        type="email" 
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                        placeholder="New Email Address"
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 mb-3 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
                                        required
                                    />
                                    <button 
                                        type="submit" 
                                        disabled={updateStatus === 'LOADING'}
                                        className="w-full bg-slate-900 dark:bg-slate-700 text-white font-bold py-2 rounded-lg text-sm hover:opacity-90 transition-opacity"
                                    >
                                        Update Email
                                    </button>
                                </form>
                            )}
                        </div>

                        {/* Change Password */}
                        <div>
                            <button 
                                onClick={() => setIsPassOpen(!isPassOpen)}
                                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Change Password</span>
                                <ChevronRight size={16} className={`text-slate-400 transition-transform ${isPassOpen ? 'rotate-90' : ''}`} />
                            </button>
                            {isPassOpen && (
                                <form onSubmit={(e) => handleUpdateAccount(e, 'PASS')} className="p-4 bg-slate-50 dark:bg-slate-950/30">
                                    <input 
                                        type="password" 
                                        value={newPass}
                                        onChange={(e) => setNewPass(e.target.value)}
                                        placeholder="New Password (min 6 chars)"
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 mb-3 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
                                        required
                                        minLength={6}
                                    />
                                    <button 
                                        type="submit" 
                                        disabled={updateStatus === 'LOADING'}
                                        className="w-full bg-slate-900 dark:bg-slate-700 text-white font-bold py-2 rounded-lg text-sm hover:opacity-90 transition-opacity"
                                    >
                                        Update Password
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>

                {/* Logout */}
                <button 
                    onClick={handleLogout}
                    className="w-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                >
                    <LogOut size={20} /> Sign Out
                </button>

            </div>
        </div>
    );
};

export default Settings;
