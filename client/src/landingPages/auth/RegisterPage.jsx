import RegisterForm from './components/RegisterForm.jsx';

export default function RegisterPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold text-slate-900">Create your account</h1>
      <p className="mb-6 mt-1 text-sm text-slate-500">Buy genuine parts, or run your whole shop on MotorDesk.</p>
      <RegisterForm />
    </>
  );
}
