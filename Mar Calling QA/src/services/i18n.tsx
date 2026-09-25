/**
 * EN / 中文.
 *
 * Deliberately tiny: a language in context, a `t({ en, zh })` helper, and a
 * toggle. Strings live next to the markup that uses them, so a screen and its
 * translation can never drift apart in separate files.
 *
 * Untranslated text falls back to English rather than showing a blank or a key.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Lang = 'en' | 'zh';
export interface Phrase {
  en: string;
  zh?: string;
}

const KEY = 'marcom-qa:lang';

interface LangValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
  t: (p: Phrase | string) => string;
}

const LangContext = createContext<LangValue | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === 'en' || saved === 'zh') return saved;
      return navigator.language.startsWith('zh') ? 'zh' : 'en';
    } catch {
      return 'en';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(KEY, lang);
    } catch {
      /* private mode — the choice just will not persist */
    }
    document.documentElement.lang = lang === 'zh' ? 'zh' : 'en';
  }, [lang]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);
  const t = useCallback((p: Phrase | string) => (typeof p === 'string' ? p : (lang === 'zh' && p.zh) || p.en), [lang]);
  const value = useMemo<LangValue>(() => ({ lang, setLang, toggle: () => setLangState((l) => (l === 'en' ? 'zh' : 'en')), t }), [lang, setLang, t]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used inside LangProvider');
  return ctx;
}

/** Shorthand for components that only need the translator. */
export const useT = () => useLang().t;

export function LangToggle() {
  const { lang, toggle } = useLang();
  return (
    <button className="btn btn-sm lang-toggle" onClick={toggle} aria-label={lang === 'en' ? '切换到中文' : 'Switch to English'} title={lang === 'en' ? '切换到中文' : 'Switch to English'}>
      🌐 {lang === 'en' ? '中文' : 'EN'}
    </button>
  );
}
