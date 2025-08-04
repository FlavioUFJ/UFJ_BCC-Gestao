/**
 * Arquivo principal de rotas
 * Centraliza e organiza todas as rotas do sistema
 */

const express = require('express');
const router = express.Router();
const EstagioController = require('../controllers/EstagioController');
const AuthController = require('../controllers/AuthController');
const { requireAuth } = require('../config/session');

// Instanciar controladores
const estagioController = new EstagioController();
const authController = new AuthController();

// Importar rotas modulares
const authRoutes = require('./auth');
const estagiosRoutes = require('./estagios');
const pessoasRoutes = require('./pessoas');

// Rota principal - Dashboard
router.get('/', requireAuth, (req, res) => estagioController.dashboard(req, res));

// Rota de logout (disponível em qualquer lugar)
router.post('/logout', (req, res) => authController.logout(req, res));
router.get('/logout', (req, res) => authController.logout(req, res));

// Rota para verificar status da sessão (AJAX)
router.get('/session-status', (req, res) => authController.checkSession(req, res));

// Usar rotas modulares
router.use('/auth', authRoutes);
router.use('/estagios', estagiosRoutes);
router.use('/pessoas', pessoasRoutes);

// Rota para arquivos estáticos protegidos (uploads, relatórios, etc.)
router.get('/files/:type/:filename', requireAuth, (req, res) => {
    const { type, filename } = req.params;
    const path = require('path');
    const fs = require('fs');
    const { uploads } = require('../config');
    
    try {
        let filePath;
        
        switch (type) {
            case 'uploads':
                filePath = path.join(uploads.destination, filename);
                break;
            case 'reports':
                filePath = path.join(uploads.reportsDestination, filename);
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Tipo de arquivo inválido'
                });
        }
        
        // Verificar se arquivo existe
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'Arquivo não encontrado'
            });
        }
        
        // Verificar permissões de acesso ao arquivo
        // TODO: Implementar verificação de permissões baseada no usuário
        
        // Servir arquivo
        res.sendFile(path.resolve(filePath));
    } catch (error) {
        console.error('Erro ao servir arquivo:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para relatórios
router.get('/reports', requireAuth, (req, res) => {
    // TODO: Implementar geração de relatórios
    res.render('reports/index', {
        title: 'Relatórios',
        user: req.session.user,
        currentPage: 'reports'
    });
});

// Rota para configurações (apenas admin)
router.get('/settings', requireAuth, (req, res) => {
    const { requireAdmin } = require('../config/session');
    
    // Verificar se é admin
    if (req.session.user.tipoacesso !== require('../config').enums.tipoAcesso.ADMINISTRADOR) {
        return res.status(403).render('error', {
            title: 'Acesso Negado',
            message: 'Você não tem permissão para acessar esta página',
            error: { status: 403 }
        });
    }
    
    // TODO: Implementar página de configurações
    res.render('settings/index', {
        title: 'Configurações',
        user: req.session.user,
        currentPage: 'settings'
    });
});

// Rota para API de busca geral
router.get('/api/search', requireAuth, async (req, res) => {
    try {
        const { q, type } = req.query;
        
        if (!q || q.length < 2) {
            return res.json({
                success: true,
                data: []
            });
        }
        
        const results = [];
        
        // Buscar em diferentes entidades baseado no tipo
        switch (type) {
            case 'pessoas':
                const Pessoa = require('../models/Pessoa');
                const pessoaModel = new Pessoa();
                const pessoas = await pessoaModel.findAll({
                    search: q,
                    limit: 10
                });
                results.push(...pessoas.data.map(p => ({
                    id: p.id_pessoa,
                    text: p.nome,
                    email: p.email,
                    type: 'pessoa'
                })));
                break;
                
            case 'estagios':
                const Estagio = require('../models/Estagio');
                const estagioModel = new Estagio();
                const estagios = await estagioModel.findAll({
                    search: q,
                    limit: 10
                });
                results.push(...estagios.data.map(e => ({
                    id: e.id_campo_estagio,
                    text: `${e.nome_estagiario} - ${e.nome_empresa}`,
                    type: 'estagio'
                })));
                break;
                
            default:
                // Busca geral em todas as entidades
                // TODO: Implementar busca geral
                break;
        }
        
        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('Erro na busca:', error);
        res.status(500).json({
            success: false,
            message: 'Erro na busca'
        });
    }
});

// Middleware para capturar rotas não encontradas
router.use('*', (req, res) => {
    res.status(404).render('error', {
        title: 'Página não encontrada',
        message: 'A página que você está procurando não existe',
        error: { status: 404 }
    });
});

// Middleware de tratamento de erros
router.use((error, req, res, next) => {
    console.error('Erro na aplicação:', error);
    
    // Para requisições AJAX
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
        return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
    
    res.status(500).render('error', {
        title: 'Erro interno',
        message: 'Ocorreu um erro interno no servidor',
        error: { status: 500 }
    });
});

module.exports = router;