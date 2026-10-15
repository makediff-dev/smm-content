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

export function VideoPlayerStub({
  className,
  src,
}: {
  className?: string;
  src?: string;
}) {
  const isFile = Boolean(src && /\.(mp4|webm|mov|ogg)(\?|$)/i.test(src));

  return (
    <div className={styles.videoWrap}>
      {isFile && src ? (
        <video
          className={`${styles.placeholder} ${styles.video} ${styles.videoEl} ${className ?? ""}`}
          src={src}
          controls
          playsInline
        />
      ) : (
        <div className={`${styles.placeholder} ${styles.video} ${className ?? ""}`}>
          <span className={styles.label}>▶ Видео</span>
        </div>
      )}
      {src ? (
        <a
          className={styles.videoLink}
          href={src}
          target="_blank"
          rel="noreferrer"
        >
          {src}
        </a>
      ) : null}
    </div>
  );
}
