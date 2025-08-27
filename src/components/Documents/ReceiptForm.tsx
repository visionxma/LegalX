import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Lawyer } from '../../types';
import { ArrowLeftIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import jsPDF from 'jspdf';
import { firestoreService } from '../../services/firestoreService';

const schema = yup.object({
  clientName: yup.string().required('Nome do cliente é obrigatório'),
  amount: yup.number().positive('Valor deve ser positivo').required('Valor é obrigatório'),
  description: yup.string().required('Descrição é obrigatória'),
  paymentMethod: yup.string().required('Forma de pagamento é obrigatória'),
  lawyerName: yup.string().required('Nome do advogado é obrigatório'),
  lawyerOab: yup.string().required('OAB do advogado é obrigatória'),
  lawyerCpf: yup.string().required('CPF do advogado é obrigatório'),
  date: yup.string().required('Data é obrigatória')
});

interface ReceiptFormProps {
  onBack: () => void;
  onSave?: () => void;
}

interface ReceiptData {
  clientName: string;
  amount: number;
  description: string;
  paymentMethod: string;
  lawyerName: string;
  lawyerOab: string;
  lawyerCpf: string;
  date: string;
}

export default function ReceiptForm({ onBack, onSave }: ReceiptFormProps) {
  const [lawyers, setLawyers] = React.useState<Lawyer[]>([]);
  const [loading, setLoading] = React.useState(false);
  
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<ReceiptData>({
    resolver: yupResolver(schema),
    defaultValues: {
      paymentMethod: 'PIX',
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const numberToWords = (num: number): string => {
    const ones = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
    const teens = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
    const tens = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
    const hundreds = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
    
    if (num === 0) return 'zero';
    if (num === 100) return 'cem';
    
    let result = '';
    
    if (num >= 1000) {
      const thousands = Math.floor(num / 1000);
      result += numberToWords(thousands) + ' mil';
      num %= 1000;
      if (num > 0) result += ' e ';
    }
    
    if (num >= 100) {
      result += hundreds[Math.floor(num / 100)];
      num %= 100;
      if (num > 0) result += ' e ';
    }
    
    if (num >= 20) {
      result += tens[Math.floor(num / 10)];
      num %= 10;
      if (num > 0) result += ' e ';
    } else if (num >= 10) {
      result += teens[num - 10];
      return result;
    }
    
    if (num > 0) {
      result += ones[num];
    }
    
    return result.trim();
  };

  const generatePDF = (data: ReceiptData) => {
    const doc = new jsPDF();
    
    // Cores da identidade visual
    const primaryBlue = [37, 99, 235]; // #2563eb
    const accentAmber = [245, 158, 11]; // #f59e0b
    const darkGray = [55, 65, 81]; // #374151
    const lightGray = [156, 163, 175]; // #9ca3af
    const successGreen = [34, 197, 94]; // #22c55e
    
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
    doc.text('RECIBO', 105, 45, { align: 'center' });
    
    // Linha decorativa
    doc.setDrawColor(...accentAmber);
    doc.setLineWidth(2);
    doc.line(20, 50, 190, 50);
    
    // Box com valor em destaque
    doc.setFillColor(248, 250, 252); // bg-slate-50
    doc.setDrawColor(...successGreen);
    doc.setLineWidth(1);
    doc.roundedRect(20, 55, 170, 20, 3, 3, 'FD');
    
    // Valor em destaque
    doc.setTextColor(...successGreen);
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(`Valor: ${formatCurrency(data.amount)}`, 105, 67, { align: 'center' });
    
    // Content
    doc.setTextColor(...darkGray);
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    
    let yPosition = 85;
    const lineHeight = 6;
    
    const amountInWords = numberToWords(Math.floor(data.amount));
    const cents = Math.round((data.amount % 1) * 100);
    const centsInWords = cents > 0 ? ` e ${numberToWords(cents)} centavos` : '';
    
    // Conteúdo principal com formatação melhorada
    const content = `
Recebi de ${data.clientName} a importância de ${formatCurrency(data.amount)} 
(${amountInWords} reais${centsInWords}), referente a ${data.description}.

Forma de pagamento: ${data.paymentMethod}

Para clareza firmo o presente recibo.

${new Date(data.date).toLocaleDateString('pt-BR')}


_________________________________
${data.lawyerName}
OAB/SP nº ${data.lawyerOab}
CPF: ${data.lawyerCpf}
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
    doc.save(`recibo_${data.clientName.replace(/\s+/g, '_').toLowerCase()}.pdf`);
  };

  const onSubmit = async (data: ReceiptData) => {
    try {
      setLoading(true);
      
      // Salvar documento no Firestore
      const savedDocument = await firestoreService.saveDocument({
        type: 'Recibo',
        client: data.clientName,
        data: {
          amount: data.amount,
          description: data.description,
          paymentMethod: data.paymentMethod,
          date: data.date,
          lawyerName: data.lawyerName,
          lawyerOab: data.lawyerOab
        }
      });
      
      console.log('Recibo salvo no sistema:', savedDocument);
      
      // Chamar callback para atualizar lista
      if (onSave) {
        await onSave();
      }
      
      // Gerar PDF
      generatePDF(data);
    } catch (error) {
      console.error('Erro ao salvar recibo:', error);
      alert('Erro ao salvar recibo no sistema. Tente novamente.');
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
          <h1 className="text-2xl font-bold text-gray-900">Novo Recibo</h1>
          <p className="text-gray-600">Preencha os dados para gerar o recibo</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl">
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Client Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Dados do Cliente</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome do Cliente *
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
          </div>

          {/* Service Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Dados do Serviço</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor *
                </label>
                <input
                  {...register('amount', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  placeholder="0.00"
                />
                {errors.amount && (
                  <p className="text-red-500 text-sm mt-1">{errors.amount.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Forma de Pagamento *
                </label>
                <select
                  {...register('paymentMethod')}
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="PIX">PIX</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                  <option value="Cartão de Débito">Cartão de Débito</option>
                  <option value="Transferência Bancária">Transferência Bancária</option>
                  <option value="Cheque">Cheque</option>
                </select>
                {errors.paymentMethod && (
                  <p className="text-red-500 text-sm mt-1">{errors.paymentMethod.message}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição do Serviço *
                </label>
                <textarea
                  {...register('description')}
                  rows={3}
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  placeholder="Ex: Honorários advocatícios referentes à consultoria jurídica"
                />
                {errors.description && (
                  <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Lawyer Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Dados do Advogado</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Advogado *
                </label>
                <select
                  {...register('lawyerName')}
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  onChange={(e) => {
                    const selectedLawyer = lawyers.find(l => l.fullName === e.target.value);
                    if (selectedLawyer) {
                      setValue('lawyerOab', selectedLawyer.oab);
                      setValue('lawyerCpf', selectedLawyer.cpf);
                    }
                  }}
                >
                  <option value="">Selecione um advogado</option>
                  {lawyers.map((lawyer) => (
                    <option key={lawyer.id} value={lawyer.fullName}>
                      {lawyer.fullName} - OAB: {lawyer.oab}
                    </option>
                  ))}
                </select>
                {errors.lawyerName && (
                  <p className="text-red-500 text-sm mt-1">{errors.lawyerName.message}</p>
                )}
                {lawyers.length === 0 && (
                  <p className="text-amber-600 text-sm mt-1">
                    Nenhum advogado ativo encontrado. Cadastre advogados na aba "Advogados".
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  OAB *
                </label>
                <input
                  {...register('lawyerOab')}
                  type="text"
                  readOnly
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  placeholder="00000/UF"
                />
                {errors.lawyerOab && (
                  <p className="text-red-500 text-sm mt-1">{errors.lawyerOab.message}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Preenchido automaticamente ao selecionar o advogado
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CPF *
                </label>
                <input
                  {...register('lawyerCpf')}
                  type="text"
                  readOnly
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  placeholder="000.000.000-00"
                />
                {errors.lawyerCpf && (
                  <p className="text-red-500 text-sm mt-1">{errors.lawyerCpf.message}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Preenchido automaticamente ao selecionar o advogado
                </p>
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
              className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
              {loading ? 'Processando...' : 'Gerar Recibo PDF'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}