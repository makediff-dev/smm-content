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
import { getRoleLabel } from "@/lib/roles";
import { SEED_USERS } from "@/data/seed";
import styles from "./login.module.css";

const loginSchema = z.object({
  email: z.string().email("Введите корректный email"),
  password: z.string().min(1, "Введите пароль"),
});

type LoginForm = z.infer<typeof loginSchema>;

const DEMO_USERS = SEED_USERS.filter((user) => user.role !== "admin");

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
            placeholder="copywriter@smm.local"
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
          <strong>Демо-аккаунты:</strong> пароль у всех — <code>demo</code>
        </div>

        <div className={styles.demoButtons}>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => handleDemoLogin("admin@smm.local")}
          >
            Администратор
          </Button>
          {DEMO_USERS.map((user) => (
            <Button
              key={user.id}
              variant="ghost"
              fullWidth
              onClick={() => handleDemoLogin(user.email)}
            >
              {getRoleLabel(user.role)}
            </Button>
          ))}
        </div>
      </div>
      <PrototypeDisclaimer variant="block" className={styles.disclaimer} />
    </div>
  );
}
