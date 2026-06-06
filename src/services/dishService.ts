import { supabase } from "../supabase";

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

  // 2. Use AI to match or suggest new concept values
  try {
    const apiResponse = await fetch('/api/ai/resolve-dish', {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ dishName, category })
    });

    if (!apiResponse.ok) {
      throw new Error(`AI resolve dish failed with status ${apiResponse.status}`);
    }

    const result = await apiResponse.json();

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
