"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Loader2, Lock, Printer } from "lucide-react";

import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";

import {
  getBoardApprovalLists,
  type BoardApprovalListDTO,
} from "@/lib/api/boardApprovalLists";
import {
  getTerminationApprovalLists,
  type TerminationApprovalListDTO,
} from "@/lib/api/terminationApprovalLists";
import {
  getDispatches,
  type MemberDocumentDispatchDTO,
} from "@/lib/api/membershipDocuments";
import { useAuth, type UserRole } from "@/lib/auth-context";
import {
  BOARD_GOVERNANCE_ROLES,
  CARD_PRINTING_ROLES,
  DISPATCH_ROLES,
  DORMANT_BOARD_ROLES,
  REGISTRATION_ROLES,
  TERMINATION_BOARD_ROLES,
  hasRole,
} from "@/lib/permissions";
import {
  getDormantApprovalLists,
  type DormantApprovalList,
} from "@/lib/api/dormant";

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

/**
 * A Board Approval List holds one kind of record - MMC08 and MMC21 only allow a
 * homogeneous selection - so the first non-empty collection identifies it.
 *
 * Reports counted only applicationIds, which is why a Name Change or Nominee Change
 * list read "(0 applications)" here: the count was of the one thing those lists do
 * not contain. The Board Approvals screen already classifies lists this way.
 */
type BoardListContent = "applications" | "name-change" | "nominee-change";

const BOARD_LIST_CONTENT: Record<BoardListContent, { label: string; noun: string }> = {
  applications: { label: "Membership", noun: "application" },
  "name-change": { label: "Name Change", noun: "request" },
  "nominee-change": { label: "Nominee Change", noun: "request" },
};

const describeBoardList = (list: BoardApprovalListDTO) => {
  const names = list.nameChangeRequestIds?.length ?? 0;
  const nominees = list.nomineeChangeRequestIds?.length ?? 0;
  // applicationCount comes from the server. The list endpoint no longer ships
  // applicationIds - counting those here would read 0 for every membership list.
  const applications = list.applicationCount ?? list.applicationIds?.length ?? 0;

  const content: BoardListContent =
    names > 0 ? "name-change" : nominees > 0 ? "nominee-change" : "applications";

  return {
    ...BOARD_LIST_CONTENT[content],
    count: names > 0 ? names : nominees > 0 ? nominees : applications,
    content,
  };
};

/**
 * MMC11 and MMC24 are separate reports from the Application List, because a name or
 * nominee change is judged as a comparison and needs its current value printed too.
 * Sending every list to the application sheet printed an empty report for those two.
 */
const boardApprovalPrintPath = (list: BoardApprovalListDTO) => {
  const base = "/membership/board-approvals/print";
  const listId = encodeURIComponent(list.listId ?? "");
  const { content } = describeBoardList(list);

  if (content === "name-change") return `${base}/name/${listId}`;
  if (content === "nominee-change") return `${base}/nominee/${listId}`;
  return `${base}/${listId}`;
};

/**
 * The reports defined by section 5 of the Member Registration specification, plus
 * the Termination module's board report (MMT08), which is produced the same way and
 * had no home anywhere else.
 *
 * Only the ones that are actually implemented expose an action; the rest are listed
 * with an explicit "not yet available" state rather than a button that does nothing.
 */
type ReportDefinition = {
  section: string;
  title: string;
  category: string;
  description: string;
  roles: UserRole[];
  available: boolean;
  /** Shown instead of an action when the report is not yet implemented. */
  pendingNote?: string;
  /**
   * Where this report is actually produced, when that is a workflow screen rather
   * than here. A membership card belongs to a person and is reached from that
   * person's row, so Reports links to the screen instead of duplicating it.
   */
  href?: string;
  hrefLabel?: string;
};

