/**
 * Rotas de Autenticação (montadas em /api/auth)
 */

const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');

const authController = new AuthController();

// POST /auth/login - Autenticar
router.post('/login', (req, res) => authController.login(req, res));

// POST /auth/forgot-password - Solicitar recuperação de senha
router.post('/forgot-password', (req, res) => authController.forgotPassword(req, res));

// GET /auth/reset-password/:token - Verificar se o link de redefinição é válido
router.get('/reset-password/:token', (req, res) => authController.validateResetToken(req, res));

// POST /auth/reset-password/:token - Redefinir a senha
router.post('/reset-password/:token', (req, res) => authController.resetPassword(req, res));

module.exports = router;
