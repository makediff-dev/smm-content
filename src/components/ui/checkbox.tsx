import { InputHTMLAttributes } from "react";
import styles from "./checkbox.module.css";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
}

export function Checkbox({ label, id, ...props }: CheckboxProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s/g, "-");

  return (
    <label className={styles.checkbox} htmlFor={inputId}>
      <input id={inputId} type="checkbox" className={styles.input} {...props} />
      <span>{label}</span>
    </label>
  );
}
