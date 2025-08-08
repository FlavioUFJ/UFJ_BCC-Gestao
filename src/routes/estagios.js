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

// ===== ROTAS DE INTERFACE (VIEWS) =====

// GET /estagios - Listar estágios
router.get('/', (req, res) => estagioController.index(req, res));

// GET /estagios/dashboard - Dashboard do módulo Estágio
router.get('/dashboard', (req, res) => estagioController.estagioModuleDashboard(req, res));

// GET /estagios/create - Formulário de criação (admin/orientador)
router.get('/create', 
    requirePermissions([enums.nivelAcesso.ADMINISTRADOR, enums.nivelAcesso.ORIENTADOR]),
    (req, res) => estagioController.create(req, res)
);

// GET /estagios/:id - Exibir detalhes do estágio
router.get('/:id', (req, res) => estagioController.show(req, res));

// GET /estagios/:id/edit - Formulário de edição
router.get('/:id/edit', (req, res) => estagioController.edit(req, res));

// ===== ROTAS DE AÇÕES (CRUD) =====

// POST /estagios - Criar novo estágio (admin/orientador)
router.post('/', 
    requirePermissions([enums.nivelAcesso.ADMINISTRADOR, enums.nivelAcesso.ORIENTADOR]),
    (req, res) => estagioController.store(req, res)
);

// PUT /estagios/:id - Atualizar estágio
router.put('/:id', (req, res) => estagioController.update(req, res));

// PATCH /estagios/:id - Atualizar estágio (método alternativo)
router.patch('/:id', (req, res) => estagioController.update(req, res));

// PATCH /estagios/:id/status - Alterar status do estágio (admin/orientador)
router.patch('/:id/status', 
    requirePermissions([enums.nivelAcesso.ADMINISTRADOR, enums.nivelAcesso.ORIENTADOR]),
    (req, res) => estagioController.updateStatus(req, res)
);

// DELETE /estagios/:id - Excluir estágio (apenas admin)
router.delete('/:id', 
    requirePermissions([enums.nivelAcesso.ADMINISTRADOR]),
    (req, res) => estagioController.destroy(req, res)
);

// ===== ROTAS DE API =====

// GET /estagios/api/user/:userId/:userType - Buscar estágios por usuário
router.get('/api/user/:userId/:userType', (req, res) => estagioController.getByUser(req, res));

module.exports = router;