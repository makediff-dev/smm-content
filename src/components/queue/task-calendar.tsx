"use client";

import { useMemo, useState } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { toDateKey } from "@/lib/simulate-generation";
import styles from "./task-calendar.module.css";

interface TaskCalendarProps {
  tasks: Array<{ createdAt: string }>;
  selectedDate: string | null;
  onSelectDate: (dateKey: string | null) => void;
  compact?: boolean;
  embedded?: boolean;
  onClear?: () => void;
}

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function buildMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: Array<{ dateKey: string; day: number; inCurrentMonth: boolean }> = [];

  for (let index = 0; index < 42; index += 1) {
    const dayNumber = index - startOffset + 1;

    if (dayNumber < 1) {
      const prevDay = daysInPrevMonth + dayNumber;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      cells.push({
        dateKey: toDateKey(new Date(prevYear, prevMonth, prevDay).toISOString()),
        day: prevDay,
        inCurrentMonth: false,
      });
      continue;
    }

    if (dayNumber > daysInMonth) {
      const nextDay = dayNumber - daysInMonth;
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      cells.push({
        dateKey: toDateKey(new Date(nextYear, nextMonth, nextDay).toISOString()),
        day: nextDay,
        inCurrentMonth: false,
      });
      continue;
    }

    cells.push({
      dateKey: toDateKey(new Date(year, month, dayNumber).toISOString()),
      day: dayNumber,
      inCurrentMonth: true,
    });
  }

  return cells;
}

export function TaskCalendar({
  tasks,
  selectedDate,
  onSelectDate,
  compact = false,
  embedded = false,
  onClear,
}: TaskCalendarProps) {
  const todayKey = toDateKey(new Date().toISOString());
  const initialMonth = selectedDate ? parseDateKey(selectedDate) : new Date();

  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1)
  );

  const taskCountByDate = useMemo(() => {
    const counts = new Map<string, number>();
    tasks.forEach((task) => {
      const key = toDateKey(task.createdAt);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return counts;
  }, [tasks]);

  const monthLabel = visibleMonth.toLocaleDateString("ru-RU", {
    month: "long",
    year: "numeric",
  });

  const cells = buildMonthGrid(visibleMonth.getFullYear(), visibleMonth.getMonth());
  const selectedCount = selectedDate ? taskCountByDate.get(selectedDate) ?? 0 : 0;

  const handleDayClick = (dateKey: string) => {
    onSelectDate(selectedDate === dateKey ? null : dateKey);
  };

  const goToPrevMonth = () => {
    setVisibleMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1)
    );
  };

  const goToNextMonth = () => {
    setVisibleMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1)
    );
  };

  return (
    <div
      className={`${styles.calendar} ${compact ? styles.calendarCompact : ""} ${
        embedded ? styles.calendarEmbedded : ""
      }`}
    >
      <div className={`${styles.header} ${compact ? styles.headerCompact : ""}`}>
        {!compact && (
          <div>
            <div className={styles.title}>Календарь задач</div>
            <div className={styles.subtitle}>
              Выберите дату, чтобы увидеть, что происходило
            </div>
          </div>
        )}
        <div className={styles.monthNav}>
          <button
            type="button"
            className={styles.navButton}
            onClick={goToPrevMonth}
            aria-label="Предыдущий месяц"
          >
            <CaretLeft size={16} />
          </button>
          <span className={styles.monthLabel}>{monthLabel}</span>
          <button
            type="button"
            className={styles.navButton}
            onClick={goToNextMonth}
            aria-label="Следующий месяц"
          >
            <CaretRight size={16} />
          </button>
        </div>
      </div>

      <div className={styles.weekdays}>
        {WEEKDAYS.map((day) => (
          <span key={day} className={styles.weekday}>
            {day}
          </span>
        ))}
      </div>

      <div className={styles.grid}>
        {cells.map((cell) => {
          const count = taskCountByDate.get(cell.dateKey) ?? 0;
          const isSelected = selectedDate === cell.dateKey;
          const isToday = todayKey === cell.dateKey;

          return (
            <button
              key={`${cell.dateKey}-${cell.inCurrentMonth ? "current" : "other"}`}
              type="button"
              className={[
                styles.day,
                compact ? styles.dayCompact : "",
                !cell.inCurrentMonth ? styles.dayMuted : "",
                count > 0 ? styles.dayWithTasks : "",
                isSelected ? styles.daySelected : "",
                isToday ? styles.dayToday : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => handleDayClick(cell.dateKey)}
              aria-pressed={isSelected}
              aria-label={`${cell.day}, задач: ${count}`}
            >
              <span className={styles.dayNumber}>{cell.day}</span>
              {count > 0 && <span className={styles.taskDot}>{count}</span>}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <div className={styles.footer}>
          <span className={styles.footerText}>
            {parseDateKey(selectedDate).toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            {" · "}
            {selectedCount}{" "}
            {selectedCount === 1
              ? "задача"
              : selectedCount >= 2 && selectedCount <= 4
                ? "задачи"
                : "задач"}
          </span>
          <button
            type="button"
            className={styles.clearButton}
            onClick={() => (onClear ? onClear() : onSelectDate(null))}
          >
            Показать все
          </button>
        </div>
      )}
    </div>
  );
}
