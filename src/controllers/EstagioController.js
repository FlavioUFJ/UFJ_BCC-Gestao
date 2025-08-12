/**
 * Controlador de Estágios
 * Gerencia todas as rotas relacionadas aos estágios
 */

const EstagioService = require('../services/EstagioService');
const CampoEstagioService = require('../services/CampoEstagioService');
const PlanoAtividadeService = require('../services/PlanoAtividadeService');
const FrequenciaService = require('../services/FrequenciaService');
const RelatorioService = require('../services/RelatorioService');
const Pessoa = require('../models/Pessoa');
const Parametro = require('../models/Parametro');
const { messages, enums, pagination } = require('../config');
const databaseConfig = require('../config/database');

class EstagioController {
    constructor() {
        this.estagioService = new EstagioService();
        this.campoEstagioService = new CampoEstagioService();
        this.planoAtividadeService = new PlanoAtividadeService();
        this.frequenciaService = new FrequenciaService();
        this.relatorioService = new RelatorioService();
        this.pessoaModel = new Pessoa();
        this.parametroModel = new Parametro();
    }

    /**
     * Lista estágios com paginação e filtros
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async index(req, res) {
        try {
            const {
                page = 1,
                limit = pagination.defaultLimit,
                status,
                orientador,
                estagiario,
                empresa,
                dataInicio,
                dataFim
            } = req.query;

            const user = req.session.user;
            let options = {
                page: parseInt(page),
                limit: parseInt(limit),
                status,
                orientador,
                estagiario,
                empresa,
                dataInicio,
                dataFim
            };

            // Filtrar por usuário se não for administrador
            if (user.nivelacesso !== 'Administrador') {
                // Buscar a categoria do usuário
                const usuarioSql = 'SELECT categoria FROM pessoa WHERE id_pessoa = ?';
                const usuario = await databaseConfig.get(usuarioSql, [user.id_pessoa]);
                const categoriaUsuario = usuario?.categoria;
                
                // Aplicar filtros baseados na categoria
                switch (categoriaUsuario) {
                    case '1': // Coordenador - nenhuma restrição
                        break;
                    case '2': // Professor Orientador
                        options.orientador = user.id_pessoa;
                        break;
                    case '3': // Aluno/Estagiário
                        options.estagiario = user.id_pessoa;
                        break;
                    case '4': // Concedente/Local de Estágio
                        options.empresa = user.id_pessoa;
                        break;
                    case '5': // Supervisor
                        // Para supervisor, filtrar estágios onde é supervisor
                        // Como a função listarEstagios não tem filtro por supervisor,
                        // vamos usar o filtro de empresa temporariamente
                        options.empresa = user.id_pessoa;
                        break;
                    case '6': // Instituição/Curso
                         // Para instituição/curso, precisamos filtrar por id_pessoa_curso
                         // Como a função listarEstagios não tem esse filtro específico,
                         // vamos implementar uma lógica alternativa
                         options.curso = user.id_pessoa;
                         break;
                    case '99': // Usuário Geral - sem acesso
                        options.estagiario = -1; // Força retorno vazio
                        break;
                    default:
                        options.estagiario = user.id_pessoa;
                        break;
                }
            }

            const result = await this.estagioService.listarEstagios(options);

            // Para requisições AJAX
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.json({
                    success: true,
                    data: result
                });
            }

            // Buscar dados para filtros
            const [orientadores, estagiarios, empresas] = await Promise.all([
                this.pessoaModel.findOrientadores(),
                this.pessoaModel.findEstagiarios(),
                this.pessoaModel.findEmpresas()
            ]);

            res.render('estagios/index', {
                title: 'Estágios',
                user,
                estagios: result.estagios,
                pagination: result.pagination,
                filters: {
                    status,
                    orientador,
                    estagiario,
                    empresa,
                    dataInicio,
                    dataFim
                },
                orientadores,
                estagiarios,
                empresas,
                statusOptions: Object.values(enums.statusEstagio),
                currentPage: 'estagios'
            });
        } catch (error) {
            console.error('Erro ao listar estágios:', error);
            
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(500).json({
                    success: false,
                    message: error.message || 'Erro ao buscar estágios'
                });
            }

            res.status(500).render('error', {
                title: 'Erro',
                message: 'Erro ao carregar estágios',
                error: { status: 500 },
                currentPage: 'error'
            });
        }
    }

    /**
     * Exibe formulário de criação de estágio
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async create(req, res) {
        try {
            // Buscar dados para o formulário
            const [orientadores, estagiarios, empresas] = await Promise.all([
                this.pessoaModel.findOrientadores(),
                this.pessoaModel.findEstagiarios(),
                this.pessoaModel.findEmpresas()
            ]);

            res.render('estagios/create', {
                title: 'Novo Estágio',
                user: req.session.user,
                orientadores,
                estagiarios,
                empresas,
                tipoEstagioOptions: Object.values(enums.tipoEstagio),
                statusOptions: Object.values(enums.statusEstagio),
                currentPage: 'estagios'
            });
        } catch (error) {
            console.error('Erro ao exibir formulário de criação:', error);
            res.status(500).render('error', {
                title: 'Erro',
                message: 'Erro ao carregar formulário',
                error: { status: 500 },
                currentPage: 'error'
            });
        }
    }

    /**
     * Processa criação de novo estágio
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async store(req, res) {
        try {
            const dadosEstagio = req.body;
            const idUsuario = req.session.user.id_pessoa;

            const estagio = await this.estagioService.criarEstagio(dadosEstagio, idUsuario);

            // Para requisições AJAX
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.json({
                    success: true,
                    message: messages.success.created,
                    data: estagio
                });
            }

            // Redirecionamento normal - removido referência ao campo_estagio
            res.redirect(`/estagios?success=${encodeURIComponent(messages.success.created)}`);
        } catch (error) {
            console.error('Erro ao criar estágio:', error);
            
            const errorMessage = error.message || 'Erro ao criar estágio';
            
            // Para requisições AJAX
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(400).json({
                    success: false,
                    message: errorMessage
                });
            }

            // Redirecionamento com erro
            res.redirect(`/estagios/create?error=${encodeURIComponent(errorMessage)}`);
        }
    }

    /**
     * Exibe detalhes de um estágio
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async show(req, res) {
        try {
            const { id } = req.params;
            const estagio = await this.estagioService.buscarEstagio(id);

            // Para requisições AJAX
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.json({
                    success: true,
                    data: estagio
                });
            }

            res.render('estagios/show', {
                title: `Estágio - ${estagio.nome_estagiario}`,
                user: req.session.user,
                estagio,
                success: req.query.success || null,
                error: req.query.error || null,
                currentPage: 'estagios'
            });
        } catch (error) {
            console.error('Erro ao buscar estágio:', error);
            
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(404).json({
                    success: false,
                    message: error.message || 'Estágio não encontrado'
                });
            }

            res.status(404).render('error', {
                title: 'Estágio não encontrado',
                message: error.message || 'O estágio solicitado não foi encontrado',
                error: { status: 404 },
                currentPage: 'error'
            });
        }
    }

    /**
     * Exibe formulário de edição de estágio
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async edit(req, res) {
        try {
            const { id } = req.params;
            const estagio = await this.estagioService.buscarEstagio(id);

            // Verificar permissão de edição
            await this.estagioService.validarPermissaoEdicao(id, req.session.user.id_pessoa);

            // Buscar dados para o formulário
            const [orientadores, estagiarios, empresas] = await Promise.all([
                this.pessoaModel.findOrientadores(),
                this.pessoaModel.findEstagiarios(),
                this.pessoaModel.findEmpresas()
            ]);

            res.render('estagios/edit', {
                title: `Editar Estágio - ${estagio.nome_estagiario}`,
                user: req.session.user,
                estagio,
                orientadores,
                estagiarios,
                empresas,
                tipoEstagioOptions: Object.values(enums.tipoEstagio),
                statusOptions: Object.values(enums.statusEstagio),
                error: req.query.error || null,
                currentPage: 'estagios'
            });
        } catch (error) {
            console.error('Erro ao exibir formulário de edição:', error);
            
            const status = error.message.includes('não encontrado') ? 404 : 
                          error.message.includes('negado') || error.message.includes('forbidden') ? 403 : 500;
            
            res.status(status).render('error', {
                title: 'Erro',
                message: error.message || 'Erro ao carregar formulário de edição',
                error: { status },
                currentPage: 'error'
            });
        }
    }

    /**
     * Processa atualização de estágio
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async update(req, res) {
        try {
            const { id } = req.params;
            const dadosEstagio = req.body;
            const idUsuario = req.session.user.id_pessoa;

            const estagioAtualizado = await this.estagioService.atualizarEstagio(id, dadosEstagio, idUsuario);

            // Para requisições AJAX
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.json({
                    success: true,
                    data: estagioAtualizado
                });
            }

            // Redirecionamento normal
            res.redirect(`/estagios/${id}`);
        } catch (error) {
            console.error('Erro ao atualizar estágio:', error);
            
            const errorMessage = error.message || 'Erro ao atualizar estágio';
            
            // Para requisições AJAX
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                const status = error.message.includes('não encontrado') ? 404 : 
                              error.message.includes('negado') || error.message.includes('forbidden') ? 403 : 400;
                
                return res.status(status).json({
                    success: false,
                    message: errorMessage
                });
            }

            // Redirecionamento com erro
            res.redirect(`/estagios/${req.params.id}/edit?error=${encodeURIComponent(errorMessage)}`);
        }
    }

    /**
     * Altera status do estágio
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async updateStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const idUsuario = req.session.user.id_pessoa;

            if (!status) {
                return res.status(400).json({
                    success: false,
                    message: 'Status é obrigatório'
                });
            }

            const estagioAtualizado = await this.estagioService.alterarStatusEstagio(id, status, idUsuario);

            res.json({
                success: true,
                message: 'Status atualizado com sucesso',
                data: estagioAtualizado
            });
        } catch (error) {
            console.error('Erro ao alterar status:', error);
            
            const status = error.message.includes('não encontrado') ? 404 : 
                          error.message.includes('negado') || error.message.includes('forbidden') ? 403 : 400;
            
            res.status(status).json({
                success: false,
                message: error.message || 'Erro ao alterar status'
            });
        }
    }

    /**
     * Exclui um estágio
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async destroy(req, res) {
        try {
            const { id } = req.params;
            const idUsuario = req.session.user.id_pessoa;

            await this.estagioService.excluirEstagio(id, idUsuario);

            // Para requisições AJAX
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.json({
                    success: true,
                    message: messages.success.deleted
                });
            }

            // Redirecionamento normal
            res.redirect(`/estagios?success=${encodeURIComponent(messages.success.deleted)}`);
        } catch (error) {
            console.error('Erro ao excluir estágio:', error);
            
            const errorMessage = error.message || 'Erro ao excluir estágio';
            
            // Para requisições AJAX
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                const status = error.message.includes('não encontrado') ? 404 : 
                              error.message.includes('negado') || error.message.includes('forbidden') ? 403 : 500;
                
                return res.status(status).json({
                    success: false,
                    message: errorMessage
                });
            }

            // Redirecionamento com erro
            res.redirect(`/estagios?error=${encodeURIComponent(errorMessage)}`);
        }
    }

    /**
     * Exibe dashboard com estatísticas
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async dashboard(req, res) {
        try {
            const user = req.session.user;
            
            let estatisticas = {
                total: 0,
                ativos: 0,
                concluidos: 0,
                cancelados: 0
            };
            let estagiosRecentes = [];
            let modulos = [];

            // PRIMEIRO: Buscar módulos (independente de outros erros)
            try {
                console.log('=== INICIANDO BUSCA DE MÓDULOS ===');
                console.log('ID do usuário:', user.id_pessoa);
                
                // Buscar todos os módulos
                modulos = await this.buscarModulos();
                console.log('=== MÓDULOS RETORNADOS ===', modulos);
                
                // Buscar módulos ativos para o usuário
                const modulosAtivosUsuario = await this.buscaModuloAtivoPessoa(user.id_pessoa);
                console.log('=== MÓDULOS ATIVOS DO USUÁRIO ===', modulosAtivosUsuario);
                
                // Marcar quais módulos o usuário tem acesso
                modulos = modulos.map(modulo => ({
                    ...modulo,
                    tem_acesso: modulosAtivosUsuario.includes(modulo.id_modulo)
                }));
                
                console.log('=== MÓDULOS COM ACESSO MARCADO ===', modulos);
            } catch (error) {
                console.error('=== ERRO AO BUSCAR MÓDULOS ===', error);
                // Usar array vazio em caso de erro
            }

            try {
                // Buscar estatísticas
                estatisticas = await this.estagioService.buscarEstatisticas(
                    user.id_pessoa, 
                    user.nivelacesso
                );
            } catch (error) {
                console.error('Erro ao buscar estatísticas:', error);
                // Usar valores padrão em caso de erro
            }

            try {
                // Buscar estágios recentes do usuário
                estagiosRecentes = await this.estagioService.buscarEstagiosPorUsuario(
                    user.id_pessoa, 
                    user.nivelacesso
                );
            } catch (error) {
                console.error('Erro ao buscar estágios recentes:', error);
                // Usar array vazio em caso de erro
            }

            // Para requisições AJAX
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.json({
                    success: true,
                    data: {
                        estatisticas,
                        estagiosRecentes: estagiosRecentes.slice(0, 5) // Últimos 5
                    }
                });
            }

            res.render('modulos-paginaprincipal', {
                title: 'Dashboard',
                user,
                estatisticas,
                estagiosRecentes: estagiosRecentes.slice(0, 5),
                modulos: modulos,
                currentPage: 'dashboard',
                currentUrl: req.originalUrl
            });
        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
            
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(500).json({
                    success: false,
                    message: 'Erro ao carregar dashboard'
                });
            }

            res.status(500).render('error', {
                title: 'Erro',
                message: 'Erro ao carregar dashboard',
                error: { status: 500 },
                currentPage: 'error'
            });
        }
    }

    /**
     * Busca estágios por usuário (API)
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async getByUser(req, res) {
        try {
            const { userId, userType } = req.params;
            
            // Verificar permissão
            if (req.session.user.nivelacesso !== enums.nivelAcesso.ADMINISTRADOR && 
                req.session.user.id_pessoa !== parseInt(userId)) {
                return res.status(403).json({
                    success: false,
                    message: messages.error.forbidden
                });
            }

            const estagios = await this.estagioService.buscarEstagiosPorUsuario(
                parseInt(userId), 
                userType
            );

            res.json({
                success: true,
                data: estagios
            });
        } catch (error) {
            console.error('Erro ao buscar estágios por usuário:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Erro ao buscar estágios'
            });
        }
    }

    /**
     * Busca todos os módulos do sistema
     * @returns {Promise<Array>}
     */
    async buscarModulos() {
        try {
            console.log('Iniciando busca de módulos...');
            // Buscar todos os módulos cadastrados
            
            const queryModulos = `
                SELECT 
                    m.id_modulo,
                    m.nome,
                    m.descricao,
                    m.icone,
                    m.cor,
                    m.url,
                    m.ordem
                FROM modulos m
                ORDER BY m.ordem
            `;

            const modulos = await databaseConfig.all(queryModulos, []);
            console.log('Módulos encontrados:', modulos.length, modulos);
            return modulos;
        } catch (error) {
            console.error('Erro ao buscar módulos com acesso:', error);
            throw error;
        }
    }

