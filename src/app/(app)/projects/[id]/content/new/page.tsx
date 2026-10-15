"use client";

import { use, useEffect, useRef } from "react";
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
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const contentId = createContentWithWorkflow();
    initWizard(projectId, contentId);
    router.replace(`/projects/${projectId}/content/${contentId}`);
  }, [projectId, createContentWithWorkflow, initWizard, router]);

  return null;
}
