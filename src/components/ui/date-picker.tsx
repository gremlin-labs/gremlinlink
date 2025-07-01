'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface DatePickerProps {
  date?: Date;
  onDateChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = 'Pick a date',
  disabled = false,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const handleDateSelect = (selectedDate: Date | { from: Date; to?: Date } | undefined) => {
    if (selectedDate instanceof Date) {
      onDateChange?.(selectedDate);
      setOpen(false);
    } else if (!selectedDate) {
      onDateChange?.(undefined);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal bg-input border-input hover:bg-accent hover:text-accent-foreground',
            !date && 'text-muted-foreground',
            disabled && 'opacity-50 cursor-not-allowed',
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, 'PPP') : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

interface DateRangePickerProps {
  dateRange?: { from: Date; to?: Date };
  onDateRangeChange?: (range: { from: Date; to?: Date } | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  placeholder = 'Pick a date range',
  disabled = false,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  const handleDateSelect = (selectedRange: Date | { from: Date; to?: Date } | undefined) => {
    if (selectedRange && typeof selectedRange === 'object' && 'from' in selectedRange) {
      onDateRangeChange?.(selectedRange);
      if (selectedRange.from && selectedRange.to) {
        setOpen(false);
      }
    } else if (!selectedRange) {
      onDateRangeChange?.(undefined);
      setOpen(false);
    }
  };

  const formatDateRange = () => {
    if (!dateRange?.from) return placeholder;
    if (!dateRange.to) return format(dateRange.from, 'PPP');
    return `${format(dateRange.from, 'PPP')} - ${format(dateRange.to, 'PPP')}`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal bg-input border-input hover:bg-accent hover:text-accent-foreground',
            !dateRange?.from && 'text-muted-foreground',
            disabled && 'opacity-50 cursor-not-allowed',
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          <span>{formatDateRange()}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={dateRange}
          onSelect={handleDateSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
} 