"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import {
  canUserApproveTask,
  canUserReturnTask,
  useWorkflowStore,
} from "@/stores/workflow-store";
import { useProjectsStore } from "@/stores/projects-store";
import type { ProductionTask, WorkflowStage } from "@/types";
import {
  getAssigneeName,
  getStageChain,
  getStageHint,
  getStageLabel,
  canUserActOnStage,
} from "@/lib/workflow";
import {
  getReturnTargetStages,
  isWorkflowOversightRole,
} from "@/lib/workflow-access";
import { getWorkflowStageConfirmContent } from "@/lib/step-confirm";
import { getRoleLabel } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { StepConfirmModal } from "@/components/shared/step-confirm-modal";
import { Select } from "@/components/ui/select";
import { PlaceholderImage } from "@/components/shared/placeholder-image";
import { useStepConfirmModal } from "@/hooks/use-step-confirm-modal";
import styles from "./workflow-panel.module.css";


function getStatusLabel(status: ProductionTask["status"]): string {
  if (status === "done") return "Завершено";
  if (status === "returned") return "Возвращено на доработку";
  return "В работе";
}

function getStatusClass(status: ProductionTask["status"]): string {
  if (status === "done") return styles.statusDone;
  if (status === "returned") return styles.statusReturned;
  return styles.statusInProgress;
}

interface WorkflowPanelProps {
  contentUnitId: string;
}

export function WorkflowPanel({ contentUnitId }: WorkflowPanelProps) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const users = useAuthStore((s) => s.users);
  const task = useWorkflowStore((s) => s.getTaskByContentId(contentUnitId));
  const approveStage = useWorkflowStore((s) => s.approveStage);
  const returnStage = useWorkflowStore((s) => s.returnStage);
  const addActionLog = useProjectsStore((s) => s.addActionLog);
  const content = useProjectsStore((s) => s.getContentUnit(contentUnitId));

  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnTarget, setReturnTarget] = useState<WorkflowStage>("copywriter");
  const [returnComment, setReturnComment] = useState("");
  const {
    confirmContent,
    confirmOpen,
    requestConfirm,
    closeConfirm,
    confirmPending,
  } = useStepConfirmModal();

  if (!task || !currentUser) return null;

  const chain = getStageChain(task.format);
  const currentIndex = chain.indexOf(task.currentStage);
  const returnTargetStages = getReturnTargetStages(currentUser, task);
  const canApprove = canUserApproveTask(currentUser, task);
  const canReturn =
    canUserReturnTask(currentUser, task) && returnTargetStages.length > 0;
  const isMyStage = canUserActOnStage(currentUser.role, task.currentStage);

  const handleApprove = () => {
    approveStage(task.id, currentUser, users, addActionLog);
  };

  const openApproveModal = () => {
    requestConfirm(
      getWorkflowStageConfirmContent(task.currentStage, task.format, {
        designApproved: task.designApproved,
        returnedByStage: task.returnedByStage,
      }),
      handleApprove
    );
  };

  const openReturnModal = () => {
    setReturnTarget(
      returnTargetStages[returnTargetStages.length - 1] ?? "copywriter"
    );
    setReturnComment("");
    setReturnModalOpen(true);
  };

  const handleReturn = () => {
    if (!returnComment.trim()) return;
    returnStage(
      task.id,
      returnTarget,
      returnComment.trim(),
      currentUser,
      users,
      addActionLog
    );
    setReturnModalOpen(false);
  };

  const wizardHref = content
    ? `/projects/${content.projectId}/content/${contentUnitId}`
    : null;

  return (
    <div className={styles.workflowPanel}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Цепочка производства</h3>
          <p className={styles.subtitle}>
            Сценарий: {task.scenario === "news" ? "Новость" : "На будущее"} ·{" "}
            Этап {currentIndex + 1} из {chain.length}
          </p>
        </div>
        <span className={`${styles.statusBadge} ${getStatusClass(task.status)}`}>
          {getStatusLabel(task.status)}
        </span>
      </div>

      <div className={styles.meta}>
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>Текущий этап</span>
          <span>{getStageLabel(task.currentStage)}</span>
        </div>
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>Ответственный</span>
          <span>{getAssigneeName(task.assigneeId, users)}</span>
        </div>
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>Ваша роль</span>
          <span>{getRoleLabel(currentUser.role)}</span>
        </div>
      </div>

      <p className={styles.hint}>{getStageHint(task.currentStage)}</p>

      {task.status === "returned" && task.returnComment && (
        <div className={styles.returnBox}>
          <div className={styles.returnLabel}>Комментарий при возврате</div>
          <p className={styles.returnText}>{task.returnComment}</p>
        </div>
      )}

      {task.currentStage === "editor" && content && content.format !== "text" && (
        <div className={styles.editorPreview}>
          <strong className={styles.editorPreviewTitle}>Превью 1080×1080</strong>
          <div className={styles.editorGrid}>
            {content.cards.slice(0, 6).map((card) => (
              <div key={card.id} className={styles.editorTile}>
                <PlaceholderImage
                  variant="square"
                  label={card.shortText.slice(0, 12)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {(canApprove || canReturn || wizardHref) && task.status !== "done" && (
        <div className={styles.actions}>
          {wizardHref && (
            <Link href={wizardHref}>
              <Button variant="secondary">
                {isMyStage || isWorkflowOversightRole(currentUser.role)
                  ? "Открыть этап в мастере"
                  : "Просмотреть этап"}
              </Button>
            </Link>
          )}
          {canApprove && (
            <Button onClick={openApproveModal}>
              {task.currentStage === "posting_manager"
                ? "Завершить производство"
                : "Подтвердить этап"}
            </Button>
          )}
          {canReturn && (
            <Button variant="ghost" onClick={openReturnModal}>
              Вернуть с комментарием
            </Button>
          )}
        </div>
      )}

      {!canApprove && !canReturn && task.status !== "done" && !isWorkflowOversightRole(currentUser.role) && (
        <p className={styles.roleNote}>
          Задача сейчас у {getAssigneeName(task.assigneeId, users)}. Вы можете
          просматривать материал, редактирование доступно только на вашем этапе.
        </p>
      )}

      <Modal
        title="Вернуть на предыдущий этап"
        open={returnModalOpen}
        onClose={() => setReturnModalOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setReturnModalOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleReturn} disabled={!returnComment.trim()}>
              Вернуть
            </Button>
          </>
        }
      >
        <div className={styles.modalFields}>
          <Select
            label="Этап"
            value={returnTarget}
            onChange={(event) =>
              setReturnTarget(event.target.value as WorkflowStage)
            }
            options={returnTargetStages.map((stage) => ({
              value: stage,
              label: getStageLabel(stage),
            }))}
          />
          <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
            Комментарий
            <textarea
              value={returnComment}
              onChange={(event) => setReturnComment(event.target.value)}
              rows={4}
              placeholder="Что нужно исправить?"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                fontFamily: "inherit",
                fontSize: 13,
                resize: "vertical",
              }}
            />
          </label>
        </div>
      </Modal>

      <StepConfirmModal
        open={confirmOpen}
        content={confirmContent}
        onClose={closeConfirm}
        onConfirm={confirmPending}
      />
    </div>
  );
}
