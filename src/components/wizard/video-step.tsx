"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { Play, Sparkle } from "@phosphor-icons/react";
import { Table, type TableColumn } from "@/components/ui/table";
import { TransitionField } from "@/components/wizard/transition-field";
import { useWizardStepDisabled } from "@/components/wizard/wizard-step-context";
import { simulateTask } from "@/lib/simulate-generation";
import { useAuthStore } from "@/stores/auth-store";
import { useProjectsStore } from "@/stores/projects-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useWizardStore } from "@/stores/content-wizard-store";
import selectStyles from "@/components/ui/select.module.css";
import styles from "./video-step.module.css";

const MIN_SPEECH_RATE = 0.5;
const MAX_SPEECH_RATE = 2;
const PLAY_MS = 1600;

const VOICES = [
  "Aoede",
  "Charon",
  "Fenrir",
  "Kore",
  "Leda",
  "Orus",
  "Puck",
  "Zephyr",
  "Achernar",
  "Achird",
  "Algenib",
  "Algieba",
  "Alnilam",
  "Autonoe",
  "Callirrhoe",
  "Despina",
  "Enceladus",
  "Erinome",
  "Gacrux",
  "Iapetus",
  "Laomedeia",
  "Pulcherrima",
  "Rasalgethi",
  "Sadachbia",
  "Sadaltager",
  "Schedar",
  "Sulafat",
  "Umbriel",
  "Vindemiatrix",
  "Zubenelgenubi",
];

const VOICE_MODEL_LABEL: Record<string, string> = {
  "elevenlabs/multilingual-v2": "Google: Gemini 3.8 Flash TTS",
  "google/gemini-tts": "Google: Gemini 3.8 Flash TTS",
};

function voiceCountWord(count: number): string {
  const tail = count % 100;
  if (tail > 10 && tail < 20) return "голосов";
  switch (count % 10) {
    case 1:
      return "голос";
    case 2:
    case 3:
    case 4:
      return "голоса";
    default:
      return "голосов";
  }
}

interface SlideRow {
  id: string;
  index: string;
  text: string;
  duration: string;
}

const COLUMNS: TableColumn<SlideRow>[] = [
  { key: "index", header: "Слайд", render: (row) => row.index },
  { key: "text", header: "Текст", render: (row) => row.text },
  { key: "duration", header: "Длительность", render: (row) => row.duration },
];

