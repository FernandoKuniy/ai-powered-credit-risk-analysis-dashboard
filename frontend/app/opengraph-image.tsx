import { ImageResponse } from "next/og";

import { BRAND, markDataUri } from "../lib/brand";

// The card that shows up when the link gets pasted into Slack, LinkedIn or iMessage. Next
// reuses this file for the Twitter card too, so there is only one image to keep in sync.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Credit Risk Analytics: score a loan application and see what moved the number";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          background: BRAND.ink,
          padding: 80,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div
            style={{
              display: "flex",
              width: 104,
              height: 104,
              backgroundImage: `url("${markDataUri(104)}")`,
              backgroundSize: "104px 104px",
            }}
          />
          <div style={{ fontSize: 56, color: BRAND.text, letterSpacing: -1 }}>
            Credit Risk Analytics
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 46, color: BRAND.text, lineHeight: 1.25 }}>
            Score a loan application and see what moved the number.
          </div>
          <div style={{ fontSize: 30, color: BRAND.muted, lineHeight: 1.4 }}>
            A probability of default, the grade it maps to, and the applicant&apos;s own figures
            ranked by how much each one pushed the result.
          </div>
        </div>

        <div style={{ fontSize: 24, color: BRAND.muted }}>
          Model output, not a lending decision.
        </div>
      </div>
    ),
    size,
  );
}
