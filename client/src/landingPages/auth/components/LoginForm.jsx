import { Lock, Mail } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../../../shared/ui/Button.jsx';
import Input from '../../../shared/ui/Input.jsx';
import { homeForRole, useAuthStore } from '../../store/authStore.js';
import { login } from '../login.api.js';

export default function LoginForm() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await login(form);
      setSession(res.data);
      toast.success(`Welcome back, ${res.data.user.name.split(' ')[0]}`);
      navigate(params.get('next') || homeForRole(res.data.user.role), { replace: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input label="Email" name="email" type="email" icon={Mail} value={form.email} onChange={onChange} placeholder="you@shop.in" required autoComplete="email" />
      <Input label="Password" name="password" type="password" icon={Lock} value={form.password} onChange={onChange} placeholder="••••••••" required autoComplete="current-password" />
      <Button type="submit" loading={loading} className="w-full">Log in</Button>
      <p className="text-center text-sm text-slate-600">
        New to MotorDesk? <Link to="/register" className="font-medium text-brand-600 hover:underline">Create an account</Link>
      </p>
    </form>
  );
}
