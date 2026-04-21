"use client";

import { useGetInitials } from "@/hooks/use-get-initials";
import { ChevronLeft, LogOutIcon, MoreHorizontal, User } from "lucide-react";
import Link from "next/link";
import { useAuth } from "../providers/auth-provider";
import { HeaderUser } from "../layouts/dashboard-header";
import { Avatar } from "../ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Separator } from "../ui/separator";
import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "../ui/sidebar";

export default function DashboardSidebarFooter({
  user,
}: {
  user: HeaderUser | undefined;
}) {
  const { logout } = useAuth();
  const userInitial = useGetInitials(user?.name ?? "User");

  return (
    <SidebarFooter className="mt-auto">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            onClick={() => (window.location.href = "/")}
            className="flex cursor-pointer items-center justify-center bg-zinc-200 py-4 text-center hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700"
          >
            <ChevronLeft size={20} />
            <span>Main Page</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
      <Separator />
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size={"lg"}
                className="bg-muted dark:bg-popover border-input h-14 cursor-pointer border-2"
              >
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="bg-primary grid aspect-square place-items-center text-white">
                      {userInitial}
                    </Avatar>
                    <div>
                      <p
                        className="line-clamp-2 text-sm leading-4 font-semibold"
                        title={user?.name}
                      >
                        {user?.name}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                  <MoreHorizontal className="size-4" />
                </div>
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" className="w-45">
              {user?.role === "USER" && (
                <DropdownMenuItem>
                  <Link
                    href={"/dashboard/student/profile"}
                    className="flex w-full items-center gap-2"
                  >
                    <User />
                    Profile
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="dark:hover:bg-red-900" onClick={logout}>
                <div className="flex w-full items-center gap-2 text-red-500">
                  <LogOutIcon className="text-red-500" />
                  <span>Logout</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
}
