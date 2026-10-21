"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useProjectsStore } from "@/stores/projects-store";
import {
  canUserApproveTask,
  canUserReturnTask,
  useWorkflowStore,
} from "@/stores/workflow-store";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { StepConfirmModal } from "@/components/shared/step-confirm-modal";
import { useStepConfirmModal } from "@/hooks/use-step-confirm-modal";
import {
  getAdminShiftConfirmContent,
  getWorkflowStageConfirmContent,
} from "@/lib/step-confirm";
import { getReturnTargetStages } from "@/lib/workflow-access";
import {
  getAdminPathNeighbors,
  getAdminPathTargetLabel,
  getFormatPath,
  getPersonStageForPathIndex,
  isAiPathCurrent,
} from "@/lib/format-paths";
import {
  formatHasEditorFinalReview,
  getPreviousStages,
  getStageLabel,
} from "@/lib/workflow";
import { buildGeneratedPhotos } from "@/lib/workspace-generation";
import {
  hasPreviousStageVersion,
  isViewingPreviousVersion,
} from "@/lib/stage-versions";
import { getRoleLabel, isAdminRole } from "@/lib/roles";
import { formatTaskDeadlineLabel, isTaskDeadlineHot } from "@/lib/task-deadline";
import {
  buildScheduledAt,
  useContentPlanStore,
} from "@/stores/content-plan-store";
import {
  canUserOperateCurrentStage,
  getPinnedWorkspaceStage,
  getAutoChecks,
  getLatestComment,
  getWorkspaceChain,
  getWorkspaceStatusLabel,
  getChainView,
  canCollapseChain,
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
  ManagerPlan,
  ManagerPreview,
} from "@/components/role-workspace/manager-stage";
import {
  PostingPacks,
  PostingSide,
} from "@/components/role-workspace/posting-stage";
import { getDesignerSlides, getProblemSlideIndex } from "@/lib/designer-slides";
import {
  getPostingStatusLabel,
  resolvePostingSlot,
} from "@/lib/posting-packs";
import styles from "./role-workspace.module.css";

const AI_RETURN_VALUE = "__ai__";

