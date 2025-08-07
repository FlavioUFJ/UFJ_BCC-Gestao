/**
 * Controlador de Autenticação
 * Gerencia todas as rotas relacionadas à autenticação
 */

const AuthService = require('../services/AuthService');
const SessionConfig = require('../config/session');
const { messages } = require('../config');
const databaseConfig = require('../config/database');

class AuthController {
    constructor() {
        this.authService = new AuthService();
    }

    /**
     * Exibe página de login
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async showLogin(req, res) {
        try {
            // Se já estiver logado, redirecionar para dashboard
            if (req.session && req.session.user) {
                return res.redirect('/');
            }

            res.render('login', {
                title: 'Login - Sistema de Gestão de Estágios',
                error: req.query.error ? decodeURIComponent(req.query.error) : null,
                success: req.query.success ? decodeURIComponent(req.query.success) : null,
                layout: 'layout',
                currentPage: 'login'
            });
        } catch (error) {
            console.error('Erro ao exibir página de login:', error);
            res.status(500).render('error', {
                title: 'Erro',
                message: 'Erro interno do servidor',
                error: { status: 500 },
                currentPage: 'error'
            });
        }
    }

    /**
     * Processa login do usuário
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async login(req, res) {
        try {
            const { email, senha, remember } = req.body;

            // Validar dados obrigatórios
            if (!email || !senha) {
                return res.status(400).json({
                    success: false,
                    message: 'Email e senha são obrigatórios'
                });
            }

            // SOLUÇÃO TEMPORÁRIA: Usar acesso direto ao banco como no forgotPassword
            // Buscar usuário diretamente no banco
            const bcrypt = require('bcrypt');
            const query = `
                SELECT p.*, pl.senha, pl.nivelacesso, pl.status as login_ativo
                FROM pessoa p
                INNER JOIN pessoa_login pl ON p.id_pessoa = pl.id_pessoa
                WHERE p.email = ? AND pl.status = 'Ativo'
            `;
            
            const user = await databaseConfig.get(query, [email]);
            
            if (!user) {
                throw new Error('Credenciais inválidas.');
            }
            
            // Verificar senha
            const senhaValida = await bcrypt.compare(senha, user.senha);
            if (!senhaValida) {
                throw new Error('Credenciais inválidas.');
            }
            
            // Remover senha do resultado
            delete user.senha;
            
            // Buscar permissões do usuário
            const permissoes = await this.authService.getUserPermissions(user.id_pessoa);
            
            // Dados da sessão
            const sessionData = {
                id_pessoa: user.id_pessoa,
                nome: user.nome,
                email: user.email,
                usuario: user.usuario,
                nivelacesso: user.nivelacesso,
                categoria: user.categoria,
                permissoes: permissoes,
                login_time: new Date().toISOString()
            };
            
            const result = {
                success: true,
                message: 'Login realizado com sucesso',
                user: sessionData
            };

            if (result.success) {
                // Configurar sessão
                req.session.user = result.user;
                
                // Configurar cookie de longa duração se solicitado
                if (remember) {
                    req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 dias
                }

                // Resposta para AJAX
                if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                    return res.json({
                        success: true,
                        message: result.message,
                        redirect: '/'
                    });
                }

                // Redirecionamento normal
                return res.redirect('/');
            }
        } catch (error) {
            console.error('Erro no login:', error);
            
            const errorMessage = error.message || messages.error.invalidCredentials;
            
            // Resposta para AJAX
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(401).json({
                    success: false,
                    message: errorMessage
                });
            }

            // Redirecionamento com erro
            return res.redirect(`/auth/login?error=${encodeURIComponent(errorMessage)}`);
        }
    }

    /**
     * Processa logout do usuário
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async logout(req, res) {
        try {
            const idPessoa = req.session?.user?.id_pessoa;
            
            // Registrar logout no serviço
            if (idPessoa) {
                await this.authService.logout(idPessoa);
            }

            // Destruir sessão
            await SessionConfig.logout(req);

            // Resposta para AJAX
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.json({
                    success: true,
                    message: messages.success.logout,
                    redirect: '/auth/login'
                });
            }

            // Redirecionamento normal
            return res.redirect('/auth/login?success=' + encodeURIComponent(messages.success.logout));
        } catch (error) {
            console.error('Erro no logout:', error);
            
            // Mesmo com erro, redirecionar para login
            return res.redirect('/auth/login');
        }
    }

    /**
     * Exibe página de registro
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async showRegister(req, res) {
        try {
            // Se já estiver logado, redirecionar para dashboard
            if (req.session && req.session.user) {
                return res.redirect('/dashboard');
            }

            res.render('register', {
                title: 'Cadastro - Sistema de Gestão de Estágios',
                error: req.query.error || null,
                success: req.query.success || null,
                currentPage: 'register'
            });
        } catch (error) {
            console.error('Erro ao exibir página de registro:', error);
            res.status(500).render('error', {
                title: 'Erro',
                message: 'Erro interno do servidor',
                error: { status: 500 },
                currentPage: 'error'
            });
        }
    }

    /**
     * Processa registro de novo usuário
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async register(req, res) {
        try {
            const {
                nome,
                email,
                telefone,
                endereco,
                cidade,
                estado,
                cep,
                senha,
                confirmarSenha,
                nivelacesso
            } = req.body;

            // Validar dados obrigatórios
            if (!nome || !email || !senha) {
                return res.status(400).json({
                    success: false,
                    message: 'Nome, email e senha são obrigatórios'
                });
            }

            // Validar confirmação de senha
            if (senha !== confirmarSenha) {
                return res.status(400).json({
                    success: false,
                    message: 'Senha e confirmação de senha não coincidem'
                });
            }

            // Dados da pessoa
            const userData = {
                nome,
                email,
                telefone,
                endereco,
                cidade,
                estado,
                cep,
                tipo_pessoa: 'F' // Física por padrão
            };

            // Dados de login
            const loginData = {
                senha,
                nivelacesso: nivelacesso || 'Estagiário'
            };

            // Registrar usuário
            const result = await this.authService.register(userData, loginData);

            if (result.success) {
                // Resposta para AJAX
                if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                    return res.json({
                    success: true,
                    message: result.message,
                    redirect: '/auth/login'
                });
                }

                // Redirecionamento normal
            return res.redirect('/auth/login?success=' + encodeURIComponent(result.message));
            }
        } catch (error) {
            console.error('Erro no registro:', error);
            
            const errorMessage = error.message || 'Erro interno no sistema de registro';
            
            // Resposta para AJAX
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(400).json({
                    success: false,
                    message: errorMessage
                });
            }

            // Redirecionamento com erro
            return res.redirect(`/register?error=${encodeURIComponent(errorMessage)}`);
        }
    }

    /**
     * Exibe página de alteração de senha
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async showChangePassword(req, res) {
        try {
            // Preservar o returnUrl original, mesmo quando há success/error
            let returnUrl = req.query.returnUrl;
            if (!returnUrl) {
                // Se não há returnUrl na query, usar referer apenas se não for a própria página de alterar senha
                const referer = req.headers.referer;
                if (referer && !referer.includes('/alterar-senha')) {
                    returnUrl = referer;
                } else {
                    returnUrl = '/dashboard';
                }
            }
            
            res.render('alterar-senha', {
                title: 'Alterar Senha',
                user: req.session.user,
                error: req.query.error || null,
                success: req.query.success || null,
                primeiroLogin: false,
                returnUrl: returnUrl,
                currentPage: 'alterar-senha',
                currentUrl: req.originalUrl
            });
        } catch (error) {
            console.error('Erro ao exibir página de alteração de senha:', error);
            res.status(500).render('error', {
                title: 'Erro',
                message: 'Erro interno do servidor',
                error: { status: 500 },
                currentPage: 'error'
            });
        }
    }

    /**
     * Processa alteração de senha
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async changePassword(req, res) {
        try {
            const { senhaAtual, novaSenha, confirmarNovaSenha } = req.body;
            const idPessoa = req.session.user.id_pessoa;

            // Validar dados obrigatórios
            if (!senhaAtual || !novaSenha || !confirmarNovaSenha) {
                return res.status(400).json({
                    success: false,
                    message: 'Todos os campos são obrigatórios'
                });
            }

            // Validar confirmação de senha
            if (novaSenha !== confirmarNovaSenha) {
                return res.status(400).json({
                    success: false,
                    message: 'Nova senha e confirmação não coincidem'
                });
            }

            // Alterar senha
            const result = await this.authService.changePassword(idPessoa, senhaAtual, novaSenha);

            if (result.success) {
                // Resposta para AJAX
                if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                    return res.json({
                        success: true,
                        message: result.message
                    });
                }

                // Preservar o returnUrl original no redirecionamento
                const returnUrl = req.body.returnUrl || req.query.returnUrl || '/dashboard';
                const redirectUrl = '/alterar-senha?success=' + encodeURIComponent(result.message) + '&returnUrl=' + encodeURIComponent(returnUrl);
                return res.redirect(redirectUrl);
            }
        } catch (error) {
            console.error('Erro ao alterar senha:', error);
            
            const errorMessage = error.message || 'Erro interno ao alterar senha';
            
            // Resposta para AJAX
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(400).json({
                    success: false,
                    message: errorMessage
                });
            }

            // Preservar o returnUrl original no redirecionamento de erro
            const returnUrl = req.body.returnUrl || req.query.returnUrl || '/dashboard';
            const redirectUrl = `/alterar-senha?error=${encodeURIComponent(errorMessage)}&returnUrl=${encodeURIComponent(returnUrl)}`;
            return res.redirect(redirectUrl);
        }
    }

    /**
     * Verifica status da sessão (para AJAX)
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async checkSession(req, res) {
        try {
            const user = SessionConfig.getUserFromSession(req);
            
            if (user) {
                return res.json({
                    authenticated: true,
                    user: {
                        id_pessoa: user.id_pessoa,
                        nome: user.nome,
                        email: user.email,
                        nivelacesso: user.nivelacesso
                    }
                });
            } else {
                return res.json({
                    authenticated: false
                });
            }
        } catch (error) {
            console.error('Erro ao verificar sessão:', error);
            return res.status(500).json({
                authenticated: false,
                error: 'Erro interno do servidor'
            });
        }
    }

    /**
     * Middleware para verificar autenticação
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     * @param {Function} next - Next function
     */
    static requireAuth(req, res, next) {
        return SessionConfig.requireAuth(req, res, next);
    }

