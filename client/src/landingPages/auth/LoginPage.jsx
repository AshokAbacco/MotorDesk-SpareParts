import LoginForm from './components/LoginForm.jsx';

export default function LoginPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold text-slate-900">Log in</h1>
      <p className="mb-6 mt-1 text-sm text-slate-500">Shop owners, buyers and admins all sign in here.</p>
      <LoginForm />
    </>
  );
}
