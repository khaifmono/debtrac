import { useState } from 'react';
import { Person, DebtDirection } from '@/types';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Check, ChevronsUpDown, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddDebtDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDirection?: DebtDirection;
  people?: Person[];
  onSubmit: (data: {
    person_id?: string;
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
  people = [],
  onSubmit
}: AddDebtDialogProps) {
  const [comboOpen, setComboOpen] = useState(false);
  const [personSearch, setPersonSearch] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState<string | undefined>();
  const [personName, setPersonName] = useState('');
  const [direction, setDirection] = useState<DebtDirection>(defaultDirection);
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  const filteredPeople = people.filter(p =>
    p.name.toLowerCase().includes(personSearch.toLowerCase())
  );

  const isExactMatch = people.some(
    p => p.name.toLowerCase() === personSearch.trim().toLowerCase()
  );

  const handleSelectPerson = (person: Person) => {
    setSelectedPersonId(person.id);
    setPersonName(person.name);
    setPersonSearch('');
    setComboOpen(false);
  };

  const handleCreateNew = (name: string) => {
    setSelectedPersonId(undefined);
    setPersonName(name.trim());
    setPersonSearch('');
    setComboOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName.trim()) return;

    onSubmit({
      person_id: selectedPersonId,
      person_name: personName.trim(),
      direction,
      amount: parseFloat(amount),
      due_date: dueDate || null,
      notes: notes.trim() || null,
    });

    setSelectedPersonId(undefined);
    setPersonName('');
    setPersonSearch('');
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
            <Label>Person</Label>
            <Popover open={comboOpen} onOpenChange={setComboOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className={cn('w-full justify-between font-normal', !personName && 'text-muted-foreground')}
                >
                  {personName || 'Select or type a name...'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search or type new name..."
                    value={personSearch}
                    onValueChange={setPersonSearch}
                  />
                  <CommandList>
                    {filteredPeople.length > 0 && (
                      <CommandGroup heading="Existing people">
                        {filteredPeople.map(p => (
                          <CommandItem
                            key={p.id}
                            value={p.name}
                            onSelect={() => handleSelectPerson(p)}
                          >
                            <Check className={cn('mr-2 h-4 w-4', selectedPersonId === p.id ? 'opacity-100' : 'opacity-0')} />
                            {p.name}
                            {p.phone && (
                              <span className="ml-auto text-xs text-muted-foreground">{p.phone}</span>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                    {personSearch.trim() && !isExactMatch && (
                      <CommandGroup>
                        <CommandItem
                          value={`__new__${personSearch}`}
                          onSelect={() => handleCreateNew(personSearch)}
                        >
                          <UserPlus className="mr-2 h-4 w-4" />
                          Create "{personSearch.trim()}"
                        </CommandItem>
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
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
            <Button type="submit" disabled={!personName.trim()}>Add Debt</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
