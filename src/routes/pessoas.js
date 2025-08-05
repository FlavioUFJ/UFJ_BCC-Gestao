/**
 * Rotas de Pessoas
 * Gerencia todas as operações relacionadas às pessoas/usuários
 */

const express = require('express');
const router = express.Router();
const PessoaController = require('../controllers/PessoaController');
const AuthController = require('../controllers/AuthController');
const { requireAuth, requireAdmin, requirePermissions } = require('../config/session');
const { enums } = require('../config');

// Instanciar controladores
const pessoaController = new PessoaController();
const authController = new AuthController();

// Middleware de autenticação para todas as rotas
router.use(requireAuth);

// ===== ROTAS DE INTERFACE (VIEWS) =====

// GET /pessoas - Listar pessoas (apenas admin)
router.get('/', requireAdmin, (req, res) => pessoaController.index(req, res));

// GET /pessoas/create - Formulário de criação (apenas admin)
router.get('/create', requireAdmin, (req, res) => pessoaController.create(req, res));

// GET /pessoas/profile - Perfil do usuário logado
router.get('/profile', (req, res) => pessoaController.profile(req, res));

// GET /pessoas/:id - Exibir detalhes da pessoa
router.get('/:id', (req, res) => pessoaController.show(req, res));

// GET /pessoas/:id/edit - Formulário de edição
router.get('/:id/edit', (req, res) => pessoaController.edit(req, res));

// ===== ROTAS DE AÇÕES (CRUD) =====

// POST /pessoas - Criar nova pessoa (apenas admin)
router.post('/', requireAdmin, (req, res) => pessoaController.store(req, res));

// PUT /pessoas/profile - Atualizar perfil do usuário logado
router.put('/profile', (req, res) => {
    req.params.id = req.session.user.id_pessoa;
    pessoaController.update(req, res);
});

// PUT /pessoas/:id - Atualizar pessoa
router.put('/:id', (req, res) => pessoaController.update(req, res));

// PATCH /pessoas/:id - Atualizar pessoa (método alternativo)
router.patch('/:id', (req, res) => pessoaController.update(req, res));

// ===== ROTAS DE AUTENTICAÇÃO E SEGURANÇA =====

// POST /pessoas/change-password - Alterar senha do usuário logado
router.post('/change-password', (req, res) => authController.changePassword(req, res));

// ===== ROTAS ADMINISTRATIVAS =====

// PATCH /pessoas/:id/status - Alterar status ativo/inativo (apenas admin)
router.patch('/:id/status', requireAdmin, (req, res) => pessoaController.toggleStatus(req, res));

// POST /pessoas/:id/login - Gerenciar login da pessoa (apenas admin)
router.post('/:id/login', requireAdmin, (req, res) => pessoaController.manageLogin(req, res));

// DELETE /pessoas/:id - Excluir pessoa (apenas admin)
router.delete('/:id', requireAdmin, (req, res) => pessoaController.destroy(req, res));

// ===== ROTAS DE API =====

// GET /pessoas/api/:tipo - Buscar pessoas por tipo
router.get('/api/:tipo', (req, res) => pessoaController.getByType(req, res));

module.exports = router;