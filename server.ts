import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

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
    
    // Simple prompt for AI suggestion
    const prompt = `As a logistics expert for Northgate Logistics, suggest an optimal transport method (e.g., road, rail, sea) for a ${cargoType} shipment from ${routeFrom} to ${routeTo} on ${date}. Provide a cost-benefit analysis comparing road vs rail/eco, estimate carbon footprint for both, and give a brief justification. Return the answer in clear JSON format.`;

    try {
      const result = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      });

      res.json({ recommendation: result.text });
    } catch (error: any) {
      console.error(error);
      if (error.status === 429 || error.code === 429) {
        res.status(429).json({ error: "Usługa AI jest obecnie przeciążona. Prosimy spróbować ponownie za chwilę." });
      } else {
        res.status(500).json({ error: "Wystąpił błąd podczas generowania wyceny." });
      }
    }
  });

  app.get("/api/track/:id", (req, res) => {
    // Placeholder for real-time tracking
    res.json({ status: "In Transit", location: "Warehouse A", estimate: "2026-06-07" });
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
