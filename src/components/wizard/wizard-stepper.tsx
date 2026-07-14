"use client";

import { getWizardStepsForFormat, type ContentFormat, type WizardStep } from "@/types";
import styles from "./wizard-stepper.module.css";

interface WizardStepperProps {
  format: ContentFormat;
  currentStep: WizardStep;
  onStepClick?: (step: WizardStep) => void;
  completedSteps?: WizardStep[];
}

export function WizardStepper({
  format,
  currentStep,
  onStepClick,
  completedSteps = [],
}: WizardStepperProps) {
  const steps = getWizardStepsForFormat(format);
  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className={styles.stepper}>
      {steps.map((step, index) => {
        const isActive = step.id === currentStep;
        const isCompleted = completedSteps.includes(step.id);
        const isClickable =
          onStepClick && (isCompleted || index <= currentIndex);

        return (
          <div
            key={step.id}
            className={`${styles.step} ${isActive ? styles.active : ""} ${isCompleted ? styles.completed : ""} ${isClickable ? styles.clickable : ""}`}
            onClick={() => isClickable && onStepClick?.(step.id)}
          >
            <div className={styles.dot}>{index + 1}</div>
            <span className={styles.label}>{step.label}</span>
            {index < steps.length - 1 && (
              <div className={styles.connector} />
            )}
          </div>
        );
      })}
    </div>
  );
}