const REPORTS: ReportDefinition[] = [
  {
    section: "5.1",
    title: "Application List for Board Approval",
    category: "Member Registration",
    description:
      "The list of applications attached to a Board Approval List, printed as the sheet taken into the Board Meeting for approval or rejection.",
    roles: BOARD_GOVERNANCE_ROLES,
    available: true,
  },
  {
    section: "5.2",
    title: "Membership Card",
    category: "Membership Documentation",
    description:
      "Printable membership card for an activated member, issued once the member's accounts have been created.",
    roles: CARD_PRINTING_ROLES,
    available: true,
    href: "/membership/print-membership-cards",
    hrefLabel: "Go to Print Membership Cards",
  },
  {
    section: "5.3",
    title: "Membership Signature Card",
    category: "Membership Documentation",
    description:
      "Signature card posted to the member for signing, then scanned back onto the membership profile.",
    roles: CARD_PRINTING_ROLES,
    available: true,
    href: "/membership/print-signature-cards",
    hrefLabel: "Go to Print Signature Cards",
  },
  {
    section: "5.4",
    title: "Member Profile Search Report",
    category: "Membership",
    description:
      "PDF of the membership records currently retrieved on the Membership Profile Search screen.",
    roles: REGISTRATION_ROLES,
    available: true,
    // Filter-driven: the report reflects whatever the directory has retrieved, so
    // Reports sends you there to set the criteria rather than duplicating them.
    href: "/membership/directory",
    hrefLabel: "Go to Member Directory",
  },
  {
    section: "5.5",
    title: "Dispatch Report",
    category: "Membership Documentation",
    description:
      "Record of the members whose membership documentation was posted in a given dispatch.",
    roles: DISPATCH_ROLES,
    available: true,
  },
  {
    section: "5.6",
    title: "Inactivation Approval List for Dormant Members",
    category: "Dormant Membership",
    description:
      "The dormant members put before a Board Meeting for inactivation, with blank Approve and Reject columns for the board to mark.",
    roles: DORMANT_BOARD_ROLES,
    available: true,
  },
  {
    // MMT08. Numbered in this page's own sequence, as 5.6 above is: the Termination
    // specification calls this its section 5.1, which would collide with the
    // Application List report at the top of this array.
    section: "5.7",
    title: "Termination Request List for Board Approval",
    category: "Termination",
    description:
      "The termination requests attached to a Termination Approval List, printed as the sheet taken into the Board Meeting for approval or rejection.",
    roles: TERMINATION_BOARD_ROLES,
    available: true,
  },
];

