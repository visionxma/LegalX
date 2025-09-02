# LegalX - Sistema de Administração

## 📋 Configuração do Sistema de Administração

Este documento contém as instruções para configurar e testar o sistema de administração do LegalX.

## 🔧 Configuração do Firebase

### 1. Firebase Console
1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Selecione seu projeto LegalX
3. Configure os seguintes serviços:

### 2. Authentication
```
- Vá em Authentication > Settings
- Na aba "Authorized domains", adicione:
  - localhost (para desenvolvimento)
  - seu-dominio.com (para produção)
  - legalx-b64a7.web.app (se usando Firebase Hosting)
```

### 3. Firestore Database
```
- Vá em Firestore Database
- Clique em "Rules"
- Cole o conteúdo do arquivo firestore.rules
- Publique as regras
```

### 4. Storage
```
- Vá em Storage
- Clique em "Rules"
- Configure as regras de storage:

rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /teams/{teamId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                      exists(/databases/(default)/documents/teamMembers/$(request.auth.uid + '_' + teamId));
    }
  }
}
```

## 🗄️ Estrutura do Banco de Dados

### Collections Principais:

#### `/teams/{teamId}`
```json
{
  "name": "Silva & Associados",
  "ownerUid": "user123",
  "logoUrl": "https://storage.googleapis.com/...",
  "cpfCnpj": "12.345.678/0001-90",
  "oab": "123456/SP",
  "ccm": "123456789",
  "email": "contato@silva.adv.br",
  "website": "https://silva.adv.br",
  "areaOfPractice": "Direito Civil, Trabalhista",
  "phones": [
    {
      "id": "phone1",
      "type": "Telefone comercial",
      "number": "(11) 3333-4444",
      "operator": "Vivo"
    }
  ],
  "address": {
    "type": "Comercial",
    "cep": "01310-100",
    "street": "Av. Paulista, 1000",
    "complement": "Sala 1001",
    "city": "São Paulo",
    "state": "SP",
    "country": "Brasil"
  },
  "createdAt": "2024-01-01T00:00:00.000Z",
  "settings": {
    "allowInvitations": true,
    "defaultRole": "viewer",
    "modules": ["processos", "agenda", "documentos"]
  }
}
```

#### `/teamMembers/{uid}_{teamId}`
```json
{
  "uid": "user123",
  "email": "usuario@exemplo.com",
  "teamId": "team456",
  "role": "admin",
  "permissions": {
    "financas": true,
    "processos": true,
    "agenda": true,
    "documentos": false,
    "relatorios": false,
    "equipe": false,
    "configuracoes": false
  },
  "status": "active",
  "addedAt": "2024-01-01T00:00:00.000Z",
  "addedBy": "owner123"
}
```

#### `/invitations/{inviteId}`
```json
{
  "email": "novo@usuario.com",
  "teamId": "team456",
  "role": "editor",
  "token": "abc123xyz789",
  "expiresAt": "2024-01-04T00:00:00.000Z",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "createdBy": "owner123",
  "status": "pending"
}
```

## 🧪 Dados de Exemplo (Seed)

### Criar Team de Exemplo:
```javascript
// Execute no console do navegador após fazer login
const sampleTeam = {
  name: "Silva & Associados Advocacia",
  cpfCnpj: "12.345.678/0001-90",
  oab: "123456/SP",
  ccm: "987654321",
  email: "contato@silva.adv.br",
  website: "https://silva.adv.br",
  areaOfPractice: "Direito Civil, Direito Trabalhista, Direito Empresarial",
  phones: [
    {
      id: "phone1",
      type: "Telefone comercial",
      number: "(11) 3333-4444",
      operator: "Vivo"
    },
    {
      id: "phone2",
      type: "WhatsApp",
      number: "(11) 99999-8888"
    }
  ],
  address: {
    type: "Comercial",
    cep: "01310-100",
    street: "Av. Paulista, 1000",
    complement: "Sala 1001",
    city: "São Paulo",
    state: "SP",
    country: "Brasil"
  }
};

// Usar adminService para criar
adminService.createTeam(sampleTeam);
```

## 🔍 Instruções de Teste

### Teste 1: Configuração do Escritório
1. Faça login no sistema
2. Clique no botão "Admin" no header
3. Na aba "Escritório":
   - Preencha todos os campos obrigatórios
   - Adicione pelo menos 2 telefones (um WhatsApp e um comercial)
   - Configure o endereço completo
   - Faça upload de um logo
   - Clique em "Salvar Dados"
4. Verifique se os dados foram salvos no Firestore

### Teste 2: Sistema de Convites
1. Na aba "Grupo de Envolvidos":
   - Clique em "Novo Convite"
   - Insira um e-mail válido
   - Escolha uma função (viewer/editor/admin)
   - Clique em "Criar Convite"
