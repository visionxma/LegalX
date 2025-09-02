import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Team, TeamPhone, TeamAddress } from '../../types/admin';
import { adminService } from '../../services/adminService';
import { PlusIcon, XMarkIcon, PhotoIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';

// Importar auth para verificar se team existe
import { auth } from '../../firebase.config';

const schema = yup.object({
  name: yup.string().required('Nome do escritório é obrigatório'),
  cpfCnpj: yup.string().required('CPF/CNPJ é obrigatório'),
  oab: yup.string().required('OAB é obrigatória'),
  ccm: yup.string(),
  email: yup.string().email('Email inválido'),
  website: yup.string().url('URL inválida'),
  areaOfPractice: yup.string()
});

interface OfficeTabProps {
  team: Team | null;
  onUpdate: (team: Team) => void;
}

export default function OfficeTab({ team, onUpdate }: OfficeTabProps) {
  const [phones, setPhones] = useState<TeamPhone[]>(team?.phones || []);
  const [address, setAddress] = useState<TeamAddress | undefined>(team?.address);
  const [logoPreview, setLogoPreview] = useState<string>(team?.logoUrl || '');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: team || {}
  });

  const watchedCpfCnpj = watch('cpfCnpj');

  // Formatar CPF/CNPJ em tempo real
  React.useEffect(() => {
    if (watchedCpfCnpj) {
      const formatted = adminService.formatCpfCnpj(watchedCpfCnpj);
      if (formatted !== watchedCpfCnpj) {
        setValue('cpfCnpj', formatted);
      }
    }
  }, [watchedCpfCnpj, setValue]);

  const addPhone = () => {
    const newPhone: TeamPhone = {
      id: Date.now().toString(),
      type: 'Telefone comercial',
      number: '',
      operator: ''
    };
    setPhones([...phones, newPhone]);
  };

  const updatePhone = (id: string, field: keyof TeamPhone, value: string) => {
    setPhones(phones.map(phone => 
      phone.id === id 
        ? { 
            ...phone, 
            [field]: value,
            // Limpar operadora se for WhatsApp
            ...(field === 'type' && value === 'WhatsApp' ? { operator: '' } : {})
          }
        : phone
    ));
  };

  const removePhone = (id: string) => {
    setPhones(phones.filter(phone => phone.id !== id));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: any) => {
    if (!team) return;
    
    try {
      setLoading(true);
      
      let logoUrl = team.logoUrl;
      
      // Upload do logo se houver arquivo novo
      if (logoFile) {
        const uploadedUrl = await adminService.uploadLogo(logoFile, team.id);
        if (uploadedUrl) {
          logoUrl = uploadedUrl;
        }
      }
      
      const updatedTeam = await adminService.updateTeam(team.id, {
        ...data,
        phones,
        address,
        logoUrl
      });
      
      if (updatedTeam) {
        onUpdate(updatedTeam);
        alert('Dados do escritório salvos com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao salvar dados do escritório:', error);
      alert('Erro ao salvar dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Logo Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Logo do Escritório</h3>
        <div className="flex items-center space-x-6">
          <div className="flex-shrink-0">
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="Logo"
                className="w-24 h-24 rounded-lg object-cover border-2 border-gray-200"
              />
            ) : (
              <div className="w-24 h-24 rounded-lg bg-gray-100 flex items-center justify-center border-2 border-gray-200">
                <BuildingOfficeIcon className="w-8 h-8 text-gray-400" />
              </div>
            )}
          </div>
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="hidden"
              id="logo-upload"
              disabled={loading}
            />
            <label
              htmlFor="logo-upload"
              className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <PhotoIcon className="w-4 h-4 mr-2" />
              Escolher Logo
            </label>
            <p className="text-xs text-gray-500 mt-1">
              PNG, JPG ou SVG até 2MB
            </p>
          </div>
        </div>
      </div>

      {/* Basic Information */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações Básicas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome do Escritório *
            </label>
            <input
              {...register('name')}
              type="text"
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              placeholder="Ex: Silva & Associados Advocacia"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CPF/CNPJ *
            </label>
            <input
              {...register('cpfCnpj')}
              type="text"
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              placeholder="000.000.000-00 ou 00.000.000/0000-00"
            />
            {errors.cpfCnpj && (
              <p className="text-red-500 text-sm mt-1">{errors.cpfCnpj.message}</p>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              placeholder="123456/SP"
            />
            {errors.oab && (
              <p className="text-red-500 text-sm mt-1">{errors.oab.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CCM
            </label>
            <input
              {...register('ccm')}
              type="text"
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              placeholder="Cadastro de Contribuintes Mobiliários"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Principal
            </label>
            <input
              {...register('email')}
              type="email"
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              placeholder="contato@escritorio.com"
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Site
            </label>
            <input
              {...register('website')}
              type="url"
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              placeholder="https://www.escritorio.com"
            />
            {errors.website && (
              <p className="text-red-500 text-sm mt-1">{errors.website.message}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Área de Atuação
            </label>
            <textarea
              {...register('areaOfPractice')}
              rows={3}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              placeholder="Ex: Direito Civil, Direito Trabalhista, Direito Empresarial..."
            />
          </div>
        </div>
      </div>

      {/* Phones Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Telefones</h3>
          <button
            type="button"
            onClick={addPhone}
            disabled={loading}
            className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Adicionar Telefone
          </button>
        </div>
        
        <div className="space-y-3">
          {phones.map((phone) => (
            <div key={phone.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <select
                value={phone.type}
                onChange={(e) => updatePhone(phone.id, 'type', e.target.value)}
                disabled={loading}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <option value="Telefone comercial">Telefone comercial</option>
                <option value="Celular comercial">Celular comercial</option>
                <option value="Fax">Fax</option>
                <option value="Telefone pessoal">Telefone pessoal</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Outro">Outro</option>
              </select>
              
              <input
                type="text"
                value={phone.number}
                onChange={(e) => updatePhone(phone.id, 'number', adminService.formatPhone(e.target.value))}
                disabled={loading}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                placeholder="(11) 99999-9999"
              />
              
              {phone.type !== 'WhatsApp' && (
                <input
                  type="text"
                  value={phone.operator || ''}
                  onChange={(e) => updatePhone(phone.id, 'operator', e.target.value)}
                  disabled={loading}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  placeholder="Operadora"
                />
              )}
              
              <button
                type="button"
                onClick={() => removePhone(phone.id)}
                disabled={loading}
                className="text-red-600 hover:text-red-800 p-2 rounded hover:bg-red-50 disabled:opacity-50"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
          
          {phones.length === 0 && (
            <p className="text-gray-500 text-sm">Nenhum telefone cadastrado</p>
          )}
        </div>
      </div>

      {/* Address Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Endereço</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Endereço
            </label>
            <select
              value={address?.type || 'Comercial'}
              onChange={(e) => setAddress({
                ...address,
                type: e.target.value as 'Comercial' | 'Pessoal',
                cep: address?.cep || '',
                street: address?.street || '',
                city: address?.city || '',
                state: address?.state || '',
                country: address?.country || 'Brasil'
              })}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="Comercial">Comercial</option>
              <option value="Pessoal">Pessoal</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CEP
              </label>
              <input
                type="text"
                value={address?.cep || ''}
                onChange={(e) => setAddress({
                  ...address!,
                  cep: adminService.formatCep(e.target.value)
                })}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                placeholder="00000-000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rua
              </label>
              <input
                type="text"
                value={address?.street || ''}
                onChange={(e) => setAddress({
                  ...address!,
                  street: e.target.value
                })}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                placeholder="Rua, número"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Complemento
              </label>
              <input
                type="text"
                value={address?.complement || ''}
                onChange={(e) => setAddress({
                  ...address!,
                  complement: e.target.value
                })}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                placeholder="Sala, andar, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cidade
              </label>
              <input
                type="text"
                value={address?.city || ''}
                onChange={(e) => setAddress({
                  ...address!,
                  city: e.target.value
                })}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                placeholder="São Paulo"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <select
                value={address?.state || ''}
                onChange={(e) => setAddress({
                  ...address!,
                  state: e.target.value
                })}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <option value="">Selecione o estado</option>
                <option value="AC">Acre</option>
                <option value="AL">Alagoas</option>
                <option value="AP">Amapá</option>
                <option value="AM">Amazonas</option>
                <option value="BA">Bahia</option>
                <option value="CE">Ceará</option>
                <option value="DF">Distrito Federal</option>
                <option value="ES">Espírito Santo</option>
                <option value="GO">Goiás</option>
                <option value="MA">Maranhão</option>
                <option value="MT">Mato Grosso</option>
                <option value="MS">Mato Grosso do Sul</option>
                <option value="MG">Minas Gerais</option>
                <option value="PA">Pará</option>
                <option value="PB">Paraíba</option>
                <option value="PR">Paraná</option>
                <option value="PE">Pernambuco</option>
                <option value="PI">Piauí</option>
                <option value="RJ">Rio de Janeiro</option>
                <option value="RN">Rio Grande do Norte</option>
                <option value="RS">Rio Grande do Sul</option>
                <option value="RO">Rondônia</option>
                <option value="RR">Roraima</option>
                <option value="SC">Santa Catarina</option>
                <option value="SP">São Paulo</option>
                <option value="SE">Sergipe</option>
                <option value="TO">Tocantins</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                País
              </label>
              <input
                type="text"
                value={address?.country || 'Brasil'}
                onChange={(e) => setAddress({
                  ...address!,
                  country: e.target.value
                })}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                placeholder="Brasil"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end space-x-4 pt-6 border-t">
        <button
          type="button"
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
            'Salvar Dados'
          )}
        </button>
      </div>
    </form>
  );
}