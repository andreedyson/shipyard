"use client";

import { api } from "@/lib/axios";
import { resetPasswordSchema } from "@/schemas/auth.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft, Eye, EyeOff, Lock } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FormInput } from "../forms/form-input";
import AppLogo from "../shared/app-logo";
import { customToast } from "../shared/custom-toast";
import { Button } from "../ui/button";
import { Form } from "../ui/form";

function ResetPasswordForm() {
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();

  useEffect(() => {
    if (!token) {
      customToast("error", "Tautan reset tidak valid atau sudah kadaluarsa.");
      router.replace("/forgot-password");
    }
  }, [token, router]);

  const form = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof resetPasswordSchema>) {
    setSubmitting(true);

    try {
      await api.post(`/users/reset-password?token=${token}`, values);

      customToast(
        "success",
        "Berhasil merubah password",
        "Silahkan login dengan password baru anda",
      );
      setSubmitting(false);
      router.refresh();
      router.replace("/login");
    } catch {
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="bg-background flex flex-col gap-4 rounded-md border px-12 py-8 shadow-md"
      >
        <section className="mb-2 text-center md:text-start">
          <AppLogo />
          <p className="text-muted-foreground text-center text-xs md:text-sm">
            Silahkan masukkan password baru anda
          </p>
        </section>
        <FormInput
          control={form.control}
          name="password"
          label="Kata Sandi"
          prefixIcon={Lock}
          placeholder="Minimal 8 karakter"
          type={showPassword ? "text" : "password"}
          autoComplete="off"
          suffixIcon={showPassword ? EyeOff : Eye}
          onSuffixClick={() => setShowPassword((prev) => !prev)}
        />
        <Button
          type="submit"
          disabled={submitting}
          className="bg-primary hover:bg-primary/70 mt-2 w-full text-white"
        >
          {submitting ? "Merubah..." : "Reset Password"}
        </Button>
        <Link
          href={"/login"}
          className="text-muted-foreground hover:text-muted-foreground/60 mt-4 flex items-center justify-center text-sm"
        >
          <ChevronLeft size={20} />
          Kembali ke Login
        </Link>
      </form>
    </Form>
  );
}

export default ResetPasswordForm;
