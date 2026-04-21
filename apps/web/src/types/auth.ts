export type UserRole = "SUPERADMIN" | "USER";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}
