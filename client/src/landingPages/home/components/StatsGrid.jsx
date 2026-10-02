// client/src/dashboardPages/home/components/StatsGrid.jsx
import { AlertTriangle, Boxes, ClipboardList, IndianRupee, Package } from 'lucide-react';
import useAuth from '../../../shared/hooks/useAuth.js';
import { formatCurrency, formatNumber } from '../../../shared/utils/formatCurrency.js';
import StatCard from '../../components/StatCard.jsx';

const SKU_SUB = { CAR: 'Car parts in inventory', BIKE: 'Bike parts in inventory', BOTH: 'Car + bike parts in inventory' };

export default function StatsGrid({ s }) {
  const { vendor } = useAuth();
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <StatCard icon={Package} label="Total SKUs" value={formatNumber(s.totalSkus)} sub={SKU_SUB[vendor?.inventoryType] ?? SKU_SUB.BOTH} />
      <StatCard icon={Boxes} label="Units in stock" value={formatNumber(s.totalStock)} sub={`Stock value ${formatCurrency(s.stockValue)} at cost`} tone="violet" />
      <StatCard icon={IndianRupee} label="Today's sales" value={formatCurrency(s.todaySales)} sub={`${s.todayBills} bills`} tone="green" />
      <StatCard icon={IndianRupee} label="This month" value={formatCurrency(s.monthSales)} sub={`${s.monthBills} bills`} tone="green" />
      <StatCard icon={ClipboardList} label="Pending online orders" value={s.pendingOrders} tone={s.pendingOrders ? 'amber' : 'slate'} />
      <StatCard icon={AlertTriangle} label="Low stock" value={formatNumber(s.lowStockCount)} sub={`${s.outOfStockCount} out of stock`} tone={s.lowStockCount || s.outOfStockCount ? 'amber' : 'slate'} />
    </div>
  );
}