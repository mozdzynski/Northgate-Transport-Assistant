import { useState, useEffect } from 'react';
import { 
  Truck, Ship, Package, Calendar, MapPin, Calculator, Leaf, ListOrdered, 
  CheckCircle2, AlertTriangle, Thermometer, Droplets, Fuel, ArrowRight, 
  User, RefreshCw, Activity, Search, ShieldAlert, Award, Menu, X, Plus, 
  Trash2, Save, Users, Settings as SettingsIcon, Sliders, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ClientB2B {
  id: string;
  name: string;
  discountRoad: number;
  discountRail: number;
  discountSea: number;
  allowedCargoTypes: string[];
}

interface RatesConfig {
  roadBase: number;
  railBase: number;
  seaBase: number;
  coldSurcharge: number;
  adrSurcharge: number;
  expressSurcharge: number;
}

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Client tabs & Admin tabs states
  const [activeTab, setActiveTab] = useState<'calculator' | 'tracking' | 'orders' | 'eco'>('calculator');
  const [activeAdminTab, setActiveAdminTab] = useState<'clients' | 'rates' | 'fleet'>('clients');

  // Multi-tenant database state
  const [clients, setClients] = useState<ClientB2B[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientB2B | null>(null);
  const [rates, setRates] = useState<RatesConfig>({
    roadBase: 3.5,
    railBase: 2.2,
    seaBase: 1.1,
    coldSurcharge: 25,
    adrSurcharge: 20,
    expressSurcharge: 15
  });

  // Cargo specifications state
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
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);

  // Client orders state
  const [orders, setOrders] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]); // For Admin fleet view

  // Alert message state
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);
  const [adminSuccess, setAdminSuccess] = useState<string | null>(null);

  // Admin Form: New Client state
  const [newClientName, setNewClientName] = useState('');
  const [newClientDiscountRoad, setNewClientDiscountRoad] = useState('0');
  const [newClientDiscountRail, setNewClientDiscountRail] = useState('0');
  const [newClientDiscountSea, setNewClientDiscountSea] = useState('0');
  const [newClientAllowedCargo, setNewClientAllowedCargo] = useState<string[]>(['palette']);

  // Admin Rates edit state
  const [editedRates, setEditedRates] = useState<RatesConfig>({ ...rates });

  // Admin Selected Driver for telemetry update
  const [selectedFleetOrder, setSelectedFleetOrder] = useState<any | null>(null);

  const cargoOptions = [
    { id: 'palette', label: 'Palety standardowe', icon: Package, desc: 'LTL/FTL suche ładunki' },
    { id: 'cold', label: 'Chłodnia kontrolowana', icon: Truck, desc: 'Świeże produkty, temperatura -18°C do +4°C' },
    { id: 'oversized', label: 'Ładunki ponadgabarytowe', icon: Ship, desc: 'Ciężki przemysł, maszyny, trasy specjalne' },
  ];

  // Fetch initial clients and rates config
  const fetchStartupData = async () => {
    try {
      const clientsRes = await fetch('/api/admin/clients');
      const clientsData = await clientsRes.json();
      setClients(clientsData);
      if (clientsData.length > 0 && !selectedClient) {
        setSelectedClient(clientsData[0]);
      }

      const ratesRes = await fetch('/api/admin/rates');
      const ratesData = await ratesRes.json();
      setRates(ratesData);
      setEditedRates(ratesData);
    } catch (err) {
      console.error("Failed to load startup config:", err);
    }
  };

  const fetchClientOrders = async () => {
    if (!selectedClient) return;
    try {
      const res = await fetch(`/api/orders?clientId=${selectedClient.id}`);
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      console.error("Failed to load client orders:", err);
    }
  };

  const fetchAllOrdersAdmin = async () => {
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      setAllOrders(data);
    } catch (err) {
      console.error("Failed to load all orders:", err);
    }
  };

  useEffect(() => {
    fetchStartupData();
  }, []);

  useEffect(() => {
    fetchClientOrders();
  }, [selectedClient]);

  useEffect(() => {
    if (isAdmin) {
      fetchAllOrdersAdmin();
    }
  }, [isAdmin, activeAdminTab]);

  const handleGetQuote = async () => {
    if (!routeFrom || !routeTo) {
      setError("Proszę podać punkt początkowy i końcowy.");
      return;
    }
    if (!selectedClient) return;

    setError(null);
    setQuote(null);
    setIsLoading(true);
    try {
      const response = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          cargoType, 
          routeFrom, 
          routeTo, 
          date, 
          weight, 
          adr: adrEnabled,
          clientId: selectedClient.id
        }),
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

  const handleBookTransport = async (option: QuoteOption) => {
    if (!selectedClient) return;
    const newId = `NG-${Math.floor(10000 + Math.random() * 90000)}`;
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newId,
          clientId: selectedClient.id,
          from: routeFrom,
          to: routeTo,
          date: date === 'ASAP' ? '2026-06-11' : date,
          type: cargoType,
          mode: option.mode
        })
      });
      const data = await res.json();
      setOrders([data, ...orders]);
      setBookingSuccess(`Pomyślnie zarezerwowano transport ${option.modeLabel}! Wygenerowano numer śledzenia: ${newId}`);
      setTimeout(() => setBookingSuccess(null), 6000);
      setActiveTab('orders');
    } catch (err) {
      console.error("Booking error:", err);
    }
  };

  // Admin: Add new B2B client profile
  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName) return;

    try {
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClientName,
          discountRoad: newClientDiscountRoad,
          discountRail: newClientDiscountRail,
          discountSea: newClientDiscountSea,
          allowedCargoTypes: newClientAllowedCargo
        })
      });
      const newCli = await res.json();
      setClients([...clients, newCli]);
      
      // Reset form
      setNewClientName('');
      setNewClientDiscountRoad('0');
      setNewClientDiscountRail('0');
      setNewClientDiscountSea('0');
      setNewClientAllowedCargo(['palette']);

      setAdminSuccess(`Dodano nowy profil klienta B2B: ${newCli.name}`);
      setTimeout(() => setAdminSuccess(null), 4000);
    } catch (err) {
      console.error("Add client error:", err);
    }
  };

  // Admin: Delete B2B client profile
  const handleDeleteClient = async (id: string) => {
    try {
      await fetch(`/api/admin/clients/${id}`, { method: 'DELETE' });
      setClients(clients.filter(c => c.id !== id));
      if (selectedClient?.id === id && clients.length > 1) {
        setSelectedClient(clients.find(c => c.id !== id) || null);
      }
      setAdminSuccess("Profil klienta został usunięty");
      setTimeout(() => setAdminSuccess(null), 4000);
    } catch (err) {
      console.error("Delete client error:", err);
    }
  };

  // Admin: Update pricing configuration
  const handleUpdateRates = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/rates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedRates)
      });
      const updated = await res.json();
      setRates(updated);
      setAdminSuccess("Cenniki i dopłaty zaktualizowane pomyślnie!");
      setTimeout(() => setAdminSuccess(null), 4000);
    } catch (err) {
      console.error("Update rates error:", err);
    }
  };

  // Admin: Update fleet telemetry & tracking parameters
  const handleUpdateFleetOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFleetOrder) return;

    try {
      const res = await fetch(`/api/admin/orders/${selectedFleetOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: selectedFleetOrder.status,
          progress: selectedFleetOrder.progress,
          driverName: selectedFleetOrder.driverName,
          vehiclePlate: selectedFleetOrder.vehiclePlate,
          temperature: selectedFleetOrder.telemetry.temperature,
          targetTemperature: selectedFleetOrder.telemetry.targetTemperature,
          humidity: selectedFleetOrder.telemetry.humidity,
          fuelLevel: selectedFleetOrder.telemetry.fuelLevel
        })
      });
      
      const updatedOrder = await res.json();
      
      // Update local states
      setAllOrders(allOrders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
      setOrders(orders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
      if (trackingData && trackingData.id === updatedOrder.id) {
        setTrackingData({
          ...trackingData,
          ...updatedOrder
        });
      }
      setSelectedFleetOrder(null);
      setAdminSuccess(`Status przesyłki ${updatedOrder.id} został zaktualizowany!`);
      setTimeout(() => setAdminSuccess(null), 4000);
    } catch (err) {
      console.error("Update fleet error:", err);
    }
  };

  // Coords generator for mapping progress to SVG
  const getMapCoords = (progress: number) => {
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
    <div className="flex flex-col md:flex-row h-screen bg-[#070D19] text-slate-100 font-sans overflow-hidden">
      
      {/* Mobile Top Header */}
      <div className="md:hidden bg-[#0A1628] border-b border-slate-800 px-6 py-4 flex justify-between items-center shrink-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#F26522] rounded flex items-center justify-center font-black text-md text-white shadow-md shadow-orange-500/10">N</div>
          <div>
            <span className="text-sm font-black tracking-wider uppercase text-white">Northgate</span>
            <span className="block text-[8px] text-[#F26522] font-bold tracking-widest uppercase">Portal B2B</span>
          </div>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          className="p-1 text-slate-400 hover:text-white focus:outline-none"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)} 
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
        />
      )}

      {/* SIDEBAR */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-[#0A1628] border-r border-slate-800 flex flex-col justify-between shrink-0 transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 md:z-auto
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div>
          {/* Logo */}
          <div className="p-6 flex items-center gap-3 border-b border-slate-800">
            <div className="w-10 h-10 bg-[#F26522] rounded flex items-center justify-center font-black text-xl text-white shadow-lg shadow-orange-500/20">N</div>
            <div>
              <span className="text-lg font-black tracking-wider uppercase text-white">Northgate</span>
              <span className="block text-[10px] text-[#F26522] font-bold tracking-widest uppercase">Transport Portal</span>
            </div>
          </div>

          {/* Navigation Links - adapt depending on role */}
          {!isAdmin ? (
            <nav className="p-4 space-y-1">
              <button 
                onClick={() => { setActiveTab('calculator'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition ${activeTab === 'calculator' ? 'bg-[#F26522] text-white shadow-md shadow-orange-500/10' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
              >
                <Calculator className="w-5 h-5" />
                Kalkulator AI
              </button>
              <button 
                onClick={() => { setActiveTab('tracking'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition ${activeTab === 'tracking' ? 'bg-[#F26522] text-white shadow-md shadow-orange-500/10' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
              >
                <Activity className="w-5 h-5" />
                Śledzenie Live
              </button>
              <button 
                onClick={() => { setActiveTab('orders'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition ${activeTab === 'orders' ? 'bg-[#F26522] text-white shadow-md shadow-orange-500/10' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
              >
                <ListOrdered className="w-5 h-5" />
                Moje Zlecenia
                {orders.length > 0 && (
                  <span className="ml-auto bg-slate-800 text-[#F26522] text-[10px] px-2 py-0.5 rounded-full font-bold">{orders.length}</span>
                )}
              </button>
              <button 
                onClick={() => { setActiveTab('eco'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition ${activeTab === 'eco' ? 'bg-[#F26522] text-white shadow-md shadow-orange-500/10' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
              >
                <Leaf className="w-5 h-5" />
                Panel Ekologiczny
              </button>
            </nav>
          ) : (
            <nav className="p-4 space-y-1">
              <div className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Panel Administratora</div>
              <button 
                onClick={() => { setActiveAdminTab('clients'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition ${activeAdminTab === 'clients' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
              >
                <Users className="w-5 h-5" />
                Klienci B2B
              </button>
              <button 
                onClick={() => { setActiveAdminTab('rates'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition ${activeAdminTab === 'rates' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
              >
                <Sliders className="w-5 h-5" />
                Cenniki i Dopłaty
              </button>
              <button 
                onClick={() => { setActiveAdminTab('fleet'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition ${activeAdminTab === 'fleet' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
              >
                <Activity className="w-5 h-5" />
                Kontrola Floty
              </button>
            </nav>
          )}
        </div>

        {/* User Card with Tenant Switcher */}
        <div className="p-4 border-t border-slate-800 bg-[#06101E] space-y-3">
          {!isAdmin && clients.length > 0 && (
            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Przełącz profil B2B</label>
              <select
                value={selectedClient?.id || ''}
                onChange={(e) => {
                  const cli = clients.find(c => c.id === e.target.value);
                  if (cli) setSelectedClient(cli);
                }}
                className="w-full bg-[#050D1A] border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-300 font-bold focus:border-[#F26522] outline-none"
              >
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-white shrink-0">
              <User className="w-5 h-5 text-slate-300" />
            </div>
            <div className="min-w-0 flex-1">
              {isAdmin ? (
                <>
                  <span className="text-xs font-bold block text-white">Administrator Systemu</span>
                  <span className="text-[10px] text-[#F26522] font-black uppercase">Northgate Staff</span>
                </>
              ) : (
                <>
                  <span className="text-xs font-bold block text-white truncate">{selectedClient?.name || 'Wczytywanie...'}</span>
                  <span className="text-[10px] text-slate-400">ID: {selectedClient?.id}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* TOP NAVBAR */}
        <header className="h-16 border-b border-slate-800 bg-[#0A1628]/50 backdrop-blur px-4 md:px-8 flex justify-between items-center shrink-0">
          <h2 className="text-xs md:text-sm font-bold tracking-wider text-slate-400 uppercase">
            {!isAdmin ? (
              <>
                {activeTab === 'calculator' && 'Inteligentny Asystent Wycen'}
                {activeTab === 'tracking' && 'Monitorowanie Telemetryczne Pojazdów'}
                {activeTab === 'orders' && 'Baza Aktywnych Zamówień'}
                {activeTab === 'eco' && 'Raporty Oszczędności CO₂'}
              </>
            ) : (
              <>
                {activeAdminTab === 'clients' && 'Zarządzanie Profilami Klientów B2B'}
                {activeAdminTab === 'rates' && 'Globalny Cennik Usług'}
                {activeAdminTab === 'fleet' && 'Konsola Telemetrii i Monitoringu Floty'}
              </>
            )}
          </h2>

          <div className="flex items-center gap-4 text-[10px] md:text-xs font-bold">
            {/* Role Switcher */}
            <button
              onClick={() => {
                setIsAdmin(!isAdmin);
                setIsMobileMenuOpen(false);
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-bold hover:bg-slate-800 hover:text-white transition flex items-center gap-2"
            >
              {isAdmin ? (
                <>
                  <User className="w-3.5 h-3.5 text-orange-400" />
                  Widok Klienta
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-[#F26522]" />
                  Panel Admina
                </>
              )}
            </button>
            
            <span className="hidden sm:flex items-center gap-2 text-slate-400">
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
              Serwer AI Online
            </span>
          </div>
        </header>

        {/* CONTENT AREA */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
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

          {adminSuccess && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="bg-orange-950/80 border border-orange-500/50 text-orange-300 px-6 py-4 rounded-xl mb-6 flex items-center gap-3 shadow-lg"
            >
              <CheckCircle2 className="w-6 h-6 shrink-0 text-orange-400" />
              <div>
                <p className="font-bold">Akcja administratora powiodła się</p>
                <p className="text-xs text-orange-400/80">{adminSuccess}</p>
              </div>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            
            {/* CLIENT CALCULATOR TAB */}
            {!isAdmin && activeTab === 'calculator' && (
              <motion.div 
                key="calculator"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div>
                  <h1 className="text-3xl font-black text-white">Kalkulator Wycen i Tras AI</h1>
                  <p className="text-sm text-slate-400">Optymalizuj trasę, szacuj koszty i redukuj emisje CO₂ z pomocą asystenta Gemini.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Controls */}
                  <div className="lg:col-span-1 space-y-4">
                    
                    {/* Cargo options */}
                    <div className="bg-[#0A1628] border border-slate-800 rounded-xl p-5 space-y-4">
                      <h3 className="text-xs font-black tracking-widest text-[#F26522] uppercase">1. Typ Ładunku</h3>
                      <div className="space-y-2">
                        {cargoOptions.map((opt) => {
                          const isAllowed = selectedClient?.allowedCargoTypes.includes(opt.id) ?? true;
                          return (
                            <button
                              key={opt.id}
                              disabled={!isAllowed}
                              onClick={() => setCargoType(opt.id)}
                              className={`w-full text-left p-3 rounded-lg border-2 transition relative ${!isAllowed ? 'opacity-30 cursor-not-allowed border-slate-900 bg-slate-950/20' : cargoType === opt.id ? 'border-[#F26522] bg-[#F26522]/5 text-white' : 'border-slate-800 bg-[#050D1A] text-slate-400 hover:border-slate-700'}`}
                            >
                              <div className="flex items-center gap-3 mb-1">
                                <opt.icon className={`w-5 h-5 ${cargoType === opt.id ? 'text-[#F26522]' : 'text-slate-500'}`} />
                                <span className="text-xs font-bold text-slate-200">{opt.label}</span>
                              </div>
                              <p className="text-[10px] text-slate-500 pl-8">{opt.desc}</p>
                              {!isAllowed && (
                                <span className="absolute right-2 top-2 text-[8px] bg-red-950 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded font-black uppercase">Zablokowane</span>
                              )}
                            </button>
                          );
                        })}
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

                      {/* Display current Client Discounts summary */}
                      {selectedClient && (
                        <div className="bg-[#050D1A] border border-slate-900 rounded-lg p-3 text-[10px] space-y-1 text-slate-400">
                          <span className="font-bold text-[#F26522] uppercase block">Aktywne rabaty klienta:</span>
                          <div className="flex justify-between"><span>Drogowe:</span><span className="font-bold text-emerald-400">-{selectedClient.discountRoad}%</span></div>
                          <div className="flex justify-between"><span>Kolejowe:</span><span className="font-bold text-emerald-400">-{selectedClient.discountRail}%</span></div>
                          <div className="flex justify-between"><span>Morskie:</span><span className="font-bold text-emerald-400">-{selectedClient.discountSea}%</span></div>
                        </div>
                      )}

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
                                      <span className="text-[10px] text-slate-500 block">Koszt (indywidualny)</span>
                                      <span className="text-lg font-black text-white">{opt.cost.toLocaleString('pl-PL')} PLN</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 border-t border-slate-800/80 pt-2">
                                      <div>
                                        <span className="text-[10px] text-slate-500 uppercase block">Czas</span>
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

            {/* CLIENT TRACKING TAB */}
            {!isAdmin && activeTab === 'tracking' && (
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
                            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping"></span>
                            Pozycja Pojazdu GPS (Live Map)
                          </h3>
                          <span className="text-[10px] text-slate-400">Trasa: {trackingData.from} &rarr; {trackingData.destination}</span>
                        </div>

                        {/* Interactive map */}
                        <div className="h-[280px] bg-[#050D1A] rounded-lg border border-slate-900 relative">
                          <svg className="w-full h-full text-slate-800" viewBox="0 0 500 300">
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
                                  <circle cx={coords.x} cy={coords.y} r="16" fill="#F26522" className="opacity-25 animate-ping" style={{ transformOrigin: `${coords.x}px ${coords.y}px` }} />
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
                              {Number(trackingData.telemetry.temperature) > Number(trackingData.telemetry.targetTemperature) + 2 ? (
                                <span className="bg-red-950 text-red-400 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase animate-pulse">ALARM</span>
                              ) : (
                                <span className="bg-emerald-950 text-emerald-400 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">Norma</span>
                              )}
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

            {/* CLIENT ORDERS TAB */}
            {!isAdmin && activeTab === 'orders' && (
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
                        {orders.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-slate-500 font-bold">
                              Brak aktywnych zleceń dla tego profilu klienta. Zarezerwuj transport w kalkulatorze AI.
                            </td>
                          </tr>
                        ) : (
                          orders.map((ord, idx) => (
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
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* CLIENT ECO TAB */}
            {!isAdmin && activeTab === 'eco' && (
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

            {/* ADMIN CLIENTS TAB */}
            {isAdmin && activeAdminTab === 'clients' && (
              <motion.div 
                key="admin-clients"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div>
                  <h1 className="text-3xl font-black text-white">Klienci B2B</h1>
                  <p className="text-sm text-slate-400">Definiuj profile klientów, przydzielaj indywidualne zniżki na transport oraz kontroluj dozwolone typy ładunków.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left form: Add client */}
                  <div className="bg-[#0A1628] border border-slate-800 rounded-xl p-5 space-y-4">
                    <h3 className="text-xs font-black tracking-widest text-[#F26522] uppercase">Nowy profil klienta</h3>
                    
                    <form onSubmit={handleAddClient} className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Nazwa Firmy</label>
                        <input
                          type="text"
                          required
                          placeholder="np. Biedronka Polska S.A."
                          value={newClientName}
                          onChange={(e) => setNewClientName(e.target.value)}
                          className="w-full bg-[#050D1A] border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:border-[#F26522] outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Rabat Drogowy (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={newClientDiscountRoad}
                            onChange={(e) => setNewClientDiscountRoad(e.target.value)}
                            className="w-full bg-[#050D1A] border border-slate-800 rounded-lg p-2 text-xs text-white focus:border-[#F26522] outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Rabat Kolejowy (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={newClientDiscountRail}
                            onChange={(e) => setNewClientDiscountRail(e.target.value)}
                            className="w-full bg-[#050D1A] border border-slate-800 rounded-lg p-2 text-xs text-white focus:border-[#F26522] outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Rabat Morski (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={newClientDiscountSea}
                            onChange={(e) => setNewClientDiscountSea(e.target.value)}
                            className="w-full bg-[#050D1A] border border-slate-800 rounded-lg p-2 text-xs text-white focus:border-[#F26522] outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Zakres dozwolonych usług</label>
                        <div className="space-y-2 text-xs">
                          {cargoOptions.map(opt => (
                            <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={newClientAllowedCargo.includes(opt.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNewClientAllowedCargo([...newClientAllowedCargo, opt.id]);
                                  } else {
                                    setNewClientAllowedCargo(newClientAllowedCargo.filter(id => id !== opt.id));
                                  }
                                }}
                                className="w-4 h-4 rounded text-orange-600 bg-[#050D1A] border-slate-800"
                              />
                              <span className="text-slate-300 font-semibold">{opt.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold py-3 rounded-lg uppercase tracking-wider transition flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Utwórz Profil
                      </button>
                    </form>
                  </div>

                  {/* Right list: Clients table */}
                  <div className="lg:col-span-2 bg-[#0A1628] border border-slate-800 rounded-xl p-5">
                    <h3 className="text-xs font-black tracking-widest text-[#F26522] uppercase mb-4">Wykaz zdefiniowanych klientów</h3>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-900/50 border-b border-slate-800 text-slate-400 font-black uppercase tracking-wider">
                            <th className="p-3">Nazwa Firmy</th>
                            <th className="p-3">Rabat (Drogi / Kolej / Morze)</th>
                            <th className="p-3">Dozwolone cargo</th>
                            <th className="p-3 text-center">Akcja</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {clients.map(cli => (
                            <tr key={cli.id} className="hover:bg-slate-900/20 text-slate-300">
                              <td className="p-3 font-bold text-white">{cli.name}</td>
                              <td className="p-3 font-mono">
                                <span className="text-slate-400">{cli.discountRoad}%</span> /{' '}
                                <span className="text-emerald-400">{cli.discountRail}%</span> /{' '}
                                <span className="text-blue-400">{cli.discountSea}%</span>
                              </td>
                              <td className="p-3 text-[10px] font-bold text-slate-400 uppercase">
                                {cli.allowedCargoTypes.map(c => c === 'palette' ? 'Palety' : c === 'cold' ? 'Chłodnia' : 'Gabaryty').join(', ')}
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => handleDeleteClient(cli.id)}
                                  disabled={clients.length <= 1}
                                  className="text-rose-400 hover:text-rose-300 disabled:opacity-30 disabled:cursor-not-allowed transition p-1"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ADMIN RATES TAB */}
            {isAdmin && activeAdminTab === 'rates' && (
              <motion.div 
                key="admin-rates"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div>
                  <h1 className="text-3xl font-black text-white">Ustawienia stawek i dopłat</h1>
                  <p className="text-sm text-slate-400">Konfiguruj cennik podstawowy oraz dodatkowe dopłaty specjalistyczne uwzględniane przez silnik AI.</p>
                </div>

                <form onSubmit={handleUpdateRates} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Base rates configuration */}
                  <div className="bg-[#0A1628] border border-slate-800 rounded-xl p-5 space-y-4">
                    <h3 className="text-xs font-black tracking-widest text-[#F26522] uppercase">1. Koszt bazowy za kilometr</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <label className="text-slate-300 font-bold">Transport drogowy (PLN/km)</label>
                          <span className="font-mono text-orange-400 font-bold">{editedRates.roadBase} PLN</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          step="0.1"
                          value={editedRates.roadBase}
                          onChange={(e) => setEditedRates({ ...editedRates, roadBase: Number(e.target.value) })}
                          className="w-full accent-[#F26522]"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <label className="text-slate-300 font-bold">Transport kolejowy (PLN/km)</label>
                          <span className="font-mono text-orange-400 font-bold">{editedRates.railBase} PLN</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="8"
                          step="0.1"
                          value={editedRates.railBase}
                          onChange={(e) => setEditedRates({ ...editedRates, railBase: Number(e.target.value) })}
                          className="w-full accent-[#F26522]"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <label className="text-slate-300 font-bold">Transport morski (PLN/km)</label>
                          <span className="font-mono text-orange-400 font-bold">{editedRates.seaBase} PLN</span>
                        </div>
                        <input
                          type="range"
                          min="0.2"
                          max="5"
                          step="0.1"
                          value={editedRates.seaBase}
                          onChange={(e) => setEditedRates({ ...editedRates, seaBase: Number(e.target.value) })}
                          className="w-full accent-[#F26522]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Surcharges configuration */}
                  <div className="bg-[#0A1628] border border-slate-800 rounded-xl p-5 space-y-4 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xs font-black tracking-widest text-[#F26522] uppercase mb-4">2. Dopłaty specjalne (%)</h3>
                      
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <label className="text-slate-300 font-bold">Łańcuch chłodniczy (Chłodnia)</label>
                            <span className="font-mono text-orange-400 font-bold">+{editedRates.coldSurcharge}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={editedRates.coldSurcharge}
                            onChange={(e) => setEditedRates({ ...editedRates, coldSurcharge: Number(e.target.value) })}
                            className="w-full accent-[#F26522]"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <label className="text-slate-300 font-bold">Ładunki niebezpieczne (ADR)</label>
                            <span className="font-mono text-orange-400 font-bold">+{editedRates.adrSurcharge}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={editedRates.adrSurcharge}
                            onChange={(e) => setEditedRates({ ...editedRates, adrSurcharge: Number(e.target.value) })}
                            className="w-full accent-[#F26522]"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <label className="text-slate-300 font-bold">Dostawa ekspresowa (ASAP)</label>
                            <span className="font-mono text-orange-400 font-bold">+{editedRates.expressSurcharge}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={editedRates.expressSurcharge}
                            onChange={(e) => setEditedRates({ ...editedRates, expressSurcharge: Number(e.target.value) })}
                            className="w-full accent-[#F26522]"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full mt-6 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold py-3 rounded-lg uppercase tracking-wider transition flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Zapisz konfigurację cennika
                    </button>
                  </div>

                </form>
              </motion.div>
            )}

            {/* ADMIN FLEET TAB */}
            {isAdmin && activeAdminTab === 'fleet' && (
              <motion.div 
                key="admin-fleet"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div>
                  <h1 className="text-3xl font-black text-white">Podgląd Telemetrii i Zleceń Floty</h1>
                  <p className="text-sm text-slate-400">Śledź aktualne zlecenia i telemetryczne statusy pojazdów. Możesz ręcznie zmienić parametry (np. wywołać alarm temperatury lub opóźnienie), by zaprezentować działanie systemu.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left: Table with active fleet orders */}
                  <div className="lg:col-span-2 bg-[#0A1628] border border-slate-800 rounded-xl p-5">
                    <h3 className="text-xs font-black tracking-widest text-[#F26522] uppercase mb-4">Aktywne transporty</h3>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-900/50 border-b border-slate-800 text-slate-400 font-black uppercase tracking-wider">
                            <th className="p-3">Zlecenie</th>
                            <th className="p-3">Kierowca / Pojazd</th>
                            <th className="p-3">Postęp</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-center">Edytuj</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {allOrders.map((ord) => (
                            <tr key={ord.id} className="hover:bg-slate-900/20 text-slate-300">
                              <td className="p-3">
                                <span className="font-mono font-bold text-white block">{ord.id}</span>
                                <span className="text-[10px] text-slate-400 block">{ord.from} &rarr; {ord.to}</span>
                              </td>
                              <td className="p-3">
                                <span className="block font-bold">{ord.driverName}</span>
                                <span className="text-[10px] text-slate-400 block font-mono">{ord.vehiclePlate}</span>
                              </td>
                              <td className="p-3 font-mono">{ord.progress}%</td>
                              <td className="p-3">
                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${ord.status === 'Dostarczono' ? 'bg-emerald-950 text-emerald-400' : ord.status === 'W drodze' ? 'bg-amber-950 text-amber-400 animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
                                  {ord.status}
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => setSelectedFleetOrder({ ...ord })}
                                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded text-[10px] font-bold transition uppercase"
                                >
                                  Konfiguruj
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right: Telemetry adjustment form */}
                  <div>
                    {selectedFleetOrder ? (
                      <div className="bg-[#0A1628] border border-slate-800 rounded-xl p-5 space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                          <h3 className="text-xs font-black tracking-widest text-[#F26522] uppercase">
                            Edycja Zlecenia {selectedFleetOrder.id}
                          </h3>
                          <button 
                            onClick={() => setSelectedFleetOrder(null)}
                            className="text-slate-400 hover:text-white"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <form onSubmit={handleUpdateFleetOrder} className="space-y-4 text-xs">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Status Dostawy</label>
                            <select
                              value={selectedFleetOrder.status}
                              onChange={(e) => setSelectedFleetOrder({ ...selectedFleetOrder, status: e.target.value })}
                              className="w-full bg-[#050D1A] border border-slate-800 rounded p-2 text-white font-bold outline-none"
                            >
                              <option value="Zarejestrowano">Zarejestrowano</option>
                              <option value="Odprawa celna">Odprawa celna</option>
                              <option value="W drodze">W drodze</option>
                              <option value="Dostarczono">Dostarczono</option>
                            </select>
                          </div>

                          <div>
                            <div className="flex justify-between mb-1">
                              <label className="text-[9px] font-bold text-slate-400 uppercase block">Postęp trasy (%)</label>
                              <span className="font-mono text-orange-400 font-bold">{selectedFleetOrder.progress}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={selectedFleetOrder.progress}
                              onChange={(e) => setSelectedFleetOrder({ ...selectedFleetOrder, progress: Number(e.target.value) })}
                              className="w-full accent-[#F26522]"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Kierowca</label>
                              <input
                                type="text"
                                value={selectedFleetOrder.driverName}
                                onChange={(e) => setSelectedFleetOrder({ ...selectedFleetOrder, driverName: e.target.value })}
                                className="w-full bg-[#050D1A] border border-slate-800 rounded p-2 text-white outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Tablice rejestracyjne</label>
                              <input
                                type="text"
                                value={selectedFleetOrder.vehiclePlate}
                                onChange={(e) => setSelectedFleetOrder({ ...selectedFleetOrder, vehiclePlate: e.target.value })}
                                className="w-full bg-[#050D1A] border border-slate-800 rounded p-2 text-white font-mono outline-none"
                              />
                            </div>
                          </div>

                          {selectedFleetOrder.type === 'cold' && (
                            <div className="bg-[#050D1A] border border-slate-900 rounded-lg p-3 space-y-3">
                              <span className="font-bold text-[#F26522] text-[9px] uppercase block">Telemetria Kontenera Chłodni</span>
                              
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[8px] font-bold text-slate-500 uppercase block mb-1">Temperatura (°C)</label>
                                  <input
                                    type="text"
                                    value={selectedFleetOrder.telemetry.temperature}
                                    onChange={(e) => setSelectedFleetOrder({
                                      ...selectedFleetOrder,
                                      telemetry: { ...selectedFleetOrder.telemetry, temperature: e.target.value }
                                    })}
                                    className="w-full bg-[#0B1424] border border-slate-800 rounded p-2 text-white outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-[8px] font-bold text-slate-500 uppercase block mb-1">Wilgotność (%)</label>
                                  <input
                                    type="text"
                                    value={selectedFleetOrder.telemetry.humidity}
                                    onChange={(e) => setSelectedFleetOrder({
                                      ...selectedFleetOrder,
                                      telemetry: { ...selectedFleetOrder.telemetry, humidity: e.target.value }
                                    })}
                                    className="w-full bg-[#0B1424] border border-slate-800 rounded p-2 text-white outline-none"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="bg-[#050D1A] border border-slate-900 rounded-lg p-3">
                            <label className="text-[8px] font-bold text-slate-500 uppercase block mb-1">Poziom Paliwa Agregatu (%)</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={selectedFleetOrder.telemetry.fuelLevel}
                              onChange={(e) => setSelectedFleetOrder({
                                ...selectedFleetOrder,
                                telemetry: { ...selectedFleetOrder.telemetry, fuelLevel: e.target.value }
                              })}
                              className="w-full bg-[#0B1424] border border-slate-800 rounded p-2 text-white outline-none"
                            />
                          </div>

                          <button
                            type="submit"
                            className="w-full bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold py-3 rounded-lg uppercase tracking-wider transition flex items-center justify-center gap-2"
                          >
                            <Save className="w-4 h-4" />
                            Aktualizuj Status i Sensory
                          </button>
                        </form>
                      </div>
                    ) : (
                      <div className="border border-dashed border-slate-800 rounded-xl p-5 flex flex-col items-center justify-center space-y-4 h-64 bg-slate-900/10 text-center">
                        <Activity className="w-10 h-10 text-slate-700" />
                        <h4 className="text-xs font-bold text-slate-500">Brak zaznaczonego pojazdu</h4>
                        <p className="text-[10px] text-slate-600 max-w-xs">Wybierz pojazd z tabeli obok i kliknij "Konfiguruj", aby dostosować status, telemetryczne czujniki chłodni lub postęp transportu na mapie.</p>
                      </div>
                    )}
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
