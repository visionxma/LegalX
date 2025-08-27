import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Lawyer } from '../../types';
import { ArrowLeftIcon, DocumentArrowDownIcon, XMarkIcon } from '@heroicons/react/24/outline';
import jsPDF from 'jspdf';
import { firestoreService } from '../../services/firestoreService';

const schema = yup.object({
  clientName: yup.string().required('Nome do cliente é obrigatório'),
  clientCpf: yup.string().required('CPF do cliente é obrigatório'),
  clientRg: yup.string().required('RG do cliente é obrigatório'),
  clientAddress: yup.string().required('Endereço do cliente é obrigatório'),
  lawyers: yup.array().min(1, 'Pelo menos um advogado é obrigatório'),
  type: yup.string().required('Tipo de procuração é obrigatório'),
  object: yup.string().required('Objeto da procuração é obrigatório'),
  location: yup.string().required('Local é obrigatório'),
  date: yup.string().required('Data é obrigatória')
});

interface PowerOfAttorneyFormProps {
  onBack: () => void;
  onSave?: () => void;
}

interface PowerOfAttorneyData {
  clientName: string;
  clientCpf: string;
  clientRg: string;
  clientAddress: string;
  lawyers: string[];
  type: string;
  object: string;
  location: string;
  date: string;
}

