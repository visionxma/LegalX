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
  operator?: string; // Não usado para WhatsApp
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
}

export interface TeamMember {
  uid: string;
  email: string;
  role: TeamRole;
  permissions: TeamPermissions;
  status: 'active' | 'inactive';
  addedAt: string;
  addedBy: string;
}

export interface TeamInvitation {
  id: string;
  email: string;
  teamId: string;
  role: TeamRole;
  token: string;
  expiresAt: string;
  createdAt: string;
  createdBy: string;
  usedAt?: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
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