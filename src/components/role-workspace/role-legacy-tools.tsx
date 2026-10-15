"use client";

import { StepFormat } from "@/components/wizard/step-format";
import { StepSource } from "@/components/wizard/step-source";
import { StepText } from "@/components/wizard/step-text";
import { DesignStep } from "@/components/wizard/design-step";
import { EditorCards } from "@/components/wizard/editor-cards";
import { GalleryStep } from "@/components/wizard/gallery-step";
import { VideoStep } from "@/components/wizard/video-step";
import { MemeDesignerStage } from "@/components/role-workspace/meme-designer-stage";
import { StepResult } from "@/components/wizard/step-result";
import { WizardStepProvider } from "@/components/wizard/wizard-step-context";
import { formatUsesCards, type ContentFormat, type WorkflowStage } from "@/types";
import { isEditorFinalReview } from "@/lib/workflow";
import wizardStyles from "@/components/wizard/wizard.module.css";
import styles from "./role-workspace.module.css";

interface RoleLegacyToolsProps {
  stage: WorkflowStage;
  format: ContentFormat;
  projectId: string;
  contentId: string;
  canOperate: boolean;
  designApproved?: boolean;
  canChangeFormat: boolean;
}

export function RoleLegacyTools({
  stage,
  format,
  projectId,
  contentId,
  canOperate,
  designApproved,
  canChangeFormat,
}: RoleLegacyToolsProps) {
  const readOnly = !canOperate;
  const showCards =
    formatUsesCards(format) || format === "text" || format === "video_meme";
  const editorFinal = isEditorFinalReview(format, stage, designApproved);

  return (
    <WizardStepProvider readOnly={readOnly} canEdit={canOperate}>
      <div className={`${wizardStyles.wizard} ${styles.legacyTools}`}>
        {stage === "copywriter" && canChangeFormat && <StepFormat />}
        {stage === "copywriter" && <StepSource />}
        {stage === "copywriter" && <StepText hideSource />}

        {stage === "designer" && showCards && <DesignStep />}
        {stage === "designer" && format === "video_meme" && (
          <MemeDesignerStage contentId={contentId} canEdit={canOperate} />
        )}

        {stage === "editor" && editorFinal && (format === "gallery" || format === "text") && (
          <GalleryStep />
        )}
        {stage === "editor" && !editorFinal && showCards && <EditorCards />}

        {stage === "video_editor" && canOperate && <VideoStep />}
        {stage === "video_editor" && !canOperate && (
          <p className={wizardStyles.sectionHint}>
            Озвучка и сборка ролика откроются, когда задачу примет дизайнер.
          </p>
        )}

        {stage === "project_manager" && (
          <StepResult projectId={projectId} contentId={contentId} />
        )}
      </div>
    </WizardStepProvider>
  );
}
