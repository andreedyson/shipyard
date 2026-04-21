import { z } from "zod";

export const registerSchema = z.object({
  email: z.email({ error: "Invalid email address" }),
  name: z
    .string({ error: "Name is required" })
    .min(1, { message: "Name is required" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long" })
    .regex(/[a-z]/, {
      message: "Password must contain at least one lowercase letter",
    })
    .regex(/[A-Z]/, {
      message: "Password must contain at least one uppercase letter",
    })
    .regex(/[0-9]/, {
      message: "Password must contain at least one number",
    }),
  phone: z.string().nullable().default(null),
  address: z.string().nullable().default(null),
  dateOfBirth: z.date({ error: "Date of birth is required" }).nullable(),
});

export const loginSchema = registerSchema
  .pick({
    email: true,
  })
  .extend({
    password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters long" }),
  });

export const forgotPasswordSchema = registerSchema.pick({
  email: true,
});

export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long" })
    .max(32, { message: "Password must not exceed 32 characters" }),
});

export const editProfileSchema = registerSchema.omit({
  email: true,
  password: true,
});

// Types
export type TLoginPayload = z.infer<typeof loginSchema>;
export type TRegisterPayload = z.infer<typeof registerSchema>;
export type TRegisterInput = z.input<typeof registerSchema>;
export type TForgotPassword = z.infer<typeof forgotPasswordSchema>;
export type TEditProfile = z.input<typeof editProfileSchema>;
