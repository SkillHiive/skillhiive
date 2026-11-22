import { useId } from "react";
import { MARK_ASPECT, MARK_GLOW_BLUR, MARK_TILES, roundedSquarePath } from "@/lib/spaceScene";

/**
 * The SkillHiive mark, drawn from logo.png's fourteen squares so it stays sharp at any size: each
 * square with its own corners, a faint warm glow around it, and the slight shade some squares
 * have towards their bottom edge. `glow={false}` drops the glow where it would only blur (tiny sizes).
 */
export function LogoMark({
  height,
  className,
  title,
  glow = true,
}: {
  height?: number;
  className?: string;
  title?: string;
  glow?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const paths = MARK_TILES.map((t) => roundedSquarePath(t.x, t.y, t.size, t.radii));
  const pad = MARK_GLOW_BLUR * 4;
  return (
    <svg
      className={className}
      viewBox={`0 0 ${MARK_ASPECT} 1`}
      height={height}
      width={height ? height * MARK_ASPECT : undefined}
      overflow="visible"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        {glow && (
          <filter
            id={`${id}glow`}
            filterUnits="userSpaceOnUse"
            x={-pad}
            y={-pad}
            width={MARK_ASPECT + pad * 2}
            height={1 + pad * 2}
          >
            <feGaussianBlur stdDeviation={MARK_GLOW_BLUR} />
          </filter>
        )}
        <linearGradient id={`${id}shade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.62" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.07" />
        </linearGradient>
      </defs>
      {glow && (
        <g filter={`url(#${id}glow)`} opacity={0.5}>
          {paths.map((d, i) => (
            <path key={i} d={d} fill={MARK_TILES[i]!.glow} />
          ))}
        </g>
      )}
      {paths.map((d, i) => (
        <path key={i} d={d} fill={MARK_TILES[i]!.color} />
      ))}
      {paths.map((d, i) => (MARK_TILES[i]!.shade ? <path key={i} d={d} fill={`url(#${id}shade)`} /> : null))}
    </svg>
  );
}
