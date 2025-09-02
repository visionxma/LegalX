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
  writeBatch
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { auth, db, storage } from '../firebase.config';
import { Team, TeamMember, TeamInvitation, TeamRole, TeamPermissions, DEFAULT_PERMISSIONS } from '../types/admin';

class AdminService {
  
  private getCurrentUserId(): string {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Usuário não autenticado');
    }
    return user.uid;
  }

  /**
   * TEAM MANAGEMENT
   */
  
  async getTeam(): Promise<Team | null> {
    try {
      const userId = this.getCurrentUserId();
      
      // Buscar team onde o usuário é owner ou membro
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
      
      // Se não é owner, verificar se é membro
      const membersQuery = query(
        collection(db, 'teamMembers'),
        where('uid', '==', userId),
        where('status', '==', 'active')
      );
      
      const membersSnapshot = await getDocs(membersQuery);
      
      if (!membersSnapshot.empty) {
        const memberDoc = membersSnapshot.docs[0];
        const teamId = memberDoc.data().teamId;
        
        const teamDoc = await getDoc(doc(db, 'teams', teamId));
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
      return null;
    }
  }

  async createTeam(teamData: Omit<Team, 'id' | 'createdAt' | 'ownerUid'>): Promise<Team | null> {
    try {
      const userId = this.getCurrentUserId();
      const user = auth.currentUser;
      
      if (!user) throw new Error('Usuário não autenticado');
      
      const newTeam = {
        ...teamData,
        ownerUid: userId,
        createdAt: Timestamp.now(),
        settings: {
          allowInvitations: true,
          defaultRole: 'viewer' as TeamRole,
          modules: ['processos', 'agenda', 'documentos', 'relatorios']
        }
      };

      const teamRef = await addDoc(collection(db, 'teams'), newTeam);
      
      // Adicionar owner como membro
      await addDoc(collection(db, 'teamMembers'), {
        uid: userId,
        email: user.email,
        teamId: teamRef.id,
        role: 'owner',
        permissions: DEFAULT_PERMISSIONS.owner,
        status: 'active',
        addedAt: Timestamp.now(),
        addedBy: userId
      });

      console.log('Team criado:', teamRef.id);
      
      return {
        id: teamRef.id,
        ...teamData,
        ownerUid: userId,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Erro ao criar team:', error);
      return null;
    }
  }

  async updateTeam(teamId: string, updatedData: Partial<Team>): Promise<Team | null> {
    try {
      const teamRef = doc(db, 'teams', teamId);
      
      await updateDoc(teamRef, {
        ...updatedData,
        updatedAt: Timestamp.now()
      });
      
      console.log('Team atualizado:', teamId);
      return await this.getTeam();
    } catch (error) {
      console.error('Erro ao atualizar team:', error);
      return null;
    }
  }

  async uploadLogo(file: File, teamId: string): Promise<string | null> {
    try {
      const storageRef = ref(storage, `teams/${teamId}/logo/${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      console.log('Logo uploaded:', downloadURL);
      return downloadURL;
    } catch (error) {
      console.error('Erro ao fazer upload do logo:', error);
      return null;
    }
  }

  /**
   * TEAM MEMBERS
   */
  
  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    try {
      const membersQuery = query(
        collection(db, 'teamMembers'),
        where('teamId', '==', teamId),
        orderBy('addedAt', 'desc')
      );
      
      const snapshot = await getDocs(membersQuery);
      
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        addedAt: doc.data().addedAt?.toDate?.()?.toISOString() || doc.data().addedAt
      })) as TeamMember[];
    } catch (error) {
      console.error('Erro ao buscar membros:', error);
      return [];
    }
  }

  async updateMemberPermissions(teamId: string, memberUid: string, permissions: TeamPermissions, role?: TeamRole): Promise<boolean> {
    try {
      const membersQuery = query(
        collection(db, 'teamMembers'),
        where('teamId', '==', teamId),
        where('uid', '==', memberUid)
      );
      
      const snapshot = await getDocs(membersQuery);
      
      if (snapshot.empty) {
        throw new Error('Membro não encontrado');
      }
      
      const memberDoc = snapshot.docs[0];
      const updateData: any = { permissions };
      
      if (role) {
        updateData.role = role;
      }
      
      await updateDoc(memberDoc.ref, updateData);
      
      console.log('Permissões atualizadas para:', memberUid);
      return true;
    } catch (error) {
      console.error('Erro ao atualizar permissões:', error);
      return false;
    }
  }

  async removeMember(teamId: string, memberUid: string): Promise<boolean> {
    try {
      const membersQuery = query(
        collection(db, 'teamMembers'),
        where('teamId', '==', teamId),
        where('uid', '==', memberUid)
      );
      
      const snapshot = await getDocs(membersQuery);
      
      if (snapshot.empty) {
        throw new Error('Membro não encontrado');
      }
      
      await deleteDoc(snapshot.docs[0].ref);
      
      console.log('Membro removido:', memberUid);
      return true;
    } catch (error) {
      console.error('Erro ao remover membro:', error);
      return false;
    }
  }

  /**
   * INVITATIONS
   */
  
  async createInvitation(teamId: string, email: string, role: TeamRole): Promise<TeamInvitation | null> {
    try {
      const userId = this.getCurrentUserId();
      
      // Verificar se já existe convite pendente para este email
      const existingQuery = query(
        collection(db, 'invitations'),
        where('teamId', '==', teamId),
        where('email', '==', email),
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
        email,
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
      return null;
    }
  }

  async getTeamInvitations(teamId: string): Promise<TeamInvitation[]> {
    try {
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
      return [];
    }
  }

  async cancelInvitation(inviteId: string): Promise<boolean> {
    try {
      const inviteRef = doc(db, 'invitations', inviteId);
      
      await updateDoc(inviteRef, {
        status: 'cancelled',
        cancelledAt: Timestamp.now()
      });
      
      console.log('Convite cancelado:', inviteId);
      return true;
    } catch (error) {
      console.error('Erro ao cancelar convite:', error);
      return false;
    }
  }

  async acceptInvitation(inviteId: string): Promise<{ success: boolean; message: string; teamId?: string }> {
    try {
      const userId = this.getCurrentUserId();
      const user = auth.currentUser;
      
      if (!user) {
        return { success: false, message: 'Usuário não autenticado' };
      }
      
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
      
      // Verificar se email confere (opcional - pode permitir aceitar com email diferente)
      if (user.email !== invitation.email) {
        const confirmDifferentEmail = confirm(
          `Este convite foi enviado para ${invitation.email}, mas você está logado como ${user.email}. Deseja aceitar mesmo assim?`
        );
        
        if (!confirmDifferentEmail) {
          return { success: false, message: 'Convite cancelado pelo usuário' };
        }
      }
      
      // Verificar se usuário já é membro
      const existingMemberQuery = query(
        collection(db, 'teamMembers'),
        where('teamId', '==', invitation.teamId),
        where('uid', '==', userId)
      );
      
      const existingMemberSnapshot = await getDocs(existingMemberQuery);
      
      if (!existingMemberSnapshot.empty) {
        return { success: false, message: 'Você já é membro desta equipe' };
      }
      
      // Usar batch para operações atômicas
      const batch = writeBatch(db);
      
      // Adicionar como membro
      const memberRef = doc(collection(db, 'teamMembers'));
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
      
      console.log('Convite aceito com sucesso:', inviteId);
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
      return null;
    }
  }

  /**
   * PERMISSIONS
   */
  
  async getUserPermissions(teamId: string): Promise<{ role: TeamRole; permissions: TeamPermissions } | null> {
    try {
      const userId = this.getCurrentUserId();
      
      const memberQuery = query(
        collection(db, 'teamMembers'),
        where('teamId', '==', teamId),
        where('uid', '==', userId),
        where('status', '==', 'active')
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
      return null;
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
      // Validação básica de CPF
      return this.validateCpf(numbers);
    } else if (numbers.length === 14) {
      // Validação básica de CNPJ
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
    
    // Validação básica - implementação completa seria mais extensa
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