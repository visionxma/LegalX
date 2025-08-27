import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Employee } from '../../types';
import { ArrowLeftIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { firestoreService } from '../../services/firestoreService';

const schema = yup.object({
  fullName: yup.string().required('Nome completo é obrigatório'),
  cpf: yup.string().required('CPF é obrigatório'),
  salary: yup.number().min(0, 'Salário deve ser positivo').required('Salário é obrigatório'),
  position: yup.string().required('Função é obrigatória'),
  email: yup.string().email('Email inválido'),
  phone: yup.string(),
  address: yup.string(),
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
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue
  } = useForm<Partial<Employee>>({
    resolver: yupResolver(schema),
    defaultValues: employee || {
      status: 'Ativo',
      salary: 0
    }
  });

  useEffect(() => {
    if (employee) {
      Object.keys(employee).forEach((key) => {
        setValue(key as keyof Employee, employee[key as keyof Employee]);
      });
      setPhotoPreview(employee.photo || '');
    }
  }, [employee, setValue]);

  const onSubmit = async (data: Partial<Employee>) => {
    if (loading) return;

    try {
      setLoading(true);
      const employeeData = {
        ...data,
        photo: photoPreview
      } as Omit<Employee, 'id' | 'createdAt'>;

      if (employee) {
        // Atualizar colaborador existente
        const updatedEmployee = await firestoreService.updateEmployee(employee.id, employeeData);
        
        if (updatedEmployee) {
          console.log('Colaborador atualizado com sucesso');
          onSave(updatedEmployee);
        } else {
          alert('Erro ao atualizar colaborador');
        }
      } else {
        // Criar novo colaborador
        const newEmployee = await firestoreService.saveEmployee(employeeData);
        
        console.log('Novo colaborador criado com sucesso');
        onSave(newEmployee);
      }
    } catch (error) {
      console.error('Erro ao salvar colaborador:', error);
      alert('Erro ao salvar colaborador. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const formatCpf = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
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
            {employee ? 'Editar Colaborador' : 'Novo Colaborador'}
          </h1>
          <p className="text-gray-600">
            {employee ? 'Atualize as informações do colaborador' : 'Cadastre um novo colaborador na equipe'}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl">
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Photo Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Foto do Colaborador</h3>
            <div className="flex items-center space-x-6">
              <div className="flex-shrink-0">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
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
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                  id="photo-upload"
                  disabled={loading}
                />
                <label
                  htmlFor="photo-upload"
                  className={`cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <PhotoIcon className="w-4 h-4 mr-2" />
                  Escolher Foto
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  JPG, PNG ou GIF até 5MB
                </p>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome completo do colaborador"
                  disabled={loading}
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
                  onChange={(e) => {
                    e.target.value = formatCpf(e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="000.000.000-00"
                  disabled={loading}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Secretária, Assistente Jurídico"
                  disabled={loading}
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
                  {...register('salary', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  disabled={loading}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="email@exemplo.com"
                  disabled={loading}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="(11) 99999-9999"
                  disabled={loading}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Endereço
                </label>
                <input
                  {...register('address')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Endereço completo"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status *
                </label>
                <select
                  {...register('status')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
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

          {/* Actions */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Salvando...' : (employee ? 'Atualizar' : 'Salvar')} Colaborador
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}