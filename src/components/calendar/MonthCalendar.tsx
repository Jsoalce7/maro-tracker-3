import { useAppStore } from '../../stores/appStore';
import { isToday } from '../../utils/date';
import { useState, useMemo } from 'react';

interface MonthCalendarProps {
    selectedDate: string; // YYYY-MM-DD
    onSelectDate: (date: string) => void;
    loggedDates?: string[]; // Array of YYYY-MM-DD dates that have logs
}

// Redesigned MonthCalendar
export function MonthCalendar({ selectedDate, onSelectDate, loggedDates = [], mobileCollapsible = false }: MonthCalendarProps & { mobileCollapsible?: boolean }) {
    const [viewDate, setViewDate] = useState(() => new Date(selectedDate));
    const [isExpanded, setIsExpanded] = useState(!mobileCollapsible);

    // Update viewDate when selectedDate changes (to ensure we go to that month)
    // BUT only if we are expanded OR if it's a huge jump? 
    // Actually, normally we want the calendar to follow selection.

    // Correction: If text-based date updates (e.g. from week row), we might want to sync viewDate if it's different month.
    // Let's keep existing behavior: initialize once. If we want it to sync, we'd add useEffect.
    // Existing code didn't sync viewDate on selectedDate change, so user might have navigated manually.
    // Let's leave that as is to avoid regression, BUT... 
    // If I select a date in Week View that is in next month, and then expand, I expect to see that month.
    // So let's sync viewDate to selectedDate whenever selectedDate changes, IF the user hasn't explicitly navigated away?
    // Safer to just sync viewDate to selectedDate if we want "jump to date" behavior, but let's stick to base requirements.

    // Week Generation (Standard sun-sat)
    const weekDays = useMemo(() => {
        const current = new Date(selectedDate + 'T00:00:00'); // Ensure local midnight calculation or use simple splits
        // Actually, let's use the explicit parsing from existing code style
        const [y, m, d] = selectedDate.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);

        const dayOfWeek = dateObj.getDay(); // 0=Sun
        const startOfWeek = new Date(dateObj);
        startOfWeek.setDate(dateObj.getDate() - dayOfWeek);

        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(startOfWeek);
            d.setDate(startOfWeek.getDate() + i);
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            days.push({
                date: dateStr,
                day: d.getDate(),
                isLogged: loggedDates.includes(dateStr)
            });
        }
        return days;
    }, [selectedDate, loggedDates]);


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

        // Next month days - fill to complete 6 rows (42 cells) for consistency
        const totalCells = 42;
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

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const goToPrevMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        setViewDate(new Date(year, month - 1, 1));
    };

    const goToNextMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        setViewDate(new Date(year, month + 1, 1));
    };

    const isTodayDate = (dateStr: string) => {
        return isToday(dateStr);
    };

    const isSelected = (dateStr: string) => {
        return dateStr === selectedDate;
    };

    const toggleExpand = () => {
        if (mobileCollapsible) {
            setIsExpanded(!isExpanded);
            // Sync viewDate to selectedDate when expanding so we see the right month
            if (!isExpanded) {
                const [y, m, d] = selectedDate.split('-').map(Number);
                setViewDate(new Date(y, m - 1, d)); // Use 1st just to be safe, or d
            }
        }
    };

    return (
        <div className={`bg-[#141414] border border-[#222] rounded-[24px] w-full transition-all duration-300 overflow-hidden ${isExpanded ? 'p-5' : 'p-3'}`}>
            {/* Header (Always Visible, Toggle Trigger) */}
            <div
                onClick={toggleExpand}
                className={`flex items-center justify-between ${isExpanded ? 'mb-4' : ''} ${mobileCollapsible ? 'cursor-pointer' : ''}`}
            >
                {/* Prev Button (Only in Expanded) */}
                <button
                    onClick={goToPrevMonth}
                    className={`p-1.5 text-[#666] hover:text-white hover:bg-[#2A2A2A] rounded-full transition-colors ${!isExpanded ? 'hidden' : ''}`}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>

                {/* Title */}
                <div className="flex items-center gap-2 mx-auto">
                    <h3 className={`font-bold text-white tracking-wide uppercase ${isExpanded ? 'text-[15px]' : 'text-[13px]'}`}>
                        {isExpanded ? (
                            <>
                                {monthNames[month]} <span className="text-[#666]">{year}</span>
                            </>
                        ) : (
                            // Collapsed Title: "December" etc (just month of selected date?) or "This Week"?
                            // User request: "Collapsed... similar to reference... white UI example". 
                            // Usually just Month is fine. Let's show Month of selected date.
                            (() => {
                                const [y, m] = selectedDate.split('-').map(Number);
                                return <>{monthNames[m - 1]} <span className="text-[#666]">{y}</span></>;
                            })()
                        )}
                    </h3>
                    {mobileCollapsible && (
                        <svg
                            className={`w-4 h-4 text-[#444] transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    )}
                </div>

                {/* Next Button (Only in Expanded) */}
                <button
                    onClick={goToNextMonth}
                    className={`p-1.5 text-[#666] hover:text-white hover:bg-[#2A2A2A] rounded-full transition-colors ${!isExpanded ? 'hidden' : ''}`}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>

            {/* Content Body */}

            {/* 1. COLLAPSED: Week Row */}
            {!isExpanded && mobileCollapsible && (
                <div className="grid grid-cols-7 gap-1 animate-in fade-in duration-300">
                    {weekDays.map(({ date, day, isLogged }) => (
                        <button
                            key={date}
                            onClick={(e) => { e.stopPropagation(); onSelectDate(date); }}
                            className={`
                                relative flex flex-col items-center justify-center py-2 rounded-xl text-[13px] font-medium transition-all duration-200
                                ${isSelected(date)
                                    ? 'bg-white text-black font-bold shadow-md scale-105 z-10'
                                    : isTodayDate(date)
                                        ? 'bg-[#222] text-white border border-[#444]'
                                        : 'text-[#888] hover:bg-[#1A1A1A] hover:text-white'
                                }
                            `}
                        >
                            <span className="text-[9px] uppercase tracking-wider opacity-60 mb-0.5">
                                {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'narrow' })}
                            </span>
                            {day}

                            {/* Logged Dot */}
                            {isLogged && !isSelected(date) && (
                                <div className="absolute bottom-1 w-1 h-1 rounded-full bg-[#4CD964]" />
                            )}
                        </button>
                    ))}
                </div>
            )}


            {/* 2. EXPANDED: Full Month Grid */}
            {isExpanded && (
                <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                    {/* Day Headers */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {dayNames.map((day, i) => (
                            <div key={i} className="text-center text-[10px] font-bold text-[#444] uppercase tracking-wider py-1">
                                {day.charAt(0)}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {days.map(({ date, day, isCurrentMonth, isLogged }) => (
                            <button
                                key={date}
                                onClick={(e) => { e.stopPropagation(); onSelectDate(date); }}
                                className={`
                    relative aspect-square flex items-center justify-center rounded-xl text-[13px] font-medium transition-all duration-200
                    ${!isCurrentMonth ? 'text-[#333] opacity-50' : ''}
                    ${isSelected(date)
                                        ? 'bg-white text-black font-bold shadow-md scale-105 z-10'
                                        : isTodayDate(date)
                                            ? 'bg-[#222] text-white border border-[#444]'
                                            : 'text-[#888] hover:bg-[#1A1A1A] hover:text-white'
                                    }
                    `}
                            >
                                {day}
                                {/* Logged indicator */}
                                {isLogged && !isSelected(date) && isCurrentMonth && (
                                    <div className="absolute bottom-1.5 w-1 h-1 rounded-full bg-[#4CD964]" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
