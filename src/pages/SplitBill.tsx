import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { SplitBillParticipant } from '@/types';
import { formatCurrency } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, AlertCircle, CheckCircle } from 'lucide-react';

export default function SplitBill() {
  const { toast } = useToast();
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

    // Calculate debts
    const payers = allParticipants.filter(p => p.isPayer);
    const nonPayers = allParticipants.filter(p => !p.isPayer);
    
    let debtsCreated = 0;
    
    if (payers.some(p => p.name === 'Me')) {
      debtsCreated += nonPayers.filter(p => p.amount > 0).length;
    }
    
    payers.filter(p => p.name !== 'Me').forEach(() => {
      const meParticipant = allParticipants.find(p => p.name === 'Me');
      if (meParticipant && meParticipant.amount > 0) {
        debtsCreated++;
      }
    });

    toast({ 
      title: 'Bill split successfully', 
      description: `Created ${debtsCreated} debt record(s) from "${title}"` 
    });

    // Reset form
    setTitle('');
    setTotalAmount('');
    setParticipants([{ name: '', amount: 0, isPayer: false }]);
    setIncludeSelf(true);
    setSelfAmount('');
    setSelfIsPayer(true);
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-semibold">Split Bill</h1>
          <p className="text-muted-foreground">Create debts automatically from a shared bill</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Bill Details</CardTitle>
            <CardDescription>Enter the bill information and participants</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
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

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Participants</Label>
                  <Button type="button" variant="link" size="sm" onClick={splitEvenly} className="h-auto p-0">
                    Split evenly
                  </Button>
                </div>

                {/* Self */}
                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={includeSelf}
                      onCheckedChange={(v) => setIncludeSelf(!!v)}
                    />
                    <span className="text-sm font-medium w-24">You</span>
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
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selfIsPayer}
                      onCheckedChange={(v) => setSelfIsPayer(!!v)}
                      disabled={!includeSelf}
                    />
                    <span className="text-sm text-muted-foreground">Paid</span>
                  </div>
                </div>

                {/* Others */}
                {participants.map((p, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <Input
                      value={p.name}
                      onChange={(e) => updateParticipant(index, 'name', e.target.value)}
                      placeholder="Name"
                      className="w-32"
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
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={p.isPayer}
                        onCheckedChange={(v) => updateParticipant(index, 'isPayer', !!v)}
                      />
                      <span className="text-sm text-muted-foreground">Paid</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeParticipant(index)}
                      className="h-9 w-9 p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                <Button type="button" variant="outline" onClick={addParticipant}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Person
                </Button>
              </div>

              {/* Balance check */}
              <div className={`flex items-center gap-2 p-4 rounded-lg ${
                isBalanced ? 'bg-positive-muted' : 'bg-negative-muted'
              }`}>
                {isBalanced ? (
                  <CheckCircle className="h-4 w-4 text-positive" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-negative" />
                )}
                <span className={isBalanced ? 'text-positive' : 'text-negative'}>
                  Total: {formatCurrency(participantTotal)} / {formatCurrency(total)}
                  {isBalanced ? ' — Balanced!' : ` (${formatCurrency(Math.abs(total - participantTotal))} ${total > participantTotal ? 'remaining' : 'over'})`}
                </span>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={!isBalanced || !title || participants.every(p => !p.name.trim())}
              >
                Create Debts
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
