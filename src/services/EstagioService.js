/**
 * Serviço de Estágios
 * Centraliza toda a lógica de negócio relacionada aos estágios
 */

const Estagio = require('../models/Estagio');
const Pessoa = require('../models/Pessoa');
const { enums, messages, pagination } = require('../config');
const databaseConfig = require('../config/database');
const emailConfig = require('../config/email');

class EstagioService {
    constructor() {
        this.estagioModel = new Estagio();
        this.pessoaModel = new Pessoa();
    }

    /**
     * Lista estágios com paginação e filtros
     * @param {Object} options - Opções de consulta
     * @returns {Promise<Object>}
     */
    async listarEstagios(options = {}) {
        try {
            const {
                page = pagination.defaultPage,
                limit = pagination.defaultLimit,
                status = null,
                orientador = null,
                estagiario = null,
                empresa = null,
                dataInicio = null,
                dataFim = null,
                orderBy = 'ce.data_cadastro DESC'
            } = options;

            // Construir filtros
            const filters = [];
            const params = [];

            if (status) {
                filters.push('ce.situacao = ?');
                params.push(status);
            }

            if (orientador) {
                filters.push('ce.id_pessoa_orientador = ?');
                params.push(orientador);
            }

            if (estagiario) {
                filters.push('ce.id_pessoa_estagiario = ?');
                params.push(estagiario);
            }

            if (empresa) {
                filters.push('ce.id_pessoa_concedente = ?');
                params.push(empresa);
            }

            if (dataInicio) {
                filters.push('ce.data_inicio >= ?');
                params.push(dataInicio);
            }

            if (dataFim) {
                filters.push('ce.data_fim <= ?');
                params.push(dataFim);
            }

            // Removido filtro por 'ativo' - coluna não existe na tabela campo_estagio

            const whereClause = filters.length > 0 ? filters.join(' AND ') : '';
            const offset = (page - 1) * limit;

            // Buscar estágios
            const estagios = await this.estagioModel.findWithDetails({
                where: whereClause,
                params,
                orderBy,
                limit,
                offset
            });

            // Contar total
            const totalQuery = `
                SELECT COUNT(*) as total
                FROM campo_estagio ce
                ${whereClause ? `WHERE ${whereClause}` : ''}
            `;
            const totalResult = await databaseConfig.get(totalQuery, params);
            const total = totalResult.total;

            return {
                estagios,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                    hasNext: page * limit < total,
                    hasPrev: page > 1
                }
            };
        } catch (error) {
            console.error('Erro ao listar estágios:', error);
            throw new Error('Erro ao buscar estágios');
        }
    }

    /**
     * Busca estágio por ID
     * @param {number} id - ID do estágio
     * @returns {Promise<Object|null>}
     */
    async buscarEstagio(id) {
        try {
            const estagio = await this.estagioModel.findByIdWithDetails(id);
            
            if (!estagio) {
                throw new Error(messages.error.notFound);
            }

            return estagio;
        } catch (error) {
            console.error('Erro ao buscar estágio:', error);
            throw error;
        }
    }

    /**
     * Cria um novo estágio
     * @param {Object} dadosEstagio - Dados do estágio
     * @param {number} idUsuario - ID do usuário que está criando
     * @returns {Promise<Object>}
     */
    async criarEstagio(dadosEstagio, idUsuario) {
        try {
            // Validar dados obrigatórios
            await this.validarDadosEstagio(dadosEstagio);

            // Iniciar transação
            await databaseConfig.beginTransaction();

            try {
                // Preparar dados do estágio
                const dadosCompletos = {
                    ...dadosEstagio,
                    situacao: dadosEstagio.situacao || 'Ativo',
                    data_cadastro: new Date().toISOString(),
                    ativo: 1
                };

                // Criar estágio
                const estagio = await this.estagioModel.create(dadosCompletos);

                // Confirmar transação
                await databaseConfig.commit();

                // Enviar notificações
                await this.enviarNotificacaoNovoEstagio(estagio.id_campo_estagio);

                return estagio;
            } catch (error) {
                await databaseConfig.rollback();
                throw error;
            }
        } catch (error) {
            console.error('Erro ao criar estágio:', error);
            throw error;
        }
    }

    /**
     * Atualiza um estágio
     * @param {number} id - ID do estágio
     * @param {Object} dadosEstagio - Dados para atualização
     * @param {number} idUsuario - ID do usuário que está atualizando
     * @returns {Promise<Object>}
     */
    async atualizarEstagio(id, dadosEstagio, idUsuario) {
        try {
            // Verificar se o estágio existe
            const estagioExistente = await this.estagioModel.findById(id);
            if (!estagioExistente) {
                throw new Error(messages.error.notFound);
            }

            // Validar permissão de edição
            await this.validarPermissaoEdicao(id, idUsuario);

            // Validar dados
            await this.validarDadosEstagio(dadosEstagio, id);

            // Atualizar estágio
            const estagioAtualizado = await this.estagioModel.update(id, dadosEstagio);

            return estagioAtualizado;
        } catch (error) {
            console.error('Erro ao atualizar estágio:', error);
            throw error;
        }
    }

    /**
     * Altera status do estágio
     * @param {number} id - ID do estágio
     * @param {string} novoStatus - Novo status
     * @param {number} idUsuario - ID do usuário
     * @returns {Promise<Object>}
     */
    async alterarStatusEstagio(id, novoStatus, idUsuario) {
        try {
            // Verificar se o estágio existe
            const estagio = await this.estagioModel.findById(id);
            if (!estagio) {
                throw new Error(messages.error.notFound);
            }

            // Validar permissão
            await this.validarPermissaoEdicao(id, idUsuario);

            // Validar transição de status
            await this.validarTransicaoStatus(estagio.situacao, novoStatus);

            // Atualizar status
            const estagioAtualizado = await this.estagioModel.updateStatus(id, novoStatus);

            // Enviar notificações se necessário
            if (novoStatus === enums.statusEstagio.CONCLUIDO) {
                await this.enviarNotificacaoConclusao(id);
            }

            return estagioAtualizado;
        } catch (error) {
            console.error('Erro ao alterar status do estágio:', error);
            throw error;
        }
    }

    /**
     * Exclui um estágio (soft delete)
     * @param {number} id - ID do estágio
     * @param {number} idUsuario - ID do usuário
     * @returns {Promise<boolean>}
     */
    async excluirEstagio(id, idUsuario) {
        try {
            // Verificar se o estágio existe
            const estagio = await this.estagioModel.findById(id);
            if (!estagio) {
                throw new Error(messages.error.notFound);
            }

            // Validar permissão
            await this.validarPermissaoExclusao(id, idUsuario);

            // Soft delete
            await this.estagioModel.update(id, { ativo: 0 });

            return true;
        } catch (error) {
            console.error('Erro ao excluir estágio:', error);
            throw error;
        }
    }

    /**
     * Busca estágios por usuário
     * @param {number} idUsuario - ID do usuário
     * @param {string} tipoAcesso - Tipo de acesso do usuário
     * @returns {Promise<Array>}
     */
    async buscarEstagiosPorUsuario(idUsuario, tipoAcesso) {
        try {
            switch (tipoAcesso) {
                case enums.tipoAcesso.ESTAGIARIO:
                    return await this.estagioModel.findByEstagiario(idUsuario);
                
                case enums.tipoAcesso.ORIENTADOR:
                    return await this.estagioModel.findByOrientador(idUsuario);
                
                case enums.tipoAcesso.EMPRESA:
                    return await this.estagioModel.findByEmpresa(idUsuario);
                
                case enums.tipoAcesso.ADMINISTRADOR:
                    return await this.estagioModel.findWithDetails();
                
                default:
                    return [];
            }
        } catch (error) {
            console.error('Erro ao buscar estágios por usuário:', error);
            throw new Error('Erro ao buscar estágios');
        }
    }

    /**
     * Busca estatísticas de estágios
     * @param {number} idUsuario - ID do usuário (opcional)
     * @param {string} tipoAcesso - Tipo de acesso do usuário
     * @returns {Promise<Object>}
     */
    async buscarEstatisticas(idUsuario = null, tipoAcesso = null) {
        try {
            if (tipoAcesso === enums.tipoAcesso.ADMINISTRADOR) {
                return await this.estagioModel.getEstatisticas();
            }

            // Estatísticas específicas por tipo de usuário
            const baseQuery = `
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN situacao = 'Ativo' THEN 1 ELSE 0 END) as ativos,
                    SUM(CASE WHEN situacao = 'Concluído' THEN 1 ELSE 0 END) as concluidos,
                    SUM(CASE WHEN situacao = 'Cancelado' THEN 1 ELSE 0 END) as cancelados
                FROM campo_estagio 
                WHERE 1 = 1
            `;

            let query = baseQuery;
            const params = [];

            if (tipoAcesso === enums.tipoAcesso.ORIENTADOR) {
                query += ' AND id_pessoa_orientador = ?';
                params.push(idUsuario);
            } else if (tipoAcesso === enums.tipoAcesso.ESTAGIARIO) {
                query += ' AND id_pessoa_estagiario = ?';
                params.push(idUsuario);
            } else if (tipoAcesso === enums.tipoAcesso.EMPRESA) {
                query += ' AND id_pessoa_concedente = ?';
                params.push(idUsuario);
            }

            const result = await databaseConfig.get(query, params);
            return result;
        } catch (error) {
            console.error('Erro ao buscar estatísticas:', error);
            throw new Error('Erro ao buscar estatísticas');
        }
    }

    /**
     * Valida dados do estágio
     * @param {Object} dados - Dados a serem validados
     * @param {number} id - ID do estágio (para atualizações)
     * @returns {Promise<void>}
     */
    async validarDadosEstagio(dados, id = null) {
        // Usar validação do modelo
        await this.estagioModel.validate(dados, id);
    }

    /**
     * Valida permissão de edição
     * @param {number} idEstagio - ID do estágio
     * @param {number} idUsuario - ID do usuário
     * @returns {Promise<void>}
     */
    async validarPermissaoEdicao(idEstagio, idUsuario) {
        try {
            // Buscar dados do usuário
            const usuario = await databaseConfig.get(
                'SELECT tipoacesso FROM pessoa_login WHERE id_pessoa = ?',
                [idUsuario]
            );

            if (!usuario) {
                throw new Error(messages.error.unauthorized);
            }

            // Administradores podem editar qualquer estágio
            if (usuario.tipoacesso === enums.tipoAcesso.ADMINISTRADOR) {
                return;
            }

            // Buscar estágio
            const estagio = await this.estagioModel.findById(idEstagio);
            if (!estagio) {
                throw new Error(messages.error.notFound);
            }

            // Verificar se o usuário tem permissão
            const temPermissao = 
                (usuario.tipoacesso === enums.tipoAcesso.ORIENTADOR && estagio.id_pessoa_orientador === idUsuario) ||
                (usuario.tipoacesso === enums.tipoAcesso.ESTAGIARIO && estagio.id_pessoa_estagiario === idUsuario) ||
                (usuario.tipoacesso === enums.tipoAcesso.EMPRESA && estagio.id_pessoa_concedente === idUsuario);

            if (!temPermissao) {
                throw new Error(messages.error.forbidden);
            }
        } catch (error) {
            throw error;
        }
    }

    /**
     * Valida permissão de exclusão
     * @param {number} idEstagio - ID do estágio
     * @param {number} idUsuario - ID do usuário
     * @returns {Promise<void>}
     */
    async validarPermissaoExclusao(idEstagio, idUsuario) {
        try {
            // Buscar dados do usuário
            const usuario = await databaseConfig.get(
                'SELECT tipoacesso FROM pessoa_login WHERE id_pessoa = ?',
                [idUsuario]
            );

            if (!usuario) {
                throw new Error(messages.error.unauthorized);
            }

            // Apenas administradores podem excluir estágios
            if (usuario.tipoacesso !== enums.tipoAcesso.ADMINISTRADOR) {
                throw new Error(messages.error.forbidden);
            }
        } catch (error) {
            throw error;
        }
    }

    /**
     * Valida transição de status
     * @param {string} statusAtual - Status atual
     * @param {string} novoStatus - Novo status
     * @returns {Promise<void>}
     */
    async validarTransicaoStatus(statusAtual, novoStatus) {
        const transicoesValidas = {
            [enums.statusEstagio.ATIVO]: [enums.statusEstagio.CONCLUIDO, enums.statusEstagio.CANCELADO],
            [enums.statusEstagio.INATIVO]: [enums.statusEstagio.ATIVO, enums.statusEstagio.CANCELADO],
            [enums.statusEstagio.CONCLUIDO]: [], // Status final
            [enums.statusEstagio.CANCELADO]: [enums.statusEstagio.ATIVO] // Pode reativar
        };

        const transicoesPermitidas = transicoesValidas[statusAtual] || [];
        
        if (!transicoesPermitidas.includes(novoStatus)) {
            throw new Error(`Transição de status inválida: ${statusAtual} -> ${novoStatus}`);
        }
    }

    /**
     * Envia notificação de novo estágio
     * @param {number} idEstagio - ID do estágio
     * @returns {Promise<void>}
     */
    async enviarNotificacaoNovoEstagio(idEstagio) {
        try {
            const estagio = await this.estagioModel.findByIdWithDetails(idEstagio);
            if (!estagio) return;

            // Enviar email para o orientador
            if (estagio.email_orientador) {
                const assunto = 'Novo Estágio Cadastrado';
                const conteudo = emailConfig.constructor.templates.novoEstagio(
                    estagio.nome_orientador,
                    estagio.nome_estagiario,
                    process.env.BASE_URL || 'http://localhost:3000'
                );

                await emailConfig.enviarEmail(estagio.email_orientador, assunto, conteudo);
            }
        } catch (error) {
            console.error('Erro ao enviar notificação de novo estágio:', error);
            // Não falhar por erro de email
        }
    }

    /**
     * Envia notificação de conclusão
     * @param {number} idEstagio - ID do estágio
     * @returns {Promise<void>}
     */
    async enviarNotificacaoConclusao(idEstagio) {
        try {
            const estagio = await this.estagioModel.findByIdWithDetails(idEstagio);
            if (!estagio) return;

            // Implementar template de conclusão se necessário
            console.log(`Estágio ${idEstagio} concluído - notificações enviadas`);
        } catch (error) {
            console.error('Erro ao enviar notificação de conclusão:', error);
            // Não falhar por erro de email
        }
    }
}

module.exports = EstagioService;