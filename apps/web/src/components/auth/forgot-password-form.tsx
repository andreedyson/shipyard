"use client";

import { getDashboardRouteByRole } from "@/lib/auth-routing";
import { api } from "@/lib/axios";
import { forgotPasswordSchema, TForgotPassword } from "@/schemas/auth.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FormInput } from "../forms/form-input";
import { useAuth } from "../providers/auth-provider";
import AppLogo from "../shared/app-logo";
import { customToast } from "../shared/custom-toast";
import { Button } from "../ui/button";
import { Form } from "../ui/form";

function ForgotPasswordForm() {
  const [submitting, setSubmitting] = useState<boolean>(false);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push(getDashboardRouteByRole(user.role));
    }
  }, [router, user]);

  const form = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: TForgotPassword) {
    setSubmitting(true);

    try {
      await api.post(`/users/forgot-password`, values);

      customToast(
        "success",
        "Email terkirim",
        "Silahkan cek email anda untuk mendapatkan tautan reset password",
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

          <div className="mt-6">
            <h3 className="flex items-center justify-center text-xl font-bold md:text-2xl">
              Lupa Password
            </h3>
            <p className="text-muted-foreground text-center text-xs md:text-sm">
              Masukkan email Anda untuk menerima tautan pengaturan ulang kata
              sandi.
            </p>
          </div>
        </section>
        <FormInput
          control={form.control}
          name="email"
          label="Email"
          prefixIcon={Mail}
          placeholder="nama@email.com"
        />
        <Button
          type="submit"
          disabled={submitting}
          className="bg-primary hover:bg-primary/70 mt-2 w-full text-white"
        >
          {submitting ? "Mengirimkan.." : "Kirim Email"}
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

export default ForgotPasswordForm;
