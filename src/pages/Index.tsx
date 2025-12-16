import { useState } from 'react';
import { Layout } from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Login from '@/pages/Login';
import { useToast } from '@/hooks/use-toast';

export default function Index() {
  const { toast } = useToast();
  const [isLoggedIn, setIsLoggedIn] = useState(true); // For demo, start logged in
  const [userName, setUserName] = useState('Demo User');
  const [isAdmin, setIsAdmin] = useState(false);

  const handleLogin = async (email: string, password: string) => {
    // Demo login - in production this will use Supabase
    if (email && password) {
      setIsLoggedIn(true);
      setUserName(email.split('@')[0]);
      setIsAdmin(email.includes('admin'));
      toast({ title: 'Welcome back!', description: `Signed in as ${email}` });
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserName('');
    setIsAdmin(false);
    toast({ title: 'Signed out', description: 'See you next time!' });
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Layout isAdmin={isAdmin} userName={userName} onLogout={handleLogout}>
      <Dashboard />
    </Layout>
  );
}
