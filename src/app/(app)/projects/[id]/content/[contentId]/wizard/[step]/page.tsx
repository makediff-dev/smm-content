import { redirect } from "next/navigation";
import type { WizardStep } from "@/types";

const VALID_STEPS: WizardStep[] = ["format", "source", "text", "cards", "build", "result"];

export default async function WizardPage({
  params,
}: {
  params: Promise<{ id: string; contentId: string; step: string }>;
}) {
  const { id, contentId, step } = await params;

  if (!VALID_STEPS.includes(step as WizardStep)) {
    redirect(`/projects/${id}/content/${contentId}/wizard/format`);
  }

  const { ContentWizard } = await import("@/components/wizard/content-wizard");

  return (
    <ContentWizard
      projectId={id}
      contentId={contentId}
      step={step as WizardStep}
    />
  );
}
