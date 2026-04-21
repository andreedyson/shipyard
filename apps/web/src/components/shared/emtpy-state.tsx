import { cn } from "@/lib/utils";
import Image from "next/image";
import { Button } from "../ui/button";

type EmptyStateProps = {
  imgUrl?: string;
  title: string;
  description?: string;
  className?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
};

function EmptyState({
  imgUrl,
  title,
  description,
  className,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex h-full w-full flex-col items-center gap-4 text-center">
      <Image
        src={imgUrl ?? "assets/image-placeholder.svg"}
        width={500}
        height={500}
        alt={title ?? "No Data"}
        className={cn("aspect-video w-45 lg:w-70", className)}
        priority
      />
      <div>
        <h4 className="text-sm font-semibold md:text-base">{title}</h4>
        <p className="text-muted-foreground max-w-sm text-xs md:max-w-md md:text-sm">
          {description}
        </p>
      </div>
      {action && (
        <Button onClick={action.onClick} className="mt-3">
          {action.label}
        </Button>
      )}
    </div>
  );
}

export default EmptyState;
