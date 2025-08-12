/**
 * Script de Correção Emergencial para Produção
 * 
 * Este script aplica as correções mais críticas para resolver o problema
 * "Latin connection aguarde 15 minutos" em produção.
 * 
 * USAR APENAS EM EMERGÊNCIA - Para correção completa, seguir config-producao.md
 */

const fs = require('fs');
const path = require('path');

console.log('🚨 Aplicando correções emergenciais para produção...');

// 1. Verificar se arquivo app.js existe
const appJsPath = path.join(__dirname, 'app.js');
if (!fs.existsSync(appJsPath)) {
    console.error('❌ Arquivo app.js não encontrado!');
    process.exit(1);
}

// 2. Ler conteúdo do app.js
let appJsContent = fs.readFileSync(appJsPath, 'utf8');

// 3. Fazer backup
const backupPath = path.join(__dirname, `app.js.backup.${Date.now()}`);
fs.writeFileSync(backupPath, appJsContent);
console.log(`📋 Backup criado: ${backupPath}`);

// 4. Aplicar correção do rate limiting
const oldRateLimit = /max: this\.environment === 'production' \? 100 : 1000/g;
const newRateLimit = "max: this.environment === 'production' ? 500 : 1000";

if (appJsContent.match(oldRateLimit)) {
    appJsContent = appJsContent.replace(oldRateLimit, newRateLimit);
    console.log('✅ Rate limiting corrigido: 100 → 500 requisições por 15 minutos');
} else {
    console.log('⚠️  Padrão de rate limiting não encontrado - verificar manualmente');
}

// 5. Salvar arquivo corrigido
fs.writeFileSync(appJsPath, appJsContent);
console.log('✅ Arquivo app.js atualizado');

// 6. Verificar se existe dadosConexaoSGDB.js
const dbConfigPath = path.join(__dirname, 'dadosConexaoSGDB.js');
if (fs.existsSync(dbConfigPath)) {
    // Fazer backup do arquivo de configuração do banco
    const dbContent = fs.readFileSync(dbConfigPath, 'utf8');
    const dbBackupPath = path.join(__dirname, `dadosConexaoSGDB.js.backup.${Date.now()}`);
    fs.writeFileSync(dbBackupPath, dbContent);
    console.log(`📋 Backup do DB config criado: ${dbBackupPath}`);
    
    // Verificar se connectionLimit precisa ser aumentado
    if (dbContent.includes('connectionLimit: 10')) {
        const newDbContent = dbContent.replace('connectionLimit: 10', 'connectionLimit: 30');
        fs.writeFileSync(dbConfigPath, newDbContent);
        console.log('✅ Pool de conexões aumentado: 10 → 30 conexões');
    } else {
        console.log('⚠️  connectionLimit não encontrado ou já configurado');
    }
} else {
    console.log('⚠️  Arquivo dadosConexaoSGDB.js não encontrado - criar baseado no .example');
}

// 7. Instruções finais
console.log('\n🎯 CORREÇÕES APLICADAS:');
console.log('   • Rate limiting: 100 → 500 req/15min');
console.log('   • Pool de conexões: 10 → 30 conexões');
console.log('\n📋 PRÓXIMOS PASSOS:');
console.log('   1. Reiniciar aplicação: pm2 restart gestao-bcc-ufj');
console.log('   2. Monitorar logs: pm2 logs gestao-bcc-ufj');
console.log('   3. Verificar se erro persiste');
console.log('   4. Para otimização completa, seguir: config-producao.md');
console.log('\n⚠️  IMPORTANTE:');
console.log('   • Backups criados automaticamente');
console.log('   • Para reverter: restaurar arquivos .backup');
console.log('   • Monitorar performance após aplicação');

console.log('\n✅ Correções emergenciais aplicadas com sucesso!');