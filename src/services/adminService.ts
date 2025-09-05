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

  // CORREÇÃO: Geração de token seguro com hash SHA-256 real
  private async generateSecureToken(): Promise<{ token: string; hash: string }> {
    // Gerar token aleatório de 64 caracteres hex
    const token = crypto.getRandomValues(new Uint8Array(32))
      .reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '');
    
    // Hash do token usando SHA-256
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    
    try {
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      return { token, hash };
    } catch (error) {
      console.error('Erro ao gerar hash SHA-256:', error);
      // Fallback para hash simples em caso de erro
      const simpleHash = this.hashTokenSimple(token);
      return { token, hash: simpleHash };
    }
  }

  // Hash SHA-256 para validação de token (async)
  private async hashToken(token: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    
    try {
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.error('Erro ao gerar hash SHA-256:', error);
      // Fallback para hash simples
      return this.hashTokenSimple(token);
    }
  }

  // Fallback hash simples (mantido para compatibilidade)
  private hashTokenSimple(token: string): string {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      const char = token.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36) + Date.now().toString(36);
  }

  /**
   * TEAM MANAGEMENT - Mantido igual
   */
  
  async getTeam(): Promise<Team | null> {
    try {
      const isAuthenticated = await this.waitForAuth();
      if (!isAuthenticated) {
        console.log('Usuário não autenticado');
        return null;
      }

      const userId = this.getCurrentUserId();
      console.log('Buscando equipe para usuário:', userId);
      
      // Primeiro, buscar team onde o usuário é owner
      const teamsQuery = query(
        collection(db, 'teams'),
        where('ownerUid', '==', userId)
      );
      
      const snapshot = await getDocs(teamsQuery);
      console.log('Teams encontrados como owner:', snapshot.size);
      
      if (!snapshot.empty) {
        const teamDoc = snapshot.docs[0];
        const teamData = {
          id: teamDoc.id,
          ...teamDoc.data(),
          createdAt: teamDoc.data().createdAt?.toDate?.()?.toISOString() || teamDoc.data().createdAt
        } as Team;
        console.log('Team encontrado como owner:', teamData);
        return teamData;
      }
      
      // Buscar em múltiplas memberships
      const membersQuery = query(
        collection(db, 'teamMembers'),
        where('uid', '==', userId),
        where('status', '==', 'active'),
        limit(1) // Por enquanto, pegar a primeira equipe ativa
      );
      
      const memberSnapshot = await getDocs(membersQuery);
      
      if (!memberSnapshot.empty) {
        const memberData = memberSnapshot.docs[0].data();
        const teamId = memberData.teamId;
        console.log('Usuário é membro da equipe:', teamId);
        
        const teamDoc = await getDoc(doc(db, 'teams', teamId));
        if (teamDoc.exists()) {
          const teamData = {
            id: teamDoc.id,
            ...teamDoc.data(),
            createdAt: teamDoc.data().createdAt?.toDate?.()?.toISOString() || teamDoc.data().createdAt
          } as Team;
          console.log('Team encontrado como membro:', teamData);
          return teamData;
        }
      }
      
      console.log('Nenhuma equipe encontrada para o usuário');
      return null;
    } catch (error) {
      console.error('Erro ao buscar team:', error);
      throw error;
    }
  }

  async createTeam(teamData: Omit<Team, 'id' | 'createdAt' | 'ownerUid'>): Promise<Team | null> {
    try {
      const isAuthenticated = await this.waitForAuth();
      if (!isAuthenticated) {
        throw new Error('Usuário não autenticado');
      }

      const userId = this.getCurrentUserId();
      const user = auth.currentUser;
      
      if (!user || !user.email) {
        throw new Error('Usuário não possui email válido');
      }
      
      console.log('Criando equipe para usuário:', userId);

      const newTeam = {
        ...teamData,
        ownerUid: userId,
        createdAt: Timestamp.now(),
        settings: teamData.settings || {
          allowInvitations: true,
          defaultRole: 'viewer' as TeamRole,
          modules: ['processos', 'agenda', 'documentos', 'relatorios']
        }
      };

      const teamRef = await addDoc(collection(db, 'teams'), newTeam);
      console.log('Team criado com ID:', teamRef.id);
      
      // Usar subcoleção com ID único para permitir múltiplas memberships
      const memberRef = doc(collection(db, 'teamMembers'));
      await setDoc(memberRef, {
        uid: userId,
        email: user.email,
        teamId: teamRef.id,
        role: 'owner',
        permissions: DEFAULT_PERMISSIONS.owner,
        status: 'active',
        addedAt: Timestamp.now(),
        addedBy: userId,
        lastActiveAt: Timestamp.now()
      });

      console.log('Owner adicionado como membro');
      
      return {
        id: teamRef.id,
        ...teamData,
        ownerUid: userId,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Erro ao criar team:', error);
      throw error;
    }
  }

  async updateTeam(teamId: string, updatedData: Partial<Team>): Promise<Team | null> {
    try {
      const isAuthenticated = await this.waitForAuth();
      if (!isAuthenticated) {
        throw new Error('Usuário não autenticado');
      }

      console.log('Atualizando equipe:', teamId, updatedData);
      const teamRef = doc(db, 'teams', teamId);
      
      const updatePayload = {
        ...updatedData,
        updatedAt: Timestamp.now()
      };

      Object.keys(updatePayload).forEach(key => {
        if (updatePayload[key] === undefined || updatePayload[key] === null) {
          delete updatePayload[key];
        }
      });

      await updateDoc(teamRef, updatePayload);
      
      console.log('Team atualizado com sucesso');
      return await this.getTeam();
    } catch (error) {
      console.error('Erro ao atualizar team:', error);
      throw error;
    }
  }

  async uploadLogo(file: File, teamId: string): Promise<string | null> {
    try {
      console.log('Convertendo logo para base64 (sem Firebase Storage)');
      
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target?.result as string;
          console.log('Logo convertido para base64');
          resolve(base64);
        };
        reader.onerror = () => {
          console.error('Erro ao converter logo para base64');
          resolve(null);
        };
        reader.readAsDataURL(file);
      });
    } catch (error) {
      console.error('Erro ao processar logo:', error);
      return null;
    }
  }

  /**
   * TEAM MEMBERS - Atualizado para múltiplas memberships
   */
  
  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    try {
      const isAuthenticated = await this.waitForAuth();
      if (!isAuthenticated) {
        throw new Error('Usuário não autenticado');
      }

      console.log('Buscando membros para equipe:', teamId);
      
      const membersQuery = query(
        collection(db, 'teamMembers'),
        where('teamId', '==', teamId),
        orderBy('addedAt', 'desc')
      );
      
      const snapshot = await getDocs(membersQuery);
      console.log('Membros encontrados:', snapshot.size);
      
      const members = snapshot.docs.map(doc => ({
        id: doc.id, // ID do documento
        ...doc.data(),
        addedAt: doc.data().addedAt?.toDate?.()?.toISOString() || doc.data().addedAt,
        lastActiveAt: doc.data().lastActiveAt?.toDate?.()?.toISOString() || doc.data().lastActiveAt
      })) as TeamMember[];

      return members;
    } catch (error) {
      console.error('Erro ao buscar membros:', error);
      throw error;
    }
  }

  async updateMemberPermissions(teamId: string, memberUid: string, permissions: TeamPermissions, role?: TeamRole): Promise<boolean> {
    try {
      const isAuthenticated = await this.waitForAuth();
      if (!isAuthenticated) {
        throw new Error('Usuário não autenticado');
      }

      console.log('Atualizando permissões do membro:', memberUid);
      
      // Buscar pelo uid E teamId
      const membersQuery = query(
        collection(db, 'teamMembers'),
        where('uid', '==', memberUid),
        where('teamId', '==', teamId),
        limit(1)
      );
      
      const snapshot = await getDocs(membersQuery);
      
      if (snapshot.empty) {
        throw new Error('Membro não encontrado na equipe');
      }
      
      const memberDoc = snapshot.docs[0];
      const updateData: any = { 
        permissions,
        lastActiveAt: Timestamp.now()
      };
      
      if (role) {
        updateData.role = role;
      }
      
      await updateDoc(doc(db, 'teamMembers', memberDoc.id), updateData);
      
      console.log('Permissões atualizadas com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao atualizar permissões:', error);
      throw error;
    }
  }

  async removeMember(teamId: string, memberUid: string): Promise<boolean> {
    try {
      const isAuthenticated = await this.waitForAuth();
      if (!isAuthenticated) {
        throw new Error('Usuário não autenticado');
      }

      console.log('Removendo membro:', memberUid);
      
      // Buscar pelo uid E teamId
      const membersQuery = query(
        collection(db, 'teamMembers'),
        where('uid', '==', memberUid),
        where('teamId', '==', teamId),
        limit(1)
      );
      
      const snapshot = await getDocs(membersQuery);
      
      if (snapshot.empty) {
        throw new Error('Membro não encontrado na equipe');
      }
      
      const memberDoc = snapshot.docs[0];
      await deleteDoc(doc(db, 'teamMembers', memberDoc.id));
      
      console.log('Membro removido com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao remover membro:', error);
      throw error;
    }
  }

  /**
   * INVITATIONS - CORRIGIDO: Sistema de convites seguros
   */
  
  async createInvitation(teamId: string, email: string, role: TeamRole): Promise<{ invitation: TeamInvitation; token: string } | null> {
    try {
      const isAuthenticated = await this.waitForAuth();
      if (!isAuthenticated) {
        throw new Error('Usuário não autenticado');
      }

      const userId = this.getCurrentUserId();
      const normalizedEmail = email.toLowerCase().trim();
      
      console.log('Criando convite para:', normalizedEmail);
      
      // Usar transação para garantir consistência
      return await runTransaction(db, async (transaction) => {
        // Verificar se já existe convite pendente
        const existingQuery = query(
          collection(db, 'invitations'),
          where('teamId', '==', teamId),
          where('email', '==', normalizedEmail),
          where('status', 'in', ['pending'])
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
        
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 72); // 72 horas
        
        const invitationData = {
          email: normalizedEmail,
          teamId,
          role,
          tokenHash,
          expiresAt: Timestamp.fromDate(expiresAt),
          createdAt: Timestamp.now(),
          createdBy: userId,
          status: 'pending' as const,
          metadata: {
            userAgent: navigator.userAgent,
            acceptedFrom: 'web'
          }
        };

        const inviteRef = doc(collection(db, 'invitations'));
        transaction.set(inviteRef, invitationData);
        
        const invitation: TeamInvitation = {
          id: inviteRef.id,
          ...invitationData,
          expiresAt: expiresAt.toISOString(),
          createdAt: new Date().toISOString()
        };
        
        console.log('Convite criado:', inviteRef.id);
        
        return { invitation, token };
      });
    } catch (error) {
      console.error('Erro ao criar convite:', error);
      throw error;
    }
  }

  async getTeamInvitations(teamId: string): Promise<TeamInvitation[]> {
    try {
      const isAuthenticated = await this.waitForAuth();
      if (!isAuthenticated) {
        throw new Error('Usuário não autenticado');
      }

      console.log('Buscando convites para equipe:', teamId);
      
      const invitationsQuery = query(
        collection(db, 'invitations'),
        where('teamId', '==', teamId),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(invitationsQuery);
      console.log('Convites encontrados:', snapshot.size);
      
      const invitations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        expiresAt: doc.data().expiresAt?.toDate?.()?.toISOString() || doc.data().expiresAt,
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
        usedAt: doc.data().usedAt?.toDate?.()?.toISOString() || doc.data().usedAt
      })) as TeamInvitation[];

      return invitations;
    } catch (error) {
      console.error('Erro ao buscar convites:', error);
      throw error;
    }
  }

  // CORRIGIDO: Validar convite sem autenticação
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
      
      // Verificar token hash
      const providedTokenHash = await this.hashToken(token);
      if (providedTokenHash !== invitation.tokenHash) {
        console.log('Token hash mismatch:', { provided: providedTokenHash, expected: invitation.tokenHash });
        return { valid: false, error: 'Token inválido' };
      }
      
      // Verificar expiração
      const now = new Date();
      const expiresAt = new Date(invitation.expiresAt);
      
      if (now > expiresAt) {
        // Marcar como expirado
        await updateDoc(doc(db, 'invitations', inviteId), { 
          status: 'expired' 
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

  // CORRIGIDO: Aceitar convite com validação melhorada
  async acceptInvitation(inviteId: string, token: string): Promise<InviteOperationResponse> {
    try {
      // Validar convite primeiro
      const validation = await this.validateInvitation(inviteId, token);
      
      if (!validation.valid || !validation.invitation) {
        return { success: false, message: validation.error || 'Convite inválido' };
      }
      
      const isAuthenticated = await this.waitForAuth();
      if (!isAuthenticated) {
        // Salvar no localStorage para processar após login
        this.savePendingInvite({
          inviteId,
          token,
          email: validation.invitation.email,
          expiresAt: validation.invitation.expiresAt,
          timestamp: new Date().toISOString()
        });
        
        return { 
          success: false, 
          message: 'Faça login ou crie uma conta para aceitar o convite',
          requiresAuth: true
        };
      }

      const userId = this.getCurrentUserId();
      const user = auth.currentUser;
      
      if (!user || !user.email) {
        return { success: false, message: 'Usuário não possui email válido' };
      }
      
      const invitation = validation.invitation;
      
      // Verificar se email bate (case-insensitive)
      if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
        return { 
          success: false, 
          message: 'Este convite foi enviado para outro e-mail. Faça login com o e-mail correto.' 
        };
      }
      
      // Usar transação para aceitar convite
      return await runTransaction(db, async (transaction) => {
        // Verificar se usuário já é membro
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
        
        // Revalidar convite na transação
        const inviteRef = doc(db, 'invitations', inviteId);
        const currentInvite = await transaction.get(inviteRef);
        
        if (!currentInvite.exists() || currentInvite.data().status !== 'pending') {
          return { success: false, message: 'Convite não está mais válido' };
        }
        
        // Adicionar como membro
        const memberRef = doc(collection(db, 'teamMembers'));
        transaction.set(memberRef, {
          uid: userId,
          email: user.email,
          teamId: invitation.teamId,
          role: invitation.role,
          permissions: DEFAULT_PERMISSIONS[invitation.role],
          status: 'active',
          addedAt: Timestamp.now(),
          addedBy: invitation.createdBy,
          lastActiveAt: Timestamp.now()
        });
        
        // Marcar convite como aceito
        transaction.update(inviteRef, {
          status: 'accepted',
          usedAt: Timestamp.now(),
          acceptedBy: userId,
          'metadata.acceptedFrom': 'web'
        });
        
        return { 
          success: true, 
          message: 'Convite aceito com sucesso!',
          data: { teamId: invitation.teamId }
        };
      });
      
    } catch (error) {
      console.error('Erro ao aceitar convite:', error);
      return { success: false, message: 'Erro interno. Tente novamente.' };
    }
  }

  async cancelInvitation(inviteId: string): Promise<boolean> {
    try {
      const isAuthenticated = await this.waitForAuth();
      if (!isAuthenticated) {
        throw new Error('Usuário não autenticado');
      }

      console.log('Cancelando convite:', inviteId);
      
      const inviteRef = doc(db, 'invitations', inviteId);
      
      await updateDoc(inviteRef, {
        status: 'cancelled',
        cancelledAt: Timestamp.now()
      });
      
      console.log('Convite cancelado com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao cancelar convite:', error);
      throw error;
    }
  }

  // Novo: Revogar convite (diferente de cancelar)
  async revokeInvitation(inviteId: string): Promise<boolean> {
    try {
      const isAuthenticated = await this.waitForAuth();
      if (!isAuthenticated) {
        throw new Error('Usuário não autenticado');
      }

      console.log('Revogando convite:', inviteId);
      
      const inviteRef = doc(db, 'invitations', inviteId);
      
      await updateDoc(inviteRef, {
        status: 'revoked',
        revokedAt: Timestamp.now()
      });
      
      console.log('Convite revogado com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao revogar convite:', error);
      throw error;
    }
  }

  async getInvitationById(inviteId: string): Promise<TeamInvitation | null> {
    try {
      console.log('Buscando convite:', inviteId);
      
      const inviteDoc = await getDoc(doc(db, 'invitations', inviteId));
      
      if (!inviteDoc.exists()) {
        return null;
      }
      
      return {
        id: inviteDoc.id,
        ...inviteDoc.data(),
        expiresAt: inviteDoc.data().expiresAt?.toDate?.()?.toISOString() || inviteDoc.data().expiresAt,
        createdAt: inviteDoc.data().createdAt?.toDate?.()?.toISOString() || inviteDoc.data().createdAt,
        usedAt: inviteDoc.data().usedAt?.toDate?.()?.toISOString() || inviteDoc.data().usedAt
      } as TeamInvitation;
    } catch (error) {
      console.error('Erro ao buscar convite:', error);
      throw error;
    }
  }

  /**
   * PENDING INVITES - Sistema melhorado para usuários não autenticados
   */
  
  savePendingInvite(pendingInvite: PendingInvite): void {
    try {
      const existing = this.getPendingInvites();
      const updated = existing.filter(invite => 
        invite.inviteId !== pendingInvite.inviteId
      );
      updated.push(pendingInvite);
      
      // CORREÇÃO: Usar try-catch para localStorage
      if (typeof Storage !== "undefined") {
        localStorage.setItem('legalx_pending_invites', JSON.stringify(updated));
        console.log('Convite pendente salvo:', pendingInvite.inviteId);
      } else {
        console.warn('localStorage não disponível');
      }
    } catch (error) {
      console.error('Erro ao salvar convite pendente:', error);
    }
  }

  getPendingInvites(): PendingInvite[] {
    try {
      if (typeof Storage === "undefined") {
        return [];
      }
      
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
      if (typeof Storage === "undefined") {
        return;
      }
      
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
            console.log('Convite processado com sucesso:', pendingInvite.inviteId);
          } else if (!result.requiresAuth) {
            // Se não requer auth, é um erro definitivo
            this.clearPendingInvite(pendingInvite.inviteId);
            errors.push(`Convite ${pendingInvite.inviteId}: ${result.message}`);
          }
        } catch (error) {
          console.error('Erro ao processar convite:', pendingInvite.inviteId, error);
          errors.push(`Convite ${pendingInvite.inviteId}: Erro interno`);
        }
      }
      
      return { processed, errors };
    } catch (error) {
      console.error('Erro ao processar convites pendentes:', error);
      return { processed: 0, errors: ['Erro interno ao processar convites'] };
    }
  }

  /**
   * PERMISSIONS - Atualizado para múltiplas memberships
   */
  
  async getUserPermissions(teamId: string): Promise<{ role: TeamRole; permissions: TeamPermissions } | null> {
    try {
      const isAuthenticated = await this.waitForAuth();
      if (!isAuthenticated) {
        throw new Error('Usuário não autenticado');
      }

      const userId = this.getCurrentUserId();
      
      // Buscar pelo uid E teamId
      const memberQuery = query(
        collection(db, 'teamMembers'),
        where('uid', '==', userId),
        where('teamId', '==', teamId),
        where('status', '==', 'active'),
        limit(1)
      );
      
      const snapshot = await getDocs(memberQuery);
      
      if (snapshot.empty) {
        return null;
      }
      
      const memberData = snapshot.docs[0].data();
      
      return {
        role: memberData.role,
        permissions: memberData.permissions
      };
    } catch (error) {
      console.error('Erro ao buscar permissões:', error);
      throw error;
    }
  }

  // Novo: Obter todas as equipes do usuário
  async getUserTeams(): Promise<Team[]> {
    try {
      const isAuthenticated = await this.waitForAuth();
      if (!isAuthenticated) {
        throw new Error('Usuário não autenticado');
      }

      const userId = this.getCurrentUserId();
      
      // Buscar todas as memberships ativas
      const memberQuery = query(
        collection(db, 'teamMembers'),
        where('uid', '==', userId),
        where('status', '==', 'active')
      );
      
      const memberSnapshot = await getDocs(memberQuery);
      
      if (memberSnapshot.empty) {
        return [];
      }
      
      // Buscar dados das equipes
      const teamIds = memberSnapshot.docs.map(doc => doc.data().teamId);
      const teams: Team[] = [];
      
      for (const teamId of teamIds) {
        const teamDoc = await getDoc(doc(db, 'teams', teamId));
        if (teamDoc.exists()) {
          teams.push({
            id: teamDoc.id,
            ...teamDoc.data(),
            createdAt: teamDoc.data().createdAt?.toDate?.()?.toISOString() || teamDoc.data().createdAt
          } as Team);
        }
      }
      
      return teams;
    } catch (error) {
      console.error('Erro ao buscar equipes do usuário:', error);
      throw error;
    }
  }

  /**
   * UTILITIES
   */
  
  private generateInviteToken(): string {
    return crypto.getRandomValues(new Uint8Array(32))
      .reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '');
  }

  generateInviteLink(inviteId: string, token: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/aceitar?inviteId=${inviteId}&token=${token}`;
  }

  generateMailtoLink(email: string, inviteLink: string, teamName: string): string {
    const subject = encodeURIComponent(`Convite para ${teamName} - LegalX`);
    const body = encodeURIComponent(`
Olá!

Você foi convidado(a) para fazer parte da equipe "${teamName}" no LegalX - Sistema de Gestão Jurídica.

Para aceitar o convite, clique no link abaixo:
${inviteLink}

Este convite expira em 72 horas.

Se você ainda não possui uma conta, será direcionado para criar uma.

Atenciosamente,
Equipe LegalX
    `.trim());
    
    return `mailto:${email}?subject=${subject}&body=${body}`;
  }

  // Novo: Gerar link de WhatsApp
  generateWhatsAppLink(phone: string, inviteLink: string, teamName: string): string {
    const cleanPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(`
Olá! Você foi convidado(a) para fazer parte da equipe "${teamName}" no LegalX.

Clique no link para aceitar: ${inviteLink}

O convite expira em 72 horas.
    `.trim());
    
    return `https://wa.me/${cleanPhone}?text=${message}`;
  }

  /**
   * VALIDATION HELPERS - Mantidos
   */
  
  validateCpfCnpj(value: string): boolean {
    const numbers = value.replace(/\D/g, '');
    
    if (numbers.length === 11) {
      return this.validateCpf(numbers);
    } else if (numbers.length === 14) {
      return this.validateCnpj(numbers);
    }
    
    return false;
  }

  private validateCpf(cpf: string): boolean {
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
      return false;
    }
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    
    let remainder = 11 - (sum % 11);
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(9))) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    
    remainder = 11 - (sum % 11);
    if (remainder === 10 || remainder === 11) remainder = 0;
    
    return remainder === parseInt(cpf.charAt(10));
  }

  private validateCnpj(cnpj: string): boolean {
    if (cnpj.length !== 14) return false;
    
    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cnpj.charAt(i)) * weights1[i];
    }
    
    let remainder = sum % 11;
    const digit1 = remainder < 2 ? 0 : 11 - remainder;
    
    if (digit1 !== parseInt(cnpj.charAt(12))) return false;
    
    sum = 0;
    for (let i = 0; i < 13; i++) {
      sum += parseInt(cnpj.charAt(i)) * weights2[i];
    }
    
    remainder = sum % 11;
    const digit2 = remainder < 2 ? 0 : 11 - remainder;
    
    return digit2 === parseInt(cnpj.charAt(13));
  }

  formatCpfCnpj(value: string): string {
    const numbers = value.replace(/\D/g, '');
    
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
    } else {
      return numbers
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
    }
  }

  formatPhone(value: string): string {
    const numbers = value.replace(/\D/g, '');
    
    if (numbers.length <= 10) {
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .replace(/(-\d{4})\d+?$/, '$1');
    } else {
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .replace(/(-\d{4})\d+?$/, '$1');
    }
  }

  formatCep(value: string): string {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{5})(\d{1,3})/, '$1-$2');
  }
}

export const adminService = new AdminService();