import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import useFetch from '../../../shared/hooks/useFetch.js';
import Button from '../../../shared/ui/Button.jsx';
import Input from '../../../shared/ui/Input.jsx';
import Select from '../../../shared/ui/Select.jsx';
import { EXPENSE_CATEGORIES } from '../../../shared/utils/constants.js';
import { formatCurrency } from '../../../shared/utils/formatCurrency.js';
import { formatDate, toInputDate } from '../../../shared/utils/formatDate.js';
import { addExpense, deleteExpense, getExpenses } from '../profile.api.js';

export default function ExpenseForm({ range }) {
  const [form, setForm] = useState({ title: '', category: 'OTHER', amount: '', date: toInputDate() });
  const [saving, setSaving] = useState(false);
  const { data, reload } = useFetch(() => getExpenses(range), [range.from, range.to]);

  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const onAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addExpense({ ...form, amount: Number(form.amount) });
      toast.success('Expense added');
      setForm({ ...form, title: '', amount: '' });
      reload();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  };
  const onDelete = async (id) => {
    try { await deleteExpense(id); reload(); } catch (err) { toast.error(err.message); }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={onAdd} className="card grid gap-3 p-4 sm:grid-cols-[1fr_160px_130px_150px_auto] sm:items-end">
        <Input label="Expense" name="title" value={form.title} onChange={set} placeholder="e.g. Shop rent" required />
        <Select label="Category" name="category" value={form.category} onChange={set} options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c.charAt(0) + c.slice(1).toLowerCase() }))} />
        <Input label="Amount" name="amount" type="number" min="1" step="0.01" value={form.amount} onChange={set} required />
        <Input label="Date" name="date" type="date" value={form.date} onChange={set} required />
        <Button type="submit" loading={saving}>Add</Button>
      </form>
      <div className="card divide-y divide-slate-100">
        {(data ?? []).length === 0 && <p className="p-6 text-center text-sm text-slate-500">No expenses in this period</p>}
        {(data ?? []).map((e) => (
          <div key={e.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
            <div className="flex-1"><p className="font-medium text-slate-700">{e.title}</p><p className="text-xs text-slate-500">{e.category} · {formatDate(e.date)}</p></div>
            <span className="font-semibold">{formatCurrency(e.amount)}</span>
            <button onClick={() => onDelete(e.id)} className="p-1 text-slate-400 hover:text-red-600" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
