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

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/quote", async (req, res) => {
    const { cargoType, routeFrom, routeTo, date } = req.body;
    
    const prompt = `Jesteś ekspertem ds. logistyki w firmie Northgate Logistics. Zaproponuj optymalne metody transportu dla ładunku typu "${cargoType}" na trasie z "${routeFrom}" do "${routeTo}" z datą nadania: "${date}".
Porównaj dostępne środki transportu (np. drogowy, kolejowy, morski, lotniczy). 
Oblicz szacunkowe koszty w PLN (np. 1000-15000 PLN w zależności od odległości i typu cargo), czas trwania w dniach oraz ślad węglowy w kg CO2.
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
              recommendedMode: { type: "STRING" }, // 'road', 'rail', 'sea', 'air'
              options: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    mode: { type: "STRING" }, // 'road', 'rail', 'sea', 'air'
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
    
    // Generate deterministic mock data based on trackingId hash
    let sum = 0;
    for (let i = 0; i < trackingId.length; i++) {
      sum += trackingId.charCodeAt(i);
    }
    
    const statuses = ["Zarejestrowano", "Odprawa celna", "W drodze", "Dostarczono"];
    const statusIndex = sum % statuses.length;
    const progressMap = [15, 45, 75, 100];
    const progress = progressMap[statusIndex];
    
    const drivers = ["Jan Kowalski", "Mariusz Nowak", "Andrzej Wiśniewski", "Krzysztof Wójcik"];
    const driver = drivers[sum % drivers.length];
    
    const vehiclePlates = ["WI 78291", "PO 94812", "GD 3721A", "KR 5892C"];
    const plate = vehiclePlates[sum % vehiclePlates.length];
    
    // Coordinates simulation for map
    const routePath = [
      { name: "Punkt Nadania", lat: 52.2297, lng: 21.0122 }, // Warsaw
      { name: "Punkt Tranzytowy A", lat: 51.1079, lng: 17.0385 }, // Wroclaw
      { name: "Punkt Tranzytowy B", lat: 52.4064, lng: 16.9252 }, // Poznan
      { name: "Punkt Odbioru", lat: 53.5488, lng: 9.9872 } // Hamburg
    ];
    
    const segmentCount = routePath.length - 1;
    const positionInRoute = (progress / 100) * segmentCount;
    const currentSegmentIndex = Math.min(Math.floor(positionInRoute), segmentCount - 1);
    const segmentProgress = positionInRoute - currentSegmentIndex;
    
    const startNode = routePath[currentSegmentIndex];
    const endNode = routePath[currentSegmentIndex + 1];
    
    const currentLat = startNode.lat + (endNode.lat - startNode.lat) * segmentProgress;
    const currentLng = startNode.lng + (endNode.lng - startNode.lng) * segmentProgress;

    res.json({
      id: trackingId,
      status: statuses[statusIndex],
      progress,
      driverName: driver,
      vehiclePlate: plate,
      location: routePath[currentSegmentIndex].name,
      destination: routePath[routePath.length - 1].name,
      eta: "2026-06-07 14:00",
      routePath,
      currentLocation: { lat: currentLat, lng: currentLng },
      telemetry: {
        temperature: (-18.2 - (sum % 3) + Math.sin(Date.now() / 100000) * 0.4).toFixed(1),
        targetTemperature: "-18.0",
        humidity: (65 + (sum % 10) + Math.cos(Date.now() / 100000) * 1.5).toFixed(0),
        fuelLevel: Math.max(10, 100 - (progress * 0.75)).toFixed(0)
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
