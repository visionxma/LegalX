import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Employee } from '../../types';
import { ArrowLeftIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { firestoreService } from '../../services/firestoreService';
import { usePermissionCheck } from '../Common/withPermission';

const schema = yup.object({
  fullName: yup.string().required('Nome completo é obrigatório'),
  cpf: yup.string().required('CPF é obrigatório'),
  salary: yup.number().min(0, 'Salário deve ser positivo').required('Salário é obrigatório'),
  position: yup.string().required('Função é obrigatória'),
  email: yup.string().email('Email inválido').nullable(),
  phone: yup.string().nullable(),
  address: yup.string().nullable(),
  status: yup.string().required('Status é obrigatório')
});

interface EmployeeFormProps {
  employee?: Employee | null;
  onBack: () => void;
  onSave: (employee: Employee) => void;
}

export default function EmployeeForm({ employee, onBack, onSave }: EmployeeFormProps) {
  const [photoPreview, setPhotoPreview] = useState<string>(employee?.photo || '');
  const [loading, setLoading] = useState(false);
  
  // NOVO: Permission checks
  const { hasPermission } = usePermissionCheck();
  const canEdit = hasPermission('equipe');
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset
  } = useForm<Partial<Employee>>({
    resolver: yupResolver(schema),
    defaultValues: {
      status: 'Ativo',
      salary: 0,
      fullName: '',
      cpf: '',
      position: '',
      email: '',
      phone: '',
      address: '',
      ...employee
    }
  });

  useEffect(() => {
    if (employee) {
      reset({
        ...employee
      });
      setPhotoPreview(employee.photo || '');
    }
  }, [employee, reset]);

  const onSubmit = async (data: Partial<Employee>) => {
    if (!canEdit) {
      alert('Você não possui permissão para salvar colaboradores.');
      return;
    }

    if (loading) return;

    try {
      setLoading(true);
      
      if (!data.fullName?.trim() || !data.cpf?.trim() || !data.position?.trim()) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
      }

      const employeeData = {
        fullName: data.fullName.trim(),
        cpf: data.cpf.replace(/\D/g, ''),
        salary: Number(data.salary) || 0,
        position: data.position.trim(),
        email: data.email?.trim() || '',
        phone: data.phone?.trim() || '',
        address: data.address?.trim() || '',
        status: data.status || 'Ativo',
        photo: photoPreview
      };

      if (employee?.id) {
        const updatedEmployee = await firestoreService.updateEmployee(employee.id, employeeData);
        
        if (updatedEmployee) {
          console.log('Colaborador atualizado com sucesso');
          onSave(updatedEmployee);
        } else {
          throw new Error('Erro ao atualizar colaborador');
        }
      } else {
        const newEmployee = await firestoreService.saveEmployee(employeeData);
        
        console.log('Novo colaborador criado com sucesso');
        onSave(newEmployee);
      }
    } catch (error) {
      console.error('Erro ao salvar colaborador:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      alert(`Erro ao salvar colaborador: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canEdit) return;
    
    const file = e.target.files?.[0];
    if (file) {
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

  // NOVO: Guard de permissão
  if (!canEdit) {
    return (
      <div className="p-6">
        <div className="max-w-md mx-auto text-center py-12">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XMarkIcon className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Sem Permissão</h2>
          <p className="text-gray-600 mb-4">
            Você não possui permissão para {employee ? 'editar' : 'criar'} colaboradores.
          </p>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
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
            {employee ? 'Editar Colaborador' : 'Novo Colaborador'}
          </h1>
          <p className="text-gray-600">
            {employee ? 'Atualize as informações do colaborador' : 'Cadastre um novo colaborador na equipe'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl">
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Foto do Colaborador</h3>
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
                  disabled={loading || !canEdit}
                />
                <label
                  htmlFor="photo-upload"
                  className={`cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors ${loading || !canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <PhotoIcon className="w-4 h-4 mr-2" />
                  Escolher Foto
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  JPG, PNG ou GIF até 2MB
                </p>
                {photoPreview && canEdit && (
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
                  disabled={loading || !canEdit}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  placeholder="Nome completo do colaborador"
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
                  disabled={loading || !canEdit}
                  onChange={(e) => {
                    const formatted = formatCpf(e.target.value);
                    e.target.value = formatted;
                    setValue('cpf', formatted);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  placeholder="000.000.000-00"
                />
                {errors.cpf && (
                  <p className="text-red-500 text-sm mt-1">{errors.cpf.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Função/Cargo *
                </label>
                <input
                  {...register('position')}
                  type="text"
                  disabled={loading || !canEdit}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  placeholder="Ex: Secretária, Assistente Jurídico"
                />
                {errors.position && (
                  <p className="text-red-500 text-sm mt-1">{errors.position.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Salário (R$) *
                </label>
                <input
                  {...register('salary', { 
                    valueAsNumber: true,
                    setValueAs: (value) => {
                      const num = parseFloat(value);
                      return isNaN(num) ? 0 : num;
                    }
                  })}
                  type="number"
                  min="0"
                  step="0.01"
                  disabled={loading || !canEdit}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  placeholder="0.00"
                />
                {errors.salary && (
                  <p className="text-red-500 text-sm mt-1">{errors.salary.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  {...register('email')}
                  type="email"
                  disabled={loading || !canEdit}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
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
                  disabled={loading || !canEdit}
                  onChange={(e) => {
                    const formatted = formatPhone(e.target.value);
                    e.target.value = formatted;
                    setValue('phone', formatted);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
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
                  disabled={loading || !canEdit}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  placeholder="Endereço completo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status *
                </label>
                <select
                  {...register('status')}
                  disabled={loading || !canEdit}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
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
              disabled={loading || !canEdit}
              className={`px-6 py-2 rounded-lg transition-colors flex items-center ${
                canEdit && !loading
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : (
                `${employee ? 'Atualizar' : 'Salvar'} Colaborador`
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}