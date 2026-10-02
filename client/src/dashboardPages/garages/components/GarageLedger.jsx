import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Button from '../../../shared/ui/Button.jsx';
import Input from '../../../shared/ui/Input.jsx';
import Modal from '../../../shared/ui/Modal.jsx';
import Spinner from '../../../shared/ui/Spinner.jsx';
import { formatCurrency } from '../../../shared/utils/formatCurrency.js';
import { formatDateTime } from '../../../shared/utils/formatDate.js';
import { getGarageLedger, recordGaragePayment } from '../garages.api.js';

export default function GarageLedger({ garage, onClose, onChanged }) {
  const [ledger, setLedger] = useState(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => getGarageLedger(garage.id).then((r) => setLedger(r.data)).catch((e) => toast.error(e.message));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (garage) { setLedger(null); load(); } }, [garage]);
  if (!garage) return null;

  const onPay = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await recordGaragePayment(garage.id, { amount: Number(amount), note: note || undefined });
      toast.success('Payment recorded');
      setAmount(''); setNote('');
      load(); onChanged();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  };

  return (
    <Modal open onClose={onClose} title={`Khata — ${garage.name}`} size="lg">
      {!ledger ? <Spinner /> : (
        <>
          <div className="mb-4 flex items-center justify-between rounded-lg bg-slate-50 p-4">
            <span className="text-sm text-slate-600">Balance due</span>
            <span className={`text-xl font-semibold ${Number(ledger.garage.balance) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatCurrency(ledger.garage.balance)}</span>
          </div>
          {Number(ledger.garage.balance) > 0 && (
            <form onSubmit={onPay} className="mb-5 grid gap-2 sm:grid-cols-[140px_1fr_auto]">
              <Input type="number" min="1" step="0.01" max={Number(ledger.garage.balance)} placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} required aria-label="Amount" />
              <Input placeholder="Note (UPI ref, cash…)" value={note} onChange={(e) => setNote(e.target.value)} aria-label="Note" />
              <Button type="submit" variant="success" loading={saving}>Receive</Button>
            </form>
          )}
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase text-slate-500"><th className="py-2">Date</th><th>Details</th><th className="text-right">Debit</th><th className="text-right">Credit</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {ledger.entries.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-slate-500">No transactions yet</td></tr>}
              {ledger.entries.map((e) => (
                <tr key={e.id}>
                  <td className="py-2 text-slate-500">{formatDateTime(e.createdAt)}</td>
                  <td>{e.note}</td>
                  <td className="text-right text-red-600">{e.type === 'DEBIT' ? formatCurrency(e.amount) : ''}</td>
                  <td className="text-right text-emerald-600">{e.type === 'CREDIT' ? formatCurrency(e.amount) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </Modal>
  );
}
