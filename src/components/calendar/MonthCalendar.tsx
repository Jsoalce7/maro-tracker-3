import { useState, useMemo } from 'react';

interface MonthCalendarProps {
    selectedDate: string; // YYYY-MM-DD
    onSelectDate: (date: string) => void;
    loggedDates?: string[]; // Array of YYYY-MM-DD dates that have logs
}

export function MonthCalendar({ selectedDate, onSelectDate, loggedDates = [] }: MonthCalendarProps) {
    const [viewDate, setViewDate] = useState(() => new Date(selectedDate));

    const { year, month, days } = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const firstDayOfWeek = firstDay.getDay();

        const days: Array<{ date: string; day: number; isCurrentMonth: boolean; isLogged: boolean }> = [];

        // Previous month days
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
            const day = prevMonthLastDay - i;
            const prevMonth = month === 0 ? 11 : month - 1;
            const prevYear = month === 0 ? year - 1 : year;
            const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            days.push({ date: dateStr, day, isCurrentMonth: false, isLogged: loggedDates.includes(dateStr) });
        }

        // Current month days
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            days.push({ date: dateStr, day, isCurrentMonth: true, isLogged: loggedDates.includes(dateStr) });
        }

        // Next month days - fill to complete 5 or 6 rows
        const totalCells = days.length <= 35 ? 35 : 42;
        const remainingDays = totalCells - days.length;
        for (let day = 1; day <= remainingDays; day++) {
            const nextMonth = month === 11 ? 0 : month + 1;
            const nextYear = month === 11 ? year + 1 : year;
            const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            days.push({ date: dateStr, day, isCurrentMonth: false, isLogged: loggedDates.includes(dateStr) });
        }

        return { year, month, days };
    }, [viewDate, loggedDates]);

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    const goToPrevMonth = () => {
        setViewDate(new Date(year, month - 1, 1));
    };

    const goToNextMonth = () => {
        setViewDate(new Date(year, month + 1, 1));
    };

    const isToday = (dateStr: string) => {
        return dateStr === new Date().toISOString().split('T')[0];
    };

    const isSelected = (dateStr: string) => {
        return dateStr === selectedDate;
    };

    return (
        <div className="bg-[#1A1A1A] rounded-2xl p-3">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-2">
                <button
                    onClick={goToPrevMonth}
                    className="p-1.5 hover:bg-[#242424] rounded-lg transition-colors"
                >
                    <svg className="w-4 h-4 text-[#A1A1A1]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h3 className="text-sm font-semibold text-white">
                    {monthNames[month]} {year}
                </h3>
                <button
                    onClick={goToNextMonth}
                    className="p-1.5 hover:bg-[#242424] rounded-lg transition-colors"
                >
                    <svg className="w-4 h-4 text-[#A1A1A1]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-0.5 mb-1">
                {dayNames.map((day, i) => (
                    <div key={i} className="text-center text-[10px] text-[#6B6B6B] py-1">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid - Compact */}
            <div className="grid grid-cols-7 gap-0.5">
                {days.map(({ date, day, isCurrentMonth, isLogged }) => (
                    <button
                        key={date}
                        onClick={() => onSelectDate(date)}
                        className={`
              relative aspect-square flex items-center justify-center rounded text-xs transition-colors
              ${isCurrentMonth ? 'text-white' : 'text-[#4A4A4A]'}
              ${isSelected(date) ? 'bg-[#3B82F6] text-white' : 'hover:bg-[#242424]'}
              ${isToday(date) && !isSelected(date) ? 'ring-1 ring-[#3B82F6]' : ''}
            `}
                    >
                        {day}
                        {/* Logged indicator */}
                        {isLogged && !isSelected(date) && (
                            <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#10B981]" />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}
