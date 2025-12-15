import { Comment, UserState, UserPreferences, Vote, LeaderboardEntry } from '../types';
import { MOCK_GAMES, ALL_GAMES } from '../constants';

// Mock constants for local storage persistence
const SESSION_KEY = 'trapwatch_session';
const USERS_KEY = 'trapwatch_users';
const PREFS_KEY_PREFIX = 'trapwatch_prefs_';

const COMMENTS_KEY = 'trapwatch_comments';
const VOTES_KEY = 'trapwatch_votes';
const FOLLOWING_KEY = 'trapwatch_following';
const USER_KEY = 'trapwatch_user';
const THEME_KEY = 'trapwatch_theme';
const LEADERBOARD_CACHE_KEY = 'trapwatch_leaderboard_mock_v2'; 
const GUEST_ID_KEY = 'trapwatch_guest_id';

type CommentListener = (gameId: string, comment: Comment) => void;
type ChangeListener = () => void;

let commentListeners: CommentListener[] = [];
let changeListeners: ChangeListener[] = [];

// Helper to find and update a comment in a tree
const findAndUpdate = (comments: Comment[], targetId: string, updateFn: (c: Comment) => Comment): Comment[] => {
  return comments.map(c => {
    if (c.id === targetId) {
      return updateFn(c);
    }
    if (c.replies && c.replies.length > 0) {
      return { ...c, replies: findAndUpdate(c.replies, targetId, updateFn) };
    }
    return c;
  });
};

const getGuestId = () => {
    let id = localStorage.getItem(GUEST_ID_KEY);
    if (!id) {
        id = 'guest-' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem(GUEST_ID_KEY, id);
    }
    return id;
};

// Generate Random Bots for Leaderboard
const generateMockLeaderboard = () => {
    const existing = localStorage.getItem(LEADERBOARD_CACHE_KEY);
    if (existing) return;

    const bots = [
        { uid: 'bot1', name: 'SharpShooter99', avatar: 'bg-green-500' },
        { uid: 'bot2', name: 'VegasFade', avatar: 'bg-purple-500' },
        { uid: 'bot3', name: 'TrapQueen', avatar: 'bg-pink-500' },
        { uid: 'bot4', name: 'ContraKing', avatar: 'bg-blue-500' },
        { uid: 'bot5', name: 'FadeThePublic', avatar: 'bg-red-500' },
        { uid: 'bot6', name: 'LineWatcher', avatar: 'bg-yellow-500' },
        { uid: 'bot7', name: 'SmartMoney', avatar: 'bg-indigo-500' },
        { uid: 'bot8', name: 'CapGod', avatar: 'bg-orange-500' },
        { uid: 'bot9', name: 'DogHunter', avatar: 'bg-teal-500' },
        { uid: 'bot10', name: 'SpreadShredder', avatar: 'bg-rose-500' },
        { uid: 'bot11', name: 'ParlayPrince', avatar: 'bg-cyan-500' },
        { uid: 'bot12', name: 'LockSmith', avatar: 'bg-slate-500' },
        { uid: 'bot13', name: 'TrendSetter', avatar: 'bg-lime-500' },
        { uid: 'bot14', name: 'BookieBreaker', avatar: 'bg-violet-500' },
        { uid: 'bot15', name: 'VarianceKing', avatar: 'bg-fuchsia-500' },
    ];

    const allVotes: Record<string, Vote[]> = {};

    bots.forEach(bot => {
        const votes: Vote[] = [];
        // Generate random votes for historical games + some finished mock games
        ALL_GAMES.forEach(game => {
             // To make charts interesting, bots vote on everything, but we timestamp them logically
             // Assign a "skill level" to bots to create spread in leaderboard
             const skill = Math.random(); 
             const winRate = 0.3 + (skill * 0.5); // 30% to 80% win rate
             
             // If game has outcome, use winrate. If upcoming, random preference based on severity
             let selection: 'TRAP' | 'NOT_TRAP';
             
             if (game.finalOutcome) {
                 const isCorrect = Math.random() < winRate;
                 selection = isCorrect ? game.finalOutcome : (game.finalOutcome === 'TRAP' ? 'NOT_TRAP' : 'TRAP');
             } else {
                 // High severity = more bots think it's a trap
                 const trapProb = (game.severityScore || 50) / 100;
                 selection = Math.random() < trapProb ? 'TRAP' : 'NOT_TRAP';
             }

             votes.push({
                 id: Math.random().toString(),
                 gameId: game.id,
                 selection,
                 timestamp: new Date(game.startTime).getTime() - (1000 * 60 * 60 * (1 + Math.random() * 20)), 
                 isLocked: true,
                 isCorrect: game.finalOutcome ? (selection === game.finalOutcome) : undefined,
                 counted: true 
             });
        });
        allVotes[bot.uid] = votes;
    });
    
    localStorage.setItem(LEADERBOARD_CACHE_KEY, JSON.stringify({ bots, votes: allVotes }));
};

