"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Download, FileText, Loader2, Sparkles, Trash2, UploadCloud } from "lucide-react";

import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import AccessRestricted from "@/src/components/AccessRestricted";
import ConfirmDialog from "@/src/components/membership/ConfirmDialog";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { AD_HOC_DOCUMENT_ROLES, hasRole } from "@/lib/permissions";
import {
  AD_HOC_DISPLAY_NAME,
  downloadAdHocDocument,
  getAdHocDocuments,
  uploadAdHocDocument,
  type AdHocDocumentDTO,
} from "@/lib/api/adHocDocuments";

/**
 * Add Documents (Requirement 05, MMD09).
 *
 * Every other upload screen in the system attaches files to a request, filling slots the
 * Supporting Documents master defines. This one attaches them to the Member: the papers a
 * District Office receives with no process to file them against. There is therefore no
 * document type picker - MMD09 gives exactly one type, Ad-hoc Documents.
 *
 * Saved documents are immutable. Files can be removed only while they are staged, before
 * Save; once written they have no delete route, on the server either.
 */

/** A file chosen in this session and not yet saved. */
type StagedFile = {
  /** Stable across re-renders so removing one row does not re-key the others. */
  key: string;
  file: File;
};

function formatUploadedAt(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AddDocumentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { addToast } = useToast();

  const memberId = searchParams.get("memberId") ?? "";
  const canUse = hasRole(user?.role, AD_HOC_DOCUMENT_ROLES);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saved, setSaved] = useState<AdHocDocumentDTO[]>([]);
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const loadSaved = useCallback(async () => {
    if (!memberId) {
      setError("No member was selected. Open Add Documents from a Member Profile.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setSaved(await getAdHocDocuments(memberId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load existing documents.");
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    if (isAuthLoading || !canUse) return;
    void loadSaved();
  }, [isAuthLoading, canUse, loadSaved]);

  const handleFilesChosen = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    /*
     * Copy the FileList into a real array FIRST.
     *
     * `fileList` is the live input.files, and the reset below empties it. Reading it
     * inside the setStaged updater instead would read it during React's render phase -
     * after the reset had already run - so every pick staged nothing at all.
     */
    const chosen = Array.from(fileList);

    // Clearing the input means picking the same file twice in a row still fires change.
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setStaged((prev) => [
      ...prev,
      ...chosen.map((file, index) => ({
        // crypto.randomUUID is not available on every browser this runs in, so the key
        // is composed rather than generated.
        key: `${file.name}-${file.size}-${file.lastModified}-${prev.length + index}-${Math.random()}`,
        file,
      })),
    ]);
  };

  const removeStaged = (key: string) => {
    setStaged((prev) => prev.filter((item) => item.key !== key));
  };

  /**
   * Posts the staged files one at a time.
   *
   * Sequential rather than parallel, and partial failures are kept: whatever saved stays
   * saved and only the rest are reported, which is friendlier than discarding a batch of
   * scans because the last one was too large.
   */
  const handleSave = async () => {
    if (staged.length === 0 || !memberId) return;

    setSaving(true);
    const failed: string[] = [];

    for (const item of staged) {
      try {
        await uploadAdHocDocument(memberId, item.file);
      } catch {
        failed.push(item.file.name);
      }
    }

    setSaving(false);

    if (failed.length > 0) {
      setStaged((prev) => prev.filter((item) => failed.includes(item.file.name)));
      await loadSaved();
      addToast(
        `${failed.length} of ${staged.length} document(s) could not be uploaded: ${failed.join(", ")}`,
        "destructive"
      );
      return;
    }

    addToast(`${staged.length} document(s) added to ${memberId}.`);
    // MMD09: "the Add Documents screen will close."
    router.push(`/membership/directory/${encodeURIComponent(memberId)}`);
  };

  /** MMD09 asks before discarding staged files, and only when there are any. */
  const handleCancel = () => {
    if (staged.length > 0) {
      setShowDiscardConfirm(true);
      return;
    }
    router.back();
  };

  const handleDownload = async (document: AdHocDocumentDTO) => {
    try {
      const blob = await downloadAdHocDocument(memberId, document.id);
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = document.fileName;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : "Could not download the document.",
        "destructive"
      );
    }
  };

  if (isAuthLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-10 text-neutral-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading…
      </div>
    );
  }

  if (!canUse) {
    return (
      <AccessRestricted
        message="Adding ad-hoc documents to a Member Profile is restricted to District Office, Head Office and Super Admin personnel."
        fallbackHref="/membership/directory"
        fallbackLabel="Back to Member Directory"
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0 md:p-6 md:pt-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#953002]">Add Documents</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {AD_HOC_DISPLAY_NAME}
            {memberId ? ` · Member ${memberId}` : ""}
          </p>
        </div>
        <Button variant="outline" onClick={handleCancel} className="border-neutral-300">
          <ArrowLeft size={14} />
          Back
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Upload area. One document type only, so there is nothing to choose. */}
      <Card className="rounded-xl border-neutral-300 shadow-none">
        <CardContent className="p-6">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFilesChosen(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!memberId || saving}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 px-6 py-10 text-center transition-colors hover:border-[#953002]/50 hover:bg-[#fff9f6] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <UploadCloud className="h-8 w-8 text-neutral-400" />
            <span className="text-sm font-medium text-neutral-700">
              {memberId
                ? "Click to select scanned images or documents"
                : "Open Add Documents from a Member Profile to upload"}
            </span>
            <span className="text-xs text-neutral-500">
              {memberId
                ? `Files are filed under "${AD_HOC_DISPLAY_NAME}" and are saved only when you click Save`
                : "No member is selected, so there is nothing to attach documents to."}
            </span>
          </button>
        </CardContent>
      </Card>

      {/* Documents: staged first (removable), then what is already on file (not). */}
      <Card className="overflow-hidden rounded-xl border-neutral-300 py-0 shadow-none">
        <CardContent className="overflow-x-auto px-0">
          <Table className="border-collapse">
            <TableHeader>
              <TableRow className="bg-[#fafafa] hover:bg-[#fafafa]">
                {["File Name", "File Type", "Uploaded At"].map((h) => (
                  <TableHead
                    key={h}
                    className="px-4 py-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase"
                  >
                    {h}
                  </TableHead>
                ))}
                <TableHead className="px-4 py-3 text-right text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-neutral-500">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Loading documents…</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : staged.length === 0 && saved.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-neutral-500">
                    No ad-hoc documents on file for this member yet.
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {staged.map((item) => (
                    <TableRow key={item.key} className="bg-[#fff9f6] hover:bg-[#fff4ee]">
                      <TableCell className="px-4 py-4 font-medium">
                        <span className="inline-flex items-center gap-2">
                          {/* MMD09: an icon marks a document as new. */}
                          <Sparkles
                            className="h-4 w-4 text-[#953002]"
                            aria-label="New document, not yet saved"
                          />
                          {item.file.name}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-4 text-neutral-700">
                        {item.file.type || "—"}
                      </TableCell>
                      <TableCell className="px-4 py-4 text-neutral-700">
                        Not saved · {formatSize(item.file.size)}
                      </TableCell>
                      <TableCell className="px-4 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => removeStaged(item.key)}
                          disabled={saving}
                          aria-label={`Remove ${item.file.name}`}
                          className="inline-flex items-center gap-2 text-sm text-red-600 transition-colors hover:text-red-800 disabled:opacity-50"
                        >
                          <Trash2 size={14} />
                          Remove
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}

                  {saved.map((document) => (
                    <TableRow key={document.id} className="hover:bg-neutral-50">
                      <TableCell className="px-4 py-4 font-medium">
                        {/* MMD09: clicking the file name downloads it. */}
                        <button
                          type="button"
                          onClick={() => void handleDownload(document)}
                          className="inline-flex items-center gap-2 text-[#953002] hover:underline"
                        >
                          <FileText className="h-4 w-4 text-neutral-400" />
                          {document.fileName}
                        </button>
                      </TableCell>
                      <TableCell className="px-4 py-4 text-neutral-700">
                        {document.fileType || "—"}
                      </TableCell>
                      <TableCell className="px-4 py-4 text-neutral-700 tabular-nums">
                        {formatUploadedAt(document.uploadedAt)}
                      </TableCell>
                      <TableCell className="px-4 py-4 text-right">
                        {/* Saved documents offer download only - MMD09 gives Delete to
                            new documents alone, and the server has no delete route. */}
                        <button
                          type="button"
                          onClick={() => void handleDownload(document)}
                          aria-label={`Download ${document.fileName}`}
                          className="inline-flex text-[#953002] transition-colors hover:text-[#c44515]"
                        >
                          <Download size={16} />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button variant="outline" onClick={handleCancel} className="border-neutral-300">
          Cancel
        </Button>
        <Button
          onClick={() => void handleSave()}
          disabled={staged.length === 0 || saving || !memberId}
          className="bg-[#953002] text-white hover:bg-[#7a2700] disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : null}
          {saving ? "Saving…" : `Save${staged.length > 0 ? ` (${staged.length})` : ""}`}
        </Button>
      </div>

      {/* MMD09 quotes this wording, including the count of staged documents. */}
      <ConfirmDialog
        open={showDiscardConfirm}
        title="Discard new documents?"
        message={`There are ${staged.length} document(s) selected to be added. Are you sure you want to discard them?`}
        confirmLabel="Yes, discard"
        cancelLabel="No"
        onConfirm={() => {
          setShowDiscardConfirm(false);
          setStaged([]);
          router.back();
        }}
        onCancel={() => setShowDiscardConfirm(false)}
      />
    </div>
  );
}
