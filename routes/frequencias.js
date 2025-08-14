const express = require('express');
const router = express.Router();
const FrequenciaController = require('../controllers/FrequenciaController');
const { verificarAutenticacao } = require('../middleware/auth');

// Aplicar middleware de autenticação a todas as rotas
router.use(verificarAutenticacao);

// Rotas para frequências
router.get('/', FrequenciaController.listar);
router.get('/novo', FrequenciaController.criar);
router.post('/', FrequenciaController.salvar);
router.get('/:id', FrequenciaController.exibir);
router.get('/:id/editar', FrequenciaController.editar);
router.put('/:id', FrequenciaController.atualizar);
router.delete('/:id', FrequenciaController.excluir);
router.post('/:id/gerar-pdf', FrequenciaController.gerarPDF);
router.post('/:id/aprovar-estagiario', FrequenciaController.aprovarEstagiario);
router.post('/:id/aprovar-supervisor', FrequenciaController.aprovarSupervisor);
router.put('/:registroId/registro-diario', FrequenciaController.atualizarRegistroDiario);

module.exports = router;