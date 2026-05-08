import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// Simple in-memory cache to store translations
const translationCache: Record<string, string> = {};

export async function translateBatch(texts: string[], targetLang: string): Promise<string[]> {
  if (!texts.length || !targetLang) return texts;
  
  const results: string[] = new Array(texts.length).fill('');
  const toTranslate: { text: string; index: number }[] = [];

  // Check cache first
  texts.forEach((text, index) => {
    const cacheKey = `${targetLang}:${text}`;
    if (translationCache[cacheKey]) {
      results[index] = translationCache[cacheKey];
    } else {
      toTranslate.push({ text, index });
    }
  });

  if (toTranslate.length === 0) return results;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Translate the following list of strings into ${targetLang}. 
      Return a JSON array of strings in the exact same order.
      Keep the word "Arzoni" as is, do not translate it.
      
      Strings to translate:
      ${JSON.stringify(toTranslate.map(t => t.text))}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    
    const translatedArray = JSON.parse(response.text || '[]');
    
    if (Array.isArray(translatedArray)) {
      translatedArray.forEach((translatedText, i) => {
        if (i < toTranslate.length) {
          const originalIndex = toTranslate[i].index;
          const originalText = toTranslate[i].text;
          results[originalIndex] = translatedText;
          // Cache the result
          translationCache[`${targetLang}:${originalText}`] = translatedText;
        }
      });
    }
  } catch (error) {
    console.warn("Translation batch error (falling back to original):", error);
    // Fallback: fill remaining results with original text
    toTranslate.forEach(({ text, index }) => {
      results[index] = text;
    });
  }

  return results;
}

export async function translateText(text: string, targetLang: string): Promise<string> {
  const [result] = await translateBatch([text], targetLang);
  return result;
}

export interface TranslatedReview {
  lang: string;
  title: string;
  text: string;
}

export interface TranslationResult {
  detectedLang: string;
  translations: TranslatedReview[];
}

/**
 * Detects the original language and translates a review into all other supported languages (uz, ru, en).
 */
export async function translateReviewFull(
  title: string, 
  text: string, 
  providedLang?: string
): Promise<TranslationResult> {
  const allLangs = ['uz', 'ru', 'en'];

  try {
    const prompt = `You are a translation assistant for "Arzoni", a local discovery app.
    Tasks:
    1. Detect the original language of the following review (it will likely be Uzbek, Russian, or English).
    2. Translate the review into all of these languages: ${allLangs.join(', ')}.
    
    Review Content:
    Title: "${title}"
    Text: "${text}"
    Suggested Original Language (for context): ${providedLang || 'unknown'}
    
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
    if (!result.detectedLang) result.detectedLang = providedLang || 'uz';
    if (!result.translations) result.translations = [];
    
    return result as TranslationResult;
  } catch (error) {
    console.error("Full review translation failed:", error);
    return { detectedLang: providedLang || 'uz', translations: [] };
  }
}