2. Copie o link gerado
3. Abra uma aba anônima e acesse o link
4. Faça login/cadastro com o e-mail convidado
5. Aceite o convite
6. Verifique se o usuário aparece na aba "Acesso"

### Teste 3: Gerenciamento de Permissões
1. Na aba "Acesso":
   - Clique em "Editar" em um membro
   - Altere as permissões por módulo
   - Mude a função se necessário
   - Salve as alterações
2. Faça login com o usuário editado
3. Verifique se as permissões foram aplicadas corretamente

### Teste 4: Segurança (Firestore Rules)
1. Tente acessar dados de outro usuário via console:
```javascript
// Deve falhar
firebase.firestore().collection('userData').doc('outro-usuario-id').get()
```

2. Tente criar convite sem ser admin:
```javascript
// Deve falhar se não for owner/admin
firebase.firestore().collection('invitations').add({...})
```

## 🚨 Validações de Segurança

### Validações Implementadas:
- ✅ CPF/CNPJ com validação de dígitos verificadores
- ✅ Formato de telefone brasileiro
- ✅ CEP no formato 00000-000
- ✅ E-mail válido para convites
- ✅ Expiração de convites (72 horas)
- ✅ Verificação de e-mail no aceite de convite
- ✅ Prevenção de convites duplicados
- ✅ Isolamento de dados por usuário/equipe

### Firestore Security Rules:
- ✅ Usuários só acessam seus próprios dados
- ✅ Membros só acessam dados da equipe
- ✅ Permissões por módulo respeitadas
- ✅ Apenas owner/admin podem convidar
- ✅ Apenas owner/admin podem alterar permissões
- ✅ Owner não pode ser removido

## 💰 Custos e Limitações

### Plano Spark (Gratuito):
- ✅ **Funciona completamente** - todas as funcionalidades implementadas
- ✅ Authentication: 10.000 verificações/mês
- ✅ Firestore: 50.000 leituras, 20.000 escritas/dia
- ✅ Storage: 1GB de armazenamento
- ✅ Hosting: 10GB de transferência/mês

### Funcionalidades que requerem Blaze:
- ❌ **Envio automático de e-mails** (requer Cloud Functions + SendGrid/SMTP)
- ❌ **Admin SDK** para operações administrativas avançadas
- ❌ **Scheduled Functions** para limpeza automática de convites expirados

### Alternativas Gratuitas Implementadas:
- ✅ **Convite manual**: Link copiado + botão mailto
- ✅ **Validação client-side**: Expiração verificada no frontend
- ✅ **Limpeza manual**: Interface para cancelar convites

## 🔧 Comandos de Desenvolvimento

### Testar Firestore Rules:
```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Inicializar projeto (se necessário)
firebase init firestore

# Testar regras localmente
firebase emulators:start --only firestore

# Executar testes de regras
firebase firestore:rules:test --project=legalx-b64a7
```

### Deploy das Regras:
```bash
# Deploy apenas das regras
firebase deploy --only firestore:rules

# Deploy completo
firebase deploy
```

## 📝 Próximos Passos

### Para Produção:
1. **Configurar domínio personalizado** no Firebase Hosting
2. **Adicionar SSL** (automático no Firebase Hosting)
3. **Configurar backup** automático do Firestore
4. **Monitorar quotas** do plano Spark

### Para Funcionalidades Avançadas (Blaze):
1. **Cloud Functions** para envio de e-mails:
```javascript
// functions/src/index.ts
exports.sendInviteEmail = functions.firestore
  .document('invitations/{inviteId}')
  .onCreate(async (snap, context) => {
    // Implementar envio via SendGrid/Nodemailer
  });
```

2. **Scheduled Functions** para limpeza:
```javascript
exports.cleanExpiredInvites = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    // Limpar convites expirados
  });
```

## 🐛 Troubleshooting

### Erro: "Permission denied"
- Verifique se as regras do Firestore foram aplicadas
- Confirme se o usuário está autenticado
- Verifique se o usuário é membro da equipe

### Erro: "User not found in team"
- Verifique se o convite foi aceito corretamente
- Confirme se o documento foi criado em `/teamMembers/`

### Erro: "Invite expired"
- Convites expiram em 72 horas
- Crie um novo convite se necessário

### Upload de Logo Falha:
- Verifique se as regras do Storage foram configuradas
- Confirme se o arquivo é menor que 2MB
- Verifique se é uma imagem válida (PNG, JPG, SVG)

## 📞 Suporte

Para problemas técnicos:
1. Verifique o console do navegador para erros
2. Confirme se as regras do Firestore estão corretas
3. Teste com dados de exemplo
4. Verifique se o Firebase está configurado corretamente

---

**LegalX Admin System** - Desenvolvido para funcionar no plano gratuito do Firebase