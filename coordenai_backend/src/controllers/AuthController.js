/**
 * Controlador de Autenticação
 * Login, logout, sessão e senhas. Responde sempre em JSON.
 *
 * Em relação ao legado, saíram os métodos que apenas renderizavam páginas
 * (login, cadastro, recuperar/alterar senha) e o autocadastro (`register`),
 * que aceitava o nível de acesso informado pelo próprio visitante. A criação
 * de logins continua disponível ao administrador em /admin/criar-login.
 */

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const AuthService = require('../services/AuthService');
const SessionConfig = require('../config/session');
const { messages } = require('../config');
const databaseConfig = require('../config/database');

const UMA_HORA = 60 * 60 * 1000;
const TRINTA_DIAS = 30 * 24 * 60 * 60 * 1000;

/**
 * Tokens de redefinição de senha, mantidos em memória como no legado:
 * perdem-se ao reiniciar o processo e não são compartilhados entre instâncias.
 */
const resetTokens = new Map();

function tokenValido(token) {
    const dados = resetTokens.get(token);
    if (!dados) {
        return null;
    }
    if (Date.now() > dados.expiry) {
        resetTokens.delete(token);
        return null;
    }
    return dados;
}

/**
 * Endereço público do frontend, usado nos links enviados por e-mail.
 */
function urlDoFrontend(req) {
    const configurada = process.env.FRONTEND_URL || process.env.BASE_URL;
    const base = configurada || `${req.protocol}://${req.get('host')}`;
    return base.replace(/\/+$/, '');
}

class AuthController {
    constructor() {
        this.authService = new AuthService();
    }

    /**
     * POST /auth/login
     */
    async login(req, res) {
        try {
            const { email, senha, remember } = req.body;

            if (!email || !senha) {
                return res.status(400).json({
                    success: false,
                    message: 'Email e senha são obrigatórios'
                });
            }

            const query = `
                SELECT p.*, pl.senha, pl.nivelacesso, pl.status as login_ativo
                FROM pessoa p
                INNER JOIN pessoa_login pl ON p.id_pessoa = pl.id_pessoa
                WHERE p.email = ? AND pl.status = 'Ativo'
            `;

            const user = await databaseConfig.get(query, [email]);

            // Mesma mensagem para usuário inexistente e senha errada
            if (!user || !(await bcrypt.compare(senha, user.senha))) {
                return res.status(401).json({
                    success: false,
                    message: messages.error.invalidCredentials
                });
            }

            const permissoes = await this.authService.getUserPermissions(user.id_pessoa);

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

            // Nova sessão a cada login, para não reaproveitar um identificador anterior
            await new Promise((resolve, reject) => {
                req.session.regenerate((err) => (err ? reject(err) : resolve()));
            });

            req.session.user = sessionData;
            if (remember) {
                req.session.cookie.maxAge = TRINTA_DIAS;
            }

            return res.json({
                success: true,
                message: 'Login realizado com sucesso',
                user: SessionConfig.getUserFromSession(req)
            });
        } catch (error) {
            console.error('Erro no login:', error.message);
            return res.status(500).json({
                success: false,
                message: 'Erro interno ao processar o login'
            });
        }
    }

    /**
     * POST /logout
     */
    async logout(req, res) {
        const opcoesCookie = {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
        };

        try {
            const idPessoa = req.session?.user?.id_pessoa;

            if (idPessoa) {
                await this.authService.logout(idPessoa);
            }

            await SessionConfig.logout(req);
        } catch (error) {
            console.error('Erro no logout:', error.message);
        }

        // Mesmo com erro, o cookie de sessão é removido
        res.clearCookie(SessionConfig.cookieName, opcoesCookie);
        res.set('Cache-Control', 'no-store');

        return res.json({
            success: true,
            message: messages.success.logout
        });
    }

