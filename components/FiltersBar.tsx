import React from 'react';
import { Search } from 'lucide-react';
import { FilterState, League, TrapLabel } from '../types';

interface Props {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
}

export const FiltersBar: React.FC<Props> = ({ filters, setFilters }) => {
  return (
    <div className="sticky top-14 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 p-3 shadow-sm transition-colors duration-200">
      <div className="max-w-md mx-auto space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search teams..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-full pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-orange-500 outline-none transition-colors"
          />
        </div>

        {/* Horizontal Scroll Filters */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {/* League Dropdown simulated as list for mobile ease */}
          <select 
            value={filters.league}
            onChange={(e) => setFilters(prev => ({ ...prev, league: e.target.value as League | 'ALL' }))}
            className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold py-1.5 px-3 rounded-full border-r-8 border-transparent outline-none cursor-pointer transition-colors"
          >
            <option value="ALL">All Leagues</option>
            {Object.values(League).map(l => <option key={l} value={l}>{l}</option>)}
          </select>

          {/* Label Filter */}
          <select 
            value={filters.label}
            onChange={(e) => setFilters(prev => ({ ...prev, label: e.target.value as TrapLabel | 'ALL' }))}
            className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold py-1.5 px-3 rounded-full border-r-8 border-transparent outline-none cursor-pointer transition-colors"
          >
            <option value="ALL">All Traps</option>
            {Object.values(TrapLabel).map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          
           {/* Date placeholder */}
           <div className="bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-xs font-bold py-1.5 px-3 rounded-full whitespace-nowrap transition-colors">
            Today
          </div>
        </div>
      </div>
    </div>
  );
};