    /**
     * Busca módulos ativos para uma pessoa específica
     * @param {number} id_pessoa - ID da pessoa
     * @returns {Promise<Array>} Array com os IDs dos módulos ativos
     */
    async buscaModuloAtivoPessoa(id_pessoa) {
        try {
            console.log('Iniciando busca de módulos ativos para pessoa:', id_pessoa);
            
            const queryModulosAtivos = `
                SELECT 
                    m.id_modulo 
                FROM 
                    pessoa AS p 
                INNER JOIN pessoa_modulos AS pm ON pm.id_pessoa = p.id_pessoa 
                INNER JOIN modulos AS m ON pm.id_modulo = m.id_modulo 
                WHERE 
                    p.id_pessoa = ? AND pm.ativo = 1
            `;

            const modulosAtivos = await databaseConfig.all(queryModulosAtivos, [id_pessoa]);
            console.log('Módulos ativos encontrados para pessoa', id_pessoa, ':', modulosAtivos);
            
            // Retornar apenas os IDs dos módulos
            return modulosAtivos.map(modulo => modulo.id_modulo);
        } catch (error) {
            console.error('Erro ao buscar módulos ativos da pessoa:', error);
            throw error;
        }
    }

    /**
     * Dashboard específico do módulo Estágio
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async estagioModuleDashboard(req, res) {
        try {
            const user = req.session.user;
            
            // Buscar dados específicos de cada card do módulo Estágio
            let camposEstagio = [];
            let planosAtividade = [];
            let frequencias = [];
            let relatorios = [];
            
            let estatisticasCampoEstagio = { total: 0, ativos: 0, concluidos: 0, cancelados: 0 };
            let estatisticasPlanoAtividade = { total: 0, aprovados: 0, pendentes: 0, rejeitados: 0 };
            let estatisticasFrequencia = { total: 0, aprovadas: 0, pendentes: 0, rejeitadas: 0 };
            let estatisticasRelatorio = { total: 0, aprovados: 0, pendentes: 0, rejeitados: 0 };

            try {
                // Buscar dados de Campo de Estágio
                camposEstagio = await this.campoEstagioService.buscarCamposEstagiosPorUsuario(
                    user.id_pessoa, 
                    user.nivelacesso
                );
                estatisticasCampoEstagio = await this.campoEstagioService.buscarEstatisticasCampoEstagio(
                    user.id_pessoa, 
                    user.nivelacesso
                );
            } catch (error) {
                console.error('Erro ao buscar dados de Campo de Estágio:', error);
            }

            try {
                // Buscar dados de Plano de Atividade
                planosAtividade = await this.planoAtividadeService.buscarPlanosAtividadePorUsuario(
                    user.id_pessoa, 
                    user.nivelacesso
                );
                estatisticasPlanoAtividade = await this.planoAtividadeService.buscarEstatisticasPlanoAtividade(
                    user.id_pessoa, 
                    user.nivelacesso
                );
            } catch (error) {
                console.error('Erro ao buscar dados de Plano de Atividade:', error);
            }

            try {
                // Buscar dados de Frequência (em desenvolvimento)
                frequencias = await this.frequenciaService.buscarFrequenciasPorUsuario(
                    user.id_pessoa, 
                    user.nivelacesso
                );
                estatisticasFrequencia = await this.frequenciaService.buscarEstatisticasFrequencia(
                    user.id_pessoa, 
                    user.nivelacesso
                );
            } catch (error) {
                console.error('Erro ao buscar dados de Frequência:', error);
            }

            try {
                // Buscar dados de Relatórios (em desenvolvimento)
                relatorios = await this.relatorioService.buscarRelatoriosPorUsuario(
                    user.id_pessoa, 
                    user.nivelacesso
                );
                estatisticasRelatorio = await this.relatorioService.buscarEstatisticasRelatorio(
                    user.id_pessoa, 
                    user.nivelacesso
                );
            } catch (error) {
                console.error('Erro ao buscar dados de Relatórios:', error);
            }

            res.render('dashboard-estagio', {
                title: 'Módulo Estágio',
                user,
                camposEstagio,
                planosAtividade,
                frequencias,
                relatorios,
                estatisticasCampoEstagio,
                estatisticasPlanoAtividade,
                estatisticasFrequencia,
                estatisticasRelatorio,
                currentPage: 'estagio',
                currentUrl: req.originalUrl
            });
        } catch (error) {
            console.error('Erro ao carregar dashboard do módulo Estágio:', error);
            
            res.status(500).render('error', {
                title: 'Erro',
                message: 'Erro ao carregar módulo Estágio',
                error: { status: 500 },
                currentPage: 'error'
            });
        }
    }
}

module.exports = EstagioController;