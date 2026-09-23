import { useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import type { NavSection } from './navConfig';

const storageKey = (title: string) => `nav-section-open:${title}`;

function readStored(title: string): boolean {
  try {
    return localStorage.getItem(storageKey(title)) === '1';
  } catch {
    return false;
  }
}

/**
 * Open/closed state of a collapsible nav section. Remembered per browser;
 * a section that contains the current route is always shown open so the
 * active item never hides behind a closed toggle.
 */
export function useNavSectionOpen(section: NavSection): { open: boolean; toggle: () => void } {
  const { pathname } = useLocation();
  const [stored, setStored] = useState(() => readStored(section.title));

  const containsActive = section.items.some(
    (i) => i.to !== '/' && (pathname === i.to || pathname.startsWith(`${i.to}/`)),
  );

  const toggle = useCallback(() => {
    setStored((prev) => {
      const next = !prev;
      try { localStorage.setItem(storageKey(section.title), next ? '1' : '0'); } catch { /* storage unavailable */ }
      return next;
    });
  }, [section.title]);

  return { open: !section.collapsible || stored || containsActive, toggle };
}
