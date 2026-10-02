// client/src/landingPages/account/AccountPage.jsx
import { IndianRupee, Package, PackageCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import useAuth from '../../shared/hooks/useAuth.js';
import EmptyState from '../../shared/ui/EmptyState.jsx';
import Spinner from '../../shared/ui/Spinner.jsx';
import { formatCurrency } from '../../shared/utils/formatCurrency.js';
import { getMyProfile } from './account.api.js';
import AddressBook from './components/AddressBook.jsx';
import ChangePasswordForm from './components/ChangePasswordForm.jsx';
import ProfileDetailsCard from './components/ProfileDetailsCard.jsx';

export default function AccountPage() {
  const { isLoggedIn, isCustomer } = useAuth();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isCustomer) getMyProfile().then((r) => setProfile(r.data)).catch((e) => setError(e.message));
  }, [isCustomer]);

  if (!isLoggedIn) return <Navigate to="/login?next=/account" replace />;
  if (!isCustomer) return <EmptyState title="This page is for customer accounts" description="Shop owners manage their details from the dashboard." />;
  if (error) return <EmptyState title="Could not load your account" description={error} />;
  if (!profile) return <div className="py-24"><Spinner /></div>;

  const stats = [
    { icon: Package, label: 'Orders', value: profile.stats?.orders ?? 0 },
    { icon: PackageCheck, label: 'Delivered', value: profile.stats?.delivered ?? 0 },
    { icon: IndianRupee, label: 'Total spent', value: formatCurrency(profile.stats?.totalSpent ?? 0) },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="page-title">My account</h1>
          <p className="text-sm text-slate-500">Your details, saved addresses and password.</p>
        </div>
        <Link to="/my-orders" className="text-sm font-medium text-brand-600 hover:underline">View my orders →</Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-4">
          <ProfileDetailsCard profile={profile} onUpdated={(p) => setProfile(p)} />
          <div className="grid grid-cols-3 gap-2">
            {stats.map(({ icon: Icon, label, value }) => (
              <div key={label} className="card p-3 text-center">
                <Icon className="mx-auto h-4 w-4 text-brand-600" />
                <p className="mt-1 truncate text-sm font-semibold text-slate-900">{value}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            ))}
          </div>
          <ChangePasswordForm />
        </div>

        <AddressBook
          addresses={profile.addresses ?? []}
          defaults={{ name: profile.name, phone: profile.phone ?? '' }}
          onChange={(addresses) => setProfile({ ...profile, addresses })}
        />
      </div>
    </div>
  );
}