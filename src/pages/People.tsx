import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Person } from '@/types';
import { formatCurrency, calculatePersonSummaries } from '@/lib/mock-data';
import { useDebts } from '@/hooks/use-debts';
import { peopleApi } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Search, User, Phone, Pencil } from 'lucide-react';

export default function People() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: debts = [], isLoading: debtsLoading } = useDebts();
  const { data: people = [], isLoading: peopleLoading } = useQuery({
    queryKey: ['people'],
    queryFn: peopleApi.getAll,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [editPerson, setEditPerson] = useState<Person | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');

  const updatePerson = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; phone?: string | null } }) =>
      peopleApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      setEditPerson(null);
      toast({ title: 'Person updated' });
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const summaries = calculatePersonSummaries(debts);
  const filteredSummaries = summaries.filter(s =>
    s.person_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPersonByName = (name: string) => people.find(p => p.name === name);

  const openEdit = (personName: string) => {
    const person = getPersonByName(personName);
    if (person) {
      setEditPerson(person);
      setEditName(person.name);
      setEditPhone(person.phone || '');
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPerson) return;
    updatePerson.mutate({
      id: editPerson.id,
      data: { name: editName, phone: editPhone.trim() || null },
    });
  };

  const isLoading = debtsLoading || peopleLoading;

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
            filteredSummaries.map((person) => {
              const personRecord = getPersonByName(person.person_name);
              return (
                <div
                  key={person.person_name}
                  className="w-full p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <span className="font-medium">{person.person_name}</span>
                        {personRecord?.phone && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{personRecord.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
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
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => openEdit(person.person_name)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <Dialog open={!!editPerson} onOpenChange={(open) => !open && setEditPerson(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Person</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone Number</Label>
              <Input
                id="edit-phone"
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="+60123456789"
              />
              <p className="text-xs text-muted-foreground">
                Used for Telegram reminders in the future
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditPerson(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updatePerson.isPending}>
                {updatePerson.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
