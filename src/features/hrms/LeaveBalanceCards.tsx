import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { hrmsService, normalizeHrmsError } from "@/services/hrms";

export default function LeaveBalanceCards() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["hrms", "leave-balances", "me"],
    queryFn: () => hrmsService.getMyLeaveBalance().then((res) => res.data),
  });

  if (isError) {
    return (
      <div className="space-y-3 rounded-lg border border-destructive/30 p-4">
        <p className="text-sm text-destructive">{normalizeHrmsError(error).message}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  const balances = data ?? [];
  const academicYear = balances[0]?.academicYear;

  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold">
        My Leave Balances
        {academicYear && (
          <span className="ml-2 text-sm font-normal text-muted-foreground">({academicYear})</span>
        )}
      </h3>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {balances.map((balance) => (
          <Card key={balance.balanceId}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                {balance.leaveTypeName} ({balance.leaveTypeCode})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>
                Quota: <span className="font-semibold">{isLoading ? "..." : balance.totalQuota}</span>
              </p>
              <p>
                Used: <span className="font-semibold">{isLoading ? "..." : balance.used}</span>
              </p>
              <p>
                Remaining: <span className="font-semibold">{isLoading ? "..." : balance.remaining}</span>
              </p>
              {balance.carriedForward > 0 && (
                <p className="text-muted-foreground">
                  Carried Forward: {balance.carriedForward}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
