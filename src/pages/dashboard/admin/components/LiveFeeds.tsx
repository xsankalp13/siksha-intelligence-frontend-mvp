import { motion, AnimatePresence } from "framer-motion";
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Info,
  IndianRupee,
  UserPlus,
  X
} from "lucide-react";
import type { SystemEvent } from "@/services/dashboard";
import { formatDistanceToNow } from 'date-fns';

export function SmartAlertsWidget({ alerts, onDismiss }: { alerts: SystemEvent[], onDismiss: (id: string) => void }) {
  if (alerts.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">No active alerts</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 h-full overflow-y-auto pr-1 custom-scrollbar">
      <AnimatePresence>
        {alerts.map(alert => (
          <motion.div 
            key={alert.id} 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, x: -20 }}
            className={`relative flex items-start gap-4 rounded-xl border p-4 shadow-sm hover:shadow-md transition-shadow ${
              alert.severity === 'critical' ? 'border-red-500/50 bg-red-500/5' :
              alert.severity === 'warning' ? 'border-amber-500/50 bg-amber-500/5' :
              'border-border bg-card'
            }`}
          >
            <div className="flex-1 mt-0.5">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                {alert.severity === 'critical' && <AlertTriangle className="h-4 w-4 text-red-500 animate-pulse" />}
                {alert.severity === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                {alert.severity === 'info' && <Info className="h-4 w-4 text-blue-500" />}
                {alert.title}
              </h4>
              <p className="text-xs text-muted-foreground mt-1">{alert.message}</p>
              
              {alert.actionUrl && (
                <div className="mt-3 flex gap-2">
                  <a href={alert.actionUrl} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                    Take Action
                  </a>
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <button 
                onClick={() => onDismiss(alert.id)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
                aria-label="Dismiss alert"
              >
                <X className="h-4 w-4" />
              </button>
              <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap">
                {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
              </span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function LiveActivityFeed({ activities }: { activities: SystemEvent[] }) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'finance': return <IndianRupee className="h-3.5 w-3.5 text-emerald-600" />;
      case 'hrms': return <UserPlus className="h-3.5 w-3.5 text-blue-600" />;
      case 'attendance': return <Clock className="h-3.5 w-3.5 text-amber-600" />;
      default: return <CheckCircle className="h-3.5 w-3.5 text-violet-600" />;
    }
  };

  const getBg = (type: string) => {
    switch (type) {
      case 'finance': return 'bg-emerald-500/10';
      case 'hrms': return 'bg-blue-500/10';
      case 'attendance': return 'bg-amber-500/10';
      default: return 'bg-violet-500/10';
    }
  };

  // Keep top 15 events for scrolling feed
  const displayActivities = activities.slice(0, 15);

  return (
    <div className="relative flex flex-col pt-2 h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar mt-2 relative">
        <div className="flex flex-col gap-0 pb-10">
          <AnimatePresence initial={false}>
            {displayActivities.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Waiting for live events...</div>
            ) : (
              displayActivities.map((item) => (
                <motion.div 
                  key={item.id}
                  initial={{ opacity: 0, y: -20, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="flex items-start gap-4 py-3 border-b border-border/50 last:border-0"
                >
                  <div className={`mt-0.5 shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${getBg(item.type)}`}>
                    {getIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{item.message}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-1">
                    {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                  </span>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
