import { TextareaHTMLAttributes } from "react";
import styles from "./textarea.module.css";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  fieldClassName?: string;
}

export function Textarea({
  label,
  className,
  fieldClassName,
  id,
  ...props
}: TextareaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s/g, "-");

  return (
    <div className={`${styles.field} ${fieldClassName ?? ""}`.trim()}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={`${styles.textarea} ${className ?? ""}`}
        {...props}
      />
    </div>
  );
}
