import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Gemini
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

  // In-memory Database
  let clients = [
    { id: 'cli-1', name: 'Logistyka Sp. z o.o.', discountRoad: 5, discountRail: 15, discountSea: 10, allowedCargoTypes: ['palette', 'cold', 'oversized'] },
    { id: 'cli-2', name: 'Pol-Trans S.A.', discountRoad: 0, discountRail: 5, discountSea: 5, allowedCargoTypes: ['palette', 'cold'] },
    { id: 'cli-3', name: 'EkoDystrybucja Sp. z o.o.', discountRoad: 10, discountRail: 25, discountSea: 15, allowedCargoTypes: ['palette'] }
  ];

  let rates = {
    roadBase: 3.5, // PLN/km
    railBase: 2.2, // PLN/km
    seaBase: 1.1,  // PLN/km
    coldSurcharge: 25, // %
    adrSurcharge: 20,  // %
    expressSurcharge: 15 // %
  };

  let orders = [
    { id: 'NG-83749', clientId: 'cli-1', from: 'Gdańsk', to: 'Warszawa', date: '2026-06-06', type: 'cold', mode: 'road', status: 'W drodze', driverName: 'Jan Kowalski', vehiclePlate: 'WI 78291', progress: 75, telemetry: { temperature: '-18.4', targetTemperature: '-18.0', humidity: '65', fuelLevel: '72' } },
    { id: 'NG-19283', clientId: 'cli-2', from: 'Wrocław', to: 'Hamburg', date: '2026-06-05', type: 'oversized', mode: 'rail', status: 'Zarejestrowano', driverName: 'Mariusz Nowak', vehiclePlate: 'PO 94812', progress: 15, telemetry: { temperature: '12.0', targetTemperature: '12.0', humidity: '55', fuelLevel: '95' } },
    { id: 'NG-93821', clientId: 'cli-1', from: 'Katowice', to: 'Rotterdam', date: '2026-06-01', type: 'palette', mode: 'sea', status: 'Dostarczono', driverName: 'Andrzej Wiśniewski', vehiclePlate: 'GD 3721A', progress: 100, telemetry: { temperature: '21.0', targetTemperature: '20.0', humidity: '45', fuelLevel: '10' } }
  ];

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Client list (Client & Admin)
  app.get("/api/admin/clients", (req, res) => {
    res.json(clients);
  });

  // Add client (Admin)
  app.post("/api/admin/clients", (req, res) => {
    const { name, discountRoad, discountRail, discountSea, allowedCargoTypes } = req.body;
    const newClient = {
      id: `cli-${Date.now()}`,
      name,
      discountRoad: Number(discountRoad) || 0,
      discountRail: Number(discountRail) || 0,
      discountSea: Number(discountSea) || 0,
      allowedCargoTypes: allowedCargoTypes || ['palette']
    };
    clients.push(newClient);
    res.status(201).json(newClient);
  });

  // Delete client (Admin)
  app.delete("/api/admin/clients/:id", (req, res) => {
    clients = clients.filter(c => c.id !== req.params.id);
    res.json({ message: "Client deleted" });
  });

  // Get current rates (Admin & Client)
  app.get("/api/admin/rates", (req, res) => {
    res.json(rates);
  });

  // Update rates (Admin)
  app.put("/api/admin/rates", (req, res) => {
    const { roadBase, railBase, seaBase, coldSurcharge, adrSurcharge, expressSurcharge } = req.body;
    rates = {
      roadBase: Number(roadBase) ?? rates.roadBase,
      railBase: Number(railBase) ?? rates.railBase,
      seaBase: Number(seaBase) ?? rates.seaBase,
      coldSurcharge: Number(coldSurcharge) ?? rates.coldSurcharge,
      adrSurcharge: Number(adrSurcharge) ?? rates.adrSurcharge,
      expressSurcharge: Number(expressSurcharge) ?? rates.expressSurcharge
    };
    res.json(rates);
  });

  // Get all orders (Admin & Client)
  app.get("/api/orders", (req, res) => {
    const { clientId } = req.query;
    if (clientId) {
      res.json(orders.filter(o => o.clientId === clientId));
    } else {
      res.json(orders);
    }
  });

  // Add order (Client booking)
  app.post("/api/orders", (req, res) => {
    const { id, clientId, from, to, date, type, mode } = req.body;
    
    // Choose random driver and vehicle details
    const drivers = ["Jan Kowalski", "Mariusz Nowak", "Andrzej Wiśniewski", "Krzysztof Wójcik"];
    const plates = ["WI 78291", "PO 94812", "GD 3721A", "KR 5892C"];
    const randomIndex = Math.floor(Math.random() * drivers.length);
    
    const newOrder = {
      id,
      clientId,
      from,
      to,
      date,
      type,
      mode,
      status: 'Zarejestrowano',
      driverName: drivers[randomIndex],
      vehiclePlate: plates[randomIndex],
      progress: 10,
      telemetry: {
        temperature: type === 'cold' ? '-18.0' : '20.0',
        targetTemperature: type === 'cold' ? '-18.0' : '20.0',
        humidity: '60',
        fuelLevel: '95'
      }
    };
    orders.push(newOrder);
    res.status(201).json(newOrder);
  });

  // Update order (Admin fleet update)
  app.put("/api/admin/orders/:id", (req, res) => {
    const orderId = req.params.id;
    const { status, progress, driverName, vehiclePlate, temperature, targetTemperature, humidity, fuelLevel } = req.body;
    
    const orderIndex = orders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) {
      return res.status(404).json({ error: "Order not found" });
    }

    orders[orderIndex] = {
      ...orders[orderIndex],
      status: status ?? orders[orderIndex].status,
      progress: Number(progress) ?? orders[orderIndex].progress,
      driverName: driverName ?? orders[orderIndex].driverName,
      vehiclePlate: vehiclePlate ?? orders[orderIndex].vehiclePlate,
      telemetry: {
        temperature: temperature ?? orders[orderIndex].telemetry.temperature,
        targetTemperature: targetTemperature ?? orders[orderIndex].telemetry.targetTemperature,
        humidity: humidity ?? orders[orderIndex].telemetry.humidity,
        fuelLevel: fuelLevel ?? orders[orderIndex].telemetry.fuelLevel
      }
    };

    res.json(orders[orderIndex]);
  });

  // Calculate AI quote endpoint
  app.post("/api/quote", async (req, res) => {
    const { cargoType, routeFrom, routeTo, date, weight, adr, clientId } = req.body;
    
    const client = clients.find(c => c.id === clientId) || clients[0];
    
    const prompt = `Jesteś ekspertem ds. logistyki w firmie Northgate Logistics. Zaproponuj optymalne metody transportu dla ładunku typu "${cargoType}" o wadze ${weight}t na trasie z "${routeFrom}" do "${routeTo}" z datą nadania: "${date}".
Ustawienia cennika bazowego:
- Transport drogowy: ${rates.roadBase} PLN/km
- Transport kolejowy: ${rates.railBase} PLN/km
- Transport morski: ${rates.seaBase} PLN/km

Dopłaty do transportu bazowego:
- Opłata za chłodnię: +${rates.coldSurcharge}%
- Opłata za ADR: +${rates.adrSurcharge}%
- Opłata ekspresowa (ASAP): +${rates.expressSurcharge}%

Indywidualne zniżki przypisane do profilu klienta "${client.name}":
- Zniżka drogowa: ${client.discountRoad}%
- Zniżka kolejowa: ${client.discountRail}%
- Zniżka morska: ${client.discountSea}%

Oblicz szacunkowe koszty w PLN (pomnóż dystans w km przez stawkę za km, uwzględnij dopłaty i zniżki klienta).
Porównaj dostępne środki transportu (np. drogowy, kolejowy, morski).
Oblicz szacunkowe koszty w PLN, czas trwania w dniach oraz ślad węglowy w kg CO2.
Rekomenduj najbardziej ekologiczną opcję lub najlepszy kompromis.
Wszystkie teksty (rekomendacja, zalety, wady) muszą być w języku polskim.`;

    try {
      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              route: { type: "STRING" },
              recommendedMode: { type: "STRING" }, // 'road', 'rail', 'sea'
              options: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    mode: { type: "STRING" }, // 'road', 'rail', 'sea'
                    modeLabel: { type: "STRING" }, // np. 'Drogowy (Standard)', 'Kolejowy (Eco)', 'Morski'
                    cost: { type: "NUMBER" }, // szacowany koszt w PLN
                    days: { type: "NUMBER" }, // szacowany czas w dniach
                    co2: { type: "NUMBER" }, // ślad węglowy w kg CO2
                    pros: { type: "ARRAY", items: { type: "STRING" } },
                    cons: { type: "ARRAY", items: { type: "STRING" } }
                  },
                  required: ["mode", "modeLabel", "cost", "days", "co2", "pros", "cons"]
                }
              },
              justification: { type: "STRING" } // Uzasadnienie w języku polskim
            },
            required: ["route", "recommendedMode", "options", "justification"]
          }
        }
      });

      const responseText = result.text;
      if (!responseText) {
        throw new Error("Pusta odpowiedź z Gemini");
      }
      
      const parsedData = JSON.parse(responseText);
      res.json(parsedData);
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      if (error.status === 429 || error.code === 429) {
        res.status(429).json({ error: "Usługa AI jest obecnie przeciążona. Prosimy spróbować ponownie za chwilę." });
      } else {
        res.status(500).json({ error: "Wystąpił błąd podczas generowania wyceny." });
      }
    }
  });

  app.get("/api/track/:id", (req, res) => {
    const trackingId = req.params.id;
    const order = orders.find(o => o.id === trackingId);
    
    if (order) {
      // Return order from in-memory DB
      // Coordinates simulation for map based on progress
      const routePath = [
        { name: "Punkt Nadania", lat: 52.2297, lng: 21.0122 }, // Warsaw
        { name: "Punkt Tranzytowy A", lat: 51.1079, lng: 17.0385 }, // Wroclaw
        { name: "Punkt Tranzytowy B", lat: 52.4064, lng: 16.9252 }, // Poznan
        { name: "Punkt Odbioru", lat: 53.5488, lng: 9.9872 } // Hamburg
      ];
      
      const segmentCount = routePath.length - 1;
      const positionInRoute = (order.progress / 100) * segmentCount;
      const currentSegmentIndex = Math.min(Math.floor(positionInRoute), segmentCount - 1);
      const segmentProgress = positionInRoute - currentSegmentIndex;
      
      const startNode = routePath[currentSegmentIndex];
      const endNode = routePath[currentSegmentIndex + 1];
      
      const currentLat = startNode.lat + (endNode.lat - startNode.lat) * segmentProgress;
      const currentLng = startNode.lng + (endNode.lng - startNode.lng) * segmentProgress;

      return res.json({
        ...order,
        destination: routePath[routePath.length - 1].name,
        eta: "2026-06-07 14:00",
        routePath,
        currentLocation: { lat: currentLat, lng: currentLng }
      });
    }

    // Fallback deterministic mock data if not in memory
    let sum = 0;
    for (let i = 0; i < trackingId.length; i++) {
      sum += trackingId.charCodeAt(i);
    }
    
    const statuses = ["Zarejestrowano", "Odprawa celna", "W drodze", "Dostarczono"];
    const statusIndex = sum % statuses.length;
    const progressMap = [15, 45, 75, 100];
    const progress = progressMap[statusIndex];
    
    const routePath = [
      { name: "Punkt Nadania", lat: 52.2297, lng: 21.0122 },
      { name: "Punkt Tranzytowy A", lat: 51.1079, lng: 17.0385 },
      { name: "Punkt Tranzytowy B", lat: 52.4064, lng: 16.9252 },
      { name: "Punkt Odbioru", lat: 53.5488, lng: 9.9872 }
    ];

    res.json({
      id: trackingId,
      status: statuses[statusIndex],
      progress,
      driverName: "Jan Kowalski",
      vehiclePlate: "WI 78291",
      location: routePath[0].name,
      destination: routePath[routePath.length - 1].name,
      eta: "2026-06-07 14:00",
      routePath,
      currentLocation: { lat: routePath[0].lat, lng: routePath[0].lng },
      telemetry: {
        temperature: "-18.2",
        targetTemperature: "-18.0",
        humidity: "65",
        fuelLevel: "90"
      }
    });
  });

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
