import React, { useState } from 'react';
import { Process } from '../../types';
import { ArrowLeftIcon, PencilIcon, DocumentIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { firestoreService } from '../../services/firestoreService';

interface ProcessViewProps {
  process: Process;
  onBack: () => void;
  onEdit: () => void;
  onUpdate?: (process: Process) => void;
}

export default function ProcessView({ process, onBack, onEdit, onUpdate }: ProcessViewProps) {
  const [loading, setLoading] = useState(false);

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
  };

  const handleMarkAsCompleted = async () => {
    if (confirm('Tem certeza que deseja marcar este processo como concluído?')) {
      try {
        setLoading(true);
        const updatedProcess = await firestoreService.updateProcess(process.id, {
          status: 'Concluído'
        });
        
        if (updatedProcess && onUpdate) {
          onUpdate(updatedProcess);
        }
      } catch (error) {
        console.error('Erro ao atualizar status do processo:', error);
        alert('Erro ao atualizar processo. Tente novamente.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
            disabled={loading}
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            Voltar
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{process.name}</h1>
            <p className="text-gray-600">Visualização detalhada do processo</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {process.status === 'Em andamento' && (
            <button
              onClick={handleMarkAsCompleted}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              <CheckCircleIcon className="w-5 h-5 mr-2" />
              {loading ? 'Atualizando...' : 'Marcar como Concluído'}
            </button>
          )}
          <button
            onClick={onEdit}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            disabled={loading}
          >
            <PencilIcon className="w-5 h-5 mr-2" />
            Editar
          </button>
        </div>
      </div>

      <div className="max-w-4xl space-y-6">
        {/* Process Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações do Processo</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Número do Processo
              </label>
              <p className="text-gray-900 font-mono">{process.processNumber}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Status
              </label>
              <span
                className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                  process.status === 'Em andamento'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-green-100 text-green-800'
                }`}
              >
                {process.status}
              </span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Cliente
              </label>
              <p className="text-gray-900">{process.client}</p>
            </div>

            {process.opposingParty && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Parte Contrária
                </label>
                <p className="text-gray-900">{process.opposingParty}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Fórum/Comarca
              </label>
              <p className="text-gray-900">{process.court}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Advogados Responsáveis
              </label>
              <div>
                {process.responsibleLawyers && process.responsibleLawyers.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {process.responsibleLawyers.map((lawyer, index) => (
                      <span
                        key={index}
                        className="inline-flex px-2 py-1 text-sm bg-blue-100 text-blue-800 rounded-full"
                      >
                        {lawyer}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400">Não definido</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Data de Início
              </label>
              <p className="text-gray-900">{formatDate(process.startDate)}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Data de Criação
              </label>
              <p className="text-gray-900">{formatDate(process.createdAt)}</p>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Descrição do Caso</h3>
          <div className="prose max-w-none">
            <p className="text-gray-700 whitespace-pre-wrap">{process.description}</p>
          </div>
        </div>

        {/* Notes */}
        {process.notes && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Anotações Complementares</h3>
            <div className="prose max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap">{process.notes}</p>
            </div>
          </div>
        )}

        {/* Attachments */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Documentos Anexos</h3>
          {process.attachments && process.attachments.length > 0 ? (
            <div className="space-y-3">
              {process.attachments.map((attachment, index) => (
                <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <DocumentIcon className="w-5 h-5 text-gray-400 mr-3" />
                  <span className="text-gray-900">{attachment}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Nenhum documento anexado</p>
          )}
        </div>
      </div>
    </div>
  );
}