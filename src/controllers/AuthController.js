/**
 * Controlador de Autenticação
 * Gerencia todas as rotas relacionadas à autenticação
 */

const AuthService = require('../services/AuthService');
const SessionConfig = require('../config/session');
const { messages } = require('../config');

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
                return res.redirect('/dashboard');
            }

            res.render('login', {
                title: 'Login - Sistema de Gestão de Estágios',
                error: req.query.error || null,
                success: req.query.success || null
            });
        } catch (error) {
            console.error('Erro ao exibir página de login:', error);
            res.status(500).render('error', {
                title: 'Erro',
                message: 'Erro interno do servidor',
                error: { status: 500 }
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
            const { usuario, senha, remember } = req.body;

            // Validar dados obrigatórios
            if (!usuario || !senha) {
                return res.status(400).json({
                    success: false,
                    message: 'Usuário e senha são obrigatórios'
                });
            }

            // Tentar autenticar
            const result = await this.authService.login(usuario, senha);

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
                        redirect: '/dashboard'
                    });
                }

                // Redirecionamento normal
                return res.redirect('/dashboard');
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
            return res.redirect(`/login?error=${encodeURIComponent(errorMessage)}`);
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
                    redirect: '/login'
                });
            }

            // Redirecionamento normal
            return res.redirect('/login?success=' + encodeURIComponent(messages.success.logout));
        } catch (error) {
            console.error('Erro no logout:', error);
            
            // Mesmo com erro, redirecionar para login
            return res.redirect('/login');
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
                success: req.query.success || null
            });
        } catch (error) {
            console.error('Erro ao exibir página de registro:', error);
            res.status(500).render('error', {
                title: 'Erro',
                message: 'Erro interno do servidor',
                error: { status: 500 }
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
                usuario,
                senha,
                confirmarSenha,
                tipoacesso
            } = req.body;

            // Validar dados obrigatórios
            if (!nome || !email || !usuario || !senha) {
                return res.status(400).json({
                    success: false,
                    message: 'Nome, email, usuário e senha são obrigatórios'
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
                usuario,
                senha,
                tipoacesso: tipoacesso || 'Estagiário'
            };

            // Registrar usuário
            const result = await this.authService.register(userData, loginData);

            if (result.success) {
                // Resposta para AJAX
                if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                    return res.json({
                        success: true,
                        message: result.message,
                        redirect: '/login'
                    });
                }

                // Redirecionamento normal
                return res.redirect('/login?success=' + encodeURIComponent(result.message));
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
            res.render('change-password', {
                title: 'Alterar Senha',
                user: req.session.user,
                error: req.query.error || null,
                success: req.query.success || null
            });
        } catch (error) {
            console.error('Erro ao exibir página de alteração de senha:', error);
            res.status(500).render('error', {
                title: 'Erro',
                message: 'Erro interno do servidor',
                error: { status: 500 }
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

                // Redirecionamento normal
                return res.redirect('/change-password?success=' + encodeURIComponent(result.message));
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

            // Redirecionamento com erro
            return res.redirect(`/change-password?error=${encodeURIComponent(errorMessage)}`);
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
                        tipoacesso: user.tipoacesso
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
}

module.exports = AuthController;