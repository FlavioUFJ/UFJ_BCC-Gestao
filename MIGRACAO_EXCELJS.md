# Migração de xlsx para ExcelJS

## 🚨 Problema de Segurança

A biblioteca `xlsx` (versão 0.18.5) possui **vulnerabilidades críticas de segurança**:
- ❌ **Prototype Pollution** - Permite modificação de protótipos JavaScript
- ❌ **Regular Expression Denial of Service (ReDoS)** - Pode causar DoS
- ❌ **Sem correção disponível** - Vulnerabilidades não podem ser corrigidas

## ✅ Solução: ExcelJS

**ExcelJS** é uma alternativa moderna, segura e ativamente mantida:
- ✅ **Sem vulnerabilidades conhecidas**
- ✅ **Ativamente mantida** (última atualização recente)
- ✅ **API similar** - Migração facilitada
- ✅ **Melhor performance** e recursos avançados
- ✅ **Suporte completo** para leitura/escrita Excel

## 📋 Passos da Migração

### 1. Remover xlsx e Instalar ExcelJS

```bash
# Remover xlsx
npm uninstall xlsx

# Instalar ExcelJS
npm install exceljs

# Verificar instalação
npm list exceljs
```

### 2. Arquivos que Precisam ser Modificados

#### Arquivo Principal: `public/js/importar-planilha.js`
- **Linhas afetadas:** 67, 71, 160, 162, 163, 164
- **Função:** Geração e leitura de planilhas Excel

#### Arquivo de Configuração: `src/config/index.js`
- **Linha afetada:** 44 (MIME types)
- **Função:** Validação de tipos de arquivo

### 3. Alterações no Código

#### A. Modificar `public/js/importar-planilha.js`

**ANTES (xlsx):**
```javascript
// Criar workbook
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet(dados);
XLSX.utils.book_append_sheet(wb, ws, 'Modelo Pessoas');
XLSX.writeFile(wb, 'modelo_importacao_pessoas.xlsx');

// Ler arquivo
const workbook = XLSX.read(data, { type: 'array' });
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
```

**DEPOIS (ExcelJS):**
```javascript
// Criar workbook
const ExcelJS = require('exceljs'); // No frontend, usar import
const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet('Modelo Pessoas');

// Adicionar dados
worksheet.addRows(dados);

// Configurar larguras das colunas
worksheet.columns = [
    { width: 30 }, // Nome
    { width: 30 }, // Email
    { width: 20 }, // Telefone
    { width: 20 }  // CPF/CNPJ
];

// Baixar arquivo
const buffer = await workbook.xlsx.writeBuffer();
const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'modelo_importacao_pessoas.xlsx';
a.click();

// Ler arquivo
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.load(data);
const worksheet = workbook.getWorksheet(1);
const jsonData = [];
worksheet.eachRow((row, rowNumber) => {
    jsonData.push(row.values.slice(1)); // Remove índice 0 vazio
});
```

#### B. Atualizar Validação de MIME Types

**Arquivo:** `src/config/index.js` (linha ~44)

```javascript
// Manter os mesmos MIME types - ExcelJS usa os mesmos formatos
excel: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
```

### 4. Script de Migração Automática

```bash
#!/bin/bash
# Script: migrar-exceljs.sh

echo "🔄 Iniciando migração de xlsx para ExcelJS..."

# Backup do código atual
echo "📦 Criando backup..."
cp public/js/importar-planilha.js public/js/importar-planilha.js.backup
cp package.json package.json.backup

# Remover xlsx
echo "🗑️ Removendo xlsx..."
npm uninstall xlsx

# Instalar ExcelJS
echo "📥 Instalando ExcelJS..."
npm install exceljs

echo "✅ Dependências atualizadas!"
echo "⚠️ ATENÇÃO: Você precisa atualizar o código manualmente!"
echo "📖 Consulte o arquivo MIGRACAO_EXCELJS.md para detalhes"
```

### 5. Código Atualizado Completo

#### Novo `public/js/importar-planilha.js` (Seções Relevantes)

