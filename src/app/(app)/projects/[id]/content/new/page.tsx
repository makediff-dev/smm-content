"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWizardStore } from "@/stores/content-wizard-store";
import { useCreateContentWithWorkflow } from "@/hooks/use-create-content-with-workflow";

export default function NewContentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const router = useRouter();
  const createContentWithWorkflow = useCreateContentWithWorkflow(projectId);
  const initWizard = useWizardStore((s) => s.initWizard);

  useEffect(() => {
    const contentId = createContentWithWorkflow();
    initWizard(projectId, contentId);
    router.replace(`/projects/${projectId}/content/${contentId}/wizard/format`);
  }, [projectId, createContentWithWorkflow, initWizard, router]);

  return null;
}