interface ChainListProps {
  items: WorkspaceChainItem[];
  expanded: boolean;
  currentSuffix: string;
  viewingPathId?: string | null;
  onSelectStage?: (item: WorkspaceChainItem) => void;
  onToggle?: () => void;
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
  expanded,
  currentSuffix,
  viewingPathId,
  onSelectStage,
  onToggle,
}: ChainListProps) {
  const view = getChainView(items, expanded);
  const canCollapse = canCollapseChain(items);

  return (
    <>
      <ol className={styles.chain}>
        {view.map(({ item, skippedAfter }) => {
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
              } ${viewing && item.state !== "current" ? styles.chainViewing : ""} ${
                skippedAfter > 0 ? styles.chainGap : ""
              }`}
            >
              <span className={styles.chainMark} aria-hidden>
                {viewing
                  ? "●"
                  : item.state === "done"
                    ? "✓"
                    : "○"}
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
      {canCollapse && onToggle && (
        <button type="button" className={styles.chainToggle} onClick={onToggle}>
          {expanded ? "Свернуть этапы" : "Раскрыть все этапы"}
        </button>
      )}
    </>
  );
}

interface RoleWorkspaceProps {
  projectId: string;
  contentId: string;
}

export function RoleWorkspace({ projectId, contentId }: RoleWorkspaceProps) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const users = useAuthStore((s) => s.users);
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
  const [chainExpanded, setChainExpanded] = useState(false);
  const [compactStages, setCompactStages] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnTarget, setReturnTarget] = useState(AI_RETURN_VALUE);
  const [returnComment, setReturnComment] = useState("");
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
  const canReturn =
    task && currentUser ? canUserReturnTask(currentUser, task) : false;
  const waitingForFix = isWaitingForReturnedFix(currentUser, task);

  useEffect(() => {
    const page = pageRef.current;
    const media = window.matchMedia("(max-width: 1199px)");
    const update = () => {
      const narrowContainer = (page?.clientWidth ?? 0) <= 980;
      setCompactStages(media.matches || narrowContainer);
    };
    update();
    const observer = page ? new ResizeObserver(update) : null;
    observer?.observe(page as Element);
    media.addEventListener("change", update);
    return () => {
      observer?.disconnect();
      media.removeEventListener("change", update);
    };
  }, []);

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
  const previousPathTarget = pathNeighbors?.previous ?? null;
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
    setChainExpanded(false);
  }, [task?.id]);

  if (!currentUser) return null;

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
  const designerSlides = getDesignerSlides(content);
  const problemSlide = getProblemSlideIndex(designerSlides);
  const isManagerStage = stage === "project_manager";
  const isPlanVisit =
    isManagerStage &&
    (content.format !== "video_meme" ||
      Boolean(task.designApproved) ||
      isLastVisitOfStage(chain, viewPathId, "project_manager"));
  const isPostingStage = stage === "posting_manager";
  const postingSlot =
    isPostingStage || task.currentStage === "posting_manager"
      ? resolvePostingSlot(planSlots, content, task.updatedAt)
      : null;
  const canEdit = canOperate;
  const latestComment = task.returnComment
    ? `Возврат: ${task.returnComment}`
    : isManagerStage
      ? "Редактор: всё проверил, можно ставить"
      : getLatestComment(content) ??
        (stage === "designer"
          ? `Редактор: на ${problemSlide + 1}-м слайде текст на машине`
          : null);
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
    if (!isAdmin || !previousPathTarget) return;
    requestConfirm(
      getAdminShiftConfirmContent(
        currentPathLabel,
        getAdminPathTargetLabel(previousPathTarget),
        "back"
      ),
      () => {
        moveAlongPath(
          task.id,
          previousPathTarget,
          currentUser,
          users,
          addActionLog
        );
        if (previousPathTarget.type === "path") {
          setViewStage(
            getPersonStageForPathIndex(task.format, previousPathTarget.index)
          );
          setViewPathId(previousPathTarget.step.id);
        } else {
          setViewStage("posting_manager");
          setViewPathId(null);
        }
      }
    );
  };

  const handleMoveForward = () => {
    if (!isAdmin || !nextPathTarget) return;
    requestConfirm(
      getAdminShiftConfirmContent(
        currentPathLabel,
        getAdminPathTargetLabel(nextPathTarget),
        "forward"
      ),
      () => {
        moveAlongPath(
          task.id,
          nextPathTarget,
          currentUser,
          users,
          addActionLog
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
      }
    );
  };

  const handleApproveToPlan = (payload: {
    date: string;
    time: string;
    platforms: string[];
  }) => {
    addSlot({
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
    });
    captureStageVersion(contentId, task.currentStage);
    approveStage(task.id, currentUser, users, addActionLog);
    addActionLog(
      contentId,
      `Согласовано и в план: ${payload.date} ${payload.time}, ${payload.platforms.join(", ")}`,
      currentUser.name
    );
  };

  const handleManagerRework = (comment: string) => {
    if (!comment.trim()) return;
    const previous = getPreviousStages(task.format, task.currentStage, {
      designApproved: task.designApproved,
    });
    const target = previous[previous.length - 1] ?? task.currentStage;
    captureStageVersion(contentId, task.currentStage);
    returnStage(task.id, target, comment.trim(), currentUser, users, addActionLog);
  };

  const handleReturn = () => {
    if (!returnComment.trim()) return;
    captureStageVersion(contentId, task.currentStage);
    const target =
      returnTarget === AI_RETURN_VALUE ? task.currentStage : (returnTarget as WorkflowStage);
    const comment =
      returnTarget === AI_RETURN_VALUE
        ? `Нейросеть: ${returnComment.trim()}`
        : returnComment.trim();
    returnStage(task.id, target, comment, currentUser, users, addActionLog);
    setReturnOpen(false);
  };

  return (
    <AppShell projectId={projectId} breadcrumb={project.name}>
      <div className={styles.page} ref={pageRef}>
        <div className={styles.metaRow}>
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
          {(isAdmin || (!isPostingStage && !isPlanVisit)) && (
            <section
              className={`${styles.sideCard} ${styles.stagesCard}`}
              aria-label={isAdmin ? "Этапы" : "Цепочка"}
            >
              <h2 className={styles.sideTitle}>
                {isAdmin ? "Этапы" : "Цепочка"}
              </h2>
              <ChainList
                items={chain}
                expanded={isAdmin || chainExpanded || compactStages}
                currentSuffix={
                  compactStages
                    ? ""
                    : isAdmin
                      ? " — сейчас"
                      : canOperate
                        ? " — ты здесь"
                        : " — сейчас"
                }
                viewingPathId={isAdmin ? viewPathId : undefined}
                onSelectStage={isAdmin ? handleSelectStage : undefined}
                onToggle={
                  isAdmin || compactStages
                    ? undefined
                    : () => setChainExpanded((open) => !open)
                }
              />
              {isAdmin && (
                <div className={styles.adminMove}>
                  <Button
                    type="button"
                    variant="secondary"
                    fullWidth
                    onClick={handleGoBack}
                    disabled={!previousPathTarget}
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
            </section>
          )}

          <section className={styles.previewCard} aria-label="Результат">
            {isPostingStage && postingSlot ? (
              <PostingPacks content={content} slot={postingSlot} />
            ) : isManagerStage ? (
              <ManagerPreview content={content} task={task} />
            ) : stage === "editor" && content.format === "video_meme" ? (
              <EditorStage
                content={content}
                canEdit={canEdit}
                showVisuals
                onChange={(patch) => updateContentUnit(contentId, patch)}
              />
            ) : (
              <RoleLegacyTools
                stage={stage}
                format={content.format}
                projectId={projectId}
                contentId={contentId}
                canOperate={canOperate}
                designApproved={editorVisitIsFinal}
                canChangeFormat={
                  canOperate && (isAdmin || !content.formatConfirmed)
                }
              />
            )}

            {task.returnComment && !isPostingStage ? (
              <aside className={styles.returnNote} aria-label="Возврат">
                <p className={styles.kicker}>Возврат</p>
                <p className={styles.returnText}>{task.returnComment}</p>
              </aside>
            ) : latestComment && !isPostingStage ? (
              <p className={styles.comment}>{latestComment}</p>
            ) : null}
          </section>

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
            {canToggleVersion && (
              <Button
                type="button"
                variant="secondary"
                fullWidth
                onClick={() => toggleStageVersion(contentId, stage)}
              >
                {viewingPrevious ? "Новая версия" : "Прошлая версия"}
              </Button>
            )}
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
                content={content}
                canOperate={canOperate && !viewingOtherStage}
                alreadyDone={task.status === "done"}
                onApproveToPlan={handleApproveToPlan}
                onRework={handleManagerRework}
              />
            ) : (
              <>
            {waitingForFix ? (
              <p className={styles.waitNote}>
                Действия откроются, когда исправят возврат.
              </p>
            ) : canOperate && (task.status !== "done" || isAdmin) ? (
              <div className={styles.actions}>
                {canApprove && !viewingOtherStage && task.status !== "done" && (
                  <Button
                    onClick={() =>
                      requestConfirm(
                        getWorkflowStageConfirmContent(task.currentStage, task.format, {
                          designApproved: task.designApproved,
                        }),
                        handleApprove
                      )
                    }
                  >
                    Принять
                  </Button>
                )}
                {canReturn && !viewingOtherStage && (
                  <Button
                    variant="danger"
                    onClick={() => {
                      setReturnTarget(returnTargets[0] ?? AI_RETURN_VALUE);
                      setReturnComment("");
                      setReturnOpen(true);
                    }}
                  >
                    Вернуть
                  </Button>
                )}
              </div>
            ) : (
              <p className={styles.note}>
                Задача на этапе «{getStageLabel(task.currentStage)}». Ваша
                карточка остаётся здесь, правки откроются, когда этап снова
                будет у роли «{getRoleLabel(currentUser.role)}».
              </p>
            )}
              </>
            )}
          </div>
        </div>
      </div>

      <Modal
        title="Вернуть"
        open={returnOpen}
        onClose={() => setReturnOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setReturnOpen(false)}>
              Отмена
            </Button>
            <Button variant="danger" onClick={handleReturn} disabled={!returnComment.trim()}>
              Вернуть
            </Button>
          </>
        }
      >
        <div className={styles.modalFields}>
          <Select
            label="Кому"
            value={returnTarget}
            onChange={(event) => setReturnTarget(event.target.value)}
            options={[
              { value: AI_RETURN_VALUE, label: "Нейросеть" },
              ...returnTargets.map((item) => ({
                value: item,
                label: getStageLabel(item),
              })),
            ]}
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
