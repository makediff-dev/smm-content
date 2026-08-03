"use client";

import { useCallback, useState } from "react";
import type { StepConfirmContent } from "@/lib/step-confirm";

interface PendingConfirm {
  content: StepConfirmContent;
  onConfirm: () => void;
}

export function useStepConfirmModal() {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const requestConfirm = useCallback(
    (content: StepConfirmContent, onConfirm: () => void) => {
      setPending({ content, onConfirm });
    },
    []
  );

  const closeConfirm = useCallback(() => {
    setPending(null);
  }, []);

  const confirmPending = useCallback(() => {
    if (!pending) return;
    pending.onConfirm();
    setPending(null);
  }, [pending]);

  return {
    confirmContent: pending?.content ?? null,
    confirmOpen: pending !== null,
    requestConfirm,
    closeConfirm,
    confirmPending,
  };
}
