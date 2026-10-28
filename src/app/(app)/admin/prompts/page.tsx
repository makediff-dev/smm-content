"use client";

import { useMemo, useState } from "react";
import { useSettingsStore } from "@/stores/settings-store";
import { AppShell } from "@/components/layout/app-shell";
import { useSearch } from "@/components/layout/search-context";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Tabs } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { PageSearchBar } from "@/components/shared/page-search-bar";
import { matchesSearch } from "@/lib/search";
import type { PromptCategory, SkillCategory } from "@/types";
import styles from "../admin.module.css";

type SettingsTab = "prompts" | "skills";

const SETTINGS_TABS = [
  { id: "prompts", label: "Промпты" },
  { id: "skills", label: "Скиллы" },
];

const PROMPT_CATEGORY_OPTIONS = [
  { value: "extraction", label: "Извлечение" },
  { value: "post", label: "Пост" },
  { value: "card_phrases", label: "Карточки" },
  { value: "image_processing", label: "Изображения" },
  { value: "voiceover", label: "Озвучка" },
];

const SKILL_CATEGORY_OPTIONS = [
  { value: "extraction", label: "Извлечение" },
  { value: "generation", label: "Генерация" },
  { value: "visual", label: "Визуал" },
  { value: "assembly", label: "Сборка" },
];

const EMPTY_PROMPT_FORM = {
  name: "",
  description: "",
  text: "",
  category: "post" as PromptCategory,
};

const EMPTY_SKILL_FORM = {
  name: "",
  description: "",
  tools: "",
  instructions: "",
  category: "generation" as SkillCategory,
};

