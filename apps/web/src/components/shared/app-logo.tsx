import config from "@/configs/app";
import { cn } from "@/lib/utils";
import { Layers } from "lucide-react";
import Image from "next/image";

export default function AppLogo({ className }: { className?: string }) {
  return (
    <div>
      {config.appLogo?.dark || config.appLogo?.light ? (
        <div>
          <Image
            src={config.appLogo.light ?? ""}
            alt={`${config.appName} Logo`}
            className={cn("block w-8 dark:hidden", className)}
            width={100}
            height={100}
            priority
          />
          {/* Dark */}
          <Image
            src={config.appLogo.dark ?? ""}
            alt={`${config.appName} Logo`}
            className={cn("hidden w-8 dark:block", className)}
            width={100}
            height={100}
            priority
          />
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="bg-primary grid size-8 place-items-center rounded-md">
            <Layers className="text-primary-foreground size-4" />
          </div>
          <p className="font-bold">{config.appName}</p>
        </div>
      )}
    </div>
  );
}
