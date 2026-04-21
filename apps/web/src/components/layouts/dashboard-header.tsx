import { SidebarTrigger } from "@/components/ui/sidebar";
import { getRoleLabel } from "@/helpers/get-role-label";
import { UserRole } from "@/types/auth";
import UserAvatar from "../shared/user-avatar";
import { AnimatedThemeToggler } from "../shared/animated-theme-toggler";

export type HeaderUser = {
  name: string;
  role: UserRole;
  email: string;
};

type DashboardHeaderProps = {
  user: HeaderUser | undefined;
};

async function DashboardHeader({ user }: DashboardHeaderProps) {
  const roleLabel = getRoleLabel(user?.role as UserRole);

  return (
    <header className="bg-background/95 supports-backdrop-filter:bg-background/80 sticky top-0 z-40 flex h-16 items-center justify-between border-b px-4 shadow-sm backdrop-blur">
      <div className="flex items-center gap-1">
        <SidebarTrigger />
        <h2 className="font-bold capitalize">{roleLabel.translation}</h2>
      </div>
      <div className="flex items-center gap-2">
        <AnimatedThemeToggler className="cursor-pointer" />
        <UserAvatar
          fullname={user?.name ?? "User"}
          role={user?.role as UserRole}
          email={user?.email ?? ""}
        />
      </div>
    </header>
  );
}

export default DashboardHeader;
