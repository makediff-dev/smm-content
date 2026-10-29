"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useProjectsStore } from "@/stores/projects-store";
import {
  canUserApproveTask,
  useWorkflowStore,
} from "@/stores/workflow-store";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { StepConfirmModal } from "@/components/shared/step-confirm-modal";
import { useStepConfirmModal } from "@/hooks/use-step-confirm-modal";
import { getWorkflowStageConfirmContent } from "@/lib/step-confirm";
import { getReturnTargetStages } from "@/lib/workflow-access";
import {
  getAdminPathNeighbors,
  getAdminPathTargetLabel,
  getAdminRollbackOptionLabel,
  getAdminRollbackTargets,
  getFormatPath,
  getPersonStageForPathIndex,
  isAiPathCurrent,
} from "@/lib/format-paths";
import {
  formatHasEditorFinalReview,
  getStageLabel,
} from "@/lib/workflow";
import { buildGeneratedPhotos } from "@/lib/workspace-generation";
import {
  hasPreviousStageVersion,
  isViewingPreviousVersion,
} from "@/lib/stage-versions";
import { getRoleLabel, isAdminRole } from "@/lib/roles";
import { useRequireProjectAccess } from "@/hooks/use-require-project-access";
import { formatTaskDeadlineLabel, isTaskDeadlineHot } from "@/lib/task-deadline";
import {
  buildScheduledAt,
  useContentPlanStore,
} from "@/stores/content-plan-store";
import {
  canUserOperateCurrentStage,
  getPinnedWorkspaceStage,
  getAutoChecks,
  getWorkspaceChain,
  getWorkspaceStatusLabel,
  isLastVisitOfStage,
  isWaitingForReturnedFix,
  type AutoCheckItem,
  type WorkspaceChainItem,
} from "@/lib/role-workspace";
import { FORMAT_LABELS, type WorkflowStage } from "@/types";
import { EditorStage } from "@/components/role-workspace/editor-stage";
import { RoleLegacyTools } from "@/components/role-workspace/role-legacy-tools";
import { useHydrateWizardFromContent } from "@/hooks/use-hydrate-wizard";
import {
  getDefaultManagerPlan,
  ManagerApprove,
  ManagerPlan,
  ManagerPreview,
  planFromSlot,
  type ManagerPlanPayload,
} from "@/components/role-workspace/manager-stage";
import {
  PostingPacks,
  PostingSide,
} from "@/components/role-workspace/posting-stage";
import { getDesignerSlides } from "@/lib/designer-slides";
import {
  getPostingStatusLabel,
  resolvePostingSlot,
} from "@/lib/posting-packs";
import styles from "./role-workspace.module.css";


interface ChainListProps {
  items: WorkspaceChainItem[];
  currentSuffix: string;
  viewingPathId?: string | null;
  onSelectStage?: (item: WorkspaceChainItem) => void;
}

function CheckList({ items }: { items: AutoCheckItem[] }) {
  return (
    <ul className={styles.checks}>
      {items.map((item) => (
        <li
          key={item.text}
          className={`${styles.checkItem} ${
            item.ok ? styles.checkOk : styles.checkWarn
          }`}
        >
          <span className={styles.checkMark} aria-hidden>
            {item.ok ? "✓" : "!"}
          </span>
          <span>{item.text}</span>
        </li>
      ))}
    </ul>
  );
}

