"use client";

import type { MemberDTO } from "@/lib/api/member";

/**
 * Passbook first page — A6 portrait (105 x 148 mm).
 *
 * The system prints ONLY the member's details; the institute name, field labels
 * and ruled lines are already on the pre-printed stock. Account details are
 * deliberately not printed (spec 4.9).
 *
 * Both layers are absolutely positioned from the SAME row constants below, so the
 * printed values and the stock's labels cannot drift apart. They are separate
 * layers (rather than one flow) because the stock guide is hidden when printing —
 * if the values depended on it for position, hiding it would move them.
 */
export interface PassbookOffset {
  x: number; // mm, positive moves right
  y: number; // mm, positive moves down
}

export const DEFAULT_PASSBOOK_OFFSET: PassbookOffset = { x: 0, y: 0 };

/** Shared geometry — the single source of truth for both layers. */
const FIRST_ROW_TOP = 40; // mm from the top of the page to the first row
const ROW_PITCH = 11; // mm between consecutive rows
const ROW_HEIGHT = 8; // mm; each row centres its content vertically
const LABEL_LEFT = 9; // mm
const VALUE_LEFT = 34; // mm

const FONT_STACK =
  'var(--font-geist-sans), system-ui, -apple-system, "Segoe UI", sans-serif';

const ROWS = ["Name", "Member ID", "NIC Number", "Member Since"] as const;

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

  const values = [
    [member.title, member.fullName].filter(Boolean).join(" ") || "—",
    member.memberId ?? "—",
    member.nic ?? "—",
    memberSince,
  ];

  /** A row box at the shared vertical position for index i. */
  const rowStyle = (i: number, left: number, dx = 0, dy = 0): React.CSSProperties => ({
    position: "absolute",
    left: `${left + dx}mm`,
    top: `${FIRST_ROW_TOP + i * ROW_PITCH + dy}mm`,
    height: `${ROW_HEIGHT}mm`,
    display: "flex",
    alignItems: "center",
  });

  return (
    <div
      className="ffi-passbook"
      style={{
        position: "relative",
        width: "105mm",
        height: "148mm",
        background: "#ffffff",
        overflow: "hidden",
        fontFamily: FONT_STACK,
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      {/* ---- Pre-printed stock (screen aid only; never printed) ---- */}
      {showStockGuide && (
        <div className="stock-guide" style={{ position: "absolute", inset: 0 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1mm",
              paddingTop: "14mm",
            }}
          >
            <span style={{ fontSize: "5mm", fontWeight: 700, color: "#6b6b74", letterSpacing: "-0.05mm" }}>
              Future Finance Institute
            </span>
            <span
              style={{
                fontSize: "2.2mm",
                fontWeight: 500,
                letterSpacing: "0.6mm",
                textTransform: "uppercase",
                color: "#71717a",
              }}
            >
              Member Passbook
            </span>
          </div>
          <div
            style={{
              position: "absolute",
              left: `${LABEL_LEFT}mm`,
              right: `${LABEL_LEFT}mm`,
              top: `${FIRST_ROW_TOP - 6}mm`,
              height: "0.3mm",
              background: "#cfcfd6",
            }}
          />
          {ROWS.map((label, i) => (
            <div key={label} style={rowStyle(i, LABEL_LEFT)}>
              <span
                style={{
                  fontSize: "2.4mm",
                  fontWeight: 600,
                  letterSpacing: "0.2mm",
                  textTransform: "uppercase",
                  color: "#71717a",
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </span>
            </div>
          ))}
          {/* Ruled area the teller writes in */}
          <div
            style={{
              position: "absolute",
              left: `${LABEL_LEFT}mm`,
              right: `${LABEL_LEFT}mm`,
              bottom: "18mm",
              display: "flex",
              flexDirection: "column",
              gap: "6mm",
            }}
          >
            {[0, 1, 2, 3].map((n) => (
              <div key={n} style={{ height: "0.2mm", background: "#dcdce2" }} />
            ))}
          </div>
        </div>
      )}

      {/* ---- System-printed values: the only thing that hits the paper ---- */}
      {values.map((v, i) => (
        <div key={i} style={rowStyle(i, VALUE_LEFT, offset.x, offset.y)}>
          <span
            style={{
              fontSize: "3.2mm",
              fontWeight: 600,
              color: "#18181b",
              lineHeight: 1,
              whiteSpace: "nowrap",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {v}
          </span>
        </div>
      ))}
    </div>
  );
}
