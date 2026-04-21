import { Loader2 } from "lucide-react";
import { Button, buttonVariants } from "../ui/button";
import { VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

type SubmitButtonType = {
  children: React.ReactNode;
  isSubmitting: boolean;
  className?: string;
  onClick?: () => void;
};

export function SubmitButton({
  children,
  isSubmitting,
  className,
  onClick,
  variant,
  ...props
}: SubmitButtonType & VariantProps<typeof buttonVariants>) {
  return (
    <Button
      disabled={isSubmitting}
      {...props}
      className={cn(className, "w-full cursor-pointer")}
      onClick={onClick}
      type="submit"
      variant={variant}
    >
      <span>{children}</span>

      {isSubmitting && (
        <div className="flex items-center pl-1.5">
          <Loader2 className="size-5 animate-spin" />
        </div>
      )}
    </Button>
  );
}
