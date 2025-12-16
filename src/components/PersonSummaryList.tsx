import { PersonSummary } from '@/types';
import { formatCurrency } from '@/lib/mock-data';
import { User } from 'lucide-react';

interface PersonSummaryListProps {
  summaries: PersonSummary[];
  onSelectPerson: (name: string) => void;
}

export function PersonSummaryList({ summaries, onSelectPerson }: PersonSummaryListProps) {
  if (summaries.length === 0) {
    return (
      <div className="bg-card border rounded-lg p-8 text-center text-muted-foreground">
        <p>No outstanding balances</p>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-lg">
      <div className="p-4 border-b">
        <h2 className="font-semibold">People</h2>
        <p className="text-sm text-muted-foreground">
          {summaries.length} with outstanding balance
        </p>
      </div>
      
      <div className="divide-y">
        {summaries.map((person) => (
          <button
            key={person.person_name}
            onClick={() => onSelectPerson(person.person_name)}
            className="w-full p-4 hover:bg-muted/50 transition-colors text-left"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="font-medium">{person.person_name}</span>
              </div>
              
              <div className="text-right">
                <p className={`font-semibold ${
                  person.net >= 0 ? 'text-positive' : 'text-negative'
                }`}>
                  {person.net >= 0 ? '+' : ''}{formatCurrency(person.net)}
                </p>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  {person.owed_to_me > 0 && (
                    <span className="text-positive">+{formatCurrency(person.owed_to_me)}</span>
                  )}
                  {person.i_owe > 0 && (
                    <span className="text-negative">-{formatCurrency(person.i_owe)}</span>
                  )}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
