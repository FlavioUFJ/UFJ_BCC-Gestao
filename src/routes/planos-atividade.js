/**
 * Rotas de Planos de Atividade
 * Gerencia todas as operações relacionadas aos planos de atividade dos estágios
 */

const express = require('express');
const router = express.Router();
const PlanoAtividadeController = require('../controllers/PlanoAtividadeController');
const { requireAuth, requirePermissions } = require('../config/session');
const { enums } = require('../config');

// Instanciar controlador
const planoAtividadeController = new PlanoAtividadeController();

// Middleware de autenticação para todas as rotas
router.use(requireAuth);

// ===== ROTAS DE INTERFACE (VIEWS) =====

// GET /planos-atividade - Listar planos de atividade
router.get('/', (req, res) => planoAtividadeController.index(req, res));

// GET /planos-atividade/create - Formulário de criação
router.get('/create', (req, res) => planoAtividadeController.create(req, res));

// GET /planos-atividade/:id - Exibir detalhes do plano
router.get('/:id', (req, res) => planoAtividadeController.show(req, res));

// GET /planos-atividade/:id/edit - Formulário de edição
router.get('/:id/edit', (req, res) => planoAtividadeController.edit(req, res));

// ===== ROTAS DE AÇÕES (CRUD) =====

// POST /planos-atividade - Criar novo plano de atividade
router.post('/', (req, res) => planoAtividadeController.store(req, res));

// PUT /planos-atividade/:id - Atualizar plano de atividade
router.put('/:id', (req, res) => planoAtividadeController.update(req, res));

// ===== ROTAS DE FUNCIONALIDADES ESPECÍFICAS =====

// GET /planos-atividade/:id/pdf - Gerar PDF do plano
router.get('/:id/pdf', (req, res) => planoAtividadeController.gerarPDF(req, res));

// POST /planos-atividade/anexar-documento - Anexar documento PDF ao plano
router.post('/anexar-documento', (req, res) => planoAtividadeController.anexarDocumento(req, res));

module.exports = router;