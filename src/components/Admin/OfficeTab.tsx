// src/components/Admin/OfficeTab.tsx
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Team, TeamPhone, TeamAddress } from '../../types/admin';
import { adminService } from '../../services/adminService';
import { useTeam } from '../../contexts/TeamContext';
import { PlusIcon, XMarkIcon, PhotoIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';

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
  const [phones, setPhones] = useState<TeamPhone[]>([]);
  const [address, setAddress] = useState<TeamAddress>({
    type: 'Comercial',
    cep: '',
    street: '',
    city: '',
    state: '',
    country: 'Brasil',
    complement: ''
  });
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // NOVO: Verificar permissões
  const { isOwner, isSoloMode } = useTeam();
  const canEdit = isSoloMode || isOwner;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      name: '',
      cpfCnpj: '',
      oab: '',
      ccm: '',
      email: '',
      website: '',
      areaOfPractice: ''
    }
  });

  const watchedCpfCnpj = watch('cpfCnpj');

  useEffect(() => {
    if (team) {
      console.log('Inicializando formulário com dados da equipe:', team);
      
      reset({
        name: team.name || '',
        cpfCnpj: team.cpfCnpj || '',
        oab: team.oab || '',
        ccm: team.ccm || '',
        email: team.email || '',
        website: team.website || '',
        areaOfPractice: team.areaOfPractice || ''
      });

      setPhones(team.phones || []);
      
      if (team.address) {
        setAddress({
          type: team.address.type || 'Comercial',
          cep: team.address.cep || '',
          street: team.address.street || '',
          city: team.address.city || '',
          state: team.address.state || '',
          country: team.address.country || 'Brasil',
          complement: team.address.complement || ''
        });
      }
      
      setLogoPreview(team.logoUrl || '');
    }
  }, [team, reset]);

  useEffect(() => {
    if (watchedCpfCnpj) {
      const formatted = adminService.formatCpfCnpj(watchedCpfCnpj);
      if (formatted !== watchedCpfCnpj) {
        setValue('cpfCnpj', formatted);
      }
    }
  }, [watchedCpfCnpj, setValue]);

  const addPhone = () => {
    if (!canEdit) return;
    
    const newPhone: TeamPhone = {
      id: Date.now().toString(),
      type: 'Telefone comercial',
      number: '',
      operator: ''
    };
    setPhones([...phones, newPhone]);
  };

  const updatePhone = (id: string, field: keyof TeamPhone, value: string) => {
    if (!canEdit) return;
    
    setPhones(phones.map(phone => 
      phone.id === id 
        ? { 
            ...phone, 
            [field]: value,
            ...(field === 'type' && value === 'WhatsApp' ? { operator: '' } : {})
          }
        : phone
    ));
  };

  const removePhone = (id: string) => {
    if (!canEdit) return;
    setPhones(phones.filter(phone => phone.id !== id));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canEdit) return;
    
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) {
        alert('O arquivo deve ter no máximo 500KB');
        return;
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/svg+xml'];
      if (!allowedTypes.includes(file.type)) {
        alert('Apenas arquivos JPG, PNG ou SVG são permitidos');
        return;
      }

      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: any) => {
    if (!team || !canEdit) {
      setError('Sem permissão para editar');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('Salvando dados do escritório:', data);
      
      let logoUrl = team.logoUrl;
      
      if (logoFile) {
        console.log('Fazendo upload do logo...');
        const uploadedUrl = await adminService.uploadLogo(logoFile, team.id);
        if (uploadedUrl) {
          logoUrl = uploadedUrl;
          console.log('Logo salvo em base64');
        }
      }
      
      const updateData = {
        ...data,
        phones: phones.filter(p => p.number),
        address,
        logoUrl
      };

      console.log('Dados a serem salvos:', updateData);
      
      const updatedTeam = await adminService.updateTeam(team.id, updateData);
      
      if (updatedTeam) {
        console.log('Equipe atualizada com sucesso');
        onUpdate(updatedTeam);
        alert('Dados do escritório salvos com sucesso!');
        setLogoFile(null);
      } else {
        throw new Error('Falha ao atualizar equipe');
      }
    } catch (error: any) {
      console.error('Erro ao salvar dados do escritório:', error);
      const errorMessage = error.message || 'Erro ao salvar dados. Tente novamente.';
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateAddress = (field: keyof TeamAddress, value: string) => {
    if (!canEdit) return;
    
    setAddress(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // GUARD: Modo visualização se não puder editar
  if (!canEdit) {
    return (
      <div className="space-y-6">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800">
            ⚠️ Apenas o proprietário pode editar as configurações do escritório.
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações do Escritório</h3>
          <div className="space-y-4">
            {team?.logoUrl && (
              <div className="mb-4">
                <img
                  src={team.logoUrl}
                  alt="Logo"
                  className="w-24 h-24 rounded-lg object-cover border-2 border-gray-200"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <p className="text-gray-900">{team?.name || 'Não informado'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CPF/CNPJ</label>
              <p className="text-gray-900">{team?.cpfCnpj || 'Não informado'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">OAB</label>
              <p className="text-gray-900">{team?.oab || 'Não informado'}</p>
            </div>
            {team?.email && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <p className="text-gray-900">{team.email}</p>
              </div>
            )}
            {team?.website && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <p className="text-gray-900">{team.website}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-800 underline text-sm mt-2"
          >
            Fechar
          </button>
        </div>
      )}

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
                accept="image/jpeg,image/png,image/svg+xml"
                onChange={handleLogoChange}
                className="hidden"
                id="logo-upload"
                disabled={loading || !canEdit}
              />
              <label
                htmlFor="logo-upload"
                className={`cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors ${
                  loading || !canEdit ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <PhotoIcon className="w-4 h-4 mr-2" />
                Escolher Logo
              </label>
              <p className="text-xs text-gray-500 mt-1">
                PNG, JPG ou SVG até 500KB
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
                disabled={loading || !canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100"
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
                disabled={loading || !canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100"
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
                disabled={loading || !canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100"
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
                disabled={loading || !canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100"
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
                disabled={loading || !canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100"
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
                disabled={loading || !canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100"
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
                disabled={loading || !canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100"
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
              disabled={loading || !canEdit}
              className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                  disabled={loading || !canEdit}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100"
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
                  disabled={loading || !canEdit}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100"
                  placeholder="(11) 99999-9999"
                />
                
                {phone.type !== 'WhatsApp' && (
                  <input
                    type="text"
                    value={phone.operator || ''}
                    onChange={(e) => updatePhone(phone.id, 'operator', e.target.value)}
                    disabled={loading || !canEdit}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100"
                    placeholder="Operadora"
                  />
                )}
                
                <button
                  type="button"
                  onClick={() => removePhone(phone.id)}
                  disabled={loading || !canEdit}
                  className="text-red-600 hover:text-red-800 p-2 rounded hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                value={address.type}
                onChange={(e) => updateAddress('type', e.target.value)}
                disabled={loading || !canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100"
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
                  value={address.cep}
                  onChange={(e) => updateAddress('cep', adminService.formatCep(e.target.value))}
                  disabled={loading || !canEdit}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100"
                  placeholder="00000-000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rua
                </label>
                <input
                  type="text"
                  value={address.street}
                  onChange={(e) => updateAddress('street', e.target.value)}
                  disabled={loading || !canEdit}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100"
                  placeholder="Rua, número"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Complemento
                </label>
                <input
                  type="text"
                  value={address.complement || ''}
                  onChange={(e) => updateAddress('complement', e.target.value)}
                  disabled={loading || !canEdit}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100"
                  placeholder="Sala, andar, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cidade
                </label>
                <input
                  type="text"
                  value={address.city}
                  onChange={(e) => updateAddress('city', e.target.value)}
                  disabled={loading || !canEdit}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100"
                  placeholder="São Paulo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado
                </label>
                <select
                  value={address.state}
                  onChange={(e) => updateAddress('state', e.target.value)}
                  disabled={loading || !canEdit}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100"
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
                  value={address.country}
                  onChange={(e) => updateAddress('country', e.target.value)}
                  disabled={loading || !canEdit}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100"
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
            onClick={() => window.location.reload()}
            disabled={loading || !canEdit}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || !canEdit}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
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
    </div>
  );
}