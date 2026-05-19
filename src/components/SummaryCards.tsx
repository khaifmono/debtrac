import { DebtSummary } from '@/types';
import { formatCurrency } from '@/lib/mock-data';
import { ArrowDownLeft, ArrowUpRight, Scale } from 'lucide-react';

export function SummaryCards({ summary }: { summary: DebtSummary }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      <div className="bg-card border rounded-xl p-4">
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-2">
          <ArrowDownLeft className="h-3.5 w-3.5 text-positive" />
          <span>Owed to Me</span>
        </div>
        <p className="text-xl font-bold text-positive">{formatCurrency(summary.total_owed_to_me)}</p>
      </div>

      <div className="bg-card border rounded-xl p-4">
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-2">
          <ArrowUpRight className="h-3.5 w-3.5 text-negative" />
          <span>I Owe</span>
        </div>
        <p className="text-xl font-bold text-negative">{formatCurrency(summary.total_i_owe)}</p>
      </div>

      <div className="bg-card border rounded-xl p-4 col-span-2 lg:col-span-1">
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-2">
          <Scale className="h-3.5 w-3.5" />
          <span>Net Balance</span>
        </div>
        <p className={`text-xl font-bold ${summary.net_balance >= 0 ? 'text-positive' : 'text-negative'}`}>
          {summary.net_balance >= 0 ? '+' : ''}{formatCurrency(summary.net_balance)}
        </p>
      </div>
    </div>
  );
}
