// client/src/landingPages/checkout/components/AddressSelector.jsx
import { MapPinned, Plus } from 'lucide-react';
import { useState } from 'react';
import Button from '../../../shared/ui/Button.jsx';
import EmptyState from '../../../shared/ui/EmptyState.jsx';
import AddressCard from '../../account/components/AddressCard.jsx';
import AddressFormModal from '../../account/components/AddressFormModal.jsx';

/**
 * Pick one of the saved addresses, or add / edit one without leaving checkout.
 * New addresses are saved to the customer's address book automatically.
 */
export default function AddressSelector({ addresses, selectedId, onSelect, onAddressesChange, defaults }) {
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new

  const onSaved = (saved, all) => {
    onAddressesChange(all);
    onSelect(saved.id);
  };

  return (
    <>
      {addresses.length === 0 ? (
        <EmptyState icon={MapPinned} title="Add a delivery address" description="It will be saved to your account for next time."
          action={<Button icon={Plus} onClick={() => setEditing(null)}>Add address</Button>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {addresses.map((a) => (
            <AddressCard key={a.id} address={a} selectable selected={a.id === selectedId} onSelect={() => onSelect(a.id)} onEdit={setEditing} />
          ))}
          {addresses.length < 10 && (
            <button type="button" onClick={() => setEditing(null)}
              className="flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 text-sm text-slate-500 hover:border-brand-400 hover:text-brand-600">
              <Plus className="h-5 w-5" /> Add new address
            </button>
          )}
        </div>
      )}
      <AddressFormModal open={editing !== undefined} address={editing} defaults={defaults} onClose={() => setEditing(undefined)} onSaved={onSaved} />
    </>
  );
}