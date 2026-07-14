"use client";

import { useState } from "react";
import { useSettingsStore } from "@/stores/settings-store";
import { AppShell } from "@/components/layout/app-shell";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import styles from "../admin.module.css";

export default function PromptsPage() {
  const prompts = useSettingsStore((s) => s.prompts);
  const updatePrompt = useSettingsStore((s) => s.updatePrompt);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "", text: "" });
  const [savedId, setSavedId] = useState<string | null>(null);

  const startEdit = (id: string) => {
    const prompt = prompts.find((p) => p.id === id);
    if (!prompt) return;
    setEditingId(id);
    setEditForm({
      name: prompt.name,
      description: prompt.description,
      text: prompt.text,
    });
  };

  const handleSave = (id: string) => {
    updatePrompt(id, editForm);
    setEditingId(null);
    setSavedId(id);
    setTimeout(() => setSavedId(null), 2000);
  };

  return (
    <AppShell breadcrumb="Настройки промптов">
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Настройки промптов</h1>
      </div>

      {prompts.map((prompt) => (
        <div key={prompt.id} className={styles.promptCard}>
          <span className={styles.categoryTag}>{prompt.category}</span>
          {editingId === prompt.id ? (
            <div className={styles.form}>
              <Input
                label="Название"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Генерация поста"
              />
              <Input
                label="Описание"
                value={editForm.description}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Кратко, для чего используется промпт"
              />
              <Textarea
                label="Текст промпта"
                value={editForm.text}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, text: e.target.value }))
                }
                rows={4}
                placeholder="Инструкции для AI: тон, длина, структура ответа..."
              />
              <div className={styles.promptActions}>
                <Button onClick={() => handleSave(prompt.id)}>Сохранить</Button>
                <Button variant="ghost" onClick={() => setEditingId(null)}>
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
                  <Button variant="secondary" size="small" onClick={() => startEdit(prompt.id)}>
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
      ))}
    </AppShell>
  );
}
