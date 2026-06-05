import { useState, useEffect } from 'react';
import { 
  Truck, Ship, Package, Calendar, MapPin, Calculator, Leaf, ListOrdered, 
  CheckCircle2, AlertTriangle, Thermometer, Droplets, Fuel, ArrowRight, 
  User, RefreshCw, Activity, Search, ShieldAlert, Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface QuoteOption {
  mode: string;
  modeLabel: string;
  cost: number;
  days: number;
  co2: number;
  pros: string[];
  cons: string[];
}

interface QuoteResponse {
  route: string;
  recommendedMode: string;
  options: QuoteOption[];
  justification: string;
}

interface TrackingData {
  id: string;
  status: string;
  progress: number;
  driverName: string;
  vehiclePlate: string;
  location: string;
  destination: string;
  eta: string;
  routePath: { name: string; lat: number; lng: number }[];
  currentLocation: { lat: number; lng: number };
  telemetry: {
    temperature: string;
    targetTemperature: string;
    humidity: string;
    fuelLevel: string;
  };
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'calculator' | 'tracking' | 'orders' | 'eco'>('calculator');
  const [cargoType, setCargoType] = useState('palette');
  const [routeFrom, setRouteFrom] = useState('');
  const [routeTo, setRouteTo] = useState('');
  const [date, setDate] = useState('ASAP');
  const [weight, setWeight] = useState('5.0');
  const [adrEnabled, setAdrEnabled] = useState(false);
  
  // AI recommendations state
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Tracking state
  const [trackingId, setTrackingId] = useState('');
  const [searchTrackingId, setSearchTrackingId] = useState('');
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);

  // Active orders state
  const [orders, setOrders] = useState([
    { id: 'NG-83749', from: 'Gdańsk', to: 'Warszawa', date: '2026-06-06', type: 'cold', mode: 'road', status: 'W drodze' },
    { id: 'NG-19283', from: 'Wrocław', to: 'Hamburg', date: '2026-06-05', type: 'oversized', mode: 'rail', status: 'Zarejestrowano' },
    { id: 'NG-93821', from: 'Katowice', to: 'Rotterdam', date: '2026-06-01', type: 'palette', mode: 'sea', status: 'Dostarczono' }
  ]);

  // Alert message for booking success
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);

  const cargoOptions = [
    { id: 'palette', label: 'Palety standardowe', icon: Package, desc: 'LTL/FTL suche ładunki' },
    { id: 'cold', label: 'Chłodnia kontrolowana', icon: Truck, desc: 'Świeże produkty, temperatura -18°C do +4°C' },
    { id: 'oversized', label: 'Ładunki ponadgabarytowe', icon: Ship, desc: 'Ciężki przemysł, maszyny, trasy specjalne' },
  ];

  const handleGetQuote = async () => {
    if (!routeFrom || !routeTo) {
      setError("Proszę podać punkt początkowy i końcowy.");
      return;
    }

    setError(null);
    setQuote(null);
    setIsLoading(true);
    try {
      const response = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cargoType, routeFrom, routeTo, date, weight, adr: adrEnabled }),
      });
      const data = await response.json();
      setIsLoading(false);
      if (!response.ok) {
        setError(data.error || "Wystąpił błąd.");
      } else {
        setQuote(data);
      }
    } catch (err) {
      setIsLoading(false);
      setError("Błąd połączenia z serwerem.");
    }
  };

  const handleTrackShipment = async (idToSearch: string) => {
    if (!idToSearch) return;
    setIsTrackingLoading(true);
    setTrackingError(null);
    setTrackingData(null);
    try {
      const response = await fetch(`/api/track/${idToSearch}`);
      const data = await response.json();
      setIsTrackingLoading(false);
      if (!response.ok) {
        setTrackingError("Nie znaleziono przesyłki o podanym numerze.");
      } else {
        setTrackingData(data);
      }
    } catch (err) {
      setIsTrackingLoading(false);
      setTrackingError("Błąd podczas pobierania danych śledzenia.");
    }
  };

  const handleBookTransport = (option: QuoteOption) => {
    const newId = `NG-${Math.floor(10000 + Math.random() * 90000)}`;
    const newOrder = {
      id: newId,
      from: routeFrom,
      to: routeTo,
      date: date === 'ASAP' ? '2026-06-06' : date,
      type: cargoType,
      mode: option.mode,
      status: 'Zarejestrowano'
    };
    
    setOrders([newOrder, ...orders]);
    setBookingSuccess(`Pomyślnie zarezerwowano transport ${option.modeLabel}! Wygenerowano numer śledzenia: ${newId}`);
    
    // Auto clear booking alert after 6 seconds
    setTimeout(() => {
      setBookingSuccess(null);
    }, 6000);

    // Navigate to orders
    setActiveTab('orders');
  };

  // Coords generator for mapping progress to SVG
  const getMapCoords = (progress: number) => {
    // Warsaw (420, 150) -> Wroclaw (290, 230) -> Poznan (270, 130) -> Hamburg (90, 80)
    const pts = [
      { x: 380, y: 150 },
      { x: 280, y: 220 },
      { x: 260, y: 120 },
      { x: 90, y: 80 }
    ];
    const segmentCount = pts.length - 1;
    const positionInRoute = (progress / 100) * segmentCount;
    const currentSegmentIndex = Math.min(Math.floor(positionInRoute), segmentCount - 1);
    const segmentProgress = positionInRoute - currentSegmentIndex;
    
    const startPt = pts[currentSegmentIndex];
    const endPt = pts[currentSegmentIndex + 1];
    
    const x = startPt.x + (endPt.x - startPt.x) * segmentProgress;
    const y = startPt.y + (endPt.y - startPt.y) * segmentProgress;
    
    return { x, y };
  };

  return (
    <div className="flex h-screen bg-[#070D19] text-slate-100 font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="w-72 bg-[#0A1628] border-r border-slate-800 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo */}
          <div className="p-6 flex items-center gap-3 border-b border-slate-800">
            <div className="w-10 h-10 bg-[#F26522] rounded flex items-center justify-center font-black text-xl text-white shadow-lg shadow-orange-500/20">N</div>
            <div>
              <span className="text-lg font-black tracking-wider uppercase text-white">Northgate</span>
              <span className="block text-[10px] text-[#F26522] font-bold tracking-widest uppercase">Transport Portal</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            <button 
              onClick={() => setActiveTab('calculator')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition ${activeTab === 'calculator' ? 'bg-[#F26522] text-white shadow-md shadow-orange-500/10' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              <Calculator className="w-5 h-5" />
              Kalkulator AI
            </button>
            <button 
              onClick={() => setActiveTab('tracking')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition ${activeTab === 'tracking' ? 'bg-[#F26522] text-white shadow-md shadow-orange-500/10' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              <Activity className="w-5 h-5" />
              Śledzenie Live
            </button>
            <button 
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition ${activeTab === 'orders' ? 'bg-[#F26522] text-white shadow-md shadow-orange-500/10' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              <ListOrdered className="w-5 h-5" />
              Moje Zlecenia
              {orders.length > 0 && (
                <span className="ml-auto bg-slate-800 text-[#F26522] text-[10px] px-2 py-0.5 rounded-full font-bold">{orders.length}</span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('eco')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition ${activeTab === 'eco' ? 'bg-[#F26522] text-white shadow-md shadow-orange-500/10' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              <Leaf className="w-5 h-5" />
              Panel Ekologiczny
            </button>
          </nav>
        </div>

        {/* User Card */}
        <div className="p-4 border-t border-slate-800 bg-[#06101E]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-white">
              <User className="w-5 h-5 text-slate-300" />
            </div>
            <div>
              <span className="text-xs font-bold block text-white">Logistyka Sp. z o.o.</span>
              <span className="text-[10px] text-slate-400">Klient B2B ID: 29810</span>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* TOP NAVBAR */}
        <header className="h-16 border-b border-slate-800 bg-[#0A1628]/50 backdrop-blur px-8 flex justify-between items-center shrink-0">
          <h2 className="text-sm font-bold tracking-wider text-slate-400 uppercase">
            {activeTab === 'calculator' && 'Inteligentny Asystent Wycen'}
            {activeTab === 'tracking' && 'Monitorowanie Telemetryczne Pojazdów'}
            {activeTab === 'orders' && 'Baza Aktywnych Zamówień'}
            {activeTab === 'eco' && 'Raporty Oszczędności CO₂'}
          </h2>

          <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
              Serwer AI Online
            </span>
          </div>
        </header>

        {/* CONTENT AREA */}
        <main className="flex-1 p-8 overflow-y-auto">
          {bookingSuccess && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 px-6 py-4 rounded-xl mb-6 flex items-center gap-3 shadow-lg"
            >
              <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-400" />
              <div>
                <p className="font-bold">Zlecenie zarezerwowane!</p>
                <p className="text-xs text-emerald-400/80">{bookingSuccess}</p>
              </div>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            
            {/* CALCULATOR TAB */}
            {activeTab === 'calculator' && (
              <motion.div 
                key="calculator"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div>
                  <h1 className="text-3xl font-black text-white">Kalkulator Wyceń i Tras AI</h1>
                  <p className="text-sm text-slate-400">Optymalizuj trasę, szacuj koszty i redukuj emisje CO₂ z pomocą asystenta Gemini.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Controls */}
                  <div className="lg:col-span-1 space-y-4">
                    
                    {/* Cargo options */}
                    <div className="bg-[#0A1628] border border-slate-800 rounded-xl p-5 space-y-4">
                      <h3 className="text-xs font-black tracking-widest text-[#F26522] uppercase">1. Typ Ładunku</h3>
                      <div className="space-y-2">
                        {cargoOptions.map((opt) => (
                          <button
                            key={opt.id}
                            onClick={() => setCargoType(opt.id)}
                            className={`w-full text-left p-3 rounded-lg border-2 transition ${cargoType === opt.id ? 'border-[#F26522] bg-[#F26522]/5 text-white' : 'border-slate-800 bg-[#050D1A] text-slate-400 hover:border-slate-700'}`}
                          >
                            <div className="flex items-center gap-3 mb-1">
                              <opt.icon className={`w-5 h-5 ${cargoType === opt.id ? 'text-[#F26522]' : 'text-slate-500'}`} />
                              <span className="text-xs font-bold text-slate-200">{opt.label}</span>
                            </div>
                            <p className="text-[10px] text-slate-500 pl-8">{opt.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Route specs */}
                    <div className="bg-[#0A1628] border border-slate-800 rounded-xl p-5 space-y-4">
                      <h3 className="text-xs font-black tracking-widest text-[#F26522] uppercase">2. Specyfikacja Trasy</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Skąd</label>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                            <input 
                              type="text" 
                              placeholder="np. Warszawa, Polska" 
                              value={routeFrom} 
                              onChange={(e) => setRouteFrom(e.target.value)} 
                              className="w-full bg-[#050D1A] border border-slate-800 rounded-lg py-2 pl-9 pr-4 text-xs text-white focus:border-[#F26522] focus:ring-1 focus:ring-[#F26522] outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Dokąd</label>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                            <input 
                              type="text" 
                              placeholder="np. Hamburg, Niemcy" 
                              value={routeTo} 
                              onChange={(e) => setRouteTo(e.target.value)} 
                              className="w-full bg-[#050D1A] border border-slate-800 rounded-lg py-2 pl-9 pr-4 text-xs text-white focus:border-[#F26522] focus:ring-1 focus:ring-[#F26522] outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Waga (tony)</label>
                            <input 
                              type="number" 
                              value={weight} 
                              onChange={(e) => setWeight(e.target.value)} 
                              className="w-full bg-[#050D1A] border border-slate-800 rounded-lg p-2 text-xs text-white focus:border-[#F26522] outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Data nadania</label>
                            <input 
                              type="text" 
                              value={date} 
                              onChange={(e) => setDate(e.target.value)} 
                              className="w-full bg-[#050D1A] border border-slate-800 rounded-lg p-2 text-xs text-white focus:border-[#F26522] outline-none"
                            />
                          </div>
                        </div>

                        {/* ADR checkbox */}
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-800/50">
                          <input 
                            type="checkbox" 
                            id="adr" 
                            checked={adrEnabled} 
                            onChange={(e) => setAdrEnabled(e.target.checked)} 
                            className="w-4 h-4 rounded text-[#F26522] focus:ring-[#F26522] bg-[#050D1A] border-slate-800"
                          />
                          <label htmlFor="adr" className="text-[10px] font-bold text-slate-300 uppercase cursor-pointer flex items-center gap-1">
                            Ładunek niebezpieczny (ADR)
                          </label>
                        </div>
                      </div>

                      <button
                        onClick={handleGetQuote}
                        disabled={isLoading}
                        className="w-full mt-4 bg-[#F26522] hover:bg-[#d95a1e] disabled:bg-slate-700 text-white font-bold py-3 px-4 rounded-lg text-xs uppercase tracking-widest transition shadow-lg shadow-orange-500/15 flex items-center justify-center gap-2"
                      >
                        {isLoading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Przetwarzanie AI...
                          </>
                        ) : (
                          'Porównaj i optymalizuj trasę'
                        )}
                      </button>
                    </div>

                  </div>

                  {/* Right Results Display */}
                  <div className="lg:col-span-2 space-y-6">
                    {error && (
                      <div className="bg-red-950/40 border border-red-500/30 text-red-400 p-4 rounded-xl text-xs flex items-center gap-3">
                        <ShieldAlert className="w-5 h-5 text-red-400" />
                        <span>{error}</span>
                      </div>
                    )}

                    {isLoading && (
                      <div className="bg-[#0A1628] border border-slate-800 rounded-xl p-10 flex flex-col items-center justify-center space-y-4 h-80">
                        <div className="relative w-16 h-16">
                          <div className="absolute inset-0 rounded-full border-4 border-[#F26522]/20 border-t-[#F26522] animate-spin"></div>
                          <Truck className="absolute inset-0 m-auto w-6 h-6 text-[#F26522] animate-pulse" />
                        </div>
                        <h3 className="text-sm font-bold text-white">Ekspert Gemini analizuje parametry...</h3>
                        <p className="text-xs text-slate-400 text-center max-w-sm">Dobieramy najbardziej ekologiczny środek transportu i kalkulujemy optymalną redukcję CO₂.</p>
                      </div>
                    )}

                    {!quote && !isLoading && !error && (
                      <div className="border border-dashed border-slate-800 rounded-xl p-10 flex flex-col items-center justify-center space-y-4 h-80 bg-slate-900/10">
                        <Truck className="w-12 h-12 text-slate-700" />
                        <h3 className="text-sm font-bold text-slate-500">Wprowadź dane trasy, aby wygenerować wycenę</h3>
                        <p className="text-xs text-slate-600 text-center max-w-xs">Narzędzie wyliczy koszty, czas dostawy oraz oszczędność śladu węglowego dla transportu drogowego, kolejowego oraz morskiego.</p>
                      </div>
                    )}

                    {quote && !isLoading && (
                      <div className="space-y-6">
                        
                        {/* Summary Header */}
                        <div className="bg-[#0A1628] border border-[#F26522]/30 rounded-xl p-5 flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-[#F26522]/10 border border-[#F26522]/30 flex items-center justify-center">
                            <Leaf className="w-6 h-6 text-[#F26522]" />
                          </div>
                          <div>
                            <h3 className="text-sm font-black text-white uppercase tracking-wider">Rekomendacja Asystenta</h3>
                            <p className="text-xs text-slate-300 mt-1">{quote.justification}</p>
                          </div>
                        </div>

                        {/* Comparative Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {quote.options.map((opt, i) => {
                            const isRecommended = opt.mode === quote.recommendedMode;
                            return (
                              <div 
                                key={i} 
                                className={`bg-[#0A1628] border rounded-xl p-5 flex flex-col justify-between transition ${isRecommended ? 'border-[#F26522] ring-1 ring-[#F26522]/50' : 'border-slate-800 hover:border-slate-700'}`}
                              >
                                <div>
                                  <div className="flex justify-between items-start mb-4">
                                    <span className="text-xs font-black uppercase text-white block">{opt.modeLabel}</span>
                                    {isRecommended && (
                                      <span className="bg-[#F26522]/10 border border-[#F26522] text-[#F26522] text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                        EKO WYBÓR
                                      </span>
                                    )}
                                  </div>

                                  {/* Stats */}
                                  <div className="space-y-2 mb-4">
                                    <div>
                                      <span className="text-[10px] text-slate-500 uppercase block">Szacowany Koszt</span>
                                      <span className="text-lg font-black text-white">{opt.cost.toLocaleString('pl-PL')} PLN</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 border-t border-slate-800/80 pt-2">
                                      <div>
                                        <span className="text-[10px] text-slate-500 uppercase block">Czas dostawy</span>
                                        <span className="text-xs font-bold text-slate-200">{opt.days} {opt.days === 1 ? 'dzień' : 'dni'}</span>
                                      </div>
                                      <div>
                                        <span className="text-[10px] text-slate-500 uppercase block">Emisja CO₂</span>
                                        <span className="text-xs font-bold text-emerald-400">{opt.co2} kg</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Pros & Cons */}
                                  <div className="space-y-3 mb-6 border-t border-slate-800/80 pt-3">
                                    <div>
                                      <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block mb-1">ZALETY:</span>
                                      <ul className="text-[10px] text-slate-300 space-y-1 list-disc pl-3">
                                        {opt.pros.map((pro, idx) => <li key={idx}>{pro}</li>)}
                                      </ul>
                                    </div>
                                    <div>
                                      <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest block mb-1">WADY:</span>
                                      <ul className="text-[10px] text-slate-400 space-y-1 list-disc pl-3">
                                        {opt.cons.map((con, idx) => <li key={idx}>{con}</li>)}
                                      </ul>
                                    </div>
                                  </div>
                                </div>

                                <button
                                  onClick={() => handleBookTransport(opt)}
                                  className={`w-full py-2.5 rounded-lg text-xs font-bold transition ${isRecommended ? 'bg-[#F26522] hover:bg-[#d95a1e] text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
                                >
                                  Zarezerwuj ten transport
                                </button>
                              </div>
                            );
                          })}
                        </div>

                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* TRACKING TAB */}
            {activeTab === 'tracking' && (
              <motion.div 
                key="tracking"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div>
                  <h1 className="text-3xl font-black text-white">Monitorowanie Telemetryczne Pojazdów</h1>
                  <p className="text-sm text-slate-400">Śledź aktualną pozycję ładunku oraz telemetryczne czujniki temperatury chłodni w czasie rzeczywistym.</p>
                </div>

                {/* Tracking search form */}
                <div className="bg-[#0A1628] border border-slate-800 rounded-xl p-5 flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                    <input 
                      type="text" 
                      placeholder="Wprowadź numer śledzenia (np. NG-83749, NG-19283)" 
                      value={trackingId}
                      onChange={(e) => setTrackingId(e.target.value)}
                      className="w-full bg-[#050D1A] border border-slate-800 rounded-lg py-3 pl-11 pr-4 text-xs text-white focus:border-[#F26522] focus:ring-1 focus:ring-[#F26522] outline-none"
                    />
                  </div>
                  <button 
                    onClick={() => handleTrackShipment(trackingId)}
                    disabled={isTrackingLoading}
                    className="bg-[#F26522] hover:bg-[#d95a1e] text-white px-6 rounded-lg text-xs font-bold tracking-widest uppercase transition flex items-center gap-2"
                  >
                    {isTrackingLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Lokalizuj'}
                  </button>
                </div>

                {trackingError && (
                  <div className="bg-red-950/40 border border-red-500/30 text-red-400 p-4 rounded-xl text-xs">
                    {trackingError}
                  </div>
                )}

                {trackingData && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Left: Map & Timeline */}
                    <div className="lg:col-span-2 space-y-6">
                      
                      {/* SVG MAP */}
                      <div className="bg-[#0A1628] border border-slate-800 rounded-xl p-5 relative overflow-hidden">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-xs font-black tracking-widest text-[#F26522] uppercase flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping"></span>
                            Pozycja Pojazdu GPS (Live Map)
                          </h3>
                          <span className="text-[10px] text-slate-400">Trasa: {trackingData.location} &rarr; {trackingData.destination}</span>
                        </div>

                        {/* Interactive map */}
                        <div className="h-[280px] bg-[#050D1A] rounded-lg border border-slate-900 relative">
                          <svg className="w-full h-full text-slate-800" viewBox="0 0 500 300">
                            {/* Gridlines */}
                            <defs>
                              <pattern id="grid" width="25" height="25" patternUnits="userSpaceOnUse">
                                <path d="M 25 0 L 0 0 0 25" fill="none" stroke="#0e1726" strokeWidth="1"/>
                              </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#grid)" />

                            {/* European Borders Simulated Path */}
                            <path 
                              d="M 380 150 L 280 220 L 260 120 L 90 80" 
                              fill="none" 
                              stroke="#1e293b" 
                              strokeWidth="4" 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                            />
                            
                            {/* Traveled Path */}
                            <path 
                              d="M 380 150 L 280 220 L 260 120 L 90 80" 
                              fill="none" 
                              stroke="#F26522" 
                              strokeWidth="3" 
                              strokeDasharray="6 4"
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                            />

                            {/* Node points */}
                            <circle cx="380" cy="150" r="6" fill="#0A1628" stroke="#F26522" strokeWidth="2" />
                            <text x="390" y="155" fill="#64748b" fontSize="8" fontWeight="bold">Warszawa</text>

                            <circle cx="280" cy="220" r="5" fill="#0A1628" stroke="#F26522" strokeWidth="1.5" />
                            <text x="290" y="225" fill="#64748b" fontSize="8">Wrocław</text>

                            <circle cx="260" cy="120" r="5" fill="#0A1628" stroke="#F26522" strokeWidth="1.5" />
                            <text x="270" y="125" fill="#64748b" fontSize="8">Poznań</text>

                            <circle cx="90" cy="80" r="6" fill="#0A1628" stroke="#F26522" strokeWidth="2" />
                            <text x="80" y="95" fill="#64748b" fontSize="8" fontWeight="bold">Hamburg</text>

                            {/* Truck indicator on map */}
                            {(() => {
                              const coords = getMapCoords(trackingData.progress);
                              return (
                                <g>
                                  {/* Pulse aura */}
                                  <circle cx={coords.x} cy={coords.y} r="16" fill="#F26522" className="opacity-25 animate-ping" style={{ transformOrigin: `${coords.x}px ${coords.y}px` }} />
                                  {/* Icon dot */}
                                  <circle cx={coords.x} cy={coords.y} r="8" fill="#F26522" stroke="#fff" strokeWidth="2" />
                                </g>
                              );
                            })()}
                          </svg>

                          {/* Float driver banner */}
                          <div className="absolute bottom-3 left-3 bg-[#0A1628]/90 border border-slate-800 backdrop-blur px-3 py-2 rounded-lg text-[10px] space-y-1">
                            <p className="font-bold text-white">Kierowca: {trackingData.driverName}</p>
                            <p className="text-slate-400">Pojazd: {trackingData.vehiclePlate}</p>
                          </div>
                        </div>
                      </div>

                      {/* Status Timeline */}
                      <div className="bg-[#0A1628] border border-slate-800 rounded-xl p-5 space-y-4">
                        <h3 className="text-xs font-black tracking-widest text-[#F26522] uppercase">Status Doręczenia</h3>
                        <div className="flex justify-between items-center relative pt-4">
                          {/* Progress bar line */}
                          <div className="absolute left-0 top-[26px] w-full h-1 bg-slate-800 -z-10"></div>
                          <div className="absolute left-0 top-[26px] h-1 bg-[#F26522] -z-10 transition-all duration-500" style={{ width: `${trackingData.progress}%` }}></div>

                          {/* Nodes */}
                          {[
                            { name: "Zarejestrowano", pct: 15 },
                            { name: "Odprawa celna", pct: 45 },
                            { name: "W drodze", pct: 75 },
                            { name: "Dostarczono", pct: 100 }
                          ].map((step, idx) => {
                            const isActive = trackingData.progress >= step.pct;
                            return (
                              <div key={idx} className="flex flex-col items-center gap-2">
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${isActive ? 'bg-[#F26522] border-[#F26522] text-white' : 'bg-[#050D1A] border-slate-800 text-slate-500'}`}>
                                  {idx + 1}
                                </div>
                                <span className={`text-[10px] font-bold ${isActive ? 'text-white' : 'text-slate-500'}`}>{step.name}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                    </div>

                    {/* Right: Telemetry & Info */}
                    <div className="space-y-6">
                      
                      {/* Telemetry Gauge Controls */}
                      <div className="bg-[#0A1628] border border-slate-800 rounded-xl p-5 space-y-4">
                        <h3 className="text-xs font-black tracking-widest text-[#F26522] uppercase">Sensory Telemetryczne</h3>
                        
                        <div className="space-y-3">
                          {/* Temperature */}
                          <div className="bg-[#050D1A] border border-slate-900 rounded-lg p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Thermometer className="w-8 h-8 text-cyan-400" />
                              <div>
                                <span className="text-[10px] text-slate-500 uppercase block font-bold">Temperatura Cargo</span>
                                <span className="text-xs text-slate-400">Zadana: {trackingData.telemetry.targetTemperature}°C</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-xl font-black text-cyan-400 block">{trackingData.telemetry.temperature}°C</span>
                              <span className="bg-emerald-950 text-emerald-400 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">Norma</span>
                            </div>
                          </div>

                          {/* Humidity */}
                          <div className="bg-[#050D1A] border border-slate-900 rounded-lg p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Droplets className="w-8 h-8 text-blue-400" />
                              <div>
                                <span className="text-[10px] text-slate-500 uppercase block font-bold">Wilgotność powietrza</span>
                                <span className="text-xs text-slate-400">Optymalna: 60-70%</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-xl font-black text-blue-400 block">{trackingData.telemetry.humidity}%</span>
                              <span className="bg-emerald-950 text-emerald-400 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">Norma</span>
                            </div>
                          </div>

                          {/* Fuel Level */}
                          <div className="bg-[#050D1A] border border-slate-900 rounded-lg p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Fuel className="w-8 h-8 text-orange-400" />
                              <div>
                                <span className="text-[10px] text-slate-500 uppercase block font-bold">Poziom Paliwa Agregatu</span>
                                <span className="text-xs text-slate-400">Autonomia: ~48h</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-xl font-black text-orange-400 block">{trackingData.telemetry.fuelLevel}%</span>
                              <span className="text-[8px] text-slate-500 uppercase block">Zbiornik 250L</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Shipment Meta Details */}
                      <div className="bg-[#0A1628] border border-slate-800 rounded-xl p-5 space-y-4">
                        <h3 className="text-xs font-black tracking-widest text-[#F26522] uppercase">Dane Zlecenia</h3>
                        
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between border-b border-slate-800/60 pb-2">
                            <span className="text-slate-500 font-bold">Numer przesyłki:</span>
                            <span className="text-white font-mono font-bold">{trackingData.id}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-800/60 pb-2">
                            <span className="text-slate-500 font-bold">Obecna stacja:</span>
                            <span className="text-white font-bold">{trackingData.location}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-800/60 pb-2">
                            <span className="text-slate-500 font-bold">Przeznaczenie:</span>
                            <span className="text-white font-bold">{trackingData.destination}</span>
                          </div>
                          <div className="flex justify-between pb-1">
                            <span className="text-slate-500 font-bold">Szacowany czas dostawy (ETA):</span>
                            <span className="text-white font-bold">{trackingData.eta}</span>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {!trackingData && !isTrackingLoading && (
                  <div className="border border-dashed border-slate-800 rounded-xl p-10 flex flex-col items-center justify-center space-y-4 h-80 bg-slate-900/10">
                    <Activity className="w-12 h-12 text-slate-700" />
                    <h3 className="text-sm font-bold text-slate-500">Brak aktywnego podglądu śledzenia</h3>
                    <p className="text-xs text-slate-600 text-center max-w-xs">Wpisz przykładowy numer zlecenia w wyszukiwarce powyżej (np. <span className="font-bold text-slate-400">NG-83749</span>), aby sprawdzić telemetryczne wskaźniki na mapie.</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* ORDERS TAB */}
            {activeTab === 'orders' && (
              <motion.div 
                key="orders"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h1 className="text-3xl font-black text-white">Aktywne Zlecenia</h1>
                    <p className="text-sm text-slate-400">Historia i aktualny status Twoich transportów.</p>
                  </div>
                </div>

                <div className="bg-[#0A1628] border border-slate-800 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-900/50 border-b border-slate-800 text-slate-400 font-black uppercase tracking-wider">
                          <th className="p-4">Kod Zlecenia</th>
                          <th className="p-4">Trasa</th>
                          <th className="p-4">Data nadania</th>
                          <th className="p-4">Ładunek</th>
                          <th className="p-4">Rodzaj transportu</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 text-center">Akcja</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {orders.map((ord, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/20 text-slate-300">
                            <td className="p-4 font-mono font-bold text-white">{ord.id}</td>
                            <td className="p-4 font-semibold">{ord.from} &rarr; {ord.to}</td>
                            <td className="p-4">{ord.date}</td>
                            <td className="p-4 uppercase text-[10px] font-bold text-slate-400">
                              {ord.type === 'cold' ? 'Chłodnia (-18°C)' : ord.type === 'oversized' ? 'Gabaryty' : 'Palety'}
                            </td>
                            <td className="p-4 uppercase text-[10px] font-bold text-slate-400">{ord.mode === 'road' ? 'Drogowy' : ord.mode === 'rail' ? 'Kolejowy (Eko)' : 'Morski'}</td>
                            <td className="p-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${ord.status === 'Dostarczono' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/20' : ord.status === 'W drodze' ? 'bg-amber-950 text-amber-400 border border-amber-500/20 animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
                                {ord.status}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <button 
                                onClick={() => {
                                  setTrackingId(ord.id);
                                  handleTrackShipment(ord.id);
                                  setActiveTab('tracking');
                                }}
                                className="bg-[#F26522]/10 border border-[#F26522]/30 hover:bg-[#F26522] hover:text-white text-[#F26522] px-3 py-1.5 rounded text-[10px] font-bold transition uppercase tracking-widest"
                              >
                                Śledź
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ECO TAB */}
            {activeTab === 'eco' && (
              <motion.div 
                key="eco"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div>
                  <h1 className="text-3xl font-black text-white">Statystyki Ekologiczne</h1>
                  <p className="text-sm text-slate-400">Zarządzaj i raportuj redukcję śladu węglowego w swoim łańcuchu dostaw dzięki transportowi kolejowemu i morskiemu.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* CO2 Saved Card */}
                  <div className="bg-[#0A1628] border border-slate-800 rounded-xl p-5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Zredukowane CO₂ ogółem</span>
                      <span className="text-3xl font-black text-emerald-400 block mt-1">1,840 kg CO₂</span>
                      <span className="text-[10px] text-slate-400 mt-2 block">Odpowiednik 46 posadzonych drzew 🌳</span>
                    </div>
                    <div className="w-14 h-14 bg-emerald-950/80 rounded-full flex items-center justify-center border border-emerald-500/30">
                      <Leaf className="w-7 h-7 text-emerald-400" />
                    </div>
                  </div>

                  {/* Level / Badge */}
                  <div className="bg-[#0A1628] border border-slate-800 rounded-xl p-5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Status Certyfikacji</span>
                      <span className="text-xl font-black text-amber-400 block mt-1">Srebrny Eko-Partner</span>
                      <span className="text-[10px] text-slate-400 mt-2 block">Do statusu Złotego brakuje: 160 kg CO₂</span>
                    </div>
                    <div className="w-14 h-14 bg-amber-950/80 rounded-full flex items-center justify-center border border-amber-500/30">
                      <Award className="w-7 h-7 text-amber-400" />
                    </div>
                  </div>

                  {/* Shipments count */}
                  <div className="bg-[#0A1628] border border-slate-800 rounded-xl p-5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Udział Zielonego Transportu</span>
                      <span className="text-3xl font-black text-[#F26522] block mt-1">64.5%</span>
                      <span className="text-[10px] text-slate-400 mt-2 block">Kolej + Morze vs Transport Drogowy</span>
                    </div>
                    <div className="w-14 h-14 bg-[#F26522]/10 rounded-full flex items-center justify-center border border-[#F26522]/30">
                      <Truck className="w-7 h-7 text-[#F26522]" />
                    </div>
                  </div>

                </div>

                {/* Eco comparison graph simulated */}
                <div className="bg-[#0A1628] border border-slate-800 rounded-xl p-5">
                  <h3 className="text-xs font-black tracking-widest text-[#F26522] uppercase mb-6">Emisja CO₂ w podziale na miesiące (Porównanie w kg)</h3>
                  
                  <div className="h-64 flex items-end gap-6 pt-4 px-4 border-b border-slate-800 border-l">
                    {[
                      { month: "Marzec", standard: 520, eco: 210 },
                      { month: "Kwiecień", standard: 680, eco: 240 },
                      { month: "Maj", standard: 450, eco: 180 },
                      { month: "Czerwiec", standard: 790, eco: 310 }
                    ].map((data, idx) => {
                      const maxVal = 800;
                      const stdHeight = (data.standard / maxVal) * 100;
                      const ecoHeight = (data.eco / maxVal) * 100;
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full relative group">
                          {/* Bars */}
                          <div className="w-full flex gap-2 justify-center items-end h-full">
                            <div className="w-8 bg-rose-500/20 border border-rose-500/30 rounded-t transition-all group-hover:bg-rose-500/40" style={{ height: `${stdHeight}%` }}>
                              <span className="absolute -top-6 text-[9px] text-rose-400 font-bold font-mono text-center w-8 block">{data.standard}</span>
                            </div>
                            <div className="w-8 bg-emerald-500/30 border border-emerald-500/40 rounded-t transition-all group-hover:bg-emerald-500/50" style={{ height: `${ecoHeight}%` }}>
                              <span className="absolute -top-6 text-[9px] text-emerald-400 font-bold font-mono text-center w-8 block">{data.eco}</span>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-500 mt-2 font-bold">{data.month}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-4 justify-center mt-4 text-[10px] font-bold">
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-rose-500/30 border border-rose-500/40 rounded"></span>
                      Standardowy transport drogowy
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-emerald-500/30 border border-emerald-500/40 rounded"></span>
                      Zrealizowany transport ekologiczny (Kolej / Intermodal)
                    </span>
                  </div>
                </div>

              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>

    </div>
  );
}
