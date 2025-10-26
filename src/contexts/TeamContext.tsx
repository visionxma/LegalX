// src/contexts/TeamContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth } from '../firebase.config';
import { adminService } from '../services/adminService';
import { Team, TeamMember, TeamPermissions } from '../types/admin';

interface TeamContextData {
  // Estado atual
  activeTeam: Team | null;
  currentMember: TeamMember | null;
  permissions: TeamPermissions | null;
  isOwner: boolean;
  loading: boolean;
  
  // Funções
  switchTeam: (team: Team) => void;
  refreshTeamData: () => Promise<void>;
  checkPermission: (module: keyof TeamPermissions) => boolean;
}

const TeamContext = createContext<TeamContextData>({} as TeamContextData);

interface TeamProviderProps {
  children: ReactNode;
}

export function TeamProvider({ children }: TeamProviderProps) {
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);
  const [currentMember, setCurrentMember] = useState<TeamMember | null>(null);
  const [permissions, setPermissions] = useState<TeamPermissions | null>(null);
  const [loading, setLoading] = useState(true);

  const isOwner = activeTeam?.ownerUid === auth.currentUser?.uid;

  useEffect(() => {
    const initTeamData = async () => {
      try {
        setLoading(true);
        
        // Esperar autenticação
        if (!auth.currentUser) {
          const unsubscribe = auth.onAuthStateChanged(async (user) => {
            unsubscribe();
            if (user) {
              await loadTeamData();
            }
          });
          return;
        }
        
        await loadTeamData();
      } catch (error) {
        console.error('Erro ao inicializar team data:', error);
      } finally {
        setLoading(false);
      }
    };

    initTeamData();
  }, []);

  const loadTeamData = async () => {
    try {
      if (!auth.currentUser) return;
      
      // Carregar equipe
      const team = await adminService.getTeam();
      setActiveTeam(team);
      
      if (team) {
        // Carregar dados do membro atual
        const members = await adminService.getTeamMembers(team.id);
        const member = members.find(m => m.uid === auth.currentUser?.uid);
        
        setCurrentMember(member || null);
        setPermissions(member?.permissions || null);
      }
    } catch (error) {
      console.error('Erro ao carregar team data:', error);
    }
  };

  const switchTeam = (team: Team) => {
    setActiveTeam(team);
    // Recarregar dados do membro
    loadTeamData();
  };

  const refreshTeamData = async () => {
    await loadTeamData();
  };

  const checkPermission = (module: keyof TeamPermissions): boolean => {
    if (isOwner) return true; // Owner sempre tem permissão
    return permissions?.[module] || false;
  };

  return (
    <TeamContext.Provider value={{
      activeTeam,
      currentMember,
      permissions,
      isOwner,
      loading,
      switchTeam,
      refreshTeamData,
      checkPermission
    }}>
      {children}
    </TeamContext.Provider>
  );
}

// Hook personalizado
export function useTeam() {
  const context = useContext(TeamContext);
  
  if (!context) {
    throw new Error('useTeam deve ser usado dentro de TeamProvider');
  }
  
  return context;
}