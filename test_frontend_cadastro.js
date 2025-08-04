const http = require('http');
const querystring = require('querystring');

// Simular dados do frontend
const testData = {
    nome: 'Supervisor Teste Frontend',
    email: 'supervisor.frontend@empresa.com',
    telefone: '', // Campo vazio como no problema relatado
    cnpj_cpf: '',
    tipo: 'F',
    categoria: '5'
};

console.log('Testando cadastro via rota frontend...');
console.log('Dados:', testData);

const postData = JSON.stringify(testData);

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/secure/pessoas/criar',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Cookie': 'connect.sid=test' // Simular sessão
    }
};

const req = http.request(options, (res) => {
    console.log(`\nStatus: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);
    
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log('\nResposta do servidor:');
        try {
            const response = JSON.parse(data);
            console.log(JSON.stringify(response, null, 2));
        } catch (e) {
            console.log('Resposta não é JSON válido:');
            console.log(data);
        }
    });
});

req.on('error', (e) => {
    console.error(`Erro na requisição: ${e.message}`);
});

// Enviar dados
req.write(postData);
req.end();