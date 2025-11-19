import React, { createContext, useContext, useState } from 'react';

type Ctx = {
  aiSectionVisibleOnHome: boolean;
  setAiSectionVisibleOnHome: (v: boolean) => void;
  isHomeMounted: boolean;
  setIsHomeMounted: (v: boolean) => void;
};

const AISectionContext = createContext<Ctx | undefined>(undefined);

export function AISectionProvider({ children }: { children: React.ReactNode }) {
  const [aiSectionVisibleOnHome, setAiSectionVisibleOnHome] = useState(true);
  const [isHomeMounted, setIsHomeMounted] = useState(false);
  return (
    <AISectionContext.Provider value={{ aiSectionVisibleOnHome, setAiSectionVisibleOnHome, isHomeMounted, setIsHomeMounted }}>
      {children}
    </AISectionContext.Provider>
  );
}

export function useAISection() {
  const ctx = useContext(AISectionContext);
  if (!ctx) throw new Error('useAISection must be used within AISectionProvider');
  return ctx;
}


