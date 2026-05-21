import { useState, useEffect, useRef } from 'react';
import { Layout } from '@/components/Layout';
import { settingsApi } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Upload, X } from 'lucide-react';

const DEFAULT_MESSAGE = 'Hi {name}, you currently owe {amount}. Please make payment at your earliest convenience.';

export default function Payment() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [message, setMessage] = useState('');
  const [bankDetails, setBankDetails] = useState('');
  const [qrBase64, setQrBase64] = useState('');
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
  });

  useEffect(() => {
    if (settingsData && !settingsLoaded) {
      const s = settingsData as any;
      setMessage(s.payment_message || DEFAULT_MESSAGE);
      setBankDetails(s.bank_details || '');
      setQrBase64(s.payment_qr || '');
      setSettingsLoaded(true);
    }
  }, [settingsData, settingsLoaded]);

  const save = useMutation({
    mutationFn: () => settingsApi.update({
      payment_message: message,
      bank_details: bankDetails,
      payment_qr: qrBase64,
    } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast({ title: 'Payment settings saved' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      toast({ title: 'Image too large', description: 'QR image must be under 500 KB.', variant: 'destructive' });
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setQrBase64(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <Layout>
      <div className="space-y-4 max-w-2xl">
        <div>
          <h1 className="text-xl lg:text-2xl font-semibold">Payment</h1>
          <p className="text-muted-foreground text-sm">Customise your payment reminder message and bank details</p>
        </div>

        <div className="bg-card border rounded-xl p-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="payment-message">Reminder Message</Label>
            <Textarea
              id="payment-message"
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={4}
              placeholder={DEFAULT_MESSAGE}
            />
            <p className="text-xs text-muted-foreground">
              Use <code className="bg-muted px-1 rounded">{'{name}'}</code> for the person's name and{' '}
              <code className="bg-muted px-1 rounded">{'{amount}'}</code> for the amount they owe.
              Bank details are appended automatically.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bank-details">Bank Details</Label>
            <Textarea
              id="bank-details"
              value={bankDetails}
              onChange={e => setBankDetails(e.target.value)}
              rows={3}
              placeholder="Bank: Maybank&#10;Account: 1234567890&#10;Name: Ahmad"
            />
          </div>

          <div className="space-y-1.5">
            <Label>QR Code (optional)</Label>
            {qrBase64 ? (
              <div className="relative inline-block">
                <img
                  src={qrBase64}
                  alt="Payment QR"
                  className="h-40 w-40 object-contain border rounded-lg bg-white"
                />
                <button
                  type="button"
                  onClick={() => { setQrBase64(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 h-32 w-full border-2 border-dashed rounded-lg text-muted-foreground hover:text-foreground hover:border-foreground transition-colors text-sm"
              >
                <Upload className="h-5 w-5" />
                <span>Click to upload QR image</span>
                <span className="text-xs">PNG, JPG — max 500 KB</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
