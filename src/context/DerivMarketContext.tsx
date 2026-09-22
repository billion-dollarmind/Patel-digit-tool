import { createContext, useContext, type ReactNode } from 'react';
import { useDerivWebSocket, type FeedMode, type SymbolData } from '@/hooks/useDerivWebSocket';

interface DerivMarketContextValue {
  tickData: Record<string, SymbolData>;
  isConnected: boolean;
  feedMode: FeedMode;
  symbols: string[];
  connect: () => void;
  disconnect: () => void;
}

const DerivMarketContext = createContext<DerivMarketContextValue | null>(null);

/** Single shared market feed for the whole authenticated app tree. */
export const DerivMarketProvider = ({ children }: { children: ReactNode }) => {
  const market = useDerivWebSocket();
  return <DerivMarketContext.Provider value={market}>{children}</DerivMarketContext.Provider>;
};

export const useDerivMarket = () => {
  const ctx = useContext(DerivMarketContext);
  if (!ctx) {
    throw new Error('useDerivMarket must be used within DerivMarketProvider');
  }
  return ctx;
};
