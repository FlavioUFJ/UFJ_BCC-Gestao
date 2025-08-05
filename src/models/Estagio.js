/**
 * Modelo Estágio
 * Representa os estágios no sistema
 */

const BaseModel = require('./BaseModel');
const { enums, validation } = require('../config');
const databaseConfig = require('../config/database');

class Estagio extends BaseModel {
    constructor() {
        super('campo_estagio', 'id_campo_estagio');
        
        this.fillable = [
            'id_pessoa_estagiario',
            'id_pessoa_orientador',
            'id_pessoa_concedente',
            'id_pessoa_supervisor',
            'nome_empresa',
            'endereco_empresa',
            'telefone_empresa',
            'email_empresa',
            'nome_supervisor',
            'telefone_supervisor',
            'email_supervisor',
            'cargo_supervisor',
            'area_atuacao',
            'atividades_desenvolvidas',
            'data_inicio',
            'data_fim',
            'carga_horaria_total',
            'carga_horaria_semanal',
            'valor_bolsa',
            'tipo_estagio',
            'situacao',
            'observacoes',
            'data_cadastro'
        ];
        
        this.hidden = [];
        
        this.rules = {
            id_pessoa_estagiario: {
                required: true
            },
            id_pessoa_orientador: {
                required: true
            },
            nome_empresa: {
                required: true,
                maxLength: validation.text.shortText
            },
            endereco_empresa: {
                maxLength: validation.text.mediumText
            },
            telefone_empresa: {
                maxLength: 20
            },
            email_empresa: {
                email: true,
                maxLength: validation.email.maxLength
            },
            nome_supervisor: {
                required: true,
                maxLength: validation.text.shortText
            },
            telefone_supervisor: {
                maxLength: 20
            },
            email_supervisor: {
                email: true,
                maxLength: validation.email.maxLength
            },
            cargo_supervisor: {
                maxLength: 100
            },
            area_atuacao: {
                required: true,
                maxLength: validation.text.shortText
            },
            atividades_desenvolvidas: {
                maxLength: validation.text.longText
            },
            data_inicio: {
                required: true
            },
            data_fim: {
                required: true
            },
            carga_horaria_total: {
                required: true
            },
            carga_horaria_semanal: {
                required: true
            },
            tipo_estagio: {
                required: true
            },
            situacao: {
                required: true
            }
        };
    }

    /**
     * Busca estágios com dados completos (joins)
     * @param {Object} options - Opções de consulta
     * @returns {Promise<Array>}
     */
    async findWithDetails(options = {}) {
        try {
            const {
            where = '',
            orderBy = 'ce.id_campo_estagio DESC',
            limit = null,
            offset = null,
            params = []
        } = options;

            let query = `
                SELECT 
                    ce.*,
                    pe.nome as nome_estagiario,
                    pe.email as email_estagiario,
                    po.nome as nome_orientador,
                    po.email as email_orientador,
                    pem.nome as nome_empresa_pessoa,
                    ps.nome as nome_supervisor_pessoa
                FROM campo_estagio ce
                INNER JOIN pessoa pe ON ce.id_pessoa_estagiario = pe.id_pessoa
                INNER JOIN pessoa po ON ce.id_pessoa_orientador = po.id_pessoa
                LEFT JOIN pessoa pem ON ce.id_pessoa_concedente = pem.id_pessoa
                LEFT JOIN pessoa ps ON ce.id_pessoa_supervisor = ps.id_pessoa
            `;
            
            if (where) {
                query += ` WHERE ${where}`;
            }
            
            if (orderBy) {
                query += ` ORDER BY ${orderBy}`;
            }
            
            if (limit) {
                query += ` LIMIT ${limit}`;
                if (offset) {
                    query += ` OFFSET ${offset}`;
                }
            }

            const results = await databaseConfig.all(query, params);
            return results.map(result => this.hideFields(result));
        } catch (error) {
            console.error('Erro ao buscar estágios com detalhes:', error);
            throw new Error('Erro ao buscar estágios');
        }
    }

