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

function blobToWebP(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 300;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas unavailable')); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const out = canvas.toDataURL('image/webp', 0.85);
      resolve(out.startsWith('data:image/webp') ? out : canvas.toDataURL('image/png'));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not decode image')); };
    img.src = url;
  });
}

// Read the first 12 bytes to detect HEIC/HEIF regardless of extension or MIME type
async function detectHeic(file: File): Promise<boolean> {
  if (
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    /\.hei[cf]$/i.test(file.name)
  ) return true;
  try {
    const buf = await file.slice(0, 12).arrayBuffer();
    const b = new Uint8Array(buf);
    // ISOBMFF container: bytes 4-7 must be 'ftyp'
    if (String.fromCharCode(b[4], b[5], b[6], b[7]) !== 'ftyp') return false;
    const brand = String.fromCharCode(b[8], b[9], b[10], b[11]);
    return ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1'].includes(brand);
  } catch {
    return false;
  }
}

async function toWebP(file: File): Promise<string> {
  const isHeic = await detectHeic(file);

  if (isHeic) {
    // 1st try: heic2any (Chrome/Firefox — no native HEIC support)
    try {
      const mod = await import('heic2any');
      const convert = (mod.default ?? mod) as (o: object) => Promise<Blob | Blob[]>;
      const result = await convert({ blob: file, toType: 'image/jpeg', quality: 0.9 });
      return blobToWebP(Array.isArray(result) ? result[0] : result);
    } catch {
      // 2nd try: let the browser decode natively (Safari / iOS support HEIC natively)
      try {
        return await blobToWebP(file);
      } catch {
        throw new Error(
          'Could not convert this HEIC file. Please open it in Photos or Preview, export as JPG, then re-upload.'
        );
      }
    }
  }

  return blobToWebP(file);
}

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: 'Image too large', description: 'Please use an image under 20 MB.', variant: 'destructive' });
      e.target.value = '';
      return;
    }
    try {
      const webp = await toWebP(file);
      setQrBase64(webp);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to process image';
      toast({ title: 'Upload failed', description: msg, variant: 'destructive' });
      e.target.value = '';
    }
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
              placeholder={'Bank: Maybank\nAccount: 1234567890\nName: Ahmad'}
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
                  onError={(e) => (e.currentTarget.style.display = 'none')}
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
                <span className="text-xs">PNG, JPG, HEIC — converted to WebP automatically</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.heic,.heif"
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
