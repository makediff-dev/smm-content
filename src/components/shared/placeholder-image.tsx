import styles from "./placeholder-image.module.css";

interface PlaceholderImageProps {
  label?: string;
  variant?: "vertical" | "square" | "wide" | "video" | "small";
  size?: "small" | "medium" | "large";
  className?: string;
}

export function PlaceholderImage({
  label = "Изображение",
  variant = "vertical",
  size = "medium",
  className,
}: PlaceholderImageProps) {
  const classes = [
    styles.placeholder,
    styles[variant],
    size !== "medium" || variant === "small" ? styles[size] : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} aria-label={label}>
      <span className={styles.label}>{label}</span>
    </div>
  );
}

export function VideoPlayerStub({ className }: { className?: string }) {
  return (
    <div className={`${styles.placeholder} ${styles.video} ${className ?? ""}`}>
      <span className={styles.label}>▶ Видео</span>
    </div>
  );
}
