/**
 * Mirrors `src/app/globals.css` `:root` (shadcn). Resend/inbox HTML must use
 * inline styles — Tailwind and shadcn components are not applied to these templates.
 */
export const emailTheme = {
  background: "#ffffff",
  foreground: "#0a0a0a",
  card: "#ffffff",
  primary: "#171717",
  primaryForeground: "#fafafa",
  muted: "#f5f5f5",
  mutedForeground: "#737373",
  border: "#e5e5e5",
  radius: "0.625rem",
  shadowSm:
    "0 1px 3px 0px hsl(0 0% 0% / 0.05), 0 1px 2px -1px hsl(0 0% 0% / 0.05)",
} as const;

export const fontSans =
  'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif';
