import { useState } from "react";
import { format } from "date-fns";
import { LibraryBig, PlaySquare } from "lucide-react";
import { toast } from "sonner";
import { financeService } from "@/services/finance";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const INR = (v: number) => `₹${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;

export function FinancialStatements() {
  const [statementType, setStatementType] = useState<"TRIAL_BALANCE" | "PROFIT_LOSS" | "BALANCE_SHEET">("TRIAL_BALANCE");
  const [asOfDate, setAsOfDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startDate, setStartDate] = useState(format(new Date(new Date().getFullYear(), 3, 1), 'yyyy-MM-dd')); // default to April 1
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      let res;
      if (statementType === "TRIAL_BALANCE") {
        res = await financeService.getTrialBalance(asOfDate);
      } else if (statementType === "PROFIT_LOSS") {
        res = await financeService.getProfitAndLoss(startDate, endDate);
      } else if (statementType === "BALANCE_SHEET") {
        res = await financeService.getBalanceSheet(asOfDate);
      }
      setData(res?.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to generate statement.");
    } finally {
      setLoading(false);
    }
  };

  const renderTrialBalance = (data: any) => (
    <div className="space-y-4">
      <div className="text-center pb-4 border-b">
        <h3 className="text-xl font-bold">Trial Balance</h3>
        <p className="text-xs text-muted-foreground">{data.periodInfo}</p>
      </div>
      <div className="text-sm">
        <div className="flex border-b font-semibold bg-muted/30 p-2">
          <div className="flex-1">Account</div>
          <div className="w-32 text-right">Debit (Dr)</div>
          <div className="w-32 text-right">Credit (Cr)</div>
        </div>
        <div className="divide-y divide-border/20">
          {data.items.map((i: any) => (
            <div key={i.accountId} className="flex p-2 hover:bg-muted/10">
              <div className="flex-1 text-xs">
                <span className="font-mono text-muted-foreground mr-2">{i.accountCode}</span>
                <span>{i.accountName}</span>
                <span className="text-[9px] ml-2 text-muted-foreground uppercase">{i.subType}</span>
              </div>
              <div className="w-32 text-right">{i.balanceDr > 0 ? INR(i.balanceDr) : '—'}</div>
              <div className="w-32 text-right">{i.balanceCr > 0 ? INR(i.balanceCr) : '—'}</div>
            </div>
          ))}
        </div>
        <div className="flex border-t-2 border-primary font-bold bg-primary/5 p-2 mt-2">
          <div className="flex-1 text-right mr-4 text-xs uppercase tracking-wider">Total</div>
          <div className="w-32 text-right text-emerald-600 font-bold">{INR(data.totalDr)}</div>
          <div className="w-32 text-right text-emerald-600 font-bold">{INR(data.totalCr)}</div>
        </div>
        {Math.abs(data.totalDr - data.totalCr) > 0.01 && (
          <p className="text-xs text-rose-500 font-bold text-center mt-2">WARNING: Trial Balance does not tie out! Differencce: {INR(Math.abs(data.totalDr - data.totalCr))}</p>
        )}
      </div>
    </div>
  );

  const renderProfitAndLoss = (data: any) => {
    const revs = data.items.filter((i: any) => i.subType === 'REVENUE');
    const exps = data.items.filter((i: any) => i.subType === 'EXPENSE');

    return (
      <div className="space-y-4">
        <div className="text-center pb-4 border-b">
          <h3 className="text-xl font-bold">Profit & Loss Statement</h3>
          <p className="text-xs text-muted-foreground">{data.periodInfo}</p>
        </div>
        <div className="text-sm space-y-6">
          <div>
            <h4 className="font-bold border-b pb-1 mb-2 bg-muted/40 px-2 rounded-t">Revenues</h4>
            {revs.map((i: any) => (
              <div key={i.accountId} className="flex justify-between p-1 px-3 text-xs">
                <span>{i.accountCode} - {i.accountName}</span>
                <span>{INR(i.netBalance)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold p-1 px-3 mt-2 border-t text-emerald-600 bg-emerald-50">
              <span>Total Revenue</span>
              <span>{INR(data.totalCr)}</span>
            </div>
          </div>
          <div>
            <h4 className="font-bold border-b pb-1 mb-2 bg-muted/40 px-2 rounded-t">Expenses</h4>
            {exps.map((i: any) => (
              <div key={i.accountId} className="flex justify-between p-1 px-3 text-xs text-muted-foreground">
                <span>{i.accountCode} - {i.accountName}</span>
                <span>{INR(i.netBalance)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold p-1 px-3 mt-2 border-t text-rose-600 bg-rose-50">
              <span>Total Expenses</span>
              <span>{INR(data.totalDr)}</span>
            </div>
          </div>
          <div className={`flex justify-between text-lg font-black p-3 border rounded-b-xl ${data.netProfitOrLoss >= 0 ? 'bg-emerald-500/10 text-emerald-700' : 'bg-rose-500/10 text-rose-700'}`}>
            <span>Net {data.netProfitOrLoss >= 0 ? 'Profit' : 'Loss'}</span>
            <span>{INR(Math.abs(data.netProfitOrLoss))}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderBalanceSheet = (data: any) => {
    const assets = data.items.filter((i: any) => i.subType === 'ASSET');
    const liabs = data.items.filter((i: any) => i.subType === 'LIABILITY');
    const eq = data.items.filter((i: any) => i.subType === 'EQUITY');

    return (
      <div className="space-y-4">
        <div className="text-center pb-4 border-b">
          <h3 className="text-xl font-bold">Balance Sheet</h3>
          <p className="text-xs text-muted-foreground">{data.periodInfo}</p>
        </div>
        <div className="grid grid-cols-2 gap-8 text-sm">
          {/* ASSETS */}
          <div className="space-y-2">
            <h4 className="font-bold border-b pb-1 bg-muted/40 px-2 rounded-t text-primary">Assets</h4>
            <div className="space-y-1">
              {assets.map((i: any) => (
                <div key={i.accountId} className="flex justify-between p-1 px-2 text-xs">
                  <span className="truncate pr-2">{i.accountName}</span>
                  <span className="font-mono">{INR(i.netBalance)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-bold p-2 mt-4 border-t-2 border-primary/20 bg-primary/5">
              <span>Total Assets</span>
              <span className="text-emerald-600">{INR(data.totalDr)}</span>
            </div>
          </div>

          {/* LIABILITIES & EQUITY */}
          <div className="space-y-6">
            <div className="space-y-2">
              <h4 className="font-bold border-b pb-1 bg-muted/40 px-2 rounded-t text-primary">Liabilities</h4>
              <div className="space-y-1">
                {liabs.map((i: any) => (
                  <div key={i.accountId} className="flex justify-between p-1 px-2 text-xs text-muted-foreground">
                    <span className="truncate pr-2">{i.accountName}</span>
                    <span className="font-mono">{INR(i.netBalance)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-bold border-b pb-1 bg-muted/40 px-2 rounded-t text-primary">Equity</h4>
              <div className="space-y-1">
                {eq.map((i: any) => (
                  <div key={i.accountId || i.accountCode} className="flex justify-between p-1 px-2 text-xs text-muted-foreground">
                    <span className="truncate pr-2">{i.accountName}</span>
                    <span className="font-mono">{INR(i.netBalance)}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-between font-bold p-2 border-t-2 border-primary/20 bg-primary/5">
              <span>Total Liab + Equity</span>
              <span className="text-primary font-black">{INR(data.totalCr)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2"><LibraryBig className="h-5 w-5 text-primary" />Financial Statements</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Generate core accounting reports derived from the General Ledger.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-end bg-card p-4 rounded-xl border border-border/40 shadow-sm">
        <div className="space-y-1.5 flex-1">
          <Label>Statement Type</Label>
          <Select value={statementType} onValueChange={(v: any) => setStatementType(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TRIAL_BALANCE">Trial Balance</SelectItem>
              <SelectItem value="PROFIT_LOSS">Profit & Loss (Income Statement)</SelectItem>
              <SelectItem value="BALANCE_SHEET">Balance Sheet</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {statementType === "PROFIT_LOSS" ? (
          <>
            <div className="space-y-1.5 flex-1"><Label>From Date</Label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
            <div className="space-y-1.5 flex-1"><Label>To Date</Label><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
          </>
        ) : (
          <div className="space-y-1.5 flex-1"><Label>As Of Date</Label><Input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)} /></div>
        )}

        <Button onClick={handleGenerate} disabled={loading} className="w-32">
          {loading ? 'Crunching...' : <><PlaySquare className="h-4 w-4 mr-2"/> Generate</>}
        </Button>
      </div>

      {data && (
        <Card className="shadow-lg border-primary/20">
          <CardContent className="p-8">
            {statementType === "TRIAL_BALANCE" && renderTrialBalance(data)}
            {statementType === "PROFIT_LOSS" && renderProfitAndLoss(data)}
            {statementType === "BALANCE_SHEET" && renderBalanceSheet(data)}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
