"use client";

import { useRef } from "react";
import { Eye, EyeSlash, MusicNotes, Trash, UploadSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";
import { useProjectsStore } from "@/stores/projects-store";
import { generateId } from "@/lib/simulate-generation";
import type { MemeAsset, MemeMusicTrack } from "@/types";
import styles from "./meme-designer-stage.module.css";

interface MemeDesignerStageProps {
  contentId: string;
  canEdit: boolean;
}

export function MemeDesignerStage({ contentId, canEdit }: MemeDesignerStageProps) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const content = useProjectsStore((s) => s.getContentUnit(contentId));
  const updateContentUnit = useProjectsStore((s) => s.updateContentUnit);
  const addActionLog = useProjectsStore((s) => s.addActionLog);
  const fileRef = useRef<HTMLInputElement>(null);
  const musicRef = useRef<HTMLInputElement>(null);

  if (!content) return null;

  const assets = content.memeAssets ?? [];
  const music = content.memeMusic ?? null;

  const log = (action: string) => {
    if (currentUser) addActionLog(contentId, action, currentUser.name);
  };

  const setAssets = (memeAssets: MemeAsset[]) => {
    updateContentUnit(contentId, { memeAssets });
  };

  const setMusic = (memeMusic: MemeMusicTrack | null) => {
    updateContentUnit(contentId, { memeMusic });
  };

  const addFiles = (files: FileList | null) => {
    if (!canEdit || !files?.length) return;
    const next = [...assets];
    Array.from(files).forEach((file) => {
      next.push({
        id: generateId("meme-file"),
        name: file.name,
        url: URL.createObjectURL(file),
      });
    });
    setAssets(next);
    log(`Добавлены файлы: ${Array.from(files).map((file) => file.name).join(", ")}`);
  };

  return (
    <div className={styles.stack}>
      <section className={styles.block} aria-label="Другие файлы">
        <div className={styles.head}>
          <h2 className={styles.title}>Другие файлы</h2>
          <Button
            type="button"
            variant="secondary"
            size="small"
            disabled={!canEdit}
            onClick={() => fileRef.current?.click()}
          >
            <UploadSimple size={16} weight="bold" />
            Загрузить
          </Button>
          <input
            ref={fileRef}
            type="file"
            multiple
            className={styles.hidden}
            disabled={!canEdit}
            onChange={(event) => {
              addFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </div>
        {assets.length === 0 ? (
          <p className={styles.hint}>Можно подгрузить картинки, ролики и другие файлы</p>
        ) : (
          <ul className={styles.list}>
            {assets.map((item) => (
              <li
                key={item.id}
                className={`${styles.row} ${item.hidden ? styles.rowHidden : ""}`}
              >
                <span className={styles.rowName}>{item.name}</span>
                <button
                  type="button"
                  className={styles.iconBtn}
                  disabled={!canEdit}
                  aria-label={item.hidden ? "Показать файл" : "Скрыть файл"}
                  onClick={() => {
                    setAssets(
                      assets.map((asset) =>
                        asset.id === item.id
                          ? { ...asset, hidden: !asset.hidden }
                          : asset
                      )
                    );
                  }}
                >
                  {item.hidden ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
                <button
                  type="button"
                  className={`${styles.iconBtn} ${styles.iconDanger}`}
                  disabled={!canEdit}
                  aria-label={`Удалить ${item.name}`}
                  onClick={() => {
                    setAssets(assets.filter((asset) => asset.id !== item.id));
                    log(`Удалён файл ${item.name}`);
                  }}
                >
                  <Trash size={18} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.block} aria-label="Музыка">
        <div className={styles.head}>
          <h2 className={styles.title}>Музыка</h2>
          <Button
            type="button"
            variant="secondary"
            size="small"
            disabled={!canEdit}
            onClick={() => musicRef.current?.click()}
          >
            <MusicNotes size={16} weight="bold" />
            {music ? "Заменить" : "Добавить"}
          </Button>
          <input
            ref={musicRef}
            type="file"
            accept="audio/*"
            className={styles.hidden}
            disabled={!canEdit}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!canEdit || !file) return;
              setMusic({
                name: file.name,
                url: URL.createObjectURL(file),
                volume: music?.volume ?? 0.8,
                muted: false,
              });
              log(`Музыка: ${file.name}`);
            }}
          />
        </div>
        {music ? (
          <div className={styles.music}>
            <p className={styles.rowName}>{music.name}</p>
            <audio className={styles.audio} src={music.url} controls />
            <label className={styles.volume}>
              Громкость
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(music.volume * 100)}
                disabled={!canEdit || music.muted}
                onChange={(event) =>
                  setMusic({
                    ...music,
                    volume: Number(event.target.value) / 100,
                  })
                }
              />
              <span>{music.muted ? "выкл" : `${Math.round(music.volume * 100)}%`}</span>
            </label>
            <div className={styles.musicActions}>
              <Button
                type="button"
                variant="ghost"
                size="small"
                disabled={!canEdit}
                onClick={() => setMusic({ ...music, muted: !music.muted })}
              >
                {music.muted ? "Включить" : "Выключить"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="small"
                disabled={!canEdit}
                onClick={() => {
                  setMusic(null);
                  log("Музыка удалена");
                }}
              >
                Удалить
              </Button>
            </div>
          </div>
        ) : (
          <p className={styles.hint}>Добавьте трек и выставьте громкость</p>
        )}
      </section>
    </div>
  );
}
