import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ALERT_SEVERITY_CLASS } from "@/features/teacher/constants";
import type { AlertItem } from "@/features/teacher/queries/useComputedAlerts";

type Props = {
  alerts: AlertItem[];
  compact?: boolean;
};

export default function AlertCenter({ alerts, compact = false }: Props) {
  const content = (
    <div className={compact ? "grid gap-2 sm:grid-cols-2 xl:grid-cols-3" : "space-y-3"}>
      {alerts.length === 0 ? <p className="text-sm text-muted-foreground">No alerts right now.</p> : null}
      {alerts.map((alert, i) => {
        const Icon = alert.icon;
        return (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className={`rounded-xl border p-3 ${ALERT_SEVERITY_CLASS[alert.severity]}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <Icon className="mt-0.5 h-4 w-4" />
                <div>
                  <p className="text-sm font-semibold">{alert.title}</p>
                  <p className="text-xs opacity-90">{alert.description}</p>
                </div>
              </div>
              {alert.action ? (
                <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                  <Link to={alert.action.href}>{alert.action.label}</Link>
                </Button>
              ) : null}
            </div>
          </motion.div>
        );
      })}
    </div>
  );

  if (compact) return content;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Alert Center</CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
