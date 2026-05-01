import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { ShieldAlert, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { financeService } from "@/services/finance";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function AuditTrail() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await financeService.getFinanceAuditLogs();
      setLogs(res.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-primary" />Finance Audit Trail</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Immutable record of high-privilege financial actions.</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}><RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />Refresh</Button>
      </div>

      <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading audit logs...</div>
        ) : logs.length === 0 ? (
          <div className="p-16 text-center text-sm text-muted-foreground">No audit logs found.</div>
        ) : (
          <div className="text-sm">
            <div className="grid grid-cols-12 gap-2 bg-muted/40 p-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              <span className="col-span-2">Timestamp</span>
              <span className="col-span-2">User</span>
              <span className="col-span-3">Action Type</span>
              <span className="col-span-1">Entity</span>
              <span className="col-span-4">Description</span>
            </div>
            <div className="divide-y divide-border/20">
              {logs.map(log => (
                <div key={log.id} className="grid grid-cols-12 gap-2 p-3 hover:bg-muted/10 items-center text-xs">
                  <span className="col-span-2 text-muted-foreground">{format(new Date(log.actionTimestamp), 'dd MMM yy, HH:mm:ss')}</span>
                  <span className="col-span-2 font-mono">{log.performedBy}</span>
                  <span className="col-span-3">
                    <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary tracking-tight">{log.actionType}</Badge>
                  </span>
                  <span className="col-span-1 text-muted-foreground">{log.entityName} #{log.entityId}</span>
                  <span className="col-span-4">{log.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
