import config from "@/configs/app";
import { LANDING_PAGE_LINKS } from "@/configs/navigation";
import Link from "next/link";
import { AnimatedThemeToggler } from "../shared/animated-theme-toggler";
import AppLogo from "../shared/app-logo";
import UserAvatar from "../shared/user-avatar";

function LandingNavbar() {
  const session = false;
  return (
    <header className="bg-background sticky top-0 z-999 hidden max-w-480 items-center justify-between border p-6 antialiased shadow-md max-md:px-4 md:flex md:px-10 lg:px-30 xl:px-32.5 2xl:mx-auto">
      {/* Logo */}
      <Link
        href="/"
        className="flex items-center gap-2 font-semibold"
        title={`${config.appName} Homepage`}
      >
        <AppLogo />
      </Link>

      {/* Landing Page Links */}
      <div className="flex items-center gap-6 text-sm lg:text-base">
        {LANDING_PAGE_LINKS.map((link) => {
          return (
            <Link
              key={link.title}
              href={link.url}
              className="font-medium duration-200 hover:underline"
            >
              {link.title}
            </Link>
          );
        })}
      </div>

      {/* User Avatar & Login */}
      <div className="flex items-center gap-2">
        <AnimatedThemeToggler className="cursor-pointer" />
        {!session ? (
          <div className="flex items-center gap-3 max-md:hidden">
            <div className="flex items-center gap-4 text-sm font-medium lg:text-base">
              <Link
                href={"/login"}
                className="hover:text-primary duration-200 hover:underline"
              >
                Login
              </Link>
            </div>
          </div>
        ) : (
          <UserAvatar fullname={"User"} role={"USER"} email={"user@mail.com"} />
        )}
      </div>
    </header>
  );
}

export default LandingNavbar;
