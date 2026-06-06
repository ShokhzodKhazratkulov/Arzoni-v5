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
    const apiResponse = await fetch('/api/ai/translate-batch', {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        texts: toTranslate.map(t => t.text),
        targetLang
      })
    });

    if (!apiResponse.ok) {
      throw new Error(`AI translate batch failed with status ${apiResponse.status}`);
    }

    const { translations } = await apiResponse.json();
    
    if (Array.isArray(translations)) {
      translations.forEach((translatedText, i) => {
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
  try {
    const apiResponse = await fetch('/api/ai/translate-review', {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title,
        text,
        language_code: providedLang
      })
    });

    if (!apiResponse.ok) {
      throw new Error(`AI translate review failed with status ${apiResponse.status}`);
    }

    const result = await apiResponse.json();
    return result as TranslationResult;
  } catch (error) {
    console.error("Full review translation failed:", error);
    return { detectedLang: providedLang || 'uz', translations: [] };
  }
}
