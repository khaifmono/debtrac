import { useState } from 'react';
import { SplitBillParticipant } from '@/types';
import { formatCurrency } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Plus, Trash2, AlertCircle } from 'lucide-react';

interface SplitBillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    title: string;
    total_amount: number;
    participants: SplitBillParticipant[];
  }) => void;
}

export function SplitBillDialog({ open, onOpenChange, onSubmit }: SplitBillDialogProps) {
  const [title, setTitle] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [participants, setParticipants] = useState<SplitBillParticipant[]>([
    { name: '', amount: 0, isPayer: false },
  ]);
  const [includeSelf, setIncludeSelf] = useState(true);
  const [selfAmount, setSelfAmount] = useState('');
  const [selfIsPayer, setSelfIsPayer] = useState(true);

  const total = parseFloat(totalAmount) || 0;
  const participantTotal = participants.reduce((sum, p) => sum + (p.amount || 0), 0) + (includeSelf ? (parseFloat(selfAmount) || 0) : 0);
  const isBalanced = Math.abs(total - participantTotal) < 0.01;

  const addParticipant = () => {
    setParticipants([...participants, { name: '', amount: 0, isPayer: false }]);
  };

  const removeParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index));
  };

  const updateParticipant = (index: number, field: keyof SplitBillParticipant, value: any) => {
    const updated = [...participants];
    updated[index] = { ...updated[index], [field]: value };
    setParticipants(updated);
  };

  const splitEvenly = () => {
    const count = participants.length + (includeSelf ? 1 : 0);
    if (count === 0 || !total) return;
    
    const perPerson = Math.round((total / count) * 100) / 100;
    const remainder = Math.round((total - perPerson * count) * 100) / 100;
    
    setParticipants(participants.map((p, i) => ({
      ...p,
      amount: i === 0 ? perPerson + remainder : perPerson,
    })));
    
    if (includeSelf) {
      setSelfAmount(perPerson.toString());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const allParticipants = [
      ...participants.filter(p => p.name.trim()),
    ];

    if (includeSelf) {
      allParticipants.push({
        name: 'Me',
        amount: parseFloat(selfAmount) || 0,
        isPayer: selfIsPayer,
      });
    }

    onSubmit({
      title: title.trim(),
      total_amount: total,
      participants: allParticipants,
    });

    // Reset
    setTitle('');
    setTotalAmount('');
    setParticipants([{ name: '', amount: 0, isPayer: false }]);
    setIncludeSelf(true);
    setSelfAmount('');
    setSelfIsPayer(true);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Split Bill</DialogTitle>
          <DialogDescription>
            Create debts automatically from a shared bill
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Bill Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Dinner at..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="total">Total Amount (MYR)</Label>
              <Input
                id="total"
                type="number"
                step="0.01"
                min="0.01"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Participants</Label>
              <Button type="button" variant="link" size="sm" onClick={splitEvenly} className="h-auto p-0 text-xs">
                Split evenly
              </Button>
            </div>

            {/* Self */}
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={includeSelf}
                  onCheckedChange={(v) => setIncludeSelf(!!v)}
                />
                <span className="text-sm font-medium w-20">You</span>
              </div>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={selfAmount}
                onChange={(e) => setSelfAmount(e.target.value)}
                placeholder="Amount"
                className="flex-1"
                disabled={!includeSelf}
              />
              <div className="flex items-center gap-1">
                <Checkbox
                  checked={selfIsPayer}
                  onCheckedChange={(v) => setSelfIsPayer(!!v)}
                  disabled={!includeSelf}
                />
                <span className="text-xs text-muted-foreground">Paid</span>
              </div>
            </div>

            {/* Others */}
            {participants.map((p, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={p.name}
                  onChange={(e) => updateParticipant(index, 'name', e.target.value)}
                  placeholder="Name"
                  className="w-28"
                />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={p.amount || ''}
                  onChange={(e) => updateParticipant(index, 'amount', parseFloat(e.target.value) || 0)}
                  placeholder="Amount"
                  className="flex-1"
                />
                <div className="flex items-center gap-1">
                  <Checkbox
                    checked={p.isPayer}
                    onCheckedChange={(v) => updateParticipant(index, 'isPayer', !!v)}
                  />
                  <span className="text-xs text-muted-foreground">Paid</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeParticipant(index)}
                  className="h-8 w-8 p-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Button type="button" variant="outline" size="sm" onClick={addParticipant}>
              <Plus className="h-4 w-4 mr-1" />
              Add Person
            </Button>
          </div>

          {/* Balance check */}
          <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
            isBalanced ? 'bg-positive-muted text-positive' : 'bg-negative-muted text-negative'
          }`}>
            {!isBalanced && <AlertCircle className="h-4 w-4" />}
            <span>
              Total: {formatCurrency(participantTotal)} / {formatCurrency(total)}
              {isBalanced ? ' ✓' : ` (${formatCurrency(Math.abs(total - participantTotal))} ${total > participantTotal ? 'remaining' : 'over'})`}
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isBalanced || participants.every(p => !p.name.trim())}>
              Create Debts
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
