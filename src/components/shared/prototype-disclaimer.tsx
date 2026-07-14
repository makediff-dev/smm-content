import styles from "./prototype-disclaimer.module.css";

interface PrototypeDisclaimerProps {
  variant?: "inline" | "block";
  className?: string;
}

export function PrototypeDisclaimer({
  variant = "inline",
  className,
}: PrototypeDisclaimerProps) {
  return (
    <p
      className={`${styles.disclaimer} ${variant === "block" ? styles.block : styles.inline} ${className ?? ""}`}
    >
      прототип разработан <strong>MakeDifference</strong>
    </p>
  );
}
