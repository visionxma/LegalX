// src/services/adminService.ts
// Versão corrigida com problemas de permissão resolvidos

import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
  setDoc,
  runTransaction,
  limit
} from 'firebase/firestore';
import { auth, db } from '../firebase.config';
import { 
  Team, 
  TeamMember, 
  TeamInvitation, 
  TeamRole, 
  TeamPermissions, 
  DEFAULT_PERMISSIONS,
  PendingInvite,
  InviteValidationResult,
  InviteOperationResponse
} from '../types/admin';

class AdminService {
  
  private getCurrentUserId(): string {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Usuário não autenticado');
    }
    return user.uid;
  }

  private async waitForAuth(): Promise<boolean> {
    return new Promise((resolve) => {
      if (auth.currentUser) {
        resolve(true);
        return;
      }
      
      const unsubscribe = auth.onAuthStateChanged((user) => {
        unsubscribe();
        resolve(!!user);
      });
    });
  }

  // Geração de token criptográfico seguro
  private async generateSecureToken(): Promise<{ token: string; hash: string }> {
    // Gerar token aleatório de 64 caracteres hex (32 bytes)
    const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
    const token = Array.from(tokenBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Hash SHA-256 do token
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return { token, hash };
  }

  // Hash de token para validação
  private async hashToken(token: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * CRIAR NOVA EQUIPE (ESCRITÓRIO) - CORRIGIDO
   */
  async createTeam(teamData: Partial<Team>): Promise<Team | null> {
    try {
      const isAuthenticated = await this.waitForAuth();
      if (!isAuthenticated) {
        throw new Error('Usuário não autenticado');
      }

      const userId = this.getCurrentUserId();
      const user = auth.currentUser;
      
      if (!user?.email) {
        throw new Error('Usuário sem email válido');
      }

      console.log('Criando nova equipe para usuário:', userId);

      // Verificar se usuário já tem uma equipe
      const existingTeamQuery = query(
        collection(db, 'teams'),
        where('ownerUid', '==', userId),
        limit(1)
      );
      
      const existingSnapshot = await getDocs(existingTeamQuery);
      
      if (!existingSnapshot.empty) {
        console.log('Usuário já possui uma equipe');
        const existingTeam = existingSnapshot.docs[0];
        return {
          id: existingTeam.id,
          ...existingTeam.data(),
          createdAt: existingTeam.data().createdAt?.toDate?.()?.toISOString() || existingTeam.data().createdAt
        } as Team;
      }

      // CORRIGIDO: Criar equipe e membro separadamente para evitar problemas de transação
      const newTeamData = {
        name: teamData.name || 'Meu Escritório',
        ownerUid: userId,
        createdAt: Timestamp.now(),
        phones: teamData.phones || [],
        settings: teamData.settings || {
          allowInvitations: true,
          defaultRole: 'viewer' as TeamRole,
          modules: ['processos', 'agenda', 'documentos', 'relatorios']
        },
        ...teamData
      };

      // Criar equipe primeiro
      const teamDocRef = doc(collection(db, 'teams'));
      await setDoc(teamDocRef, newTeamData);
      
      console.log('Equipe criada:', teamDocRef.id);

      // Depois criar o membro owner separadamente
      try {
        const memberRef = doc(collection(db, 'teamMembers'));
        await setDoc(memberRef, {
          uid: userId,
          email: user.email.toLowerCase(),
          teamId: teamDocRef.id,
          role: 'owner' as TeamRole,
          permissions: DEFAULT_PERMISSIONS.owner,
          status: 'active',
          addedAt: Timestamp.now(),
          addedBy: userId,
          lastActiveAt: Timestamp.now()
        });
        
        console.log('Membro owner criado');
      } catch (memberError) {
        console.warn('Erro ao criar membro owner, mas equipe foi criada:', memberError);
        // Não falhar se a equipe foi criada com sucesso
      }

      // Retornar a equipe criada
      const createdTeam = await getDoc(teamDocRef);
      if (createdTeam.exists()) {
        return {
          id: createdTeam.id,
          ...createdTeam.data(),
          createdAt: createdTeam.data().createdAt?.toDate?.()?.toISOString() || createdTeam.data().createdAt
        } as Team;
      }

      return null;
    } catch (error) {
      console.error('Erro ao criar equipe:', error);
      throw error;
    }
  }

/**
   * CRIAR CONVITE SEGURO - CORRIGIDO (URL e validação de dados)
   */
  async createInvitation(teamId: string, email: string, role: TeamRole): Promise<{ link: string; inviteId: string } | null> {
    try {
      const isAuthenticated = await this.waitForAuth();
      if (!isAuthenticated) {
        throw new Error('Usuário não autenticado');
      }

      const userId = this.getCurrentUserId();
      const normalizedEmail = email.toLowerCase().trim();
      
      console.log('Criando convite seguro para:', normalizedEmail);
      
      // Verificações fora da transação para melhor performance
      // Verificar se já existe convite pendente
      const existingQuery = query(
        collection(db, 'invitations'),
        where('teamId', '==', teamId),
        where('email', '==', normalizedEmail),
        where('status', '==', 'pending')
      );
      
      const existingSnapshot = await getDocs(existingQuery);
      if (!existingSnapshot.empty) {
        throw new Error('Já existe um convite pendente para este e-mail');
      }
      
      // Verificar se usuário já é membro
      const memberQuery = query(
        collection(db, 'teamMembers'),
        where('teamId', '==', teamId),
        where('email', '==', normalizedEmail),
        where('status', '==', 'active')
      );
      
      const memberSnapshot = await getDocs(memberQuery);
      if (!memberSnapshot.empty) {
        throw new Error('Este usuário já é membro da equipe');
      }
      
      // Gerar token seguro
      const { token, hash: tokenHash } = await this.generateSecureToken();
      
      // Expiração em 72 horas
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 72);
      
      const invitationData = {
        email: normalizedEmail,
        teamId,
        role,
        tokenHash, // Salvar apenas o hash
        expiresAt: Timestamp.fromDate(expiresAt),
        createdAt: Timestamp.now(),
        createdBy: userId,
        status: 'pending' as const,
        metadata: {
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
          createdFrom: 'web'
        }
      };

      // Criar convite sem transação para evitar problemas
      const inviteRef = doc(collection(db, 'invitations'));
      await setDoc(inviteRef, invitationData);
      
      // CORRIGIDO: Gerar link completo com URL correta
      const baseUrl = window.location.origin;
      const currentPath = window.location.pathname;
      
      // Detectar se está no GitHub Pages ou ambiente local
      let correctBaseUrl;
      if (baseUrl.includes('github.io')) {
        // GitHub Pages - usar URL completa com subpasta
        correctBaseUrl = `${baseUrl}${currentPath.includes('/LegalX') ? '' : '/LegalX'}`;
      } else {
        // Desenvolvimento local ou outro ambiente
        correctBaseUrl = baseUrl;
      }
      
      const link = `${correctBaseUrl}/#/aceitar?inviteId=${inviteRef.id}&token=${token}`;
      
      console.log('Convite seguro criado:', inviteRef.id);
      console.log('Link gerado:', link);
      
      return { link, inviteId: inviteRef.id };
      
    } catch (error) {
      console.error('Erro ao criar convite seguro:', error);
      throw error;
    }
  }

  /**
   * ACEITAR CONVITE - CORRIGIDO
   */
  async acceptInvitation(inviteId: string, token: string): Promise<InviteOperationResponse> {
    try {
      console.log('Tentando aceitar convite:', inviteId);
      
      // Validar convite primeiro
      const validation = await this.validateInvitation(inviteId, token);
      
      if (!validation.valid || !validation.invitation) {
        return { success: false, message: validation.error || 'Convite inválido' };
      }
      
      const invitation = validation.invitation;
      
      // Verificar autenticação
      const isAuthenticated = await this.waitForAuth();
      if (!isAuthenticated) {
        // Salvar no localStorage para processar após login
        this.savePendingInvite({
          inviteId,
          token,
          email: invitation.email,
          expiresAt: invitation.expiresAt,
          timestamp: new Date().toISOString()
        });
        
        return { 
          success: false, 
          message: 'É necessário fazer login para aceitar o convite',
          requiresAuth: true
        };
      }

      const userId = this.getCurrentUserId();
      const user = auth.currentUser;
      
      if (!user || !user.email) {
        return { success: false, message: 'Usuário não possui email válido' };
      }
      
      // IMPORTANTE: Verificar se email corresponde
      if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
        return { 
          success: false, 
          message: `Este convite foi enviado para ${invitation.email}. Faça login com o e-mail correto.` 
        };
      }
      
      // CORRIGIDO: Fazer operações separadamente para evitar problemas de transação
      try {
        // Verificar se usuário já é membro desta equipe
        const memberQuery = query(
          collection(db, 'teamMembers'),
          where('uid', '==', userId),
          where('teamId', '==', invitation.teamId),
          limit(1)
        );
        
        const memberSnapshot = await getDocs(memberQuery);
        if (!memberSnapshot.empty) {
          return { success: false, message: 'Você já é membro desta equipe' };
        }
        
        // Verificar se convite ainda é válido
        const inviteDoc = await getDoc(doc(db, 'invitations', inviteId));
        if (!inviteDoc.exists() || inviteDoc.data().status !== 'pending') {
          return { success: false, message: 'Convite não está mais válido' };
        }
        
        // Criar membro
        const memberRef = doc(collection(db, 'teamMembers'));
        await setDoc(memberRef, {
          uid: userId,
          email: user.email.toLowerCase(),
          teamId: invitation.teamId,
          role: invitation.role,
          permissions: DEFAULT_PERMISSIONS[invitation.role],
          status: 'active',
          addedAt: Timestamp.now(),
          addedBy: invitation.createdBy,
          lastActiveAt: Timestamp.now(),
          inviteId
        });
        
        // Marcar convite como aceito
        await updateDoc(doc(db, 'invitations', inviteId), {
          status: 'accepted',
          usedAt: Timestamp.now(),
          acceptedBy: userId,
          'metadata.acceptedFrom': 'web'
        });
        
        return { 
          success: true, 
          message: 'Convite aceito com sucesso! Bem-vindo à equipe.',
          data: { teamId: invitation.teamId }
        };
        
      } catch (error) {
        console.error('Erro ao aceitar convite:', error);
        return { success: false, message: 'Erro interno ao processar convite' };
      }
      
    } catch (error) {
      console.error('Erro ao aceitar convite:', error);
      return { success: false, message: 'Erro interno. Tente novamente.' };
    }
  }

  /**
   * ATUALIZAR EQUIPE
   */
  async updateTeam(teamId: string, updates: Partial<Team>): Promise<Team | null> {
    try {
      const isAuthenticated = await this.waitForAuth();
      if (!isAuthenticated) {
        throw new Error('Usuário não autenticado');
      }

      const userId = this.getCurrentUserId();
      console.log('Atualizando equipe:', teamId);

      // Verificar se usuário é owner
      const teamDoc = await getDoc(doc(db, 'teams', teamId));
      
      if (!teamDoc.exists()) {
        throw new Error('Equipe não encontrada');
      }

      if (teamDoc.data().ownerUid !== userId) {
        throw new Error('Apenas o proprietário pode atualizar a equipe');
      }

      // Remover campos que não devem ser atualizados
      const { id, ownerUid, createdAt, ...updateData } = updates;

      // Atualizar equipe
      await updateDoc(doc(db, 'teams', teamId), {
        ...updateData,
        updatedAt: Timestamp.now()
      });

      // Retornar equipe atualizada
      const updatedTeam = await getDoc(doc(db, 'teams', teamId));
      
      if (updatedTeam.exists()) {
        return {
          id: updatedTeam.id,
          ...updatedTeam.data(),
          createdAt: updatedTeam.data().createdAt?.toDate?.()?.toISOString() || updatedTeam.data().createdAt
        } as Team;
      }

      return null;
    } catch (error) {
      console.error('Erro ao atualizar equipe:', error);
      throw error;
    }
  }

  /**
   * UPLOAD DE LOGO (Base64)
   */
  async uploadLogo(file: File, teamId: string): Promise<string | null> {
    try {
      // Converter arquivo para base64
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = () => {
          const base64String = reader.result as string;
          resolve(base64String);
        };
        
        reader.onerror = (error) => {
          console.error('Erro ao converter arquivo:', error);
          reject(null);
        };
        
        reader.readAsDataURL(file);
      });
    } catch (error) {
      console.error('Erro ao fazer upload do logo:', error);
      return null;
    }
  }

  /**
   * OBTER CONVITES DA EQUIPE
   */
  async getTeamInvitations(teamId: string): Promise<TeamInvitation[]> {
    try {
      const isAuthenticated = await this.waitForAuth();
      if (!isAuthenticated) {
        throw new Error('Usuário não autenticado');
      }

      const invitationsQuery = query(
        collection(db, 'invitations'),
        where('teamId', '==', teamId),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(invitationsQuery);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        expiresAt: doc.data().expiresAt?.toDate?.()?.toISOString() || doc.data().expiresAt,
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
        usedAt: doc.data().usedAt?.toDate?.()?.toISOString() || doc.data().usedAt
      })) as TeamInvitation[];
    } catch (error) {
      console.error('Erro ao buscar convites:', error);
      throw error;
    }
  }

  /**
   * CANCELAR CONVITE
   */
  async cancelInvitation(inviteId: string): Promise<boolean> {
    try {
      const isAuthenticated = await this.waitForAuth();
      if (!isAuthenticated) {
        throw new Error('Usuário não autenticado');
      }

      await updateDoc(doc(db, 'invitations', inviteId), {
        status: 'cancelled',
        cancelledAt: Timestamp.now(),
        cancelledBy: this.getCurrentUserId()
      });

      return true;
    } catch (error) {
      console.error('Erro ao cancelar convite:', error);
      return false;
    }
  }

  /**
   * VALIDAR CONVITE
   */
  async validateInvitation(inviteId: string, token: string): Promise<InviteValidationResult> {
    try {
      console.log('Validando convite:', inviteId);
      
      const inviteDoc = await getDoc(doc(db, 'invitations', inviteId));
      
      if (!inviteDoc.exists()) {
        return { valid: false, error: 'Convite não encontrado' };
      }
      
      const invitation = {
        id: inviteDoc.id,
        ...inviteDoc.data(),
        expiresAt: inviteDoc.data().expiresAt?.toDate?.()?.toISOString() || inviteDoc.data().expiresAt,
        createdAt: inviteDoc.data().createdAt?.toDate?.()?.toISOString() || inviteDoc.data().createdAt,
        usedAt: inviteDoc.data().usedAt?.toDate?.()?.toISOString() || inviteDoc.data().usedAt
      } as TeamInvitation;
      
      // Verificar hash do token
      const providedTokenHash = await this.hashToken(token);
      if (providedTokenHash !== invitation.tokenHash) {
        console.log('Token hash mismatch');
        return { valid: false, error: 'Token de convite inválido' };
      }
      
      // Verificar expiração
      const now = new Date();
      const expiresAt = new Date(invitation.expiresAt);
      
      if (now > expiresAt) {
        // Marcar como expirado
        await updateDoc(doc(db, 'invitations', inviteId), { 
          status: 'expired',
          expiredAt: Timestamp.now()
        });
        return { valid: false, error: 'Convite expirado' };
      }
      
      // Verificar status
      if (invitation.status !== 'pending') {
        const statusMessages = {
          accepted: 'Convite já foi aceito',
          expired: 'Convite expirado',
          cancelled: 'Convite cancelado',
          revoked: 'Convite revogado'
        };
        return { 
          valid: false, 
          error: statusMessages[invitation.status] || 'Convite não está disponível'
        };
      }
      
      return { 
        valid: true, 
        invitation,
        requiresAuth: !auth.currentUser
      };
      
    } catch (error) {
      console.error('Erro ao validar convite:', error);
      return { valid: false, error: 'Erro interno ao validar convite' };
    }
  }

  /**
   * OBTER EQUIPE
   */
  async getTeam(): Promise<Team | null> {
    try {
      const isAuthenticated = await this.waitForAuth();
      if (!isAuthenticated) {
        return null;
      }

      const userId = this.getCurrentUserId();
      
      // Primeiro, buscar team onde o usuário é owner
      const teamsQuery = query(
        collection(db, 'teams'),
        where('ownerUid', '==', userId)
      );
      
      const snapshot = await getDocs(teamsQuery);
      
      if (!snapshot.empty) {
        const teamDoc = snapshot.docs[0];
        return {
          id: teamDoc.id,
          ...teamDoc.data(),
          createdAt: teamDoc.data().createdAt?.toDate?.()?.toISOString() || teamDoc.data().createdAt
        } as Team;
      }
      
      // Se não é owner, buscar membership ativa
      const membersQuery = query(
        collection(db, 'teamMembers'),
        where('uid', '==', userId),
        where('status', '==', 'active'),
        limit(1)
      );
      
      const memberSnapshot = await getDocs(membersQuery);
      
      if (!memberSnapshot.empty) {
        const memberData = memberSnapshot.docs[0].data();
        const teamDoc = await getDoc(doc(db, 'teams', memberData.teamId));
        
        if (teamDoc.exists()) {
          return {
            id: teamDoc.id,
            ...teamDoc.data(),
            createdAt: teamDoc.data().createdAt?.toDate?.()?.toISOString() || teamDoc.data().createdAt
          } as Team;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao buscar team:', error);
      throw error;
    }
  }

  /**
   * OBTER MEMBROS DA EQUIPE
   */
  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    try {
      const isAuthenticated = await this.waitForAuth();
      if (!isAuthenticated) {
        throw new Error('Usuário não autenticado');
      }

      const membersQuery = query(
        collection(db, 'teamMembers'),
        where('teamId', '==', teamId),
        orderBy('addedAt', 'desc')
      );
      
      const snapshot = await getDocs(membersQuery);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        addedAt: doc.data().addedAt?.toDate?.()?.toISOString() || doc.data().addedAt,
        lastActiveAt: doc.data().lastActiveAt?.toDate?.()?.toISOString() || doc.data().lastActiveAt
      })) as TeamMember[];
    } catch (error) {
      console.error('Erro ao buscar membros:', error);
      throw error;
    }
  }

  /**
   * ATUALIZAR PERMISSÕES DE MEMBRO
   */
  async updateMemberPermissions(
    teamId: string, 
    memberUid: string, 
    permissions: TeamPermissions, 
    role: TeamRole
  ): Promise<boolean> {
    try {
      const isAuthenticated = await this.waitForAuth();
      if (!isAuthenticated) {
        throw new Error('Usuário não autenticado');
      }

      // Buscar o documento do membro
      const memberQuery = query(
        collection(db, 'teamMembers'),
        where('teamId', '==', teamId),
        where('uid', '==', memberUid),
        limit(1)
      );
      
      const memberSnapshot = await getDocs(memberQuery);
      
      if (memberSnapshot.empty) {
        throw new Error('Membro não encontrado');
      }

      const memberDoc = memberSnapshot.docs[0];
      
      // Atualizar permissões
      await updateDoc(doc(db, 'teamMembers', memberDoc.id), {
        permissions,
        role,
        updatedAt: Timestamp.now(),
        updatedBy: this.getCurrentUserId()
      });

      return true;
    } catch (error) {
      console.error('Erro ao atualizar permissões:', error);
      return false;
    }
  }

  /**
   * REMOVER MEMBRO DA EQUIPE
   */
  async removeMember(teamId: string, memberUid: string): Promise<boolean> {
    try {
      const isAuthenticated = await this.waitForAuth();
      if (!isAuthenticated) {
        throw new Error('Usuário não autenticado');
      }

      // Buscar o documento do membro
      const memberQuery = query(
        collection(db, 'teamMembers'),
        where('teamId', '==', teamId),
        where('uid', '==', memberUid),
        limit(1)
      );
      
      const memberSnapshot = await getDocs(memberQuery);
      
      if (memberSnapshot.empty) {
        throw new Error('Membro não encontrado');
      }

      const memberDoc = memberSnapshot.docs[0];
      
      // Deletar membro
      await deleteDoc(doc(db, 'teamMembers', memberDoc.id));

      return true;
    } catch (error) {
      console.error('Erro ao remover membro:', error);
      return false;
    }
  }

  /**
   * SISTEMA DE PENDING INVITES (localStorage)
   */
  
  savePendingInvite(pendingInvite: PendingInvite): void {
    try {
      if (typeof Storage === "undefined") return;
      
      const existing = this.getPendingInvites();
      const updated = existing.filter(invite => 
        invite.inviteId !== pendingInvite.inviteId
      );
      updated.push(pendingInvite);
      
      localStorage.setItem('legalx_pending_invites', JSON.stringify(updated));
      console.log('Convite pendente salvo:', pendingInvite.inviteId);
    } catch (error) {
      console.error('Erro ao salvar convite pendente:', error);
    }
  }

  getPendingInvites(): PendingInvite[] {
    try {
      if (typeof Storage === "undefined") return [];
      
      const stored = localStorage.getItem('legalx_pending_invites');
      if (!stored) return [];
      
      const invites: PendingInvite[] = JSON.parse(stored);
      const now = new Date();
      
      // Filtrar convites expirados
      const valid = invites.filter(invite => {
        const expiresAt = new Date(invite.expiresAt);
        return now <= expiresAt;
      });
      
      // Salvar lista limpa se houve mudanças
      if (valid.length !== invites.length) {
        localStorage.setItem('legalx_pending_invites', JSON.stringify(valid));
      }
      
      return valid;
    } catch (error) {
      console.error('Erro ao recuperar convites pendentes:', error);
      return [];
    }
  }

  clearPendingInvite(inviteId: string): void {
    try {
      if (typeof Storage === "undefined") return;
      
      const existing = this.getPendingInvites();
      const updated = existing.filter(invite => invite.inviteId !== inviteId);
      localStorage.setItem('legalx_pending_invites', JSON.stringify(updated));
      console.log('Convite pendente removido:', inviteId);
    } catch (error) {
      console.error('Erro ao limpar convite pendente:', error);
    }
  }

  async processPendingInvites(): Promise<{ processed: number; errors: string[] }> {
    try {
      const isAuthenticated = await this.waitForAuth();
      if (!isAuthenticated) {
        return { processed: 0, errors: ['Usuário não autenticado'] };
      }

      const pendingInvites = this.getPendingInvites();
      
      if (pendingInvites.length === 0) {
        return { processed: 0, errors: [] };
      }

      console.log('Processando convites pendentes:', pendingInvites.length);
      
      let processed = 0;
      const errors: string[] = [];
      
      for (const pendingInvite of pendingInvites) {
        try {
          const result = await this.acceptInvitation(pendingInvite.inviteId, pendingInvite.token);
          
          if (result.success) {
            this.clearPendingInvite(pendingInvite.inviteId);
            processed++;
          } else if (!result.requiresAuth) {
            // Se não requer auth, é um erro definitivo
            this.clearPendingInvite(pendingInvite.inviteId);
            errors.push(`${pendingInvite.inviteId}: ${result.message}`);
          }
        } catch (error) {
          console.error('Erro ao processar convite:', error);
          errors.push(`${pendingInvite.inviteId}: Erro interno`);
        }
      }
      
      return { processed, errors };
    } catch (error) {
      console.error('Erro ao processar convites pendentes:', error);
      return { processed: 0, errors: ['Erro interno ao processar convites'] };
    }
  }

  /**
   * UTILITÁRIOS DE FORMATAÇÃO
   */
  
  formatCpfCnpj(value: string): string {
    const numbers = value.replace(/\D/g, '');
    
    if (numbers.length <= 11) {
      // CPF
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
    } else {
      // CNPJ
      return numbers
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
    }
  }

  formatPhone(value: string): string {
    const numbers = value.replace(/\D/g, '');
    
    if (numbers.length <= 10) {
      // Telefone fixo
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .replace(/(-\d{4})\d+?$/, '$1');
    } else {
      // Celular
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .replace(/(-\d{4})\d+?$/, '$1');
    }
  }

  formatCep(value: string): string {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{5})(\d)/, '$1-$2').replace(/(-\d{3})\d+?$/, '$1');
  }

}

export const adminService = new AdminService();
