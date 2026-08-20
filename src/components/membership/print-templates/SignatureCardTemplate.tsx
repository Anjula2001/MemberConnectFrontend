"use client";

import type { MemberDTO } from "@/lib/api/member";

/**
 * Membership Signature Card — A6 landscape (148 x 105 mm).
 *
 * Posted to the member, signed in wet ink, then brought back to a District
 * Office to be scanned onto the membership profile. The signature box and the
 * "For Office Use" strip exist for that round trip.
 *
 * Dimensions in millimetres = signed-off mockup pixels / 10.
 */
export default function SignatureCardTemplate({ member }: { member: MemberDTO }) {
  const memberSince = member.membershipStartDate
    ? new Date(member.membershipStartDate).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "—";

  const field = (label: string, value: string, span = 1) => (
    <div key={label} style={{ display: "flex", flexDirection: "column", gap: "0.5mm", gridColumn: `span ${span}` }}>
      <span style={{ fontSize: "1.1mm", fontWeight: 600, letterSpacing: "0.12mm", textTransform: "uppercase", color: "#a1a1aa" }}>
        {label}
      </span>
      <span style={{ fontSize: "2.2mm", fontWeight: 600, color: "#18181b" }}>{value}</span>
    </div>
  );

  return (
    <div
      className="ffi-signature-card"
      style={{
        position: "relative",
        width: "148mm",
        height: "105mm",
        background: "#ffffff",
        fontFamily: "var(--font-geist-sans), system-ui, -apple-system, 'Segoe UI', sans-serif",
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4.4mm 5.6mm 0 5.6mm" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1.8mm" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "5.6mm",
              height: "5.6mm",
              borderRadius: "1.2mm",
              background: "#9e3600",
            }}
          >
            <svg width="3mm" height="3mm" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 10.5 12 4l9 6.5" />
              <path d="M5 10.5V20h14v-9.5" />
              <path d="M9.5 20v-5.5h5V20" />
            </svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.3mm" }}>
            <span style={{ fontSize: "2.5mm", fontWeight: 700, letterSpacing: "-0.02mm", color: "#953002" }}>
              Future Finance Institute
            </span>
            <span style={{ fontSize: "1.3mm", fontWeight: 500, letterSpacing: "0.14mm", textTransform: "uppercase", color: "#a1a1aa" }}>
              Membership Signature Card
            </span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.3mm" }}>
          <span style={{ fontSize: "1.1mm", fontWeight: 600, letterSpacing: "0.12mm", textTransform: "uppercase", color: "#a1a1aa" }}>
            Member ID
          </span>
          <span style={{ fontSize: "2.4mm", fontWeight: 700, letterSpacing: "0.06mm", color: "#9e3600", fontVariantNumeric: "tabular-nums" }}>
            {member.memberId ?? "—"}
          </span>
        </div>
      </div>

      <div style={{ height: "0.3mm", margin: "2.6mm 5.6mm 0 5.6mm", background: "#9e3600" }} />

      {/* Member particulars */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "2.6mm 3.2mm", padding: "3.2mm 5.6mm 0 5.6mm" }}>
        {field("Name with Initials", member.nameWithInitials || member.fullName || "—")}
        {field("NIC Number", member.nic ?? "—")}
        {field("Member Since", memberSince)}
        {field("Working Location", member.workingLocation ?? "—", 2)}
        {field("Designation", member.designation ?? "—")}
      </div>

      {/* Wet-ink signature box */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1mm", padding: "4mm 5.6mm 0 5.6mm" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <span style={{ fontSize: "1.3mm", fontWeight: 600, color: "#3f3f46" }}>Specimen Signature</span>
          <span style={{ fontSize: "1.2mm", color: "#a1a1aa" }}>
            Sign inside the box in black or blue ink. Do not sign over the border.
          </span>
        </div>
        <div style={{ height: "19mm", border: "0.15mm solid #3f3f46", borderRadius: "0.6mm", background: "#ffffff" }} />
      </div>

      {/* Declaration + date */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "4mm", padding: "2.6mm 5.6mm 0 5.6mm" }}>
        <span style={{ fontSize: "1.2mm", lineHeight: 1.5, color: "#52525b", maxWidth: "84mm", textWrap: "pretty" }}>
          I certify that the signature above is my true and specimen signature, and authorise
          Future Finance Institute to verify my instructions against it.
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6mm", width: "30mm" }}>
          <div style={{ height: "0.15mm", background: "#3f3f46" }} />
          <span style={{ fontSize: "1.2mm", fontWeight: 600, letterSpacing: "0.1mm", textTransform: "uppercase", color: "#a1a1aa" }}>
            Date
          </span>
        </div>
      </div>

      {/* Office use strip */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          gap: "4mm",
          height: "10.4mm",
          padding: "0 5.6mm",
          background: "#fafafa",
          borderTop: "0.15mm solid #e4e4e7",
        }}
      >
        <span style={{ fontSize: "1.1mm", fontWeight: 700, letterSpacing: "0.14mm", textTransform: "uppercase", color: "#a1a1aa", whiteSpace: "nowrap" }}>
          For Office Use
        </span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "3.2mm", flexGrow: 1 }}>
          {["Received Date", "District Office", "Scanned & Uploaded By"].map((label) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", gap: "0.5mm" }}>
              <div style={{ height: "0.1mm", background: "#c4c4c8" }} />
              <span style={{ fontSize: "1.1mm", color: "#a1a1aa" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
