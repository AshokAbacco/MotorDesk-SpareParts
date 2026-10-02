// client/src/dashboardPages/paymentSettings/components/UpiQrCard.jsx
import { Copy, Download, QrCode } from 'lucide-react';
import { useRef } from 'react';
import toast from 'react-hot-toast';
import EmptyState from '../../../shared/ui/EmptyState.jsx';
import Button from '../../../shared/ui/Button.jsx';
import UpiQrCode from '../../../shared/ui/UpiQrCode.jsx';
import { buildUpiLink } from '../../../shared/utils/upi.js';

/** QR is generated from the saved UPI ID — print it for the counter too */
export default function UpiQrCard({ settings }) {
  const canvasRef = useRef(null);
  if (!settings?.upiId) {
    return <div className="card"><EmptyState icon={QrCode} title="No QR code yet" description="Save your UPI ID and your QR code will appear here." /></div>;
  }
  const link = buildUpiLink({ vpa: settings.upiId, name: settings.upiName || settings.shopName });

  const download = () => {
    const a = Object.assign(document.createElement('a'), { href: canvasRef.current.toDataURL('image/png'), download: `${settings.upiId}-upi-qr.png` });
    a.click();
  };
  const copy = () => navigator.clipboard.writeText(settings.upiId).then(() => toast.success('UPI ID copied'));

  return (
    <div className="card flex flex-col items-center p-5 text-center">
      <p className="font-semibold text-slate-800">{settings.upiName || settings.shopName}</p>
      <button onClick={copy} className="mb-4 mt-1 flex items-center gap-1 font-mono text-sm text-brand-700 hover:underline">{settings.upiId} <Copy className="h-3.5 w-3.5" /></button>
      <UpiQrCode ref={canvasRef} value={link} size={220} />
      {settings.upiNumber && <p className="mt-3 text-sm text-slate-500">UPI number: {settings.upiNumber}</p>}
      <p className="mt-2 text-xs text-slate-400">Scan with any UPI app to test. At checkout, customers get this QR with the order amount already filled in.</p>
      <Button variant="secondary" icon={Download} className="mt-4" onClick={download}>Download QR</Button>
    </div>
  );
}