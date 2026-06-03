import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type Portfolio = 'simon_berger' | 'noa_collection' | 'noa_curation';

interface PortfolioContextValue {
  portfolio: Portfolio;
  setPortfolio: (p: Portfolio) => void;
}

const STORAGE_KEY = 'noa_active_portfolio';

function loadPortfolio(): Portfolio {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'simon_berger' || stored === 'noa_collection' || stored === 'noa_curation') return stored;
  } catch {}
  return 'simon_berger';
}

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [portfolio, setPortfolioState] = useState<Portfolio>(loadPortfolio);

  const setPortfolio = useCallback((p: Portfolio) => {
    setPortfolioState(p);
    try { localStorage.setItem(STORAGE_KEY, p); } catch {}
  }, []);

  return (
    <PortfolioContext.Provider value={{ portfolio, setPortfolio }}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio(): PortfolioContextValue {
  const ctx = useContext(PortfolioContext);
  if (!ctx) throw new Error('usePortfolio must be used inside PortfolioProvider');
  return ctx;
}
