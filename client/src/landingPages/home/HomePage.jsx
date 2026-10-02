// client/src/landingPages/home/HomePage.jsx
import { BadgeIndianRupee, Store, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import FeaturedCategories from './components/FeaturedCategories.jsx';
import HeroSection from './components/HeroSection.jsx';
import VehicleSelector from './components/VehicleSelector.jsx';

const PERKS = [
  { icon: Store, title: 'Local trusted shops', text: 'Buy from verified spare parts dealers in your city.' },
  { icon: BadgeIndianRupee, title: 'Compare prices', text: 'See every shop’s price for the same OEM part.' },
  { icon: Truck, title: 'Track every order', text: 'From accepted to delivered, know where your part is.' },
];

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <VehicleSelector />
      <FeaturedCategories />
      <section className="mx-auto grid max-w-7xl gap-4 px-4 pb-12 sm:grid-cols-3">
        {PERKS.map(({ icon: Icon, title, text }) => (
          <div key={title} className="card p-5">
            <Icon className="h-6 w-6 text-brand-600" />
            <p className="mt-3 font-semibold text-slate-800">{title}</p>
            <p className="mt-1 text-sm text-slate-500">{text}</p>
          </div>
        ))}
      </section>
      <section className="mx-auto mb-12 max-w-7xl px-4">
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl bg-slate-900 p-8 text-white sm:flex-row sm:items-center">
          <div>
            <p className="text-xl font-semibold">Own a spare parts shop?</p>
            <p className="mt-1 text-slate-300">Run billing, inventory and GST reports on MotorDesk — and sell online.</p>
          </div>
          <Link to="/register" className="rounded-lg bg-white px-5 py-2.5 font-medium text-slate-900 hover:bg-slate-100">Register your shop</Link>
        </div>
      </section>
    </>
  );
}