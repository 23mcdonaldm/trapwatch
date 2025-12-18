import { Team } from '../types';

// Helper to generate ESPN CDN URLs
const getLogo = (league: string, abbr: string) => 
  `https://a.espncdn.com/i/teamlogos/${league.toLowerCase()}/500/${abbr.toLowerCase()}.png`;

// --- NFL ---
export const NFL_TEAMS: Record<string, Team> = {
  ARI: { name: 'Arizona Cardinals', shortName: 'Cardinals', logoUrl: getLogo('nfl', 'ari'), primaryColor: '#97233F' },
  ATL: { name: 'Atlanta Falcons', shortName: 'Falcons', logoUrl: getLogo('nfl', 'atl'), primaryColor: '#A71930' },
  BAL: { name: 'Baltimore Ravens', shortName: 'Ravens', logoUrl: getLogo('nfl', 'bal'), primaryColor: '#241773' },
  BUF: { name: 'Buffalo Bills', shortName: 'Bills', logoUrl: getLogo('nfl', 'buf'), primaryColor: '#00338D' },
  CAR: { name: 'Carolina Panthers', shortName: 'Panthers', logoUrl: getLogo('nfl', 'car'), primaryColor: '#0085CA' },
  CHI: { name: 'Chicago Bears', shortName: 'Bears', logoUrl: getLogo('nfl', 'chi'), primaryColor: '#0B162A' },
  CIN: { name: 'Cincinnati Bengals', shortName: 'Bengals', logoUrl: getLogo('nfl', 'cin'), primaryColor: '#FB4F14' },
  CLE: { name: 'Cleveland Browns', shortName: 'Browns', logoUrl: getLogo('nfl', 'cle'), primaryColor: '#311D00' },
  DAL: { name: 'Dallas Cowboys', shortName: 'Cowboys', logoUrl: getLogo('nfl', 'dal'), primaryColor: '#003594' },
  DEN: { name: 'Denver Broncos', shortName: 'Broncos', logoUrl: getLogo('nfl', 'den'), primaryColor: '#FB4F14' },
  DET: { name: 'Detroit Lions', shortName: 'Lions', logoUrl: getLogo('nfl', 'det'), primaryColor: '#0076B6' },
  GB:  { name: 'Green Bay Packers', shortName: 'Packers', logoUrl: getLogo('nfl', 'gb'), primaryColor: '#203731' },
  HOU: { name: 'Houston Texans', shortName: 'Texans', logoUrl: getLogo('nfl', 'hou'), primaryColor: '#03202F' },
  IND: { name: 'Indianapolis Colts', shortName: 'Colts', logoUrl: getLogo('nfl', 'ind'), primaryColor: '#002C5F' },
  JAX: { name: 'Jacksonville Jaguars', shortName: 'Jaguars', logoUrl: getLogo('nfl', 'jax'), primaryColor: '#006778' },
  KC:  { name: 'Kansas City Chiefs', shortName: 'Chiefs', logoUrl: getLogo('nfl', 'kc'), primaryColor: '#E31837' },
  LV:  { name: 'Las Vegas Raiders', shortName: 'Raiders', logoUrl: getLogo('nfl', 'lv'), primaryColor: '#000000' },
  LAC: { name: 'Los Angeles Chargers', shortName: 'Chargers', logoUrl: getLogo('nfl', 'lac'), primaryColor: '#0080C6' },
  LAR: { name: 'Los Angeles Rams', shortName: 'Rams', logoUrl: getLogo('nfl', 'lar'), primaryColor: '#003594' },
  MIA: { name: 'Miami Dolphins', shortName: 'Dolphins', logoUrl: getLogo('nfl', 'mia'), primaryColor: '#008E97' },
  MIN: { name: 'Minnesota Vikings', shortName: 'Vikings', logoUrl: getLogo('nfl', 'min'), primaryColor: '#4F2683' },
  NE:  { name: 'New England Patriots', shortName: 'Patriots', logoUrl: getLogo('nfl', 'ne'), primaryColor: '#002244' },
  NO:  { name: 'New Orleans Saints', shortName: 'Saints', logoUrl: getLogo('nfl', 'no'), primaryColor: '#D3BC8D' },
  NYG: { name: 'New York Giants', shortName: 'Giants', logoUrl: getLogo('nfl', 'nyg'), primaryColor: '#0B2265' },
  NYJ: { name: 'New York Jets', shortName: 'Jets', logoUrl: getLogo('nfl', 'nyj'), primaryColor: '#125740' },
  PHI: { name: 'Philadelphia Eagles', shortName: 'Eagles', logoUrl: getLogo('nfl', 'phi'), primaryColor: '#004C54' },
  PIT: { name: 'Pittsburgh Steelers', shortName: 'Steelers', logoUrl: getLogo('nfl', 'pit'), primaryColor: '#FFB612' },
  SF:  { name: 'San Francisco 49ers', shortName: '49ers', logoUrl: getLogo('nfl', 'sf'), primaryColor: '#AA0000' },
  SEA: { name: 'Seattle Seahawks', shortName: 'Seahawks', logoUrl: getLogo('nfl', 'sea'), primaryColor: '#002244' },
  TB:  { name: 'Tampa Bay Buccaneers', shortName: 'Buccaneers', logoUrl: getLogo('nfl', 'tb'), primaryColor: '#D50A0A' },
  TEN: { name: 'Tennessee Titans', shortName: 'Titans', logoUrl: getLogo('nfl', 'ten'), primaryColor: '#0C2340' },
  WAS: { name: 'Washington Commanders', shortName: 'Commanders', logoUrl: getLogo('nfl', 'was'), primaryColor: '#5A1414' },
};

