"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "@/stores/auth-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PrototypeDisclaimer } from "@/components/shared/prototype-disclaimer";
import styles from "./login.module.css";

const loginSchema = z.object({
  email: z.string().email("Введите корректный email"),
  password: z.string().min(1, "Введите пароль"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const handleDemoLogin = (email: string) => {
    setError("");
    const success = login(email, "demo");
    if (success) {
      router.push("/projects");
    }
  };

  const onSubmit = (data: LoginForm) => {
    setError("");
    const success = login(data.email, data.password);
    if (success) {
      router.push("/projects");
    } else {
      setError("Неверный email или пароль");
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>SMM Content</h1>
        <p className={styles.subtitle}>Сервис автоматизации контент-производства</p>

        <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="Email"
            type="email"
            placeholder="admin@smm.local"
            error={errors.email?.message}
            {...register("email")}
          />
          <Input
            label="Пароль"
            type="password"
            placeholder="••••••"
            error={errors.password?.message}
            {...register("password")}
          />
          {error && <div className={styles.error}>{error}</div>}
          <Button type="submit" fullWidth disabled={isSubmitting}>
            Войти
          </Button>
        </form>

        <div className={styles.hint}>
          <strong>Демо-аккаунты:</strong>
          <br />
          admin@smm.local / demo — Администратор
          <br />
          manager@smm.local / demo — Менеджер
        </div>

        <div className={styles.demoButtons}>
          <Button variant="secondary" fullWidth onClick={() => handleDemoLogin("admin@smm.local")}>
            Войти как администратор
          </Button>
          <Button variant="ghost" fullWidth onClick={() => handleDemoLogin("manager@smm.local")}>
            Войти как менеджер
          </Button>
        </div>
      </div>
      <PrototypeDisclaimer variant="block" className={styles.disclaimer} />
    </div>
  );
}
