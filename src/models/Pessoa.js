/**
 * Modelo Pessoa
 * Representa pessoas físicas e jurídicas no sistema
 */

const BaseModel = require('./BaseModel');
const bcrypt = require('bcrypt');
const { security, validation, enums } = require('../config');
const databaseConfig = require('../config/database');

class Pessoa extends BaseModel {
    constructor() {
        super('pessoa', 'id_pessoa');
        
        this.fillable = [
            'nome',
            'email',
            'telefone',
            'endereco',
            'cidade',
            'estado',
            'cep',
            'tipo',
            'categoria',
            'cnpj_cpf',
            'ativo',
            'id_pessoaVinculo'
        ];
        
        this.hidden = [];
        
        this.rules = {
            nome: {
                required: true,
                maxLength: validation.text.shortText
            },
            email: {
                required: true,
                email: true,
                maxLength: validation.email.maxLength
            },
            telefone: {
                maxLength: 20
            },
            endereco: {
                maxLength: validation.text.mediumText
            },
            cidade: {
                maxLength: 100
            },
            estado: {
                maxLength: 2
            },
            cep: {
                maxLength: 10
            },
            tipo: {
                required: true,
                enum: ['F', 'J', 'N']
            }
        };
    }

    /**
     * Busca pessoa com dados de login
     * @param {number} id - ID da pessoa
     * @returns {Promise<Object|null>}
     */
    async findWithLogin(id) {
        try {
            const query = `
                SELECT p.*, pl.nivelacesso, pl.status as login_ativo
                FROM pessoa p
                LEFT JOIN pessoa_login pl ON p.id_pessoa = pl.id_pessoa
                WHERE p.id_pessoa = ?
            `;
            
            const result = await databaseConfig.get(query, [id]);
            return result ? this.hideFields(result) : null;
        } catch (error) {
            console.error('Erro ao buscar pessoa com login:', error);
            throw new Error('Erro ao buscar dados da pessoa');
        }
    }

    /**
     * Busca pessoa por email
     * @param {string} email - Email da pessoa
     * @returns {Promise<Object|null>}
     */
    async findByEmail(email) {
        try {
            const query = `SELECT * FROM ${this.tableName} WHERE email = ?`;
            const result = await databaseConfig.get(query, [email]);
            return result ? this.hideFields(result) : null;
        } catch (error) {
            console.error('Erro ao buscar pessoa por email:', error);
            throw new Error('Erro ao buscar pessoa');
        }
    }

    // Método findByUsuario removido - login apenas por email

    /**
     * Autentica usuário
     * @param {string} email - Email do usuário
     * @param {string} senha - Senha
     * @returns {Promise<Object|null>}
     */
    async authenticate(email, senha) {
        try {
            const query = `
                SELECT p.*, pl.senha, pl.nivelacesso, pl.status as login_ativo
                FROM pessoa p
                INNER JOIN pessoa_login pl ON p.id_pessoa = pl.id_pessoa
                WHERE p.email = ? AND pl.status = 'Ativo'
            `;
            
            const result = await databaseConfig.get(query, [email]);
            
            if (!result) {
                return null;
            }
            
            // Verificar senha
            const senhaValida = await bcrypt.compare(senha, result.senha);
            if (!senhaValida) {
                return null;
            }
            
            // Remover senha do resultado
            delete result.senha;
            
            return this.hideFields(result);
        } catch (error) {
            console.error('Erro na autenticação:', error);
            throw new Error('Erro na autenticação');
        }
    }

    /**
     * Cria login para uma pessoa
     * @param {number} idPessoa - ID da pessoa
     * @param {Object} loginData - Dados do login
     * @returns {Promise<boolean>}
     */
    async createLogin(idPessoa, loginData) {
        try {
            const { senha, nivelacesso = enums.nivelAcesso.ESTAGIARIO } = loginData;
            
            // Verificar se a pessoa existe
            const pessoa = await this.findById(idPessoa);
            if (!pessoa) {
                throw new Error('Pessoa não encontrada');
            }
            
            // Verificar se já existe login para esta pessoa
            const existingLogin = await databaseConfig.get(
                'SELECT id_pessoa FROM pessoa_login WHERE id_pessoa = ?',
                [idPessoa]
            );
            
            if (existingLogin) {
                throw new Error('Já existe um login para esta pessoa');
            }
            
            // Não é mais necessário verificar usuário duplicado pois usamos apenas email
            
            // Criptografar senha
            const senhaHash = await bcrypt.hash(senha, security.bcrypt.saltRounds);
            
            // Inserir login
            const query = `
                INSERT INTO pessoa_login (id_pessoa, senha, nivelacesso, status)
                VALUES (?, ?, ?, 'Ativo')
            `;
            
            await databaseConfig.run(query, [idPessoa, senhaHash, nivelacesso]);
            
            return true;
        } catch (error) {
            console.error('Erro ao criar login:', error);
            throw error;
        }
    }

