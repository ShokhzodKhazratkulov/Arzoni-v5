import { GoogleGenAI, Type } from "@google/genai";
import { supabase } from "../supabase";

const GEMINI_KEY = (import.meta as any).env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });

export async function resolveDishConcept(dishName: string, category: 'food' | 'clothes' = 'food'): Promise<string | null> {
  const normalizedInput = dishName.trim().toLowerCase();
  if (!normalizedInput || !GEMINI_KEY) return null;

  // 1. Try exact match in aliases first
  const { data: exactMatch } = await supabase
    .from('dish_aliases')
    .select('concept_id')
    .ilike('name', normalizedInput)
    .limit(1);

  if (exactMatch && exactMatch.length > 0) {
    return exactMatch[0].concept_id;
  }

  // 2. Fetch all current concepts to help Gemini decide
  const { data: allConcepts } = await supabase
    .from('dish_concepts')
    .select('id, canonical_name')
    .eq('category', category);

  const conceptContext = allConcepts?.map(c => `ID:${c.id} Name:${c.canonical_name}`).join(', ') || 'none';

  // 3. Use AI to match or suggest new concept
  try {
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

    if (!result.isNew && result.matchId && result.matchId !== 'new') {
      // It matched an existing concept, add this input as a new alias for future fast lookup
      await supabase.from('dish_aliases').insert([
        { concept_id: result.matchId, name: dishName, language_code: 'auto' }
      ]);
      
      return result.matchId;
    }

    if (result.isNew && result.canonical_name) {
      // Create new concept
      const { data: newConcept } = await supabase
        .from('dish_concepts')
        .insert([{ 
          canonical_name: result.canonical_name, 
          category: category,
          is_verified: false 
        }])
        .select()
        .single();

      if (newConcept && result.translations) {
        // Add translations as aliases
        const aliases = Object.entries(result.translations).map(([lang, name]) => ({
          concept_id: newConcept.id,
          name: name,
          language_code: lang
        }));
        
        // Add original input as well
        if (!Object.values(result.translations).some(v => (v as string).toLowerCase() === normalizedInput)) {
            aliases.push({ concept_id: newConcept.id, name: dishName, language_code: 'auto' });
        }

        await supabase.from('dish_aliases').insert(aliases);
        return newConcept.id;
      }
    }
  } catch (error) {
    console.error("Gemini Concept Resolution Error:", error);
  }

  return null;
}
