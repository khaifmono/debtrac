import { Debt, DebtDirection, DebtStatus } from '@/types';
import { formatCurrency, formatDate } from '@/lib/mock-data';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Plus, Calendar, FileText } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DebtListProps {
  debts: Debt[];
  direction: DebtDirection;
  onAddDebt: () => void;
  onViewDebt: (debt: Debt) => void;
  onAddPayment: (debt: Debt) => void;
  onEditDebt: (debt: Debt) => void;
}

function getStatusBadgeVariant(status: DebtStatus): 'unpaid' | 'partial' | 'settled' {
  switch (status) {
    case 'unpaid': return 'unpaid';
    case 'partially_paid': return 'partial';
    case 'settled': return 'settled';
  }
}

function getStatusLabel(status: DebtStatus): string {
  switch (status) {
    case 'unpaid': return 'Unpaid';
    case 'partially_paid': return 'Partial';
    case 'settled': return 'Settled';
  }
}

export function DebtList({ 
  debts, 
  direction, 
  onAddDebt, 
  onViewDebt, 
  onAddPayment,
  onEditDebt 
}: DebtListProps) {
  const title = direction === 'owed_to_me' ? 'Owed to Me' : 'I Owe';
  const filteredDebts = debts.filter(d => d.direction === direction);
  const activeDebts = filteredDebts.filter(d => d.status !== 'settled');
  const settledDebts = filteredDebts.filter(d => d.status === 'settled');

  return (
    <div className="bg-card border rounded-lg">
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">
            {activeDebts.length} active · {settledDebts.length} settled
          </p>
        </div>
        <Button size="sm" onClick={onAddDebt}>
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {filteredDebts.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          <p>No debts yet</p>
          <Button variant="link" onClick={onAddDebt} className="mt-2">
            Add your first debt
          </Button>
        </div>
      ) : (
        <div className="divide-y">
          {filteredDebts.map((debt) => (
            <div
              key={debt.id}
              className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => onViewDebt(debt)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium truncate">{debt.person_name}</span>
                    <Badge variant={getStatusBadgeVariant(debt.status)}>
                      {getStatusLabel(debt.status)}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    {debt.due_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(debt.due_date)}
                      </span>
                    )}
                    {debt.notes && (
                      <span className="flex items-center gap-1 truncate">
                        <FileText className="h-3 w-3" />
                        {debt.notes}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right flex items-center gap-2">
                  <div>
                    <p className={`font-semibold ${
                      direction === 'owed_to_me' ? 'text-positive' : 'text-negative'
                    }`}>
                      {formatCurrency(debt.remaining_amount)}
                    </p>
                    {debt.remaining_amount !== debt.amount && (
                      <p className="text-xs text-muted-foreground">
                        of {formatCurrency(debt.amount)}
                      </p>
                    )}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        onAddPayment(debt);
                      }}>
                        Record Payment
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        onEditDebt(debt);
                      }}>
                        Edit Debt
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
