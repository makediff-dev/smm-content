"use client";

import { useState } from "react";
import { useSettingsStore } from "@/stores/settings-store";
import { useAuthStore } from "@/stores/auth-store";
import { useProjectsStore } from "@/stores/projects-store";
import { useQueueStore } from "@/stores/queue-store";
import { SEED_USERS, SEED_PROJECTS, SEED_CONTENT, SEED_QUEUE, SEED_PROMPTS, SEED_AI_SETTINGS } from "@/data/seed";
import { AppShell } from "@/components/layout/app-shell";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { AIProvider } from "@/types";
import styles from "../admin.module.css";

const PROVIDER_OPTIONS = [
  { value: "openrouter", label: "OpenRouter" },
  { value: "router_ai", label: "Router.ai" },
  { value: "other", label: "Другое" },
];

export default function AIModelsPage() {
  const aiSettings = useSettingsStore((s) => s.aiSettings);
  const updateAISettings = useSettingsStore((s) => s.updateAISettings);
  const testConnection = useSettingsStore((s) => s.testConnection);

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleResetDemo = () => {
    useAuthStore.setState({ users: SEED_USERS, currentUser: useAuthStore.getState().currentUser });
    useProjectsStore.setState({ projects: SEED_PROJECTS, contentUnits: SEED_CONTENT });
    useQueueStore.setState({ tasks: SEED_QUEUE });
    useSettingsStore.setState({ prompts: SEED_PROMPTS, aiSettings: SEED_AI_SETTINGS });
    alert("Демо-данные сброшены");
  };

  return (
    <AppShell breadcrumb="Настройки AI-моделей">
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Настройки AI-моделей</h1>
      </div>

      <div className={styles.form} style={{ maxWidth: 560 }}>
        <Select
          label="Провайдер"
          options={PROVIDER_OPTIONS}
          value={aiSettings.provider}
          onChange={(e) =>
            updateAISettings({ provider: e.target.value as AIProvider })
          }
        />
        <Input
          label="API-ключ"
          type="password"
          value={aiSettings.apiKey}
          onChange={(e) => updateAISettings({ apiKey: e.target.value })}
          placeholder="sk-or-••••••••••••••••"
        />
        <Input
          label="Модель для текста"
          value={aiSettings.textModel}
          onChange={(e) => updateAISettings({ textModel: e.target.value })}
          placeholder="anthropic/claude-sonnet-4"
        />
        <Input
          label="Модель для изображений"
          value={aiSettings.imageModel}
          onChange={(e) => updateAISettings({ imageModel: e.target.value })}
          placeholder="black-forest-labs/flux-1.1-pro"
        />
        <Input
          label="Модель для озвучки"
          value={aiSettings.voiceModel}
          onChange={(e) => updateAISettings({ voiceModel: e.target.value })}
          placeholder="elevenlabs/multilingual-v2"
        />
        <Input
          label="Лимит генераций"
          type="number"
          value={String(aiSettings.generationLimit)}
          onChange={(e) =>
            updateAISettings({ generationLimit: parseInt(e.target.value) || 0 })
          }
          placeholder="100"
        />

        <div className={styles.promptActions}>
          <Button variant="secondary" onClick={testConnection}>
            Тестовый запуск модели
          </Button>
          <Button onClick={handleSave}>Сохранить</Button>
          {saved && <span className={styles.saved}>Сохранено</span>}
        </div>

        <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--border)" }}>
          <Button variant="ghost" onClick={handleResetDemo}>
            Сбросить демо-данные
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
