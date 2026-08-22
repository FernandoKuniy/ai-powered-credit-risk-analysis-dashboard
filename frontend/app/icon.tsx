import { ImageResponse } from "next/og";

import { markDataUri } from "../lib/brand";

// The browser tab icon. Next renders this once at build time and serves the PNG. It replaces
// the checked-in icon.png, which had to go: Next resolves one icon convention per route, so
// keeping both would be a conflict.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  // next/og cannot inline arbitrary SVG as JSX, so the mark goes in as a background image
  // built from a data URI rather than fighting satori's partial SVG support.
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          backgroundImage: `url("${markDataUri(size.width)}")`,
          backgroundSize: `${size.width}px ${size.height}px`,
        }}
      />
    ),
    size,
  );
}
