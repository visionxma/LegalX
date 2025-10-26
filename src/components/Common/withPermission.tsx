// src/components/Common/withPermission.tsx - HOC PARA PERMISSION GUARDS
import React from 'react';
import { useTeam } from '../../contexts/TeamContext';
import { TeamPermissions } from '../../types/admin';
import { LockClosedIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline';

/**
 * HOC que protege componentes baseado em permissões
 * 
 * @example
 * const ProtectedProcessForm = withPermission(ProcessForm, 'processos');
 * 
 * @example com múltiplas permissões (ANY)
 * const ProtectedFinancial = withPermission(Financial, ['financas', 'relatorios'], 'any');
 * 
 * @example com todas as permissões (ALL)
 * const ProtectedSettings = withPermission(Settings, ['configuracoes', 'equipe'], 'all');
 */

type PermissionKey = keyof TeamPermissions;
type PermissionCheck = PermissionKey | PermissionKey[];
type PermissionMode = 'any' | 'all';

interface WithPermissionOptions {
  fallback?: React.ReactNode;
  showMessage?: boolean;
}

export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  requiredPermissions: PermissionCheck,
  mode: PermissionMode = 'any',
  options: WithPermissionOptions = {}
) {
  const { 
    fallback = null, 
    showMessage = true 
  } = options;

  return function PermissionGuardedComponent(props: P) {
    const { checkPermission, isSoloMode, activeTeam } = useTeam();

    // Normalizar para array
    const permissions = Array.isArray(requiredPermissions) 
      ? requiredPermissions 
      : [requiredPermissions];

    // Verificar permissões
    const hasPermission = mode === 'all'
      ? permissions.every(p => checkPermission(p))
      : permissions.some(p => checkPermission(p));

    // Modo solo sempre tem permissão
    if (isSoloMode || hasPermission) {
      return <Component {...props} />;
    }

    // Sem permissão - mostrar fallback
    if (fallback) {
      return <>{fallback}</>;
    }

    // Mensagem padrão de sem permissão
    if (showMessage) {
      return (
        <div className="p-6">
          <div className="max-w-md mx-auto text-center py-12">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldExclamationIcon className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso Restrito</h2>
            <p className="text-gray-600 mb-4">
              Você não possui permissão para acessar este módulo.
            </p>
            {activeTeam && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
                <p className="text-amber-800">
                  <strong>Equipe:</strong> {activeTeam.name}
                </p>
                <p className="text-amber-700 mt-2">
                  Permissões necessárias:{' '}
                  <span className="font-semibold">
                    {permissions.join(mode === 'all' ? ' E ' : ' OU ')}
                  </span>
                </p>
                <p className="text-amber-600 text-xs mt-2">
                  Entre em contato com o administrador da equipe para solicitar acesso.
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return null;
  };
}

/**
 * Hook personalizado para verificação inline de permissões
 * 
 * @example
 * const { hasPermission, canEdit, canView } = usePermissionCheck();
 * 
 * if (!hasPermission('processos')) {
 *   return <div>Sem acesso</div>;
 * }
 */
export function usePermissionCheck() {
  const { checkPermission, isSoloMode, isOwner, permissions } = useTeam();

  return {
    /**
     * Verifica se tem uma permissão específica
     */
    hasPermission: (permission: PermissionKey): boolean => {
      return checkPermission(permission);
    },

    /**
     * Verifica se tem TODAS as permissões
     */
    hasAllPermissions: (...perms: PermissionKey[]): boolean => {
      return perms.every(p => checkPermission(p));
    },

    /**
     * Verifica se tem ALGUMA das permissões
     */
    hasAnyPermission: (...perms: PermissionKey[]): boolean => {
      return perms.some(p => checkPermission(p));
    },

    /**
     * Atalhos comuns
     */
    canEdit: checkPermission('processos') || checkPermission('agenda'),
    canView: true, // Sempre pode ver (ajustar conforme necessário)
    canManageTeam: checkPermission('equipe'),
    canManageFinances: checkPermission('financas'),
    canManageSettings: checkPermission('configuracoes'),

    /**
     * Estado geral
     */
    isSoloMode,
    isOwner,
    permissions
  };
}

/**
 * Componente para exibir badge de permissão
 */
interface PermissionBadgeProps {
  permission: PermissionKey;
  className?: string;
}

export function PermissionBadge({ permission, className = '' }: PermissionBadgeProps) {
  const { checkPermission } = useTeam();
  const hasPermission = checkPermission(permission);

  if (hasPermission) {
    return null; // Não mostrar se tem permissão
  }

  return (
    <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 ${className}`}>
      <LockClosedIcon className="w-3 h-3 mr-1" />
      Sem acesso
    </span>
  );
}

/**
 * Componente para mensagem de permissão negada inline
 */
interface PermissionDeniedMessageProps {
  permission: PermissionKey;
  message?: string;
}

export function PermissionDeniedMessage({ 
  permission, 
  message = 'Você não possui permissão para esta ação' 
}: PermissionDeniedMessageProps) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
      <div className="flex items-center">
        <LockClosedIcon className="w-5 h-5 text-amber-600 mr-2" />
        <div>
          <p className="text-sm font-medium text-amber-800">{message}</p>
          <p className="text-xs text-amber-700 mt-1">
            Permissão necessária: <span className="font-semibold">{permission}</span>
          </p>
        </div>
      </div>
    </div>
  );
}