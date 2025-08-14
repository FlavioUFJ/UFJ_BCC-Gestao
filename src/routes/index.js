/**
 * Arquivo principal de rotas
 * Centraliza e organiza todas as rotas do sistema
 */

const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const EstagioController = require('../controllers/EstagioController');
const { requireAuth } = require('../config/session');

// Instanciar controladores
const authController = new AuthController();
const estagioController = new EstagioController();

// Importar rotas modulares
const authRoutes = require('./auth');
const estagiosRoutes = require('./estagios');
const pessoasRoutes = require('./pessoas');
const parametroRoutes = require('./parametros');
const planosAtividadeRoutes = require('./planos-atividade');
const frequenciasRoutes = require('./frequencias');

// ===== ROTAS PRINCIPAIS =====

// Rota principal - Dashboard
router.get('/', requireAuth, (req, res) => estagioController.dashboard(req, res));

// Rota específica para dashboard
router.get('/dashboard', requireAuth, (req, res) => estagioController.dashboard(req, res));

// Rota de logout (disponível em qualquer lugar)
router.post('/logout', (req, res) => authController.logout(req, res));
router.get('/logout', (req, res) => authController.logout(req, res));

// Rota para verificar status da sessão (AJAX)
router.get('/session-status', (req, res) => authController.checkSession(req, res));

// Rota de redirecionamento para login
router.get('/login', (req, res) => res.redirect('/auth/login'));

// Rota para alterar senha
router.get('/alterar-senha', requireAuth, (req, res) => authController.showChangePassword(req, res));
router.post('/alterar-senha', requireAuth, (req, res) => authController.changePassword(req, res));

// ===== ROTAS MODULARES =====

// Rotas de autenticação (públicas)
router.use('/auth', authRoutes);

// Rotas de recursos (protegidas)
router.use('/estagios', estagiosRoutes);
router.use('/pessoas', pessoasRoutes);
// router.use('/secure/pessoas', pessoasRoutes); // Removido - conflitava com rotas em secure-routes.js
router.use('/parametro', parametroRoutes);
router.use('/admin/parametro', parametroRoutes);
router.use('/planos-atividade', planosAtividadeRoutes);
router.use('/frequencias', frequenciasRoutes);

// ===== ROTAS DE ARQUIVOS ESTÁTICOS =====

// Rota para arquivos estáticos protegidos (uploads, relatórios, etc.)
router.get('/files/:type/:filename', requireAuth, (req, res) => {
    const path = require('path');
    const fs = require('fs');
    
    const { type, filename } = req.params;
    const allowedTypes = ['uploads', 'reports'];
    
    if (!allowedTypes.includes(type)) {
        return res.status(404).json({ success: false, message: 'Tipo de arquivo não permitido' });
    }
    
    const filePath = path.join(__dirname, '../../public', type, filename);
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, message: 'Arquivo não encontrado' });
    }
    
    // Servir o arquivo
    res.sendFile(filePath);
});

// ===== ROTAS DE RELATÓRIOS =====

// Rota para relatórios
router.get('/reports', requireAuth, (req, res) => {
    // TODO: Implementar geração de relatórios
    res.render('reports/index', {
        title: 'Relatórios',
        user: req.session.user,
        currentPage: 'reports'
    });
});

// Rota para relatórios específicos
router.get('/reports/:filename', requireAuth, (req, res) => {
    const path = require('path');
    const fs = require('fs');
    
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../../public/reports', filename);
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, message: 'Relatório não encontrado' });
    }
    
    // Servir o arquivo
    res.sendFile(filePath);
});

// ===== ROTAS DE CONFIGURAÇÕES =====

// Rota para rotinas administrativas (apenas admin)
router.get('/admin/rotinas', requireAuth, (req, res) => {
    // Verificar se é admin
    if (req.session.user.nivelacesso !== 'Administrador') {
        return res.status(403).json({
            success: false,
            message: 'Acesso negado'
        });
    }
    
    res.render('admin-rotinas', {
        title: 'Rotinas Administrativas',
        user: req.session.user,
        currentPage: 'admin-rotinas',
        origem: req.query.origem || '/dashboard'
    });
});