// --- NBA ---
export const NBA_TEAMS: Record<string, Team> = {
  ATL: { name: 'Atlanta Hawks', shortName: 'Hawks', logoUrl: getLogo('nba', 'atl'), primaryColor: '#E03A3E' },
  BOS: { name: 'Boston Celtics', shortName: 'Celtics', logoUrl: getLogo('nba', 'bos'), primaryColor: '#007A33' },
  BKN: { name: 'Brooklyn Nets', shortName: 'Nets', logoUrl: getLogo('nba', 'bkn'), primaryColor: '#000000' },
  CHA: { name: 'Charlotte Hornets', shortName: 'Hornets', logoUrl: getLogo('nba', 'cha'), primaryColor: '#1D1160' },
  CHI: { name: 'Chicago Bulls', shortName: 'Bulls', logoUrl: getLogo('nba', 'chi'), primaryColor: '#CE1141' },
  CLE: { name: 'Cleveland Cavaliers', shortName: 'Cavaliers', logoUrl: getLogo('nba', 'cle'), primaryColor: '#860038' },
  DAL: { name: 'Dallas Mavericks', shortName: 'Mavericks', logoUrl: getLogo('nba', 'dal'), primaryColor: '#00538C' },
  DEN: { name: 'Denver Nuggets', shortName: 'Nuggets', logoUrl: getLogo('nba', 'den'), primaryColor: '#0E2240' },
  DET: { name: 'Detroit Pistons', shortName: 'Pistons', logoUrl: getLogo('nba', 'det'), primaryColor: '#C8102E' },
  GS:  { name: 'Golden State Warriors', shortName: 'Warriors', logoUrl: getLogo('nba', 'gs'), primaryColor: '#1D428A' },
  HOU: { name: 'Houston Rockets', shortName: 'Rockets', logoUrl: getLogo('nba', 'hou'), primaryColor: '#CE1141' },
  IND: { name: 'Indiana Pacers', shortName: 'Pacers', logoUrl: getLogo('nba', 'ind'), primaryColor: '#002D62' },
  LAC: { name: 'Los Angeles Clippers', shortName: 'Clippers', logoUrl: getLogo('nba', 'lac'), primaryColor: '#C8102E' },
  LAL: { name: 'Los Angeles Lakers', shortName: 'Lakers', logoUrl: getLogo('nba', 'lal'), primaryColor: '#552583' },
  MEM: { name: 'Memphis Grizzlies', shortName: 'Grizzlies', logoUrl: getLogo('nba', 'mem'), primaryColor: '#5D76A9' },
  MIA: { name: 'Miami Heat', shortName: 'Heat', logoUrl: getLogo('nba', 'mia'), primaryColor: '#98002E' },
  MIL: { name: 'Milwaukee Bucks', shortName: 'Bucks', logoUrl: getLogo('nba', 'mil'), primaryColor: '#00471B' },
  MIN: { name: 'Minnesota Timberwolves', shortName: 'Wolves', logoUrl: getLogo('nba', 'min'), primaryColor: '#0C2340' },
  NO:  { name: 'New Orleans Pelicans', shortName: 'Pelicans', logoUrl: getLogo('nba', 'no'), primaryColor: '#0C2340' },
  NY:  { name: 'New York Knicks', shortName: 'Knicks', logoUrl: getLogo('nba', 'ny'), primaryColor: '#006BB6' },
  OKC: { name: 'Oklahoma City Thunder', shortName: 'Thunder', logoUrl: getLogo('nba', 'okc'), primaryColor: '#007AC1' },
  ORL: { name: 'Orlando Magic', shortName: 'Magic', logoUrl: getLogo('nba', 'orl'), primaryColor: '#0077C0' },
  PHI: { name: 'Philadelphia 76ers', shortName: '76ers', logoUrl: getLogo('nba', 'phi'), primaryColor: '#006BB6' },
  PHX: { name: 'Phoenix Suns', shortName: 'Suns', logoUrl: getLogo('nba', 'phx'), primaryColor: '#1D1160' },
  POR: { name: 'Portland Trail Blazers', shortName: 'Blazers', logoUrl: getLogo('nba', 'por'), primaryColor: '#E03A3E' },
  SAC: { name: 'Sacramento Kings', shortName: 'Kings', logoUrl: getLogo('nba', 'sac'), primaryColor: '#5A2D81' },
  SA:  { name: 'San Antonio Spurs', shortName: 'Spurs', logoUrl: getLogo('nba', 'sa'), primaryColor: '#C4CED4' },
  TOR: { name: 'Toronto Raptors', shortName: 'Raptors', logoUrl: getLogo('nba', 'tor'), primaryColor: '#CE1141' },
  UTA: { name: 'Utah Jazz', shortName: 'Jazz', logoUrl: getLogo('nba', 'utah'), primaryColor: '#002B5C' },
  WAS: { name: 'Washington Wizards', shortName: 'Wizards', logoUrl: getLogo('nba', 'was'), primaryColor: '#002B5C' },
};

