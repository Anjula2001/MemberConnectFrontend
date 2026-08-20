"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Eye, Loader2, Lock, Printer, RotateCcw, Search } from "lucide-react";

import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Checkbox } from "@/src/components/ui/checkbox";
import { ConfirmDialog } from "@/src/components/ui/confirm-dialog";
import { Input } from "@/src/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import {
  TablePagination,
  clampPage,
  pageSlice,
} from "@/src/components/ui/table-pagination";

import { searchMembers, type MemberDTO } from "@/lib/api/member";
import {
  markDocumentPrinted,
  type MembershipDocumentType,
} from "@/lib/api/membershipDocuments";
import { getEducationalDistricts } from "@/lib/api/education";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { CARD_PRINTING_ROLES, hasRole } from "@/lib/permissions";

/**
 * Shared screen for MR15 (Membership Cards), MR16 (Signature Cards) and MR17
 * (Passbooks). The three differ only in which "printed at" field they read and
 * which document they mark, so they share one implementation.
 *
 * Status is fixed to Active — the spec allows documentation only for active
 * membership profiles — and already-printed rows are locked out of both the
 * checkbox and Select All, reachable only through the single-member Re-Print.
 *
 * View and Print are separate actions on purpose: View opens the same sheet
 * without touching the printed date, so re-reading a document never looks like
 * reissuing it. Only Print/Re-Print records anything.
 */
export interface DocumentPrintScreenProps {
  documentType: MembershipDocumentType;
  title: string;
  description: string;
  /** Reads this document's printed-at timestamp off a member record. */
  printedAt: (member: MemberDTO) => string | null | undefined;
  /** Label for the "only members without this document" filter. */
  withoutLabel: string;
  /** Route segment under /membership/print/ that renders this document. */
  printRoute: "membership-card" | "signature-card" | "passbook";
}

const formatDateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export default function DocumentPrintScreen({
  documentType,
  title,
  description,
  printedAt,
  withoutLabel,
  printRoute,
}: DocumentPrintScreenProps) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const canPrint = hasRole(user?.role, CARD_PRINTING_ROLES);

  // The document on its own, without the leading verb: "Print Membership Cards" ->
  // "membership cards". The old confirm() interpolated the full title after a "Print"
  // label and read "Print print membership cards for 1 member?".
  const documentLabel = title.replace(/^print\s+/i, "").toLowerCase();

  const [members, setMembers] = useState<MemberDTO[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  // What the confirmation modal is asking about. null = modal closed. window.confirm()
  // returned synchronously; a React modal cannot, so the request is parked here between
  // the user pressing Print and confirming it.
  const [pendingPrint, setPendingPrint] = useState<{ ids: number[]; reprint: boolean } | null>(null);
  const [hasRetrieved, setHasRetrieved] = useState(false);
  const [page, setPage] = useState(1);

  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState("all");
  const [printedFilter, setPrintedFilter] = useState<"without" | "all">("without");
  const [sortBy, setSortBy] = useState("membership-date");
  const [districtOptions, setDistrictOptions] = useState<string[]>([]);

  useEffect(() => {
    getEducationalDistricts()
      .then(setDistrictOptions)
      .catch(() => {
        /* filter simply shows no options */
      });
  }, []);

  const retrieve = useCallback(async () => {
    setLoading(true);
    try {
      const data = await searchMembers({
        query: searchQuery.trim() || undefined,
        // Documentation is only ever printed for active memberships.
        statuses: ["ACTIVE"],
        locations: location !== "all" ? [location] : undefined,
      });

      const filtered =
        printedFilter === "without" ? data.filter((m) => !printedAt(m)) : data;

      const sorted = [...filtered].sort((a, b) => {
        if (sortBy === "memberID") return (a.memberId ?? "").localeCompare(b.memberId ?? "");
        if (sortBy === "district")
          return (a.submissionLocation ?? "").localeCompare(b.submissionLocation ?? "");
        return (a.membershipStartDate ?? "").localeCompare(b.membershipStartDate ?? "");
      });

      setMembers(sorted);
      setSelected([]);
      setPage(1);
      setHasRetrieved(true);
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : "Failed to retrieve members",
        "destructive"
      );
    } finally {
      setLoading(false);
    }
  }, [searchQuery, location, printedFilter, sortBy, printedAt, addToast]);

  useEffect(() => {
    void retrieve();
    // Retrieve once on mount; afterwards it is driven by the Retrieve button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Guarded rather than trusted: a print marks rows and re-retrieves, which can
  // shrink the result under whatever page was showing.
  const safePage = clampPage(page, members.length);
  const pagedMembers = useMemo(() => pageSlice(members, page), [members, page]);

  // Rows already printed can never be selected — not individually, not by Select All.
  const pageSelectableIds = useMemo(
    () => pagedMembers.filter((m) => !printedAt(m) && m.id).map((m) => m.id as number),
    [pagedMembers, printedAt]
  );

  /**
   * Select All covers the rows on screen, not the whole result set. Ticking a box
   * above ten rows and silently arming several hundred would be a bad way to
   * discover that Print stamps printedAt for every one of them.
   *
   * Selections still survive paging, so a print can be assembled across pages —
   * which is why the Print button counts `selected`, not this page's share of it.
   */
  const allSelectableChecked =
    pageSelectableIds.length > 0 &&
    pageSelectableIds.every((id) => selected.includes(id));

  const toggleAll = (checked: boolean) =>
    setSelected((prev) =>
      checked
        ? [...prev, ...pageSelectableIds.filter((id) => !prev.includes(id))]
        : prev.filter((id) => !pageSelectableIds.includes(id))
    );

  const toggleOne = (id: number, checked: boolean) =>
    setSelected((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));

  /**
   * Opens the printable sheet WITHOUT recording a print. Viewing a document must
   * never look like reissuing it, so this deliberately does not call the API.
   */
  const openSheet = (ids: number[]) => {
    if (ids.length === 0) return;
    window.open(`/membership/print/${printRoute}?ids=${ids.join(",")}`, "_blank");
  };

  /** Asks for confirmation; the actual print runs from the modal's confirm button. */
  const handlePrint = (ids: number[], reprint: boolean) => {
    if (ids.length === 0) return;
    setPendingPrint({ ids, reprint });
  };

  const runPrint = async (ids: number[], reprint: boolean) => {
    if (ids.length === 0) return;
    const label = reprint ? "Re-print" : "Print";
    setPendingPrint(null);

    setPrinting(true);
    try {
      await markDocumentPrinted(documentType, ids, reprint);
      addToast(
        `${title} ${reprint ? "re-printed" : "printed"} for ${ids.length} member${ids.length === 1 ? "" : "s"}.`
      );
      // Open the printable sheet for exactly the members just marked. Done after
      // the mark succeeds so a rejected print never opens a sheet.
      window.open(
        `/membership/print/${printRoute}?ids=${ids.join(",")}`,
        "_blank"
      );
      await retrieve();
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : `Failed to ${label.toLowerCase()}`,
        "destructive"
      );
    } finally {
      setPrinting(false);
    }
  };

  if (user && !canPrint) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-600">
          <Lock className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-neutral-800">Access Restricted</h2>
        <p className="mt-2 max-w-md text-sm text-neutral-500">
          Printing membership documentation is restricted to Head Office personnel.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 p-4 md:p-6">
      <div className="max-w-6xl space-y-5">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-[#9f3b07]">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        <Card className="rounded-xl py-0">
          <CardHeader className="px-5 pt-5 pb-3">
            <CardTitle className="text-base text-[#953002]">Search Criteria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-5 pb-5">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Location</label>
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {districtOptions.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Members</label>
                <Select
                  value={printedFilter}
                  onValueChange={(v) => setPrintedFilter(v as "without" | "all")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="without">{withoutLabel}</SelectItem>
                    <SelectItem value="all">All Members</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Sort By</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="membership-date">Membership Date</SelectItem>
                    <SelectItem value="memberID">Member ID</SelectItem>
                    <SelectItem value="district">District</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-2">
              <div className="flex min-w-[240px] flex-1 flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Search</label>
                <div className="relative">
                  <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && retrieve()}
                    placeholder="Member name, NIC or Membership ID"
                    className="pl-9"
                  />
                </div>
              </div>
              <Button
                type="button"
                onClick={retrieve}
                disabled={loading}
                className="h-9 bg-[#9e3600] text-white hover:bg-[#8b2f00]"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                Retrieve
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl py-0">
          <CardHeader className="flex flex-row items-center justify-between gap-2 px-5 pt-5 pb-3">
            <CardTitle className="text-base text-[#953002]">
              Members {hasRetrieved ? `(${members.length})` : ""}
            </CardTitle>
            <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-8 px-3"
              onClick={() => openSheet(selected)}
              disabled={selected.length === 0}
              title="Preview the selected documents without recording a print"
            >
              <Eye className="h-4 w-4" />
              View
            </Button>
            <Button
              type="button"
              onClick={() => handlePrint(selected, false)}
              disabled={selected.length === 0 || printing}
              className="h-8 bg-[#9e3600] px-3 text-white hover:bg-[#8b2f00]"
            >
              {printing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
              Print {selected.length > 0 ? `(${selected.length})` : ""}
            </Button>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allSelectableChecked}
                        onCheckedChange={(c) => toggleAll(Boolean(c))}
                        disabled={pageSelectableIds.length === 0}
                        className="data-[state=checked]:border-[#9e3600] data-[state=checked]:bg-[#9e3600]"
                      />
                    </TableHead>
                    <TableHead>Member ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>NIC</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Printed</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedMembers.map((m) => {
                    const printed = printedAt(m);
                    return (
                      <TableRow key={m.id}>
                        <TableCell>
                          <Checkbox
                            checked={selected.includes(m.id as number)}
                            onCheckedChange={(c) => toggleOne(m.id as number, Boolean(c))}
                            disabled={Boolean(printed)}
                            className="data-[state=checked]:border-[#9e3600] data-[state=checked]:bg-[#9e3600]"
                          />
                        </TableCell>
                        <TableCell className="font-medium">{m.memberId ?? "—"}</TableCell>
                        <TableCell>{m.nameWithInitials || m.fullName || "—"}</TableCell>
                        <TableCell>{m.nic ?? "—"}</TableCell>
                        <TableCell>{m.submissionLocation ?? "—"}</TableCell>
                        <TableCell>
                          {printed ? (
                            <Badge className="border border-green-300 bg-green-100 text-green-700 hover:bg-green-100">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              {formatDateTime(printed)}
                            </Badge>
                          ) : (
                            <span className="text-sm text-neutral-400">Not printed</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              onClick={() => openSheet([m.id as number])}
                              title="Open the document without recording a print"
                            >
                              <Eye className="h-3 w-3" />
                              View
                            </Button>
                            {printed && (
                              <Button
                                type="button"
                                variant="outline"
                                className="h-7 px-2 text-xs"
                                disabled={printing}
                                onClick={() => handlePrint([m.id as number], true)}
                                title="Record a re-print and open the document"
                              >
                                Re-Print
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {hasRetrieved && members.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-sm text-neutral-500">
                        No active members match these filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <TablePagination
              page={safePage}
              total={members.length}
              onPageChange={setPage}
              className="-mx-5 mt-1 px-5"
            />
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={pendingPrint !== null}
        title={pendingPrint?.reprint ? `Re-print ${documentLabel}` : title}
        subtitle={
          pendingPrint
            ? `${pendingPrint.ids.length} member${pendingPrint.ids.length === 1 ? "" : "s"} selected`
            : undefined
        }
        message={
          pendingPrint
            ? `${pendingPrint.reprint ? "Re-print" : "Print"} ${documentLabel} for ${pendingPrint.ids.length} member${pendingPrint.ids.length === 1 ? "" : "s"}?`
            : ""
        }
        confirmLabel={pendingPrint?.reprint ? "Yes, Re-print" : "Yes, Print"}
        busy={printing}
        onCancel={() => setPendingPrint(null)}
        onConfirm={() => {
          if (pendingPrint) void runPrint(pendingPrint.ids, pendingPrint.reprint);
        }}
      />
    </div>
  );
}
