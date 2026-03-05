import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { formatCurrency, calculatePersonSummaries } from '@/lib/mock-data';
import { useDebts } from '@/hooks/use-debts';
import { PersonDetailDialog } from '@/components/PersonDetailDialog';
import { Input } from '@/components/ui/input';
import { Search, User } from 'lucide-react';

export default function People() {
  const { data: debts = [], isLoading } = useDebts();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [personDetailOpen, setPersonDetailOpen] = useState(false);

  const summaries = calculatePersonSummaries(debts);
  const filteredSummaries = summaries.filter(s =>
    s.person_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return <Layout><div className="flex items-center justify-center p-8 text-muted-foreground">Loading...</div></Layout>;
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-semibold">People</h1>
          <p className="text-muted-foreground">
            {summaries.length} people with outstanding balances
          </p>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search people..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="bg-card border rounded-lg divide-y">
          {filteredSummaries.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>No people found</p>
            </div>
          ) : (
            filteredSummaries.map((person) => (
              <button
                key={person.person_name}
                onClick={() => {
                  setSelectedPerson(person.person_name);
                  setPersonDetailOpen(true);
                }}
                className="w-full p-4 hover:bg-muted/50 transition-colors text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <span className="font-medium">{person.person_name}</span>
                  </div>

                  <div className="text-right">
                    <p className={`font-semibold ${
                      person.net >= 0 ? 'text-positive' : 'text-negative'
                    }`}>
                      {person.net >= 0 ? '+' : ''}{formatCurrency(person.net)}
                    </p>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      {person.owed_to_me > 0 && (
                        <span className="text-positive">Owes you {formatCurrency(person.owed_to_me)}</span>
                      )}
                      {person.i_owe > 0 && (
                        <span className="text-negative">You owe {formatCurrency(person.i_owe)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <PersonDetailDialog
        open={personDetailOpen}
        onOpenChange={setPersonDetailOpen}
        personName={selectedPerson}
        debts={debts}
      />
    </Layout>
  );
}
