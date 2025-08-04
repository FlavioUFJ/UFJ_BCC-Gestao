/**
 * Servidor Principal - Sistema de Gestão de Estágios UFJ BCC
 * Ponto de entrada da aplicação refatorada
 */

// Importar a classe principal da aplicação
const App = require('./app');

// Criar e iniciar a aplicação
const application = new App();

// Iniciar servidor
application.start().catch(error => {
    console.error('❌ Falha crítica ao iniciar aplicação:', error);
    process.exit(1);
});

// Exportar instância para testes
module.exports = application.getApp();