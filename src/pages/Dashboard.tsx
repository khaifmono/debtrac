import { useState } from 'react';
import { Debt, DebtDirection, Payment } from '@/types';
import { 
  mockDebts, 
  mockPayments,
  calculateSummary, 
  calculatePersonSummaries 
} from '@/lib/mock-data';
import { SummaryCards } from '@/components/SummaryCards';
import { DebtList } from '@/components/DebtList';
import { PersonSummaryList } from '@/components/PersonSummaryList';
import { AddDebtDialog } from '@/components/AddDebtDialog';
import { AddPaymentDialog } from '@/components/AddPaymentDialog';
import { DebtDetailDialog } from '@/components/DebtDetailDialog';
import { PersonDetailDialog } from '@/components/PersonDetailDialog';
import { SplitBillDialog } from '@/components/SplitBillDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Receipt, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Dashboard() {
  const { toast } = useToast();
  const [debts, setDebts] = useState<Debt[]>(mockDebts);
  const [payments, setPayments] = useState<Payment[]>(mockPayments);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog states
  const [addDebtOpen, setAddDebtOpen] = useState(false);
  const [addDebtDirection, setAddDebtDirection] = useState<DebtDirection>('owed_to_me');
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);
  const [selectedDebtForPayment, setSelectedDebtForPayment] = useState<Debt | null>(null);
  const [debtDetailOpen, setDebtDetailOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [personDetailOpen, setPersonDetailOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [splitBillOpen, setSplitBillOpen] = useState(false);

  // Filter debts by search
  const filteredDebts = debts.filter(d => 
    d.person_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.notes?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const summary = calculateSummary(filteredDebts);
  const personSummaries = calculatePersonSummaries(filteredDebts);

  const handleAddDebt = (direction: DebtDirection) => {
    setAddDebtDirection(direction);
    setAddDebtOpen(true);
  };

  const handleDebtSubmit = (data: {
    person_name: string;
    direction: DebtDirection;
    amount: number;
    due_date: string | null;
    notes: string | null;
  }) => {
    const newDebt: Debt = {
      id: Date.now().toString(),
      user_id: 'user1',
      person_id: Date.now().toString(),
      person_name: data.person_name,
      direction: data.direction,
      amount: data.amount,
      status: 'unpaid',
      due_date: data.due_date,
      notes: data.notes,
      created_at: new Date().toISOString(),
      remaining_amount: data.amount,
    };
    setDebts([newDebt, ...debts]);
    toast({ title: 'Debt added', description: `Added debt with ${data.person_name}` });
  };

  const handleAddPayment = (debt: Debt) => {
    setSelectedDebtForPayment(debt);
    setAddPaymentOpen(true);
  };

  const handlePaymentSubmit = (data: {
    debt_id: string;
    amount: number;
    date: string;
    note: string | null;
  }) => {
    const newPayment: Payment = {
      id: Date.now().toString(),
      debt_id: data.debt_id,
      amount: data.amount,
      date: data.date,
      note: data.note,
      created_at: new Date().toISOString(),
    };
    setPayments([...payments, newPayment]);

    // Update debt
    setDebts(debts.map(d => {
      if (d.id === data.debt_id) {
        const newRemaining = d.remaining_amount - data.amount;
        return {
          ...d,
          remaining_amount: Math.max(0, newRemaining),
          status: newRemaining <= 0 ? 'settled' : 'partially_paid',
        };
      }
      return d;
    }));

    toast({ title: 'Payment recorded', description: `Recorded RM ${data.amount.toFixed(2)} payment` });
  };

  const handleViewDebt = (debt: Debt) => {
    setSelectedDebt(debt);
    setDebtDetailOpen(true);
  };

  const handleSelectPerson = (name: string) => {
    setSelectedPerson(name);
    setPersonDetailOpen(true);
  };

  const handleSplitBillSubmit = (data: {
    title: string;
    total_amount: number;
    participants: { name: string; amount: number; isPayer: boolean }[];
  }) => {
    const payers = data.participants.filter(p => p.isPayer);
    const nonPayers = data.participants.filter(p => !p.isPayer);
    
    const newDebts: Debt[] = [];
    
    // If I paid, others owe me
    if (payers.some(p => p.name === 'Me')) {
      nonPayers.forEach(p => {
        if (p.amount > 0) {
          newDebts.push({
            id: Date.now().toString() + Math.random(),
            user_id: 'user1',
            person_id: Date.now().toString(),
            person_name: p.name,
            direction: 'owed_to_me',
            amount: p.amount,
            status: 'unpaid',
            due_date: null,
            notes: `Split bill: ${data.title}`,
            created_at: new Date().toISOString(),
            remaining_amount: p.amount,
          });
        }
      });
    }
    
    // If others paid, I owe them
    payers.filter(p => p.name !== 'Me').forEach(payer => {
      const meParticipant = data.participants.find(p => p.name === 'Me');
      if (meParticipant && meParticipant.amount > 0) {
        newDebts.push({
          id: Date.now().toString() + Math.random(),
          user_id: 'user1',
          person_id: Date.now().toString(),
          person_name: payer.name,
          direction: 'i_owe',
          amount: meParticipant.amount,
          status: 'unpaid',
          due_date: null,
          notes: `Split bill: ${data.title}`,
          created_at: new Date().toISOString(),
          remaining_amount: meParticipant.amount,
        });
      }
    });

    setDebts([...newDebts, ...debts]);
    toast({ 
      title: 'Bill split', 
      description: `Created ${newDebts.length} debt record(s) from "${data.title}"` 
    });
  };

  const debtPayments = selectedDebt 
    ? payments.filter(p => p.debt_id === selectedDebt.id)
    : [];

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground">Track your debts and split bills</p>
        </div>
        <Button onClick={() => setSplitBillOpen(true)}>
          <Receipt className="h-4 w-4 mr-2" />
          Split Bill
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by person or note..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Summary Cards */}
      <SummaryCards summary={summary} />

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <DebtList
            debts={filteredDebts}
            direction="owed_to_me"
            onAddDebt={() => handleAddDebt('owed_to_me')}
            onViewDebt={handleViewDebt}
            onAddPayment={handleAddPayment}
            onEditDebt={(debt) => console.log('Edit', debt)}
          />
          <DebtList
            debts={filteredDebts}
            direction="i_owe"
            onAddDebt={() => handleAddDebt('i_owe')}
            onViewDebt={handleViewDebt}
            onAddPayment={handleAddPayment}
            onEditDebt={(debt) => console.log('Edit', debt)}
          />
        </div>
        <div>
          <PersonSummaryList 
            summaries={personSummaries} 
            onSelectPerson={handleSelectPerson}
          />
        </div>
      </div>

      {/* Dialogs */}
      <AddDebtDialog
        open={addDebtOpen}
        onOpenChange={setAddDebtOpen}
        defaultDirection={addDebtDirection}
        onSubmit={handleDebtSubmit}
      />

      <AddPaymentDialog
        open={addPaymentOpen}
        onOpenChange={setAddPaymentOpen}
        debt={selectedDebtForPayment}
        onSubmit={handlePaymentSubmit}
      />

      <DebtDetailDialog
        open={debtDetailOpen}
        onOpenChange={setDebtDetailOpen}
        debt={selectedDebt}
        payments={debtPayments}
        onAddPayment={() => {
          setDebtDetailOpen(false);
          if (selectedDebt) handleAddPayment(selectedDebt);
        }}
      />

      <PersonDetailDialog
        open={personDetailOpen}
        onOpenChange={setPersonDetailOpen}
        personName={selectedPerson}
        debts={debts}
      />

      <SplitBillDialog
        open={splitBillOpen}
        onOpenChange={setSplitBillOpen}
        onSubmit={handleSplitBillSubmit}
      />
    </div>
  );
}
