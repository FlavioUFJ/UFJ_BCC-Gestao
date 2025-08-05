/**
 * Serviço de Autenticação
 * Centraliza toda a lógica de autenticação e autorização
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Pessoa = require('../models/Pessoa');
const { security, messages, enums } = require('../config');
const databaseConfig = require('../config/database');

class AuthService {
    constructor() {
        this.pessoaModel = new Pessoa();
    }

    /**
     * Autentica um usuário
     * @param {string} email - Email do usuário
     * @param {string} senha - Senha do usuário
     * @returns {Promise<Object>}
     */
    async login(email, senha) {
        try {
            if (!email || !senha) {
                throw new Error('Email e senha são obrigatórios');
            }

            // Buscar usuário
            const user = await this.pessoaModel.authenticate(email, senha);
            
            if (!user) {
                throw new Error(messages.error.invalidCredentials);
            }

            // Buscar módulos/permissões do usuário
            const permissoes = await this.getUserPermissions(user.id_pessoa);
            
            // Dados da sessão
            const sessionData = {
                id_pessoa: user.id_pessoa,
                nome: user.nome,
                email: user.email,
                usuario: user.usuario,
                tipoacesso: user.tipoacesso,
                permissoes: permissoes,
                login_time: new Date().toISOString()
            };

            // Registrar log de login
            await this.logUserActivity(user.id_pessoa, 'LOGIN', 'Login realizado com sucesso');

            return {
                success: true,
                user: sessionData,
                message: messages.success.login
            };
        } catch (error) {
            console.error('Erro no login:', error);
            
            // Registrar tentativa de login falhada
            if (email) {
                await this.logFailedLogin(email, error.message);
            }
            
            throw new Error(error.message || 'Erro interno no sistema de autenticação');
        }
    }

    /**
     * Realiza logout do usuário
     * @param {number} idPessoa - ID da pessoa
     * @returns {Promise<Object>}
     */
    async logout(idPessoa) {
        try {
            if (idPessoa) {
                await this.logUserActivity(idPessoa, 'LOGOUT', 'Logout realizado');
            }

            return {
                success: true,
                message: messages.success.logout
            };
        } catch (error) {
            console.error('Erro no logout:', error);
            // Não falhar o logout por erro de log
            return {
                success: true,
                message: messages.success.logout
            };
        }
    }

    /**
     * Registra um novo usuário
     * @param {Object} userData - Dados do usuário
     * @param {Object} loginData - Dados de login
     * @returns {Promise<Object>}
     */
    async register(userData, loginData) {
        try {
            // Validar dados obrigatórios
            if (!userData.nome || !userData.email) {
                throw new Error('Nome e email são obrigatórios');
            }

            if (!loginData.senha) {
                throw new Error('Senha é obrigatória');
            }

            // Verificar se email já existe
            const existingUser = await this.pessoaModel.findByEmail(userData.email);
            if (existingUser) {
                throw new Error('Este email já está cadastrado');
            }

            // Não é mais necessário verificar usuário duplicado

            // Iniciar transação
            await databaseConfig.beginTransaction();

            try {
                // Criar pessoa
                const pessoa = await this.pessoaModel.create({
                    ...userData,
                    ativo: 1,
                    data_cadastro: new Date().toISOString()
                });

                // Criar login
                await this.pessoaModel.createLogin(pessoa.id_pessoa, {
                    ...loginData,
                    tipoacesso: loginData.tipoacesso || enums.tipoAcesso.ESTAGIARIO
                });

                // Confirmar transação
                await databaseConfig.commit();

                // Registrar log
                await this.logUserActivity(pessoa.id_pessoa, 'REGISTER', 'Usuário registrado');

                return {
                    success: true,
                    user: pessoa,
                    message: messages.success.created
                };
            } catch (error) {
                await databaseConfig.rollback();
                throw error;
            }
        } catch (error) {
            console.error('Erro no registro:', error);
            throw new Error(error.message || 'Erro interno no sistema de registro');
        }
    }

    /**
     * Altera senha do usuário
     * @param {number} idPessoa - ID da pessoa
     * @param {string} senhaAtual - Senha atual
     * @param {string} novaSenha - Nova senha
     * @returns {Promise<Object>}
     */
    async changePassword(idPessoa, senhaAtual, novaSenha) {
        try {
            if (!senhaAtual || !novaSenha) {
                throw new Error('Senha atual e nova senha são obrigatórias');
            }

            if (novaSenha.length < (security.password?.minLength || 6)) {
                throw new Error(`Nova senha deve ter pelo menos ${security.password?.minLength || 6} caracteres`);
            }

            // Buscar dados do usuário
            const user = await databaseConfig.get(
                'SELECT pl.senha FROM pessoa_login pl WHERE pl.id_pessoa = ?',
                [idPessoa]
            );

            if (!user) {
                throw new Error('Usuário não encontrado');
            }

            // Verificar senha atual
            const senhaValida = await bcrypt.compare(senhaAtual, user.senha);
            if (!senhaValida) {
                throw new Error('Senha atual incorreta');
            }

            // Atualizar senha
            await this.pessoaModel.updatePassword(idPessoa, novaSenha);

            // Registrar log
            await this.logUserActivity(idPessoa, 'PASSWORD_CHANGE', 'Senha alterada');

            return {
                success: true,
                message: 'Senha alterada com sucesso'
            };
        } catch (error) {
            console.error('Erro ao alterar senha:', error);
            throw new Error(error.message || 'Erro interno ao alterar senha');
        }
    }

    /**
     * Redefine senha do usuário (admin)
     * @param {number} idPessoa - ID da pessoa
     * @param {string} novaSenha - Nova senha
     * @param {number} idAdmin - ID do administrador
     * @returns {Promise<Object>}
     */
    async resetPassword(idPessoa, novaSenha, idAdmin) {
        try {
            if (!novaSenha) {
                throw new Error('Nova senha é obrigatória');
            }

            if (novaSenha.length < (security.password?.minLength || 6)) {
                throw new Error(`Nova senha deve ter pelo menos ${security.password?.minLength || 6} caracteres`);
            }

            // Verificar se o usuário existe
            const user = await this.pessoaModel.findById(idPessoa);
            if (!user) {
                throw new Error('Usuário não encontrado');
            }

            // Atualizar senha
            await this.pessoaModel.updatePassword(idPessoa, novaSenha);

            // Registrar log
            await this.logUserActivity(idPessoa, 'PASSWORD_RESET', `Senha redefinida pelo admin ${idAdmin}`);
            await this.logUserActivity(idAdmin, 'ADMIN_ACTION', `Redefiniu senha do usuário ${idPessoa}`);

            return {
                success: true,
                message: 'Senha redefinida com sucesso'
            };
        } catch (error) {
            console.error('Erro ao redefinir senha:', error);
            throw new Error(error.message || 'Erro interno ao redefinir senha');
        }
    }

    /**
     * Busca permissões do usuário
     * @param {number} idPessoa - ID da pessoa
     * @returns {Promise<Array>}
     */
    async getUserPermissions(idPessoa) {
        try {
            const query = `
                SELECT m.nome, m.url, m.icone
                FROM usuario_modulos um
                INNER JOIN modulos m ON um.id_modulo = m.id_modulo
                WHERE um.id_pessoa = ? AND um.ativo = 1 AND m.ativo = 1
                ORDER BY m.ordem
            `;
            
            const permissions = await databaseConfig.all(query, [idPessoa]);
            return permissions.map(p => p.nome);
        } catch (error) {
            console.error('Erro ao buscar permissões:', error);
            return [];
        }
    }

    /**
     * Verifica se usuário tem permissão específica
     * @param {number} idPessoa - ID da pessoa
     * @param {string} permissao - Nome da permissão
     * @returns {Promise<boolean>}
     */
    async hasPermission(idPessoa, permissao) {
        try {
            // Verificar se é administrador
            const user = await databaseConfig.get(
                'SELECT tipoacesso FROM pessoa_login WHERE id_pessoa = ?',
                [idPessoa]
            );
            
            if (user && user.tipoacesso === enums.tipoAcesso.ADMINISTRADOR) {
                return true;
            }

            // Verificar permissão específica
            const query = `
                SELECT COUNT(*) as count
                FROM usuario_modulos um
                INNER JOIN modulos m ON um.id_modulo = m.id_modulo
                WHERE um.id_pessoa = ? AND m.nome = ? AND um.ativo = 1 AND m.ativo = 1
            `;
            
            const result = await databaseConfig.get(query, [idPessoa, permissao]);
            return result.count > 0;
        } catch (error) {
            console.error('Erro ao verificar permissão:', error);
            return false;
        }
    }

    /**
     * Registra atividade do usuário
     * @param {number} idPessoa - ID da pessoa
     * @param {string} acao - Ação realizada
     * @param {string} descricao - Descrição da ação
     * @returns {Promise<void>}
     */
    async logUserActivity(idPessoa, acao, descricao) {
        try {
            // Implementar log de atividades se necessário
            console.log(`[${new Date().toISOString()}] User ${idPessoa}: ${acao} - ${descricao}`);
        } catch (error) {
            console.error('Erro ao registrar atividade:', error);
            // Não falhar por erro de log
        }
    }

    /**
     * Registra tentativa de login falhada
     * @param {string} email - Email do usuário
     * @param {string} erro - Erro ocorrido
     * @returns {Promise<void>}
     */
    async logFailedLogin(email, erro) {
        try {
            console.log(`[${new Date().toISOString()}] Failed login attempt: ${email} - ${erro}`);
        } catch (error) {
            console.error('Erro ao registrar tentativa de login falhada:', error);
            // Não falhar por erro de log
        }
    }

    /**
     * Gera token JWT (se necessário)
     * @param {Object} payload - Dados do token
     * @returns {string}
     */
    generateToken(payload) {
        return jwt.sign(payload, security.jwt.secret, {
            expiresIn: security.jwt.expiresIn
        });
    }

    /**
     * Verifica token JWT
     * @param {string} token - Token a ser verificado
     * @returns {Object|null}
     */
    verifyToken(token) {
        try {
            return jwt.verify(token, security.jwt.secret);
        } catch (error) {
            console.error('Erro ao verificar token:', error);
            return null;
        }
    }
}

module.exports = AuthService;