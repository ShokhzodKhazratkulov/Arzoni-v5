import { GoogleGenAI, Type } from "@google/genai";
import { supabase } from "../supabase";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function resolveDishConcept(dishName: string, category: 'food' | 'clothes' = 'food'): Promise<string | null> {
  const normalizedInput = dishName.trim().toLowerCase();
  if (!normalizedInput) return null;

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
      contents: `Associate this ${category} item: "${dishName}". 
      Existing concepts: [${conceptContext}]. 
      If it matches an existing concept (even in another language like RU/EN/UZ), return that ID. 
      If it's new, return "new" and suggest translations.
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
