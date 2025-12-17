from enum import Enum

class LeagueKey(str, Enum):
    NFL = "americanfootball_nfl"
    NCAAF = "americanfootball_ncaaf"
    NBA = "basketball_nba"
    NCAAB = "basketball_ncaab"
    MLB = "baseball_mlb"
    NHL = "icehockey_nhl"
    ALL = "all"
    
    