// Run once
generateMockLeaderboard();


export const storageService = {
  // --- Auth Methods (Mock Implementation via LocalStorage) ---

  initAuthListener: (callback: (user: UserState) => void) => {
    const checkAuth = () => {
        try {
            const session = localStorage.getItem(SESSION_KEY);
            if (session) {
                const user = JSON.parse(session);
                // Load preferences
                const prefsStr = localStorage.getItem(PREFS_KEY_PREFIX + user.uid);
                const prefs = prefsStr ? JSON.parse(prefsStr) : undefined;
                
                // Load user votes
                const allVotes = JSON.parse(localStorage.getItem(VOTES_KEY) || '{}');
                const myVotes = allVotes[user.uid] || {};

                // Load following
                const allFollowing = JSON.parse(localStorage.getItem(FOLLOWING_KEY) || '{}');
                const myFollowing = allFollowing[user.uid] || [];

                const newState: UserState = {
                    isAuthenticated: true,
                    user: {
                        uid: user.uid,
                        name: user.displayName || user.email?.split('@')[0] || 'User',
                        email: user.email || '',
                    },
                    votes: myVotes,
                    following: myFollowing,
                    preferences: prefs
                };
                
                // Sync with global user key for other components
                localStorage.setItem(USER_KEY, JSON.stringify(newState));
                callback(newState);
            } else {
                // Load guest votes
                const guestId = getGuestId();
                const allVotes = JSON.parse(localStorage.getItem(VOTES_KEY) || '{}');
                const guestVotes = allVotes[guestId] || {};

                const newState: UserState = { isAuthenticated: false, votes: guestVotes, following: [] };
                localStorage.setItem(USER_KEY, JSON.stringify(newState));
                callback(newState);
            }
        } catch (e) {
            console.error("Auth check failed", e);
            callback({ isAuthenticated: false, votes: {}, following: [] });
        }
    };

    // Check immediately
    checkAuth();

    // Listen for storage changes (to support multi-tab or login updates)
    const handleStorageChange = (e: StorageEvent) => {
        if (e.key === SESSION_KEY || (e.key && e.key.startsWith(PREFS_KEY_PREFIX)) || e.key === FOLLOWING_KEY) {
            checkAuth();
        }
    };
    window.addEventListener('storage', handleStorageChange);

    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key: string, value: string) {
        originalSetItem.call(this, key, value);
        if (key === SESSION_KEY || key.startsWith(PREFS_KEY_PREFIX) || key === FOLLOWING_KEY) {
            checkAuth();
        }
    };
    
    const originalRemoveItem = localStorage.removeItem;
    localStorage.removeItem = function(key: string) {
        originalRemoveItem.call(this, key);
        if (key === SESSION_KEY) {
            checkAuth();
        }
    };
  },

  loginWithGoogle: async () => {
    await new Promise(resolve => setTimeout(resolve, 800));
    const mockUser = {
        uid: 'google-user-' + Date.now(),
        email: 'demo@gmail.com',
        displayName: 'Demo User',
        emailVerified: true
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(mockUser));
    return storageService.getUserState();
  },

  registerWithEmail: async (email: string, pass: string) => {
    await new Promise(resolve => setTimeout(resolve, 800));
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
    if (users[email]) {
        throw { code: 'auth/email-already-in-use', message: 'Email already in use.' };
    }
    const newUser = {
        uid: 'user-' + Date.now(),
        email,
        displayName: email.split('@')[0],
        createdAt: new Date().toISOString()
    };
    users[email] = { ...newUser, password: pass };
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    localStorage.setItem(SESSION_KEY, JSON.stringify(newUser));
    return storageService.getUserState();
  },

  loginWithEmail: async (email: string, pass: string) => {
    await new Promise(resolve => setTimeout(resolve, 800));
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
    const user = users[email];
    if (!user || user.password !== pass) {
        throw { code: 'auth/invalid-credential', message: 'Invalid credentials.' };
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...safeUser } = user;
    localStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
    return storageService.getUserState();
  },

  updateAccount: async (data: { email?: string; password?: string }) => {
    await new Promise(resolve => setTimeout(resolve, 800));
    const session = localStorage.getItem(SESSION_KEY);
    if (!session) throw new Error("Not authenticated");
    
    let currentUser = JSON.parse(session);
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
    
    // Find the record in 'users' db using current email (since we use email as key in this mock)
    // In a real app, use UID.
    let oldEmail = currentUser.email;
    let userRecord = users[oldEmail];
    
    if (!userRecord && currentUser.uid.startsWith('google')) {
         // Google users don't have passwords in this mock DB usually, can't change password easily
         if (data.password) throw new Error("Cannot change password for Google accounts.");
    }
    
    if (data.email) {
        if (users[data.email]) throw new Error("Email already in use.");
        
        currentUser.email = data.email;
        currentUser.displayName = data.email.split('@')[0];
        
        // Update DB Record if exists
        if (userRecord) {
            delete users[oldEmail];
            users[data.email] = { ...userRecord, email: data.email };
        }
    }
    
    if (data.password && userRecord) {
        // Re-fetch record in case key changed above
        users[data.email || oldEmail].password = data.password;
    }
    
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
    
    // Trigger update
    storageService.getUserState();
  },

  logout: async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
    localStorage.removeItem(SESSION_KEY);
    // Reset to guest state
    const guestId = getGuestId();
    const allVotes = JSON.parse(localStorage.getItem(VOTES_KEY) || '{}');
    const guestVotes = allVotes[guestId] || {};
    const newState: UserState = { isAuthenticated: false, votes: guestVotes, following: [] };
    localStorage.setItem(USER_KEY, JSON.stringify(newState));
  },

  getUserState: (): UserState => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) { console.error(e); }
    return { isAuthenticated: false, votes: {}, following: [] };
  },

  isAuthenticated: (): boolean => {
    return storageService.getUserState().isAuthenticated;
  },

  savePreferences: async (prefs: UserPreferences) => {
    const state = storageService.getUserState();
    const newState: UserState = { ...state, preferences: prefs };
    localStorage.setItem(USER_KEY, JSON.stringify(newState));
    const sessionStr = localStorage.getItem(SESSION_KEY);
    if (sessionStr) {
        const user = JSON.parse(sessionStr);
        localStorage.setItem(PREFS_KEY_PREFIX + user.uid, JSON.stringify(prefs));
    }
    return newState;
  },

  // --- Follow System ---
  
  toggleFollow: (targetUid: string) => {
    const state = storageService.getUserState();
    if (!state.isAuthenticated || !state.user) return;
    
    const myUid = state.user.uid;
    const allFollowing = JSON.parse(localStorage.getItem(FOLLOWING_KEY) || '{}');
    let myList = allFollowing[myUid] || [];
    
    if (myList.includes(targetUid)) {
        myList = myList.filter((id: string) => id !== targetUid);
    } else {
        myList.push(targetUid);
    }
    
    allFollowing[myUid] = myList;
    localStorage.setItem(FOLLOWING_KEY, JSON.stringify(allFollowing));
    
    // Update local user state immediately
    const newState = { ...state, following: myList };
    localStorage.setItem(USER_KEY, JSON.stringify(newState));
    
    storageService.notifyChangeListeners();
  },

  isFollowing: (targetUid: string) => {
      const state = storageService.getUserState();
      return state.following.includes(targetUid);
  },

  // --- Voting & Leaderboard ---

  getVote: (gameId: string): Vote | null => {
    const state = storageService.getUserState();
    if (state.votes && state.votes[gameId]) {
        return state.votes[gameId];
    }
    return null;
  },

  setVote: (gameId: string, selection: 'TRAP' | 'NOT_TRAP') => {
    const state = storageService.getUserState();
    
    const allVotes = JSON.parse(localStorage.getItem(VOTES_KEY) || '{}');
    const uid = state.user?.uid || getGuestId();
    const userVotes = allVotes[uid] || {};

    const game = ALL_GAMES.find(g => g.id === gameId);
    if (!game) return;

    // Check if game is locked (started)
    const now = Date.now();
    const startTime = new Date(game.startTime).getTime();
    if (now > startTime) return; // Cannot vote after start

    const vote: Vote = {
        id: Math.random().toString(),
        gameId,
        selection,
        timestamp: now,
        isLocked: false // Will be computed as true in leaderboards based on time
    };

    userVotes[gameId] = vote;
    allVotes[uid] = userVotes;
    localStorage.setItem(VOTES_KEY, JSON.stringify(allVotes));
    
    // Update local state
    const newState = { ...state, votes: userVotes };
    localStorage.setItem(USER_KEY, JSON.stringify(newState));
    
    storageService.notifyChangeListeners();
  },

  getGameStats: (gameId: string) => {
    // Get bot votes
    const mockData = JSON.parse(localStorage.getItem(LEADERBOARD_CACHE_KEY) || '{ "bots": [], "votes": {} }');
    // Get real votes
    const allUserVotes = JSON.parse(localStorage.getItem(VOTES_KEY) || '{}');

    let trapCount = 0;
    let notTrapCount = 0;

    // Helper to count
    const countVotes = (votesMap: Record<string, Vote[]>) => {
        Object.values(votesMap).forEach(votes => {
            if (!Array.isArray(votes)) {
                // Handle case where real user votes are stored as { gameId: Vote } object map
                const vote = (votes as any)[gameId];
                if (vote) {
                    if (vote.selection === 'TRAP') trapCount++;
                    else notTrapCount++;
                }
            } else {
                 // Handle bot votes (arrays)
                 const vote = votes.find(v => v.gameId === gameId);
                 if (vote) {
                    if (vote.selection === 'TRAP') trapCount++;
                    else notTrapCount++;
                }
            }
        });
    };

    countVotes(mockData.votes);
    countVotes(allUserVotes);

    // If counts are zero (rare edge case or new ID), provide seeded data based on severity
    if (trapCount + notTrapCount === 0) {
        const game = ALL_GAMES.find(g => g.id === gameId);
        if (game) {
             const baseSeed = 50 + (game.id.charCodeAt(0) * 5); // Deterministic seed
             const trapRatio = game.severityScore / 100;
             trapCount = Math.floor(baseSeed * trapRatio);
             notTrapCount = baseSeed - trapCount;
        }
    }

    return { trap: trapCount, not: notTrapCount };
  },

  getLeaderboard: (window: 'TODAY' | 'WEEK' | 'ALL_TIME' = 'WEEK', onlyFollowing = false): LeaderboardEntry[] => {
    const mockData = JSON.parse(localStorage.getItem(LEADERBOARD_CACHE_KEY) || '{ "bots": [], "votes": {} }');
    const allUserVotesRaw = JSON.parse(localStorage.getItem(VOTES_KEY) || '{}');
    const state = storageService.getUserState();
    
    // Combine real users and bots
    const allUsers = [...mockData.bots];
    if (state.user) {
        allUsers.push({ uid: state.user.uid, name: state.user.name, avatar: 'bg-orange-500' });
    }

    // Combine votes
    const combinedVotesData = { ...mockData.votes, ...allUserVotesRaw };
    // Need to convert object-map votes to array for real user
    if (state.user) {
        combinedVotesData[state.user.uid] = Object.values(state.votes);
    }

    const leaderboard: LeaderboardEntry[] = [];
    const now = Date.now();
    const windowStart = window === 'TODAY' ? new Date().setHours(0,0,0,0) :
                        window === 'WEEK' ? now - (7 * 24 * 60 * 60 * 1000) : 0;

    allUsers.forEach(user => {
        if (onlyFollowing && state.user && user.uid !== state.user.uid && !state.following.includes(user.uid)) {
            return;
        }

        const rawVotes: Vote[] = combinedVotesData[user.uid] || [];
        
        // 1. Filter by Window & Lock Status
        
        const validVotes = (Array.isArray(rawVotes) ? rawVotes : Object.values(rawVotes)).filter((v: Vote) => {
            if (v.timestamp < windowStart) return false;
            
            // Check if game is actually finished/locked
            const game = ALL_GAMES.find(g => g.id === v.gameId);
            if (!game) return false;
            
            // If it's a bot vote, it's pre-calculated. If real user, check time.
            if (v.isLocked) return true;
            return new Date(game.startTime).getTime() < now;
        }).sort((a: Vote, b: Vote) => a.timestamp - b.timestamp);

        // 2. Apply Daily Cap (3 counted votes per day)
        const votesByDay: Record<string, Vote[]> = {};
        validVotes.forEach((v: Vote) => {
            const day = new Date(v.timestamp).toDateString();
            if (!votesByDay[day]) votesByDay[day] = [];
            votesByDay[day].push(v);
        });

        let totalCounted = 0;
        let correctCount = 0;
        let streak = 0;
        let currentStreak = 0;

        // Flatten back to sorted array to calculate streaks properly
        const countedVotes: Vote[] = [];

        Object.values(votesByDay).forEach(dayVotes => {
            // Sort by time within day
            dayVotes.sort((a, b) => a.timestamp - b.timestamp);
            // Take first 3
            dayVotes.slice(0, 3).forEach(v => {
                countedVotes.push(v);
            });
        });

        // Sort all counted votes by time for streak calc
        countedVotes.sort((a, b) => a.timestamp - b.timestamp);

        countedVotes.forEach(v => {
            totalCounted++;
            
            // Determine correctness
            let isCorrect = v.isCorrect;
            if (isCorrect === undefined) {
                const game = ALL_GAMES.find(g => g.id === v.gameId);
                if (game && game.finalOutcome) {
                    isCorrect = game.finalOutcome === v.selection;
                }
            }

            if (isCorrect) {
                correctCount++;
                currentStreak++;
            } else if (isCorrect === false) { // Explicitly false (game over, lost)
                currentStreak = 0;
            }
            // If game pending, streak doesn't reset or increment
        });
        
        streak = currentStreak;

        // 3. Eligibility (Min 5 counted votes)
        if (totalCounted >= 5) {
            leaderboard.push({
                uid: user.uid,
                username: user.name,
                avatarUrl: user.avatar,
                accuracy: totalCounted > 0 ? (correctCount / totalCounted) * 100 : 0,
                correctVotes: correctCount,
                totalCountedVotes: totalCounted,
                streak,
                isCurrentUser: state.user ? state.user.uid === user.uid : false,
                rank: 0
            });
        } else if (state.user && user.uid === state.user.uid) {
             // Always return current user stats even if unranked
             leaderboard.push({
                uid: user.uid,
                username: user.name,
                avatarUrl: user.avatar,
                accuracy: totalCounted > 0 ? (correctCount / totalCounted) * 100 : 0,
                correctVotes: correctCount,
                totalCountedVotes: totalCounted,
                streak,
                isCurrentUser: true,
                rank: 0
            });
        }
    });

    // 4. Sort
    leaderboard.sort((a, b) => {
        if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
        if (b.correctVotes !== a.correctVotes) return b.correctVotes - a.correctVotes;
        return b.totalCountedVotes - a.totalCountedVotes;
    });

    // 5. Assign Rank
    leaderboard.forEach((entry, idx) => {
        entry.rank = idx + 1;
    });

    return leaderboard;
  },

  // --- Misc ---
  
  subscribeToComments: (callback: CommentListener) => {
    commentListeners.push(callback);
    return () => { commentListeners = commentListeners.filter(l => l !== callback); };
  },
  notifyCommentListeners: (gameId: string, comment: Comment) => { commentListeners.forEach(l => l(gameId, comment)); },
  subscribeToChanges: (callback: ChangeListener) => {
    changeListeners.push(callback);
    return () => { changeListeners = changeListeners.filter(l => l !== callback); };
  },
  notifyChangeListeners: () => { changeListeners.forEach(l => l()); },
  getComments: (gameId: string): Comment[] => {
    try {
      const all = JSON.parse(localStorage.getItem(COMMENTS_KEY) || '{}');
      return all[gameId] || [];
    } catch { return []; }
  },
  addComment: (gameId: string, text: string) => {
    const all = JSON.parse(localStorage.getItem(COMMENTS_KEY) || '{}');
    const gameComments = all[gameId] || [];
    const state = storageService.getUserState();
    const displayName = state.isAuthenticated && state.user ? state.user.name : 'Anonymous';
    const newComment: Comment = {
      id: Date.now().toString(),
      displayName,
      text,
      createdAt: Date.now(),
      upvotes: 0,
      downvotes: 0,
      replies: [],
      isLiked: false
    };
    all[gameId] = [newComment, ...gameComments];
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(all));
    storageService.notifyCommentListeners(gameId, newComment);
    storageService.notifyChangeListeners();
    return newComment;
  },
  addReply: (gameId: string, parentId: string, text: string) => {
    const all = JSON.parse(localStorage.getItem(COMMENTS_KEY) || '{}');
    let gameComments: Comment[] = all[gameId] || [];
    const state = storageService.getUserState();
    const displayName = state.isAuthenticated && state.user ? state.user.name : 'Anonymous';
    const newReply: Comment = {
      id: Date.now().toString(),
      displayName,
      text,
      createdAt: Date.now(),
      upvotes: 0,
      downvotes: 0,
      replies: [],
      isLiked: false
    };
    gameComments = findAndUpdate(gameComments, parentId, (c) => ({ ...c, replies: [...(c.replies || []), newReply] }));
    all[gameId] = gameComments;
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(all));
    storageService.notifyCommentListeners(gameId, newReply);
    storageService.notifyChangeListeners();
    return newReply;
  },
  toggleLike: (gameId: string, commentId: string) => {
    const all = JSON.parse(localStorage.getItem(COMMENTS_KEY) || '{}');
    let gameComments: Comment[] = all[gameId] || [];
    gameComments = findAndUpdate(gameComments, commentId, (c) => {
      const isLiked = !c.isLiked;
      return { ...c, isLiked, upvotes: isLiked ? c.upvotes + 1 : Math.max(0, c.upvotes - 1) };
    });
    all[gameId] = gameComments;
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(all));
    storageService.notifyChangeListeners();
    return gameComments;
  },
  getTheme: (): 'light' | 'dark' => {
    return (localStorage.getItem(THEME_KEY) as 'light' | 'dark') || 'light';
  },
  setTheme: (theme: 'light' | 'dark') => {
    localStorage.setItem(THEME_KEY, theme);
  }
};