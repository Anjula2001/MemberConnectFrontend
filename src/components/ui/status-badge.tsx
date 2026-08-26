import { Badge } from "@/src/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  STATUS_BADGE_LAYOUT,
  humanStatus,
  statusBadgeClass,
  type StatusVocabulary,
} from "@/lib/statusBadge";

/**
 * The status pill, for every results table in the system.
 *
 * Use this rather than a <span className="rounded-full ...">: a padded inline span
 * paints its background per line box, so any status long enough to wrap renders as two
 * broken half-pills. Badge is inline-flex and whitespace-nowrap, so it cannot.
 *
 * `vocabulary` picks the colour map - "member" for MemberStatus, "request" for member
 * applications and profile-change requests. See lib/statusBadge.ts for why these are
 * separate maps behind one visual spec.
 */
export function StatusBadge({
  status,
  vocabulary,
  className,
}: {
  status?: string | null;
  vocabulary: StatusVocabulary;
  className?: string;
}) {
  return (
    <Badge
      className={cn(STATUS_BADGE_LAYOUT, statusBadgeClass(vocabulary, status), className)}
    >
      {humanStatus(status)}
    </Badge>
  );
}
