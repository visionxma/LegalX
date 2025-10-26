// src/contexts/TeamContext.tsx - VERSÃO COMPLETA E CORRIGIDA
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth } from '../firebase.config';
import { adminService } from '../services/adminService';
import { firestoreService } from '../services/firestoreService';
import { Team, TeamMember, TeamPermissions } from '../types/admin';

interface TeamContextData {
  // Estado atual
  activeTeam: Team | null;
  currentMember: TeamMember | null;
  permissions: TeamPermissions | null;
  isOwner: boolean;
  isSoloMode: boolean;
  loading: boolean;
  
  // Funções
  switchToTeam: () => Promise<void>;
  switchToSolo: () => void;
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
  const [isSoloMode, setIsSoloMode] = useState(true); // Padrão: modo solo

  const isOwner = activeTeam?.ownerUid === auth.currentUser?.uid;

  useEffect(() => {
    const initTeamData = async () => {
      try {
        setLoading(true);
        
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
      
      const team = await adminService.getTeam();
      setActiveTeam(team);
      
      if (team) {
        const members = await adminService.getTeamMembers(team.id);
        const member = members.find(m => m.uid === auth.currentUser?.uid);
        
        setCurrentMember(member || null);
        setPermissions(member?.permissions || null);
        
        console.log('✅ Team data carregado:', {
          team: team.name,
          member: member?.role,
          permissions: member?.permissions
        });
      }
    } catch (error) {
      console.error('❌ Erro ao carregar team data:', error);
    }
  };

  // Alternar para modo equipe
  const switchToTeam = async () => {
    if (!activeTeam) {
      console.warn('⚠️ Nenhuma equipe disponível para ativar');
      return;
    }
    
    setIsSoloMode(false);
    firestoreService.setActiveTeam(activeTeam.id);
    console.log('✅ Modo EQUIPE ativado:', activeTeam.name);
    
    await refreshTeamData();
  };

  // Alternar para modo solo
  const switchToSolo = () => {
    setIsSoloMode(true);
    firestoreService.setActiveTeam(null);
    console.log('✅ Modo SOLO ativado');
  };

  const refreshTeamData = async () => {
    await loadTeamData();
  };

  const checkPermission = (module: keyof TeamPermissions): boolean => {
    // Modo solo: usuário tem TODAS as permissões
    if (isSoloMode) return true;
    
    // Modo equipe: owner sempre tem permissão
    if (isOwner) return true;
    
    // Demais membros: verificar permissões específicas
    return permissions?.[module] || false;
  };

  return (
    <TeamContext.Provider value={{
      activeTeam,
      currentMember,
      permissions,
      isOwner,
      isSoloMode,
      loading,
      switchToTeam,
      switchToSolo,
      refreshTeamData,
      checkPermission
    }}>
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  const context = useContext(TeamContext);
  
  if (!context) {
    throw new Error('useTeam deve ser usado dentro de TeamProvider');
  }
  
  return context;
}