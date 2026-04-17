import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { translateText } from '../services/translationService';

interface TranslatedTextProps {
  text: string;
  className?: string;
  as?: 'p' | 'span' | 'h1' | 'h2' | 'h3' | 'h4' | 'div';
}

export default function TranslatedText({ text, className, as: Component = 'span' }: TranslatedTextProps) {
  const { i18n } = useTranslation();
  const [translated, setTranslated] = useState(text);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    async function doTranslate() {
      if (!text) return;
      
      // We only translate if we have a reasonably complex string
      // or if it's explicitly requested.
      // To prevent infinite loops or unnecessary calls, keep track of translated state
      
      setLoading(true);
      try {
        const result = await translateText(text, i18n.language);
        if (isMounted) {
          setTranslated(result);
        }
      } catch (error) {
        console.error("Translation failed", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    doTranslate();
    
    return () => { isMounted = false; };
  }, [text, i18n.language]);

  if (loading) {
    return (
      <Component className={className}>
        <span className="animate-pulse opacity-50">{text}</span>
      </Component>
    );
  }

  return <Component className={className}>{translated}</Component>;
}
