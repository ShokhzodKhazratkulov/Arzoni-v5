import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

// Simple in-memory cache to store translations
const translationCache: Record<string, string> = {};

export async function translateBatch(texts: string[], targetLang: string): Promise<string[]> {
  if (!texts.length || !targetLang) return texts;
  
  // Mapping code to full names for Gemini
  const langMap: Record<string, string> = {
    'uz': 'Uzbek',
    'ru': 'Russian',
    'en': 'English'
  };

  const targetLangName = langMap[targetLang] || targetLang;
  
  const results: string[] = new Array(texts.length).fill('');
  const toTranslate: { text: string; index: number }[] = [];

  // Check cache first
  texts.forEach((text, index) => {
    if (!text) {
      results[index] = '';
      return;
    }
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
      contents: `Translate the following list of strings into ${targetLangName}. 
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
