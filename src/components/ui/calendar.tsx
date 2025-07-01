'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface CalendarProps {
  mode?: 'single' | 'range';
  selected?: Date | { from: Date; to?: Date };
  onSelect?: (date: Date | { from: Date; to?: Date } | undefined) => void;
  disabled?: (date: Date) => boolean;
  className?: string;
  initialFocus?: boolean;
}

function Calendar({
  className,
  mode = 'single',
  selected,
  onSelect,
  disabled,
  initialFocus,
  ...props
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(
    selected instanceof Date ? selected : selected?.from || new Date()
  );

  const calendarRef = React.useRef<HTMLDivElement>(null);

  // Handle initial focus
  React.useEffect(() => {
    if (initialFocus && calendarRef.current) {
      calendarRef.current.focus();
    }
  }, [initialFocus]);

  const today = new Date();
  const currentYear = currentMonth.getFullYear();
  const currentMonthIndex = currentMonth.getMonth();

  // Get days in month
  const daysInMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonthIndex, 1).getDay();

  // Generate calendar days
  const days = [];
  
  // Previous month's trailing days
  const prevMonth = new Date(currentYear, currentMonthIndex - 1, 0);
  const prevMonthDays = prevMonth.getDate();
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    days.push({
      date: new Date(currentYear, currentMonthIndex - 1, prevMonthDays - i),
      isCurrentMonth: false,
      isToday: false,
    });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentYear, currentMonthIndex, day);
    days.push({
      date,
      isCurrentMonth: true,
      isToday: 
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear(),
    });
  }

  // Next month's leading days
  const remainingDays = 42 - days.length; // 6 rows × 7 days
  for (let day = 1; day <= remainingDays; day++) {
    days.push({
      date: new Date(currentYear, currentMonthIndex + 1, day),
      isCurrentMonth: false,
      isToday: false,
    });
  }

  const isSelected = (date: Date) => {
    if (!selected) return false;
    if (mode === 'single' && selected instanceof Date) {
      return (
        date.getDate() === selected.getDate() &&
        date.getMonth() === selected.getMonth() &&
        date.getFullYear() === selected.getFullYear()
      );
    }
    if (mode === 'range' && selected && typeof selected === 'object' && 'from' in selected) {
      const { from, to } = selected;
      const dateTime = date.getTime();
      const fromTime = from.getTime();
      
      if (!to) {
        return dateTime === fromTime;
      }
      
      const toTime = to.getTime();
      return dateTime >= fromTime && dateTime <= toTime;
    }
    return false;
  };

  const isInRange = (date: Date) => {
    if (mode !== 'range' || !selected || typeof selected !== 'object' || !('from' in selected)) {
      return false;
    }
    
    const { from, to } = selected;
    if (!to) return false;
    
    const dateTime = date.getTime();
    const fromTime = from.getTime();
    const toTime = to.getTime();
    
    return dateTime > fromTime && dateTime < toTime;
  };

  const handleDateClick = (date: Date) => {
    if (disabled?.(date)) return;
    
    if (mode === 'single') {
      onSelect?.(date);
    } else if (mode === 'range') {
      if (!selected || typeof selected !== 'object' || !('from' in selected)) {
        onSelect?.({ from: date });
      } else if (!selected.to) {
        if (date.getTime() < selected.from.getTime()) {
          onSelect?.({ from: date });
        } else {
          onSelect?.({ from: selected.from, to: date });
        }
      } else {
        onSelect?.({ from: date });
      }
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
    if (mode === 'single') {
      onSelect?.(new Date());
    } else {
      onSelect?.({ from: new Date() });
    }
  };

  const clearSelection = () => {
    onSelect?.(undefined);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div 
      ref={calendarRef}
      className={cn('p-4 bg-popover text-popover-foreground rounded-lg border shadow-md outline-none', className)} 
      tabIndex={-1}
      {...props}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateMonth('prev')}
          className="h-8 w-8 p-0 hover:bg-accent"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="font-semibold text-sm">
          {monthNames[currentMonthIndex]} {currentYear}
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateMonth('next')}
          className="h-8 w-8 p-0 hover:bg-accent"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((day, index) => (
          <div
            key={index}
            className="h-8 flex items-center justify-center text-xs font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          const isDisabled = disabled?.(day.date);
          const isSelectedDay = isSelected(day.date);
          const isInRangeDay = isInRange(day.date);
          
          return (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              onClick={() => handleDateClick(day.date)}
              disabled={isDisabled}
              className={cn(
                'h-8 w-8 p-0 text-sm font-normal',
                !day.isCurrentMonth && 'text-muted-foreground opacity-50',
                day.isToday && 'bg-accent text-accent-foreground',
                isSelectedDay && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
                isInRangeDay && 'bg-accent/50',
                isDisabled && 'opacity-30 cursor-not-allowed',
                'hover:bg-accent hover:text-accent-foreground'
              )}
            >
              {day.date.getDate()}
            </Button>
          );
        })}
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={clearSelection}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Clear
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={goToToday}
          className="text-xs text-primary hover:text-primary"
        >
          Today
        </Button>
      </div>
    </div>
  );
}

Calendar.displayName = 'Calendar';

export { Calendar }; 