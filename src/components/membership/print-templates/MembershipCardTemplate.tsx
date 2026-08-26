"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

import type { MemberDTO } from "@/lib/api/member";

/**
 * Membership Card — front face, CR-80 (85.6 x 54 mm).
 *
 * The reverse is intentionally blank (nothing is printed on it), so the QR —
 * which encodes the Member ID — lives on the front.
 *
 * All dimensions are in millimetres so the card prints at true physical size
 * regardless of screen DPI. Values are the signed-off mockup's pixels / 10.
 */
export default function MembershipCardTemplate({
  member,
  photoUrl,
}: {
  member: MemberDTO;
  /**
   * The member's photograph, resolved by the caller from the PROFILE_PHOTO document.
   *
   * Member.profilePictureUrl is a column nothing populates - the photograph is uploaded
   * as a document against the member's application, which is where the Member Profile
   * reads it from too. Relying on the column alone printed the silhouette on every card.
   * The column is still honoured as a fallback for any record that does carry one.
   */
  photoUrl?: string | null;
}) {
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    if (!member.memberId) return;
    let cancelled = false;
    QRCode.toDataURL(member.memberId, {
      margin: 0,
      width: 240,
      errorCorrectionLevel: "M",
    })
      .then((url) => !cancelled && setQr(url))
      .catch(() => {
        /* fall back to the empty box rather than failing the print */
      });
    return () => {
      cancelled = true;
    };
  }, [member.memberId]);

  const memberSince = member.membershipStartDate
    ? new Date(member.membershipStartDate).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "—";

  return (
    <div
      className="ffi-card"
      style={{
        position: "relative",
        width: "85.6mm",
        height: "54mm",
        background: "#ffffff",
        borderRadius: "2.8mm",
        overflow: "hidden",
        fontFamily: "var(--font-geist-sans), system-ui, -apple-system, 'Segoe UI', sans-serif",
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      {/* Brand band */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "11.6mm",
          padding: "0 4mm",
          background: "#953002",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1.6mm" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "5.2mm",
              height: "5.2mm",
              borderRadius: "1.2mm",
              background: "rgba(255,255,255,0.16)",
            }}
          >
            <svg width="2.8mm" height="2.8mm" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 10.5 12 4l9 6.5" />
              <path d="M5 10.5V20h14v-9.5" />
              <path d="M9.5 20v-5.5h5V20" />
            </svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.2mm" }}>
            <span style={{ fontSize: "2.2mm", fontWeight: 700, letterSpacing: "-0.02mm", color: "#ffffff" }}>
              Future Finance Institute
            </span>
            <span style={{ fontSize: "1.2mm", fontWeight: 500, letterSpacing: "0.14mm", textTransform: "uppercase", color: "rgba(255,255,255,0.72)" }}>
              Member Services
            </span>
          </div>
        </div>
        <span style={{ fontSize: "1.3mm", fontWeight: 600, letterSpacing: "0.22mm", textTransform: "uppercase", color: "rgba(255,255,255,0.9)" }}>
          Membership Card
        </span>
      </div>

      {/* Body */}
      <div style={{ display: "flex", gap: "3.2mm", padding: "3.2mm 4mm 0 4mm" }}>
        {/* Photograph */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.8mm" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "17.6mm",
              height: "21.2mm",
              border: "0.2mm solid #e4e4e7",
              borderRadius: "1mm",
              background: "#fafafa",
              overflow: "hidden",
            }}
          >
            {photoUrl || member.profilePictureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl || member.profilePictureUrl}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <svg width="5.2mm" height="5.2mm" viewBox="0 0 24 24" fill="none" stroke="#c4c4c8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8.5" r="3.75" />
                <path d="M4.5 20c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6" />
              </svg>
            )}
          </div>
        </div>

        {/* Identity — inset on the right so the QR never collides with it */}
        <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, gap: "2mm", paddingRight: "12.8mm" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.3mm" }}>
            <span style={{ fontSize: "1mm", fontWeight: 600, letterSpacing: "0.14mm", textTransform: "uppercase", color: "#a1a1aa" }}>
              Name
            </span>
            <span style={{ fontSize: "3mm", fontWeight: 700, letterSpacing: "-0.04mm", color: "#18181b" }}>
              {member.nameWithInitials || member.fullName || "—"}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "1.8mm 2.4mm" }}>
            {[
              ["Member ID", member.memberId ?? "—", true],
              ["NIC Number", member.nic ?? "—", false],
              ["Member Since", memberSince, false],
              ["Member Type", member.memberType ?? "Member", false],
            ].map(([label, value, accent]) => (
              <div key={label as string} style={{ display: "flex", flexDirection: "column", gap: "0.3mm" }}>
                <span style={{ fontSize: "1mm", fontWeight: 600, letterSpacing: "0.14mm", textTransform: "uppercase", color: "#a1a1aa" }}>
                  {label as string}
                </span>
                <span
                  style={{
                    fontSize: "1.9mm",
                    fontWeight: 600,
                    letterSpacing: "0.06mm",
                    color: accent ? "#953002" : "#18181b",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {value as string}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* QR encoding the Member ID */}
      <div style={{ position: "absolute", right: "4mm", bottom: "7.8mm", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4mm" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "10.4mm",
            height: "10.4mm",
            border: "0.2mm solid #e4e4e7",
            borderRadius: "0.8mm",
            background: "#ffffff",
            padding: "0.6mm",
          }}
        >
          {qr && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt={member.memberId ?? ""} style={{ width: "100%", height: "100%" }} />
          )}
        </div>
      </div>

      {/* Footer strip */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "5.6mm",
          padding: "0 4mm",
          background: "#fdf5f2",
          borderTop: "0.2mm solid #f0ded6",
        }}
      >
        <span style={{ fontSize: "1.1mm", color: "#8b6a5c" }}>
          This card remains the property of Future Finance Institute.
        </span>
        <span style={{ fontSize: "1.1mm", fontWeight: 600, letterSpacing: "0.08mm", color: "#953002" }}>
          ffi.lk
        </span>
      </div>
    </div>
  );
}
