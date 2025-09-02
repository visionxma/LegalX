import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { TeamInvitation } from '../../types/admin';
import { CheckCircleIcon, ExclamationTriangleIcon, ClockIcon } from '@heroicons/react/24/outline';

export default function InviteAcceptPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState<TeamInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const inviteId = searchParams.get('inviteId');

  useEffect(() => {
    if (inviteId) {
      loadInvitation();
    } else {
      setResult({ success: false, message: 'Link de convite inválido' });
      setLoading(false);
    }
  }, [inviteId]);

  const loadInvitation = async () => {
    if (!inviteId) return;
    
    try {
      setLoading(true);
      const invite = await adminService.getInvitationById(inviteId);
      
      if (!invite) {
        setResult({ success: false, message: 'Convite não encontrado' });
        return;
      }
      
      // Verificar se expirou
      const now = new Date();
      const expiresAt = new Date(invite.expiresAt);
      
      if (now > expiresAt) {
        setResult({ success: false, message: 'Este convite expirou' });
        return;
      }
      
      if (invite.status !== 'pending') {
        setResult({ 
          success: false, 
          message: invite.status === 'accepted' 
            ? 'Este convite já foi aceito' 
            : 'Este convite foi cancelado'
        });
        return;
      }
      
      setInvitation(invite);
    } catch (error) {
      console.error('Erro ao carregar convite:', error);
      setResult({ success: false, message: 'Erro ao carregar convite' });
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async () => {
    if (!inviteId) return;
    
    try {
      setAccepting(true);
      const response = await adminService.acceptInvitation(inviteId);
      
      setResult(response);
      
      if (response.success) {
        // Redirecionar para o dashboard após 3 segundos
        setTimeout(() => {
          navigate('/');
        }, 3000);
      }
    } catch (error) {
      console.error('Erro ao aceitar convite:', error);
      setResult({ success: false, message: 'Erro interno. Tente novamente.' });
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando convite...</p>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          {result.success ? (
            <>
              <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Convite Aceito!</h2>
              <p className="text-gray-600 mb-6">{result.message}</p>
              <p className="text-sm text-gray-500">Redirecionando para o sistema...</p>
            </>
          ) : (
            <>
              <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Erro no Convite</h2>
              <p className="text-gray-600 mb-6">{result.message}</p>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Ir para o Sistema
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Convite Inválido</h2>
          <p className="text-gray-600 mb-6">Este link de convite não é válido ou expirou.</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Ir para o Sistema
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Legal<span className="text-amber-400">X</span>
          </h1>
          <p className="text-blue-600">Sistema de Gestão Jurídica</p>
        </div>

        {/* Invitation Details */}
        <div className="text-center mb-6">
          <ClockIcon className="w-12 h-12 text-blue-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Convite para Equipe</h2>
          <p className="text-gray-600 mb-4">
            Você foi convidado para fazer parte da equipe como <strong>{invitation.role}</strong>
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">E-mail:</span>
                <span className="font-medium">{invitation.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Função:</span>
                <span className="font-medium capitalize">{invitation.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Expira em:</span>
                <span className="font-medium">
                  {format(new Date(invitation.expiresAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleAcceptInvite}
            disabled={accepting}
            className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {accepting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Aceitando Convite...
              </>
            ) : (
              <>
                <CheckCircleIcon className="w-5 h-5 mr-2" />
                Aceitar Convite
              </>
            )}
          </button>
          
          <button
            onClick={() => navigate('/')}
            disabled={accepting}
            className="w-full px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>

        {/* Info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Ao aceitar, você terá acesso aos módulos permitidos pela sua função.
          </p>
        </div>
      </div>
    </div>
  );
}