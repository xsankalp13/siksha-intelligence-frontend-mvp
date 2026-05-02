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
            <div className="grid grid-cols-12 gap-4 bg-muted/30 p-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border/50">
              <span className="col-span-2">Timestamp</span>
              <span className="col-span-2">User</span>
              <span className="col-span-2">Action</span>
              <span className="col-span-2">Resource</span>
              <span className="col-span-4">Description</span>
            </div>
            <div className="divide-y divide-border/10">
              {logs.map(log => (
                <div key={log.id} className="grid grid-cols-12 gap-4 p-4 hover:bg-muted/5 transition-colors items-center text-[13px]">
                  <div className="col-span-2 flex flex-col">
                    <span className="font-medium text-foreground">{format(new Date(log.actionTimestamp), 'dd MMM yyyy')}</span>
                    <span className="text-[11px] text-muted-foreground">{format(new Date(log.actionTimestamp), 'HH:mm:ss')}</span>
                  </div>
                  <div className="col-span-2 font-semibold text-foreground flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-primary/40" />
                    {log.performedBy}
                  </div>
                  <div className="col-span-2">
                    <Badge variant="secondary" className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50 uppercase tracking-tighter">
                      {log.actionType.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <div className="col-span-2 flex flex-col">
                    <span className="font-medium text-foreground truncate">{log.entityName}</span>
                    <span className="text-[11px] text-muted-foreground font-mono">ID: #{log.entityId}</span>
                  </div>
                  <div className="col-span-4 text-muted-foreground leading-relaxed italic">
                    "{log.description}"
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
