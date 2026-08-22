/**
 * The mark: a risk dial with the needle sitting in the low band.
 *
 * The app takes a loan application and returns one number on a scale, a probability of default
 * that maps onto a grade. A dial reading is that, which is why the glyph is a dial and not a
 * chart line or a shield.
 *
 * It lives here as SVG path data rather than a checked-in image so the browser tab icon, the
 * iOS home-screen icon, the social card and the header mark all draw one shape. `next/og`
 * rasterises the first three at build time and it reads SVG only through a data URI, which is
 * why this module builds a string rather than JSX. BrandMark renders the same paths inline.
 */

export const BRAND = {
  ink: "#0a0a0a", // page background in dark mode, and the social card's background
  tile: "#18181b", // the mark's rounded square (zinc-900)
  line: "#818cf8", // the dial (indigo-400)
  spark: "#c7d2fe", // the needle (indigo-200), lighter so it survives a 16px tab
  text: "#fafafa",
  muted: "#a1a1aa", // zinc-400
} as const;

/**
 * The mark's geometry, on a 32x32 grid.
 *
 * The dial is a 240-degree arc open at the bottom, centred at (16, 18.5) with radius 10. The
 * needle stops at radius 5.5 rather than reaching the arc: at a 3px stroke the round caps eat
 * 1.5 units at each end, so a longer needle closes the gap and the two shapes fuse into a blob
 * once a browser tab shrinks this to 16px. The gap is the whole reason it stays readable.
 */
export const MARK_VIEWBOX = "0 0 32 32";
export const MARK_DIAL_PATH = "M7.34 23.5A10 10 0 1 1 24.66 23.5";
export const MARK_NEEDLE_PATH = "M16 18.5L12.11 14.61";
export const MARK_STROKE_WIDTH = 3;
/** Default corner rounding for the tile, on the same 32-unit grid. */
export const MARK_RADIUS = 7;

/**
 * The mark at any size. `radius` rounds the tile's corners; pass 0 for iOS, which masks the
 * icon into its own shape and leaves a dark halo in the corners if we round it first.
 */
export function markSvg(size: number, radius: number = MARK_RADIUS): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${MARK_VIEWBOX}">`,
    `<rect width="32" height="32" rx="${radius}" fill="${BRAND.tile}"/>`,
    `<path d="${MARK_DIAL_PATH}" fill="none" stroke="${BRAND.line}" stroke-width="${MARK_STROKE_WIDTH}" stroke-linecap="round" stroke-linejoin="round"/>`,
    `<path d="${MARK_NEEDLE_PATH}" fill="none" stroke="${BRAND.spark}" stroke-width="${MARK_STROKE_WIDTH}" stroke-linecap="round" stroke-linejoin="round"/>`,
    `</svg>`,
  ].join("");
}

/** The same mark as a data URI, the form `next/og` can draw. */
export function markDataUri(size: number, radius: number = MARK_RADIUS): string {
  return `data:image/svg+xml;base64,${Buffer.from(markSvg(size, radius)).toString("base64")}`;
}
