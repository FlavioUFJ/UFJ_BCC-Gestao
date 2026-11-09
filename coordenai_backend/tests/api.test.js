/**
 * Testes de fumaça da API (sem banco de dados).
 * Executar: npm test
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = 'test';

const { createApp } = require('../app');

const app = createApp();

function cookieCsrf(resposta) {
    const cookie = (resposta.headers['set-cookie'] || []).find((c) => c.startsWith('XSRF-TOKEN='));
    return cookie ? cookie.split(';')[0].split('=')[1] : null;
}

test('health responde sem autenticação', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'OK');
});

test('session-status informa visitante não autenticado', async () => {
    const res = await request(app).get('/api/session-status');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { authenticated: false });
});

test('rotas protegidas respondem 401 em JSON, sem redirecionar', async () => {
    const rotas = [
        '/api/dashboard',
        '/api/estagios',
        '/api/pessoas',
        '/api/planos-atividade',
        '/api/frequencias',
        '/api/admin/modulos',
        '/api/api/pessoas/buscar',
        '/api/secure/pessoas/buscar',
        '/api/secure/estagios/dashboard-administrativo/dados'
    ];

    for (const rota of rotas) {
        const res = await request(app).get(rota);
        assert.equal(res.status, 401, rota);
        assert.equal(res.body.success, false, rota);
        assert.equal(res.body.code, 'NAO_AUTENTICADO', rota);
        assert.equal(res.headers.location, undefined, rota);
    }
});

test('rotas de teste e de página do legado não existem', async () => {
    const rotas = [
        '/api/auth/test-form',
        '/api/auth/simple-login',
        '/api/secure/test',
        '/api/test-root',
        '/api/files/uploads/..%2F..%2Fpackage.json',
        '/api/reports/..%2F..%2Fpackage.json'
    ];

    for (const rota of rotas) {
        const res = await request(app).get(rota);
        assert.ok([401, 404].includes(res.status), `${rota} -> ${res.status}`);
        assert.equal(res.body.name, undefined, rota);
    }
    const registro = await request(app).get('/api/auth/register');
    assert.equal(registro.status, 404);
});

test('rota inexistente responde 404 em JSON', async () => {
    const res = await request(app).get('/api/nao-existe');
    assert.equal(res.status, 404);
    assert.equal(res.body.code, 'ROTA_NAO_ENCONTRADA');
});

test('requisição que altera estado sem token CSRF é recusada', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.c', senha: 'x' });
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'CSRF_INVALIDO');
});

test('token CSRF divergente é recusado', async () => {
    const inicial = await request(app).get('/api/session-status');
    const token = cookieCsrf(inicial);
    assert.ok(token);

    const res = await request(app)
        .post('/api/auth/login')
        .set('Cookie', `XSRF-TOKEN=${token}`)
        .set('X-XSRF-TOKEN', 'outro-valor')
        .send({ email: 'a@b.c', senha: 'x' });
    assert.equal(res.status, 403);
});

test('com token CSRF correto a requisição chega ao controller', async () => {
    const inicial = await request(app).get('/api/session-status');
    const token = cookieCsrf(inicial);

    const res = await request(app)
        .post('/api/auth/login')
        .set('Cookie', `XSRF-TOKEN=${token}`)
        .set('X-XSRF-TOKEN', token)
        .send({});
    assert.equal(res.status, 400);
    assert.equal(res.body.message, 'Email e senha são obrigatórios');
});

test('link de redefinição de senha desconhecido é inválido', async () => {
    const res = await request(app).get('/api/auth/reset-password/token-qualquer');
    assert.equal(res.status, 400);
    assert.equal(res.body.valid, false);
});

test('cabeçalhos de segurança presentes e sem X-Powered-By', async () => {
    const res = await request(app).get('/api/health');
    assert.ok(res.headers['content-security-policy']);
    assert.equal(res.headers['x-powered-by'], undefined);
});
