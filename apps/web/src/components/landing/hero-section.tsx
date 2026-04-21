"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { easeOut, motion } from "framer-motion";
import { LayoutDashboard } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const textVariant = {
  hidden: { opacity: 0, x: 50 },
  show: (i = 0) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.15,
      duration: 0.6,
      ease: easeOut,
    },
  }),
};

const imageVariant = {
  hidden: { opacity: 0, x: -50 },
  show: {
    opacity: 1,
    x: 0,
    transition: {
      delay: 0.3,
      duration: 0.8,
      ease: easeOut,
    },
  },
};

type HeroSectionProps = {
  orientation?: "horizontal" | "vertical";
};

function HeroSection({ orientation = "horizontal" }: HeroSectionProps) {
  const isVertical = orientation === "vertical";
  const sharedMotionProps = {
    initial: "hidden",
    whileInView: "show",
    viewport: { once: true, amount: 0.15 },
  };

  return (
    <section className="relative overflow-hidden py-16 antialiased max-md:px-4 md:px-10 lg:px-30 xl:px-32.5">
      {/* Main Content */}
      <div
        className={cn(
          "grid grid-cols-1 items-center gap-3",
          isVertical
            ? "grid-cols-1 place-items-center items-center text-center"
            : "max-md:place-items-center md:grid-cols-2",
        )}
      >
        {/* Hero Title & Description */}
        <motion.div
          variants={textVariant}
          custom={0}
          {...sharedMotionProps}
          className={cn(
            "order-2 flex flex-col items-center max-md:text-center md:order-1",
            isVertical
              ? "justify-center"
              : "max-md:justify-center md:items-start",
          )}
        >
          {/* Badge */}
          <motion.div
            variants={textVariant}
            custom={1}
            className="bg-primary text-background mb-1.5 flex items-center gap-1.5 rounded-full border px-4 py-1.5 shadow-lg md:mb-3 md:px-5 md:py-2"
          >
            <LayoutDashboard size={14} strokeWidth={2} />
            <p className="text-xs font-semibold md:text-sm">
              Next.js Starter Kit
            </p>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={textVariant}
            custom={2}
            className="mb-3 text-2xl font-black max-md:leading-none md:text-3xl lg:text-4xl xl:text-5xl"
          >
            Your Go-To <span className="text-orange-500">Next.js</span> Frontend
            Starter
          </motion.h1>

          {/* Sub Headline */}
          <motion.p
            variants={textVariant}
            custom={3}
            className="text-muted-foreground font-nunito max-w-md text-xs leading-6 font-semibold tracking-tight md:text-sm"
          >
            A clean, scalable frontend starter built with Next.js, TypeScript,
            Tailwind CSS, and modern UI patterns so you can focus on building
            features, not boilerplate.
          </motion.p>

          {/* CTA */}
          <motion.div
            variants={textVariant}
            custom={4}
            className="mt-5 flex flex-col gap-4"
          >
            <div className="flex flex-col items-center gap-4 md:flex-row">
              <Button className="bg-primary hover:bg-primary/80 w-40 duration-200">
                <Link href={`/`} className="text-sm">
                  Get Started
                </Link>
              </Button>
              <Button variant="link">
                <Link
                  href="https://github.com/andreedyson/init-next"
                  className="text-sm"
                >
                  Use Template
                </Link>
              </Button>
            </div>
          </motion.div>
        </motion.div>

        {/* Hero Image */}
        <motion.div
          variants={imageVariant}
          {...sharedMotionProps}
          className={cn(
            !isVertical &&
              "relative flex aspect-video items-center justify-center lg:w-full",
            "order-1 md:order-2",
          )}
        >
          <Image
            src={"/assets/image-placeholder.svg"}
            width={1000}
            height={700}
            alt="Hero Section"
            className={cn(
              isVertical &&
                "aspect-video size-62.5 rounded-xl object-contain md:size-87.5 lg:size-90",
            )}
          />
        </motion.div>
      </div>
    </section>
  );
}

export default HeroSection;