export default function PromptsPage() {
  const prompts = useSettingsStore((s) => s.prompts);
  const skills = useSettingsStore((s) => s.skills);
  const addPrompt = useSettingsStore((s) => s.addPrompt);
  const updatePrompt = useSettingsStore((s) => s.updatePrompt);
  const addSkill = useSettingsStore((s) => s.addSkill);
  const updateSkill = useSettingsStore((s) => s.updateSkill);

  const [activeTab, setActiveTab] = useState<SettingsTab>("prompts");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [promptForm, setPromptForm] = useState(EMPTY_PROMPT_FORM);
  const [skillForm, setSkillForm] = useState(EMPTY_SKILL_FORM);
  const [savedId, setSavedId] = useState<string | null>(null);
  const { query } = useSearch();

  const filteredPrompts = useMemo(
    () =>
      prompts.filter((prompt) =>
        matchesSearch(query, prompt.name, prompt.description, prompt.category, prompt.text)
      ),
    [prompts, query]
  );

  const filteredSkills = useMemo(
    () =>
      skills.filter((skill) =>
        matchesSearch(
          query,
          skill.name,
          skill.description,
          skill.category,
          skill.tools,
          skill.instructions
        )
      ),
    [skills, query]
  );

  const showSaved = (id: string) => {
    setSavedId(id);
    setTimeout(() => setSavedId(null), 2000);
  };

  const startPromptEdit = (id: string) => {
    const prompt = prompts.find((item) => item.id === id);
    if (!prompt) return;
    setEditingPromptId(id);
    setEditingSkillId(null);
    setPromptForm({
      name: prompt.name,
      description: prompt.description,
      text: prompt.text,
      category: prompt.category,
    });
  };

  const startSkillEdit = (id: string) => {
    const skill = skills.find((item) => item.id === id);
    if (!skill) return;
    setEditingSkillId(id);
    setEditingPromptId(null);
    setSkillForm({
      name: skill.name,
      description: skill.description,
      tools: skill.tools,
      instructions: skill.instructions,
      category: skill.category,
    });
  };

  const openCreate = () => {
    setEditingPromptId(null);
    setEditingSkillId(null);
    setPromptForm(EMPTY_PROMPT_FORM);
    setSkillForm(EMPTY_SKILL_FORM);
    setCreateOpen(true);
  };

  const handleCreate = () => {
    if (activeTab === "prompts") {
      if (!promptForm.name.trim() || !promptForm.text.trim()) return;
      const id = addPrompt({
        name: promptForm.name.trim(),
        description: promptForm.description.trim(),
        text: promptForm.text.trim(),
        category: promptForm.category,
        ownerId: "own",
      });
      setCreateOpen(false);
      showSaved(id);
      return;
    }

    if (!skillForm.name.trim() || !skillForm.instructions.trim()) return;
    const id = addSkill({
      name: skillForm.name.trim(),
      description: skillForm.description.trim(),
      tools: skillForm.tools.trim(),
      instructions: skillForm.instructions.trim(),
      category: skillForm.category,
    });
    setCreateOpen(false);
    showSaved(id);
  };

  const handlePromptSave = (id: string) => {
    updatePrompt(id, promptForm);
    setEditingPromptId(null);
    showSaved(id);
  };

  const handleSkillSave = (id: string) => {
    updateSkill(id, skillForm);
    setEditingSkillId(null);
    showSaved(id);
  };

  return (
    <AppShell breadcrumb="Настройки промптов">
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Настройки промптов</h1>
        <div className={styles.pageHeaderActions}>
          <PageSearchBar />
          <Button
            variant="muted"
            className={styles.headerCreate}
            onClick={openCreate}
          >
            {activeTab === "prompts" ? "Создать промпт" : "Создать скилл"}
          </Button>
        </div>
      </div>

      <Tabs
        tabs={SETTINGS_TABS}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as SettingsTab)}
      />

      {activeTab === "prompts" &&
        (filteredPrompts.length === 0 ? (
          <EmptyState
            title="Ничего не найдено"
            description="Попробуйте изменить запрос"
          />
        ) : (
          filteredPrompts.map((prompt) => (
          <div key={prompt.id} className={styles.promptCard}>
            <span className={styles.categoryTag}>{prompt.category}</span>
            {editingPromptId === prompt.id ? (
              <div className={styles.form}>
                <Input
                  label="Название"
                  value={promptForm.name}
                  onChange={(e) =>
                    setPromptForm((form) => ({ ...form, name: e.target.value }))
                  }
                  placeholder="Генерация поста"
                />
                <Input
                  label="Описание"
                  value={promptForm.description}
                  onChange={(e) =>
                    setPromptForm((form) => ({ ...form, description: e.target.value }))
                  }
                  placeholder="Кратко, для чего используется промпт"
                />
                <Textarea
                  label="Текст промпта"
                  value={promptForm.text}
                  onChange={(e) =>
                    setPromptForm((form) => ({ ...form, text: e.target.value }))
                  }
                  rows={4}
                  placeholder="Инструкции для AI: тон, длина, структура ответа..."
                />
                <div className={styles.promptActions}>
                  <Button onClick={() => handlePromptSave(prompt.id)}>Сохранить</Button>
                  <Button variant="ghost" onClick={() => setEditingPromptId(null)}>
                    Отмена
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className={styles.promptHeader}>
                  <div>
                    <div className={styles.promptName}>{prompt.name}</div>
                    <div className={styles.promptDesc}>{prompt.description}</div>
                  </div>
                  <div className={styles.promptActions}>
                    <Button variant="secondary" size="small" onClick={() => startPromptEdit(prompt.id)}>
                      Редактировать
                    </Button>
                    {savedId === prompt.id && (
                      <span className={styles.saved}>Сохранено</span>
                    )}
                  </div>
                </div>
                <Textarea value={prompt.text} readOnly rows={3} />
              </>
            )}
          </div>
          ))
        ))}

      {activeTab === "skills" &&
        (filteredSkills.length === 0 ? (
          <EmptyState
            title="Ничего не найдено"
            description="Попробуйте изменить запрос"
          />
        ) : (
          filteredSkills.map((skill) => (
          <div key={skill.id} className={styles.promptCard}>
            <span className={styles.categoryTag}>{skill.category}</span>
            {editingSkillId === skill.id ? (
              <div className={styles.form}>
                <Input
                  label="Название"
                  value={skillForm.name}
                  onChange={(e) =>
                    setSkillForm((form) => ({ ...form, name: e.target.value }))
                  }
                  placeholder="Извлечение из файла"
                />
                <Input
                  label="Описание"
                  value={skillForm.description}
                  onChange={(e) =>
                    setSkillForm((form) => ({ ...form, description: e.target.value }))
                  }
                  placeholder="Кратко, для чего используется скилл"
                />
                <Input
                  label="Инструменты"
                  value={skillForm.tools}
                  onChange={(e) =>
                    setSkillForm((form) => ({ ...form, tools: e.target.value }))
                  }
                  placeholder="pdf_reader, docx_parser, ocr"
                />
                <Textarea
                  label="Инструкции скилла"
                  value={skillForm.instructions}
                  onChange={(e) =>
                    setSkillForm((form) => ({ ...form, instructions: e.target.value }))
                  }
                  rows={4}
                  placeholder="Пошаговые инструкции для агента..."
                />
                <div className={styles.promptActions}>
                  <Button onClick={() => handleSkillSave(skill.id)}>Сохранить</Button>
                  <Button variant="ghost" onClick={() => setEditingSkillId(null)}>
                    Отмена
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className={styles.promptHeader}>
                  <div>
                    <div className={styles.promptName}>{skill.name}</div>
                    <div className={styles.promptDesc}>{skill.description}</div>
                    {skill.tools && (
                      <div className={styles.skillTools}>Инструменты: {skill.tools}</div>
                    )}
                  </div>
                  <div className={styles.promptActions}>
                    <Button variant="secondary" size="small" onClick={() => startSkillEdit(skill.id)}>
                      Редактировать
                    </Button>
                    {savedId === skill.id && (
                      <span className={styles.saved}>Сохранено</span>
                    )}
                  </div>
                </div>
                <Textarea value={skill.instructions} readOnly rows={3} />
              </>
            )}
          </div>
          ))
        ))}

      <Modal
        title={activeTab === "prompts" ? "Создать промпт" : "Создать скилл"}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                activeTab === "prompts"
                  ? !promptForm.name.trim() || !promptForm.text.trim()
                  : !skillForm.name.trim() || !skillForm.instructions.trim()
              }
            >
              Создать
            </Button>
          </>
        }
      >
        {activeTab === "prompts" ? (
          <div className={styles.form}>
            <Input
              label="Название"
              value={promptForm.name}
              onChange={(e) =>
                setPromptForm((form) => ({ ...form, name: e.target.value }))
              }
              placeholder="Генерация поста"
            />
            <Input
              label="Описание"
              value={promptForm.description}
              onChange={(e) =>
                setPromptForm((form) => ({ ...form, description: e.target.value }))
              }
              placeholder="Кратко, для чего используется промпт"
            />
            <Select
              label="Категория"
              options={PROMPT_CATEGORY_OPTIONS}
              value={promptForm.category}
              onChange={(e) =>
                setPromptForm((form) => ({
                  ...form,
                  category: e.target.value as PromptCategory,
                }))
              }
            />
            <Textarea
              label="Текст промпта"
              value={promptForm.text}
              onChange={(e) =>
                setPromptForm((form) => ({ ...form, text: e.target.value }))
              }
              rows={4}
              placeholder="Инструкции для AI: тон, длина, структура ответа..."
            />
          </div>
        ) : (
          <div className={styles.form}>
            <Input
              label="Название"
              value={skillForm.name}
              onChange={(e) =>
                setSkillForm((form) => ({ ...form, name: e.target.value }))
              }
              placeholder="Извлечение из файла"
            />
            <Input
              label="Описание"
              value={skillForm.description}
              onChange={(e) =>
                setSkillForm((form) => ({ ...form, description: e.target.value }))
              }
              placeholder="Кратко, для чего используется скилл"
            />
            <Select
              label="Категория"
              options={SKILL_CATEGORY_OPTIONS}
              value={skillForm.category}
              onChange={(e) =>
                setSkillForm((form) => ({
                  ...form,
                  category: e.target.value as SkillCategory,
                }))
              }
            />
            <Input
              label="Инструменты"
              value={skillForm.tools}
              onChange={(e) =>
                setSkillForm((form) => ({ ...form, tools: e.target.value }))
              }
              placeholder="pdf_reader, docx_parser, ocr"
            />
            <Textarea
              label="Инструкции скилла"
              value={skillForm.instructions}
              onChange={(e) =>
                setSkillForm((form) => ({ ...form, instructions: e.target.value }))
              }
              rows={4}
              placeholder="Пошаговые инструкции для агента..."
            />
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
