"use client";

import {
  Building2,
  Check,
  Users,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const ONBOARDING_STEPS = [
  {
    id: "account",
    label: "Account",
    description: "Confirm your organisation details",
    icon: Building2,
  },
  {
    id: "warehouse",
    label: "Warehouse",
    description: "Add your first operating site",
    icon: Warehouse,
  },
  {
    id: "team",
    label: "Team",
    description: "Invite managers and staff",
    icon: Users,
  },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
}>;

export function OnboardingStepper({
  currentStep,
}: Readonly<{ currentStep: number }>) {
  return (
    <>
      <nav
        aria-label="Onboarding progress"
        className="onboarding-stepper onboarding-stepper--horizontal lg:hidden"
      >
        {ONBOARDING_STEPS.map((step, index) => (
          <OnboardingStepItem
            currentStep={currentStep}
            index={index}
            key={step.id}
            step={step}
          />
        ))}
      </nav>

      <nav
        aria-label="Onboarding progress"
        className="onboarding-stepper onboarding-stepper--vertical hidden lg:flex"
      >
        {ONBOARDING_STEPS.map((step, index) => (
          <OnboardingStepItem
            currentStep={currentStep}
            index={index}
            key={step.id}
            step={step}
            variant="vertical"
          />
        ))}
      </nav>
    </>
  );
}

function OnboardingStepItem({
  currentStep,
  index,
  step,
  variant = "horizontal",
}: Readonly<{
  currentStep: number;
  index: number;
  step: (typeof ONBOARDING_STEPS)[number];
  variant?: "horizontal" | "vertical";
}>) {
  const Icon = step.icon;
  const isComplete = currentStep > index;
  const isActive = currentStep === index;

  return (
    <div
      className={cn(
        "onboarding-step-item",
        variant === "vertical" && "onboarding-step-item--vertical",
        isActive && "onboarding-step-item--active",
        isComplete && "onboarding-step-item--complete",
      )}
    >
      <div className="onboarding-step-marker" aria-hidden>
        {isComplete ? (
          <Check className="size-4" />
        ) : (
          <Icon className="size-4" />
        )}
      </div>
      <div className="min-w-0">
        <p className="onboarding-step-label">
          {index + 1}. {step.label}
        </p>
        {variant === "vertical" ? (
          <p className="onboarding-step-description">{step.description}</p>
        ) : null}
      </div>
    </div>
  );
}
