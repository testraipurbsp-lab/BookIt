import { useMemo } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isBefore,
  startOfDay,
} from 'date-fns';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * props:
 *  - viewMonth: Date (any day within the month being viewed)
 *  - selectedDate: Date | null
 *  - onSelectDate: (Date) => void
 *  - onMonthChange: (Date) => void
 *  - dayStatus: { 'YYYY-MM-DD': 'available' | 'full' | 'closed' }
 *  - loading: boolean
 */
export default function MonthCalendar({
  viewMonth,
  selectedDate,
  onSelectDate,
  onMonthChange,
  dayStatus = {},
  loading = false,
}) {
  const today = startOfDay(new Date());

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewMonth));
    const end = endOfWeek(endOfMonth(viewMonth));
    return eachDayOfInterval({ start, end });
  }, [viewMonth]);

  const goPrevMonth = () => {
    const d = new Date(viewMonth);
    d.setMonth(d.getMonth() - 1);
    onMonthChange(d);
  };
  const goNextMonth = () => {
    const d = new Date(viewMonth);
    d.setMonth(d.getMonth() + 1);
    onMonthChange(d);
  };

  return (
    <div className="bg-white rounded-2xl shadow-soft border border-slate-200/70 p-5 w-full">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={goPrevMonth}
          className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-brand-50 hover:text-brand-600 text-slate-500 transition-colors"
          aria-label="Previous month"
        >
          ‹
        </button>
        <h3 className="font-display font-semibold text-slate-800 tracking-tight">
          {format(viewMonth, 'MMMM yyyy')}
        </h3>
        <button
          type="button"
          onClick={goNextMonth}
          className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-brand-50 hover:text-brand-600 text-slate-500 transition-colors"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400 py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const inMonth = isSameMonth(day, viewMonth);
          const isPast = isBefore(day, today);
          const status = dayStatus[dateKey]; // available | full | closed | undefined
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isToday = isSameDay(day, today);

          const disabled = isPast || status === 'full' || status === 'closed';

          let classes =
            'aspect-square flex items-center justify-center rounded-xl text-sm relative transition-all duration-150 ';
          if (!inMonth) classes += 'text-slate-300 ';
          else if (disabled) classes += 'text-slate-300 cursor-not-allowed line-through ';
          else classes += 'text-slate-700 font-medium cursor-pointer hover:bg-brand-50 hover:text-brand-700 ';

          if (isSelected)
            classes +=
              '!bg-gradient-to-br !from-brand-500 !to-accent-500 !text-white font-semibold shadow-lift scale-105 ';
          if (isToday && !isSelected) classes += 'ring-2 ring-inset ring-brand-400 font-semibold ';

          return (
            <button
              type="button"
              key={dateKey}
              disabled={disabled || !inMonth || loading}
              onClick={() => onSelectDate(day)}
              className={classes}
              title={
                status === 'closed'
                  ? 'Closed'
                  : status === 'full'
                  ? 'Fully booked'
                  : status === 'available'
                  ? 'Slots available'
                  : ''
              }
            >
              {format(day, 'd')}
              {inMonth && status === 'available' && !isSelected && (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-emerald-500" />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-300" /> Full / Closed
        </span>
      </div>
    </div>
  );
}