// client/src/landingPages/account/components/AddressFormModal.jsx
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Button from '../../../shared/ui/Button.jsx';
import Modal from '../../../shared/ui/Modal.jsx';
import AddressForm, { EMPTY_ADDRESS } from '../../checkout/components/AddressForm.jsx';
import { addAddress, updateAddress } from '../account.api.js';

/** Add or edit an address in the customer's address book. onSaved(savedAddress, allAddresses) */
export default function AddressFormModal({ open, address, defaults, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_ADDRESS);
  const [makeDefault, setMakeDefault] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(address ? { ...EMPTY_ADDRESS, ...address, landmark: address.landmark ?? '' } : { ...EMPTY_ADDRESS, ...defaults });
    setMakeDefault(Boolean(address?.isDefault));
  }, [open, address, defaults]);

  const submit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSaving(true);
    const { id: _id, isDefault: _d, ...fields } = form;
    const body = { ...fields, label: fields.label?.trim() || 'Home', isDefault: makeDefault };
    try {
      const res = address ? await updateAddress(address.id, body) : await addAddress(body);
      toast.success(address ? 'Address updated' : 'Address saved');
      onSaved(res.data.address, res.data.addresses);
      onClose();
    } catch (err) {
      if (err.errors) setErrors(Object.fromEntries(err.errors.map((x) => [x.field.split('.').pop(), x.message])));
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={address ? 'Edit address' : 'Add a new address'} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="address-form" loading={saving}>Save address</Button></>}>
      <form id="address-form" onSubmit={submit} className="space-y-4">
        <AddressForm value={form} onChange={setForm} errors={errors} />
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={makeDefault} onChange={(e) => setMakeDefault(e.target.checked)} disabled={address?.isDefault} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
          Make this my default address
        </label>
      </form>
    </Modal>
  );
}