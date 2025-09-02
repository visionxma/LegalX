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
  setDoc
} from 'firebase/firestore';
import { auth, db } from '../firebase.config';
import { Team, TeamMember, TeamInvitation, TeamRole, TeamPermissions, DEFAULT_PERMISSIONS } from '../types/admin';

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

  /**
   * TEAM MANAGEMENT
   */
  
  async getTeam(): Promise<Team | null> {
    try {
      // Aguardar autenticação
      const isAuthenticated = await this.waitForAuth();
      if (!isAuthenticated) {
        console.log('Usuário não autenticado');
        return null;
      }

      const userId = this.getCurrentUserId();
      console.log('Buscando equipe para usuário:', userId);
      
      // Buscar team onde o usuário é owner
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
      
      // Se não é owner, verificar se é membro
      const memberDoc = await getDoc(doc(db, 'teamMembers', userId));
      
      if (memberDoc.exists() && memberDoc.data().status === 'active') {
        const memberData = memberDoc.data();
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
      
      // Adicionar owner como membro usando o userId como documento ID
      await setDoc(doc(db, 'teamMembers', userId), {
        uid: userId,
        email: user.email,
        teamId: teamRef.id,
        role: 'owner',
        permissions: DEFAULT_PERMISSIONS.owner,
        status: 'active',
        addedAt: Timestamp.now(),
        addedBy: userId
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

      // Remover campos undefined/null do payload
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

  // REMOVIDO: uploadLogo (Firebase Storage não disponível no plano gratuito)
  async uploadLogo(file: File, teamId: string): Promise<string | null> {
    try {
      console.log('Upload de logo não disponível no plano gratuito');
      
      // Converter para base64 como alternativa temporária
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
      console.error('Erro no upload do logo:', error);
      return null;
    }
  }

  /**
   * TEAM MEMBERS
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
        ...doc.data(),
        addedAt: doc.data().addedAt?.toDate?.()?.toISOString() || doc.data().addedAt
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
      
      const memberRef = doc(db, 'teamMembers', memberUid);
      const memberDoc = await getDoc(memberRef);
      
      if (!memberDoc.exists() || memberDoc.data().teamId !== teamId) {
        throw new Error('Membro não encontrado na equipe');
      }
      
      const updateData: any = { permissions };
      
      if (role) {
        updateData.role = role;
      }
      
      await updateDoc(memberRef, updateData);
      
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
      
      const memberRef = doc(db, 'teamMembers', memberUid);
      const memberDoc = await getDoc(memberRef);
      
      if (!memberDoc.exists() || memberDoc.data().teamId !== teamId) {
        throw new Error('Membro não encontrado na equipe');
      }
      
      await deleteDoc(memberRef);
      
      console.log('Membro removido com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao remover membro:', error);
      throw error;
    }
  }

  /**
   * INVITATIONS
   */
  
  async createInvitation(teamId: string, email: string, role: TeamRole): Promise<TeamInvitation | null> {
    try {
      const isAuthenticated = await this.waitForAuth();
      if (!isAuthenticated) {
        throw new Error('Usuário não autenticado');
      }

      const userId = this.getCurrentUserId();
      console.log('Criando convite para:', email);
      
      // Verificar se já existe convite pendente para este email
      const existingQuery = query(
        collection(db, 'invitations'),
        where('teamId', '==', teamId),
        where('email', '==', email.toLowerCase()),
        where('status', '==', 'pending')
      );
      
      const existingSnapshot = await getDocs(existingQuery);
      
      if (!existingSnapshot.empty) {
        throw new Error('Já existe um convite pendente para este e-mail');
      }
      
      const token = this.generateInviteToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 72); // 72 horas
      
      const invitation = {
        email: email.toLowerCase(),
        teamId,
        role,
        token,
        expiresAt: Timestamp.fromDate(expiresAt),
        createdAt: Timestamp.now(),
        createdBy: userId,
        status: 'pending'
      };

      const inviteRef = await addDoc(collection(db, 'invitations'), invitation);
      
      console.log('Convite criado:', inviteRef.id);
      
      return {
        id: inviteRef.id,
        ...invitation,
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString()
      } as TeamInvitation;
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

  async acceptInvitation(inviteId: string): Promise<{ success: boolean; message: string; teamId?: string }> {
    try {
      const isAuthenticated = await this.waitForAuth();
      if (!isAuthenticated) {
        return { success: false, message: 'Usuário não autenticado' };
      }

      const userId = this.getCurrentUserId();
      const user = auth.currentUser;
      
      if (!user || !user.email) {
        return { success: false, message: 'Usuário não possui email válido' };
      }
      
      console.log('Aceitando convite:', inviteId);
      
      const inviteRef = doc(db, 'invitations', inviteId);
      const inviteDoc = await getDoc(inviteRef);
      
      if (!inviteDoc.exists()) {
        return { success: false, message: 'Convite não encontrado' };
      }
      
      const invitation = inviteDoc.data() as TeamInvitation;
      
      // Verificar se convite não expirou
      const now = new Date();
      const expiresAt = invitation.expiresAt instanceof Timestamp 
        ? invitation.expiresAt.toDate() 
        : new Date(invitation.expiresAt);
      
      if (now > expiresAt) {
        await updateDoc(inviteRef, { status: 'expired' });
        return { success: false, message: 'Convite expirado' };
      }
      
      // Verificar se convite já foi usado
      if (invitation.status !== 'pending') {
        return { success: false, message: 'Convite já foi utilizado ou cancelado' };
      }
      
      // Verificar se usuário já é membro
      const existingMemberDoc = await getDoc(doc(db, 'teamMembers', userId));
      
      if (existingMemberDoc.exists() && existingMemberDoc.data().teamId === invitation.teamId) {
        return { success: false, message: 'Você já é membro desta equipe' };
      }
      
      // Usar batch para operações atômicas
      const batch = writeBatch(db);
      
      // Adicionar como membro usando o userId como ID do documento
      const memberRef = doc(db, 'teamMembers', userId);
      batch.set(memberRef, {
        uid: userId,
        email: user.email,
        teamId: invitation.teamId,
        role: invitation.role,
        permissions: DEFAULT_PERMISSIONS[invitation.role],
        status: 'active',
        addedAt: Timestamp.now(),
        addedBy: invitation.createdBy
      });
      
      // Marcar convite como aceito
      batch.update(inviteRef, {
        status: 'accepted',
        usedAt: Timestamp.now()
      });
      
      await batch.commit();
      
      console.log('Convite aceito com sucesso');
      return { 
        success: true, 
        message: 'Convite aceito com sucesso!', 
        teamId: invitation.teamId 
      };
      
    } catch (error) {
      console.error('Erro ao aceitar convite:', error);
      return { success: false, message: 'Erro interno. Tente novamente.' };
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
   * PERMISSIONS
   */
  
  async getUserPermissions(teamId: string): Promise<{ role: TeamRole; permissions: TeamPermissions } | null> {
    try {
      const isAuthenticated = await this.waitForAuth();
      if (!isAuthenticated) {
        throw new Error('Usuário não autenticado');
      }

      const userId = this.getCurrentUserId();
      
      const memberDoc = await getDoc(doc(db, 'teamMembers', userId));
      
      if (!memberDoc.exists() || memberDoc.data().teamId !== teamId || memberDoc.data().status !== 'active') {
        return null;
      }
      
      const memberData = memberDoc.data();
      
      return {
        role: memberData.role,
        permissions: memberData.permissions
      };
    } catch (error) {
      console.error('Erro ao buscar permissões:', error);
      throw error;
    }
  }

  /**
   * UTILITIES
   */
  
  private generateInviteToken(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15) +
           Date.now().toString(36);
  }

  generateInviteLink(inviteId: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/aceitar?inviteId=${inviteId}`;
  }

  generateMailtoLink(email: string, inviteLink: string, teamName: string): string {
    const subject = encodeURIComponent(`Convite para ${teamName} - LegalX`);
    const body = encodeURIComponent(`
Olá!

Você foi convidado(a) para fazer parte da equipe "${teamName}" no LegalX - Sistema de Gestão Jurídica.

Para aceitar o convite, clique no link abaixo:
${inviteLink}

Este convite expira em 72 horas.

Atenciosamente,
Equipe LegalX
    `.trim());
    
    return `mailto:${email}?subject=${subject}&body=${body}`;
  }

  /**
   * VALIDATION HELPERS
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
      // Formato CPF
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
    } else {
      // Formato CNPJ
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
    return numbers.replace(/(\d{5})(\d{1,3})/, '$1-$2');
  }
}

export const adminService = new AdminService();