    /**
     * Busca estágio por ID com detalhes
     * @param {number} id - ID do estágio
     * @returns {Promise<Object|null>}
     */
    async findByIdWithDetails(id) {
        try {
            const results = await this.findWithDetails({
                where: 'ce.id_campo_estagio = ?',
                params: [id],
                limit: 1
            });
            
            return results.length > 0 ? results[0] : null;
        } catch (error) {
            console.error('Erro ao buscar estágio por ID com detalhes:', error);
            throw new Error('Erro ao buscar estágio');
        }
    }

    /**
     * Busca estágios por estagiário
     * @param {number} idEstagiario - ID do estagiário
     * @returns {Promise<Array>}
     */
    async findByEstagiario(idEstagiario) {
        try {
            return await this.findWithDetails({
                where: 'ce.id_pessoa_estagiario = ?',
                params: [idEstagiario],
                orderBy: 'ce.data_inicio DESC'
            });
        } catch (error) {
            console.error('Erro ao buscar estágios por estagiário:', error);
            throw new Error('Erro ao buscar estágios');
        }
    }

    /**
     * Busca estágios por orientador
     * @param {number} idOrientador - ID do orientador
     * @returns {Promise<Array>}
     */
    async findByOrientador(idOrientador) {
        try {
            return await this.findWithDetails({
                where: 'ce.id_pessoa_orientador = ?',
                params: [idOrientador],
                orderBy: 'ce.data_inicio DESC'
            });
        } catch (error) {
            console.error('Erro ao buscar estágios por orientador:', error);
            throw new Error('Erro ao buscar estágios');
        }
    }

    /**
     * Busca estágios por empresa
     * @param {number} idEmpresa - ID da empresa
     * @returns {Promise<Array>}
     */
    async findByEmpresa(idEmpresa) {
        try {
            return await this.findWithDetails({
                where: 'ce.id_pessoa_concedente = ?',
                params: [idEmpresa],
                orderBy: 'ce.data_inicio DESC'
            });
        } catch (error) {
            console.error('Erro ao buscar estágios por empresa:', error);
            throw new Error('Erro ao buscar estágios');
        }
    }

    /**
     * Busca estágios por status
     * @param {string} status - Status do estágio
     * @returns {Promise<Array>}
     */
    async findByStatus(status) {
        try {
            return await this.findWithDetails({
                where: 'ce.situacao = ?',
                params: [status],
                orderBy: 'ce.data_inicio DESC'
            });
        } catch (error) {
            console.error('Erro ao buscar estágios por status:', error);
            throw new Error('Erro ao buscar estágios');
        }
    }

    /**
     * Busca estágios ativos
     * @returns {Promise<Array>}
     */
    async findAtivos() {
        return await this.findByStatus(enums.statusEstagio.ATIVO);
    }

    /**
     * Busca estágios concluídos
     * @returns {Promise<Array>}
     */
    async findConcluidos() {
        return await this.findByStatus(enums.statusEstagio.CONCLUIDO);
    }

    /**
     * Busca estágios por período
     * @param {string} dataInicio - Data de início (YYYY-MM-DD)
     * @param {string} dataFim - Data de fim (YYYY-MM-DD)
     * @returns {Promise<Array>}
     */
    async findByPeriodo(dataInicio, dataFim) {
        try {
            return await this.findWithDetails({
                where: 'ce.data_inicio >= ? AND ce.data_fim <= ?',
                params: [dataInicio, dataFim],
                orderBy: 'ce.data_inicio DESC'
            });
        } catch (error) {
            console.error('Erro ao buscar estágios por período:', error);
            throw new Error('Erro ao buscar estágios');
        }
    }

