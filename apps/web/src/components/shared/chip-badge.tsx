"use client";
import { cn } from "@/lib/utils";
import { easeOut, motion } from "framer-motion";

type ChipBagdeProps = {
  text: string;
  className?: string;
};

function ChipBadge({ text, className }: ChipBagdeProps) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: easeOut }}
      viewport={{ once: true }}
      className={cn(
        "inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-medium tracking-wide text-orange-600 uppercase shadow-sm dark:border-orange-500/40 dark:bg-orange-500/10 dark:text-orange-300",
        className
      )}
    >
      {text}
    </motion.span>
  );
}

export default ChipBadge;
