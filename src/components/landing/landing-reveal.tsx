"use client";

import {
  motion,
  useReducedMotion,
  type HTMLMotionProps,
  type Variants,
} from "framer-motion";
import type { ReactNode } from "react";
import {
  landingFadeUp,
  landingTransition,
  landingViewport,
  LANDING_DURATION,
} from "@/components/landing/landing-motion";
import { cn } from "@/lib/utils";

type RevealProps = Readonly<{
  children: ReactNode;
  className?: string;
  delay?: number;
  variants?: Variants;
  as?: "div" | "section" | "article" | "ul" | "li";
}>;

export function LandingReveal({
  children,
  className,
  delay = 0,
  variants = landingFadeUp,
  as = "div",
}: RevealProps) {
  const reduceMotion = useReducedMotion();
  const Component = motion[as];

  return (
    <Component
      className={className}
      initial={reduceMotion ? "visible" : "hidden"}
      whileInView="visible"
      viewport={landingViewport}
      variants={variants}
      transition={{
        ...landingTransition(LANDING_DURATION.base),
        delay: reduceMotion ? 0 : delay,
      }}
    >
      {children}
    </Component>
  );
}

type StaggerProps = Readonly<{
  children: ReactNode;
  className?: string;
  stagger?: number;
  as?: "div" | "ul" | "ol";
}>;

export function LandingStagger({
  children,
  className,
  stagger = 0.08,
  as = "div",
}: StaggerProps) {
  const reduceMotion = useReducedMotion();
  const Component = motion[as];

  return (
    <Component
      className={className}
      initial={reduceMotion ? "visible" : "hidden"}
      whileInView="visible"
      viewport={landingViewport}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: reduceMotion ? 0 : stagger,
            delayChildren: reduceMotion ? 0 : 0.05,
          },
        },
      }}
    >
      {children}
    </Component>
  );
}

export function LandingStaggerItem({
  children,
  className,
  variants = landingFadeUp,
  as = "div",
}: Readonly<{
  children: ReactNode;
  className?: string;
  variants?: Variants;
  as?: "div" | "li" | "article";
}>) {
  const reduceMotion = useReducedMotion();
  const Component = motion[as];

  return (
    <Component
      className={className}
      variants={variants}
      transition={landingTransition(LANDING_DURATION.fast)}
      style={reduceMotion ? { opacity: 1, transform: "none" } : undefined}
    >
      {children}
    </Component>
  );
}

export function LandingMotion({
  className,
  children,
  ...props
}: HTMLMotionProps<"div"> & { children: ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={cn(className)}
      initial={reduceMotion ? false : props.initial}
      {...props}
    >
      {children}
    </motion.div>
  );
}
