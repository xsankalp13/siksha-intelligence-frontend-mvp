import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, CheckCircle2, Info, Loader2, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export type ReviewSeverity = "info" | "warning" | "danger";

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  severity?: ReviewSeverity;
  children: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  isPending?: boolean;
  requireCheckbox?: boolean;
  checkboxLabel?: string;
  requireTypeConfirm?: string;
  typeConfirmLabel?: string;
}

const severityConfig: Record<
  ReviewSeverity,
  { icon: typeof Info; iconBg: string; iconColor: string; btnVariant: "default" | "destructive" }
> = {
  info: {
    icon: Info,
    iconBg: "bg-blue-100 dark:bg-blue-950",
    iconColor: "text-blue-600 dark:text-blue-400",
    btnVariant: "default",
  },
  warning: {
    icon: AlertTriangle,
    iconBg: "bg-amber-100 dark:bg-amber-950",
    iconColor: "text-amber-600 dark:text-amber-400",
    btnVariant: "default",
  },
  danger: {
    icon: ShieldAlert,
    iconBg: "bg-red-100 dark:bg-red-950",
    iconColor: "text-red-600 dark:text-red-400",
    btnVariant: "destructive",
  },
};

export default function ReviewDialog({
  open,
  onOpenChange,
  title,
  description,
  severity = "info",
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  isPending = false,
  requireCheckbox = false,
  checkboxLabel = "I have reviewed the details above and confirm this action.",
  requireTypeConfirm,
  typeConfirmLabel,
}: ReviewDialogProps) {
  const [checked, setChecked] = useState(false);
  const [typedValue, setTypedValue] = useState("");

  useEffect(() => {
    if (open) {
      setChecked(false);
      setTypedValue("");
    }
  }, [open]);

  const config = severityConfig[severity];
  const Icon = config.icon;

  const checkboxPassed = !requireCheckbox || checked;
  const typePassed = !requireTypeConfirm || typedValue === requireTypeConfirm;
  const canConfirm = checkboxPassed && typePassed && !isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", config.iconBg)}>
              <Icon className={cn("h-5 w-5", config.iconColor)} />
            </div>
            <div>
              <DialogTitle>{title}</DialogTitle>
              {description && <DialogDescription className="mt-1">{description}</DialogDescription>}
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <div className="space-y-4 py-2">{children}</div>

        {(requireCheckbox || requireTypeConfirm) && <Separator />}

        {requireCheckbox && (
          <div className="flex items-start gap-3 rounded-md border border-border/60 bg-muted/30 p-3">
            <Checkbox
              id="review-confirm-check"
              checked={checked}
              onCheckedChange={(v) => setChecked(v === true)}
            />
            <Label htmlFor="review-confirm-check" className="cursor-pointer text-sm leading-relaxed">
              {checkboxLabel}
            </Label>
          </div>
        )}

        {requireTypeConfirm && (
          <div className="space-y-2">
            <Label htmlFor="review-type-confirm" className="text-sm">
              {typeConfirmLabel ?? `Type \"${requireTypeConfirm}\" to confirm:`}
            </Label>
            <Input
              id="review-type-confirm"
              value={typedValue}
              onChange={(e) => setTypedValue(e.target.value)}
              placeholder={requireTypeConfirm}
              className="font-mono"
            />
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            {cancelLabel}
          </Button>
          <Button
            variant={config.btnVariant}
            onClick={onConfirm}
            disabled={!canConfirm}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {canConfirm ? <CheckCircle2 className="mr-2 h-4 w-4" /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
