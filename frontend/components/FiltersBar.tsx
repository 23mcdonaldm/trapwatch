import React, { useState } from 'react';
import { Search, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { FilterState, League, TrapLabel } from '../types';

interface Props {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
}

const DatePicker: React.FC<Props> = ({ filters, setFilters }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [buttonRef, setButtonRef] = useState<HTMLButtonElement | null>(null);
  
  // We want calendar + "today" to be based on Eastern Time (ET), not the user's local timezone.
  const ET_TZ = 'America/New_York';

  // Format date as YYYY-MM-DD in ET.
  // Using en-CA yields YYYY-MM-DD format.
  const formatDateET = (date: Date): string => {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: ET_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  };

  // Parse YYYY-MM-DD into a Date that is safe for formatting (use noon UTC to avoid DST edge cases).
  const dateStrToSafeDate = (dateStr: string): Date => {
    return new Date(`${dateStr}T12:00:00Z`);
  };
  
  // ET "today"
  const todayStr = formatDateET(new Date());
  
  // Get current selected date or default to 'upcoming'
  const selectedDate = filters.date === 'upcoming' ? todayStr : filters.date;
  const displayDate = filters.date === 'upcoming' 
    ? 'Upcoming' 
    : dateStrToSafeDate(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: ET_TZ });
  
  // Get first day of month and number of days
  // Interpret currentMonth in ET by deriving year/month from ET "today" on first render.
  // Ensure currentMonth is at a stable UTC-noon instant for the 1st of that month.
  const currentMonthETStr = formatDateET(currentMonth); // YYYY-MM-DD in ET
  const [cmYearStr, cmMonthStr] = currentMonthETStr.split('-');
  const year = parseInt(cmYearStr, 10);
  const month = parseInt(cmMonthStr, 10) - 1; // JS Date month is 0-based

  const firstDay = new Date(Date.UTC(year, month, 1, 12, 0, 0));
  const lastDay = new Date(Date.UTC(year, month + 1, 0, 12, 0, 0));
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();
  
  // Generate calendar days
  const calendarDays: Array<{ date: Date; dateStr: string; isToday: boolean; isPast: boolean }> = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push({ date: new Date(year, month, -i), dateStr: '', isToday: false, isPast: false });
  }
  
  // Add all days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(Date.UTC(year, month, day, 12, 0, 0));
    const dateStr = formatDateET(date);
    const isToday = dateStr === todayStr;
    // Compare ET dates lexicographically (YYYY-MM-DD)
    const isPast = dateStr < todayStr;
    calendarDays.push({ date, dateStr, isToday, isPast });
  }
  
  const handleDateSelect = (dateStr: string) => {
    setFilters(prev => ({ ...prev, date: dateStr }));
    setIsOpen(false);
  };
  
  const handleUpcomingSelect = () => {
    setFilters(prev => ({ ...prev, date: 'upcoming' }));
    setIsOpen(false);
  };
  
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      // Move by months using a stable UTC-noon anchor.
      const prevETStr = formatDateET(prev);
      const [yStr, mStr] = prevETStr.split('-');
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10) - 1;
      const base = new Date(Date.UTC(y, m, 1, 12, 0, 0));
      base.setUTCMonth(base.getUTCMonth() + (direction === 'prev' ? -1 : 1));
      return base;
    });
  };
  
  const monthYearLabel = firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: ET_TZ });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Calculate position for fixed calendar
  const getCalendarPosition = () => {
    if (!buttonRef) return { top: 0, left: 0 };
    const rect = buttonRef.getBoundingClientRect();
    return {
      top: rect.bottom + window.scrollY + 8,
      left: rect.left + window.scrollX + (rect.width / 2) - 144, // 144 = w-72 / 2
    };
  };

  return (
    <div className="relative">
      <button
        ref={setButtonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold py-1.5 px-3 rounded-full whitespace-nowrap transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
      >
        <Calendar size={14} />
        <span>{displayDate}</span>
      </button>
      
      {isOpen && buttonRef && (
        <>
          <div 
            className="fixed inset-0 z-[100]" 
            onClick={() => setIsOpen(false)}
          />
          <div 
            className="fixed bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl z-[101] w-72 p-4"
            style={getCalendarPosition()}
          >
            {/* Upcoming option */}
            <button
              onClick={handleUpcomingSelect}
              className={`w-full text-left px-3 py-2 mb-2 rounded-lg text-xs font-bold transition-colors ${
                filters.date === 'upcoming'
                  ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              Upcoming
            </button>
            
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
              >
                <ChevronLeft size={16} />
              </button>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{monthYearLabel}</h3>
              <button
                onClick={() => navigateMonth('next')}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            
            {/* Week day headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {weekDays.map(day => (
                <div key={day} className="text-center text-[10px] font-bold text-slate-500 dark:text-slate-400 py-1">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((dayData, idx) => {
                if (!dayData.dateStr) {
                  return <div key={idx} className="aspect-square" />;
                }
                
                const isSelected = filters.date !== 'upcoming' && filters.date === dayData.dateStr;
                const isDisabled = dayData.isPast;
                
                return (
                  <button
                    key={dayData.dateStr}
                    onClick={() => !isDisabled && handleDateSelect(dayData.dateStr)}
                    disabled={isDisabled}
                    className={`aspect-square rounded text-xs font-bold transition-colors ${
                      isSelected
                        ? 'bg-orange-500 text-white'
                        : dayData.isToday
                        ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-black'
                        : isDisabled
                        ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {dayData.date.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export const FiltersBar: React.FC<Props> = ({ filters, setFilters }) => {
  return (
    <div className="sticky top-14 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 p-3 shadow-sm transition-colors duration-200 overflow-visible">
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
          
          {/* Date Picker */}
          <DatePicker filters={filters} setFilters={setFilters} />
        </div>
      </div>
    </div>
  );
};