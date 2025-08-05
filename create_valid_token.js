// Script para criar um token válido temporário
const path = require('path');
const fs = require('fs');

// Simular a criação de um token válido
if (!global.resetTokens) {
    global.resetTokens = new Map();
}

const validToken = 'valid-reset-token-123';
global.resetTokens.set(validToken, {
    email: 'test@example.com',
    userId: 1,
    expiry: new Date(Date.now() + 3600000) // 1 hora
});

console.log('Token válido criado:', validToken);
console.log('Acesse: http://localhost:3000/auth/reset-password/' + validToken);

// Manter o processo ativo por alguns segundos
setTimeout(() => {
    console.log('Token ainda válido. Use a URL acima para testar.');
}, 2000);