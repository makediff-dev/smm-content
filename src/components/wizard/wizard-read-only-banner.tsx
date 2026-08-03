import styles from "./wizard-read-only-banner.module.css";

interface WizardReadOnlyBannerProps {
  stageLabel?: string | null;
}

export function WizardReadOnlyBanner({ stageLabel }: WizardReadOnlyBannerProps) {
  return (
    <div className={styles.banner} role="status">
      <strong>Режим просмотра.</strong>{" "}
      {stageLabel
        ? `Сейчас в работе этап «${stageLabel}». Редактирование недоступно для вашей роли, но вы можете просматривать шаги и возвращаться назад.`
        : "Редактирование недоступно для вашей роли на этом этапе, но вы можете просматривать шаги и возвращаться назад."}
    </div>
  );
}
