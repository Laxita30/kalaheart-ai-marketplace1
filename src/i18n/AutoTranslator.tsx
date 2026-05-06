import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "INPUT", "TEXTAREA"]);
const SKIP_ATTR = "data-no-translate";

const cacheKey = (lang: string, text: string) => `tr:${lang}:${text}`;

function getCached(lang: string, text: string): string | null {
  try { return localStorage.getItem(cacheKey(lang, text)); } catch { return null; }
}
function setCached(lang: string, text: string, val: string) {
  try { localStorage.setItem(cacheKey(lang, text), val); } catch { /* quota */ }
}

function shouldSkip(node: Node): boolean {
  let el: Node | null = node;
  while (el && el !== document.body) {
    if (el.nodeType === 1) {
      const e = el as HTMLElement;
      if (SKIP_TAGS.has(e.tagName)) return true;
      if (e.hasAttribute(SKIP_ATTR)) return true;
      if (e.getAttribute("contenteditable") === "true") return true;
    }
    el = el.parentNode;
  }
  return false;
}

function collectTextNodes(root: Node): Text[] {
  const out: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      const txt = n.nodeValue?.trim();
      if (!txt) return NodeFilter.FILTER_REJECT;
      if (txt.length < 2) return NodeFilter.FILTER_REJECT;
      if (/^[\d\s.,$%₹€£+\-:/()#*x×]+$/.test(txt)) return NodeFilter.FILTER_REJECT;
      if (shouldSkip(n)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let cur: Node | null;
  while ((cur = walker.nextNode())) out.push(cur as Text);
  return out;
}

function collectAttrs(root: Element): Array<{ el: Element; attr: string; value: string }> {
  const out: Array<{ el: Element; attr: string; value: string }> = [];
  const all = root.querySelectorAll("[placeholder], [aria-label], [title], [alt]");
  all.forEach((el) => {
    if (shouldSkip(el)) return;
    ["placeholder", "aria-label", "title", "alt"].forEach((a) => {
      const v = el.getAttribute(a);
      if (v && v.trim().length >= 2) out.push({ el, attr: a, value: v });
    });
  });
  return out;
}

async function translateBatch(lang: string, items: string[]): Promise<string[]> {
  if (items.length === 0) return [];
  const { data, error } = await supabase.functions.invoke("translate", {
    body: { texts: items, targetLang: lang },
  });
  if (error || !data?.translations) return items;
  return data.translations as string[];
}

const AutoTranslator = () => {
  const { i18n } = useTranslation();
  const { pathname } = useLocation();
  const runIdRef = useRef(0);

  useEffect(() => {
    const lang = i18n.language.split("-")[0];
    runIdRef.current += 1;
    const myRun = runIdRef.current;

    if (lang === "en") {
      // English is the source language — nothing to do.
      return;
    }

    let cancelled = false;

    const run = async () => {
      // small debounce to allow page render
      await new Promise((r) => setTimeout(r, 250));
      if (cancelled || myRun !== runIdRef.current) return;

      const textNodes = collectTextNodes(document.body);
      const attrs = collectAttrs(document.body);

      // Apply cached translations immediately
      const missingTexts = new Set<string>();

      for (const tn of textNodes) {
        const original = tn.nodeValue!.trim();
        const cached = getCached(lang, original);
        if (cached) {
          tn.nodeValue = tn.nodeValue!.replace(original, cached);
        } else {
          missingTexts.add(original);
        }
      }
      for (const a of attrs) {
        const cached = getCached(lang, a.value);
        if (cached) {
          a.el.setAttribute(a.attr, cached);
        } else {
          missingTexts.add(a.value);
        }
      }

      // Batch missing
      const missing = Array.from(missingTexts);
      const BATCH = 40;
      for (let i = 0; i < missing.length; i += BATCH) {
        if (cancelled || myRun !== runIdRef.current) return;
        const chunk = missing.slice(i, i + BATCH);
        try {
          const translated = await translateBatch(lang, chunk);
          chunk.forEach((src, idx) => setCached(lang, src, translated[idx] ?? src));

          // re-apply newly cached values to DOM
          for (const tn of textNodes) {
            if (!tn.nodeValue) continue;
            const orig = tn.nodeValue.trim();
            if (chunk.includes(orig)) {
              const t = getCached(lang, orig);
              if (t) tn.nodeValue = tn.nodeValue.replace(orig, t);
            }
          }
          for (const a of attrs) {
            if (chunk.includes(a.value)) {
              const t = getCached(lang, a.value);
              if (t) a.el.setAttribute(a.attr, t);
            }
          }
        } catch {
          /* ignore batch failure */
        }
      }
    };

    run();

    // Re-run on DOM mutations (debounced)
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const observer = new MutationObserver(() => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (!cancelled && myRun === runIdRef.current) run();
      }, 600);
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [i18n.language, pathname]);

  return null;
};

export default AutoTranslator;