"use client";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { StepConfirmContent } from "@/lib/step-confirm";
import styles from "./step-confirm-modal.module.css";

interface StepConfirmModalProps {
  open: boolean;
  content: StepConfirmContent | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function StepConfirmModal({
  open,
  content,
  onClose,
  onConfirm,
}: StepConfirmModalProps) {
  if (!content) return null;

  return (
    <Modal
      title={content.title}
      open={open}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {content.cancelLabel ?? "Отмена"}
          </Button>
          <Button onClick={onConfirm}>{content.confirmLabel}</Button>
        </>
      }
    >
      <p className={styles.description}>{content.description}</p>
    </Modal>
  );
}
