/**
 * Rotas de Autenticação
 * Gerencia login, registro, recuperação de senha e outras operações de autenticação
 */

const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const { requireAuth, requireGuest } = require('../config/session');

// Instanciar controlador
const authController = new AuthController();

// ===== ROTAS PÚBLICAS (SEM AUTENTICAÇÃO) =====

// ===== LOGIN =====

// GET /auth/login - Formulário de login (apenas para usuários não autenticados)
router.get('/login', requireGuest, (req, res) => authController.showLogin(req, res));

// POST /auth/login - Processar login (permite usuários já autenticados)
router.post('/login', (req, res) => authController.login(req, res));

// ===== REGISTRO =====

// GET /auth/register - Formulário de registro
router.get('/register', requireGuest, (req, res) => authController.showRegister(req, res));

// POST /auth/register - Processar registro
router.post('/register', requireGuest, (req, res) => authController.register(req, res));

// ===== RECUPERAÇÃO DE SENHA =====

// GET /auth/forgot-password - Formulário de recuperação de senha
router.get('/forgot-password', requireGuest, (req, res) => authController.showForgotPassword(req, res));

// POST /auth/forgot-password - Processar solicitação de recuperação
router.post('/forgot-password', requireGuest, (req, res) => authController.forgotPassword(req, res));

// GET /auth/reset-password/:token - Formulário de redefinição de senha
router.get('/reset-password/:token', requireGuest, (req, res, next) => {
    // Desabilitar completamente o express-ejs-layouts para esta rota
    const originalRender = res.render;
    res.render = function(view, options, callback) {
        // Renderizar diretamente sem layout
        const app = req.app;
        const engine = app.get('view engine');
        const viewsPath = app.get('views');
        const ejs = require('ejs');
        const path = require('path');
        
        const viewPath = path.join(viewsPath, view + '.' + engine);
        const fs = require('fs');
        
        try {
            const template = fs.readFileSync(viewPath, 'utf8');
            const html = ejs.render(template, options || {});
            res.send(html);
        } catch (error) {
            if (callback) callback(error);
            else next(error);
        }
    };
    
    authController.showResetPassword(req, res);
});

// POST /auth/reset-password/:token - Processar redefinição de senha
router.post('/reset-password/:token', requireGuest, (req, res) => authController.resetPassword(req, res));

// ===== ROTA DE TESTE =====
// GET /test-form - Página de teste
router.get('/test-form', (req, res) => {
    res.render('test-form', {
        title: 'Teste de Formulário',
        layout: false
    });
});

// POST /test-form - Processar teste
router.post('/test-form', (req, res) => {
    console.log('Dados recebidos no teste:', req.body);
    res.json({
        success: true,
        message: 'Formulário de teste funcionando!',
        data: req.body
    });
});

// Rota de teste para login simples
router.get('/simple-login', (req, res) => {
    res.render('simple-login', {
        title: 'Login Simples - Teste',
        layout: 'layout'
    });
});

// Rota de teste para processar login simples
router.post('/test-login', (req, res) => {
    console.log('=== TESTE LOGIN - Dados recebidos ===');
    console.log('Body:', req.body);
    console.log('Headers:', req.headers);
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('=====================================');
    
    res.json({ 
        success: true, 
        message: 'Rota de teste do login funcionou!', 
        data: req.body 
    });
});

module.exports = router;