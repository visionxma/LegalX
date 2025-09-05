// Tipos atualizados para suportar múltiplas memberships e convites seguros

export interface Team {
  id: string;
  name: string;
  ownerUid: string;
  logoUrl?: string;
  cpfCnpj?: string;
  oab?: string;
  ccm?: string;
  email?: string;
  website?: string;
  areaOfPractice?: string;
  phones?: TeamPhone[];
  address?: TeamAddress;
  createdAt: string;
  settings?: TeamSettings;
}

export interface TeamPhone {
  id: string;
  type: 'Telefone comercial' | 'Celular comercial' | 'Fax' | 'Telefone pessoal' | 'WhatsApp' | 'Outro';
  number: string;
  operator?: string;
}

export interface TeamAddress {
  type: 'Comercial' | 'Pessoal';
  cep: string;
  street: string;
  complement?: string;
  city: string;
  state: string;
  country: string;
}

export interface TeamSettings {
  allowInvitations: boolean;
  defaultRole: TeamRole;
  modules: string[];
  maxMembers?: number;
  requireEmailVerification?: boolean;
}

// MUDANÇA: Novo esquema para múltiplas memberships
export interface TeamMember {
  id: string; // Novo: ID único do documento
  uid: string;
  email: string;
  teamId: string;
  role: TeamRole;
  permissions: TeamPermissions;
  status: 'active' | 'inactive' | 'suspended';
  addedAt: string;
  addedBy: string;
  lastActiveAt?: string;
}

// MUDANÇA: Sistema de convites seguro com hash
export interface TeamInvitation {
  id: string;
  email: string;
  teamId: string;
  role: TeamRole;
  tokenHash: string; // Novo: hash seguro do token
  expiresAt: string;
  createdAt: string;
  createdBy: string;
  usedAt?: string;
  acceptedBy?: string; // Novo: uid de quem aceitou
  status: 'pending' | 'accepted' | 'expired' | 'cancelled' | 'revoked';
  metadata?: {
    userAgent?: string;
    ipAddress?: string; // Se disponível
    acceptedFrom?: 'web' | 'mobile';
  };
}

// Novo: Interface para pending invites no localStorage
export interface PendingInvite {
  inviteId: string;
  token: string;
  email: string;
  teamName?: string;
  expiresAt: string;
  timestamp: string;
}

export type TeamRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface TeamPermissions {
  financas: boolean;
  processos: boolean;
  agenda: boolean;
  documentos: boolean;
  relatorios: boolean;
  equipe: boolean;
  configuracoes: boolean;
}

export const DEFAULT_PERMISSIONS: Record<TeamRole, TeamPermissions> = {
  owner: {
    financas: true,
    processos: true,
    agenda: true,
    documentos: true,
    relatorios: true,
    equipe: true,
    configuracoes: true,
  },
  admin: {
    financas: true,
    processos: true,
    agenda: true,
    documentos: true,
    relatorios: true,
    equipe: true,
    configuracoes: false,
  },
  editor: {
    financas: false,
    processos: true,
    agenda: true,
    documentos: true,
    relatorios: false,
    equipe: false,
    configuracoes: false,
  },
  viewer: {
    financas: false,
    processos: false,
    agenda: false,
    documentos: false,
    relatorios: false,
    equipe: false,
    configuracoes: false,
  },
};

// Novo: Utilitários para validação
export interface InviteValidationResult {
  valid: boolean;
  invitation?: TeamInvitation;
  error?: string;
  requiresAuth?: boolean;
}

// Novo: Response para operações de convite
export interface InviteOperationResponse {
  success: boolean;
  message: string;
  data?: any;
  requiresAuth?: boolean;
}