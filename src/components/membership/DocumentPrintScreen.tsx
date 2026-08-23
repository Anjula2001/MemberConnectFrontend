"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  CheckCircle2,
  Eye,
  Loader2,
  Lock,
  Printer,
  Search,
  SlidersHorizontal,
} from "lucide-react";

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
import { getEducationalDistricts, getEducationalZonesByDistrict } from "@/lib/api/education";
import { getWorkingLocationTypes } from "@/lib/api/masters";
import { MultiSelect } from "@/src/components/ui/multi-select";
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
  // SRS: Location is a multi-select. An empty selection means every location, which
  // is what MultiSelect renders as its allLabel rather than "0 selected".
  const [locations, setLocations] = useState<string[]>([]);
  // Board Meeting Date period (MR15/16/17). "any" is the spec default.
  const [meetingFilter, setMeetingFilter] = useState<"any" | "period">("any");
  const [meetingFrom, setMeetingFrom] = useState("");
  const [meetingTo, setMeetingTo] = useState("");
  const [printedFilter, setPrintedFilter] = useState<"without" | "all">("without");
  const [sortBy, setSortBy] = useState("membership-date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [districtOptions, setDistrictOptions] = useState<string[]>([]);

  // Advance Filters (MR15/16/17). The member search already accepted every one of
  // these; the screen simply never exposed them.
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [workingLocationType, setWorkingLocationType] = useState("all-types");
  const [educationalDistrict, setEducationalDistrict] = useState("all-districts");
  const [educationalZone, setEducationalZone] = useState("all-zones");
  const [startFrom, setStartFrom] = useState("");
  const [startTo, setStartTo] = useState("");
  const [workingLocationTypeOptions, setWorkingLocationTypeOptions] = useState<string[]>([]);
  const [zoneOptions, setZoneOptions] = useState<string[]>([]);

  useEffect(() => {
    getEducationalDistricts()
      .then(setDistrictOptions)
      .catch(() => {
        /* filter simply shows no options */
      });
    getWorkingLocationTypes()
      .then((types) => setWorkingLocationTypeOptions(types.map((type) => type.name)))
      .catch(() => {
        /* filter simply shows no options */
      });
  }, []);

  // Zones belong to a district, so the list is reloaded whenever that changes - and
  // any zone chosen under the previous district is dropped rather than left behind
  // silently narrowing the result to nothing.
  useEffect(() => {
    if (educationalDistrict === "all-districts") {
      setZoneOptions([]);
      setEducationalZone("all-zones");
      return;
    }

    let cancelled = false;
    getEducationalZonesByDistrict(educationalDistrict)
      .then((zones) => {
        if (!cancelled) setZoneOptions(zones);
      })
      .catch(() => {
        if (!cancelled) setZoneOptions([]);
      });

    setEducationalZone("all-zones");
    return () => {
      cancelled = true;
    };
  }, [educationalDistrict]);

  const retrieve = useCallback(async () => {
    setLoading(true);
    try {
      // Every criterion is applied by the server. The printed filter in particular
      // used to run here, which meant the whole active membership was fetched and the
      // already-printed rows thrown away - and since "without" is the default, that
      // happened on every load, discarding a larger share the more documents got
      // printed. Sorting moved with it so a paged result is ordered across the whole
      // result rather than just the page in hand.
      const data = await searchMembers({
        query: searchQuery.trim() || undefined,
        // Documentation is only ever printed for active memberships.
        statuses: ["ACTIVE"],
        locations: locations.length > 0 ? locations : undefined,
        boardMeetingFrom: meetingFilter === "period" ? meetingFrom || undefined : undefined,
        boardMeetingTo: meetingFilter === "period" ? meetingTo || undefined : undefined,
        withoutDocument: printedFilter === "without" ? documentType : undefined,
        workingLocationType:
          workingLocationType !== "all-types" ? workingLocationType : undefined,
        educationalDistrict:
          educationalDistrict !== "all-districts" ? educationalDistrict : undefined,
        educationalZone: educationalZone !== "all-zones" ? educationalZone : undefined,
        membershipStartFrom: startFrom || undefined,
        membershipStartTo: startTo || undefined,
        sortBy,
        sortDirection,
      });

      setMembers(data);
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
  }, [
    searchQuery,
    locations,
    meetingFilter,
    meetingFrom,
    meetingTo,
    printedFilter,
    sortBy,
    sortDirection,
    documentType,
    workingLocationType,
    educationalDistrict,
    educationalZone,
    startFrom,
    startTo,
    addToast,
  ]);

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

  /**
   * Search, sort and Retrieve on one line - the same arrangement as the Member
   * Directory, so the two panels are learned once. Rendered from a variable because it
   * appears in two places: directly under the divider, or below the advanced filters
   * when those are open.
   */
  const searchBar = (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-neutral-600">Search</p>
      <div className="grid gap-2 md:grid-cols-[1fr_180px_36px_110px]">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && retrieve()}
            placeholder="Member name, NIC or Membership ID"
            className="h-9 border-neutral-300 bg-white pl-9"
          />
        </div>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full border-neutral-300 bg-white">
            <SelectValue placeholder="Sort By" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="membership-date">Membership Date</SelectItem>
            <SelectItem value="memberID">Member ID</SelectItem>
            <SelectItem value="status">Status</SelectItem>
            <SelectItem value="working-location-type">Working Location Type</SelectItem>
            <SelectItem value="district">District</SelectItem>
            <SelectItem value="zone">Zone</SelectItem>
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          size="icon"
          title={
            sortDirection === "asc"
              ? "Sorted ascending - click for descending"
              : "Sorted descending - click for ascending"
          }
          aria-label="Toggle sort direction"
          onClick={() => setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))}
          className="h-9 w-9 border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"
        >
          {sortDirection === "asc" ? (
            <ArrowUpNarrowWide className="h-4 w-4" />
          ) : (
            <ArrowDownWideNarrow className="h-4 w-4" />
          )}
        </Button>

        <Button
          type="button"
          onClick={retrieve}
          disabled={loading}
          className="h-9 bg-[#9e3600] text-white hover:bg-[#8b2f00] disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Retrieve"}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 p-4 md:p-6">
      <div className="max-w-6xl space-y-5">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-[#9f3b07]">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        <Card className="rounded-xl py-0">
          <CardHeader className="px-5 pt-5 pb-3">
            <CardTitle className="text-[34px] font-semibold leading-none text-[#9d3602] sm:text-3xl">
              Search Criteria
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 px-5 pb-5">
            {/* Top filters row. Laid out like the Member Directory so the two search
                panels read the same way: the primary filters across one row, the
                Advanced Filters toggle closing it, then a divider and the search bar. */}
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-neutral-600">Location</p>
                <MultiSelect
                  allLabel="All Locations"
                  width="w-full"
                  options={districtOptions.map((d) => ({ value: d, label: d }))}
                  selected={locations}
                  onChange={setLocations}
                />
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-neutral-600">Board Meeting Date</p>
                <Select
                  value={meetingFilter}
                  onValueChange={(v) => setMeetingFilter(v as "any" | "period")}
                >
                  <SelectTrigger className="w-full border-neutral-300 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="period">Date Period</SelectItem>
                  </SelectContent>
                </Select>
                {/* Kept inside this column rather than on a row of its own: the dates
                    belong to the filter above them, and a separate row left a wide gap. */}
                {meetingFilter === "period" && (
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="date"
                      aria-label="Board meeting from"
                      value={meetingFrom}
                      max={meetingTo || undefined}
                      onChange={(e) => setMeetingFrom(e.target.value)}
                      className="h-9 border-neutral-300 bg-white"
                    />
                    <Input
                      type="date"
                      aria-label="Board meeting to"
                      value={meetingTo}
                      min={meetingFrom || undefined}
                      onChange={(e) => setMeetingTo(e.target.value)}
                      className="h-9 border-neutral-300 bg-white"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-neutral-600">Members</p>
                <Select
                  value={printedFilter}
                  onValueChange={(v) => setPrintedFilter(v as "without" | "all")}
                >
                  <SelectTrigger className="w-full border-neutral-300 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="without">{withoutLabel}</SelectItem>
                    <SelectItem value="all">All Members</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                {/* Transparent placeholder so the button sits on the controls' baseline
                    rather than riding up level with their labels. */}
                <p className="select-none text-xs font-semibold text-transparent">Filters</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAdvanced((open) => !open)}
                  aria-expanded={showAdvanced}
                  className="h-9 w-full border-dashed border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100 md:min-w-[230px]"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  {showAdvanced ? "Hide Advanced Filters" : "Show Advanced Filters"}
                </Button>
              </div>
            </div>

            <div className="border-t border-neutral-200 pt-5">
              {showAdvanced ? (
                <>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-neutral-600">Working Location Type</p>
                      <Select value={workingLocationType} onValueChange={setWorkingLocationType}>
                        <SelectTrigger className="w-full border-neutral-300 bg-white">
                          <SelectValue placeholder="All Types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all-types">All Types</SelectItem>
                          {workingLocationTypeOptions.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-neutral-600">Educational District</p>
                      <Select value={educationalDistrict} onValueChange={setEducationalDistrict}>
                        <SelectTrigger className="w-full border-neutral-300 bg-white">
                          <SelectValue placeholder="All Districts" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all-districts">All Districts</SelectItem>
                          {districtOptions.map((d) => (
                            <SelectItem key={d} value={d}>
                              {d}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-neutral-600">Educational Zone</p>
                      <Select
                        value={educationalZone}
                        onValueChange={setEducationalZone}
                        disabled={educationalDistrict === "all-districts"}
                      >
                        <SelectTrigger className="w-full border-neutral-300 bg-white">
                          <SelectValue placeholder="All Zones" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all-zones">All Zones</SelectItem>
                          {zoneOptions.map((zone) => (
                            <SelectItem key={zone} value={zone}>
                              {zone}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-neutral-600">Membership Start Date Period</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="date"
                          aria-label="Membership start date from"
                          value={startFrom}
                          max={startTo || undefined}
                          onChange={(e) => setStartFrom(e.target.value)}
                          className="h-9 border-neutral-300 bg-white"
                        />
                        <Input
                          type="date"
                          aria-label="Membership start date to"
                          value={startTo}
                          min={startFrom || undefined}
                          onChange={(e) => setStartTo(e.target.value)}
                          className="h-9 border-neutral-300 bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-neutral-200 pt-5">{searchBar}</div>
                </>
              ) : (
                searchBar
              )}
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
