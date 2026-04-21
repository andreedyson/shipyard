import config from "@/configs/app";
import { LANDING_PAGE_LINKS } from "@/configs/navigation";
import { Github } from "lucide-react";
import Link from "next/link";
import AppLogo from "../shared/app-logo";

function LandingFooter() {
  return (
    <footer className="text-primary-foreground dark:text-foreground flex flex-col justify-between bg-slate-800 px-4 py-10 md:px-20 lg:px-30 xl:px-32.5 2xl:mx-auto 2xl:max-w-300">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        {/* Footer Logo & Info */}
        <div className="max-w-sm">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold"
            title={`${config.appName} Homepage`}
          >
            <AppLogo />
          </Link>

          <p className="mt-2 text-sm text-slate-300">
            Production-ready Next.js frontend template with TypeScript, Tailwind
            CSS, reusable UI components, and modern patterns to help you ship
            faster.
          </p>

          <div className="mt-4 space-y-1 text-sm">
            <p className="text-white/70">
              📦 Starter:{" "}
              <Link
                href="/docs/getting-started"
                className="font-semibold text-white transition-all duration-200 hover:underline"
              >
                Getting Started
              </Link>
            </p>

            <p className="text-white/70 flex items-center gap-2">
              <Github className="size-4 text-white/70" />
              <Link
                href={config.gitHubRepo ?? "https://github.com"}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-white transition-all duration-200 hover:underline"
              >
                View Repository
              </Link>
            </p>
          </div>
        </div>

        {/* Footer Navigations */}
        <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
          <div className="space-y-2">
            <h4 className="text-base font-bold">Navigation</h4>
            <div className="flex flex-col gap-3 text-sm text-slate-300">
              {LANDING_PAGE_LINKS.map((link) => (
                <Link
                  key={link.title}
                  href={link.url}
                  className="font-medium duration-200 hover:text-white hover:underline"
                >
                  {link.title}
                </Link>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-base font-bold">Resources</h4>
            <div className="flex flex-col gap-3 text-sm text-slate-300">
              <Link href="/docs" className="hover:text-white">
                Documentation
              </Link>
              <Link href="/components" className="hover:text-white">
                Components
              </Link>
              <Link href="/changelog" className="hover:text-white">
                Changelog
              </Link>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-base font-bold">Legal</h4>
            <div className="flex flex-col gap-3 text-sm text-slate-300">
              <Link href="/license" className="hover:text-white">
                License
              </Link>
              <Link href="/privacy" className="hover:text-white">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-white">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-6 text-sm text-white/60">
        © {new Date().getFullYear()} {config.appName}. Built with Next.js.
      </p>
    </footer>
  );
}

export default LandingFooter;
