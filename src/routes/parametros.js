/**
 * Rotas de Parâmetros
 * Gerencia todas as operações relacionadas aos parâmetros do sistema
 */

const express = require('express');
const router = express.Router();
const ParametroController = require('../controllers/ParametroController');
const { requireAuth, requireAdmin } = require('../config/session');
const ValidationMiddleware = require('../middleware/validation');
const debugParametroMiddleware = require('../../middleware/parametro-debug');

// Criar middlewares de validação específicos para parâmetros
const validateParametro = (req, res, next) => {
    const { identificador, descricao, quantidadevalor } = req.body;
    const errors = [];

    // Validar identificador
    if (!identificador || identificador.trim().length < 3) {
        errors.push('Identificador deve ter pelo menos 3 caracteres');
    }
    if (identificador && identificador.length > 200) {
        errors.push('Identificador deve ter no máximo 200 caracteres');
    }

    // Validar descrição
    if (!descricao || descricao.trim().length < 5) {
        errors.push('Descrição deve ter pelo menos 5 caracteres');
    }
    if (descricao && descricao.length > 500) {
        errors.push('Descrição deve ter no máximo 500 caracteres');
    }

    // Validar quantidade de valores
    if (quantidadevalor) {
        const qtd = parseInt(quantidadevalor);
        if (isNaN(qtd) || qtd < 1 || qtd > 20) {
            errors.push('Quantidade de valores deve ser entre 1 e 20');
        }
    }

    if (errors.length > 0) {
        return ValidationMiddleware.handleValidationErrors(req, res, errors);
    }

    next();
};

const validateValor = (req, res, next) => {
    const { identificadorvalor } = req.body;
    const errors = [];

    // Validar identificador do valor
    if (!identificadorvalor || identificadorvalor.trim().length < 1) {
        errors.push('Identificador do valor é obrigatório');
    }
    if (identificadorvalor && identificadorvalor.length > 200) {
        errors.push('Identificador do valor deve ter no máximo 200 caracteres');
    }

    if (errors.length > 0) {
        return ValidationMiddleware.handleValidationErrors(req, res, errors);
    }

    next();
};

// Instanciar controlador
const parametroController = new ParametroController();

// ===== ROTAS PÚBLICAS (SEM AUTENTICAÇÃO) =====

// GET /parametros/buscar - Buscar parâmetros (usado pelo frontend)
router.get('/buscar', debugParametroMiddleware, (req, res) => parametroController.buscar(req, res));

// GET /parametros/buscar-valor - Buscar valor específico de um parâmetro
router.get('/buscar-valor', debugParametroMiddleware, (req, res) => parametroController.buscarValorEspecifico(req, res));

// Middleware de autenticação para todas as rotas protegidas
router.use(requireAuth);

// GET /parametros - Listar parâmetros
router.get('/', (req, res) => parametroController.index(req, res));

// GET /parametros/create - Formulário de criação (apenas admin)
router.get('/create', requireAdmin, (req, res) => parametroController.create(req, res));

// GET /parametros/:id - Exibir detalhes do parâmetro
router.get('/:id', (req, res) => parametroController.show(req, res));

// GET /parametros/:id/edit - Formulário de edição (apenas admin)
router.get('/:id/edit', requireAdmin, (req, res) => parametroController.edit(req, res));

// POST /parametros - Criar parâmetro (apenas admin)
router.post('/', requireAdmin, validateParametro, (req, res) => parametroController.store(req, res));

// PUT /parametros/:id - Atualizar parâmetro (apenas admin)
router.put('/:id', requireAdmin, validateParametro, (req, res) => parametroController.update(req, res));

// PATCH /parametros/:id - Atualizar parâmetro (método alternativo, apenas admin)
router.patch('/:id', requireAdmin, validateParametro, (req, res) => parametroController.update(req, res));

// DELETE /parametros/:id - Excluir parâmetro (apenas admin)
router.delete('/:id', requireAdmin, (req, res) => parametroController.destroy(req, res));

// ===== ROTAS DE VALORES DE PARÂMETROS =====

// POST /parametros/:parametroId/valores - Criar valor (apenas admin)
router.post('/:parametroId/valores', requireAdmin, validateValor, (req, res) => parametroController.storeValor(req, res));

// PUT /parametros/:parametroId/valores/:valorId - Atualizar valor (apenas admin)
router.put('/:parametroId/valores/:valorId', requireAdmin, validateValor, (req, res) => parametroController.updateValor(req, res));

// DELETE /parametros/:parametroId/valores/:valorId - Excluir valor (apenas admin)
router.delete('/:parametroId/valores/:valorId', requireAdmin, (req, res) => parametroController.destroyValor(req, res));

// ===== ROTAS DE API (PROTEGIDAS) =====

module.exports = router;