// --- MLB ---
export const MLB_TEAMS: Record<string, Team> = {
  LAD: { name: 'Los Angeles Dodgers', shortName: 'Dodgers', logoUrl: getLogo('mlb', 'lad'), primaryColor: '#005A9C' },
  NYY: { name: 'New York Yankees', shortName: 'Yankees', logoUrl: getLogo('mlb', 'nyy'), primaryColor: '#003087' },
  BOS: { name: 'Boston Red Sox', shortName: 'Red Sox', logoUrl: getLogo('mlb', 'bos'), primaryColor: '#BD3039' },
  CHC: { name: 'Chicago Cubs', shortName: 'Cubs', logoUrl: getLogo('mlb', 'chc'), primaryColor: '#0E3386' },
  COL: { name: 'Colorado Rockies', shortName: 'Rockies', logoUrl: getLogo('mlb', 'col'), primaryColor: '#333366' },
  SF:  { name: 'San Francisco Giants', shortName: 'Giants', logoUrl: getLogo('mlb', 'sf'), primaryColor: '#FD5A1E' },
  STL: { name: 'St. Louis Cardinals', shortName: 'Cardinals', logoUrl: getLogo('mlb', 'stl'), primaryColor: '#C41E3A' },
  ATL: { name: 'Atlanta Braves', shortName: 'Braves', logoUrl: getLogo('mlb', 'atl'), primaryColor: '#CE1141' },
  HOU: { name: 'Houston Astros', shortName: 'Astros', logoUrl: getLogo('mlb', 'hou'), primaryColor: '#002D62' },
  PHI: { name: 'Philadelphia Phillies', shortName: 'Phillies', logoUrl: getLogo('mlb', 'phi'), primaryColor: '#E81828' },
};

// --- NHL ---
export const NHL_TEAMS: Record<string, Team> = {
  NYR: { name: 'New York Rangers', shortName: 'Rangers', logoUrl: getLogo('nhl', 'nyr'), primaryColor: '#0038A8' },
  CHI: { name: 'Chicago Blackhawks', shortName: 'Blackhawks', logoUrl: getLogo('nhl', 'chi'), primaryColor: '#CF0A2C' },
  BOS: { name: 'Boston Bruins', shortName: 'Bruins', logoUrl: getLogo('nhl', 'bos'), primaryColor: '#FFB81C' },
  TOR: { name: 'Toronto Maple Leafs', shortName: 'Leafs', logoUrl: getLogo('nhl', 'tor'), primaryColor: '#00205B' },
  MTL: { name: 'Montreal Canadiens', shortName: 'Canadiens', logoUrl: getLogo('nhl', 'mtl'), primaryColor: '#AF1E2D' },
  EDM: { name: 'Edmonton Oilers', shortName: 'Oilers', logoUrl: getLogo('nhl', 'edm'), primaryColor: '#041E42' },
  VAN: { name: 'Vancouver Canucks', shortName: 'Canucks', logoUrl: getLogo('nhl', 'van'), primaryColor: '#00205B' },
  VGK: { name: 'Vegas Golden Knights', shortName: 'Knights', logoUrl: getLogo('nhl', 'vgk'), primaryColor: '#B4975A' },
};

// --- NCAA (Selected) ---
export const NCAA_TEAMS: Record<string, Team> = {
  ALA: { name: 'Alabama Crimson Tide', shortName: 'Alabama', logoUrl: 'https://a.espncdn.com/i/teamlogos/ncaa/500/333.png', primaryColor: '#9E1B32' },
  AUB: { name: 'Auburn Tigers', shortName: 'Auburn', logoUrl: 'https://a.espncdn.com/i/teamlogos/ncaa/500/2.png', primaryColor: '#0C2340' },
  DUKE: { name: 'Duke Blue Devils', shortName: 'Duke', logoUrl: 'https://a.espncdn.com/i/teamlogos/ncaa/500/150.png', primaryColor: '#003087' },
  UNC: { name: 'North Carolina Tar Heels', shortName: 'UNC', logoUrl: 'https://a.espncdn.com/i/teamlogos/ncaa/500/153.png', primaryColor: '#99BADD' },
};

export const ALL_TEAMS = { ...NFL_TEAMS, ...NBA_TEAMS, ...MLB_TEAMS, ...NHL_TEAMS, ...NCAA_TEAMS };