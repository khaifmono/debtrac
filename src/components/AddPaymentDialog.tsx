import { useState } from 'react';
import { Debt } from '@/types';
import { formatCurrency } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface AddPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debt: Debt | null;
  onSubmit: (data: {
    debt_id: string;
    amount: number;
    date: string;
    note: string | null;
  }) => void;
}

export function AddPaymentDialog({ 
  open, 
  onOpenChange, 
  debt,
  onSubmit 
}: AddPaymentDialogProps) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');

  if (!debt) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onSubmit({
      debt_id: debt.id,
      amount: parseFloat(amount),
      date,
      note: note.trim() || null,
    });

    // Reset form
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setNote('');
    onOpenChange(false);
  };

  const handleFullPayment = () => {
    setAmount(debt.remaining_amount.toString());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            {debt.person_name} · Remaining: {formatCurrency(debt.remaining_amount)}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={handleFullPayment}
            >
              Pay in Full — {formatCurrency(Number(debt.remaining_amount))}
            </Button>
            <div className="space-y-2">
              <Label htmlFor="amount">Or enter amount (MYR)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={debt.remaining_amount}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Payment note"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Record Payment</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