// Rota para gerenciamento de pessoas (apenas admin)
router.get('/admin/pessoas', requireAuth, (req, res) => {
    // Verificar se é admin
    if (req.session.user.nivelacesso !== 'Administrador') {
        return res.status(403).json({
            success: false,
            message: 'Acesso negado'
        });
    }
    
    res.render('admin-pessoas', {
        title: 'Gerenciamento de Pessoas',
        user: req.session.user,
        currentPage: 'admin-pessoas',
        origem: req.query.origem || '/dashboard'
    });
});

// Rota para nova pessoa (apenas admin)
router.get('/admin/pessoa/novo', requireAuth, (req, res) => {
    // Verificar se é admin
    if (req.session.user.nivelacesso !== 'Administrador') {
        return res.status(403).json({
            success: false,
            message: 'Acesso negado'
        });
    }
    
    res.render('admin-pessoa-form', {
        title: 'Nova Pessoa',
        user: req.session.user,
        currentPage: 'admin-pessoas',
        pessoa: null,
        isEdit: false,
        origem: req.query.origem || '/admin/pessoas'
    });
});

// Rota para editar pessoa (apenas admin)
router.get('/admin/pessoa/editar/:id', requireAuth, async (req, res) => {
    // Verificar se é admin
    if (req.session.user.nivelacesso !== 'Administrador') {
        return res.status(403).json({
            success: false,
            message: 'Acesso negado'
        });
    }
    
    try {
        const PessoaController = require('../controllers/PessoaController');
        const pessoaController = new PessoaController();
        
        // Buscar dados da pessoa
        const mockReq = { 
            params: { id: req.params.id },
            headers: { accept: 'application/json' },
            xhr: true
        };
        const mockRes = {
            json: (data) => {
                if (data.success) {
                    res.render('admin-pessoa-form', {
                        title: 'Editar Pessoa',
                        user: req.session.user,
                        currentPage: 'admin-pessoas',
                        pessoa: data.data,
                        isEdit: true,
                        origem: req.query.origem || '/admin/pessoas'
                    });
                } else {
                    res.status(404).render('error', {
                        title: 'Pessoa não encontrada',
                        message: 'A pessoa solicitada não foi encontrada.',
                        user: req.session.user
                    });
                }
            }
        };
        
        await pessoaController.show(mockReq, mockRes);
     } catch (error) {
         console.error('Erro ao carregar pessoa:', error);
         res.status(500).render('error', {
             title: 'Erro interno',
             message: 'Erro ao carregar dados da pessoa.',
             user: req.session.user
         });
     }
 });

// ===== ROTAS DE API =====

// Rota API para planos de atividade foi removida - tabela campo_estagio_planoatividade não existe mais

// Rota API para importar pessoas
router.post('/api/pessoas/importar', requireAuth, async (req, res) => {
    try {
        const { pessoas } = req.body;
        
        if (!pessoas || !Array.isArray(pessoas)) {
            return res.status(400).json({
                success: false,
                message: 'Dados de pessoas inválidos'
            });
        }
        
        const PessoaController = require('../controllers/PessoaController');
        const pessoaController = new PessoaController();
        
        const resultados = {
            sucessos: 0,
            erros: 0,
            detalhes: []
        };
        
        // Processar cada pessoa com delay para evitar congelamento
        for (let i = 0; i < pessoas.length; i++) {
            // Adicionar pequeno delay a cada 10 pessoas para evitar congelamento
            if (i > 0 && i % 10 === 0) {
                await new Promise(resolve => setTimeout(resolve, 10));
            }
            const pessoaData = pessoas[i];
            
            try {
                // Limpar máscaras de formatação antes de salvar
                if (pessoaData.telefone) {
                    pessoaData.telefone = pessoaData.telefone.replace(/\D/g, '');
                }
                
                if (pessoaData.cnpj_cpf) {
                    pessoaData.cnpj_cpf = pessoaData.cnpj_cpf.replace(/\D/g, '');
                }
                
                // Mapear campos do CSV para campos do modelo
                const dadosFormatados = {
                    nome: pessoaData.nome,
                    email: pessoaData.email,
                    telefone: pessoaData.telefone,
                    cnpj_cpf: pessoaData.cnpj_cpf,
                    tipo: pessoaData.tipo,
                    categoria: pessoaData.categoria,
                    nivelacesso: pessoaData.categoria, // Mapear categoria para nivelacesso
                    ativo: true
                };
                
                // Criar requisição simulada para o controller
                const mockReq = {
                    body: dadosFormatados,
                    session: req.session,
                    xhr: true,
                    headers: { accept: 'application/json' }
                };
                
                const mockRes = {
                    json: (data) => {
                        if (data.success) {
                            resultados.sucessos++;
                            resultados.detalhes.push({
                                linha: i + 1,
                                nome: pessoaData.nome,
                                status: 'sucesso'
                            });
                        } else {
                            resultados.erros++;
                            resultados.detalhes.push({
                                linha: i + 1,
                                nome: pessoaData.nome,
                                status: 'erro',
                                erro: data.message
                            });
                        }
                    },
                    status: () => mockRes
                };
                
                // Chamar o método store do controller
                await pessoaController.store(mockReq, mockRes);
                
            } catch (error) {
                resultados.erros++;
                resultados.detalhes.push({
                    linha: i + 1,
                    nome: pessoaData.nome || 'Nome não informado',
                    status: 'erro',
                    erro: error.message
                });
            }
        }
        
        res.json({
            success: true,
            message: `Importação concluída: ${resultados.sucessos} sucessos, ${resultados.erros} erros`,
            resultados
        });
        
    } catch (error) {
        console.error('Erro na importação de pessoas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor: ' + error.message
        });
    }
});

