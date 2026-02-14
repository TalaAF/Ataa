// ===== Field App - Family Auth Context =====
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../api/client';

interface Household {
  id: string;
  token: string;
  zone_id: string;
  shelter_id?: string;
  head_of_household_name?: string;
  family_size: number;
  displacement_status: string;
  priority_score: number;
  area_description?: string;
  notes?: string;
  zone_name?: string;
  shelter_name?: string;
}

interface FamilyAuthContextType {
  household: Household | null;
  token: string | null;
  isLoading: boolean;
  login: (familyToken: string) => Promise<void>;
  logout: () => void;
}

const FamilyAuthContext = createContext<FamilyAuthContextType | null>(null);

export function FamilyAuthProvider({ children }: { children: ReactNode }) {
  const [household, setHousehold] = useState<Household | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('family_token');
    const savedHousehold = localStorage.getItem('family_household');

    if (savedToken && savedHousehold) {
      api.setFamilyToken(savedToken);
      setToken(savedToken);
      setHousehold(JSON.parse(savedHousehold));
    }
    setIsLoading(false);
  }, []);

  const login = async (familyToken: string) => {
    const response = await api.familyLogin(familyToken);
    const { token: newToken, household: householdData } = response.data;

    api.setFamilyToken(newToken);
    setToken(newToken);
    setHousehold(householdData);
    localStorage.setItem('family_token', newToken);
    localStorage.setItem('family_household', JSON.stringify(householdData));
  };

  const logout = () => {
    api.setFamilyToken(null);
    setToken(null);
    setHousehold(null);
    localStorage.removeItem('family_token');
    localStorage.removeItem('family_household');
  };

  return (
    <FamilyAuthContext.Provider value={{ household, token, isLoading, login, logout }}>
      {children}
    </FamilyAuthContext.Provider>
  );
}

export function useFamilyAuth() {
  const context = useContext(FamilyAuthContext);
  if (!context) throw new Error('useFamilyAuth must be used within FamilyAuthProvider');
  return context;
}
