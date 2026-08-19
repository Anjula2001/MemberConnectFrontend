"use client";

import type { MemberDTO } from "@/lib/api/member";

/**
 * Passbook first page — A6 portrait (105 x 148 mm).
 *
 * The system prints ONLY the member's details; the institute name, field labels
 * and ruled transaction lines are already on the pre-printed stock. Account
 * details are deliberately not printed (spec 4.9).
 *
 * Because the print head never lands in exactly the same place on real stock,
 * the whole printed block is shifted by a configurable offset — dial it in once
 * against a test print rather than editing code. Defaults come from the
 * signed-off mockup.
 */
export interface PassbookOffset {
  x: number; // mm, positive moves right
  y: number; // mm, positive moves down
}

export const DEFAULT_PASSBOOK_OFFSET: PassbookOffset = { x: 0, y: 0 };

export default function PassbookTemplate({
  member,
  offset = DEFAULT_PASSBOOK_OFFSET,
  showStockGuide = false,
}: {
  member: MemberDTO;
  offset?: PassbookOffset;
  /** Screen-only aid: ghosts the pre-printed stock so alignment can be judged. */
  showStockGuide?: boolean;
}) {
  const memberSince = member.membershipStartDate
    ? new Date(member.membershipStartDate).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "—";

  const displayName = [member.title, member.fullName].filter(Boolean).join(" ") || "—";

  // Baseline positions of the four printed values, measured from the mockup.
  const firstValueTop = 38.6;
  const valueGap = 7.4;
  const valueLeft = 30;

  const values = [displayName, member.memberId ?? "—", member.nic ?? "—", memberSince];

  return (
    <div
      className="ffi-passbook"
      style={{
        position: "relative",
        width: "105mm",
        height: "148mm",
        background: "#ffffff",
        overflow: "hidden",
        fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      {/* Ghost of the pre-printed stock. Screen aid only — never printed. */}
      {showStockGuide && (
        <div className="stock-guide" style={{ position: "absolute", inset: 0, color: "#d9d9dd" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1mm", paddingTop: "9.2mm" }}>
            <span style={{ fontSize: "3mm", fontWeight: 700, color: "#d9d9dd" }}>
              Future Finance Institute
            </span>
            <span style={{ fontSize: "1.5mm", fontWeight: 500, letterSpacing: "0.3mm", textTransform: "uppercase", color: "#d9d9dd" }}>
              Member Passbook
            </span>
          </div>
          <div style={{ height: "0.2mm", margin: "4.6mm 9mm 0 9mm", background: "#e8e8ec" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: "7.4mm", padding: "6.6mm 9mm 0 9mm" }}>
            {["Name", "Member ID", "NIC Number", "Member Since"].map((l) => (
              <span key={l} style={{ fontSize: "1.7mm", fontWeight: 600, letterSpacing: "0.12mm", textTransform: "uppercase", color: "#d9d9dd" }}>
                {l}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* System-printed values — the only thing that actually hits the paper. */}
      <div
        style={{
          position: "absolute",
          left: `${valueLeft + offset.x}mm`,
          top: `${firstValueTop + offset.y}mm`,
          display: "flex",
          flexDirection: "column",
          gap: `${valueGap - 2.7}mm`,
        }}
      >
        {values.map((v, i) => (
          <span
            key={i}
            style={{
              fontSize: "2.7mm",
              fontWeight: 600,
              color: "#18181b",
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}