export default function PowerOfAttorneyForm({ onBack, onSave }: PowerOfAttorneyFormProps) {
  const [lawyers, setLawyers] = React.useState<Lawyer[]>([]);
  const [selectedLawyers, setSelectedLawyers] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<PowerOfAttorneyData>({
    resolver: yupResolver(schema),
    defaultValues: {
      type: 'Ad Judicia',
      date: new Date().toISOString().split('T')[0]
    }
  });

  React.useEffect(() => {
    // Carregar advogados ativos
    const loadLawyers = async () => {
      try {
        const loadedLawyers = await firestoreService.getLawyers();
        const activeLawyers = loadedLawyers.filter(l => l.status === 'Ativo');
        setLawyers(activeLawyers);
      } catch (error) {
        console.error('Erro ao carregar advogados:', error);
      }
    };
    
    loadLawyers();
  }, []);

  const handleLawyerToggle = (lawyerName: string) => {
    setSelectedLawyers(prev => {
      if (prev.includes(lawyerName)) {
        return prev.filter(name => name !== lawyerName);
      } else {
        return [...prev, lawyerName];
      }
    });
  };

  const generatePDF = (data: PowerOfAttorneyData) => {
    const doc = new jsPDF();
    
    // Cores da identidade visual
    const primaryBlue = [37, 99, 235]; // #2563eb
    const accentAmber = [245, 158, 11]; // #f59e0b
    const darkGray = [55, 65, 81]; // #374151
    const lightGray = [156, 163, 175]; // #9ca3af
    
    // Header com logo e identidade visual
    doc.setFillColor(...primaryBlue);
    doc.rect(0, 0, 210, 25, 'F');
    
    // Logo LegalX
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text('Legal', 20, 17);
    doc.setTextColor(...accentAmber);
    doc.text('X', 50, 17);
    
    // Subtítulo
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('Sistema de Gestão Jurídica', 20, 22);
    
    // Título do documento
    doc.setTextColor(...darkGray);
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('PROCURAÇÃO', 105, 45, { align: 'center' });
    
    // Linha decorativa
    doc.setDrawColor(...accentAmber);
    doc.setLineWidth(2);
    doc.line(20, 50, 190, 50);
    
    // Content
    doc.setTextColor(...darkGray);
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    
    let yPosition = 65;
    const lineHeight = 6;
    
    const lawyersText = selectedLawyers.length > 1 
      ? `os(as) Srs(as). ${selectedLawyers.join(', ')}`
      : `o(a) Sr(a). ${selectedLawyers[0]}`;
    
    const lawyersOab = selectedLawyers.map(name => {
      const lawyer = lawyers.find(l => l.fullName === name);
      return lawyer ? `${name} (OAB ${lawyer.oab})` : name;
    }).join(', ');

    const content = `
Pelo presente instrumento particular de procuração, eu, ${data.clientName}, 
${data.clientCpf.includes('.') ? 'CPF' : 'CPF'} nº ${data.clientCpf}, RG nº ${data.clientRg}, 
residente e domiciliado em ${data.clientAddress}, 

NOMEIO e CONSTITUO como ${selectedLawyers.length > 1 ? 'meus bastantes procuradores' : 'meu bastante procurador'} ${lawyersText}, 
${selectedLawyers.length > 1 ? 'inscritos na OAB' : 'inscrito(a) na OAB'} (${lawyersOab}), para o fim específico de:

${data.object}

Outorgo-lhe poderes para representar-me ${data.type === 'Ad Judicia' ? 'em juízo' : 'para os fins específicos acima descritos'}, 
podendo para tanto praticar todos os atos necessários ao bom e fiel cumprimento 
do presente mandato.

Por ser verdade, firmo a presente.

${data.location}, ${new Date(data.date).toLocaleDateString('pt-BR')}.


_________________________________
${data.clientName}
Outorgante
    `.trim();

    const lines = doc.splitTextToSize(content, 170);
    
    lines.forEach((line: string) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 30;
      }
      doc.text(line, 20, yPosition);
      yPosition += lineHeight;
    });
    
    // Footer com informações do sistema
    doc.setDrawColor(...lightGray);
    doc.setLineWidth(0.5);
    doc.line(20, 280, 190, 280);
    
    doc.setTextColor(...lightGray);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text('Documento gerado pelo LegalX - Sistema de Gestão Jurídica', 20, 285);
    doc.text(`Data de geração: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 20, 290);
    
    // Número da página (se necessário)
    const pageCount = doc.internal.getNumberOfPages();
    if (pageCount > 1) {
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(`Página ${i} de ${pageCount}`, 190, 290, { align: 'right' });
      }
    }

    // Save PDF
    doc.save(`procuracao_${data.clientName.replace(/\s+/g, '_').toLowerCase()}.pdf`);
  };

  const onSubmit = async (data: PowerOfAttorneyData) => {
    if (selectedLawyers.length === 0) {
      alert('Selecione pelo menos um advogado.');
      return;
    }
    
    try {
      setLoading(true);
      
      // Salvar documento no Firestore
      const savedDocument = await firestoreService.saveDocument({
        type: 'Procuração',
        client: data.clientName,
        data: {
          type: data.type,
          object: data.object,
          location: data.location,
          date: data.date,
          lawyers: selectedLawyers
        }
      });
      
      console.log('Procuração salva no sistema:', savedDocument);
      
      // Chamar callback para atualizar lista
      if (onSave) {
        await onSave();
      }
      
      // Gerar PDF
      generatePDF({ ...data, lawyers: selectedLawyers });
    } catch (error) {
      console.error('Erro ao salvar procuração:', error);
      alert('Erro ao salvar procuração no sistema. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
          disabled={loading}
        >
          <ArrowLeftIcon className="w-5 h-5 mr-2" />
          Voltar
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nova Procuração</h1>
          <p className="text-gray-600">Preencha os dados para gerar a procuração</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl">
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Client Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Dados do Cliente (Outorgante)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Completo *
                </label>
                <input
                  {...register('clientName')}
                  type="text"
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  placeholder="Nome completo do cliente"
                />
                {errors.clientName && (
                  <p className="text-red-500 text-sm mt-1">{errors.clientName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CPF *
                </label>
                <input
                  {...register('clientCpf')}
                  type="text"
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  placeholder="000.000.000-00"
                />
                {errors.clientCpf && (
                  <p className="text-red-500 text-sm mt-1">{errors.clientCpf.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  RG *
                </label>
                <input
                  {...register('clientRg')}
                  type="text"
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  placeholder="00.000.000-0"
                />
                {errors.clientRg && (
                  <p className="text-red-500 text-sm mt-1">{errors.clientRg.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Endereço Completo *
                </label>
                <input
                  {...register('clientAddress')}
                  type="text"
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  placeholder="Rua, número, bairro, cidade, estado"
                />
                {errors.clientAddress && (
                  <p className="text-red-500 text-sm mt-1">{errors.clientAddress.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Lawyer Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Dados do Advogado (Outorgado)</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Advogados Outorgados *
              </label>
              <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto">
                {lawyers.length > 0 ? (
                  <div className="space-y-2">
                    {lawyers.map((lawyer) => (
                      <label key={lawyer.id} className="flex items-center">
                        <input
                          type="checkbox"
                          disabled={loading}
                          checked={selectedLawyers.includes(lawyer.fullName)}
                          onChange={() => handleLawyerToggle(lawyer.fullName)}
                          className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                        />
                        <span className="text-sm text-gray-700">
                          {lawyer.fullName} - OAB: {lawyer.oab}
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Nenhum advogado disponível</p>
                )}
              </div>
              {selectedLawyers.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-gray-600">Selecionados:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedLawyers.map((lawyer, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {lawyer}
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => handleLawyerToggle(lawyer)}
                          className="ml-1 text-blue-600 hover:text-blue-800 disabled:opacity-50"
                        >
                          <XMarkIcon className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {selectedLawyers.length === 0 && (
                <p className="text-red-500 text-sm mt-1">Pelo menos um advogado é obrigatório</p>
              )}
              {lawyers.length === 0 && (
                <p className="text-amber-600 text-sm mt-1">
                  Nenhum advogado ativo encontrado. Cadastre advogados na aba "Advogados".
                </p>
              )}
            </div>
          </div>

          {/* Procuration Details */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalhes da Procuração</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo *
                </label>
                <select
                  {...register('type')}
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="Ad Judicia">Ad Judicia</option>
                  <option value="Para fins específicos">Para fins específicos</option>
                </select>
                {errors.type && (
                  <p className="text-red-500 text-sm mt-1">{errors.type.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Local *
                </label>
                <input
                  {...register('location')}
                  type="text"
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  placeholder="São Paulo - SP"
                />
                {errors.location && (
                  <p className="text-red-500 text-sm mt-1">{errors.location.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data *
                </label>
                <input
                  {...register('date')}
                  type="date"
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
                {errors.date && (
                  <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Objeto da Procuração *
                </label>
                <textarea
                  {...register('object')}
                  rows={4}
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  placeholder="Descreva o objeto/finalidade da procuração..."
                />
                {errors.object && (
                  <p className="text-red-500 text-sm mt-1">{errors.object.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={onBack}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
              {loading ? 'Processando...' : 'Gerar Procuração PDF'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}