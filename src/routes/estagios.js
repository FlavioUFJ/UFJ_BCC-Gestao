/**
 * Rotas de Estágios
 * Gerencia todas as operações relacionadas aos estágios
 */

const express = require('express');
const router = express.Router();
const EstagioController = require('../controllers/EstagioController');
const { requireAuth, requirePermissions } = require('../config/session');
const { enums } = require('../config');

// Instanciar controlador
const estagioController = new EstagioController();

// Middleware de autenticação para todas as rotas
router.use(requireAuth);

// GET /estagios - Listar estágios
router.get('/', (req, res) => estagioController.index(req, res));

// GET /estagios/create - Exibir formulário de criação
router.get('/create', 
    requirePermissions([enums.tipoAcesso.ADMINISTRADOR, enums.tipoAcesso.ORIENTADOR]),
    (req, res) => estagioController.create(req, res)
);

// POST /estagios - Criar novo estágio
router.post('/', 
    requirePermissions([enums.tipoAcesso.ADMINISTRADOR, enums.tipoAcesso.ORIENTADOR]),
    (req, res) => estagioController.store(req, res)
);

// GET /estagios/:id - Exibir detalhes do estágio
router.get('/:id', (req, res) => estagioController.show(req, res));

// GET /estagios/:id/edit - Exibir formulário de edição
router.get('/:id/edit', (req, res) => estagioController.edit(req, res));

// PUT /estagios/:id - Atualizar estágio
router.put('/:id', (req, res) => estagioController.update(req, res));

// PATCH /estagios/:id - Atualizar estágio (método alternativo)
router.patch('/:id', (req, res) => estagioController.update(req, res));

// PATCH /estagios/:id/status - Alterar status do estágio
router.patch('/:id/status', 
    requirePermissions([enums.tipoAcesso.ADMINISTRADOR, enums.tipoAcesso.ORIENTADOR]),
    (req, res) => estagioController.updateStatus(req, res)
);

// DELETE /estagios/:id - Excluir estágio
router.delete('/:id', 
    requirePermissions([enums.tipoAcesso.ADMINISTRADOR]),
    (req, res) => estagioController.destroy(req, res)
);

// API Routes
// GET /estagios/api/user/:userId/:userType - Buscar estágios por usuário
router.get('/api/user/:userId/:userType', (req, res) => estagioController.getByUser(req, res));

module.exports = router;