    /**
     * Atualiza status do estágio
     * @param {number} id - ID do estágio
     * @param {string} novoStatus - Novo status
     * @returns {Promise<Object|null>}
     */
    async updateStatus(id, novoStatus) {
        try {
            // Verificar se o status é válido
            const statusValidos = ['Ativo', 'Concluído', 'Cancelado', 'Em edição', 'Aprovado'];
            if (!statusValidos.includes(novoStatus)) {
                throw new Error('Status inválido');
            }
            
            return await this.update(id, { situacao: novoStatus });
        } catch (error) {
            console.error('Erro ao atualizar status do estágio:', error);
            throw error;
        }
    }

    /**
     * Busca estatísticas de estágios
     * @returns {Promise<Object>}
     */
    async getEstatisticas() {
        try {
            const queries = {
            total: 'SELECT COUNT(*) as count FROM campo_estagio',
            ativos: `SELECT COUNT(*) as count FROM campo_estagio WHERE situacao = 'Ativo'`,
            concluidos: `SELECT COUNT(*) as count FROM campo_estagio WHERE situacao = 'Concluído'`,
            cancelados: `SELECT COUNT(*) as count FROM campo_estagio WHERE situacao = 'Cancelado'`,
            obrigatorios: `SELECT COUNT(*) as count FROM campo_estagio WHERE tipo_estagio = 'Obrigatório'`,
            naoObrigatorios: `SELECT COUNT(*) as count FROM campo_estagio WHERE tipo_estagio = 'Não Obrigatório'`
        };
            
            const estatisticas = {};
            
            for (const [key, query] of Object.entries(queries)) {
                const result = await databaseConfig.get(query);
                estatisticas[key] = result.count;
            }
            
            return estatisticas;
        } catch (error) {
            console.error('Erro ao buscar estatísticas de estágios:', error);
            throw new Error('Erro ao buscar estatísticas');
        }
    }

    /**
     * Validação específica do modelo Estágio
     * @param {Object} data - Dados a serem validados
     * @param {number} id - ID do registro (para atualizações)
     * @returns {Promise<void>}
     */
    async validate(data, id = null) {
        // Executar validação base
        await super.validate(data, id);
        
        // Validações específicas
        if (data.data_inicio && data.data_fim) {
            const dataInicio = new Date(data.data_inicio);
            const dataFim = new Date(data.data_fim);
            
            if (dataFim <= dataInicio) {
                throw new Error('Data de fim deve ser posterior à data de início');
            }
        }
        
        if (data.carga_horaria_total && data.carga_horaria_total <= 0) {
            throw new Error('Carga horária total deve ser maior que zero');
        }
        
        if (data.carga_horaria_semanal && data.carga_horaria_semanal <= 0) {
            throw new Error('Carga horária semanal deve ser maior que zero');
        }
        
        if (data.carga_horaria_semanal && data.carga_horaria_semanal > 40) {
            throw new Error('Carga horária semanal não pode exceder 40 horas');
        }
        
        if (data.valor_bolsa && data.valor_bolsa < 0) {
            throw new Error('Valor da bolsa não pode ser negativo');
        }
        
        if (data.tipo_estagio && !Object.values(enums.tipoEstagio).includes(data.tipo_estagio)) {
            throw new Error('Tipo de estágio inválido');
        }
        
        if (data.situacao && !['Ativo', 'Concluído', 'Cancelado', 'Em edição', 'Aprovado'].includes(data.situacao)) {
            throw new Error('Status de estágio inválido');
        }
        
        // Verificar se as pessoas existem
        if (data.id_pessoa_estagiario) {
            const estagiario = await databaseConfig.get(
                'SELECT id_pessoa FROM pessoa WHERE id_pessoa = ? AND ativo = 1',
                [data.id_pessoa_estagiario]
            );
            if (!estagiario) {
                throw new Error('Estagiário não encontrado');
            }
        }
        
        if (data.id_pessoa_orientador) {
            const orientador = await databaseConfig.get(
                'SELECT id_pessoa FROM pessoa WHERE id_pessoa = ? AND ativo = 1',
                [data.id_pessoa_orientador]
            );
            if (!orientador) {
                throw new Error('Orientador não encontrado');
            }
        }
    }
}

module.exports = Estagio;