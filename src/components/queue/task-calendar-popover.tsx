"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarBlank } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { TaskCalendar } from "@/components/queue/task-calendar";
import { formatDateKey } from "@/lib/simulate-generation";
import styles from "./task-calendar-popover.module.css";

interface TaskCalendarPopoverProps {
  tasks: Array<{ createdAt: string }>;
  selectedDate: string | null;
  onSelectDate: (dateKey: string | null) => void;
}

export function TaskCalendarPopover({
  tasks,
  selectedDate,
  onSelectDate,
}: TaskCalendarPopoverProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const handleSelectDate = (dateKey: string | null) => {
    onSelectDate(dateKey);
  };

  return (
    <div className={styles.root} ref={rootRef}>
      <Button
        variant={selectedDate ? "primary" : "secondary"}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <CalendarBlank size={18} />
        {selectedDate ? formatDateKey(selectedDate) : "Календарь"}
      </Button>

      {open && (
        <div className={styles.popover} role="dialog" aria-label="Календарь задач">
          <TaskCalendar
            compact
            tasks={tasks}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            onClear={() => {
              onSelectDate(null);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
