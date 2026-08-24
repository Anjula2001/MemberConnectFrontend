import { redirect } from "next/navigation";

/**
 * Member Transfers no longer has a screen of its own.
 *
 * Requirement 02 puts every transfer on the "All Member Profile Change Requests List"
 * alongside the other four types, filtered by the same Type dropdown (MMC28) - and said
 * so identically in MMC02, MMC06, MMC15 and MMC19. Two screens meant two Type
 * dropdowns, two Location lists (this one hardcoded 25 districts instead of reading the
 * master) and two status vocabularies; and because this page never navigated back,
 * picking any other type here was a dead end.
 *
 * The route redirects rather than 404s so existing links and bookmarks still land
 * somewhere sensible.
 */
export default function MemberTransferPage() {
  redirect("/membership/profile-changes");
}
