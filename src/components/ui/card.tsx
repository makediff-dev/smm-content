import { HTMLAttributes } from "react";
import styles from "./card.module.css";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  variant?: "default" | "muted" | "interactive";
}

export function Card({
  title,
  description,
  variant = "default",
  className,
  children,
  ...props
}: CardProps) {
  const classes = [
    styles.card,
    variant === "muted" ? styles.muted : "",
    variant === "interactive" ? styles.interactive : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} {...props}>
      {(title || description) && (
        <div className={styles.header}>
          {title && <h3 className={styles.title}>{title}</h3>}
          {description && <p className={styles.description}>{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
