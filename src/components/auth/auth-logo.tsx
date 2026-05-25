import { cn } from "@/lib/utils";

export function AuthLogo({ className }: Readonly<{ className?: string }>) {
  return (
    <div
      className={cn(
        "mx-auto flex size-14 items-center justify-center",
        className,
      )}
      aria-hidden
    >
      <svg
        className="size-full"
        fill="none"
        viewBox="0 0 56 56"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M28 8c-6 8-14 12-14 22 0 8 6 14 14 14s14-6 14-14c0-10-8-14-14-22z"
          fill="url(#auth-logo-gradient)"
        />
        <path
          d="M22 32c2 4 4 6 6 8 2-2 4-4 6-8-3 1-6 1-12 0z"
          fill="#E85D04"
          opacity="0.9"
        />
        <defs>
          <linearGradient
            gradientUnits="userSpaceOnUse"
            id="auth-logo-gradient"
            x1="14"
            x2="42"
            y1="8"
            y2="44"
          >
            <stop stopColor="#F48C06" />
            <stop offset="1" stopColor="#E63946" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
