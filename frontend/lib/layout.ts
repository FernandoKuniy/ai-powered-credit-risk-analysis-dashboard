/**
 * Page width, in one place, because the header has to line up with whatever is under it.
 *
 * Almost everything is a narrow reading column. The dashboard is the exception: it puts two
 * charts side by side, and at 4xl they get squeezed to the point where the x-axis labels
 * start colliding. Nothing else earns the extra width.
 */
export const NARROW = "mx-auto w-full max-w-4xl px-6";
export const WIDE = "mx-auto w-full max-w-5xl px-6";

export function widthFor(pathname: string): string {
  return pathname.startsWith("/dashboard") ? WIDE : NARROW;
}