// Rota API para buscar pessoas
router.get('/api/pessoas/buscar', requireAuth, async (req, res) => {
    try {
        const { termo, categoria, pagina = 1, limite = 25 } = req.query;
        const databaseConfig = require('../config/database');
        
        // Construir query SQL
        let whereClause = 'WHERE 1=1';
        let params = [];
        
        // Filtro por termo de busca
        if (termo && termo.trim() !== '') {
            whereClause += ' AND (p.nome LIKE ? OR p.email LIKE ?)';
            params.push(`%${termo.trim()}%`, `%${termo.trim()}%`);
        }
        
        // Filtro por categoria (suporta múltiplas categorias separadas por vírgula)
        if (categoria && categoria !== 'todos' && categoria.trim() !== '') {
            // Como pessoas podem ter múltiplas categorias (ex: "1,3,5"), usar LIKE para buscar
            whereClause += ' AND p.categoria LIKE ?';
            params.push(`%${categoria.trim()}%`);
        }
        
        // Contar total de registros
        const countQuery = `SELECT COUNT(*) as total FROM pessoa p ${whereClause}`;
        const countResult = await databaseConfig.get(countQuery, params);
        const total = countResult.total;
        
        // Buscar pessoas com paginação
        const offset = (parseInt(pagina) - 1) * parseInt(limite);
        const query = `
            SELECT p.id_pessoa, p.nome, p.email, p.telefone, p.categoria, p.cnpj_cpf
            FROM pessoa p 
            ${whereClause}
            ORDER BY p.nome
            LIMIT ? OFFSET ?
        `;
        params.push(parseInt(limite), offset);
        
        const pessoas = await databaseConfig.all(query, params);
        
        res.json({
            success: true,
            pessoas: pessoas,
            total: total,
            pagina: parseInt(pagina),
            totalPaginas: Math.ceil(total / parseInt(limite))
        });
    } catch (error) {
        console.error('Erro ao buscar pessoas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar pessoas: ' + error.message
        });
    }
});

// Rota API para buscar pessoa por ID
router.get('/api/pessoas/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const databaseConfig = require('../config/database');
        
        const query = `
            SELECT p.id_pessoa, p.nome, p.email, p.telefone, p.categoria, p.cnpj_cpf, p.tipo
            FROM pessoa p 
            WHERE p.id_pessoa = ?
        `;
        
        const pessoa = await databaseConfig.get(query, [id]);
        
        if (!pessoa) {
            return res.status(404).json({
                success: false,
                message: 'Pessoa não encontrada'
            });
        }
        
        res.json({
            success: true,
            pessoa: pessoa
        });
    } catch (error) {
        console.error('Erro ao buscar pessoa:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar pessoa: ' + error.message
        });
    }
});

// Rota API para atualizar pessoa por ID
router.put('/api/pessoas/:id', requireAuth, async (req, res) => {
    try {
        const PessoaController = require('../controllers/PessoaController');
        const pessoaController = new PessoaController();
        
        // Chamar o método update do controller
        await pessoaController.update(req, res);
    } catch (error) {
        console.error('Erro ao atualizar pessoa:', error);
        
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Erro ao atualizar pessoa: ' + error.message
            });
        }
    }
});

