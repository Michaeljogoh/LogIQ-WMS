import { cn } from "@/lib/utils";

export const LOGIQ_LOGO_WIDTH = 220;
export const LOGIQ_LOGO_HEIGHT = 120;

type LogIQLogoVariant = "on-dark" | "on-light";

type LogIQLogoProps = Readonly<{
  bold?: boolean;
  className?: string;
  height?: number;
  variant?: LogIQLogoVariant;
}>;

function hexPoints(cx: number, cy: number, radius: number) {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = (Math.PI / 180) * (60 * index - 90);
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  });
}

function toPath(points: Array<{ x: number; y: number }>) {
  const [first, ...rest] = points;
  return `M ${first.x} ${first.y} ${rest.map((point) => `L ${point.x} ${point.y}`).join(" ")} Z`;
}

export function LogIQLogo({
  bold = false,
  className,
  height = 40,
  variant = "on-dark",
}: LogIQLogoProps) {
  const width = Math.round((height / LOGIQ_LOGO_HEIGHT) * LOGIQ_LOGO_WIDTH);
  const isDark = variant === "on-dark";

  const logColor = isDark ? "#FFFFFF" : "#0A1628";
  const wmsColor = "#4DB8E9";
  const taglineColor = isDark ? "#8EB4D4" : "#64748B";
  const accent = "#4DB8E9";
  const accentBright = "#6FD4FF";
  const innerHexFill = isDark ? "#0F2438" : "#132238";

  const outerHex = hexPoints(40, 60, bold ? 36 : 34);
  const innerHex = hexPoints(40, 60, bold ? 24 : 23);
  const frameStroke = bold ? 4.75 : 3.25;
  const nodeRadius = bold ? 5.5 : 4.25;
  const nodeStroke = bold ? 2 : 1.5;

  return (
    <svg
      aria-label="LogIQ WMS 3PL Platform"
      className={cn("shrink-0", className)}
      fill="none"
      height={height}
      role="img"
      viewBox={`0 0 ${LOGIQ_LOGO_WIDTH} ${LOGIQ_LOGO_HEIGHT}`}
      width={width}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d={toPath(outerHex)}
        stroke={accent}
        strokeLinejoin="round"
        strokeWidth={frameStroke}
      />
      {outerHex.map((point, index) => (
        <circle
          key={`node-${index}`}
          cx={point.x}
          cy={point.y}
          fill={accentBright}
          r={nodeRadius}
          stroke={accent}
          strokeWidth={nodeStroke}
        />
      ))}
      <path d={toPath(innerHex)} fill={innerHexFill} />
      <text
        fill={accentBright}
        fontFamily="var(--font-geist-sans, system-ui, sans-serif)"
        fontSize={bold ? 19 : 17}
        fontWeight="900"
        textAnchor="middle"
        x="40"
        y="66"
      >
        IQ
      </text>

      <text
        fill={logColor}
        fontFamily="var(--font-geist-sans, system-ui, sans-serif)"
        fontSize={bold ? 38 : 34}
        fontWeight="900"
        letterSpacing="-0.02em"
        x="82"
        y="46"
      >
        Log
      </text>
      <text
        fill={wmsColor}
        fontFamily="var(--font-geist-sans, system-ui, sans-serif)"
        fontSize={bold ? 24 : 22}
        fontWeight="900"
        letterSpacing="0.28em"
        x="82"
        y="74"
      >
        WMS
      </text>
      <text
        fill={taglineColor}
        fontFamily="var(--font-geist-sans, system-ui, sans-serif)"
        fontSize={bold ? 11.5 : 10.5}
        fontWeight="800"
        letterSpacing="0.34em"
        x="82"
        y="96"
      >
        3PL PLATFORM
      </text>
    </svg>
  );
}
