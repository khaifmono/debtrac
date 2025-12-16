import { useState } from 'react';
import { DebtDirection } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AddDebtDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDirection?: DebtDirection;
  onSubmit: (data: {
    person_name: string;
    direction: DebtDirection;
    amount: number;
    due_date: string | null;
    notes: string | null;
  }) => void;
}

export function AddDebtDialog({ 
  open, 
  onOpenChange, 
  defaultDirection = 'owed_to_me',
  onSubmit 
}: AddDebtDialogProps) {
  const [personName, setPersonName] = useState('');
  const [direction, setDirection] = useState<DebtDirection>(defaultDirection);
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onSubmit({
      person_name: personName.trim(),
      direction,
      amount: parseFloat(amount),
      due_date: dueDate || null,
      notes: notes.trim() || null,
    });

    // Reset form
    setPersonName('');
    setAmount('');
    setDueDate('');
    setNotes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Debt</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="person_name">Person Name</Label>
            <Input
              id="person_name"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              placeholder="Enter name"
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="direction">Direction</Label>
            <Select value={direction} onValueChange={(v) => setDirection(v as DebtDirection)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owed_to_me">Owed to Me</SelectItem>
                <SelectItem value="i_owe">I Owe</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (MYR)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="due_date">Due Date (optional)</Label>
            <Input
              id="due_date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What is this for?"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Debt</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
