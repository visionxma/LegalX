import React, { useState, useEffect } from 'react';
import { Team, TeamMember, TeamPermissions, TeamRole, DEFAULT_PERMISSIONS } from '../../types/admin';
import { adminService } from '../../services/adminService';
import { 
  UserIcon, 
  ShieldCheckIcon, 
  PencilIcon, 
  TrashIcon,
  CrownIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AccessTabProps {
  team: Team | null;
}

export default function AccessTab({ team }: AccessTabProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editPermissions, setEditPermissions] = useState<TeamPermissions | null>(null);
  const [editRole, setEditRole] = useState<TeamRole>('viewer');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (team) {
      loadMembers();
    }
  }, [team]);

  const loadMembers = async () => {
    if (!team) return;
    
    try {
      setLoading(true);
      const teamMembers = await adminService.getTeamMembers(team.id);
      setMembers(teamMembers);
    } catch (error) {
      console.error('Erro ao carregar membros:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditMember = (member: TeamMember) => {
    setEditingMember(member);
    setEditPermissions(member.permissions);
    setEditRole(member.role);
  };

  const handleSavePermissions = async () => {
    if (!editingMember || !editPermissions || !team) return;
    
    try {
      setSaving(true);
      
      const success = await adminService.updateMemberPermissions(
        team.id,
        editingMember.uid,
        editPermissions,
        editRole
      );
      
      if (success) {
        await loadMembers();
        setEditingMember(null);
        setEditPermissions(null);
        alert('Permissões atualizadas com sucesso!');
      } else {
        alert('Erro ao atualizar permissões.');
      }
    } catch (error) {
      console.error('Erro ao salvar permissões:', error);
      alert('Erro ao salvar permissões.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (member: TeamMember) => {
    if (member.role === 'owner') {
      alert('Não é possível remover o proprietário da equipe.');
      return;
    }
    
    if (confirm(`Tem certeza que deseja remover ${member.email} da equipe?`)) {
      try {
        const success = await adminService.removeMember(team!.id, member.uid);
        if (success) {
          await loadMembers();
        }
      } catch (error) {
        console.error('Erro ao remover membro:', error);
        alert('Erro ao remover membro.');
      }
    }
  };

  const updatePermission = (module: keyof TeamPermissions, value: boolean) => {
    if (!editPermissions) return;
    
    setEditPermissions({
      ...editPermissions,
      [module]: value
    });
  };

  const handleRoleChange = (newRole: TeamRole) => {
    setEditRole(newRole);
    setEditPermissions(DEFAULT_PERMISSIONS[newRole]);
  };

  const getRoleIcon = (role: TeamRole) => {
    switch (role) {
      case 'owner':
        return <CrownIcon className="w-4 h-4 text-amber-500" />;
      case 'admin':
        return <ShieldCheckIcon className="w-4 h-4 text-blue-500" />;
      case 'editor':
        return <PencilIcon className="w-4 h-4 text-green-500" />;
      default:
        return <UserIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoleColor = (role: TeamRole) => {
    switch (role) {
      case 'owner':
        return 'bg-amber-100 text-amber-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      case 'editor':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <p className="text-gray-500 mt-2">Carregando membros...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Controle de Acesso</h3>
        <p className="text-gray-600">Gerencie permissões e funções dos membros da equipe</p>
      </div>

      {/* Members List */}
      <div className="space-y-4">
        {members.map((member) => (
          <div key={member.uid} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <UserIcon className="w-6 h-6 text-blue-600" />
                </div>
                
                <div>
                  <div className="flex items-center space-x-2">
                    <p className="font-medium text-gray-900">{member.email}</p>
                    {getRoleIcon(member.role)}
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(member.role)}`}>
                      {member.role === 'owner' ? 'Proprietário' :
                       member.role === 'admin' ? 'Administrador' :
                       member.role === 'editor' ? 'Editor' : 'Visualizador'}
                    </span>
                    <span>Adicionado: {formatDate(member.addedAt)}</span>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      member.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {member.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {member.role !== 'owner' && (
                  <>
                    <button
                      onClick={() => handleEditMember(member)}
                      className="flex items-center px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      <PencilIcon className="w-3 h-3 mr-1" />
                      Editar
                    </button>
                    
                    <button
                      onClick={() => handleRemoveMember(member)}
                      className="flex items-center px-3 py-1 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      <TrashIcon className="w-3 h-3 mr-1" />
                      Remover
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Permissions Summary */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2">Permissões:</p>
              <div className="flex flex-wrap gap-1">
                {Object.entries(member.permissions).map(([module, hasPermission]) => (
                  <span
                    key={module}
                    className={`px-2 py-1 text-xs rounded-full ${
                      hasPermission 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {module.charAt(0).toUpperCase() + module.slice(1)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Permissions Modal */}
      {editingMember && editPermissions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Editar Permissões - {editingMember.email}
              </h3>

              {/* Role Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Função
                </label>
                <select
                  value={editRole}
                  onChange={(e) => handleRoleChange(e.target.value as TeamRole)}
                  disabled={saving}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="viewer">Visualizador</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              {/* Permissions */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Permissões por Módulo
                </label>
                <div className="space-y-3">
                  {Object.entries(editPermissions).map(([module, hasPermission]) => (
                    <label key={module} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={hasPermission}
                        onChange={(e) => updatePermission(module as keyof TeamPermissions, e.target.checked)}
                        disabled={saving}
                        className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                      />
                      <span className="text-sm text-gray-700 capitalize">
                        {module.charAt(0).toUpperCase() + module.slice(1)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditingMember(null);
                    setEditPermissions(null);
                  }}
                  disabled={saving}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSavePermissions}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Salvando...
                    </>
                  ) : (
                    'Salvar Alterações'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {members.length === 0 && (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <UserGroupIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Nenhum membro na equipe ainda</p>
          <p className="text-gray-400 text-sm">Use a aba "Grupo de Envolvidos" para convidar pessoas</p>
        </div>
      )}
    </div>
  );
}