// Rota para configurações (apenas admin)
router.get('/settings', requireAuth, (req, res) => {
    const { requireAdmin } = require('../config/session');
    
    // Verificar se é admin
    if (req.session.user.nivelacesso !== require('../config').enums.nivelAcesso.ADMINISTRADOR) {
        return res.status(403).json({
            success: false,
            message: 'Acesso negado'
        });
    }
    
    // TODO: Implementar página de configurações
    res.render('settings/index', {
        title: 'Configurações',
        user: req.session.user,
        currentPage: 'settings'
    });
});

// ===== ROTAS DE API =====

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
                
            case 'estagio':
                // Removido - Campo de Estágio
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

// ===== ROTAS ADMINISTRATIVAS =====

// Rota para listar todos os usuários (para admin)
router.get('/admin/usuarios', requireAuth, async (req, res) => {
    try {
        // Verificar se é admin
        if (req.session.user.nivelacesso !== 'Administrador') {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado'
            });
        }

        const databaseConfig = require('../config/database');
        
        const query = `
            SELECT 
                p.id_pessoa,
                p.nome,
                p.email,
                p.categoria,
                pl.nivelacesso,
                pl.status,
                pl.dataultimaatualizacao
            FROM pessoa p
            INNER JOIN pessoa_login pl ON p.id_pessoa = pl.id_pessoa
            ORDER BY p.nome
        `;
        
        databaseConfig.all(query, [])
            .then(usuarios => {
                res.json(usuarios);
            })
            .catch(err => {
                console.error('Erro ao buscar usuários:', err);
                res.status(500).json({ success: false, message: 'Erro ao buscar usuários' });
            });
        
    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Rota para buscar usuários por termo
router.get('/admin/buscar-usuarios', requireAuth, async (req, res) => {
    try {
        // Verificar se é admin
        if (req.session.user.nivelacesso !== 'Administrador') {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado'
            });
        }

        const { termo } = req.query;
        const databaseConfig = require('../config/database');
        
        const query = `
            SELECT 
                p.id_pessoa,
                p.nome,
                p.email,
                p.categoria,
                pl.nivelacesso,
                pl.status
            FROM pessoa p
            INNER JOIN pessoa_login pl ON p.id_pessoa = pl.id_pessoa
            WHERE (p.nome LIKE ? OR p.email LIKE ?)
            ORDER BY p.nome
            LIMIT 10
        `;
        
        const params = [`%${termo}%`, `%${termo}%`];
        
        databaseConfig.all(query, params)
            .then(usuarios => {
                res.json(usuarios);
            })
            .catch(err => {
                console.error('Erro ao buscar usuários:', err);
                res.status(500).json({ success: false, message: 'Erro ao buscar usuários' });
            });
        
    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Rota para listar todos os usuários (sem filtros)
router.get('/admin/todos-usuarios', requireAuth, async (req, res) => {
    try {
        // Verificar se é admin
        if (req.session.user.nivelacesso !== 'Administrador') {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado'
            });
        }

        const databaseConfig = require('../config/database');
        
        const query = `
            SELECT 
                p.id_pessoa,
                p.nome,
                p.email,
                p.categoria,
                pl.tipoacesso,
                pl.status,
                pl.dataultimaatualizacao
            FROM pessoa p
            INNER JOIN pessoa_login pl ON p.id_pessoa = pl.id_pessoa
            ORDER BY p.nome
        `;
        
        databaseConfig.all(query, [])
            .then(usuarios => {
                res.json(usuarios);
            })
            .catch(err => {
                console.error('Erro ao buscar todos os usuários:', err);
                res.status(500).json({ success: false, message: 'Erro ao buscar usuários' });
            });
        
    } catch (error) {
        console.error('Erro ao buscar todos os usuários:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Rota para buscar pessoas sem login
router.get('/admin/pessoas-sem-login', requireAuth, async (req, res) => {
    try {
        // Verificar se é admin
        if (req.session.user.nivelacesso !== 'Administrador') {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado'
            });
        }

        const { busca } = req.query;
        const databaseConfig = require('../config/database');
        
        let query = `
            SELECT 
                p.id_pessoa,
                p.nome,
                p.email,
                p.categoria
            FROM pessoa p
            LEFT JOIN pessoa_login pl ON p.id_pessoa = pl.id_pessoa
            WHERE pl.id_pessoa IS NULL
        `;
        
        let params = [];
        
        if (busca && busca.trim() !== '') {
            query += ' AND (p.nome LIKE ? OR p.email LIKE ?)';
            params.push(`%${busca.trim()}%`, `%${busca.trim()}%`);
        }
        
        query += ' ORDER BY p.nome LIMIT 10';
        
        databaseConfig.all(query, params)
            .then(pessoas => {
                res.json(pessoas);
            })
            .catch(err => {
                console.error('Erro ao buscar pessoas sem login:', err);
                res.status(500).json({ success: false, message: 'Erro ao buscar pessoas' });
            });
        
    } catch (error) {
        console.error('Erro ao buscar pessoas sem login:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Rota para criar login de usuário
router.post('/admin/criar-login', requireAuth, async (req, res) => {
    try {
        // Verificar se é admin
        if (req.session.user.nivelacesso !== 'Administrador') {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado'
            });
        }

        const { id_pessoa, senha, nivelacesso } = req.body;
        
        if (!id_pessoa || !senha || !nivelacesso) {
            return res.status(400).json({
                success: false,
                error: 'Todos os campos são obrigatórios'
            });
        }

        const databaseConfig = require('../config/database');
        const bcrypt = require('bcrypt');
        
        try {
            // Verificar se a pessoa existe
            const pessoa = await databaseConfig.get('SELECT id_pessoa FROM pessoa WHERE id_pessoa = ?', [id_pessoa]);
            
            if (!pessoa) {
                return res.status(404).json({ success: false, error: 'Pessoa não encontrada' });
            }
            
            // Verificar se já existe login para esta pessoa
            const loginExistente = await databaseConfig.get('SELECT id_pessoa FROM pessoa_login WHERE id_pessoa = ?', [id_pessoa]);
            
            if (loginExistente) {
                return res.status(400).json({ success: false, error: 'Esta pessoa já possui login' });
            }
            
            // Criptografar senha
            const senhaHash = await bcrypt.hash(senha, 10);
            
            // Inserir login
            const insertQuery = `
                INSERT INTO pessoa_login (id_pessoa, senha, nivelacesso, status, dataultimaatualizacao)
                VALUES (?, ?, ?, 'Ativo', NOW())
            `;
            
            await databaseConfig.run(insertQuery, [id_pessoa, senhaHash, nivelacesso]);
            
            res.json({ success: true, message: 'Login criado com sucesso' });
            
        } catch (error) {
            console.error('Erro ao criar login:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
        
    } catch (error) {
        console.error('Erro ao criar login:', error);
        res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
});

// Rota para listar módulos
router.get('/admin/modulos', requireAuth, async (req, res) => {
    try {
        // Verificar se é admin
        if (req.session.user.nivelacesso !== 'Administrador') {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado'
            });
        }

        // Buscar módulos do banco de dados
        const databaseConfig = require('../config/database');
        const query = `
            SELECT 
                id_modulo,
                nome,
                descricao,
                icone,
                cor,
                url,
                ordem
            FROM modulos
            ORDER BY ordem, nome
        `;
        
        const modulos = await databaseConfig.all(query, []);
        
        res.json(modulos);
        
    } catch (error) {
        console.error('Erro ao buscar módulos:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Rota para criar/atualizar módulo
router.post('/admin/modulos', requireAuth, async (req, res) => {
    try {
        // Verificar se é admin
        if (req.session.user.nivelacesso !== 'Administrador') {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado'
            });
        }

        // TODO: Implementar criação de módulos quando necessário
        res.json({ success: true, message: 'Funcionalidade em desenvolvimento' });
        
    } catch (error) {
        console.error('Erro ao criar módulo:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Rota para excluir módulo
router.delete('/admin/modulos/:id', requireAuth, async (req, res) => {
    try {
        // Verificar se é admin
        if (req.session.user.nivelacesso !== 'Administrador') {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado'
            });
        }

        // TODO: Implementar exclusão de módulos quando necessário
        res.json({ success: true, message: 'Funcionalidade em desenvolvimento' });
        
    } catch (error) {
        console.error('Erro ao excluir módulo:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// ===== MIDDLEWARES DE ERRO =====

// Middleware para capturar rotas não encontradas
// Middleware catch-all removido para permitir que outras rotas (como /secure) sejam processadas

// Middleware de tratamento de erros
router.use((error, req, res, next) => {
    console.error('Erro na aplicação:', error);
    
    // Sempre retornar JSON
    res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
    });
});

// ===== EXPORTAÇÃO =====

module.exports = router;