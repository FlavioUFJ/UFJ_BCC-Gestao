/**
 * Rotas de Autenticação
 * Gerencia login, logout, registro e recuperação de senha
 */

const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const { requireAuth, requireGuest } = require('../config/session');

// Instanciar controlador
const authController = new AuthController();

// Rotas públicas (apenas para usuários não autenticados)
router.use(requireGuest);

// GET /auth/login - Exibir formulário de login
router.get('/login', (req, res) => authController.showLogin(req, res));

// POST /auth/login - Processar login
router.post('/login', (req, res) => authController.login(req, res));

// GET /auth/register - Exibir formulário de registro
router.get('/register', (req, res) => authController.showRegister(req, res));

// POST /auth/register - Processar registro
router.post('/register', (req, res) => authController.register(req, res));

// GET /auth/forgot-password - Exibir formulário de recuperação de senha
router.get('/forgot-password', (req, res) => authController.showForgotPassword(req, res));

// POST /auth/forgot-password - Processar recuperação de senha
router.post('/forgot-password', (req, res) => authController.forgotPassword(req, res));

// GET /auth/reset-password/:token - Exibir formulário de redefinição de senha
router.get('/reset-password/:token', (req, res) => authController.showResetPassword(req, res));

// POST /auth/reset-password/:token - Processar redefinição de senha
router.post('/reset-password/:token', (req, res) => authController.resetPassword(req, res));

module.exports = router;