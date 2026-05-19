import { Debt } from '@/types';
import { formatCurrency, formatDate } from '@/lib/mock-data';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { User, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface PersonDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personName: string | null;
  debts: Debt[];
}

function getStatusBadgeVariant(status: string): 'unpaid' | 'partial' | 'settled' {
  switch (status) {
    case 'unpaid': return 'unpaid';
    case 'partially_paid': return 'partial';
    case 'settled': return 'settled';
    default: return 'unpaid';
  }
}

export function PersonDetailDialog({ 
  open, 
  onOpenChange, 
  personName, 
  debts 
}: PersonDetailDialogProps) {
  if (!personName) return null;

  const personDebts = debts.filter(d => d.person_name === personName);
  const owedToMe = personDebts.filter(d => d.direction === 'owed_to_me' && d.status !== 'settled');
  const iOwe = personDebts.filter(d => d.direction === 'i_owe' && d.status !== 'settled');
  
  const totalOwedToMe = owedToMe.reduce((sum, d) => sum + d.remaining_amount, 0);
  const totalIOwe = iOwe.reduce((sum, d) => sum + d.remaining_amount, 0);
  const netBalance = totalOwedToMe - totalIOwe;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <DialogTitle>{personName}</DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Owed to Me</p>
                <p className="font-semibold text-positive">{formatCurrency(totalOwedToMe)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">I Owe</p>
                <p className="font-semibold text-negative">{formatCurrency(totalIOwe)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Net</p>
                <p className={`font-semibold ${netBalance >= 0 ? 'text-positive' : 'text-negative'}`}>
                  {netBalance >= 0 ? '+' : ''}{formatCurrency(netBalance)}
                </p>
              </div>
            </div>
          </div>

          {/* Debts List */}
          <div className="space-y-4">
            {personDebts.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No debts with this person</p>
            ) : (
              personDebts.map((debt) => {
                const isOwedToMe = debt.direction === 'owed_to_me';
                const DirectionIcon = isOwedToMe ? ArrowDownLeft : ArrowUpRight;
                
                return (
                  <div key={debt.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <DirectionIcon className={`h-4 w-4 mt-0.5 ${isOwedToMe ? 'text-positive' : 'text-negative'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">
                          {isOwedToMe ? 'Owes you' : 'You owe'}
                        </span>
                        <Badge variant={getStatusBadgeVariant(debt.status)} className="text-xs">
                          {debt.status === 'partially_paid' ? 'Partial' : debt.status === 'settled' ? 'Settled' : 'Unpaid'}
                        </Badge>
                      </div>
                      {debt.notes && (
                        <p className="text-sm text-muted-foreground truncate">{debt.notes}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(debt.created_at)}
                        {debt.due_date && ` · Due: ${formatDate(debt.due_date)}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${isOwedToMe ? 'text-positive' : 'text-negative'}`}>
                        {formatCurrency(debt.remaining_amount)}
                      </p>
                      {debt.remaining_amount !== debt.amount && (
                        <p className="text-xs text-muted-foreground">
                          of {formatCurrency(debt.amount)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