function ChainList({
  items,
  currentSuffix,
  viewingPathId,
  onSelectStage,
}: ChainListProps) {
  return (
    <ol className={styles.chain}>
      {items.map((item) => {
        const viewing = viewingPathId
          ? viewingPathId === item.id
          : item.state === "current";
        const body = (
          <>
            {item.label}
            {item.state === "current" ? currentSuffix : ""}
            {viewing && item.state !== "current" ? " — просмотр" : ""}
            <span className={styles.chainHint}>{item.hint}</span>
          </>
        );

        return (
          <li
            key={item.id}
            className={`${styles.chainItem} ${
              item.kind === "ai" ? styles.chainAi : ""
            } ${
              viewing
                ? styles.chainCurrent
                : item.state === "done"
                  ? styles.chainDone
                  : ""
            } ${viewing && item.state !== "current" ? styles.chainViewing : ""}`}
          >
            <span className={styles.chainMark} aria-hidden>
              {viewing ? "●" : item.state === "done" ? "✓" : "○"}
            </span>
            {onSelectStage ? (
              <button
                type="button"
                className={styles.chainButton}
                onClick={() => onSelectStage(item)}
              >
                {body}
              </button>
            ) : (
              <span>{body}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

interface RoleWorkspaceProps {
  projectId: string;
  contentId: string;
}

export function RoleWorkspace({ projectId, contentId }: RoleWorkspaceProps) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const users = useAuthStore((s) => s.users);
  const canOpenProject = useRequireProjectAccess(projectId);
  const content = useProjectsStore((s) => s.getContentUnit(contentId));
  const project = useProjectsStore((s) => s.getProject(projectId));
  const updateContentUnit = useProjectsStore((s) => s.updateContentUnit);
  const addActionLog = useProjectsStore((s) => s.addActionLog);
  const captureStageVersion = useProjectsStore((s) => s.captureStageVersion);
  const toggleStageVersion = useProjectsStore((s) => s.toggleStageVersion);
  const task = useWorkflowStore((s) => s.getTaskByContentId(contentId));
  const approveStage = useWorkflowStore((s) => s.approveStage);
  const returnStage = useWorkflowStore((s) => s.returnStage);
  const moveAlongPath = useWorkflowStore((s) => s.moveAlongPath);
  const addSlot = useContentPlanStore((s) => s.addSlot);
  const planSlots = useContentPlanStore((s) => s.slots);

  const [viewStage, setViewStage] = useState<WorkflowStage | null>(null);
  const [viewPathId, setViewPathId] = useState<string | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnTarget, setReturnTarget] = useState("");
  const [returnComment, setReturnComment] = useState("");
  const [rollbackOpen, setRollbackOpen] = useState(false);
  const [rollbackTargetKey, setRollbackTargetKey] = useState("");
  const [rollbackComment, setRollbackComment] = useState("");
  const [forwardOpen, setForwardOpen] = useState(false);
  const [forwardComment, setForwardComment] = useState("");
  const [planDraft, setPlanDraft] = useState<ManagerPlanPayload | null>(null);
  const {
    confirmContent,
    confirmOpen,
    requestConfirm,
    closeConfirm,
    confirmPending,
  } = useStepConfirmModal();

  const isAdmin = Boolean(currentUser && isAdminRole(currentUser.role));
  const canOperate = canUserOperateCurrentStage(currentUser, task);
  const activeStage = getPinnedWorkspaceStage(
    currentUser,
    task,
    isAdmin ? viewStage : null
  );
  const versionView =
    content && activeStage
      ? (content.stageVersions?.[activeStage]?.viewing ?? "current")
      : "current";
  useHydrateWizardFromContent(
    projectId,
    contentId,
    content,
    activeStage,
    `${activeStage ?? "none"}:${versionView}`
  );
  const canApprove =
    task && currentUser ? canUserApproveTask(currentUser, task) : false;
  const returnTargets =
    task && currentUser ? getReturnTargetStages(currentUser, task) : [];
  const waitingForFix = isWaitingForReturnedFix(currentUser, task);

  const chain = useMemo(
    () =>
      task
        ? getWorkspaceChain(task.format, task.currentStage, {
            hasText: Boolean(content?.postText.trim()),
            isComplete: task.status === "done",
            designApproved: task.designApproved,
            pathId: task.currentPathId,
          })
        : [],
    [task, content]
  );
  const viewingPathItem = chain.find((item) => item.id === viewPathId);
  const viewingOtherStage = Boolean(
    isAdmin &&
      ((viewingPathItem && viewingPathItem.state !== "current") ||
        (!viewPathId && activeStage && task && activeStage !== task.currentStage))
  );
  const editorVisitIsFinal = Boolean(
    activeStage === "editor" &&
      content &&
      formatHasEditorFinalReview(content.format) &&
      isLastVisitOfStage(chain, viewPathId, "editor")
  );
  const pathNeighbors = task
    ? getAdminPathNeighbors(task.format, task.currentStage, {
        hasText: Boolean(content?.postText.trim()),
        isComplete: task.status === "done",
        designApproved: task.designApproved,
        pathId: task.currentPathId,
      })
    : null;
  const nextPathTarget = pathNeighbors?.next ?? null;
  const rollbackTargets = useMemo(() => {
    if (!task) return [];
    return getAdminRollbackTargets(task.format, task.currentStage, {
      hasText: Boolean(content?.postText.trim()),
      isComplete: task.status === "done",
      designApproved: task.designApproved,
      pathId: task.currentPathId,
    });
  }, [task, content?.postText]);
  const currentPathLabel = task
    ? (getFormatPath(task.format).find((step) => step.id === task.currentPathId)
        ?.label ?? getStageLabel(task.currentStage))
    : "";
  const aiWorking = Boolean(
    task &&
      isAiPathCurrent(task.format, task.currentStage, task.currentPathId)
  );
  const checks = useMemo(
    () =>
      content && activeStage
        ? getAutoChecks(content, activeStage, {
            designApproved:
              activeStage === "editor"
                ? editorVisitIsFinal
                : task?.designApproved,
          })
        : [],
    [content, activeStage, task, editorVisitIsFinal]
  );

  useEffect(() => {
    if (task) setViewStage(task.currentStage);
    setViewPathId(null);
  }, [task?.id]);

  if (!currentUser || !canOpenProject) return null;

  if (!content || !project || !task) {
    return (
      <AppShell projectId={projectId} breadcrumb="Задача">
        <p>Задача не найдена</p>
      </AppShell>
    );
  }

  const stage = activeStage ?? task.currentStage;
  const canToggleVersion = hasPreviousStageVersion(content, stage);
  const viewingPrevious = isViewingPreviousVersion(content, stage);
  const isReturned = task.status === "returned";
  const isManagerStage = stage === "project_manager";
  const isPlanVisit =
    isManagerStage &&
    (Boolean(task.designApproved) ||
      isLastVisitOfStage(chain, viewPathId, "project_manager"));
  const isPostingStage = stage === "posting_manager";
  const postingSlot =
    isPostingStage || task.currentStage === "posting_manager"
      ? resolvePostingSlot(planSlots, content, task.updatedAt)
      : null;
  const canEdit = canOperate;
  const existingPlanSlot = planSlots.find(
    (slot) => slot.contentUnitId === contentId && !slot.archived
  ) ?? planSlots.find((slot) => slot.contentUnitId === contentId);
  const planValue =
    planDraft ??
    (existingPlanSlot
      ? planFromSlot(existingPlanSlot)
      : getDefaultManagerPlan(content));
  const alreadyArchived = planSlots.some(
    (slot) => slot.contentUnitId === contentId && Boolean(slot.archived)
  );
  const alreadyPlanned = task.status === "done";
  const statusClass = isReturned ? styles.badgeReturned : styles.badgeStatus;

  const handleApprove = () => {
    if (viewingOtherStage) return;
    captureStageVersion(contentId, task.currentStage);
    if (
      content.format === "text" &&
      task.currentStage === "editor" &&
      !task.designApproved
    ) {
      const slides =
        content.cards.length > 0 ? content.cards : getDesignerSlides(content);
      if (!slides.some((slide) => slide.imageUrl)) {
        updateContentUnit(contentId, {
          cards: buildGeneratedPhotos(slides, content.id, content.format),
        });
      }
    }
    approveStage(task.id, currentUser, users, addActionLog);
  };

  const handleSelectStage = (item: WorkspaceChainItem) => {
    setViewStage(item.stage ?? task.currentStage);
    setViewPathId(item.id);
  };

  const handleGoBack = () => {
    if (!isAdmin || rollbackTargets.length === 0) return;
    setRollbackTargetKey(String(rollbackTargets[0].index));
    setRollbackComment("");
    setRollbackOpen(true);
  };

  const handleConfirmRollback = () => {
    if (!isAdmin) return;
    const target = rollbackTargets.find(
      (item) => String(item.index) === rollbackTargetKey
    );
    if (!target) return;
    moveAlongPath(
      task.id,
      target,
      currentUser,
      users,
      addActionLog,
      rollbackComment
    );
    setViewStage(getPersonStageForPathIndex(task.format, target.index));
    setViewPathId(target.step.id);
    setRollbackOpen(false);
    setRollbackComment("");
  };

  const handleMoveForward = () => {
    if (!isAdmin || !nextPathTarget) return;
    setForwardComment("");
    setForwardOpen(true);
  };

  const handleConfirmForward = () => {
    if (!isAdmin || !nextPathTarget) return;
    moveAlongPath(
      task.id,
      nextPathTarget,
      currentUser,
      users,
      addActionLog,
      forwardComment
    );
    if (nextPathTarget.type === "path") {
      setViewStage(
        getPersonStageForPathIndex(task.format, nextPathTarget.index)
      );
      setViewPathId(nextPathTarget.step.id);
    } else {
      setViewStage("posting_manager");
      setViewPathId(null);
    }
    setForwardOpen(false);
    setForwardComment("");
  };

  const buildPlanSlot = (payload: {
    date: string;
    time: string;
    platforms: string[];
    archived?: boolean;
  }) => ({
    projectId,
    contentUnitId: contentId,
    scheduledAt: buildScheduledAt(payload.date, payload.time),
    title: content.title,
    format: content.format,
    scenario: task.scenario,
    comment: "",
    platforms: payload.platforms,
    hasText: Boolean(content.postText.trim()),
    hasZip: content.buildOptions.prepareArchive,
    hasVisual:
      content.cards.length > 0 ||
      content.format === "slideshow" ||
      content.format === "video_meme" ||
      content.format === "gallery",
    archived: payload.archived,
    archivedAt: payload.archived ? new Date().toISOString() : undefined,
  });

  const handleApproveToPlan = (payload: {
    date: string;
    time: string;
    platforms: string[];
  }) => {
    addSlot(buildPlanSlot(payload));
    captureStageVersion(contentId, task.currentStage);
    approveStage(task.id, currentUser, users, addActionLog);
    addActionLog(
      contentId,
      `В КП: ${payload.date} ${payload.time}, ${payload.platforms.join(", ")}`,
      currentUser.name
    );
  };

  const handleArchiveFromPlan = (payload: {
    date: string;
    time: string;
    platforms: string[];
  }) => {
    addSlot(buildPlanSlot({ ...payload, archived: true }));
    captureStageVersion(contentId, task.currentStage);
    approveStage(task.id, currentUser, users, addActionLog);
    addActionLog(contentId, "Отправлено в архив", currentUser.name);
  };

  const openReturnModal = () => {
    setReturnTarget(returnTargets[returnTargets.length - 1] ?? "");
    setReturnComment("");
    setReturnOpen(true);
  };

  const handleReturn = () => {
    if (!returnComment.trim() || !returnTarget) return;
    captureStageVersion(contentId, task.currentStage);
    returnStage(
      task.id,
      returnTarget as WorkflowStage,
      returnComment.trim(),
      currentUser,
      users,
      addActionLog
    );
    setReturnOpen(false);
  };

  return (
    <AppShell projectId={projectId} breadcrumb={project.name}>
      <div className={styles.page} ref={pageRef}>
        <div className={styles.metaRow}>
          <span className={styles.badge}>{project.name}</span>
          <span className={styles.badge}>{FORMAT_LABELS[content.format]}</span>
          <span
            className={`${styles.badge} ${
              isPostingStage && task.status !== "done"
                ? styles.badgePlan
                : statusClass
            }`}
          >
            {isPostingStage
              ? getPostingStatusLabel(task.status, postingSlot?.scheduledAt)
              : getWorkspaceStatusLabel(task.status, stage, { aiWorking })}
          </span>
          <span
            className={`${styles.badge} ${
              isTaskDeadlineHot(task) ? styles.badgeReturned : styles.badgeLater
            }`}
          >
            {formatTaskDeadlineLabel(task)}
          </span>
        </div>

        <h1 className={styles.title}>{content.title}</h1>
        {viewingPrevious && (
          <p className={styles.comment}>Показана прошлая версия этого этапа</p>
        )}

        <div className={styles.layout}>
          <section className={styles.previewCard} aria-label="Результат">
            {isPostingStage && postingSlot ? (
              <PostingPacks content={content} slot={postingSlot} />
            ) : isManagerStage ? (
              <ManagerPreview
                content={content}
                task={task}
                visit={isPlanVisit ? "full" : "text"}
              />
            ) : stage === "editor" ? (
              <EditorStage
                content={content}
                canEdit={canEdit}
                showVisuals={
                  content.format === "video_meme" || editorVisitIsFinal
                }
                onChange={(patch) => updateContentUnit(contentId, patch)}
              />
            ) : (
              <RoleLegacyTools
                stage={stage}
                format={content.format}
                projectId={projectId}
                contentId={contentId}
                canOperate={canOperate}
                canChangeFormat={
                  canOperate && (isAdmin || !content.formatConfirmed)
                }
              />
            )}

            {task.returnComment && !isPostingStage ? (
              <aside className={styles.returnNote} aria-label="Комментарий">
                <p className={styles.kicker}>
                  {task.status === "returned" ? "Возврат" : "Комментарий"}
                </p>
                <p className={styles.returnText}>{task.returnComment}</p>
              </aside>
            ) : null}
          </section>

          <div className={styles.sideColumn}>
            {canToggleVersion && (
              <Button
                type="button"
                variant="secondary"
                fullWidth
                className={styles.versionToggle}
                onClick={() => toggleStageVersion(contentId, stage)}
              >
                {viewingPrevious ? "Новая версия" : "Прошлая версия"}
              </Button>
            )}
          {(isAdmin || !isPostingStage) && (
            <section
              className={`${styles.sideCard} ${styles.stagesCard}`}
              aria-label={isAdmin ? "Этапы" : "Цепочка"}
            >
              <h2 className={styles.sideTitle}>
                {isAdmin ? "Этапы" : "Цепочка"}
              </h2>
              <ChainList
                items={chain}
                currentSuffix={
                  isAdmin
                    ? " — сейчас"
                    : canOperate
                      ? " — ты здесь"
                      : " — сейчас"
                }
                viewingPathId={isAdmin ? viewPathId : undefined}
                onSelectStage={isAdmin ? handleSelectStage : undefined}
              />
              {isAdmin && (
                <div className={styles.adminMove}>
                  <Button
                    type="button"
                    variant="secondary"
                    fullWidth
                    onClick={handleGoBack}
                    disabled={rollbackTargets.length === 0}
                  >
                    Вернуться
                  </Button>
                  <Button
                    fullWidth
                    onClick={handleMoveForward}
                    disabled={!nextPathTarget}
                    title={
                      nextPathTarget
                        ? `Переместить на «${getAdminPathTargetLabel(nextPathTarget)}»`
                        : "Дальше по текущей цепочке некуда"
                    }
                  >
                    Переместить далее
                  </Button>
                  <p className={styles.note}>
                    Задача сейчас на этапе «{currentPathLabel}». Сдвиг только на
                    соседний шаг цепочки, без перескока.
                  </p>
                </div>
              )}
              {!isPostingStage && (
                waitingForFix ? (
                  <p className={styles.waitNote}>
                    Действия откроются, когда исправят возврат.
                  </p>
                ) : canOperate && (task.status !== "done" || isAdmin) ? (
                  <div className={styles.actions}>
                    {isPlanVisit && !viewingOtherStage && task.status !== "done" ? null : isManagerStage &&
                      canApprove &&
                      !viewingOtherStage &&
                      task.status !== "done" ? (
                      <Button
                        onClick={() =>
                          requestConfirm(
                            getWorkflowStageConfirmContent(
                              task.currentStage,
                              task.format,
                              {
                                designApproved: task.designApproved,
                                returnedByStage: task.returnedByStage,
                              }
                            ),
                            handleApprove
                          )
                        }
                      >
                        Согласовать
                      </Button>
                    ) : (
                      canApprove &&
                      !viewingOtherStage &&
                      task.status !== "done" && (
                        <Button
                          onClick={() =>
                            requestConfirm(
                              getWorkflowStageConfirmContent(
                                task.currentStage,
                                task.format,
                                {
                                  designApproved: task.designApproved,
                                  returnedByStage: task.returnedByStage,
                                }
                              ),
                              handleApprove
                            )
                          }
                        >
                          Принять
                        </Button>
                      )
                    )}
                    {!viewingOtherStage &&
                      task.status !== "done" &&
                      returnTargets.length > 0 && (
                      <Button variant="danger" onClick={openReturnModal}>
                        Вернуть
                      </Button>
                    )}
                  </div>
                ) : (
                  <p className={styles.note}>
                    {alreadyPlanned && isPlanVisit
                      ? alreadyArchived
                        ? "Уже в архиве."
                        : "Уже в КП."
                      : `Задача на этапе «${getStageLabel(task.currentStage)}». Ваша карточка остаётся здесь, правки откроются, когда этап снова будет у роли «${getRoleLabel(currentUser.role)}».`}
                  </p>
                )
              )}
            </section>
          )}

          {!isPostingStage && !isPlanVisit && (
            <section
              className={`${styles.sideCard} ${styles.checksCard}`}
              aria-label="Автопроверка"
            >
              <h2 className={styles.sideTitle}>Автопроверка</h2>
              <CheckList items={checks} />
            </section>
          )}

          <div className={styles.sideStack}>
            {isPostingStage && postingSlot ? (
              <PostingSide
                content={content}
                slot={postingSlot}
                canOperate={canOperate && !viewingOtherStage}
                alreadyPosted={task.status === "done"}
                onMarkPosted={handleApprove}
              />
            ) : isPlanVisit ? (
              <ManagerPlan
                value={planValue}
                canOperate={canOperate && !viewingOtherStage}
                alreadyDone={alreadyPlanned}
                alreadyArchived={alreadyArchived}
                onChange={setPlanDraft}
                onApprove={() => handleApproveToPlan(planValue)}
                onArchive={() => handleArchiveFromPlan(planValue)}
              />
            ) : isManagerStage ? (
              <ManagerApprove format={content.format} />
            ) : null}
          </div>
          </div>
        </div>
      </div>

      <Modal
        title="Откатить задачу?"
        open={rollbackOpen}
        onClose={() => setRollbackOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRollbackOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleConfirmRollback}
              disabled={!rollbackTargetKey}
            >
              Вернуться
            </Button>
          </>
        }
      >
        <div className={styles.modalFields}>
          <p className={styles.note}>
            Можно вернуть проверяющему или отправить задачу на любой пройденный
            этап цепочки.
          </p>
          <Select
            label="На какой этап вернуть"
            value={rollbackTargetKey}
            onChange={(event) => setRollbackTargetKey(event.target.value)}
            options={rollbackTargets.map((item) => ({
              value: String(item.index),
              label: getAdminRollbackOptionLabel(item),
            }))}
          />
          <Textarea
            label="Комментарий"
            rows={4}
            placeholder="Что исправить или почему переносите"
            value={rollbackComment}
            onChange={(event) => setRollbackComment(event.target.value)}
          />
        </div>
      </Modal>

      <Modal
        title="Переместить задачу дальше?"
        open={forwardOpen}
        onClose={() => setForwardOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setForwardOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleConfirmForward} disabled={!nextPathTarget}>
              Переместить далее
            </Button>
          </>
        }
      >
        <div className={styles.modalFields}>
          <p className={styles.note}>
            Задача перейдёт на этап «
            {nextPathTarget ? getAdminPathTargetLabel(nextPathTarget) : ""}».
          </p>
          <Textarea
            label="Комментарий"
            rows={4}
            placeholder="Можно коротко написать, зачем переносите"
            value={forwardComment}
            onChange={(event) => setForwardComment(event.target.value)}
          />
        </div>
      </Modal>

      <Modal
        title="Вернуть"
        open={returnOpen}
        onClose={() => setReturnOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setReturnOpen(false)}>
              Отмена
            </Button>
            <Button
              variant="danger"
              onClick={handleReturn}
              disabled={!returnComment.trim() || !returnTarget}
            >
              Вернуть
            </Button>
          </>
        }
      >
        <div className={styles.modalFields}>
          <p className={styles.note}>
            После исправления задача вернётся вам, минуя этапы между.
          </p>
          <Select
            label="Кому"
            value={returnTarget}
            onChange={(event) => setReturnTarget(event.target.value)}
            options={returnTargets.map((item) => ({
              value: item,
              label: getStageLabel(item),
            }))}
          />
          <Textarea
            label="Что не так"
            value={returnComment}
            rows={4}
            placeholder="Коротко: что исправить"
            onChange={(event) => setReturnComment(event.target.value)}
          />
        </div>
      </Modal>

      <StepConfirmModal
        open={confirmOpen}
        content={confirmContent}
        onClose={closeConfirm}
        onConfirm={confirmPending}
      />
    </AppShell>
  );
}
