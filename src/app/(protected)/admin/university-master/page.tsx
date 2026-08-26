"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, GraduationCap, Loader2, Pencil, Plus, X } from "lucide-react";

import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
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
import AccessRestricted from "@/src/components/AccessRestricted";

import {
  createProgram,
  createUniversity,
  createUniversityProgram,
  getPrograms,
  getUniversities,
  getUniversityPrograms,
  updateProgram,
  updateUniversity,
  updateUniversityProgram,
  type UniversityMasterDTO,
} from "@/lib/api/universityMaster";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { UNIVERSITY_MASTER_ROLES, hasRole } from "@/lib/permissions";

type Tab = "universities" | "programs" | "pairings";

const TABS: { id: Tab; label: string }[] = [
  { id: "universities", label: "Universities" },
  { id: "programs", label: "Programmes" },
  { id: "pairings", label: "University Programmes" },
];

export default function UniversityMasterPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const canManage = hasRole(user?.role, UNIVERSITY_MASTER_ROLES);

  const [tab, setTab] = useState<Tab>("universities");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [universities, setUniversities] = useState<UniversityMasterDTO[]>([]);
  const [programs, setPrograms] = useState<UniversityMasterDTO[]>([]);
  const [pairings, setPairings] = useState<UniversityMasterDTO[]>([]);

  // Add forms
  const [newUniversity, setNewUniversity] = useState("");
  const [newProgram, setNewProgram] = useState("");
  const [newPairing, setNewPairing] = useState<UniversityMasterDTO>({});

  // Inline edit: which row, and the values being typed into it
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<UniversityMasterDTO>({});

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [u, p, up] = await Promise.all([
        getUniversities(),
        getPrograms(),
        getUniversityPrograms(),
      ]);
      setUniversities(u);
      setPrograms(p);
      setPairings(up);
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : "Failed to load master data",
        "destructive"
      );
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (canManage) void loadAll();
    else setLoading(false);
  }, [canManage, loadAll]);

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft({});
  };

  /** Every mutation funnels through here so the toast + reload behave the same way. */
  const run = async (action: () => Promise<unknown>, success: string) => {
    setSaving(true);
    try {
      await action();
      addToast(success);
      cancelEdit();
      await loadAll();
      return true;
    } catch (error) {
      addToast(error instanceof Error ? error.message : "Save failed", "destructive");
      return false;
    } finally {
      setSaving(false);
    }
  };

  if (user && !canManage) {
    return (
      <AccessRestricted
        message="University Scholarship master data can only be maintained by a Super Admin."
        fallbackHref="/"
      />
    );
  }

  const nameRows = tab === "universities" ? universities : programs;
  const isUniversityTab = tab === "universities";
  const singular = isUniversityTab ? "University" : "Programme";

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0 md:p-6 md:pt-0">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold text-[#953002]">
          <GraduationCap className="h-7 w-7" />
          University Master
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Universities, programmes, and the duration and scholarship amount for each
          university/programme combination. Entries can be added and edited; they are
          never deleted, because existing scholarship requests refer to them.
        </p>
      </div>

      <div className="flex gap-2 border-b border-neutral-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              cancelEdit();
            }}
            className={
              tab === t.id
                ? "border-b-2 border-[#953002] px-4 py-2 text-sm font-semibold text-[#953002]"
                : "border-b-2 border-transparent px-4 py-2 text-sm font-medium text-neutral-500 hover:text-[#953002]"
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#953002]" />
        </div>
      ) : tab === "pairings" ? (
        <>
          <Card className="rounded-xl py-0">
            <CardHeader className="px-5 pt-5 pb-3">
              <CardTitle className="text-base text-[#953002]">
                Add University Programme
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="grid gap-3 md:grid-cols-5">
                <Select
                  value={newPairing.universityId ? String(newPairing.universityId) : ""}
                  onValueChange={(v) =>
                    setNewPairing((f) => ({ ...f, universityId: Number(v) }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="University" />
                  </SelectTrigger>
                  <SelectContent>
                    {universities.map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={newPairing.programId ? String(newPairing.programId) : ""}
                  onValueChange={(v) => setNewPairing((f) => ({ ...f, programId: Number(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Programme" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  type="number"
                  min={1}
                  placeholder="Duration (years)"
                  value={newPairing.duration ?? ""}
                  onChange={(e) =>
                    setNewPairing((f) => ({
                      ...f,
                      duration: e.target.value === "" ? undefined : Number(e.target.value),
                    }))
                  }
                />

                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Scholarship amount"
                  value={newPairing.scholarshipAmount ?? ""}
                  onChange={(e) =>
                    setNewPairing((f) => ({
                      ...f,
                      scholarshipAmount:
                        e.target.value === "" ? undefined : Number(e.target.value),
                    }))
                  }
                />

                <Button
                  type="button"
                  disabled={saving}
                  onClick={async () => {
                    const ok = await run(
                      () => createUniversityProgram(newPairing),
                      "University Programme added."
                    );
                    if (ok) setNewPairing({});
                  }}
                  className="bg-[#953002] text-white hover:bg-[#7a2700]"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl py-0">
            <CardContent className="px-5 py-5">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>University</TableHead>
                    <TableHead>Programme</TableHead>
                    <TableHead>Duration (years)</TableHead>
                    <TableHead>Scholarship Amount</TableHead>
                    <TableHead className="w-32">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pairings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-neutral-500">
                        No university programmes set up yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pairings.map((row) => {
                      const key = `pair-${row.id}`;
                      const editing = editingId === key;
                      return (
                        <TableRow key={key}>
                          <TableCell>{row.universityName}</TableCell>
                          <TableCell>{row.programName}</TableCell>
                          <TableCell>
                            {editing ? (
                              <Input
                                type="number"
                                min={1}
                                value={editDraft.duration ?? ""}
                                onChange={(e) =>
                                  setEditDraft((d) => ({
                                    ...d,
                                    duration:
                                      e.target.value === "" ? undefined : Number(e.target.value),
                                  }))
                                }
                                className="w-28"
                              />
                            ) : (
                              row.duration
                            )}
                          </TableCell>
                          <TableCell>
                            {editing ? (
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                value={editDraft.scholarshipAmount ?? ""}
                                onChange={(e) =>
                                  setEditDraft((d) => ({
                                    ...d,
                                    scholarshipAmount:
                                      e.target.value === "" ? undefined : Number(e.target.value),
                                  }))
                                }
                                className="w-36"
                              />
                            ) : (
                              (row.scholarshipAmount ?? 0).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                              })
                            )}
                          </TableCell>
                          <TableCell>
                            {editing ? (
                              <div className="flex gap-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={saving}
                                  onClick={() =>
                                    run(
                                      () => updateUniversityProgram(row.id!, editDraft),
                                      "University Programme updated."
                                    )
                                  }
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={cancelEdit}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingId(key);
                                  setEditDraft({
                                    duration: row.duration,
                                    scholarshipAmount: row.scholarshipAmount,
                                  });
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <Card className="rounded-xl py-0">
            <CardHeader className="px-5 pt-5 pb-3">
              <CardTitle className="text-base text-[#953002]">Add {singular}</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="flex gap-3">
                <Input
                  placeholder={`${singular} name`}
                  value={isUniversityTab ? newUniversity : newProgram}
                  onChange={(e) =>
                    isUniversityTab
                      ? setNewUniversity(e.target.value)
                      : setNewProgram(e.target.value)
                  }
                  className="max-w-md"
                />
                <Button
                  type="button"
                  disabled={saving}
                  onClick={async () => {
                    const name = isUniversityTab ? newUniversity : newProgram;
                    const ok = await run(
                      () =>
                        isUniversityTab
                          ? createUniversity({ name })
                          : createProgram({ name }),
                      `${singular} added.`
                    );
                    if (ok) {
                      if (isUniversityTab) setNewUniversity("");
                      else setNewProgram("");
                    }
                  }}
                  className="bg-[#953002] text-white hover:bg-[#7a2700]"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl py-0">
            <CardContent className="px-5 py-5">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{singular}</TableHead>
                    <TableHead className="w-32">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nameRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-sm text-neutral-500">
                        No {singular.toLowerCase()} records yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    nameRows.map((row) => {
                      const key = `${tab}-${row.id}`;
                      const editing = editingId === key;
                      return (
                        <TableRow key={key}>
                          <TableCell>
                            {editing ? (
                              <Input
                                value={editDraft.name ?? ""}
                                onChange={(e) =>
                                  setEditDraft((d) => ({ ...d, name: e.target.value }))
                                }
                                className="max-w-md"
                              />
                            ) : (
                              row.name
                            )}
                          </TableCell>
                          <TableCell>
                            {editing ? (
                              <div className="flex gap-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={saving}
                                  onClick={() =>
                                    run(
                                      () =>
                                        isUniversityTab
                                          ? updateUniversity(row.id!, editDraft)
                                          : updateProgram(row.id!, editDraft),
                                      `${singular} updated.`
                                    )
                                  }
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={cancelEdit}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingId(key);
                                  setEditDraft({ name: row.name });
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