    /**
     * POST /alterar-senha
     */
    async changePassword(req, res) {
        try {
            const { senhaAtual, novaSenha, confirmarNovaSenha } = req.body;
            const idPessoa = req.session.user.id_pessoa;

            if (!senhaAtual || !novaSenha || !confirmarNovaSenha) {
                return res.status(400).json({
                    success: false,
                    message: 'Todos os campos são obrigatórios'
                });
            }

            if (novaSenha !== confirmarNovaSenha) {
                return res.status(400).json({
                    success: false,
                    message: 'Nova senha e confirmação não coincidem'
                });
            }

            const result = await this.authService.changePassword(idPessoa, senhaAtual, novaSenha);

            return res.json({
                success: true,
                message: result.message
            });
        } catch (error) {
            console.error('Erro ao alterar senha:', error.message);
            return res.status(400).json({
                success: false,
                message: error.message || 'Erro interno ao alterar senha'
            });
        }
    }

    /**
     * GET /session-status
     */
    async checkSession(req, res) {
        const user = SessionConfig.getUserFromSession(req);
        res.set('Cache-Control', 'no-store');

        if (!user) {
            return res.json({ authenticated: false });
        }
        return res.json({ authenticated: true, user });
    }

    /**
     * POST /auth/forgot-password
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

            const user = await databaseConfig.get('SELECT * FROM pessoa WHERE email = ?', [email]);

            if (user) {
                const resetToken = crypto.randomBytes(32).toString('hex');
                resetTokens.set(resetToken, {
                    email: email,
                    userId: user.id_pessoa,
                    expiry: Date.now() + UMA_HORA
                });

                try {
                    const emailConfig = require('../config/email');
                    const resetUrl = `${urlDoFrontend(req)}/redefinir-senha/${resetToken}`;

                    const htmlContent = emailConfig.constructor.templates.recuperacaoSenha(
                        user.nome,
                        resetUrl
                    );

                    await emailConfig.enviarEmail(
                        email,
                        'Recuperação de Senha - CoordenAI - Gestão',
                        htmlContent
                    );
                } catch (emailError) {
                    // Não revela ao solicitante se o envio falhou
                    console.error('Erro ao enviar email de recuperação:', emailError.message);
                }
            }

            // Sempre a mesma resposta, exista ou não o email
            return res.json({
                success: true,
                message: 'Se o email existir em nossa base, você receberá instruções para recuperar sua senha.'
            });
        } catch (error) {
            console.error('Erro ao processar recuperação de senha:', error.message);
            return res.status(500).json({
                success: false,
                message: 'Erro interno ao processar solicitação'
            });
        }
    }

    /**
     * GET /auth/reset-password/:token
     * Informa ao frontend se o link de redefinição ainda vale.
     */
    async validateResetToken(req, res) {
        const valido = !!tokenValido(req.params.token);
        res.set('Cache-Control', 'no-store');

        if (!valido) {
            return res.status(400).json({
                success: false,
                valid: false,
                message: 'Token inválido ou expirado. Solicite uma nova recuperação de senha.'
            });
        }
        return res.json({ success: true, valid: true });
    }

    /**
     * POST /auth/reset-password/:token
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

            const tokenData = tokenValido(token);
            if (!tokenData) {
                return res.status(400).json({
                    success: false,
                    message: 'Token inválido ou expirado. Solicite uma nova recuperação de senha.'
                });
            }

            const senhaHash = await bcrypt.hash(senha, 10);

            await databaseConfig.run(
                'UPDATE pessoa_login SET senha = ? WHERE id_pessoa = ?',
                [senhaHash, tokenData.userId]
            );

            resetTokens.delete(token);

            return res.json({
                success: true,
                message: 'Senha redefinida com sucesso'
            });
        } catch (error) {
            console.error('Erro ao redefinir senha:', error.message);
            return res.status(500).json({
                success: false,
                message: 'Erro interno ao redefinir senha'
            });
        }
    }

    static requireAuth(req, res, next) {
        return SessionConfig.requireAuth(req, res, next);
    }

    static requireAdmin(req, res, next) {
        return SessionConfig.requireAdmin(req, res, next);
    }

    static requirePermissions(permissoes) {
        return SessionConfig.requirePermissions(permissoes);
    }
}

module.exports = AuthController;
