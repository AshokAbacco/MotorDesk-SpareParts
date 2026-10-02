import { Clock, CreditCard, IndianRupee, Package, ShoppingBag, Store, Users } from 'lucide-react';
import { formatCurrency, formatNumber } from '../../../shared/utils/formatCurrency.js';
import StatCard from '../../components/StatCard.jsx';

export default function AnalyticsCards({ a }) {
  const orders = Object.values(a.orders).reduce((n, x) => n + x, 0);
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard icon={Store} label="Active shops" value={formatNumber(a.vendors.APPROVED ?? 0)} sub={`${a.newVendorsLast30Days} joined in 30 days`} />
      <StatCard icon={Clock} label="Awaiting approval" value={formatNumber(a.vendors.PENDING ?? 0)} tone={a.vendors.PENDING ? 'amber' : 'slate'} />
      <StatCard icon={Users} label="Customers" value={formatNumber(a.customers)} tone="violet" />
      <StatCard icon={Package} label="Catalog products" value={formatNumber(a.products)} sub={`${a.vehicles} vehicle variants`} tone="slate" />
      <StatCard icon={ShoppingBag} label="Marketplace orders" value={formatNumber(orders)} sub={`${a.orders.DELIVERED ?? 0} delivered`} />
      <StatCard icon={IndianRupee} label="Marketplace GMV" value={formatCurrency(a.marketplaceGmv)} tone="green" />
      <StatCard icon={IndianRupee} label="POS billing (all shops)" value={formatCurrency(a.posSales)} sub={`${a.posBills} bills`} tone="green" />
      <StatCard icon={CreditCard} label="MRR" value={formatCurrency(a.mrr)} sub={`${a.activeSubscriptions} active subscriptions`} tone="violet" />
    </div>
  );
}
