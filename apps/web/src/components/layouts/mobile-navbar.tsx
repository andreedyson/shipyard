"use client";

import { LANDING_PAGE_LINKS } from "@/configs/navigation";
import { cn } from "@/lib/utils";
import { AlignJustify, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AnimatedThemeToggler } from "../shared/animated-theme-toggler";
import AppLogo from "../shared/app-logo";
import UserAvatar from "../shared/user-avatar";

function MobileNavbar() {
  const [openNav, setOpenNav] = useState<boolean>(false);
  const session = false;

  return (
    <header className="sticky top-0 z-20">
      <nav className="bg-background relative flex w-full items-center justify-between border-b p-4 shadow-md md:hidden md:rounded-md">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              onClick={() => setOpenNav((prev) => !prev)}
              className="cursor-pointer"
            >
              {openNav ? <X size={24} /> : <AlignJustify size={24} />}
            </div>
            <AppLogo className="w-10" />
          </div>
        </div>

        {/* User Avatar & Login */}
        <div className="flex items-center gap-2">
          <AnimatedThemeToggler className="cursor-pointer" />
          {!session ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-4 text-sm font-medium lg:text-base">
                <Link
                  href={"/login"}
                  className="duration-200 hover:text-slate-800 hover:underline"
                >
                  Login
                </Link>
              </div>
            </div>
          ) : (
            <UserAvatar
              fullname={"User"}
              role={"USER"}
              email={"user@mail.com"}
            />
          )}
        </div>

        <div
          className={`bg-background dark:bg-background absolute top-15 flex h-[92vh] w-full flex-col border p-4 duration-200 ${openNav ? "left-0" : "-left-250"}`}
        >
          <div className="flex flex-col gap-1">
            {LANDING_PAGE_LINKS.map((link) => (
              <Link
                key={link.title}
                href={link.url}
                className={cn(
                  "flex items-center gap-2 rounded-md p-2.5 text-xs font-semibold",
                )}
                onClick={() => setOpenNav(false)}
              >
                {link.title}
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </header>
  );
}

export default MobileNavbar;