    /**
     * Middleware para verificar se é administrador
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     * @param {Function} next - Next function
     */
    static requireAdmin(req, res, next) {
        return SessionConfig.requireAdmin(req, res, next);
    }

    /**
     * Middleware para verificar permissões específicas
     * @param {Array|string} permissoes - Permissões necessárias
     * @returns {Function}
     */
    static requirePermissions(permissoes) {
        return SessionConfig.requirePermissions(permissoes);
    }

    /**
     * Exibe página de recuperação de senha
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async showForgotPassword(req, res) {
        try {
            res.render('recuperar-senha', {
                title: 'Recuperar Senha - Sistema de Gestão de Estágios',
                error: req.query.error || null,
                success: req.query.success || null,
                layout: 'layout',
                currentPage: 'recuperar-senha'
            });
        } catch (error) {
            console.error('Erro ao exibir página de recuperação de senha:', error);
            res.status(500).render('error', {
                title: 'Erro',
                message: 'Erro interno do servidor',
                error: { status: 500 },
                currentPage: 'error'
            });
        }
    }

    /**
     * Processa solicitação de recuperação de senha
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async forgotPassword(req, res) {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: 'Email é obrigatório'
                });
            }

            // Verificar se o usuário existe
            const user = await databaseConfig.get('SELECT * FROM pessoa WHERE email = ?', [email]);
            
            if (user) {
                // Gerar token de recuperação
                const crypto = require('crypto');
                const resetToken = crypto.randomBytes(32).toString('hex');
                const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hora

                // Salvar token em memória (solução temporária)
                if (!global.resetTokens) {
                    global.resetTokens = new Map();
                }
                global.resetTokens.set(resetToken, {
                    email: email,
                    userId: user.id_pessoa,
                    expiry: resetTokenExpiry
                });

                // Tentar enviar email usando o sistema de configuração
                try {
                    const emailConfig = require('../config/email');
                    
                    const resetUrl = `${req.protocol}://${req.get('host')}/auth/reset-password/${resetToken}`;
                    
                    const htmlContent = emailConfig.constructor.templates.recuperacaoSenha(
                        user.nome,
                        resetUrl
                    );
                    
                    await emailConfig.enviarEmail(
                        email,
                        'Recuperação de Senha - Sistema de Gestão de Estágios',
                        htmlContent
                    );
                    
                    console.log('Email de recuperação enviado para:', email);
                } catch (emailError) {
                    console.error('Erro ao enviar email:', emailError);
                    // Continuar mesmo se o email falhar, por segurança
                }
            }

            // Sempre retornar a mesma mensagem por segurança
            const message = 'Se o email existir em nossa base, você receberá instruções para recuperar sua senha.';

            // Resposta para AJAX
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.json({
                    success: true,
                    message: message
                });
            }

            // Redirecionamento normal
            return res.redirect('/auth/forgot-password?success=' + encodeURIComponent(message));
        } catch (error) {
            console.error('Erro ao processar recuperação de senha:', error);
            
            const errorMessage = 'Erro interno ao processar solicitação';
            
            // Resposta para AJAX
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(500).json({
                    success: false,
                    message: errorMessage
                });
            }

            // Redirecionamento com erro
            return res.redirect(`/auth/forgot-password?error=${encodeURIComponent(errorMessage)}`);
        }
    }

    /**
     * Exibe página de redefinição de senha
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async showResetPassword(req, res) {
        try {
            const { token } = req.params;

            // Token de teste temporário para debug
            if (token === 'debug-test-token') {
                return res.render('reset-password', {
                    title: 'Redefinir Senha - Sistema de Gestão de Estágios',
                    token: token,
                    error: req.query.error || null,
                    success: req.query.success || null,
                    layout: false,
                    currentPage: 'reset-password'
                });
            }

            // Validar se o token existe e não expirou
            if (!global.resetTokens || !global.resetTokens.has(token)) {
                return res.redirect('/auth/forgot-password?error=' + encodeURIComponent('Token inválido ou expirado. Solicite uma nova recuperação de senha.'));
            }

            const tokenData = global.resetTokens.get(token);
            
            // Verificar se o token expirou
            if (new Date() > tokenData.expiry) {
                global.resetTokens.delete(token);
                return res.redirect('/auth/forgot-password?error=' + encodeURIComponent('Token expirado. Solicite uma nova recuperação de senha.'));
            }

            // Desabilitar temporariamente o layout para esta renderização
            const originalLayout = res.app.get('layout');
            res.app.set('layout', false);
            
            res.render('reset-password', {
                title: 'Redefinir Senha - Sistema de Gestão de Estágios',
                token: token,
                error: req.query.error || null,
                success: req.query.success || null,
                currentPage: 'reset-password'
            });
            
            // Restaurar configuração original do layout
            res.app.set('layout', originalLayout);
        } catch (error) {
            console.error('Erro ao exibir página de redefinição de senha:', error);
            res.status(500).render('error', {
                title: 'Erro',
                message: 'Erro interno do servidor',
                error: { status: 500 },
                currentPage: 'error'
            });
        }
    }

    /**
     * Processa redefinição de senha
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async resetPassword(req, res) {
        try {
            const { token } = req.params;
            const { senha, confirmarSenha } = req.body;

            if (!senha || !confirmarSenha) {
                return res.status(400).json({
                    success: false,
                    message: 'Senha e confirmação são obrigatórias'
                });
            }

            if (senha !== confirmarSenha) {
                return res.status(400).json({
                    success: false,
                    message: 'Senha e confirmação não coincidem'
                });
            }

            if (senha.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: 'A senha deve ter pelo menos 6 caracteres'
                });
            }

            // Validar token
            if (!global.resetTokens || !global.resetTokens.has(token)) {
                const errorMessage = 'Token inválido ou expirado';
                
                if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                    return res.status(400).json({
                        success: false,
                        message: errorMessage
                    });
                }
                
                return res.redirect(`/auth/reset-password/${token}?error=${encodeURIComponent(errorMessage)}`);
            }

            const tokenData = global.resetTokens.get(token);
            
            // Verificar se o token expirou
            if (new Date() > tokenData.expiry) {
                global.resetTokens.delete(token);
                const errorMessage = 'Token expirado. Solicite uma nova recuperação de senha';
                
                if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                    return res.status(400).json({
                        success: false,
                        message: errorMessage
                    });
                }
                
                return res.redirect(`/auth/forgot-password?error=${encodeURIComponent(errorMessage)}`);
            }

            // Atualizar senha no banco de dados
            const bcrypt = require('bcrypt');
            const senhaHash = await bcrypt.hash(senha, 10);
            
            await databaseConfig.run(
                'UPDATE pessoa_login SET senha = ? WHERE id_pessoa = ?',
                [senhaHash, tokenData.userId]
            );

            // Remover token usado
            global.resetTokens.delete(token);

            console.log(`Senha redefinida com sucesso para usuário ID: ${tokenData.userId}`);

            // Resposta para AJAX
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.json({
                    success: true,
                    message: 'Senha redefinida com sucesso',
                    redirect: '/auth/login'
                });
            }

            // Redirecionamento normal
            return res.redirect('/auth/login?success=' + encodeURIComponent('Senha redefinida com sucesso'));
        } catch (error) {
            console.error('Erro ao redefinir senha:', error);
            
            const errorMessage = 'Erro interno ao redefinir senha';
            
            // Resposta para AJAX
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(500).json({
                    success: false,
                    message: errorMessage
                });
            }

            // Redirecionamento com erro
            return res.redirect(`/auth/reset-password/${req.params.token}?error=${encodeURIComponent(errorMessage)}`);
        }
    }
}

module.exports = AuthController;