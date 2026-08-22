import {
  BRAND,
  MARK_DIAL_PATH,
  MARK_NEEDLE_PATH,
  MARK_RADIUS,
  MARK_STROKE_WIDTH,
  MARK_VIEWBOX,
} from "../../lib/brand";

/**
 * The mark, rendered inline for the header.
 *
 * Inline SVG rather than an <img> pointing at /icon: it is a few hundred bytes in the HTML
 * with no second request, and it stays crisp at any size. The geometry comes from lib/brand,
 * the same constants the favicon, the iOS icon and the social card are built from, so there
 * is one shape to change rather than four.
 *
 * Decorative, so it is hidden from assistive tech: the wordmark beside it already says the
 * name, and a screen reader announcing it twice would be noise.
 */
export default function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={MARK_VIEWBOX}
      aria-hidden="true"
      focusable="false"
      className="shrink-0"
    >
      <rect width="32" height="32" rx={MARK_RADIUS} fill={BRAND.tile} />
      <path
        d={MARK_DIAL_PATH}
        fill="none"
        stroke={BRAND.line}
        strokeWidth={MARK_STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={MARK_NEEDLE_PATH}
        fill="none"
        stroke={BRAND.spark}
        strokeWidth={MARK_STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
