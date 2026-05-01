import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import {
  Landmark, Plus, RefreshCw, Zap, CheckCircle, AlertCircle, XCircle, EyeOff, Link2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  bankService,
  type BankAccountResponseDTO,
  type BankTransactionResponseDTO,
  type ReconciliationStatus,
  type BankTransactionType,
} from '@/services/assets';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const INR = (v: number) => `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;

const STATUS_META: Record<ReconciliationStatus, { label: string; color: string; bg: string; icon: any }> = {
  UNRECONCILED:    { label: 'Unreconciled',  color: 'text-slate-500',   bg: 'bg-slate-500/10',   icon: AlertCircle },
  AUTO_MATCHED:    { label: 'Auto Matched',  color: 'text-emerald-600', bg: 'bg-emerald-500/10', icon: CheckCircle },
  MANUALLY_MATCHED:{ label: 'Matched',       color: 'text-teal-600',    bg: 'bg-teal-500/10',    icon: Link2 },
  EXCEPTION:       { label: 'Exception',     color: 'text-rose-600',    bg: 'bg-rose-500/10',    icon: XCircle },
  IGNORED:         { label: 'Ignored',       color: 'text-muted-foreground', bg: 'bg-muted',     icon: EyeOff },
};

// ── Bank Account Card ─────────────────────────────────────────────────────────

function BankAccountCard({ account, onSelect, isSelected }: {
  account: BankAccountResponseDTO;
  onSelect: () => void;
  isSelected: boolean;
}) {
  const diffPositive = account.difference >= 0;
  return (
    <button onClick={onSelect} className={`w-full text-left rounded-2xl border p-4 transition-all ${isSelected ? 'border-primary bg-primary/5' : 'border-border/40 bg-card/60 hover:border-primary/30 hover:shadow-sm'}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-bold text-foreground">{account.accountName}</p>
          <p className="text-[10px] font-mono text-muted-foreground">{account.accountNumber} · {account.bankName}</p>
          {account.accountType && <span className="text-[10px] text-muted-foreground/70">{account.accountType}</span>}
        </div>
        {account.unreconciledCount > 0 && (
          <Badge variant="outline" className="text-[9px] font-bold border-transparent text-amber-600 bg-amber-500/10">
            {account.unreconciledCount} unreconciled
          </Badge>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-muted-foreground text-[10px]">Bank Balance</p>
          <p className="font-bold">{INR(account.statementBalance)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-[10px]">Book Balance</p>
          <p className="font-bold">{INR(account.bookBalance)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-[10px]">Difference</p>
          <p className={`font-black ${diffPositive ? 'text-emerald-600' : 'text-rose-600'}`}>{INR(account.difference)}</p>
        </div>
      </div>
    </button>
  );
}

// ── Transaction Row ───────────────────────────────────────────────────────────

function TxRow({ tx, onFlag, onIgnore, onManualMatch }: {
  tx: BankTransactionResponseDTO;
  onFlag: (reason: string) => void;
  onIgnore: () => void;
  onManualMatch: (glEntryId: number) => void;
}) {
  const m = STATUS_META[tx.reconciliationStatus];
  const Icon = m.icon;
  const isCredit = tx.transactionType === 'CREDIT';
  const [glId, setGlId] = useState('');

  return (
    <div className={`flex items-center gap-3 py-2.5 px-4 border-b border-border/20 hover:bg-muted/20 transition-colors text-xs group ${tx.reconciliationStatus === 'EXCEPTION' ? 'bg-rose-500/3' : ''}`}>
      <div className="w-20 text-muted-foreground shrink-0">{format(new Date(tx.transactionDate), 'dd MMM yyyy')}</div>
      <div className="flex-1 min-w-0 truncate">{tx.description}</div>
      <div className={`w-24 text-right font-bold shrink-0 ${isCredit ? 'text-emerald-600' : 'text-rose-600'}`}>
        {isCredit ? '+' : '−'}{INR(tx.amount)}
      </div>
      <div className="w-28 shrink-0">
        <Badge variant="outline" className={`text-[8px] font-bold border-transparent flex items-center gap-0.5 ${m.color} ${m.bg}`}>
          <Icon className="h-2.5 w-2.5" />{m.label}
        </Badge>
      </div>
      {tx.reconciliationStatus === 'UNRECONCILED' && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Input
            className="h-6 w-20 text-[10px] px-1"
            value={glId}
            onChange={e => setGlId(e.target.value)}
            placeholder="GL ID"
          />
          {glId && (
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onManualMatch(Number(glId))}
              title="Manual match">
              <Link2 className="h-3 w-3" />
            </Button>
          )}
          <Button size="icon" variant="ghost" className="h-6 w-6 text-rose-500"
            onClick={() => onFlag('Unable to match — requires review')} title="Flag exception">
            <XCircle className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground"
            onClick={onIgnore} title="Ignore">
            <EyeOff className="h-3 w-3" />
          </Button>
        </div>
      )}
      {tx.matchedGlEntryId && <span className="text-[10px] text-muted-foreground shrink-0">GL #{tx.matchedGlEntryId}</span>}
    </div>
  );
}

// ── Add Bank Account Dialog ───────────────────────────────────────────────────

function AddBankAccountDialog({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ accountName: '', accountNumber: '', bankName: '', branchName: '', ifscCode: '', accountType: 'Current', notes: '' });
  const [saving, setSaving] = useState(false);
  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [k]: e.target.value }));
  const handleSave = async () => {
    if (!form.accountName || !form.accountNumber || !form.bankName) { toast.error('Name, account number and bank name are required.'); return; }
    setSaving(true);
    try { await bankService.createAccount(form); toast.success('Bank account added.'); onSaved(); onClose(); }
    catch (err: any) { toast.error(err?.response?.data?.message ?? 'Failed.'); }
    finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Bank Account</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="col-span-2 space-y-1.5"><Label>Account Name *</Label><Input value={form.accountName} onChange={f('accountName')} placeholder="SBI Main Operative Account" /></div>
          <div className="space-y-1.5"><Label>Account Number *</Label><Input value={form.accountNumber} onChange={f('accountNumber')} /></div>
          <div className="space-y-1.5"><Label>Bank Name *</Label><Input value={form.bankName} onChange={f('bankName')} /></div>
          <div className="space-y-1.5"><Label>Branch Name</Label><Input value={form.branchName} onChange={f('branchName')} /></div>
          <div className="space-y-1.5"><Label>IFSC Code</Label><Input value={form.ifscCode} onChange={f('ifscCode')} /></div>
          <div className="space-y-1.5"><Label>Account Type</Label>
            <Select value={form.accountType} onValueChange={v => setForm(p => ({ ...p, accountType: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['Current', 'Savings', 'OD', 'Fixed Deposit'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Adding…' : 'Add Account'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Add Transaction Dialog ────────────────────────────────────────────────────

function AddTransactionDialog({ open, onClose, bankAccountId, onSaved }: {
  open: boolean; onClose: () => void; bankAccountId: number | null; onSaved: () => void;
}) {
  const [form, setForm] = useState({ transactionDate: format(new Date(), 'yyyy-MM-dd'), description: '', transactionType: 'CREDIT' as BankTransactionType, amount: '', referenceNumber: '' });
  const [saving, setSaving] = useState(false);
  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [k]: e.target.value }));
  const handleSave = async () => {
    if (!form.description || !form.amount || !bankAccountId) { toast.error('Description and amount are required.'); return; }
    setSaving(true);
    try {
      await bankService.addTransaction({ ...form, bankAccountId, amount: Number(form.amount) });
      toast.success('Transaction recorded.'); onSaved(); onClose();
    } catch (err: any) { toast.error(err?.response?.data?.message ?? 'Failed.'); }
    finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Record Bank Transaction</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5"><Label>Description *</Label><Input value={form.description} onChange={f('description')} /></div>
            <div className="space-y-1.5"><Label>Date *</Label><Input type="date" value={form.transactionDate} onChange={f('transactionDate')} /></div>
            <div className="space-y-1.5"><Label>Type</Label>
              <Select value={form.transactionType} onValueChange={v => setForm(p => ({ ...p, transactionType: v as BankTransactionType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="CREDIT">Credit (+)</SelectItem><SelectItem value="DEBIT">Debit (−)</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Amount (₹) *</Label><Input type="number" min={0} value={form.amount} onChange={f('amount')} /></div>
            <div className="space-y-1.5"><Label>Ref / UTR</Label><Input value={form.referenceNumber} onChange={f('referenceNumber')} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Record'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function BankReconciliation() {
  const [accounts, setAccounts] = useState<BankAccountResponseDTO[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<BankAccountResponseDTO | null>(null);
  const [transactions, setTransactions] = useState<BankTransactionResponseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ReconciliationStatus | 'all'>('all');
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [addTxOpen, setAddTxOpen] = useState(false);
  const [autoMatching, setAutoMatching] = useState(false);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try { const r = await bankService.getAccounts(); setAccounts(r.data); }
    catch { toast.error('Failed to load bank accounts.'); }
    finally { setLoading(false); }
  }, []);

  const loadTransactions = useCallback(async (acct: BankAccountResponseDTO) => {
    setTxLoading(true);
    try { const r = await bankService.getTransactions(acct.id, statusFilter === 'all' ? undefined : statusFilter); setTransactions(r.data); }
    catch { toast.error('Failed to load transactions.'); }
    finally { setTxLoading(false); }
  }, [statusFilter]);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);
  useEffect(() => { if (selectedAccount) loadTransactions(selectedAccount); }, [selectedAccount, loadTransactions]);

  const doAutoMatch = async () => {
    if (!selectedAccount) return;
    setAutoMatching(true);
    try {
      const r = await bankService.autoMatch(selectedAccount.id);
      toast.success(`Auto-match complete: ${r.data.matched} transactions matched.`);
      loadTransactions(selectedAccount);
    } catch { toast.error('Auto-match failed.'); }
    finally { setAutoMatching(false); }
  };

  const doAction = async (fn: () => Promise<any>, msg: string) => {
    try { await fn(); toast.success(msg); if (selectedAccount) loadTransactions(selectedAccount); }
    catch (err: any) { toast.error(err?.response?.data?.message ?? 'Action failed.'); }
  };

  const unreconciled = transactions.filter(t => t.reconciliationStatus === 'UNRECONCILED').length;
  const filtered = transactions.filter(t => statusFilter === 'all' || t.reconciliationStatus === statusFilter);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2"><Landmark className="h-5 w-5 text-primary" />Bank Reconciliation</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Match statement transactions to GL entries</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadAccounts} disabled={loading}><RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />Refresh</Button>
          <Button size="sm" onClick={() => setAddAccountOpen(true)}><Plus className="h-3.5 w-3.5 mr-1.5" />Add Account</Button>
        </div>
      </div>

      {/* Account cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {loading ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />) :
          accounts.map(a => (
            <BankAccountCard key={a.id} account={a}
              onSelect={() => setSelectedAccount(a)}
              isSelected={selectedAccount?.id === a.id} />
          ))}
        {!loading && accounts.length === 0 && (
          <p className="col-span-3 text-center text-sm text-muted-foreground py-8">No bank accounts found. Add your first account.</p>
        )}
      </div>

      {/* Transactions panel */}
      {selectedAccount && (
        <div className="rounded-2xl border border-border/40 bg-card/60 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
            <div>
              <p className="text-sm font-bold">{selectedAccount.accountName}</p>
              <p className="text-xs text-muted-foreground">{unreconciled} unreconciled transactions</p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={v => setStatusFilter(v as ReconciliationStatus | 'all')}>
                <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {(Object.keys(STATUS_META) as ReconciliationStatus[]).map(s => <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={doAutoMatch} disabled={autoMatching || unreconciled === 0}>
                <Zap className={`h-3.5 w-3.5 mr-1.5 ${autoMatching ? 'animate-pulse' : 'text-amber-500'}`} />
                {autoMatching ? 'Matching…' : 'Auto-Match'}
              </Button>
              <Button size="sm" onClick={() => setAddTxOpen(true)}><Plus className="h-3.5 w-3.5 mr-1.5" />Add Tx</Button>
            </div>
          </div>

          <div className="min-h-24">
            {txLoading ? (
              <div className="p-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-8 animate-pulse rounded bg-muted" />)}</div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-10">No transactions to show.</p>
            ) : (
              <div className="text-xs">
                <div className="flex items-center gap-3 py-2 px-4 bg-muted/40 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  <span className="w-20">Date</span><span className="flex-1">Description</span><span className="w-24 text-right">Amount</span><span className="w-28">Status</span>
                </div>
                {filtered.map(tx => (
                  <TxRow key={tx.id} tx={tx}
                    onFlag={reason => doAction(() => bankService.flagException(tx.id, reason), 'Flagged as exception.')}
                    onIgnore={() => doAction(() => bankService.ignore(tx.id), 'Transaction ignored.')}
                    onManualMatch={glId => doAction(() => bankService.manualMatch(tx.id, glId), `Matched to GL #${glId}.`)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <AddBankAccountDialog open={addAccountOpen} onClose={() => setAddAccountOpen(false)} onSaved={loadAccounts} />
      <AddTransactionDialog open={addTxOpen} onClose={() => setAddTxOpen(false)} bankAccountId={selectedAccount?.id ?? null}
        onSaved={() => selectedAccount && loadTransactions(selectedAccount)} />
    </div>
  );
}
