"use client";

import { Button } from "@/components/ui/button";
import styles from "./wizard-step-navigation.module.css";

interface WizardStepNavigationProps {
  readOnly: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
}

export function WizardStepNavigation({
  readOnly,
  canGoBack,
  canGoForward,
  onBack,
  onForward,
}: WizardStepNavigationProps) {
  return (
    <div className={styles.stepNav}>
      <Button variant="ghost" onClick={onBack} disabled={!canGoBack}>
        ← Назад
      </Button>
      <Button
        variant={readOnly ? "ghost" : "primary"}
        onClick={onForward}
        disabled={!canGoForward}
      >
        Вперёд →
      </Button>
    </div>
  );
}
