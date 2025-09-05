// DIFF: src/services/adminService.ts
// Principais mudanças:
// - generateSecureToken() com crypto API nativa
// - createInvitation() retorna link direto
// - acceptInvitation() com validação de hash e email
// - Suporte a múltiplas memberships
// - Sistema de pending invites melhorado

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

  // NOVO: Geração de token criptográfico seguro
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

  // NOVO: Hash de token para validação
  private async hashToken(token: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * ATUALIZADO: createInvitation - Gera link seguro
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
      
      return await runTransaction(db, async (transaction) => {
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
            userAgent: navigator.userAgent,
            createdFrom: 'web'
          }
        };

        const inviteRef = doc(collection(db, 'invitations'));
        transaction.set(inviteRef, invitationData);
        
        // Gerar link completo
        const baseUrl = window.location.origin;
        const link = `${baseUrl}/aceitar?inviteId=${inviteRef.id}&token=${token}`;
        
        console.log('Convite seguro criado:', inviteRef.id);
        
        return { link, inviteId: inviteRef.id };
      });
    } catch (error) {
      console.error('Erro ao criar convite seguro:', error);
      throw error;
    }
  }

  /**
   * NOVO: validateInvitation - Validação sem auth obrigatória
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
   * ATUALIZADO: acceptInvitation - Com validação de email e múltiplas memberships
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
      
      // Usar transação para aceitar convite
      return await runTransaction(db, async (transaction) => {
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
        
        // Revalidar convite na transação
        const inviteRef = doc(db, 'invitations', inviteId);
        const currentInvite = await transaction.get(inviteRef);
        
        if (!currentInvite.exists() || currentInvite.data().status !== 'pending') {
          return { success: false, message: 'Convite não está mais válido' };
        }
        
        // NOVO: Criar membro com suporte a múltiplas memberships
        const memberRef = doc(collection(db, 'teamMembers'));
        transaction.set(memberRef, {
          uid: userId,
          email: user.email.toLowerCase(),
          teamId: invitation.teamId,
          role: invitation.role,
          permissions: DEFAULT_PERMISSIONS[invitation.role],
          status: 'active',
          addedAt: Timestamp.now(),
          addedBy: invitation.createdBy,
          lastActiveAt: Timestamp.now(),
          inviteId // Referência ao convite que originou a membership
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
          message: 'Convite aceito com sucesso! Bem-vindo à equipe.',
          data: { teamId: invitation.teamId }
        };
      });
      
    } catch (error) {
      console.error('Erro ao aceitar convite:', error);
      return { success: false, message: 'Erro interno. Tente novamente.' };
    }
  }

  /**
   * ATUALIZADO: getTeam - Com suporte a múltiplas memberships
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
   * ATUALIZADO: getTeamMembers - Com múltiplas memberships
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
   * PENDING INVITES - Sistema localStorage melhorado
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

  // Métodos adicionais mantidos...
  // [resto dos métodos do adminService original]
}

export const adminService = new AdminService();