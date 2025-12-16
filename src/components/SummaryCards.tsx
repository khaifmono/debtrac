import { DebtSummary } from '@/types';
import { formatCurrency } from '@/lib/mock-data';
import { ArrowDownLeft, ArrowUpRight, Scale } from 'lucide-react';

interface SummaryCardsProps {
  summary: DebtSummary;
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-card border rounded-lg p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
          <ArrowDownLeft className="h-4 w-4 text-positive" />
          <span>Owed to Me</span>
        </div>
        <p className="text-2xl font-semibold text-positive">
          {formatCurrency(summary.total_owed_to_me)}
        </p>
      </div>

      <div className="bg-card border rounded-lg p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
          <ArrowUpRight className="h-4 w-4 text-negative" />
          <span>I Owe</span>
        </div>
        <p className="text-2xl font-semibold text-negative">
          {formatCurrency(summary.total_i_owe)}
        </p>
      </div>

      <div className="bg-card border rounded-lg p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
          <Scale className="h-4 w-4" />
          <span>Net Balance</span>
        </div>
        <p className={`text-2xl font-semibold ${
          summary.net_balance >= 0 ? 'text-positive' : 'text-negative'
        }`}>
          {summary.net_balance >= 0 ? '+' : ''}{formatCurrency(summary.net_balance)}
        </p>
      </div>
    </div>
  );
}
