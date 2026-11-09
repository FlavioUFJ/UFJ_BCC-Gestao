/**
 * Testes das peças novas do backend: adaptador de respostas, autorização e
 * armazenamento de arquivos.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const apiAdapter = require('../src/middleware/api-adapter');
const auth = require('../src/middleware/auth');
const storage = require('../src/utils/storage');

function simular(headers = {}, session = {}) {
    const req = { headers: { ...headers }, session };
    const res = {
        statusCode: 200,
        corpo: null,
        status(codigo) { this.statusCode = codigo; return this; },
        json(corpo) { this.corpo = corpo; return this; }
    };
    return { req, res };
}

test('adaptador: requisição comum é tratada como JSON', () => {
    const { req, res } = simular({ accept: 'text/html' });
    apiAdapter(req, res, () => {});
    assert.match(req.headers.accept, /json/);
    assert.equal(req.headers['x-requested-with'], 'XMLHttpRequest');
});

test('adaptador: X-View-Data segue pelo ramo de página', () => {
    const { req, res } = simular({ accept: 'application/json', 'x-view-data': '1' });
    apiAdapter(req, res, () => {});
    assert.doesNotMatch(req.headers.accept, /json/);
    assert.equal(req.headers['x-requested-with'], undefined);
});

test('adaptador: res.render devolve os dados da view em JSON', () => {
    const { req, res } = simular();
    apiAdapter(req, res, () => {});
    res.render('plano-atividade-form', { title: 'x', layout: 'layout', currentPage: 'p', plano: { id: 7 } });
    assert.deepEqual(res.corpo, { success: true, data: { plano: { id: 7 } } });
});

test('adaptador: res.render("error") vira erro JSON com o status definido', () => {
    const { req, res } = simular();
    apiAdapter(req, res, () => {});
    res.status(404).render('error', { message: 'Plano não encontrado' });
    assert.equal(res.statusCode, 404);
    assert.deepEqual(res.corpo, { success: false, message: 'Plano não encontrado' });

    const outro = simular();
    apiAdapter(outro.req, outro.res, () => {});
    outro.res.render('error', { message: 'Falhou' });
    assert.equal(outro.res.statusCode, 500);
});

test('adaptador: res.redirect com ?error vira 400', () => {
    const { req, res } = simular();
    apiAdapter(req, res, () => {});
    res.redirect('/estagios?error=' + encodeURIComponent('Dados inválidos'));
    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.corpo, { success: false, message: 'Dados inválidos' });
});

test('adaptador: res.redirect com ?success vira sucesso com mensagem', () => {
    const { req, res } = simular({}, { user: { id_pessoa: 1 } });
    apiAdapter(req, res, () => {});
    res.redirect('/estagios/5?success=' + encodeURIComponent('Salvo'));
    assert.deepEqual(res.corpo, { success: true, redirect: '/estagios/5', message: 'Salvo' });
});

test('adaptador: redirecionar visitante ao login vira 401', () => {
    const { req, res } = simular();
    apiAdapter(req, res, () => {});
    res.redirect('/auth/login');
    assert.equal(res.statusCode, 401);
    assert.equal(res.corpo.code, 'NAO_AUTENTICADO');
});

test('autorização: requireAdmin', () => {
    let passou = false;
    const visitante = simular();
    auth.requireAdmin(visitante.req, visitante.res, () => { passou = true; });
    assert.equal(visitante.res.statusCode, 401);

    const comum = simular({}, { user: { nivelacesso: 'Estagiário' } });
    auth.requireAdmin(comum.req, comum.res, () => { passou = true; });
    assert.equal(comum.res.statusCode, 403);
    assert.equal(passou, false);

    const admin = simular({}, { user: { nivelacesso: 'Administrador' } });
    auth.requireAdmin(admin.req, admin.res, () => { passou = true; });
    assert.equal(passou, true);
});

test('autorização: requirePermissions', () => {
    const exige = auth.requirePermissions(['Estágio']);
    let passou = 0;

    const sem = simular({}, { user: { nivelacesso: 'Orientador', permissoes: [] } });
    exige(sem.req, sem.res, () => { passou++; });
    assert.equal(sem.res.statusCode, 403);

    const com = simular({}, { user: { nivelacesso: 'Orientador', permissoes: ['Estágio'] } });
    exige(com.req, com.res, () => { passou++; });

    const admin = simular({}, { user: { nivelacesso: 'Administrador', permissoes: [] } });
    exige(admin.req, admin.res, () => { passou++; });

    assert.equal(passou, 2);
});

test('armazenamento: caminho do banco não permite sair da pasta de uploads', () => {
    const base = path.join(storage.raiz(), 'planos-atividade');

    assert.equal(
        storage.resolver('planos-atividade', '/public/uploads/planos-atividade/joao_PlanoAtividade_assinado.pdf'),
        path.join(base, 'joao_PlanoAtividade_assinado.pdf')
    );
    assert.equal(
        storage.resolver('planos-atividade', '../../../../etc/passwd'),
        path.join(base, 'passwd')
    );
    assert.equal(
        storage.resolver('planos-atividade', '..\\..\\dadosConexaoSGDB.js'),
        path.join(base, 'dadosConexaoSGDB.js')
    );
    assert.equal(storage.resolver('planos-atividade', null), null);
    assert.equal(storage.resolver('planos-atividade', '/public/uploads/planos-atividade/..'), null);
    assert.equal(
        storage.caminhoParaBanco('planos-atividade', 'a.pdf'),
        '/public/uploads/planos-atividade/a.pdf'
    );
});

test('parâmetros sigilosos não chegam a quem não é administrador', () => {
    const corpo = {
        success: true,
        parametros: [
            { identificador: 'Conta e-mail', valores: { Senha: 'segredo' } },
            { identificador: 'CONTA E-MAIL ', valores: [{ identificadorvalor: 'Senha', valor: 'segredo' }] },
            { identificador: 'Apólice de Seguro', valores: { Numero: '123' } }
        ]
    };

    // Lista: os sigilosos são retirados, os demais permanecem
    const comum = simular({}, { user: { nivelacesso: 'Orientador' } });
    comum.req.query = {};
    auth.protegerParametrosRestritos(comum.req, comum.res, () => {});
    comum.res.json(corpo);
    assert.equal(JSON.stringify(comum.res.corpo).includes('segredo'), false);
    assert.equal(comum.res.corpo.parametros.length, 1);
    assert.equal(comum.res.corpo.parametros[0].identificador, 'Apólice de Seguro');

    // Valor específico: resposta vira 403
    const direto = simular({}, { user: { nivelacesso: 'Estagiário' } });
    auth.protegerParametrosRestritos(direto.req, direto.res, () => {});
    direto.res.json({ success: true, resultado: { identificador: 'Conta e-mail', identificadorvalor: 'Senha', valor: 'segredo' } });
    assert.equal(direto.res.statusCode, 403);
    assert.equal(JSON.stringify(direto.res.corpo).includes('segredo'), false);

    // Administrador recebe tudo
    const admin = simular({}, { user: { nivelacesso: 'Administrador' } });
    auth.protegerParametrosRestritos(admin.req, admin.res, () => {});
    admin.res.json(corpo);
    assert.equal(admin.res.corpo.parametros.length, 3);
});
