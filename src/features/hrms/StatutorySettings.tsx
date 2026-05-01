import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { hrmsService, normalizeHrmsError } from "@/services/hrms";
import type {
  StatutoryConfigCreateDTO,
  StatutoryConfigDTO,
} from "@/services/types/hrms";

type PtSlab = { minSalary: number; maxSalary?: number; monthlyTax: number };

function buildDefaultForm(config?: StatutoryConfigDTO): StatutoryConfigCreateDTO & {
  ptSlabs: PtSlab[];
} {
  return {
    financialYear: config?.financialYear ?? "",
    pfApplicable: config?.pfApplicable ?? false,
    pfEmployeeRate: config?.pfEmployeeRate ?? 12,
    pfEmployerRate: config?.pfEmployerRate ?? 12,
    pfCeilingAmount: config?.pfCeilingAmount ?? 15000,
    esiApplicable: config?.esiApplicable ?? false,
    esiEmployeeRate: config?.esiEmployeeRate ?? 0.75,
    esiEmployerRate: config?.esiEmployerRate ?? 3.25,
    esiWageLimit: config?.esiWageLimit ?? 21000,
    ptApplicable: config?.ptApplicable ?? false,
    ptState: config?.ptState ?? "",
    ptSlabs: (config?.ptSlabs ?? []) as PtSlab[],
  };
}

