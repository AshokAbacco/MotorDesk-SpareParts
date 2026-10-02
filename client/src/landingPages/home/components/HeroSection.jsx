import SearchBar from '../../shop/components/SearchBar.jsx';

export default function HeroSection() {
  return (
    <section className="bg-gradient-to-br from-brand-700 via-brand-800 to-slate-900 text-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:py-20">
        <h1 className="max-w-2xl text-3xl font-semibold leading-tight sm:text-5xl">Genuine car & bike parts from shops near you.</h1>
        <p className="mt-4 max-w-xl text-brand-100">Search by OEM number, part name or your vehicle. Compare prices across trusted local spare parts dealers.</p>
        <div className="mt-8 max-w-xl"><SearchBar size="lg" /></div>
      </div>
    </section>
  );
}
