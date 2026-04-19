import { useState, useEffect } from "react";
import { getVisitorLogs, type VisitorLog } from "@/services/visitor";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

const safeFormatDate = (dateVal: string | number[]) => {
  try {
    if (Array.isArray(dateVal)) {
      const [year, month, day, hour = 0, minute = 0, second = 0] = dateVal;
      const d = new Date(year, month - 1, day, hour, minute, second);
      return format(d, "MMM d, yyyy h:mm a");
    }
    return format(new Date(dateVal), "MMM d, yyyy h:mm a");
  } catch {
    return "Invalid Date";
  }
};

export default function AdminVisitorLogsPage() {
  const [logs, setLogs] = useState<VisitorLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");

  useEffect(() => {
    fetchLogs();
  }, [period]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await getVisitorLogs(period);
      setLogs(data);
    } catch (error) {
      console.error("Failed to fetch visitor logs", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Visitor Logs</h1>
        <p className="text-muted-foreground mt-2">
          Monitor campus visitors tracked by the security guards.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Visitor History</CardTitle>
            <Tabs value={period} onValueChange={(val) => setPeriod(val as any)} className="w-[400px]">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Whom To Meet</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Aadhaar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Loading visitor logs...
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No visitors found for this period.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {log.visitTime ? safeFormatDate(log.visitTime as any) : "-"}
                      </TableCell>
                      <TableCell className="font-medium">{log.name}</TableCell>
                      <TableCell>{log.phoneNo}</TableCell>
                      <TableCell>{log.whomToMeet}</TableCell>
                      <TableCell>{log.purpose}</TableCell>
                      <TableCell className="text-muted-foreground">{log.aadhaarNo}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
