// src/components/Documents/DocumentGenerator.tsx - COM PERMISSION GUARDS
import React, { useState, useEffect } from 'react';
import PowerOfAttorneyForm from './PowerOfAttorneyForm';
import ReceiptForm from './ReceiptForm';
import DocumentViewer from './DocumentViewer';
import { firestoreService } from '../../services/firestoreService';
import { usePermissionCheck } from '../Common/withPermission'; // NOVO
import { useTeam } from '../../contexts/TeamContext'; // NOVO
import { Document } from '../../types';
import { DocumentTextIcon, ReceiptPercentIcon, EyeIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DocumentGeneratorProps {
  quickActionType?: string | null;
  onClearQuickAction: () => void;
}

function DocumentGenerator({ quickActionType, onClearQuickAction }: DocumentGeneratorProps) {
  const [activeDocument, setActiveDocument] = useState<'power-of-attorney' | 'receipt' | null>(null);
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);

  // NOVO: Permission checks
  const { hasPermission } = usePermissionCheck();
  const { isSoloMode, activeTeam } = useTeam();
  
  const canCreate = hasPermission('documentos');
  const canView = true; // Visualizar sempre permitido
  const canDelete = hasPermission('documentos');

  useEffect(() => {
    if (quickActionType === 'power-of-attorney' && canCreate) {
      setActiveDocument('power-of-attorney');
      onClearQuickAction();
    } else if (quickActionType === 'receipt' && canCreate) {
      setActiveDocument('receipt');
      onClearQuickAction();
    } else if ((quickActionType === 'power-of-attorney' || quickActionType === 'receipt') && !canCreate) {
      alert('Você não possui permissão para criar documentos.');
      onClearQuickAction();
    }
  }, [quickActionType, onClearQuickAction, canCreate]);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const loadedDocuments = await firestoreService.getDocuments();
      setDocuments(loadedDocuments);
    } catch (error) {
      console.error('Erro ao carregar documentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocument = (document: Document) => {
    setViewingDocument(document);
  };

  const handleBackFromViewer = () => {
    setViewingDocument(null);
  };

  const handleCreateDocument = (type: 'power-of-attorney' | 'receipt') => {
    if (!canCreate) {
      alert('Você não possui permissão para criar documentos.');
      return;
    }
    setActiveDocument(type);
  };

  if (activeDocument === 'power-of-attorney') {
    return (
      <PowerOfAttorneyForm
        onBack={() => setActiveDocument(null)}
        onSave={loadDocuments}
      />
    );
  }

  if (activeDocument === 'receipt') {
    return (
      <ReceiptForm
        onBack={() => setActiveDocument(null)}
        onSave={loadDocuments}
      />
    );
  }

  if (viewingDocument) {
    return (
      <DocumentViewer
        document={viewingDocument}
        onBack={handleBackFromViewer}
      />
    );
  }
  
  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Gerador de Documentos</h1>
        <p className="text-gray-600">Crie documentos jurídicos profissionais</p>
        {/* NOVO: Indicador de contexto */}
        {!isSoloMode && activeTeam && (
          <p className="text-xs text-blue-600 mt-1">
            📄 Visualizando documentos da equipe: {activeTeam.name}
          </p>
        )}
      </div>

      {/* NOVO: Mensagem de permissão */}
      {!canCreate && !isSoloMode && (
        <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            ⚠️ Você possui acesso somente leitura. Não é possível criar novos documentos.
          </p>
        </div>
      )}

      {/* Document Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
        <div
          onClick={() => handleCreateDocument('power-of-attorney')}
          className={`bg-white rounded-lg shadow-md border-2 transition-all ${
            canCreate 
              ? 'border-transparent hover:border-blue-300 cursor-pointer group' 
              : 'border-gray-200 opacity-60 cursor-not-allowed'
          }`}
        >
          <div className="p-8 text-center">
            <div className={`w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors ${
              canCreate ? 'group-hover:bg-blue-200' : ''
            }`}>
              <DocumentTextIcon className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Procuração</h3>
            <p className="text-gray-600 mb-4">
              Gere procurações jurídicas com todos os dados necessários
            </p>
            <div className="space-y-2 text-sm text-gray-500">
              <p>• Procuração Ad Judicia</p>
              <p>• Procuração para fins específicos</p>
              <p>• Geração em PDF e DOCX</p>
            </div>
            <button 
              disabled={!canCreate}
              className={`mt-6 w-full px-4 py-2 rounded-lg transition-colors ${
                canCreate
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {canCreate ? 'Criar Procuração' : 'Sem Permissão'}
            </button>
          </div>
        </div>

        <div
          onClick={() => handleCreateDocument('receipt')}
          className={`bg-white rounded-lg shadow-md border-2 transition-all ${
            canCreate 
              ? 'border-transparent hover:border-green-300 cursor-pointer group' 
              : 'border-gray-200 opacity-60 cursor-not-allowed'
          }`}
        >
          <div className="p-8 text-center">
            <div className={`w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors ${
              canCreate ? 'group-hover:bg-green-200' : ''
            }`}>
              <ReceiptPercentIcon className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Recibo</h3>
            <p className="text-gray-600 mb-4">
              Emita recibos profissionais para honorários e serviços
            </p>
            <div className="space-y-2 text-sm text-gray-500">
              <p>• Recibo de honorários advocatícios</p>
              <p>• Recibo de consultoria jurídica</p>
              <p>• Geração em PDF</p>
            </div>
            <button 
              disabled={!canCreate}
              className={`mt-6 w-full px-4 py-2 rounded-lg transition-colors ${
                canCreate
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {canCreate ? 'Criar Recibo' : 'Sem Permissão'}
            </button>
          </div>
        </div>
      </div>

      {/* Recent Documents */}
      <div className="mt-12">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Documentos Recentes</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-6">
              <p className="text-gray-500 text-center">Carregando documentos...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="p-6">
              <p className="text-gray-500 text-center">
                {canCreate 
                  ? 'Nenhum documento gerado ainda. Clique em um dos tipos acima para começar.'
                  : 'Nenhum documento gerado ainda.'
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {documents.slice(0, 10).map((document) => (
                <div key={document.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">{document.type}</h3>
                      <p className="text-sm text-gray-500">Cliente: {document.client}</p>
                      <p className="text-xs text-gray-400">
                        Criado em {format(new Date(document.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </p>
                    </div>
                    <div className="flex items-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        document.type === 'Procuração' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {document.type}
                      </span>
                      <button
                        onClick={() => handleViewDocument(document)}
                        className="flex items-center px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors ml-2"
                        title="Visualizar documento"
                      >
                        <EyeIcon className="w-3 h-3 mr-1" />
                        Ver
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// NOVO: Exportar com guard
import { withPermission } from '../Common/withPermission';

export default withPermission(DocumentGenerator, 'documentos', 'any', {
  showMessage: true
});