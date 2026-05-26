import { AuthLogo } from "@/components/auth/auth-logo";
import { cn } from "@/lib/utils";

type AuthHeaderProps = Readonly<{
  title: string;
  description?: string;
  className?: string;
  compact?: boolean;
}>;

export function AuthHeader({
  title,
  description,
  className,
  compact = false,
}: AuthHeaderProps) {
  return (
    <header
      className={cn(
        "space-y-3 text-center",
        compact ? "mb-5" : "mb-8",
        className,
      )}
    >
      <AuthLogo className={compact ? "size-12" : undefined} />
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-[#1e293b]">
          {title}
        </h1>
        {description ? (
          <p className="text-sm text-[#64748b]">{description}</p>
        ) : null}
      </div>
    </header>
  );
}
