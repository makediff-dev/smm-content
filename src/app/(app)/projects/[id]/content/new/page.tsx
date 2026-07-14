"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProjectsStore } from "@/stores/projects-store";
import { useWizardStore } from "@/stores/content-wizard-store";

export default function NewContentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const router = useRouter();
  const createContentUnit = useProjectsStore((s) => s.createContentUnit);
  const initWizard = useWizardStore((s) => s.initWizard);

  useEffect(() => {
    const contentId = createContentUnit(projectId);
    initWizard(projectId, contentId);
    router.replace(`/projects/${projectId}/content/${contentId}/wizard/format`);
  }, [projectId, createContentUnit, initWizard, router]);

  return null;
}
