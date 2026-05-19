import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { usersApi, settingsApi } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Plus, MoreHorizontal, Shield, ShieldOff, Trash2, Mail, Eye, EyeOff } from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Add user dialog
  const [addOpen, setAddOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user');

  // Email settings
  const [brevoKey, setBrevoKey] = useState('');
  const [brevoFromEmail, setBrevoFromEmail] = useState('');
  const [brevoFromName, setBrevoFromName] = useState('Debtrac');
  const [showKey, setShowKey] = useState(false);
  const [emailSettingsLoaded, setEmailSettingsLoaded] = useState(false);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.getAll,
  });

  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
  });

  useEffect(() => {
    if (settingsData && !emailSettingsLoaded) {
      setBrevoKey((settingsData as any).brevo_api_key || '');
      setBrevoFromEmail((settingsData as any).brevo_from_email || '');
      setBrevoFromName((settingsData as any).brevo_from_name || 'Debtrac');
      setEmailSettingsLoaded(true);
    }
  }, [settingsData, emailSettingsLoaded]);

  const createUser = useMutation({
    mutationFn: (data: { email: string; name: string; role: string }) => usersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setAddOpen(false);
      setNewEmail(''); setNewName(''); setNewRole('user');
      toast({ title: 'User invited', description: 'An invite email has been sent if Brevo is configured.' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const updateRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => usersApi.updateRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: 'Role updated' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const deleteUser = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: 'User removed' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const saveEmail = useMutation({
    mutationFn: () => settingsApi.update({
      brevo_api_key: brevoKey,
      brevo_from_email: brevoFromEmail,
      brevo_from_name: brevoFromName,
    } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast({ title: 'Email settings saved' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const testEmail = useMutation({
    mutationFn: () => usersApi.sendTestEmail({ brevoKey, fromEmail: brevoFromEmail, fromName: brevoFromName, toEmail: user!.email }),
    onSuccess: () => toast({ title: 'Test email sent', description: `Sent to ${user?.email}` }),
    onError: (err: Error) => toast({ title: 'Test failed', description: err.message, variant: 'destructive' }),
  });

  return (
    <Layout>
      <div className="space-y-4 max-w-2xl">
        <div>
          <h1 className="text-xl lg:text-2xl font-semibold">Settings</h1>
          <p className="text-muted-foreground text-sm">Manage users and email configuration</p>
        </div>

        <Tabs defaultValue="users">
          <TabsList className="w-full lg:w-auto">
            <TabsTrigger value="users" className="flex-1 lg:flex-none">Users</TabsTrigger>
            <TabsTrigger value="email" className="flex-1 lg:flex-none">Email</TabsTrigger>
          </TabsList>

          {/* ── USERS TAB ── */}
          <TabsContent value="users" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{users.length} member{users.length !== 1 ? 's' : ''}</p>
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                Invite User
              </Button>
            </div>

            <div className="space-y-2">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
              ) : (
                users.map((u: any) => (
                  <div key={u.id} className="bg-card border rounded-xl p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-muted-foreground">
                        {u.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{u.name}</span>
                        <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className="text-xs shrink-0">
                          {u.role}
                        </Badge>
                        {u.id === user?.id && (
                          <Badge variant="outline" className="text-xs shrink-0">you</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>

                    {u.id !== user?.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {u.role === 'user' ? (
                            <DropdownMenuItem onClick={() => updateRole.mutate({ id: u.id, role: 'admin' })}>
                              <Shield className="h-4 w-4 mr-2" />
                              Promote to Admin
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => updateRole.mutate({ id: u.id, role: 'user' })}>
                              <ShieldOff className="h-4 w-4 mr-2" />
                              Demote to User
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => deleteUser.mutate(u.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* ── EMAIL TAB ── */}
          <TabsContent value="email" className="space-y-4 mt-4">
            <div className="bg-card border rounded-xl p-4 space-y-4">
              <div>
                <h3 className="font-medium text-sm">Brevo (Sendinblue) Configuration</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Used to send invite emails when you add users.</p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="brevo-key" className="text-sm">API Key</Label>
                  <div className="relative">
                    <Input
                      id="brevo-key"
                      type={showKey ? 'text' : 'password'}
                      value={brevoKey}
                      onChange={e => setBrevoKey(e.target.value)}
                      placeholder="xkeysib-..."
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="brevo-from-email" className="text-sm">From Email</Label>
                  <Input
                    id="brevo-from-email"
                    type="email"
                    value={brevoFromEmail}
                    onChange={e => setBrevoFromEmail(e.target.value)}
                    placeholder="noreply@debt.khaif.dev"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="brevo-from-name" className="text-sm">From Name</Label>
                  <Input
                    id="brevo-from-name"
                    value={brevoFromName}
                    onChange={e => setBrevoFromName(e.target.value)}
                    placeholder="Debtrac"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={() => saveEmail.mutate()}
                  disabled={saveEmail.isPending}
                >
                  {saveEmail.isPending ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => testEmail.mutate()}
                  disabled={testEmail.isPending || !brevoKey || !brevoFromEmail}
                >
                  <Mail className="h-4 w-4 mr-1.5" />
                  {testEmail.isPending ? 'Sending...' : 'Send Test'}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Add User Dialog */}
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Invite User</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={e => { e.preventDefault(); createUser.mutate({ email: newEmail, name: newName, role: newRole }); }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="new-name">Name</Label>
                <Input id="new-name" value={newName} onChange={e => setNewName(e.target.value)} required autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-email">Email</Label>
                <Input id="new-email" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Role</Label>
                <div className="flex gap-2">
                  {(['user', 'admin'] as const).map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setNewRole(r)}
                      className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                        newRole === r
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-border hover:bg-muted'
                      }`}
                    >
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                An invite email will be sent if Brevo is configured. Default password is "changeme".
              </p>
              <Button type="submit" className="w-full" disabled={createUser.isPending}>
                {createUser.isPending ? 'Inviting...' : 'Send Invite'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