export default function StatutorySettings() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const currentYear = new Date().getFullYear();
  const financialYear = `${currentYear - 1}-${String(currentYear).slice(2)}`;

  const {
    data: config,
    isLoading,
    error: fetchError,
  } = useQuery({
    queryKey: ["hrms", "statutory-config", financialYear],
    queryFn: () => hrmsService.getStatutoryConfig(financialYear).then((r) => r.data),
    retry: false,
  });

  const [form, setForm] = useState(() => buildDefaultForm(config));
  const isNew = !config;

  // Sync when config loads
  useEffect(() => {
    if (config) setForm(buildDefaultForm(config));
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: StatutoryConfigCreateDTO = {
        financialYear: form.financialYear,
        pfApplicable: form.pfApplicable,
        pfEmployeeRate: form.pfEmployeeRate,
        pfEmployerRate: form.pfEmployerRate,
        pfCeilingAmount: form.pfCeilingAmount,
        esiApplicable: form.esiApplicable,
        esiEmployeeRate: form.esiEmployeeRate,
        esiEmployerRate: form.esiEmployerRate,
        esiWageLimit: form.esiWageLimit,
        ptApplicable: form.ptApplicable,
        ptState: form.ptState,
        ptSlabs: form.ptSlabs,
      };
      return hrmsService.createStatutoryConfig(payload);
    },
    onSuccess: () => {
      toast.success("Statutory settings saved");
      qc.invalidateQueries({ queryKey: ["hrms", "statutory-config"] });
      setEditing(false);
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  const updateField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const addSlab = () =>
    setForm((prev) => ({
      ...prev,
      ptSlabs: [...prev.ptSlabs, { minSalary: 0, monthlyTax: 0 }],
    }));

  const removeSlab = (idx: number) =>
    setForm((prev) => ({
      ...prev,
      ptSlabs: prev.ptSlabs.filter((_, i) => i !== idx),
    }));

  const updateSlab = (idx: number, field: keyof PtSlab, value: number | undefined) =>
    setForm((prev) => ({
      ...prev,
      ptSlabs: prev.ptSlabs.map((s, i) =>
        i === idx ? { ...s, [field]: value } : s
      ),
    }));

  const canEdit = isNew || editing;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (fetchError && !isNew) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Failed to load settings. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-700 p-5 text-white shadow-lg">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-2xl shadow-inner">
              🏛️
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Statutory Settings</h2>
              <p className="text-sm text-white/70">Configure PF, ESI, and Professional Tax parameters</p>
            </div>
          </div>
          <div className="flex gap-2">
            {!isNew && !editing && (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="bg-white/20 border-white/30 text-white hover:bg-white/30">
                ✏️ Edit Settings
              </Button>
            )}
            {editing && (
              <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setForm(buildDefaultForm(config)); }} className="text-white hover:bg-white/20">
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Financial Year */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">General</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label>Financial Year</Label>
              <Input
                placeholder="e.g. 2024-25"
                value={form.financialYear}
                onChange={(e) => updateField("financialYear", e.target.value)}
                disabled={!canEdit}
              />
            </div>
          </CardContent>
        </Card>

        {/* PF */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Provident Fund (PF)</CardTitle>
              <Switch
                checked={form.pfApplicable}
                onCheckedChange={(v) => updateField("pfApplicable", v)}
                disabled={!canEdit}
              />
            </div>
          </CardHeader>
          {form.pfApplicable && (
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Employee Rate (%)</Label>
                <Input
                  type="number"
                  value={form.pfEmployeeRate}
                  onChange={(e) => updateField("pfEmployeeRate", parseFloat(e.target.value))}
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Employer Rate (%)</Label>
                <Input
                  type="number"
                  value={form.pfEmployerRate}
                  onChange={(e) => updateField("pfEmployerRate", parseFloat(e.target.value))}
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Wage Ceiling (₹)</Label>
                <Input
                  type="number"
                  value={form.pfCeilingAmount}
                  onChange={(e) => updateField("pfCeilingAmount", parseFloat(e.target.value))}
                  disabled={!canEdit}
                />
              </div>
            </CardContent>
          )}
        </Card>

        {/* ESI */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Employees' State Insurance (ESI)
              </CardTitle>
              <Switch
                checked={form.esiApplicable}
                onCheckedChange={(v) => updateField("esiApplicable", v)}
                disabled={!canEdit}
              />
            </div>
          </CardHeader>
          {form.esiApplicable && (
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Employee Rate (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.esiEmployeeRate}
                  onChange={(e) => updateField("esiEmployeeRate", parseFloat(e.target.value))}
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Employer Rate (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.esiEmployerRate}
                  onChange={(e) => updateField("esiEmployerRate", parseFloat(e.target.value))}
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Wage Limit (₹)</Label>
                <Input
                  type="number"
                  value={form.esiWageLimit}
                  onChange={(e) => updateField("esiWageLimit", parseFloat(e.target.value))}
                  disabled={!canEdit}
                />
              </div>
            </CardContent>
          )}
        </Card>

        {/* PT */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Professional Tax (PT)</CardTitle>
              <Switch
                checked={form.ptApplicable}
                onCheckedChange={(v) => updateField("ptApplicable", v)}
                disabled={!canEdit}
              />
            </div>
          </CardHeader>
          {form.ptApplicable && (
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>State</Label>
                <Input
                  placeholder="e.g. Karnataka"
                  value={form.ptState ?? ""}
                  onChange={(e) => updateField("ptState", e.target.value)}
                  disabled={!canEdit}
                />
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Tax Slabs</p>
                  {canEdit && (
                    <Button variant="outline" size="sm" onClick={addSlab}>
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Add Slab
                    </Button>
                  )}
                </div>
                {form.ptSlabs.length === 0 && (
                  <p className="text-xs text-muted-foreground">No slabs defined.</p>
                )}
                {form.ptSlabs.map((slab, idx) => (
                  <div key={idx} className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Min Salary (₹)</Label>
                      <Input
                        type="number"
                        value={slab.minSalary}
                        onChange={(e) =>
                          updateSlab(idx, "minSalary", parseFloat(e.target.value))
                        }
                        disabled={!canEdit}
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Max Salary (₹, optional)</Label>
                      <Input
                        type="number"
                        placeholder="No limit"
                        value={slab.maxSalary ?? ""}
                        onChange={(e) =>
                          updateSlab(
                            idx,
                            "maxSalary",
                            e.target.value ? parseFloat(e.target.value) : undefined
                          )
                        }
                        disabled={!canEdit}
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Monthly Tax (₹)</Label>
                      <Input
                        type="number"
                        value={slab.monthlyTax}
                        onChange={(e) =>
                          updateSlab(idx, "monthlyTax", parseFloat(e.target.value))
                        }
                        disabled={!canEdit}
                      />
                    </div>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-destructive"
                        onClick={() => removeSlab(idx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>

        {canEdit && (
          <div className="flex justify-end">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isNew ? "Create Config" : "Save Changes"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