```javascript
class ImportarPlanilha {
    // ... outros métodos ...

    async gerarModeloPlanilha() {
        try {
            // Usar ExcelJS no frontend requer bundler ou CDN
            // Alternativa: fazer requisição para endpoint do servidor
            const response = await fetch('/api/gerar-modelo-excel', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'modelo_importacao_pessoas.xlsx';
                a.click();
                window.URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Erro ao gerar modelo:', error);
            this.mostrarErro('Erro ao gerar modelo de planilha.');
        }
    }

    async lerArquivoExcel(arquivo) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    // Enviar para servidor processar com ExcelJS
                    const formData = new FormData();
                    formData.append('arquivo', arquivo);
                    
                    const response = await fetch('/api/processar-excel', {
                        method: 'POST',
                        body: formData
                    });
                    
                    if (response.ok) {
                        const jsonData = await response.json();
                        resolve(jsonData.data);
                    } else {
                        throw new Error('Erro ao processar arquivo');
                    }
                } catch (error) {
                    reject(new Error('Erro ao ler arquivo Excel: ' + error.message));
                }
            };
            reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
            reader.readAsArrayBuffer(arquivo);
        });
    }
}
```

#### Novo Endpoint no Servidor (Adicionar em `app.js` ou rota específica)

```javascript
const ExcelJS = require('exceljs');

// Endpoint para gerar modelo
app.get('/api/gerar-modelo-excel', async (req, res) => {
    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Modelo Pessoas');
        
        // Cabeçalhos
        const headers = ['Nome', 'Email', 'Telefone', 'CPF/CNPJ'];
        worksheet.addRow(headers);
        
        // Configurar larguras
        worksheet.columns = [
            { width: 30 },
            { width: 30 },
            { width: 20 },
            { width: 20 }
        ];
        
        // Estilizar cabeçalho
        worksheet.getRow(1).font = { bold: true };
        
        const buffer = await workbook.xlsx.writeBuffer();
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=modelo_importacao_pessoas.xlsx');
        res.send(buffer);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao gerar modelo' });
    }
});

// Endpoint para processar Excel
app.post('/api/processar-excel', upload.single('arquivo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }
        
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(req.file.path);
        
        const worksheet = workbook.getWorksheet(1);
        const jsonData = [];
        
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) { // Pular cabeçalho
                jsonData.push(row.values.slice(1)); // Remove índice 0 vazio
            }
        });
        
        // Limpar arquivo temporário
        fs.unlinkSync(req.file.path);
        
        res.json({ data: jsonData });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao processar arquivo Excel' });
    }
});
```

## 🧪 Testes Após Migração

### 1. Testar Geração de Modelo
```bash
# Acessar a aplicação
# Ir para página de importação
# Clicar em "Baixar Modelo"
# Verificar se arquivo é gerado corretamente
```

### 2. Testar Importação
```bash
# Fazer upload de planilha Excel
# Verificar se dados são lidos corretamente
# Confirmar que não há erros no console
```

### 3. Verificar Segurança
```bash
# Executar audit novamente
npm audit

# Deve mostrar menos vulnerabilidades
```

## 📊 Comparação de Recursos

| Recurso | xlsx | ExcelJS |
|---------|------|----------|
| Segurança | ❌ Vulnerável | ✅ Seguro |
| Manutenção | ❌ Irregular | ✅ Ativa |
| Performance | ⚠️ Média | ✅ Boa |
| Recursos | ⚠️ Básicos | ✅ Avançados |
| Tamanho | ✅ Pequeno | ⚠️ Maior |
| API | ✅ Simples | ✅ Intuitiva |

## 🚀 Próximos Passos

1. **Executar comandos de migração**
2. **Atualizar código conforme guia**
3. **Testar funcionalidades**
4. **Verificar segurança com `npm audit`**
5. **Fazer commit das alterações**

## 🆘 Rollback (Se Necessário)

```bash
# Restaurar arquivos de backup
cp public/js/importar-planilha.js.backup public/js/importar-planilha.js
cp package.json.backup package.json

# Reinstalar dependências
npm install
```

## 📝 Notas Importantes

- ⚠️ **ExcelJS é maior** que xlsx (~2MB vs ~500KB)
- ✅ **Mais recursos** - Estilos, fórmulas, gráficos
- ✅ **Melhor TypeScript** support
- ✅ **API mais moderna** com Promises/async-await
- ✅ **Documentação excelente**

---

**Recomendação:** Execute a migração em ambiente de desenvolvimento primeiro, teste completamente, e depois aplique em produção.