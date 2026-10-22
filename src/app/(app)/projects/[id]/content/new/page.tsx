"use client";

import { use, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useWizardStore } from "@/stores/content-wizard-store";
import { useCreateContentWithWorkflow } from "@/hooks/use-create-content-with-workflow";
import { canAccessProject, canCreateProductionTask } from "@/lib/roles";

export default function NewContentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.currentUser);
  const createContentWithWorkflow = useCreateContentWithWorkflow(projectId);
  const initWizard = useWizardStore((s) => s.initWizard);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (
      !currentUser ||
      !canCreateProductionTask(currentUser.role) ||
      !canAccessProject(currentUser, projectId)
    ) {
      router.replace("/projects");
      return;
    }

    const contentId = createContentWithWorkflow();
    if (!contentId) {
      router.replace(`/projects/${projectId}`);
      return;
    }
    initWizard(projectId, contentId);
    router.replace(`/projects/${projectId}/content/${contentId}`);
  }, [projectId, currentUser, createContentWithWorkflow, initWizard, router]);

  return null;
}
