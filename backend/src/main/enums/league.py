from enum import Enum

class LeagueKey(str, Enum):
    NFL = "americanfootballnfl"
    NCAAF = "americanfootballncaaf"
    NBA = "basketballnba"
    NCAAB = "basketballncaab"
    MLB = "baseballmlb"
    NHL = "icehockeynhl"
    ALL = "all"
    
    
class OddsApiLeagueKey(str, Enum):
    NFL = "americanfootball_nfl"
    NCAAF = "americanfootball_ncaaf"
    NBA = "basketball_nba"
    NCAAB = "basketball_ncaab"
    MLB = "baseball_mlb"
    NHL = "icehockey_nhl"
    ALL = "all"