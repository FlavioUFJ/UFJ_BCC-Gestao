/**
 * Rotas para o módulo de Frequência
 * Gerencia todas as rotas relacionadas às frequências de estágio
 */

const express = require('express');
const router = express.Router();
const FrequenciaController = require('../controllers/FrequenciaController');

// Instanciar o controller
const frequenciaController = new FrequenciaController();

// Middleware para verificar autenticação
const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
    }
    next();
};

// Aplicar middleware de autenticação a todas as rotas
router.use(requireAuth);

// Rotas CRUD para frequências

// GET /frequencias - Listar todas as frequências
router.get('/', async (req, res) => {
    await frequenciaController.listar(req, res);
});

// GET /frequencias/novo - Exibir formulário de criação
router.get('/novo', async (req, res) => {
    await frequenciaController.criar(req, res);
});

// POST /frequencias - Criar nova frequência
router.post('/', async (req, res) => {
    await frequenciaController.salvar(req, res);
});

// GET /frequencias/:id - Exibir detalhes de uma frequência
router.get('/:id', async (req, res) => {
    await frequenciaController.exibir(req, res);
});

// GET /frequencias/:id/editar - Exibir formulário de edição
router.get('/:id/editar', async (req, res) => {
    await frequenciaController.editar(req, res);
});

// PUT /frequencias/:id - Atualizar frequência
router.put('/:id', async (req, res) => {
    await frequenciaController.atualizar(req, res);
});

// DELETE /frequencias/:id - Excluir frequência
router.delete('/:id', async (req, res) => {
    await frequenciaController.excluir(req, res);
});

// Rotas específicas para registros diários

// POST /frequencias/:id/registros - Adicionar registro diário
router.post('/:id/registros', async (req, res) => {
    // TODO: Implementar método para adicionar registro diário
    res.status(501).json({ success: false, message: 'Método não implementado' });
});

// PUT /frequencias/:id/registros/:registro_id - Atualizar registro diário
router.put('/:id/registros/:registro_id', async (req, res) => {
    // TODO: Implementar método para atualizar registro diário
    res.status(501).json({ success: false, message: 'Método não implementado' });
});

// DELETE /frequencias/:id/registros/:registro_id - Excluir registro diário
router.delete('/:id/registros/:registro_id', async (req, res) => {
    // TODO: Implementar método para excluir registro diário
    res.status(501).json({ success: false, message: 'Método não implementado' });
});

// GET /frequencias/:id/gerar-pdf - Gerar PDF da frequência
router.get('/:id/gerar-pdf', async (req, res) => {
    await frequenciaController.gerarPDF(req, res);
});

// Rotas para aprovações

// POST /frequencias/:id/aprovar-estagiario - Aprovar como estagiário
router.post('/:id/aprovar-estagiario', async (req, res) => {
    await frequenciaController.aprovarEstagiario(req, res);
});

// POST /frequencias/:id/aprovar-orientador - Aprovar como orientador
router.post('/:id/aprovar-orientador', async (req, res) => {
    await frequenciaController.aprovarOrientador(req, res);
});

// POST /frequencias/:id/aprovar-supervisor - Aprovar como supervisor
router.post('/:id/aprovar-supervisor', async (req, res) => {
    await frequenciaController.aprovarSupervisor(req, res);
});

// GET /frequencias/lancamento-diario/:id - Exibir formulário de lançamento diário
router.get('/lancamento-diario/:id', async (req, res) => {
    await frequenciaController.lancamentoDiario(req, res);
});

// POST /frequencias/lancamento-diario - Salvar lançamento diário
router.post('/lancamento-diario', async (req, res) => {
    await frequenciaController.salvarLancamentoDiario(req, res);
});

module.exports = router;