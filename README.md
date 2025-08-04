# Sistema de Gestão de Planos de Atividade de Estágio

## Descrição
Sistema web desenvolvido para gerenciar planos de atividade dos estagiários do curso de Ciência da Computação da Universidade Federal de Jataí (UFJ).

## Funcionalidades

### Para Estagiários:
- **Login personalizado**: Matrícula como usuário e data de nascimento como senha inicial
- **Alteração de senha**: Possibilidade de alterar a senha a qualquer momento
- **Formulário de plano**: Preenchimento completo do plano de atividades
- **Edição ilimitada**: Possibilidade de editar o plano quantas vezes necessário
- **Geração de PDF**: Download do plano formatado em A4

### Para Coordenador:
- **Área administrativa**: Acesso com login "coordenador" e senha "01/08/2025"
- **Importação de estagiários**: Upload de planilha Excel com dados dos alunos
- **Consulta de planos**: Visualização de todos os planos preenchidos
- **Geração de PDFs**: Download dos planos dos estagiários
- **Dashboard estatístico**: Visão geral dos planos preenchidos e pendentes

## Tecnologias Utilizadas
- **Backend**: Node.js com Express
- **Banco de Dados**: SQLite
- **Frontend**: EJS, Bootstrap 5, Font Awesome
- **Autenticação**: bcrypt para hash de senhas
- **Upload de arquivos**: Multer
- **Processamento de planilhas**: xlsx
- **Geração de PDF**: Puppeteer

## Como Executar

1. **Instalar dependências**:
   ```bash
   npm install
   ```

2. **Criar diretório de uploads**:
   ```bash
   mkdir uploads
   ```

3. **Iniciar o servidor**:
   ```bash
   npm start
   ```
   ou para desenvolvimento:
   ```bash
   npm run dev
   ```

4. **Acessar o sistema**:
   - Abra o navegador em: `http://localhost:3000`

## Credenciais de Acesso

### Coordenador:
- **Login**: coordenador
- **Senha**: 01/08/2025

### Estagiários:
- **Login**: Número da matrícula
- **Senha inicial**: Data de nascimento (DD/MM/AAAA)
- **Nota**: A senha pode ser alterada após o primeiro login

## Estrutura do Banco de Dados

### Tabela `estagiarios`:
- id (PRIMARY KEY)
- matricula (UNIQUE)
- nome
- email
- senha (hash)
- data_nascimento
- created_at

### Tabela `planos_atividade`:
- id (PRIMARY KEY)
- estagiario_id (FOREIGN KEY)
- empresa
- supervisor_empresa
- telefone_supervisor
- email_supervisor
- periodo_inicio
- periodo_fim
- carga_horaria_semanal
- atividades_desenvolvidas
- objetivos
- cronograma
- recursos_necessarios
- created_at
- updated_at

## Importação de Estagiários

Para importar estagiários via planilha Excel, o arquivo deve conter as seguintes colunas:
- **Matrícula**: Número da matrícula do aluno
- **Nome**: Nome completo do estagiário
- **E-mail**: E-mail institucional ou pessoal

**Formato aceito**: .xlsx ou .xls

## Recursos do Sistema

### Segurança:
- Senhas criptografadas com bcrypt
- Sessões seguras
- Validação de acesso por tipo de usuário
- Proteção contra acesso não autorizado

### Interface:
- Design responsivo e moderno
- Tema com gradiente azul/roxo
- Ícones Font Awesome
- Feedback visual para ações do usuário
- Validação em tempo real nos formulários

### Funcionalidades Avançadas:
- Geração de PDF com layout profissional
- Upload e processamento de planilhas Excel
- Sistema de busca na área administrativa
- Estatísticas em tempo real
- Validação de datas e campos obrigatórios

## Suporte

Para dúvidas ou problemas, entre em contato com a coordenação do curso de Ciência da Computação da UFJ.

---

**Desenvolvido para a Universidade Federal de Jataí**  
**Curso de Ciência da Computação**