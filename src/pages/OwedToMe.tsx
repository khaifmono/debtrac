import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Debt, DebtDirection } from '@/types';
import { formatCurrency, formatDate } from '@/lib/mock-data';
import { useDebts, useCreateDebt, useCreatePayment, usePayments } from '@/hooks/use-debts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AddDebtDialog } from '@/components/AddDebtDialog';
import { AddPaymentDialog } from '@/components/AddPaymentDialog';
import { DebtDetailDialog } from '@/components/DebtDetailDialog';
import { useToast } from '@/hooks/use-toast';
import { Search, Plus, Calendar, FileText, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function getStatusBadgeVariant(status: string): 'unpaid' | 'partial' | 'settled' {
  switch (status) {
    case 'unpaid': return 'unpaid';
    case 'partially_paid': return 'partial';
    case 'settled': return 'settled';
    default: return 'unpaid';
  }
}

export default function OwedToMe() {
  const { toast } = useToast();
  const { data: allDebts = [], isLoading } = useDebts();
  const createDebt = useCreateDebt();
  const createPayment = useCreatePayment();
  const [searchQuery, setSearchQuery] = useState('');
  const [addDebtOpen, setAddDebtOpen] = useState(false);
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [debtDetailOpen, setDebtDetailOpen] = useState(false);

  const debts = allDebts.filter(d => d.direction === 'owed_to_me');
  const filteredDebts = debts.filter(d =>
    d.person_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.notes?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalOwed = filteredDebts
    .filter(d => d.status !== 'settled')
    .reduce((sum, d) => sum + Number(d.remaining_amount), 0);

  const handleDebtSubmit = (data: {
    person_name: string;
    phone?: string;
    direction: DebtDirection;
    amount: number;
    due_date: string | null;
    notes: string | null;
  }) => {
    createDebt.mutate({ ...data, direction: 'owed_to_me' }, {
      onSuccess: () => {
        toast({ title: 'Debt added', description: `${data.person_name} owes you ${formatCurrency(data.amount)}` });
      },
    });
  };

  const handlePaymentSubmit = (data: {
    debt_id: string;
    amount: number;
    date: string;
    note: string | null;
  }) => {
    createPayment.mutate(data, {
      onSuccess: () => {
        toast({ title: 'Payment recorded' });
      },
    });
  };

  if (isLoading) {
    return <Layout><div className="flex items-center justify-center p-8 text-muted-foreground">Loading...</div></Layout>;
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Owed to Me</h1>
            <p className="text-muted-foreground">
              Total outstanding: <span className="text-positive font-medium">{formatCurrency(totalOwed)}</span>
            </p>
          </div>
          <Button onClick={() => setAddDebtOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Debt
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="bg-card border rounded-lg divide-y">
          {filteredDebts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>No debts yet</p>
            </div>
          ) : (
            filteredDebts.map((debt) => (
              <div
                key={debt.id}
                className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => {
                  setSelectedDebt(debt);
                  setDebtDetailOpen(true);
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{debt.person_name}</span>
                      <Badge variant={getStatusBadgeVariant(debt.status)}>
                        {debt.status === 'partially_paid' ? 'Partial' : debt.status === 'settled' ? 'Settled' : 'Unpaid'}
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
                      <p className="font-semibold text-positive">
                        {formatCurrency(Number(debt.remaining_amount))}
                      </p>
                      {Number(debt.remaining_amount) !== Number(debt.amount) && (
                        <p className="text-xs text-muted-foreground">of {formatCurrency(Number(debt.amount))}</p>
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
                          setSelectedDebt(debt);
                          setAddPaymentOpen(true);
                        }}>
                          Record Payment
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <AddDebtDialog
        open={addDebtOpen}
        onOpenChange={setAddDebtOpen}
        defaultDirection="owed_to_me"
        onSubmit={handleDebtSubmit}
      />

      <AddPaymentDialog
        open={addPaymentOpen}
        onOpenChange={setAddPaymentOpen}
        debt={selectedDebt}
        onSubmit={handlePaymentSubmit}
      />

      <DebtDetailDialog
        open={debtDetailOpen}
        onOpenChange={setDebtDetailOpen}
        debt={selectedDebt}
        onAddPayment={() => {
          setDebtDetailOpen(false);
          setAddPaymentOpen(true);
        }}
      />
    </Layout>
  );
}
