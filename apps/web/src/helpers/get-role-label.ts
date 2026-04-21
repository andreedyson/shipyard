import { UserRole } from "../types/auth";

type LabelData = {
  label: string;
  color: string;
  translation: string;
  slug?: string;
};

const roleLabels: Record<UserRole, LabelData> = {
  SUPERADMIN: {
    label: "Super Admin",
    color: "text-red-500",
    translation: "Admin",
    slug: "super-admin",
  },
  USER: {
    label: "User",
    color: "text-blue-500",
    translation: "Pengguna",
    slug: "user",
  },
};

export const getRoleLabel = (role: UserRole): LabelData =>
  roleLabels[role] ?? { label: "user", color: "text-slate-400" };
