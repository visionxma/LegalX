import React from 'react';
import { Document } from '../../types';
import { ArrowLeftIcon, DocumentArrowDownIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import { Document as DocxDocument, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';

interface DocumentViewerProps {
  document: Document;
  onBack: () => void;
}

export default function DocumentViewer({ document, onBack }: DocumentViewerProps) {
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const generatePowerOfAttorneyPDF = (docData: any) => {
    const doc = new jsPDF();
    
    // Cores da identidade visual
    const primaryBlue = [37, 99, 235];
    const accentAmber = [245, 158, 11];
    const darkGray = [55, 65, 81];
    const lightGray = [156, 163, 175];
    
    // Header
    doc.setFillColor(...primaryBlue);
    doc.rect(0, 0, 210, 25, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text('Legal', 20, 17);
    doc.setTextColor(...accentAmber);
    doc.text('X', 50, 17);
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('Sistema de Gestão Jurídica', 20, 22);
    
    // Título
    doc.setTextColor(...darkGray);
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('PROCURAÇÃO', 105, 45, { align: 'center' });
    
    // Linha decorativa
    doc.setDrawColor(...accentAmber);
    doc.setLineWidth(2);
    doc.line(20, 50, 190, 50);
    
    // Conteúdo
    doc.setTextColor(...darkGray);
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    
    let yPosition = 65;
    const lineHeight = 6;
    
    const lawyersText = docData.lawyers && docData.lawyers.length > 1 
      ? `os(as) Srs(as). ${docData.lawyers.join(', ')}`
      : `o(a) Sr(a). ${docData.lawyers ? docData.lawyers[0] : 'Advogado'}`;
    
    const content = `
Pelo presente instrumento particular de procuração, eu, ${document.client}, 
nomeio e constituo como ${docData.lawyers && docData.lawyers.length > 1 ? 'meus bastantes procuradores' : 'meu bastante procurador'} ${lawyersText}, 
para o fim específico de:

${docData.object || 'Representação jurídica'}

Outorgo-lhe poderes para representar-me ${docData.type === 'Ad Judicia' ? 'em juízo' : 'para os fins específicos acima descritos'}, 
podendo para tanto praticar todos os atos necessários ao bom e fiel cumprimento 
do presente mandato.

Por ser verdade, firmo a presente.

${docData.location || 'São Paulo'}, ${docData.date ? new Date(docData.date).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')}.


_________________________________
${document.client}
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
    
    // Footer
    doc.setDrawColor(...lightGray);
    doc.setLineWidth(0.5);
    doc.line(20, 280, 190, 280);
    
    doc.setTextColor(...lightGray);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text('Documento gerado pelo LegalX - Sistema de Gestão Jurídica', 20, 285);
    doc.text(`Data de geração: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 20, 290);
    
    doc.save(`procuracao_${document.client.replace(/\s+/g, '_').toLowerCase()}.pdf`);
  };

  const generateReceiptPDF = (docData: any) => {
    const doc = new jsPDF();
    
    // Cores da identidade visual
    const primaryBlue = [37, 99, 235];
    const accentAmber = [245, 158, 11];
    const darkGray = [55, 65, 81];
    const lightGray = [156, 163, 175];
    const successGreen = [34, 197, 94];
    
    // Header
    doc.setFillColor(...primaryBlue);
    doc.rect(0, 0, 210, 25, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text('Legal', 20, 17);
    doc.setTextColor(...accentAmber);
    doc.text('X', 50, 17);
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('Sistema de Gestão Jurídica', 20, 22);
    
    // Título
    doc.setTextColor(...darkGray);
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('RECIBO', 105, 45, { align: 'center' });
    
    // Linha decorativa
    doc.setDrawColor(...accentAmber);
    doc.setLineWidth(2);
    doc.line(20, 50, 190, 50);
    
    // Box com valor
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(...successGreen);
    doc.setLineWidth(1);
    doc.roundedRect(20, 55, 170, 20, 3, 3, 'FD');
    
    doc.setTextColor(...successGreen);
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(`Valor: ${formatCurrency(docData.amount || 0)}`, 105, 67, { align: 'center' });
    
    // Conteúdo
    doc.setTextColor(...darkGray);
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    
    let yPosition = 85;
    
    const content = `
Recebi de ${document.client} a importância de ${formatCurrency(docData.amount || 0)}, 
referente a ${docData.description || 'serviços jurídicos'}.

Forma de pagamento: ${docData.paymentMethod || 'Não especificado'}

Para clareza firmo o presente recibo.

${docData.date ? new Date(docData.date).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')}


_________________________________
${docData.lawyerName || 'Advogado'}
OAB: ${docData.lawyerOab || ''}
CPF: ${docData.lawyerCpf || ''}
    `.trim();

    const lines = doc.splitTextToSize(content, 170);
    
    lines.forEach((line: string) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 30;
      }
      doc.text(line, 20, yPosition);
      yPosition += 6;
    });
    
    // Footer
    doc.setDrawColor(...lightGray);
    doc.setLineWidth(0.5);
    doc.line(20, 280, 190, 280);
    
    doc.setTextColor(...lightGray);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text('Documento gerado pelo LegalX - Sistema de Gestão Jurídica', 20, 285);
    doc.text(`Data de geração: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 20, 290);
    
    doc.save(`recibo_${document.client.replace(/\s+/g, '_').toLowerCase()}.pdf`);
  };

  const generateWordDocument = () => {
    let doc: DocxDocument;
    
    if (document.type === 'Procuração') {
      const docData = document.data;
      const lawyersText = docData.lawyers && docData.lawyers.length > 1 
        ? `os(as) Srs(as). ${docData.lawyers.join(', ')}`
        : `o(a) Sr(a). ${docData.lawyers ? docData.lawyers[0] : 'Advogado'}`;
      
      doc = new DocxDocument({
        sections: [{
          properties: {},
          children: [
            // Header com logo
            new Paragraph({
              children: [
                new TextRun({
                  text: "LegalX",
                  bold: true,
                  size: 32,
                  color: "2563eb"
                }),
                new TextRun({
                  text: " - Sistema de Gestão Jurídica",
                  size: 20,
                  color: "6b7280"
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 }
            }),
            
            // Título
            new Paragraph({
              children: [
                new TextRun({
                  text: "PROCURAÇÃO",
                  bold: true,
                  size: 32
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 600 }
            }),
            
            // Conteúdo principal
            new Paragraph({
              children: [
                new TextRun({
                  text: `Pelo presente instrumento particular de procuração, eu, `
                }),
                new TextRun({
                  text: document.client,
                  bold: true
                }),
                new TextRun({
                  text: `, nomeio e constituo como ${docData.lawyers && docData.lawyers.length > 1 ? 'meus bastantes procuradores' : 'meu bastante procurador'} `
                }),
                new TextRun({
                  text: lawyersText,
                  bold: true
                }),
                new TextRun({
                  text: `, para o fim específico de:`
                })
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 300 }
            }),
            
            // Objeto da procuração
            new Paragraph({
              children: [
                new TextRun({
                  text: docData.object || 'Representação jurídica',
                  bold: true,
                  italics: true
                })
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 300 }
            }),
            
            // Poderes
            new Paragraph({
              children: [
                new TextRun({
                  text: `Outorgo-lhe poderes para representar-me ${docData.type === 'Ad Judicia' ? 'em juízo' : 'para os fins específicos acima descritos'}, podendo para tanto praticar todos os atos necessários ao bom e fiel cumprimento do presente mandato.`
                })
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 400 }
            }),
            
            // Encerramento
            new Paragraph({
              children: [
                new TextRun({
                  text: "Por ser verdade, firmo a presente."
                })
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 600 }
            }),
            
            // Data e local
            new Paragraph({
              children: [
                new TextRun({
                  text: `${docData.location || 'São Paulo'}, ${docData.date ? new Date(docData.date).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')}.`
                })
              ],
              alignment: AlignmentType.RIGHT,
              spacing: { after: 800 }
            }),
            
            // Assinatura
            new Paragraph({
              children: [
                new TextRun({
                  text: "_________________________________"
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 100 }
            }),
            
            new Paragraph({
              children: [
                new TextRun({
                  text: document.client,
                  bold: true
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 100 }
            }),
            
            new Paragraph({
              children: [
                new TextRun({
                  text: "Outorgante",
                  size: 20,
                  color: "6b7280"
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 800 }
            }),
            
            // Footer
            new Paragraph({
              children: [
                new TextRun({
                  text: "Documento gerado pelo LegalX - Sistema de Gestão Jurídica",
                  size: 16,
                  color: "9ca3af"
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 100 }
            }),
            
            new Paragraph({
              children: [
                new TextRun({
                  text: `Data de geração: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
                  size: 16,
                  color: "9ca3af"
                })
              ],
              alignment: AlignmentType.CENTER
            })
          ]
        }]
      });
      
    } else if (document.type === 'Recibo') {
      const docData = document.data;
      
      doc = new DocxDocument({
        sections: [{
          properties: {},
          children: [
            // Header com logo
            new Paragraph({
              children: [
                new TextRun({
                  text: "LegalX",
                  bold: true,
                  size: 32,
                  color: "2563eb"
                }),
                new TextRun({
                  text: " - Sistema de Gestão Jurídica",
                  size: 20,
                  color: "6b7280"
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 }
            }),
            
            // Título
            new Paragraph({
              children: [
                new TextRun({
                  text: "RECIBO",
                  bold: true,
                  size: 32
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 }
            }),
            
            // Valor em destaque
            new Paragraph({
              children: [
                new TextRun({
                  text: `Valor: ${formatCurrency(docData.amount || 0)}`,
                  bold: true,
                  size: 28,
                  color: "22c55e"
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 600 }
            }),
            
            // Conteúdo principal
            new Paragraph({
              children: [
                new TextRun({
                  text: `Recebi de `
                }),
                new TextRun({
                  text: document.client,
                  bold: true
                }),
                new TextRun({
                  text: ` a importância de `
                }),
                new TextRun({
                  text: formatCurrency(docData.amount || 0),
                  bold: true
                }),
                new TextRun({
                  text: `, referente a `
                }),
                new TextRun({
                  text: docData.description || 'serviços jurídicos',
                  bold: true
                }),
                new TextRun({
                  text: `.`
                })
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 300 }
            }),
            
            // Forma de pagamento
            new Paragraph({
              children: [
                new TextRun({
                  text: `Forma de pagamento: `
                }),
                new TextRun({
                  text: docData.paymentMethod || 'Não especificado',
                  bold: true
                })
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 400 }
            }),
            
            // Encerramento
            new Paragraph({
              children: [
                new TextRun({
                  text: "Para clareza firmo o presente recibo."
                })
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 600 }
            }),
            
            // Data
            new Paragraph({
              children: [
                new TextRun({
                  text: docData.date ? new Date(docData.date).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')
                })
              ],
              alignment: AlignmentType.RIGHT,
              spacing: { after: 800 }
            }),
            
            // Assinatura
            new Paragraph({
              children: [
                new TextRun({
                  text: "_________________________________"
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 100 }
            }),
            
            new Paragraph({
              children: [
                new TextRun({
                  text: docData.lawyerName || 'Advogado',
                  bold: true
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 100 }
            }),
            
            new Paragraph({
              children: [
                new TextRun({
                  text: `OAB: ${docData.lawyerOab || ''}`,
                  size: 20,
                  color: "6b7280"
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 100 }
            }),
            
            new Paragraph({
              children: [
                new TextRun({
                  text: `CPF: ${docData.lawyerCpf || ''}`,
                  size: 20,
                  color: "6b7280"
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 800 }
            }),
            
            // Footer
            new Paragraph({
              children: [
                new TextRun({
                  text: "Documento gerado pelo LegalX - Sistema de Gestão Jurídica",
                  size: 16,
                  color: "9ca3af"
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 100 }
            }),
            
            new Paragraph({
              children: [
                new TextRun({
                  text: `Data de geração: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
                  size: 16,
                  color: "9ca3af"
                })
              ],
              alignment: AlignmentType.CENTER
            })
          ]
        }]
      });
    }

    // Gerar e baixar arquivo Word real
    if (doc) {
      Packer.toBlob(doc).then(blob => {
        saveAs(blob, `${document.type.toLowerCase()}_${document.client.replace(/\s+/g, '_').toLowerCase()}.docx`);
      }).catch(error => {
        console.error('Erro ao gerar documento Word:', error);
        alert('Erro ao gerar documento Word. Tente novamente.');
      });
    }
  };

  const handleDownloadPDF = () => {
    if (document.type === 'Procuração') {
      generatePowerOfAttorneyPDF(document.data);
    } else if (document.type === 'Recibo') {
      generateReceiptPDF(document.data);
    }
  };

  const renderDocumentPreview = () => {
    if (document.type === 'Procuração') {
      const docData = document.data;
      return (
        <div className="prose max-w-none">
          <h2 className="text-center text-xl font-bold mb-6">PROCURAÇÃO</h2>
          <p className="text-justify leading-relaxed">
            Pelo presente instrumento particular de procuração, eu, <strong>{document.client}</strong>, 
            nomeio e constituo como {docData.lawyers && docData.lawyers.length > 1 ? 'meus bastantes procuradores' : 'meu bastante procurador'} {' '}
            <strong>{docData.lawyers ? docData.lawyers.join(', ') : 'Advogado'}</strong>, 
            para o fim específico de:
          </p>
          <p className="text-justify leading-relaxed my-4">
            <strong>{docData.object || 'Representação jurídica'}</strong>
          </p>
          <p className="text-justify leading-relaxed">
            Outorgo-lhe poderes para representar-me {docData.type === 'Ad Judicia' ? 'em juízo' : 'para os fins específicos acima descritos'}, 
            podendo para tanto praticar todos os atos necessários ao bom e fiel cumprimento do presente mandato.
          </p>
          <p className="text-justify leading-relaxed mt-6">
            Por ser verdade, firmo a presente.
          </p>
          <p className="text-right mt-8">
            {docData.location || 'São Paulo'}, {docData.date ? new Date(docData.date).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')}.
          </p>
          <div className="text-center mt-12">
            <div className="border-t border-gray-400 w-64 mx-auto mb-2"></div>
            <p><strong>{document.client}</strong></p>
            <p className="text-sm text-gray-600">Outorgante</p>
          </div>
        </div>
      );
    } else if (document.type === 'Recibo') {
      const docData = document.data;
      return (
        <div className="prose max-w-none">
          <h2 className="text-center text-xl font-bold mb-6">RECIBO</h2>
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 text-center mb-6">
            <p className="text-lg font-bold text-green-700">
              Valor: {formatCurrency(docData.amount || 0)}
            </p>
          </div>
          <p className="text-justify leading-relaxed">
            Recebi de <strong>{document.client}</strong> a importância de <strong>{formatCurrency(docData.amount || 0)}</strong>, 
            referente a <strong>{docData.description || 'serviços jurídicos'}</strong>.
          </p>
          <p className="text-justify leading-relaxed mt-4">
            Forma de pagamento: <strong>{docData.paymentMethod || 'Não especificado'}</strong>
          </p>
          <p className="text-justify leading-relaxed mt-6">
            Para clareza firmo o presente recibo.
          </p>
          <p className="text-right mt-8">
            {docData.date ? new Date(docData.date).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')}
          </p>
          <div className="text-center mt-12">
            <div className="border-t border-gray-400 w-64 mx-auto mb-2"></div>
            <p><strong>{docData.lawyerName || 'Advogado'}</strong></p>
            <p className="text-sm text-gray-600">OAB: {docData.lawyerOab || ''}</p>
            <p className="text-sm text-gray-600">CPF: {docData.lawyerCpf || ''}</p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            Voltar
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{document.type}</h1>
            <p className="text-gray-600">Cliente: {document.client}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleDownloadPDF}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
            Baixar PDF
          </button>
          <button
            onClick={generateWordDocument}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <DocumentTextIcon className="w-5 h-5 mr-2" />
            Baixar Word
          </button>
        </div>
      </div>

      {/* Document Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações do Documento</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Tipo
            </label>
            <p className="text-gray-900">{document.type}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Cliente
            </label>
            <p className="text-gray-900">{document.client}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Data de Criação
            </label>
            <p className="text-gray-900">{formatDate(document.createdAt)}</p>
          </div>
        </div>
      </div>

      {/* Document Preview */}
      <div className="bg-white rounded-lg shadow p-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Visualização do Documento</h3>
        <div className="border border-gray-200 rounded-lg p-8 bg-gray-50 min-h-96">
          {renderDocumentPreview()}
        </div>
      </div>

      {/* Footer with generation info */}
      <div className="mt-6 text-center text-sm text-gray-500">
        <p>Documento gerado pelo LegalX - Sistema de Gestão Jurídica</p>
        <p>Criado em {formatDate(document.createdAt)}</p>
      </div>
    </div>
  );
}