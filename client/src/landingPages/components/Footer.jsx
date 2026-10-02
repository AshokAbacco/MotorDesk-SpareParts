import { Cog } from 'lucide-react';
import { FaFacebook, FaInstagram, FaWhatsapp } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { APP_NAME } from '../../shared/utils/constants.js';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <p className="flex items-center gap-2 font-semibold text-brand-700"><Cog className="h-5 w-5" /> {APP_NAME}</p>
          <p className="mt-2 text-sm text-slate-500">Genuine car & bike spare parts from trusted local shops.</p>
        </div>
        <div className="text-sm">
          <p className="mb-2 font-semibold text-slate-700">Explore</p>
          <ul className="space-y-1 text-slate-500">
            <li><Link to="/shop?vehicleType=CAR" className="hover:text-brand-600">Car parts</Link></li>
            <li><Link to="/shop?vehicleType=BIKE" className="hover:text-brand-600">Bike parts</Link></li>
            <li><Link to="/register" className="hover:text-brand-600">Sell on {APP_NAME}</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="mb-2 font-semibold text-slate-700">Connect</p>
          <div className="flex gap-3 text-xl text-slate-400">
            <FaWhatsapp className="hover:text-emerald-500" /><FaInstagram className="hover:text-pink-500" /><FaFacebook className="hover:text-blue-600" />
          </div>
        </div>
      </div>
      <p className="border-t border-slate-100 py-4 text-center text-xs text-slate-400">© {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
    </footer>
  );
}
