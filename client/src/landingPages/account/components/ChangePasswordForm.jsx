 // client/src/landingPages/account/components/ChangePasswordForm.jsx
import { KeyRound } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import Button from '../../../shared/ui/Button.jsx';
import Input from '../../../shared/ui/Input.jsx';
import { changeMyPassword } from '../account.api.js';

const EMPTY = { currentPassword: '', newPassword: '', confirm: '' };

export default function ChangePasswordForm() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirm) { setErrors({ confirm: 'Passwords do not match' }); return; }
    setErrors({});
    setSaving(true);
    try {
      await changeMyPassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      toast.success('Password changed');
      setForm(EMPTY);
      setOpen(false);
    } catch (err) {
      if (err.errors) setErrors(Object.fromEntries(err.errors.map((x) => [x.field.split('.').pop(), x.message])));
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 font-semibold text-slate-800"><KeyRound className="h-4 w-4 text-slate-400" /> Password</p>
        {!open && <button onClick={() => setOpen(true)} className="text-sm font-medium text-brand-600 hover:underline">Change</button>}
      </div>
      {open && (
        <form onSubmit={submit} className="mt-4 space-y-3">
          <Input label="Current password" type="password" name="currentPassword" value={form.currentPassword} onChange={set} error={errors.currentPassword} autoComplete="current-password" required />
          <Input label="New password" type="password" name="newPassword" value={form.newPassword} onChange={set} error={errors.newPassword} hint="At least 8 characters" autoComplete="new-password" required />
          <Input label="Confirm new password" type="password" name="confirm" value={form.confirm} onChange={set} error={errors.confirm} autoComplete="new-password" required />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => { setOpen(false); setForm(EMPTY); setErrors({}); }}>Cancel</Button>
            <Button type="submit" loading={saving}>Update password</Button>
          </div>
        </form>
      )}
    </section>
  );
}