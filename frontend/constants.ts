import { Game, League, TrapLabel } from './types';
import { NFL_TEAMS, NBA_TEAMS, NHL_TEAMS, MLB_TEAMS, NCAA_TEAMS } from './data/teams';

// Helper to create recent timestamps
const now = new Date();
const getHoursAgo = (hours: number) => new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();
const getDaysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

export const MOCK_GAMES: Game[] = [
  {
    id: 'g1',
    league: League.NFL,
    startTime: new Date(new Date().setHours(20, 15)).toISOString(),
    homeTeam: NFL_TEAMS['KC'],
    awayTeam: NFL_TEAMS['DEN'],
    isHomeFavorite: true,
    odds: { spread: '-7.5', moneyline: '-340' },
    publicMoneyPercent: 88,
    publicBetsPercent: 92,
    trapLabel: TrapLabel.CITY,
    severityScore: 95,
    trapTriggers: [
      { title: 'Line Freeze', explanation: 'Despite 88% of cash on KC, line hasn\'t moved from -7.5.' },
      { title: 'Reverse Line Movement', explanation: 'Sharp money spotted on Denver late, pushing the vig down.' },
      { title: 'Divisional Underdog', explanation: 'Divisional dogs cover 62% of the time in late season matchups.' },
      { title: 'Public Overload', explanation: 'When >85% of tickets are on a favorite of 7+, they cover <40% of time.' },
      { title: 'Lookahead Spot', explanation: 'Chiefs have a massive primetime game against Buffalo next week.' }
    ],
    whatPeopleAreSaying: [
      { id: 's1', source: 'X', authorName: '@SharpMoney', text: 'Vegas needs Denver tonight. This line stinks.', timestamp: '2h ago' },
      { id: 's2', source: 'Reddit', authorName: 'u/DegenerateGambler', text: 'Everyone I know is on KC. Fading the public.', timestamp: '45m ago' }
    ],
    trapHistory: [
      { label: TrapLabel.CITY, timestamp: getHoursAgo(1) },
      { label: TrapLabel.DETECTED, timestamp: getHoursAgo(5) },
      { label: TrapLabel.POTENTIAL, timestamp: getHoursAgo(12) }
    ]
  },
  {
    id: 'g2',
    league: League.NBA,
    startTime: new Date(new Date().setHours(19, 30)).toISOString(),
    homeTeam: NBA_TEAMS['BOS'],
    awayTeam: NBA_TEAMS['CHA'],
    isHomeFavorite: true,
    odds: { spread: '-12.5', moneyline: '-900' },
    publicMoneyPercent: 75,
    publicBetsPercent: 80,
    trapLabel: TrapLabel.DETECTED,
    severityScore: 82,
    trapTriggers: [
      { title: 'Lookahead Spot', explanation: 'Celtics play the Bucks tomorrow night on national TV.' },
      { title: 'Rest Disadvantage', explanation: 'Celtics on a back-to-back, Hornets rested for 2 days.' },
      { title: 'Inflated Line', explanation: 'Opening line was -10, public pushed it to -12.5 creating value on the dog.' }
    ],
    whatPeopleAreSaying: [
      { id: 's3', source: 'TV', authorName: 'Sportscenter', text: 'Tatum listed as questionable for tonight.', timestamp: '10m ago' }
    ],
    trapHistory: [
      { label: TrapLabel.DETECTED, timestamp: getHoursAgo(2) },
      { label: TrapLabel.POTENTIAL, timestamp: getHoursAgo(8) }
    ]
  },
  {
    id: 'g3',
    league: League.NCAAF,
    startTime: getHoursAgo(26), // Yesterday
    homeTeam: NCAA_TEAMS['ALA'],
    awayTeam: NCAA_TEAMS['AUB'],
    isHomeFavorite: true,
    odds: { spread: '-14', moneyline: '-650' },
    publicMoneyPercent: 60,
    publicBetsPercent: 85,
    trapLabel: TrapLabel.POTENTIAL,
    severityScore: 65,
    trapTriggers: [
      { title: 'Rivalry Game', explanation: 'Throw out the records for the Iron Bowl. Historic variance is high.' }
    ],
    whatPeopleAreSaying: [],
    trapHistory: [
      { label: TrapLabel.POTENTIAL, timestamp: getHoursAgo(48) }
    ],
    finalOutcome: 'TRAP' // Favorite lost or didn't cover
  },
  {
    id: 'g4',
    league: League.NHL,
    startTime: new Date(new Date().setHours(21, 0)).toISOString(),
    homeTeam: NHL_TEAMS['NYR'],
    awayTeam: NHL_TEAMS['CHI'],
    isHomeFavorite: true,
    odds: { spread: '-1.5', moneyline: '-220' },
    publicMoneyPercent: 91,
    publicBetsPercent: 94,
    trapLabel: TrapLabel.CITY,
    severityScore: 98,
    trapTriggers: [
      { title: 'Public Overload', explanation: 'Over 90% of bets on NYR is a massive fade signal in NHL.' },
      { title: 'Goalie Change', explanation: 'Backup goalie confirmed for NYR just an hour ago.' },
      { title: 'Schedule Fatigue', explanation: 'Rangers playing their 3rd game in 4 nights with travel.' },
      { title: 'Reverse Line Move', explanation: 'Moneyline dropped from -240 to -220 despite heavy public betting.' },
      { title: 'Trap Line', explanation: 'Line implies a blowout, but advanced analytics suggest a 1-goal game.' }
    ],
    whatPeopleAreSaying: [
      { id: 's4', source: 'X', authorName: '@HockeyDaily', text: 'Public is absolutely hammering the Rangers.', timestamp: '1h ago' }
    ],
    trapHistory: [
      { label: TrapLabel.CITY, timestamp: new Date(new Date().setHours(16, 0, 0, 0)).toISOString() }, // 4:00 PM
      { label: TrapLabel.DETECTED, timestamp: new Date(new Date().setHours(14, 11, 0, 0)).toISOString() }, // 2:11 PM
      { label: TrapLabel.POTENTIAL, timestamp: new Date(new Date().setHours(10, 0, 0, 0)).toISOString() } // 10:00 AM
    ]
  },
  {
    id: 'g5',
    league: League.MLB,
    startTime: getHoursAgo(48), // 2 days ago
    homeTeam: MLB_TEAMS['LAD'],
    awayTeam: MLB_TEAMS['COL'],
    isHomeFavorite: true,
    odds: { spread: '-1.5', moneyline: '-250' },
    publicMoneyPercent: 78,
    publicBetsPercent: 82,
    trapLabel: TrapLabel.POTENTIAL,
    severityScore: 55,
    trapTriggers: [
      { title: 'Coors Field Effect', explanation: 'High variance environment favors the underdog.' }
    ],
    whatPeopleAreSaying: [],
    trapHistory: [
        { label: TrapLabel.POTENTIAL, timestamp: getHoursAgo(60) }
    ],
    finalOutcome: 'NOT_TRAP' // Favorite covered
  },
  {
    id: 'g6',
    league: League.NFL,
    startTime: new Date(new Date().setHours(13, 0)).toISOString(),
    homeTeam: NFL_TEAMS['PHI'],
    awayTeam: NFL_TEAMS['DAL'],
    isHomeFavorite: true,
    odds: { spread: '-3.5', moneyline: '-175' },
    publicMoneyPercent: 85,
    publicBetsPercent: 88,
    trapLabel: TrapLabel.DETECTED,
    severityScore: 89,
    trapTriggers: [
        { title: 'Public Dog', explanation: 'Cowboys getting heavy public support despite injuries.'},
        { title: 'Rivalry Trend', explanation: 'Underdog has covered 4 of the last 5 matchups in this series.' },
        { title: 'Sharp Money', explanation: 'Professional syndicates have taken a strong position on Dallas +3.5.' }
    ],
    whatPeopleAreSaying: [
       { id: 's5', source: 'Other', authorName: 'TrapWatch Algo', text: 'Alert: Moved to Trap Detected.', timestamp: '30m ago' }
    ],
    trapHistory: [
      { label: TrapLabel.DETECTED, timestamp: getHoursAgo(0.5) },
      { label: TrapLabel.POTENTIAL, timestamp: getHoursAgo(4) }
    ]
  }
];

