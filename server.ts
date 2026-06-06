import { GoogleGenAI, Type } from "@google/genai";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

// Initialize Supabase Admin
const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize Gemini Client
const geminiApiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey: geminiApiKey });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", mode: process.env.NODE_ENV });
  });

  // POST /api/ai/resolve-dish
  app.post("/api/ai/resolve-dish", async (req, res) => {
    try {
      const { dishName, category } = req.body;
      if (!dishName) {
        return res.status(400).json({ error: "Missing dishName in request body" });
      }

      // Fetch all current concepts to help Gemini decide
      const { data: allConcepts, error: supabaseError } = await supabase
        .from('dish_concepts')
        .select('id, canonical_name')
        .eq('category', category || 'food');

      if (supabaseError) {
        console.error("Supabase fetch failed in resolve-dish:", supabaseError);
      }

      const conceptContext = allConcepts?.map(c => `ID:${c.id} Name:${c.canonical_name}`).join(', ') || 'none';

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `You are a food ontology expert for Uzbekistan. 
        Task: Map this user input: "${dishName}" (Language potentially UZ/RU/EN).
        
        Context: This is for a "Smart Search" in a food app. 
        Example: If input is "Karam sho'rva", it MUST match "cabbage-soup" if that exists.
        Existing concept IDs and their names: [${conceptContext}]. 
        
        1. If the input name refers to an existing concept in ANY language, return its ID.
        2. If it is a new dish, return "new" and provide high-quality translations for [uz, ru, en].
        
        Return JSON ONLY.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              matchId: { type: Type.STRING, description: "existing id or 'new'" },
              isNew: { type: Type.BOOLEAN },
              canonical_name: { type: Type.STRING, description: "suggested slug for new concept" },
              translations: {
                type: Type.OBJECT,
                properties: {
                  uz: { type: Type.STRING },
                  ru: { type: Type.STRING },
                  en: { type: Type.STRING }
                }
              }
            },
            required: ["matchId", "isNew"]
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      const conceptId = (!result.isNew && result.matchId && result.matchId !== 'new') ? result.matchId : null;

      res.json({
        ...result,
        conceptId
      });
    } catch (error) {
      console.error("resolve-dish endpoint failed:", error);
      res.status(500).json({ error: "AI service unavailable" });
    }
  });

  // POST /api/ai/translate-review
  app.post("/api/ai/translate-review", async (req, res) => {
    try {
      const { title, text, language_code } = req.body;
      const providedLang = language_code || 'uz';
      const allLangs = ['uz', 'ru', 'en'];

      const prompt = `You are a translation assistant for "Arzoni", a local discovery app.
      Tasks:
      1. Detect the original language of the following review (it will likely be Uzbek, Russian, or English).
      2. Translate the review into all of these languages: ${allLangs.join(', ')}.
      
      Review Content:
      Title: "${title || ''}"
      Text: "${text || ''}"
      Suggested Original Language (for context): ${providedLang}
      
      Return a JSON object with:
      - "detectedLang": The ISO 639-1 code of the original language (uz, ru, or en).
      - "translations": A JSON array of objects with keys: "lang", "title", "text". "lang" must be one of [uz, ru, en].
      
      Guidelines:
      - Preserve cultural context of Uzbek food (Osh, Somsa, Manti, Shashlik, etc.).
      - Keep "Arzoni" untranslated.
      - If a word is a specific dish name like "Osh", keep it for Uzbek/English, but use "Плов" for Russian where culturally appropriate, or transliterate if it's a specific brand/style.
      - The output MUST be valid JSON.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detectedLang: { type: Type.STRING },
              translations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    lang: { type: Type.STRING },
                    title: { type: Type.STRING },
                    text: { type: Type.STRING }
                  },
                  required: ["lang", "title", "text"]
                }
              }
            },
            required: ["detectedLang", "translations"]
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      if (!result.detectedLang) result.detectedLang = providedLang;
      if (!result.translations) result.translations = [];

      res.json(result);
    } catch (error) {
      console.error("translate-review endpoint failed:", error);
      res.status(500).json({ error: "AI service unavailable" });
    }
  });

  // POST /api/ai/translate-batch
  app.post("/api/ai/translate-batch", async (req, res) => {
    try {
      const { texts, targetLang } = req.body;
      if (!texts || !Array.isArray(texts) || texts.length === 0) {
        return res.json({ translations: [] });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Translate the following list of strings into ${targetLang || 'en'}. 
        Return a JSON array of strings in the exact same order.
        Keep the word "Arzoni" as is, do not translate it.
        
        Strings to translate:
        ${JSON.stringify(texts)}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });

      const translations = JSON.parse(response.text || '[]');
      res.json({ translations });
    } catch (error) {
      console.error("translate-batch endpoint failed:", error);
      res.status(500).json({ error: "AI service unavailable" });
    }
  });

  // Determine if we are in production
  const isProd = process.env.NODE_ENV === "production";

  if (isProd) {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    
    // SPA fallback
    app.get('*', (req, res) => {
      const indexPath = path.resolve(distPath, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error(`Error sending index.html from ${indexPath}:`, err);
          res.status(500).send("Application load error. Please try again later.");
        }
      });
    });
  } else {
    // In development, use Vite middleware
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { 
          middlewareMode: true,
          host: '0.0.0.0',
          port: 3000,
          hmr: process.env.DISABLE_HMR !== 'true'
        },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (error) {
      console.warn("Vite not found, falling back to static serving. Ensure NODE_ENV=production is set in production.");
      const distPath = path.resolve(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${isProd ? 'production' : 'development'} mode`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
