// client/src/landingPages/account/components/ProfileDetailsCard.jsx
import { CalendarDays, Mail, Pencil, Phone, Save, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Button from '../../../shared/ui/Button.jsx';
import Input from '../../../shared/ui/Input.jsx';
import { formatDate } from '../../../shared/utils/formatDate.js';
import { useAuthStore } from '../../store/authStore.js';
import { updateMyProfile } from '../account.api.js';

export default function ProfileDetailsCard({ profile, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const refreshMe = useAuthStore((s) => s.refreshMe);

  useEffect(() => { setForm({ name: profile.name, phone: profile.phone ?? '' }); }, [profile]);

  const save = async (e) => {
    e.preventDefault();
    setErrors({});
    setSaving(true);
    try {
      const res = await updateMyProfile(form);
      onUpdated(res.data);
      refreshMe(); // keeps the name in the header in sync
      setEditing(false);
      toast.success('Profile updated');
    } catch (err) {
      if (err.errors) setErrors(Object.fromEntries(err.errors.map((x) => [x.field.split('.').pop(), x.message])));
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card p-5">
      <div className="flex items-start gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xl font-semibold text-white">
          {profile.name?.charAt(0)?.toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold text-slate-900">{profile.name}</p>
          <p className="flex items-center gap-1.5 truncate text-sm text-slate-500"><Mail className="h-3.5 w-3.5" /> {profile.email}</p>
          <p className="flex items-center gap-1.5 text-sm text-slate-500"><Phone className="h-3.5 w-3.5" /> {profile.phone || 'No mobile number added'}</p>
          <p className="flex items-center gap-1.5 text-sm text-slate-500"><CalendarDays className="h-3.5 w-3.5" /> Member since {formatDate(profile.createdAt)}</p>
        </div>
        {!editing && <button onClick={() => setEditing(true)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600" aria-label="Edit profile"><Pencil className="h-4 w-4" /></button>}
      </div>

      {editing && (
        <form onSubmit={save} className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          <Input label="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} required />
          <Input label="Mobile number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} error={errors.phone} maxLength={10} inputMode="numeric" />
          <Input label="Email" value={profile.email} disabled hint="Email is your login and can’t be changed" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" icon={X} onClick={() => { setEditing(false); setForm({ name: profile.name, phone: profile.phone ?? '' }); }}>Cancel</Button>
            <Button type="submit" icon={Save} loading={saving}>Save</Button>
          </div>
        </form>
      )}
    </section>
  );
}