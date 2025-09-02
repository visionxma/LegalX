# 🧪 Guia de Testes - Sistema de Administração LegalX

## 📋 Checklist de Testes

### ✅ Teste 1: Configuração Inicial
- [ ] Login no sistema funciona
- [ ] Botão "Admin" aparece no header
- [ ] Página de administração carrega com 3 abas
- [ ] Team é criado automaticamente se não existir

### ✅ Teste 2: Aba Escritório
- [ ] Formulário carrega dados existentes
- [ ] Upload de logo funciona
- [ ] Validação de CPF/CNPJ funciona
- [ ] Formatação automática de campos funciona
- [ ] Adicionar telefones funciona
- [ ] WhatsApp não mostra campo operadora
- [ ] Endereço completo pode ser preenchido
- [ ] Salvar persiste dados no Firestore

### ✅ Teste 3: Aba Grupo de Envolvidos
- [ ] Lista de convites carrega
- [ ] Criar novo convite funciona
- [ ] Link de convite é gerado corretamente
- [ ] Botão "Copiar Link" funciona
- [ ] Botão "Enviar E-mail" abre cliente de e-mail
- [ ] Cancelar convite funciona
- [ ] Convites expirados são marcados corretamente

### ✅ Teste 4: Aba Acesso
- [ ] Lista de membros carrega
- [ ] Editar permissões funciona
- [ ] Alterar função atualiza permissões padrão
- [ ] Salvar permissões persiste no Firestore
- [ ] Remover membro funciona (exceto owner)
- [ ] Owner não pode ser removido

### ✅ Teste 5: Aceitar Convite
- [ ] Link de convite abre página correta
- [ ] Convite inválido mostra erro
- [ ] Convite expirado mostra erro
- [ ] Login/cadastro funciona na página de convite
- [ ] Aceitar convite adiciona usuário à equipe
- [ ] Redirecionamento após aceite funciona

### ✅ Teste 6: Segurança
- [ ] Usuário não-membro não acessa dados da equipe
- [ ] Permissões por módulo são respeitadas
- [ ] Apenas owner/admin podem convidar
- [ ] Apenas owner/admin podem alterar permissões
- [ ] Firestore Rules bloqueiam acessos indevidos

## 🔧 Como Executar os Testes

### Preparação:
1. **Configure o Firebase** seguindo ADMIN_SETUP.md
2. **Aplique as Firestore Rules** do arquivo firestore.rules
3. **Inicie o projeto** com `npm run dev`

### Teste Completo Passo-a-Passo:

#### 1. Teste de Configuração do Escritório
```bash
# 1. Faça login no sistema
# 2. Clique em "Admin" no header
# 3. Na aba "Escritório":
#    - Preencha: Nome, CPF/CNPJ, OAB
#    - Adicione 2 telefones (um WhatsApp)
#    - Configure endereço completo
#    - Faça upload de logo
#    - Clique "Salvar"
# 4. Verifique no Firestore Console se dados foram salvos
```

#### 2. Teste de Sistema de Convites
```bash
# 1. Na aba "Grupo de Envolvidos"
# 2. Clique "Novo Convite"
# 3. Insira email: teste@exemplo.com
# 4. Escolha função: "Editor"
# 5. Clique "Criar Convite"
# 6. Copie o link gerado
# 7. Abra aba anônima e acesse o link
# 8. Faça cadastro com email teste@exemplo.com
# 9. Aceite o convite
# 10. Verifique se usuário aparece na aba "Acesso"
```

#### 3. Teste de Permissões
```bash
# 1. Na aba "Acesso"
# 2. Clique "Editar" no membro teste@exemplo.com
# 3. Desmarque "Processos" e "Agenda"
# 4. Salve as alterações
# 5. Faça login com teste@exemplo.com
# 6. Verifique se módulos foram bloqueados
```

### Teste de Segurança (Console do Navegador):

#### Testar Isolamento de Dados:
```javascript
// Deve falhar - tentar acessar dados de outro usuário
firebase.firestore()
  .collection('userData')
  .doc('outro-usuario-id')
  .get()
  .then(doc => console.log('ERRO: Acesso indevido permitido'))
  .catch(err => console.log('✅ Acesso bloqueado corretamente:', err.code));
```

#### Testar Permissões de Convite:
```javascript
// Deve falhar se não for owner/admin
firebase.firestore()
  .collection('invitations')
  .add({
    email: 'hack@test.com',
    teamId: 'team123',
    role: 'admin'
  })
  .then(doc => console.log('ERRO: Convite criado indevidamente'))
  .catch(err => console.log('✅ Criação de convite bloqueada:', err.code));
```

## 🐛 Problemas Comuns e Soluções

### Problema: "Permission denied" ao salvar dados
**Solução:**
1. Verifique se as Firestore Rules foram aplicadas
2. Confirme se o usuário está autenticado
3. Verifique se o usuário tem permissões adequadas

### Problema: Upload de logo falha
**Solução:**
1. Verifique se as Storage Rules foram configuradas
2. Confirme se o arquivo é menor que 2MB
3. Teste com imagem PNG/JPG simples

### Problema: Convite não funciona
**Solução:**
1. Verifique se o link está correto
2. Confirme se o convite não expirou
3. Teste com usuário diferente (aba anônima)

### Problema: Permissões não são aplicadas
**Solução:**
1. Verifique se o membro foi adicionado corretamente
2. Confirme se as permissões foram salvas no Firestore
3. Teste fazendo logout/login

## 📊 Métricas de Teste

### Performance Esperada:
- ⏱️ **Carregamento da página Admin**: < 2 segundos
- ⏱️ **Salvamento de dados**: < 1 segundo
- ⏱️ **Criação de convite**: < 1 segundo
- ⏱️ **Aceite de convite**: < 3 segundos

### Limites do Plano Gratuito:
- 📊 **Firestore Reads**: 50.000/dia
- 📊 **Firestore Writes**: 20.000/dia
- 📊 **Storage**: 1GB total
- 📊 **Auth**: 10.000 verificações/mês

## 🔍 Debug e Logs

### Habilitar Logs Detalhados:
```javascript
// No console do navegador
localStorage.setItem('debug', 'legalx:*');

// Para ver logs do Firebase
firebase.firestore.enableNetwork();
firebase.firestore().settings({
  experimentalForceLongPolling: true
});
```

### Verificar Estado da Autenticação:
```javascript
// No console do navegador
firebase.auth().onAuthStateChanged(user => {
  console.log('Auth State:', user ? user.uid : 'Not authenticated');
});
```

### Verificar Dados no Firestore:
```javascript
// Listar teams do usuário atual
firebase.firestore()
  .collection('teams')
  .where('ownerUid', '==', firebase.auth().currentUser.uid)
  .get()
  .then(snapshot => {
    snapshot.forEach(doc => {
      console.log('Team:', doc.id, doc.data());
    });
  });
```

## 📝 Relatório de Teste

### Template para Relatório:
```
Data do Teste: ___________
Testador: ___________
Versão: ___________

Funcionalidades Testadas:
[ ] Configuração do Escritório
[ ] Sistema de Convites  
[ ] Gerenciamento de Permissões
[ ] Aceitar Convite
[ ] Segurança e Isolamento

Problemas Encontrados:
1. ___________
2. ___________

Sugestões de Melhoria:
1. ___________
2. ___________

Status Geral: [ ] Aprovado [ ] Reprovado [ ] Aprovado com Ressalvas
```

---

**LegalX Testing Guide** - Garanta que todas as funcionalidades estão funcionando corretamente