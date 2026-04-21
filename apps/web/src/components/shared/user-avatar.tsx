"use client";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getRoleLabel } from "@/helpers/get-role-label";
import { useGetInitials } from "@/hooks/use-get-initials";
import { getDashboardRouteByRole } from "@/lib/auth-routing";
import { cn } from "@/lib/utils";
import { UserRole } from "@/types/auth";
import { Home, LayoutDashboard, LogOutIcon, User } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../providers/auth-provider";

type UserAvatarProps = {
  fullname: string;
  role: UserRole;
  email: string;
};

function UserAvatar({ fullname, role, email }: UserAvatarProps) {
  const { logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const userInitial = useGetInitials(fullname ?? "");
  const roleLabel = getRoleLabel(role);
  const isOnDashboard = pathname.includes("/dashboard");
  const linkHref = isOnDashboard ? "/" : getDashboardRouteByRole(role);
  const linkIcon = isOnDashboard ? <Home /> : <LayoutDashboard />;
  const linkLabel = isOnDashboard ? "Home" : "Dashboard";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="border-input relative aspect-square size-8 rounded-full border-2 md:size-10"
        >
          <span>
            <Avatar className="grid aspect-square place-items-center text-sm">
              {userInitial}
            </Avatar>
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="z-1000 w-60" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1 text-right">
            <p className="text-sm leading-none font-semibold">{fullname}</p>
            <p className="text-muted-foreground text-sm leading-none font-medium">
              {email}
            </p>
            <p className={cn("text-sm leading-none font-medium", roleLabel.color)}>
              {roleLabel.label}
            </p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuGroup>
          <DropdownMenuItem asChild className="cursor-pointer">
            <div
              onClick={() => {
                router.push(linkHref);
                setTimeout(() => router.refresh(), 50);
              }}
              className="flex w-full items-center gap-2"
            >
              {linkIcon}
              <span>{linkLabel}</span>
            </div>
          </DropdownMenuItem>
          {role === "USER" && (
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link
                href={"/dashboard/student/profile"}
                className="flex w-full items-center gap-2"
              >
                <User />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={logout}
            className="cursor-pointer font-semibold text-red-500"
          >
            Log out
            <DropdownMenuShortcut className="text-red-500">
              <LogOutIcon size={20} />
            </DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default UserAvatar;
