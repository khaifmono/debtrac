import { useState } from 'react';
import { Debt, DebtDirection } from '@/types';
import {
  calculateSummary,
  calculatePersonSummaries
} from '@/lib/mock-data';
import { useDebts, useCreateDebt, useCreatePayment } from '@/hooks/use-debts';
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
  const { data: debts = [], isLoading } = useDebts();
  const createDebt = useCreateDebt();
  const createPayment = useCreatePayment();
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
    createDebt.mutate(data, {
      onSuccess: () => {
        toast({ title: 'Debt added', description: `Added debt with ${data.person_name}` });
      },
      onError: () => {
        toast({ title: 'Error', description: 'Failed to add debt', variant: 'destructive' });
      },
    });
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
    createPayment.mutate(data, {
      onSuccess: () => {
        toast({ title: 'Payment recorded', description: `Recorded RM ${data.amount.toFixed(2)} payment` });
      },
      onError: () => {
        toast({ title: 'Error', description: 'Failed to record payment', variant: 'destructive' });
      },
    });
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

    const debtPromises: Promise<any>[] = [];

    // If I paid, others owe me
    if (payers.some(p => p.name === 'Me')) {
      nonPayers.forEach(p => {
        if (p.amount > 0) {
          debtPromises.push(
            createDebt.mutateAsync({
              person_name: p.name,
              direction: 'owed_to_me',
              amount: p.amount,
              notes: `Split bill: ${data.title}`,
            })
          );
        }
      });
    }

    // If others paid, I owe them
    payers.filter(p => p.name !== 'Me').forEach(payer => {
      const meParticipant = data.participants.find(p => p.name === 'Me');
      if (meParticipant && meParticipant.amount > 0) {
        debtPromises.push(
          createDebt.mutateAsync({
            person_name: payer.name,
            direction: 'i_owe',
            amount: meParticipant.amount,
            notes: `Split bill: ${data.title}`,
          })
        );
      }
    });

    Promise.all(debtPromises).then(() => {
      toast({
        title: 'Bill split',
        description: `Created ${debtPromises.length} debt record(s) from "${data.title}"`
      });
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8 text-muted-foreground">Loading...</div>;
  }

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
