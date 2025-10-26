// src/components/Processes/ProcessList.tsx - COM GUARDS
import React, { useState, useEffect } from 'react';
import { Process } from '../../types';
import { firestoreService } from '../../services/firestoreService';
import { withPermission, usePermissionCheck } from '../Common/withPermission'; // IMPORT
import { useTeam } from '../../contexts/TeamContext'; // IMPORT
import { 
  MagnifyingGlassIcon, 
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProcessListProps {
  onNewProcess: () => void;
  onViewProcess: (process: Process) => void;
  onEditProcess: (process: Process) => void;
}

function ProcessList({ onNewProcess, onViewProcess, onEditProcess }: ProcessListProps) {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  
  // NOVO: Hooks de permissão
  const { hasPermission } = usePermissionCheck();
  const { isSoloMode, activeTeam } = useTeam();
  
  const canCreate = hasPermission('processos');
  const canEdit = hasPermission('processos');
  const canDelete = hasPermission('processos');

  useEffect(() => {
    loadProcesses();
  }, []);

  const loadProcesses = async () => {
    try {
      setLoading(true);
      const loadedProcesses = await firestoreService.getProcesses();
      setProcesses(loadedProcesses);
      console.log(`${loadedProcesses.length} processos carregados`);
    } catch (error) {
      console.error('Erro ao carregar processos:', error);
      alert('Erro ao carregar processos. Tente recarregar a página.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProcess = async (id: string) => {
    if (!canDelete) {
      alert('Você não possui permissão para excluir processos.');
      return;
    }
    
    if (confirm('Tem certeza que deseja excluir este processo?')) {
      try {
        const success = await firestoreService.deleteProcess(id);
        if (success) {
          await loadProcesses();
        }
      } catch (error) {
        console.error('Erro ao excluir processo:', error);
        alert('Erro ao excluir processo. Tente novamente.');
      }
    }
  };

  const filteredProcesses = processes.filter(process => {
    const matchesSearch = process.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         process.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         process.processNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || process.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Processos Jurídicos</h1>
          <p className="text-gray-600">Gerencie todos os processos do escritório</p>
          {/* NOVO: Indicador de contexto */}
          {!isSoloMode && activeTeam && (
            <p className="text-xs text-blue-600 mt-1">
              📁 Visualizando processos da equipe: {activeTeam.name}
            </p>
          )}
        </div>
        <button
          onClick={onNewProcess}
          disabled={!canCreate}
          className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
            canCreate
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          title={!canCreate ? 'Sem permissão para criar processos' : 'Criar novo processo'}
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Novo Processo
        </button>
      </div>

      {/* NOVO: Mensagem de permissão */}
      {!canCreate && !isSoloMode && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            ⚠️ Você possui acesso somente leitura. Não é possível criar ou editar processos.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nome, cliente ou número do processo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center space-x-2">
          <FunnelIcon className="w-5 h-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos os Status</option>
            <option value="Em andamento">Em andamento</option>
            <option value="Concluído">Concluído</option>
          </select>
        </div>
      </div>

      {/* Process Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Processo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Advogado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data Início
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProcesses.map((process) => (
                <tr key={process.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{process.name}</div>
                      <div className="text-sm text-gray-500">{process.processNumber}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {process.client}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      {process.responsibleLawyers && process.responsibleLawyers.length > 0 ? (
                        <>
                          <div className="font-medium">{process.responsibleLawyers[0]}</div>
                          {process.responsibleLawyers.length > 1 && (
                            <div className="text-xs text-gray-500">
                              +{process.responsibleLawyers.length - 1} outros
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-400">Não definido</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(process.startDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        process.status === 'Em andamento'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {process.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {/* Visualizar sempre permitido */}
                      <button
                        onClick={() => onViewProcess(process)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                        title="Visualizar"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      
                      {/* NOVO: Editar com guard */}
                      <button
                        onClick={() => canEdit && onEditProcess(process)}
                        disabled={!canEdit}
                        className={`p-1 rounded ${
                          canEdit
                            ? 'text-amber-600 hover:text-amber-900 hover:bg-amber-50'
                            : 'text-gray-300 cursor-not-allowed'
                        }`}
                        title={!canEdit ? 'Sem permissão para editar' : 'Editar'}
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      
                      {/* NOVO: Excluir com guard */}
                      <button
                        onClick={() => handleDeleteProcess(process.id)}
                        disabled={!canDelete}
                        className={`p-1 rounded ${
                          canDelete
                            ? 'text-red-600 hover:text-red-900 hover:bg-red-50'
                            : 'text-gray-300 cursor-not-allowed'
                        }`}
                        title={!canDelete ? 'Sem permissão para excluir' : 'Excluir'}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Carregando processos...</p>
          </div>
        ) : filteredProcesses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {processes.length === 0 
                ? canCreate 
                  ? 'Nenhum processo cadastrado. Clique em "Novo Processo" para começar.' 
                  : 'Nenhum processo cadastrado ainda.'
                : 'Nenhum processo encontrado com os filtros aplicados.'
              }
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// EXPORTAR COM GUARD
export default withPermission(ProcessList, 'processos', 'any', {
  showMessage: true
});