import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Lawyer } from '../../types';
import { ArrowLeftIcon, PlusIcon, XMarkIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { firestoreService } from '../../services/firestoreService';

const schema = yup.object({
  fullName: yup.string().required('Nome completo é obrigatório'),
  cpf: yup.string().required('CPF é obrigatório'),
  oab: yup.string().required('OAB é obrigatória'),
  commission: yup.number().min(0, 'Comissão deve ser positiva').max(100, 'Comissão não pode ser maior que 100%').required('Comissão é obrigatória'),
  email: yup.string().email('Email inválido').nullable(),
  phone: yup.string().nullable(),
  address: yup.string().nullable(),
  status: yup.string().required('Status é obrigatório')
});

interface LawyerFormProps {
  lawyer?: Lawyer | null;
  onBack: () => void;
  onSave: (lawyer: Lawyer) => void;
}

export default function LawyerForm({ lawyer, onBack, onSave }: LawyerFormProps) {
  const [specialties, setSpecialties] = useState<string[]>(lawyer?.specialties || []);
  const [newSpecialty, setNewSpecialty] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string>(lawyer?.photo || '');
  const [loading, setLoading] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset
  } = useForm<Partial<Lawyer>>({
    resolver: yupResolver(schema),
    defaultValues: {
      status: 'Ativo',
      commission: 10,
      fullName: '',
      cpf: '',
      oab: '',
      email: '',
      phone: '',
      address: '',
      ...lawyer
    }
  });

  useEffect(() => {
    if (lawyer) {
      reset({
        ...lawyer
      });
      setSpecialties(lawyer.specialties || []);
      setPhotoPreview(lawyer.photo || '');
    }
  }, [lawyer, reset]);

  const onSubmit = async (data: Partial<Lawyer>) => {
    if (loading) return;

    try {
      setLoading(true);

      // Validação básica dos campos obrigatórios
      if (!data.fullName?.trim() || !data.cpf?.trim() || !data.oab?.trim()) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
      }

      const lawyerData = {
        fullName: data.fullName.trim(),
        cpf: data.cpf.replace(/\D/g, ''), // Remove formatação do CPF
        oab: data.oab.trim(),
        commission: Number(data.commission) || 10,
        email: data.email?.trim() || '',
        phone: data.phone?.trim() || '',
        address: data.address?.trim() || '',
        status: data.status || 'Ativo',
        specialties: specialties.filter(s => s.trim().length > 0),
        photo: photoPreview
      };

      if (lawyer?.id) {
        // Atualizar advogado existente
        const updatedLawyer = await firestoreService.updateLawyer(lawyer.id, lawyerData);
        
        if (updatedLawyer) {
          console.log('Advogado atualizado com sucesso');
          onSave(updatedLawyer);
        } else {
          throw new Error('Erro ao atualizar advogado');
        }
      } else {
        // Criar novo advogado
        const newLawyer = await firestoreService.saveLawyer(lawyerData);
        
        console.log('Novo advogado criado com sucesso');
        onSave(newLawyer);
      }
    } catch (error) {
      console.error('Erro ao salvar advogado:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      alert(`Erro ao salvar advogado: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const addSpecialty = () => {
    const trimmedSpecialty = newSpecialty.trim();
    if (trimmedSpecialty && !specialties.includes(trimmedSpecialty)) {
      setSpecialties([...specialties, trimmedSpecialty]);
      setNewSpecialty('');
    }
  };

  const removeSpecialty = (index: number) => {
    setSpecialties(specialties.filter((_, i) => i !== index));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Verificar tamanho do arquivo (máximo 2MB para Base64)
      if (file.size > 2 * 1024 * 1024) {
        alert('Arquivo muito grande. Escolha uma imagem menor que 2MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setPhotoPreview(result);
      };
      reader.onerror = () => {
        alert('Erro ao processar imagem. Tente novamente.');
      };
      reader.readAsDataURL(file);
    }
  };

  const formatCpf = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    } else {
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2');
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
          <h1 className="text-2xl font-bold text-gray-900">
            {lawyer ? 'Editar Advogado' : 'Novo Advogado'}
          </h1>
          <p className="text-gray-600">
            {lawyer ? 'Atualize as informações do advogado' : 'Cadastre um novo advogado na equipe'}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl">
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Photo Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Foto do Advogado</h3>
            <div className="flex items-center space-x-6">
              <div className="flex-shrink-0">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                    onError={(e) => {
                      console.error('Erro ao carregar imagem preview');
                      setPhotoPreview('');
                    }}
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                    <PhotoIcon className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </div>
              <div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif"
                  onChange={handlePhotoChange}
                  className="hidden"
                  id="photo-upload"
                  disabled={loading}
                />
                <label
                  htmlFor="photo-upload"
                  className={`cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <PhotoIcon className="w-4 h-4 mr-2" />
                  Escolher Foto
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  JPG, PNG ou GIF até 2MB
                </p>
                {photoPreview && (
                  <button
                    type="button"
                    onClick={() => setPhotoPreview('')}
                    className="text-red-600 hover:text-red-800 text-xs mt-1 block"
                    disabled={loading}
                  >
                    Remover foto
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações Pessoais</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Completo *
                </label>
                <input
                  {...register('fullName')}
                  type="text"
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  placeholder="Nome completo do advogado"
                />
                {errors.fullName && (
                  <p className="text-red-500 text-sm mt-1">{errors.fullName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CPF *
                </label>
                <input
                  {...register('cpf')}
                  type="text"
                  maxLength={14}
                  disabled={loading}
                  onChange={(e) => {
                    const formatted = formatCpf(e.target.value);
                    e.target.value = formatted;
                    setValue('cpf', formatted);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  placeholder="000.000.000-00"
                />
                {errors.cpf && (
                  <p className="text-red-500 text-sm mt-1">{errors.cpf.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  OAB *
                </label>
                <input
                  {...register('oab')}
                  type="text"
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  placeholder="123456/SP"
                />
                {errors.oab && (
                  <p className="text-red-500 text-sm mt-1">{errors.oab.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comissão (%) *
                </label>
                <input
                  {...register('commission', { 
                    valueAsNumber: true,
                    setValueAs: (value) => {
                      const num = parseFloat(value);
                      return isNaN(num) ? 10 : num;
                    }
                  })}
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  placeholder="10.0"
                />
                {errors.commission && (
                  <p className="text-red-500 text-sm mt-1">{errors.commission.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  {...register('email')}
                  type="email"
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  placeholder="email@exemplo.com"
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone
                </label>
                <input
                  {...register('phone')}
                  type="text"
                  maxLength={15}
                  disabled={loading}
                  onChange={(e) => {
                    const formatted = formatPhone(e.target.value);
                    e.target.value = formatted;
                    setValue('phone', formatted);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Endereço
                </label>
                <input
                  {...register('address')}
                  type="text"
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  placeholder="Endereço completo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status *
                </label>
                <select
                  {...register('status')}
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                </select>
                {errors.status && (
                  <p className="text-red-500 text-sm mt-1">{errors.status.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Specialties */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Especialidades</h3>
            </div>
            
            <div className="flex items-center space-x-2 mb-4">
              <input
                type="text"
                value={newSpecialty}
                onChange={(e) => setNewSpecialty(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSpecialty();
                  }
                }}
                disabled={loading}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                placeholder="Ex: Direito Trabalhista"
              />
              <button
                type="button"
                onClick={addSpecialty}
                disabled={loading || !newSpecialty.trim()}
                className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Adicionar
              </button>
            </div>
            
            {specialties.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {specialties.map((specialty, index) => (
                  <div key={index} className="flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    <span>{specialty}</span>
                    <button
                      type="button"
                      onClick={() => removeSpecialty(index)}
                      disabled={loading}
                      className="ml-2 text-blue-600 hover:text-blue-800 disabled:opacity-50"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Nenhuma especialidade adicionada</p>
            )}
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
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : (
                `${lawyer ? 'Atualizar' : 'Salvar'} Advogado`
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}