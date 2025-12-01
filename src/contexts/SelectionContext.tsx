import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface SelectionContextType {
  selectedObject: any | null;
  setSelectedObject: (obj: any | null) => void;
}

const SelectionContext = createContext<SelectionContextType | undefined>(undefined);

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [selectedObject, setSelectedObject] = useState<any | null>(null);

  return (
    <SelectionContext.Provider value={{ selectedObject, setSelectedObject }}>
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection() {
  const context = useContext(SelectionContext);
  if (context === undefined) {
    throw new Error('useSelection must be used within a SelectionProvider');
  }
  return context;
}