    /**
     * Atualiza senha do usuário
     * @param {number} idPessoa - ID da pessoa
     * @param {string} novaSenha - Nova senha
     * @returns {Promise<boolean>}
     */
    async updatePassword(idPessoa, novaSenha) {
        try {
            // Verificar se existe login para esta pessoa
            const login = await databaseConfig.get(
                'SELECT id_pessoa FROM pessoa_login WHERE id_pessoa = ?',
                [idPessoa]
            );
            
            if (!login) {
                throw new Error('Login não encontrado para esta pessoa');
            }
            
            // Criptografar nova senha
            const senhaHash = await bcrypt.hash(novaSenha, security.bcrypt.saltRounds);
            
            // Atualizar senha
            const query = 'UPDATE pessoa_login SET senha = ? WHERE id_pessoa = ?';
            await databaseConfig.run(query, [senhaHash, idPessoa]);
            
            return true;
        } catch (error) {
            console.error('Erro ao atualizar senha:', error);
            throw error;
        }
    }

    /**
     * Ativa/desativa login do usuário
     * @param {number} idPessoa - ID da pessoa
     * @param {boolean} ativo - Status ativo
     * @returns {Promise<boolean>}
     */
    async toggleLoginStatus(idPessoa, ativo) {
        try {
            const query = 'UPDATE pessoa_login SET ativo = ? WHERE id_pessoa = ?';
            const result = await databaseConfig.run(query, [ativo ? 1 : 0, idPessoa]);
            
            return result.changes > 0;
        } catch (error) {
            console.error('Erro ao alterar status do login:', error);
            throw new Error('Erro ao alterar status do login');
        }
    }

    /**
     * Busca pessoas por nível de acesso
     * @param {string} nivelAcesso - Nível de acesso
     * @returns {Promise<Array>}
     */
    async findByNivelAcesso(nivelAcesso) {
        try {
            const query = `
                SELECT p.*, pl.usuario, pl.nivelacesso
                FROM pessoa p
                INNER JOIN pessoa_login pl ON p.id_pessoa = pl.id_pessoa
                WHERE pl.nivelacesso = ? AND pl.ativo = 1 AND p.ativo = 1
                ORDER BY p.nome
            `;
            
            const results = await databaseConfig.all(query, [nivelAcesso]);
            return results.map(result => this.hideFields(result));
        } catch (error) {
            console.error('Erro ao buscar pessoas por tipo de acesso:', error);
            throw new Error('Erro ao buscar pessoas');
        }
    }

    /**
     * Busca orientadores ativos
     * @returns {Promise<Array>}
     */
    async findOrientadores() {
        return await this.findByNivelAcesso(enums.nivelAcesso.ORIENTADOR);
    }

    /**
     * Busca estagiários ativos
     * @returns {Promise<Array>}
     */
    async findEstagiarios() {
        return await this.findByNivelAcesso(enums.nivelAcesso.ESTAGIARIO);
    }

    /**
     * Busca empresas ativas
     * @returns {Promise<Array>}
     */
    async findEmpresas() {
        return await this.findByNivelAcesso(enums.nivelAcesso.EMPRESA);
    }

    /**
     * Validação específica do modelo Pessoa
     * @param {Object} data - Dados a serem validados
     * @param {number} id - ID do registro (para atualizações)
     * @returns {Promise<void>}
     */
    async validate(data, id = null) {
        // Executar validação base
        await super.validate(data, id);
        
        // Validações específicas
        if (data.email) {
            // Verificar se email já existe (exceto para o próprio registro)
            const existing = await this.findByEmail(data.email);
            if (existing && (!id || existing.id_pessoa !== parseInt(id))) {
                throw new Error('Este email já está cadastrado');
            }
        }
        
        if (data.cep && !/^\d{5}-?\d{3}$/.test(data.cep)) {
            throw new Error('CEP deve estar no formato 00000-000');
        }
        
        if (data.estado && data.estado.length !== 2) {
            throw new Error('Estado deve ter 2 caracteres (sigla)');
        }
    }
}

module.exports = Pessoa;