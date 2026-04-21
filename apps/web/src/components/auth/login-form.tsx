"use client";

import config from "@/configs/app";
import { getLoginRedirectPath } from "@/lib/auth-routing";
import { loginSchema, TLoginPayload } from "@/schemas/auth.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FormInput } from "../forms/form-input";
import { useAuth } from "../providers/auth-provider";
import AppLogo from "../shared/app-logo";
import { Button } from "../ui/button";
import { Form } from "../ui/form";

export function LoginForm() {
  const { login, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const form = useForm<TLoginPayload>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: TLoginPayload) {
    try {
      const authenticatedUser = await login(values.email, values.password);
      const nextPath = searchParams.get("next");

      router.replace(getLoginRedirectPath(authenticatedUser.role, nextPath));
    } catch {}
  }

  return (
    <div className="border-border/60 bg-card relative w-full overflow-hidden rounded-2xl border shadow-xl dark:shadow-black/10">
      <div className="pointer-events-none absolute inset-0">
        <div className="bg-primary/15 absolute -top-24 -left-24 h-64 w-64 rounded-full blur-3xl" />
        <div className="absolute -right-24 -bottom-24 h-64 w-64 rounded-full bg-[color:var(--accent)]/20 blur-3xl" />
        <div className="from-background/30 to-background/0 absolute inset-0 bg-linear-to-b" />
      </div>

      <div className="relative w-full p-4 md:p-10">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <section className="flex flex-col items-center justify-center text-center">
              <Link
                href="/"
                className="group flex flex-col items-center justify-center gap-3 font-semibold"
                title={`${config.appName} Beranda`}
              >
                <div className="border-border/60 bg-background/70 dark:bg-background/40 rounded-2xl border p-3 shadow-sm backdrop-blur transition group-hover:shadow-md">
                  <AppLogo />
                </div>
              </Link>

              <h2 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">
                Selamat Datang
              </h2>

              <p className="text-muted-foreground mt-1 max-w-sm text-sm leading-snug text-balance">
                Login untuk melanjutkan ke dashboard. Pastikan email & password
                kamu benar.
              </p>
            </section>

            <div className="space-y-4">
              <FormInput
                control={form.control}
                name="email"
                label="Email"
                prefixIcon={Mail}
                placeholder="nama@email.com"
              />

              <FormInput
                control={form.control}
                name="password"
                label="Password"
                prefixIcon={Lock}
                placeholder="Min. 6 karakter"
                type={showPassword ? "text" : "password"}
                autoComplete="off"
                suffixIcon={showPassword ? EyeOff : Eye}
                onSuffixClick={() => setShowPassword((prev) => !prev)}
              />

              <div className="flex justify-end">
                <Link
                  href="/forgot-password"
                  className="text-primary text-xs font-semibold hover:underline"
                >
                  Lupa password?
                </Link>
              </div>
            </div>

            <div className="space-y-4">
              <Button
                type="submit"
                disabled={form.formState.isSubmitting || isLoading}
                className="w-full rounded-xl font-semibold text-white shadow-sm transition hover:cursor-pointer hover:shadow-md disabled:hover:shadow-sm"
              >
                {isLoading ? "Sedang masuk..." : "Masuk"}
              </Button>

              <p className="text-muted-foreground text-center text-xs">
                Ac {new Date().getFullYear()} {config.appName}
              </p>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
