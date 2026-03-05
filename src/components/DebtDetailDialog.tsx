import { Debt } from '@/types';
import { formatCurrency, formatDate } from '@/lib/mock-data';
import { usePayments } from '@/hooks/use-debts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar, FileText, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface DebtDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debt: Debt | null;
  onAddPayment: () => void;
}

function getStatusBadgeVariant(status: string): 'unpaid' | 'partial' | 'settled' {
  switch (status) {
    case 'unpaid': return 'unpaid';
    case 'partially_paid': return 'partial';
    case 'settled': return 'settled';
    default: return 'unpaid';
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'unpaid': return 'Unpaid';
    case 'partially_paid': return 'Partial';
    case 'settled': return 'Settled';
    default: return status;
  }
}

export function DebtDetailDialog({
  open,
  onOpenChange,
  debt,
  onAddPayment
}: DebtDetailDialogProps) {
  const { data: payments = [] } = usePayments(open && debt ? debt.id : undefined);

  if (!debt) return null;

  const isOwedToMe = debt.direction === 'owed_to_me';
  const DirectionIcon = isOwedToMe ? ArrowDownLeft : ArrowUpRight;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DirectionIcon className={`h-5 w-5 ${isOwedToMe ? 'text-positive' : 'text-negative'}`} />
            <DialogTitle>{debt.person_name}</DialogTitle>
            <Badge variant={getStatusBadgeVariant(debt.status)}>
              {getStatusLabel(debt.status)}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Amount */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-muted-foreground">
                {isOwedToMe ? 'They owe you' : 'You owe'}
              </span>
              <div className="text-right">
                <p className={`text-2xl font-semibold ${isOwedToMe ? 'text-positive' : 'text-negative'}`}>
                  {formatCurrency(Number(debt.remaining_amount))}
                </p>
                {Number(debt.remaining_amount) !== Number(debt.amount) && (
                  <p className="text-sm text-muted-foreground">
                    of {formatCurrency(Number(debt.amount))} total
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-2 text-sm">
            {debt.due_date && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Due: {formatDate(debt.due_date)}</span>
              </div>
            )}
            {debt.notes && (
              <div className="flex items-start gap-2 text-muted-foreground">
                <FileText className="h-4 w-4 mt-0.5" />
                <span>{debt.notes}</span>
              </div>
            )}
            <div className="text-muted-foreground">
              Created: {formatDate(debt.created_at)}
            </div>
          </div>

          {/* Payments */}
          {payments.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-2">Payment History</h4>
              <div className="space-y-2">
                {payments.map((payment) => (
                  <div key={payment.id} className="flex justify-between text-sm">
                    <div>
                      <span className="text-muted-foreground">{formatDate(payment.date)}</span>
                      {payment.note && (
                        <span className="text-muted-foreground ml-2">· {payment.note}</span>
                      )}
                    </div>
                    <span className="font-medium text-positive">
                      +{formatCurrency(Number(payment.amount))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          {debt.status !== 'settled' && (
            <div className="flex justify-end pt-2">
              <Button onClick={onAddPayment}>
                Record Payment
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
