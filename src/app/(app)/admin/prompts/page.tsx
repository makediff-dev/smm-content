"use client";

import { useMemo, useState } from "react";
import { useSettingsStore } from "@/stores/settings-store";
import { AppShell } from "@/components/layout/app-shell";
import { useSearch } from "@/components/layout/search-context";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { PageSearchBar } from "@/components/shared/page-search-bar";
import { matchesSearch } from "@/lib/search";
import styles from "../admin.module.css";

type SettingsTab = "prompts" | "skills";

const SETTINGS_TABS = [
  { id: "prompts", label: "Промпты" },
  { id: "skills", label: "Скиллы" },
];

export default function PromptsPage() {
  const prompts = useSettingsStore((s) => s.prompts);
  const skills = useSettingsStore((s) => s.skills);
  const updatePrompt = useSettingsStore((s) => s.updatePrompt);
  const updateSkill = useSettingsStore((s) => s.updateSkill);

  const [activeTab, setActiveTab] = useState<SettingsTab>("prompts");
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [promptForm, setPromptForm] = useState({ name: "", description: "", text: "" });
  const [skillForm, setSkillForm] = useState({
    name: "",
    description: "",
    tools: "",
    instructions: "",
  });
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
    });
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
        <PageSearchBar />
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
    </AppShell>
  );
}
