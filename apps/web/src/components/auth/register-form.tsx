"use client";

import config from "@/configs/app";
import { api } from "@/lib/axios";
import { registerSchema, TRegisterInput } from "@/schemas/auth.schema";
import { APIResponse } from "@/types/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  Eye,
  EyeOff,
  LetterText,
  Lock,
  Mail,
  MapPin,
  PhoneCall,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FormCalendar } from "../forms/form-calendar";
import { FormInput } from "../forms/form-input";
import AppLogo from "../shared/app-logo";
import { customToast } from "../shared/custom-toast";
import { Button } from "../ui/button";
import { Form } from "../ui/form";

export function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const form = useForm<TRegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phone: null,
      address: null,
      dateOfBirth: null,
    },
  });

  async function onSubmit(values: TRegisterInput) {
    try {
      const payload = {
        ...values,
        phone: values.phone ?? null,
        address: values.address ?? null,
        dateOfBirth: values.dateOfBirth
          ? format(values.dateOfBirth, "yyyy-MM-dd")
          : null,
      };
      await api.post<APIResponse<TRegisterInput>>("/register", payload);

      customToast(
        "success",
        "Pendaftaran berhasil",
        "Silahkan verifikasi akun anda melalui email terdaftar.",
      );
      router.push("/login");
    } catch {}
  }

  return (
    <div className="border-border grid w-full overflow-hidden rounded-xl border bg-white shadow-lg dark:bg-zinc-800">
      <div className="w-full p-6 md:p-10">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <section className="flex flex-col items-center justify-center text-center">
              <Link
                href="/"
                className="flex flex-col items-center justify-center gap-2 font-semibold"
                title={`${config.appName} Homepage`}
              >
                <AppLogo />
              </Link>
              <h2 className="mt-2 text-2xl font-bold">Register New Account</h2>
              <p className="text-muted-foreground max-w-xs text-sm">
                Fill out the forms below to register a new account to this
                application.
              </p>
            </section>
            <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormInput
                control={form.control}
                name="name"
                label="Full Name"
                prefixIcon={LetterText}
                placeholder="e.g: Fikri Akbar"
              />
              <FormInput
                control={form.control}
                name="email"
                label="Email"
                prefixIcon={Mail}
                placeholder="nama@email.com"
              />
            </div>
            <FormInput
              control={form.control}
              name="password"
              label="Password"
              prefixIcon={Lock}
              placeholder="Min. 8 characters"
              type={showPassword ? "text" : "password"}
              autoComplete="off"
              suffixIcon={showPassword ? EyeOff : Eye}
              onSuffixClick={() => setShowPassword((prev) => !prev)}
            />
            <FormCalendar
              control={form.control}
              name="dateOfBirth"
              label="Date of Birth"
              placeholder="Choose your birth date"
              disabled={(date: Date) =>
                date >
                new Date(new Date().setFullYear(new Date().getFullYear() - 10))
              }
            />
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <FormInput
                  control={form.control}
                  name="phone"
                  label="Phone Number"
                  prefixIcon={PhoneCall}
                  placeholder="+62 811 7822 9999"
                  required={false}
                />
                <FormInput
                  control={form.control}
                  name="address"
                  label="Address"
                  prefixIcon={MapPin}
                  placeholder="e.g: 56th Avenue Street"
                  required={false}
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="w-full font-semibold"
            >
              {form.formState.isSubmitting ? "Registering..." : "Register"}
            </Button>
            <div className="text-center text-sm">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-primary font-semibold hover:underline"
              >
                Login
              </Link>
            </div>
            <p className="text-muted-foreground mt-4 text-center text-xs">
              Ac {new Date().getFullYear()} {config.appName}
            </p>
          </form>
        </Form>
      </div>
    </div>
  );
}
