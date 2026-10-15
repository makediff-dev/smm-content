"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

interface WizardStepContextValue {
  readOnly: boolean;
  canEdit: boolean;
}

const WizardStepContext = createContext<WizardStepContextValue>({
  readOnly: false,
  canEdit: true,
});

interface WizardStepProviderProps {
  readOnly: boolean;
  canEdit: boolean;
  children: ReactNode;
}

export function WizardStepProvider({
  readOnly,
  canEdit,
  children,
}: WizardStepProviderProps) {
  return (
    <WizardStepContext.Provider value={{ readOnly, canEdit }}>
      {children}
    </WizardStepContext.Provider>
  );
}

export function useWizardStepContext() {
  return useContext(WizardStepContext);
}

export function useWizardStepDisabled(extraDisabled = false) {
  const { readOnly } = useWizardStepContext();
  return readOnly || extraDisabled;
}
