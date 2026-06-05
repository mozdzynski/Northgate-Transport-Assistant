/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState } from 'react';
import { Truck, Ship, Package } from 'lucide-react';
import { motion } from 'motion/react';

export default function App() {
  const [cargoType, setCargoType] = useState('palette');
  const [routeFrom, setRouteFrom] = useState('');
  const [routeTo, setRouteTo] = useState('');
  const [quote, setQuote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const cargoOptions = [
    { id: 'palette', label: 'Paleta', icon: Package },
    { id: 'cold', label: 'Chłodnia', icon: Truck },
    { id: 'oversized', label: 'Gabaryty', icon: Ship },
  ];

  const handleGetQuote = async () => {
    setError(null);
    setQuote('');
    setIsLoading(true);
    const response = await fetch('/api/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cargoType, routeFrom, routeTo, date: 'ASAP' }),
    });
    const data = await response.json();
    setIsLoading(false);
    if (!response.ok) {
        setError(data.error || "Wystąpił błąd.");
    } else {
        setQuote(data.recommendation);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      <nav className="bg-[#0A1D37] text-white px-8 py-4 flex justify-between items-center shrink-0 border-b-4 border-[#F26522]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#F26522] rounded flex items-center justify-center font-bold text-xl">N</div>
          <span className="text-xl font-bold tracking-tight uppercase">Northgate Logistics</span>
        </div>
      </nav>

      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          <header>
            <h1 className="text-2xl font-bold text-slate-900">Transport Assistant</h1>
            <p className="text-sm text-slate-500">Optymalna wycena i bezpieczny transport</p>
          </header>

          <section className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-[#0A1D37] rounded"></span>
              Parametry Ładunku
            </h2>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {cargoOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setCargoType(option.id)}
                  className={`flex flex-col items-center p-3 rounded-lg border-2 transition-colors ${cargoType === option.id ? 'border-[#F26522] bg-orange-50' : 'border-slate-100 bg-slate-50 hover:border-[#F26522]'}`}
                >
                  <option.icon className="w-8 h-8 mb-2 text-slate-700" />
                  <span className="text-[10px] font-bold uppercase">{option.label}</span>
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Trasa (Skąd - Dokąd)</label>
                <div className="flex gap-2">
                  <input type="text" placeholder="Skąd" value={routeFrom} onChange={(e) => setRouteFrom(e.target.value)} className="w-full p-2 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none" />
                  <input type="text" placeholder="Dokąd" value={routeTo} onChange={(e) => setRouteTo(e.target.value)} className="w-full p-2 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none" />
                </div>
              </div>
            </div>
            
            <button 
                onClick={handleGetQuote} 
                disabled={isLoading}
                className="w-full mt-6 bg-[#F26522] hover:bg-[#d95a1e] disabled:bg-slate-400 text-white font-black py-4 rounded-lg uppercase tracking-widest shadow-lg transition"
            >
              {isLoading ? 'Generowanie...' : 'Wycena i ekologiczna trasa'}
            </button>
          </section>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl shadow-sm border border-red-200 text-sm">
                {error}
            </div>
          )}

          {quote && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-semibold mb-2 text-[#0A1D37]">Sugerowana trasa:</h3>
              <p className="text-slate-700 text-sm whitespace-pre-line leading-relaxed">{quote}</p>
            </motion.div>
          )}
        </div>
      </main>

      <footer className="bg-slate-200 px-8 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">
        &copy; 2026 Northgate Logistics S.A.
      </footer>
    </div>
  );
}