export default function ReportsPage() {
  const { user } = useAuth();

  const [approvalLists, setApprovalLists] = useState<BoardApprovalListDTO[]>([]);
  const [dormantLists, setDormantLists] = useState<DormantApprovalList[]>([]);
  const [selectedDormantListId, setSelectedDormantListId] = useState("");
  const [selectedListId, setSelectedListId] = useState("");
  const [loadingLists, setLoadingLists] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [dispatches, setDispatches] = useState<MemberDocumentDispatchDTO[]>([]);
  const [selectedDispatchNo, setSelectedDispatchNo] = useState("");

  const [terminationLists, setTerminationLists] = useState<TerminationApprovalListDTO[]>([]);
  const [selectedTerminationListId, setSelectedTerminationListId] = useState("");

  const canSeeBoardApprovalReport = hasRole(user?.role, BOARD_GOVERNANCE_ROLES);
  const canSeeDispatchReport = hasRole(user?.role, DISPATCH_ROLES);
  const canSeeDormantReport = hasRole(user?.role, DORMANT_BOARD_ROLES);
  const canSeeTerminationReport = hasRole(user?.role, TERMINATION_BOARD_ROLES);

  // Only the Board Approval report needs data up front, and only for roles that can
  // actually run it.
  useEffect(() => {
    if (!canSeeBoardApprovalReport) return;

    let cancelled = false;
    setLoadingLists(true);
    getBoardApprovalLists()
      .then((lists) => {
        if (cancelled) return;
        setApprovalLists(lists);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setListError(
          err instanceof Error ? err.message : "Failed to load board approval lists"
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingLists(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canSeeBoardApprovalReport]);

  useEffect(() => {
    if (!canSeeDormantReport) return;
    let cancelled = false;
    getDormantApprovalLists()
      .then((l) => !cancelled && setDormantLists(l))
      .catch(() => {
        /* selector simply stays empty */
      });
    return () => {
      cancelled = true;
    };
  }, [canSeeDormantReport]);

  useEffect(() => {
    if (!canSeeDispatchReport) return;
    let cancelled = false;
    getDispatches()
      .then((d) => !cancelled && setDispatches(d))
      .catch(() => {
        /* selector simply stays empty */
      });
    return () => {
      cancelled = true;
    };
  }, [canSeeDispatchReport]);

  useEffect(() => {
    if (!canSeeTerminationReport) return;
    let cancelled = false;
    getTerminationApprovalLists()
      .then((l) => !cancelled && setTerminationLists(l))
      .catch(() => {
        /* selector simply stays empty */
      });
    return () => {
      cancelled = true;
    };
  }, [canSeeTerminationReport]);

  // Newest meeting first — the list you just created is the one you want to print.
  const sortedLists = useMemo(
    () =>
      [...approvalLists].sort((a, b) =>
        (b.boardMeetingDate ?? "").localeCompare(a.boardMeetingDate ?? "")
      ),
    [approvalLists]
  );

  const sortedTerminationLists = useMemo(
    () =>
      [...terminationLists].sort((a, b) =>
        (b.boardMeetingDate ?? "").localeCompare(a.boardMeetingDate ?? "")
      ),
    [terminationLists]
  );

  const visibleReports = REPORTS.filter((report) => hasRole(user?.role, report.roles));

  const openBoardApprovalReport = () => {
    const list = sortedLists.find((item) => item.listId === selectedListId);
    if (!list) return;
    window.open(boardApprovalPrintPath(list), "_blank");
  };

  return (
    <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 p-4 md:p-6">
      <div className="max-w-6xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-[#9f3b07]">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Generate and print system reports.
          </p>
        </div>

        {visibleReports.length === 0 ? (
          <Card className="rounded-xl py-0">
            <CardContent className="flex items-center gap-3 p-5 text-sm text-muted-foreground">
              <Lock className="size-4 shrink-0" />
              No reports are available for your role.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {visibleReports.map((report) => {
              const isBoardApproval = report.section === "5.1";
              const isDispatchReport = report.section === "5.5";
              const isDormantReport = report.section === "5.6";
              const isTerminationReport = report.section === "5.7";

              return (
                <Card key={report.section} className="rounded-xl py-0">
                  <CardContent className="flex h-full flex-col justify-between gap-4 p-5">
                    <div className="space-y-2">
                      <h2 className="flex items-start gap-2 text-base font-semibold text-[#b45309]">
                        <FileText
                          className={`mt-0.5 size-4 shrink-0 ${
                            report.available ? "text-blue-500" : "text-neutral-300"
                          }`}
                        />
                        <span>{report.title}</span>
                      </h2>
                      <p className="text-xs font-medium text-muted-foreground">
                        {report.category}
                      </p>
                      <p className="text-sm leading-6 text-muted-foreground">
                        {report.description}
                      </p>
                    </div>

                    {report.available && isDormantReport ? (
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-neutral-600">
                          Approval List
                        </label>
                        <Select
                          value={selectedDormantListId}
                          onValueChange={setSelectedDormantListId}
                          disabled={dormantLists.length === 0}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue
                              placeholder={
                                dormantLists.length === 0
                                  ? "No approval lists created yet"
                                  : "Select an approval list"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {dormantLists.map((l) => (
                              <SelectItem key={l.listId} value={l.listId}>
                                {l.listId} — {formatDate(l.boardMeetingDate ?? undefined)} (
                                {l.memberIds.length} member
                                {l.memberIds.length === 1 ? "" : "s"})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 px-3 text-sm"
                          disabled={!selectedDormantListId}
                          onClick={() =>
                            window.open(
                              `/membership/dormant/approval-lists/print/${encodeURIComponent(
                                selectedDormantListId
                              )}`,
                              "_blank"
                            )
                          }
                        >
                          <Printer className="size-4" />
                          Open Report
                        </Button>
                      </div>
                    ) : report.available && report.href ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 px-3 text-sm"
                        onClick={() => window.open(report.href, "_blank")}
                      >
                        <Printer className="size-4" />
                        {report.hrefLabel ?? "Open"}
                      </Button>
                    ) : report.available && isDispatchReport ? (
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-neutral-600">Dispatch</label>
                        <Select
                          value={selectedDispatchNo}
                          onValueChange={setSelectedDispatchNo}
                          disabled={dispatches.length === 0}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue
                              placeholder={
                                dispatches.length === 0
                                  ? "No dispatches recorded yet"
                                  : "Select a dispatch"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {dispatches.map((d) => (
                              <SelectItem key={d.dispatchNo} value={d.dispatchNo ?? ""}>
                                {d.dispatchNo} — {formatDate(d.dispatchDate)} ({d.memberCount ?? 0} member
                                {(d.memberCount ?? 0) === 1 ? "" : "s"})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 px-3 text-sm"
                          disabled={!selectedDispatchNo}
                          onClick={() =>
                            window.open(
                              `/membership/dispatch/report/${encodeURIComponent(selectedDispatchNo)}`,
                              "_blank"
                            )
                          }
                        >
                          <Printer className="size-4" />
                          Open Report
                        </Button>
                      </div>
                    ) : report.available && isBoardApproval ? (
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-neutral-600">
                          Board Approval List
                        </label>
                        {listError ? (
                          <p className="text-sm text-red-600">{listError}</p>
                        ) : (
                          <Select
                            value={selectedListId}
                            onValueChange={setSelectedListId}
                            disabled={loadingLists || sortedLists.length === 0}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue
                                placeholder={
                                  loadingLists
                                    ? "Loading lists…"
                                    : sortedLists.length === 0
                                      ? "No board approval lists created yet"
                                      : "Select a board approval list"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {sortedLists.map((list) => {
                                const { label, noun, count } = describeBoardList(list);
                                return (
                                  <SelectItem
                                    key={list.listId}
                                    value={list.listId ?? ""}
                                  >
                                    {list.listId} — {formatDate(list.boardMeetingDate)} ·{" "}
                                    {label} ({count} {noun}
                                    {count === 1 ? "" : "s"})
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        )}

                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 px-3 text-sm"
                          onClick={openBoardApprovalReport}
                          disabled={!selectedListId}
                        >
                          {loadingLists ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Printer className="size-4" />
                          )}
                          Open Report
                        </Button>
                      </div>
                    ) : report.available && isTerminationReport ? (
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-neutral-600">
                          Termination Approval List
                        </label>
                        <Select
                          value={selectedTerminationListId}
                          onValueChange={setSelectedTerminationListId}
                          disabled={sortedTerminationLists.length === 0}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue
                              placeholder={
                                sortedTerminationLists.length === 0
                                  ? "No termination approval lists created yet"
                                  : "Select a termination approval list"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {sortedTerminationLists.map((list) => {
                              const count =
                                list.requestCount ?? list.requestNos?.length ?? 0;
                              return (
                                <SelectItem key={list.listId} value={list.listId ?? ""}>
                                  {list.listId} — {formatDate(list.boardMeetingDate)} ({count}{" "}
                                  request{count === 1 ? "" : "s"})
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 px-3 text-sm"
                          disabled={!selectedTerminationListId}
                          onClick={() =>
                            window.open(
                              `/membership/termination/approval-lists/print/${encodeURIComponent(
                                selectedTerminationListId
                              )}`,
                              "_blank"
                            )
                          }
                        >
                          <Printer className="size-4" />
                          Open Report
                        </Button>
                      </div>
                    ) : (
                      <p className="rounded-md border border-dashed border-neutral-300 bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
                        {report.pendingNote ?? "Not yet available."}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