export function VideoStep() {
  const disabled = useWizardStepDisabled();
  const currentUser = useAuthStore((s) => s.currentUser);
  const addActionLog = useProjectsStore((s) => s.addActionLog);
  const updateContentUnit = useProjectsStore((s) => s.updateContentUnit);
  const voiceModelSetting = useSettingsStore((s) => s.aiSettings.voiceModel);
  const cards = useWizardStore((s) => s.cards);
  const narrationText = useWizardStore((s) => s.narrationText);
  const voiceModel = useWizardStore((s) => s.voiceModel);
  const speechSpeed = useWizardStore((s) => s.speechSpeed);
  const videoTransition = useWizardStore((s) => s.videoTransition);
  const contentId = useWizardStore((s) => s.contentId);
  const setField = useWizardStore((s) => s.setField);

  const [writing, setWriting] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [totalDuration, setTotalDuration] = useState<number | null>(null);

  const voices = useMemo(() => {
    if (voiceModel && !VOICES.includes(voiceModel)) {
      return [voiceModel, ...VOICES];
    }
    return VOICES;
  }, [voiceModel]);

  const modelName =
    VOICE_MODEL_LABEL[voiceModelSetting] ?? voiceModelSetting ?? "модель озвучки";
  const speed = Number.isFinite(speechSpeed) ? speechSpeed : 1;
  const fill =
    ((speed - MIN_SPEECH_RATE) / (MAX_SPEECH_RATE - MIN_SPEECH_RATE)) * 100;

  const persist = (patch: {
    narrationText?: string;
    voiceModel?: string;
    speechSpeed?: number;
    videoTransition?: string;
  }) => {
    if (contentId) updateContentUnit(contentId, patch);
  };

  const generateText = async () => {
    if (disabled || writing) return;
    setWriting(true);
    await simulateTask(() => undefined, ["queued", "in_progress"], 700);
    const text =
      cards.map((card) => card.shortText.trim()).filter(Boolean).join(". ") +
      (cards.length ? "." : "");
    setField("narrationText", text);
    persist({ narrationText: text });
    setWriting(false);
    if (contentId && currentUser) {
      addActionLog(contentId, "Генерация текста озвучки", currentUser.name);
    }
  };

  const listen = async () => {
    if (!voiceModel || listening) return;
    setListening(true);
    await new Promise((resolve) => window.setTimeout(resolve, PLAY_MS));
    setListening(false);
  };

  const generateAudio = async () => {
    if (disabled || speaking || !narrationText.trim() || !voiceModel) return;
    setSpeaking(true);
    await simulateTask(() => undefined, ["queued", "in_progress", "done"], 900);
    const words = Math.max(1, narrationText.trim().split(/\s+/).length);
    const total = Math.max(4, words / 2.4 / speed);
    const next: Record<string, number> = {};
    const share = cards.length ? total / cards.length : total;
    cards.forEach((card) => {
      next[card.id] = Number(share.toFixed(1));
    });
    setDurations(next);
    setTotalDuration(Number(total.toFixed(1)));
    setAudioReady(true);
    setSpeaking(false);
    if (contentId && currentUser) {
      addActionLog(contentId, "Синтез озвучки", currentUser.name);
    }
  };

  const rows: SlideRow[] = cards.map((card, index) => ({
    id: card.id,
    index: `#${index + 1}`,
    text: card.shortText,
    duration: durations[card.id] ? `${durations[card.id].toFixed(1)} сек` : "нужно аудио",
  }));

  return (
    <section aria-label="Озвучка и тайминг">
      <h2 className={styles.heading}>Озвучка и тайминг</h2>
      <p className={styles.subtitle}>Текст диктора и длительность слайдов</p>

      <div className={styles.fields}>
        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label className={styles.label} htmlFor="voiceText">
              Текст для озвучки
            </label>
            <button
              type="button"
              className={styles.ghost}
              disabled={disabled || writing}
              onClick={generateText}
            >
              <Sparkle size={16} weight="fill" aria-hidden />
              {writing ? "Пишем…" : narrationText ? "Переписать" : "Сгенерировать"}
            </button>
          </div>
          <textarea
            id="voiceText"
            className={`${styles.input} ${styles.textarea}`}
            rows={4}
            disabled={disabled || writing}
            placeholder="Напишите текст диктора или сгенерируйте его по заданию"
            value={narrationText}
            onChange={(event) => {
              setField("narrationText", event.target.value);
              persist({ narrationText: event.target.value });
            }}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="voice">
            Голос озвучки
          </label>
          <div className={styles.row}>
            <select
              id="voice"
              className={selectStyles.select}
              value={voiceModel}
              disabled={disabled}
              onChange={(event) => {
                setField("voiceModel", event.target.value);
                persist({ voiceModel: event.target.value });
              }}
            >
              <option value="">Голос не выбран</option>
              {voices.map((voice) => (
                <option key={voice} value={voice}>
                  {voice}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={styles.ghost}
              disabled={disabled || !voiceModel || listening}
              title={voiceModel ? "Послушать голос" : "Сначала выберите голос"}
              onClick={listen}
            >
              <Play size={16} weight="fill" aria-hidden />
              {listening ? "Звучит…" : "Послушать"}
            </button>
          </div>
          <p className={styles.hint}>
            {voices.length} {voiceCountWord(voices.length)} модели «{modelName}»
          </p>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="speechRate">
            Скорость речи: {speed.toFixed(1)}x
          </label>
          <div className={styles.rangeRow}>
            <span className={styles.rangeEdge}>{MIN_SPEECH_RATE}x</span>
            <input
              id="speechRate"
              type="range"
              className={styles.range}
              style={{ "--range-fill": `${fill}%` } as CSSProperties}
              min={MIN_SPEECH_RATE}
              max={MAX_SPEECH_RATE}
              step={0.1}
              value={speed}
              disabled={disabled}
              onChange={(event) => {
                const next = Number(event.target.value);
                setField("speechSpeed", next);
                persist({ speechSpeed: next });
              }}
            />
            <span className={styles.rangeEdge}>{MAX_SPEECH_RATE}x</span>
          </div>
        </div>

        <TransitionField
          id="transition"
          value={videoTransition || "none"}
          disabled={disabled}
          onChange={(next) => {
            setField("videoTransition", next);
            persist({ videoTransition: next });
          }}
        />
      </div>

      <div className={styles.timing}>
        <div className={styles.labelRow}>
          <h2 className={styles.heading}>Тайминг слайдов</h2>
          <button
            type="button"
            className={styles.ghost}
            disabled={
              disabled || speaking || writing || !narrationText.trim() || !voiceModel
            }
            title={voiceModel ? "Синтезировать озвучку и посчитать по ней тайминг" : "Сначала выберите голос"}
            onClick={generateAudio}
          >
            <Play size={16} weight="fill" aria-hidden />
            {speaking ? "Синтезируем…" : audioReady ? "Пересобрать аудио" : "Сгенерировать аудио"}
          </button>
        </div>
        <p className={styles.subtitle}>
          {totalDuration
            ? `Озвучка готова: ${totalDuration.toFixed(1)} сек, время слайдов поделено по её тексту`
            : "Секунды появятся после генерации аудио — до неё длительность речи неизвестна"}
        </p>
        <Table columns={COLUMNS} data={rows} keyField="id" />
      </div>
    </section>
  );
}