// Historical games strictly for filling out the leaderboard
export const MOCK_HISTORY: Game[] = [
    {
        id: 'h1', league: League.NBA, startTime: getDaysAgo(3),
        homeTeam: NBA_TEAMS['LAL'], awayTeam: NBA_TEAMS['SAS'],
        isHomeFavorite: true, odds: {spread: '-8', moneyline: '-350'}, publicMoneyPercent: 80, publicBetsPercent: 85,
        trapLabel: TrapLabel.DETECTED, severityScore: 80, trapTriggers: [], whatPeopleAreSaying: [],
        trapHistory: [{ label: TrapLabel.DETECTED, timestamp: getDaysAgo(3.2) }, { label: TrapLabel.POTENTIAL, timestamp: getDaysAgo(3.5) }],
        finalOutcome: 'TRAP'
    },
    {
        id: 'h2', league: League.NFL, startTime: getDaysAgo(4),
        homeTeam: NFL_TEAMS['BUF'], awayTeam: NFL_TEAMS['NE'],
        isHomeFavorite: true, odds: {spread: '-10', moneyline: '-500'}, publicMoneyPercent: 90, publicBetsPercent: 92,
        trapLabel: TrapLabel.CITY, severityScore: 95, trapTriggers: [], whatPeopleAreSaying: [],
        trapHistory: [{ label: TrapLabel.CITY, timestamp: getDaysAgo(4.1) }, { label: TrapLabel.DETECTED, timestamp: getDaysAgo(4.4) }],
        finalOutcome: 'NOT_TRAP'
    },
    {
        id: 'h3', league: League.NHL, startTime: getDaysAgo(2),
        homeTeam: NHL_TEAMS['TOR'], awayTeam: NHL_TEAMS['MTL'],
        isHomeFavorite: true, odds: {spread: '-1.5', moneyline: '-200'}, publicMoneyPercent: 75, publicBetsPercent: 70,
        trapLabel: TrapLabel.POTENTIAL, severityScore: 60, trapTriggers: [], whatPeopleAreSaying: [],
        trapHistory: [{ label: TrapLabel.POTENTIAL, timestamp: getDaysAgo(2.2) }],
        finalOutcome: 'TRAP'
    },
    {
        id: 'h4', league: League.NBA, startTime: getDaysAgo(5),
        homeTeam: NBA_TEAMS['GS'], awayTeam: NBA_TEAMS['PHX'],
        isHomeFavorite: false, odds: {spread: '+2', moneyline: '+110'}, publicMoneyPercent: 40, publicBetsPercent: 45,
        trapLabel: TrapLabel.POTENTIAL, severityScore: 50, trapTriggers: [], whatPeopleAreSaying: [],
        trapHistory: [{ label: TrapLabel.POTENTIAL, timestamp: getDaysAgo(5.2) }],
        finalOutcome: 'NOT_TRAP'
    },
    {
        id: 'h5', league: League.NCAAB, startTime: getDaysAgo(3),
        homeTeam: NCAA_TEAMS['DUKE'], awayTeam: NCAA_TEAMS['UNC'],
        isHomeFavorite: true, odds: {spread: '-4', moneyline: '-180'}, publicMoneyPercent: 65, publicBetsPercent: 70,
        trapLabel: TrapLabel.DETECTED, severityScore: 85, trapTriggers: [], whatPeopleAreSaying: [],
        trapHistory: [{ label: TrapLabel.DETECTED, timestamp: getDaysAgo(3.1) }],
        finalOutcome: 'TRAP'
    },
    {
        id: 'h6', league: League.NFL, startTime: getDaysAgo(6),
        homeTeam: NFL_TEAMS['DAL'], awayTeam: NFL_TEAMS['NYG'],
        isHomeFavorite: true, odds: {spread: '-6', moneyline: '-280'}, publicMoneyPercent: 88, publicBetsPercent: 85,
        trapLabel: TrapLabel.CITY, severityScore: 92, trapTriggers: [], whatPeopleAreSaying: [],
        trapHistory: [{ label: TrapLabel.CITY, timestamp: getDaysAgo(6.1) }, { label: TrapLabel.DETECTED, timestamp: getDaysAgo(6.5) }],
        finalOutcome: 'TRAP'
    },
    {
        id: 'h7', league: League.MLB, startTime: getDaysAgo(2),
        homeTeam: MLB_TEAMS['NYY'], awayTeam: MLB_TEAMS['BOS'],
        isHomeFavorite: true, odds: {spread: '-1.5', moneyline: '-160'}, publicMoneyPercent: 72, publicBetsPercent: 75,
        trapLabel: TrapLabel.POTENTIAL, severityScore: 65, trapTriggers: [], whatPeopleAreSaying: [],
        trapHistory: [{ label: TrapLabel.POTENTIAL, timestamp: getDaysAgo(2.3) }],
        finalOutcome: 'NOT_TRAP'
    },
    {
        id: 'h8', league: League.NBA, startTime: getDaysAgo(1),
        homeTeam: NBA_TEAMS['MIA'], awayTeam: NBA_TEAMS['ORL'],
        isHomeFavorite: true, odds: {spread: '-5', moneyline: '-200'}, publicMoneyPercent: 60, publicBetsPercent: 65,
        trapLabel: TrapLabel.POTENTIAL, severityScore: 55, trapTriggers: [], whatPeopleAreSaying: [],
        trapHistory: [{ label: TrapLabel.POTENTIAL, timestamp: getDaysAgo(1.2) }],
        finalOutcome: 'TRAP'
    }
];

export const ALL_GAMES = [...MOCK_GAMES, ...MOCK_HISTORY];