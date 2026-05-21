import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Person } from '@/types';
import { formatCurrency, calculatePersonSummaries } from '@/lib/mock-data';
import { useDebts } from '@/hooks/use-debts';
import { peopleApi, settingsApi } from '@/lib/api';
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
import { Search, User, Phone, Pencil, UserPlus } from 'lucide-react';

export default function People() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: debts = [], isLoading: debtsLoading } = useDebts();
  const { data: people = [], isLoading: peopleLoading } = useQuery({
    queryKey: ['people'],
    queryFn: peopleApi.getAll,
  });

  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
  });
  const paymentSettings = settingsData as any;
  const [searchQuery, setSearchQuery] = useState('');
  const [editPerson, setEditPerson] = useState<Person | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addPhone, setAddPhone] = useState('');

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

  const createPerson = useMutation({
    mutationFn: (data: { name: string; phone?: string }) => peopleApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      setAddOpen(false);
      setAddName('');
      setAddPhone('');
      toast({ title: 'Person added' });
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const summaries = calculatePersonSummaries(debts);

  const allPeopleDisplay = people
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .map(person => {
      const summary = summaries.find(
        s => s.person_name.toLowerCase() === person.name.toLowerCase()
      );
      return {
        person,
        owed_to_me: summary?.owed_to_me ?? 0,
        i_owe: summary?.i_owe ?? 0,
        net: summary?.net ?? 0,
      };
    });

  const buildWhatsAppUrl = (person: Person, owedToMe: number) => {
    if (!person.phone) return null;
    const digits = person.phone.replace(/\D/g, '');
    if (!digits) return null;
    const template = paymentSettings?.payment_message ||
      'Hi {name}, you currently owe {amount}. Please make payment at your earliest convenience.';
    let msg = template
      .replace(/\{name\}/g, person.name)
      .replace(/\{amount\}/g, formatCurrency(owedToMe));
    if (paymentSettings?.bank_details) msg += `\n\n${paymentSettings.bank_details}`;
    return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
  };

  const openEdit = (person: Person) => {
    setEditPerson(person);
    setEditName(person.name);
    setEditPhone(person.phone || '');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPerson) return;
    updatePerson.mutate({
      id: editPerson.id,
      data: { name: editName, phone: editPhone.trim() || null },
    });
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPerson.mutate({ name: addName.trim(), phone: addPhone.trim() || undefined });
  };

  const isLoading = debtsLoading || peopleLoading;

  if (isLoading) {
    return <Layout><div className="flex items-center justify-center p-8 text-muted-foreground">Loading...</div></Layout>;
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">People</h1>
            <p className="text-muted-foreground">
              {people.length} {people.length === 1 ? 'person' : 'people'}
            </p>
          </div>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <UserPlus className="h-4 w-4 mr-1.5" />
            Add Person
          </Button>
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
          {allPeopleDisplay.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>{searchQuery ? 'No people found' : 'No people yet — add someone to get started'}</p>
            </div>
          ) : (
            allPeopleDisplay.map(({ person, owed_to_me, i_owe, net }) => (
              <div
                key={person.id}
                className="w-full p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <span className="font-medium">{person.name}</span>
                      {person.phone && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          <span>{person.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {(owed_to_me > 0 || i_owe > 0) ? (
                      <div className="text-right">
                        <p className={`font-semibold ${net >= 0 ? 'text-positive' : 'text-negative'}`}>
                          {net >= 0 ? '+' : ''}{formatCurrency(net)}
                        </p>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          {owed_to_me > 0 && (
                            <span className="text-positive">Owes you {formatCurrency(owed_to_me)}</span>
                          )}
                          {i_owe > 0 && (
                            <span className="text-negative">You owe {formatCurrency(i_owe)}</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">No debts</span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => openEdit(person)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {(() => {
                      const waUrl = owed_to_me > 0 ? buildWhatsAppUrl(person, owed_to_me) : null;
                      return waUrl ? (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-[#25D366] transition-colors"
                          title="Send WhatsApp reminder"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                        </a>
                      ) : null;
                    })()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Person dialog */}
      <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) { setAddName(''); setAddPhone(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Person</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-name">Name</Label>
              <Input
                id="add-name"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="Enter name"
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-phone">Phone Number (optional)</Label>
              <Input
                id="add-phone"
                type="tel"
                value={addPhone}
                onChange={(e) => setAddPhone(e.target.value)}
                placeholder="+60123456789"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createPerson.isPending || !addName.trim()}>
                {createPerson.isPending ? 'Adding...' : 'Add Person'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Person dialog */}
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
                Used to send WhatsApp payment reminders
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
