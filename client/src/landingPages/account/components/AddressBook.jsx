// client/src/landingPages/account/components/AddressBook.jsx
import { MapPinned, Plus } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import EmptyState from '../../../shared/ui/EmptyState.jsx';
import Button from '../../../shared/ui/Button.jsx';
import { deleteAddress, setDefaultAddress } from '../account.api.js';
import AddressCard from './AddressCard.jsx';
import AddressFormModal from './AddressFormModal.jsx';

const MAX = 10;

export default function AddressBook({ addresses, onChange, defaults }) {
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new, object = edit

  const remove = async (a) => {
    if (!window.confirm(`Delete the ${a.label} address?`)) return;
    try { onChange((await deleteAddress(a.id)).data); toast.success('Address deleted'); } catch (e) { toast.error(e.message); }
  };
  const makeDefault = async (a) => {
    try { onChange((await setDefaultAddress(a.id)).data); toast.success(`${a.label} is now your default address`); } catch (e) { toast.error(e.message); }
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Saved addresses</h2>
          <p className="text-sm text-slate-500">{addresses.length} of {MAX} · your default address is selected first at checkout</p>
        </div>
        <Button icon={Plus} onClick={() => setEditing(null)} disabled={addresses.length >= MAX}>Add address</Button>
      </div>

      {addresses.length === 0 ? (
        <div className="card">
          <EmptyState icon={MapPinned} title="No saved addresses yet" description="Add your home, work or any other address to check out faster."
            action={<Button icon={Plus} onClick={() => setEditing(null)}>Add your first address</Button>} />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {addresses.map((a) => <AddressCard key={a.id} address={a} onEdit={setEditing} onDelete={remove} onMakeDefault={makeDefault} />)}
          {addresses.length < MAX && (
            <button onClick={() => setEditing(null)} className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 hover:border-brand-400 hover:text-brand-600">
              <Plus className="h-6 w-6" /> Add a new address
            </button>
          )}
        </div>
      )}

      <AddressFormModal open={editing !== undefined} address={editing} defaults={defaults} onClose={() => setEditing(undefined)} onSaved={(_, all) => onChange(all)} />
    </section>
  );
}