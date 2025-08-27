# LegalX - Sistema de Gestão Jurídica

## 📋 Sobre o Sistema

O LegalX é um sistema completo de gestão para escritórios de advocacia, desenvolvido com React, TypeScript e Tailwind CSS. O sistema utiliza armazenamento local (localStorage) para persistência de dados, garantindo que todas as informações sejam salvas diretamente no navegador do usuário.

## 🚀 Funcionalidades Principais

### 📊 Dashboard
- Visão geral financeira (receitas, despesas, saldo)
- Estatísticas de processos e eventos
- Gráficos de fluxo de caixa
- Lista de próximos compromissos e documentos recentes

### ⚖️ Gestão de Processos
- Cadastro completo de processos jurídicos
- Controle de status (Em andamento/Concluído)
- Anexos de documentos
- Busca e filtros avançados

### 📅 Agenda
- Calendário mensal interativo
- Cadastro de eventos (Audiências, Reuniões, Prazos)
- Visualização por dia/semana/mês
- Notificações visuais por tipo de evento

### 💰 Gestão Financeira
- Controle de receitas e despesas
- Categorização automática
- Relatórios financeiros
- Gráficos de performance

### 📄 Gerador de Documentos
- Procurações (Ad Judicia e específicas)
- Recibos de honorários
- Geração automática em PDF
- Salvamento no histórico

### 📈 Relatórios
- Relatórios financeiros detalhados
- Estatísticas operacionais
- Gráficos interativos
- Exportação em PDF

### ⚙️ Configurações
- Backup e restauração de dados
- Validação de integridade
- Limpeza de dados
- Estatísticas do sistema

## 🛠️ Tecnologias Utilizadas

- **React 18** - Framework principal
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização
- **Heroicons** - Ícones
- **Recharts** - Gráficos
- **React Hook Form** - Formulários
- **Yup** - Validação
- **jsPDF** - Geração de PDFs
- **date-fns** - Manipulação de datas

## 💾 Sistema de Armazenamento

### Armazenamento Local (localStorage)
O sistema utiliza exclusivamente o localStorage do navegador para persistência de dados:

- **Segurança**: Dados ficam apenas no dispositivo do usuário
- **Performance**: Acesso instantâneo aos dados
- **Offline**: Funciona sem conexão com internet
- **Privacidade**: Nenhum dado é enviado para servidores externos

### Estrutura de Dados
```javascript
// Chaves utilizadas no localStorage
legalx_processes    // Processos jurídicos
legalx_events      // Eventos da agenda
legalx_revenues    // Receitas
legalx_expenses    // Despesas
legalx_documents   // Documentos gerados
```

## 🔧 Instalação e Configuração

### Pré-requisitos
- Node.js 18+ 
- npm ou yarn

### Instalação
```bash
# Clonar o repositório
git clone [url-do-repositorio]

# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

### Build para Produção
```bash
# Gerar build otimizado
npm run build

# Visualizar build
npm run preview
```

## 📚 Como Usar

### 1. Primeiro Acesso
- Acesse o sistema através do navegador
- O sistema iniciará com dados vazios
- Use "Configurações > Criar Dados de Exemplo" para testar

### 2. Cadastro de Processos
- Vá em "Processos > Novo Processo"
- Preencha todas as informações obrigatórias
- Adicione anexos se necessário
- Salve o processo

### 3. Gestão da Agenda
- Acesse "Agenda"
- Clique em uma data ou use "Novo Evento"
- Preencha os dados do compromisso
- O evento aparecerá no calendário

### 4. Controle Financeiro
- Use "Financeiro > Nova Receita/Despesa"
- Categorize adequadamente
- Acompanhe o saldo no dashboard

### 5. Geração de Documentos
- Acesse "Documentos"
- Escolha o tipo (Procuração/Recibo)
- Preencha os dados
- O PDF será gerado automaticamente

## 🔒 Backup e Segurança

### Backup Manual
1. Vá em "Configurações"
2. Clique em "Fazer Backup dos Dados"
3. Salve o arquivo JSON em local seguro

### Restauração
1. Vá em "Configurações"
2. Use "Restaurar Backup"
3. Selecione o arquivo de backup
4. Confirme a restauração

### Validação de Dados
- Execute "Validar Integridade dos Dados" regularmente
- Corrija problemas identificados
- Mantenha backups atualizados

## 🚨 Limpeza de Dados

### Limpeza Completa
⚠️ **ATENÇÃO**: Esta ação remove TODOS os dados permanentemente!

1. Vá em "Configurações"
2. Clique em "Limpar Todos os Dados"
3. Confirme a ação
4. O sistema será reiniciado

### Limpeza Seletiva
Use o console do navegador para limpeza específica:
```javascript
// Limpar apenas processos
localStorageService.clearProcesses();

// Limpar apenas eventos
localStorageService.clearEvents();

// Limpar apenas dados financeiros
localStorageService.clearRevenues();
localStorageService.clearExpenses();
```

## 🧪 Dados de Teste

Para criar dados de exemplo:
1. Vá em "Configurações"
2. Clique em "Criar Dados de Exemplo"
3. Dados fictícios serão adicionados ao sistema

## 📱 Responsividade

O sistema é totalmente responsivo e funciona em:
- Desktop (1024px+)
- Tablet (768px - 1023px)
- Mobile (320px - 767px)

## 🔍 Solução de Problemas

### Dados não aparecem
- Verifique se o JavaScript está habilitado
- Limpe o cache do navegador
- Verifique o console para erros

### Performance lenta
- Execute validação de dados
- Faça backup e limpe dados antigos
- Verifique uso do armazenamento

### Erro ao salvar
- Verifique espaço disponível no localStorage
- Valide os dados inseridos
- Tente recarregar a página

## 📞 Suporte

Para suporte técnico:
1. Verifique este README
2. Consulte o console do navegador para erros
3. Faça backup dos dados antes de correções

## 📄 Licença

Este projeto está sob licença MIT. Veja o arquivo LICENSE para mais detalhes.

---

**LegalX** - Sistema de Gestão Jurídica Completo
Desenvolvido com ❤️ para advogados e escritórios de advocacia.