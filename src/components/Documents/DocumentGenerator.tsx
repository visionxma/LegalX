import React, { useState, useEffect } from 'react';
import PowerOfAttorneyForm from './PowerOfAttorneyForm';
import ReceiptForm from './ReceiptForm';
import DocumentViewer from './DocumentViewer';
import { firestoreService } from '../../services/firestoreService';
import { Document } from '../../types';
import { DocumentTextIcon, ReceiptPercentIcon, EyeIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DocumentGeneratorProps {
  quickActionType?: string | null;
  onClearQuickAction: () => void;
}

export default function DocumentGenerator({ quickActionType, onClearQuickAction }: DocumentGeneratorProps) {
  const [activeDocument, setActiveDocument] = useState<'power-of-attorney' | 'receipt' | null>(null);
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (quickActionType === 'power-of-attorney') {
      setActiveDocument('power-of-attorney');
      onClearQuickAction();
    } else if (quickActionType === 'receipt') {
      setActiveDocument('receipt');
      onClearQuickAction();
    }
  }, [quickActionType, onClearQuickAction]);

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
      </div>

      {/* Document Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
        <div
          onClick={() => setActiveDocument('power-of-attorney')}
          className="bg-white rounded-lg shadow-md border-2 border-transparent hover:border-blue-300 transition-all cursor-pointer group"
        >
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200 transition-colors">
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
            <button className="mt-6 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Criar Procuração
            </button>
          </div>
        </div>

        <div
          onClick={() => setActiveDocument('receipt')}
          className="bg-white rounded-lg shadow-md border-2 border-transparent hover:border-green-300 transition-all cursor-pointer group"
        >
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-green-200 transition-colors">
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
            <button className="mt-6 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              Criar Recibo
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
                Nenhum documento gerado ainda
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