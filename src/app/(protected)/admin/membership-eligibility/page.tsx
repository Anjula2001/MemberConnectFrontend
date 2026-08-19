"use client";

import { useEffect, useState } from "react";
import { Loader2, ShieldAlert, Info } from "lucide-react";

import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";

import {
  getMembershipEligibility,
  updateMembershipEligibility,
} from "@/lib/api/membershipConfig";
import { useToast } from "@/lib/toast-context";
import { useAuth } from "@/lib/auth-context";
import { ELIGIBILITY_CONFIG_ROLES, hasRole } from "@/lib/permissions";

export default function MembershipEligibilityPage() {
  const { addToast } = useToast();
  const { user } = useAuth();
  const canEdit = hasRole(user?.role, ELIGIBILITY_CONFIG_ROLES);

  const [minimumAge, setMinimumAge] = useState("");
  const [maximumAge, setMaximumAge] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!canEdit) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    getMembershipEligibility()
      .then((config) => {
        if (cancelled) return;
        setMinimumAge(String(config.minimumAge));
        setMaximumAge(String(config.maximumAge));
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          addToast(
            err instanceof Error ? err.message : "Failed to load eligibility settings",
            "destructive"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEdit]);

  const handleSave = async () => {
    const min = Number(minimumAge);
    const max = Number(maximumAge);

    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      addToast("Both ages must be numbers.", "destructive");
      return;
    }
    if (min < 0 || max < 0) {
      addToast("Ages cannot be negative.", "destructive");
      return;
    }
    if (min > max) {
      addToast("Minimum age cannot be greater than maximum age.", "destructive");
      return;
    }

    setSaving(true);
    try {
      const saved = await updateMembershipEligibility({ minimumAge: min, maximumAge: max });
      setMinimumAge(String(saved.minimumAge));
      setMaximumAge(String(saved.maximumAge));
      addToast("Eligibility limits saved.");
    } catch (err: unknown) {
      addToast(
        err instanceof Error ? err.message : "Failed to save eligibility settings",
        "destructive"
      );
    } finally {
      setSaving(false);
    }
  };

  if (!canEdit) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-600 shadow-sm">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-neutral-800">Access Restricted</h2>
        <p className="mt-2 max-w-md text-sm text-neutral-500">
          Membership eligibility limits determine who may join and are maintained by a
          Super Administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0 md:p-6 md:pt-0">
      <div>
        <h1 className="text-3xl font-bold text-[#9d3602]">Membership Eligibility</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Age limits applied to New Member Registrations.
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          An applicant&apos;s age is calculated from their Date of Birth against the
          current date, and is checked when the application is saved and when it is
          submitted. Applications outside this range are rejected.
        </p>
      </div>

      <Card className="max-w-xl rounded-xl shadow-sm">
        <CardHeader className="px-5 pt-5 pb-3">
          <CardTitle className="text-base text-[#953002]">Eligible Age Range</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {loading ? (
            <div className="flex h-24 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-600">
                    Minimum Age <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="120"
                    value={minimumAge}
                    onChange={(e) => setMinimumAge(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-600">
                    Maximum Age <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="120"
                    value={maximumAge}
                    onChange={(e) => setMaximumAge(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end">
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-[#9e3600] text-white hover:bg-[#8b2f00]"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
