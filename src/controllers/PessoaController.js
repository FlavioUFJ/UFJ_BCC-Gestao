/**
 * Controlador de Pessoas
 * Gerencia todas as rotas relacionadas às pessoas/usuários
 */

const Pessoa = require('../models/Pessoa');
const { messages, enums, pagination } = require('../config');
const bcrypt = require('bcrypt');
const Helpers = require('../utils/helpers');

class PessoaController {
    constructor() {
        this.pessoaModel = new Pessoa();
    }

    /**
     * Lista pessoas com paginação e filtros
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async index(req, res) {
        try {
            const {
                page = 1,
                limit = pagination.defaultLimit,
                tipo,
                search,
                ativo
            } = req.query;

            const options = {
                page: parseInt(page),
                limit: parseInt(limit),
                where: {}
            };

            // Aplicar filtros
            if (tipo) {
                options.where.nivelacesso = tipo;
            }

            if (ativo !== undefined) {
                options.where.ativo = ativo === 'true';
            }

            if (search) {
                options.search = search;
            }

            const result = await this.pessoaModel.findAll(options);

            // Para requisições AJAX
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.json({
                    success: true,
                    data: result
                });
            }

            res.render('pessoas/index', {
                title: 'Pessoas',
                user: req.session.user,
                pessoas: result.data,
                pagination: result.pagination,
                filters: {
                    tipo,
                    search,
                    ativo
                },
                nivelAcessoOptions: Object.values(enums.nivelAcesso),
                currentPage: 'pessoas'
            });
        } catch (error) {
            console.error('Erro ao listar pessoas:', error);
            
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(500).json({
                    success: false,
                    message: error.message || 'Erro ao buscar pessoas'
                });
            }

            res.status(500).render('error', {
                title: 'Erro',
                message: 'Erro ao carregar pessoas',
                error: { status: 500 },
                currentPage: 'error'
            });
        }
    }

    /**
     * Exibe formulário de criação de pessoa
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async create(req, res) {
        try {
            res.render('pessoas/create', {
                title: 'Nova Pessoa',
                user: req.session.user,
                nivelAcessoOptions: Object.values(enums.nivelAcesso),
                currentPage: 'pessoas'
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
     * Processa criação de nova pessoa
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async store(req, res) {
        try {
            // Definir request atual no modelo para verificações de segurança
            this.pessoaModel.setCurrentRequest(req);
            
            const dadosPessoa = req.body;
            
            // DEBUG: Log dos dados recebidos
            
            
            // Limpar máscaras de formatação antes de salvar
            if (dadosPessoa.telefone) {
                dadosPessoa.telefone = dadosPessoa.telefone.replace(/\D/g, '');
            }
            
            if (dadosPessoa.cnpj_cpf) {
                dadosPessoa.cnpj_cpf = dadosPessoa.cnpj_cpf.replace(/\D/g, '');
            }

            // Mapear valores do tipo para os códigos do banco de dados
            if (dadosPessoa.tipo) {
                const tipoMap = {
                    'pessoa_fisica': 'F',
                    'pessoa_juridica': 'J',
                    'nao_informado': 'N',
                    'F': 'F',
                    'J': 'J', 
                    'N': 'N'
                };
                
                // Mapear o valor ou manter se já é um código válido
                dadosPessoa.tipo = tipoMap[dadosPessoa.tipo] || dadosPessoa.tipo;
            }
            
            // Validar dados de login se fornecidos
            if (dadosPessoa.nivelAcesso && !dadosPessoa.statusLogin) {
                throw new Error('Status do login é obrigatório quando nível de acesso é fornecido');
            }
            
            if (dadosPessoa.statusLogin && !dadosPessoa.nivelAcesso) {
                throw new Error('Nível de acesso é obrigatório quando status do login é fornecido');
            }
            
            // Validar módulos se fornecidos
            if (dadosPessoa.modulos && (!Array.isArray(dadosPessoa.modulos) || dadosPessoa.modulos.length === 0)) {
                throw new Error('Pelo menos um módulo deve ser selecionado');
            }
            
            // Validar dados obrigatórios
            const camposObrigatorios = ['nome', 'email'];
            for (const campo of camposObrigatorios) {
                if (!dadosPessoa[campo]) {
                    throw new Error(`Campo ${campo} é obrigatório`);
                }
            }
            
            // Validar dados de login obrigatórios
            if (!dadosPessoa.nivelAcesso) {
                throw new Error('Nível de acesso é obrigatório');
            }
            
            if (!dadosPessoa.statusLogin) {
                throw new Error('Status do login é obrigatório');
            }
            
            // Validar módulos obrigatórios
            if (!dadosPessoa.modulos || !Array.isArray(dadosPessoa.modulos) || dadosPessoa.modulos.length === 0) {
                throw new Error('Pelo menos um módulo deve ser selecionado');
            }

            // Verificar se email já existe
            const pessoaExistente = await this.pessoaModel.findByEmail(dadosPessoa.email);
            if (pessoaExistente) {
                throw new Error('Email já está em uso');
            }

            // Criar pessoa
            const pessoa = await this.pessoaModel.create(dadosPessoa);

            // Criar login obrigatório
            await this.createPessoaLogin(pessoa.id_pessoa, {
                nivelacesso: dadosPessoa.nivelAcesso,
                status: dadosPessoa.statusLogin
            });
            
            // Criar vínculos com módulos
            await this.createPessoaModulos(pessoa.id_pessoa, dadosPessoa.modulos);

            // Para requisições AJAX
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.json({
                    success: true,
                    message: messages.success.created,
                    data: pessoa
                });
            }

            // Redirecionamento normal
            res.redirect(`/pessoas/${pessoa.id_pessoa}?success=${encodeURIComponent(messages.success.created)}`);
        } catch (error) {
            console.error('Erro ao criar pessoa:', error);
            
            const errorMessage = error.message || 'Erro ao criar pessoa';
            
            // Para requisições AJAX
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(400).json({
                    success: false,
                    message: errorMessage
                });
            }

            // Redirecionamento com erro
            res.redirect(`/pessoas/create?error=${encodeURIComponent(errorMessage)}`);
        }
    }

    /**
     * Exibe detalhes de uma pessoa
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async show(req, res) {
        // console.log(`[DEBUG] Método show chamado para pessoa ID: ${req.params.id}`);
        try {
            const { id } = req.params;
            const pessoa = await this.pessoaModel.findById(id);

            if (!pessoa) {
                throw new Error('Pessoa não encontrada');
            }
            
            // console.log(`[DEBUG] Pessoa encontrada no show:`, { id: pessoa.id_pessoa, nome: pessoa.nome });

            // Buscar dados de login da pessoa
            const databaseConfig = require('../config/database');
            const loginData = await databaseConfig.get(
                'SELECT nivelacesso, status FROM pessoa_login WHERE id_pessoa = ?',
                [id]
            );
            
            // console.log(`[DEBUG] Dados de login para pessoa ${id}:`, loginData);

            // Buscar módulos vinculados à pessoa
            const modulosVinculados = await databaseConfig.all(
                'SELECT id_modulo FROM pessoa_modulos WHERE id_pessoa = ? AND ativo = 1',
                [id]
            );
            
            // console.log(`[DEBUG] Módulos vinculados para pessoa ${id}:`, modulosVinculados);

            // Adicionar dados de login e módulos ao objeto pessoa
            if (loginData) {
                pessoa.nivelAcesso = loginData.nivelacesso;
                pessoa.statusLogin = loginData.status;
                // console.log(`[DEBUG] Dados adicionados ao objeto pessoa - nivelAcesso: ${pessoa.nivelAcesso}, statusLogin: ${pessoa.statusLogin}`);
            } else {
                // console.log(`[DEBUG] Nenhum dado de login encontrado para pessoa ${id}`);
            }
            
            pessoa.modulos = modulosVinculados.map(m => m.id_modulo);
            // console.log(`[DEBUG] Objeto pessoa final no show:`, { id: pessoa.id_pessoa, nome: pessoa.nome, nivelAcesso: pessoa.nivelAcesso, statusLogin: pessoa.statusLogin, modulos: pessoa.modulos });

            // Para requisições AJAX
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.json({
                    success: true,
                    data: pessoa
                });
            }

            res.render('pessoas/show', {
                title: `Pessoa - ${pessoa.nome}`,
                user: req.session.user,
                pessoa,
                success: req.query.success || null,
                error: req.query.error || null,
                currentPage: 'pessoas'
            });
        } catch (error) {
            console.error('Erro ao buscar pessoa:', error);
            
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(404).json({
                    success: false,
                    message: error.message || 'Pessoa não encontrada'
                });
            }

            res.status(404).render('error', {
                title: 'Pessoa não encontrada',
                message: error.message || 'A pessoa solicitada não foi encontrada',
                error: { status: 404 },
                currentPage: 'error'
            });
        }
    }

    /**
     * Exibe formulário de edição de pessoa
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async edit(req, res) {
        // console.log(`[DEBUG] Método edit chamado para pessoa ID: ${req.params.id}`);
        try {
            const { id } = req.params;
            const pessoa = await this.pessoaModel.findById(id);
            // console.log(`[DEBUG] Pessoa encontrada:`, pessoa ? { id: pessoa.id_pessoa, nome: pessoa.nome } : 'null');

            if (!pessoa) {
                throw new Error('Pessoa não encontrada');
            }

            // Verificar permissão de edição
            const user = req.session.user;
            if (user.nivelacesso !== enums.nivelAcesso.ADMINISTRADOR && 
                user.id_pessoa !== parseInt(id)) {
                throw new Error('Acesso negado');
            }

            // Buscar dados de login da pessoa
            const databaseConfig = require('../config/database');
            const loginData = await databaseConfig.get(
                'SELECT nivelacesso, status FROM pessoa_login WHERE id_pessoa = ?',
                [id]
            );
            
            // console.log(`[DEBUG] Dados de login para pessoa ${id}:`, loginData);

            // Buscar módulos vinculados à pessoa
            const modulosVinculados = await databaseConfig.all(
                'SELECT id_modulo FROM pessoa_modulos WHERE id_pessoa = ? AND ativo = 1',
                [id]
            );
            
            // console.log(`[DEBUG] Módulos vinculados para pessoa ${id}:`, modulosVinculados);

            // Adicionar dados de login e módulos ao objeto pessoa
            if (loginData) {
                pessoa.nivelAcesso = loginData.nivelacesso;
                pessoa.statusLogin = loginData.status;
                // console.log(`[DEBUG] Dados adicionados ao objeto pessoa - nivelAcesso: ${pessoa.nivelAcesso}, statusLogin: ${pessoa.statusLogin}`);
            } else {
                // console.log(`[DEBUG] Nenhum dado de login encontrado para pessoa ${id}`);
            }
            
            pessoa.modulos = modulosVinculados.map(m => m.id_modulo);
            // console.log(`[DEBUG] Objeto pessoa final:`, { id: pessoa.id_pessoa, nome: pessoa.nome, nivelAcesso: pessoa.nivelAcesso, statusLogin: pessoa.statusLogin, modulos: pessoa.modulos });

            res.render('admin-pessoa-form', {
                title: `Editar Pessoa - ${pessoa.nome}`,
                user,
                pessoa,
                isEdit: true,
                nivelAcessoOptions: Object.values(enums.nivelAcesso),
                error: req.query.error || null,
                currentPage: 'pessoas'
            });
        } catch (error) {
            console.error('Erro ao exibir formulário de edição:', error);
            
            const status = error.message.includes('não encontrada') ? 404 : 
                          error.message.includes('negado') ? 403 : 500;
            
            res.status(status).render('error', {
                title: 'Erro',
                message: error.message || 'Erro ao carregar formulário de edição',
                error: { status },
                currentPage: 'error'
            });
        }
    }

    /**
     * Processa atualização de pessoa
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async update(req, res) {
        try {
            // Definir request atual no modelo para verificações de segurança
            this.pessoaModel.setCurrentRequest(req);
            
            const { id } = req.params;
            const dadosPessoa = req.body;
            const user = req.session.user;
            
            console.log('=== DEBUG UPDATE PESSOA ===');
            console.log('ID da pessoa:', id);
            console.log('Dados recebidos:', JSON.stringify(dadosPessoa, null, 2));
            console.log('Usuário logado:', user ? user.id_pessoa : 'não logado');

            // Limpar máscaras de formatação antes de salvar
            if (dadosPessoa.telefone) {
                dadosPessoa.telefone = dadosPessoa.telefone.replace(/\D/g, '');
            }
            
            if (dadosPessoa.cnpj_cpf) {
                dadosPessoa.cnpj_cpf = dadosPessoa.cnpj_cpf.replace(/\D/g, '');
            }

            // Mapear valores do tipo para os códigos do banco de dados
            if (dadosPessoa.tipo) {
                const tipoMap = {
                    'F': 'F',
                    'J': 'J', 
                    'N': 'N'
                };
                
                // Se o valor já é um código válido, manter
                if (tipoMap[dadosPessoa.tipo]) {
                    dadosPessoa.tipo = tipoMap[dadosPessoa.tipo];
                }
            }

            // Verificar permissão de edição
            if (user.nivelacesso !== enums.nivelAcesso.ADMINISTRADOR && 
                user.id_pessoa !== parseInt(id)) {
                throw new Error('Acesso negado');
            }

            // Verificar se pessoa existe
            console.log('Verificando se pessoa existe...');
            const pessoaExistente = await this.pessoaModel.findById(id);
            console.log('Pessoa existente:', pessoaExistente ? 'encontrada' : 'não encontrada');
            if (!pessoaExistente) {
                throw new Error('Pessoa não encontrada');
            }

            // Verificar se email já está em uso por outra pessoa
            if (dadosPessoa.email && dadosPessoa.email !== pessoaExistente.email) {
                const emailEmUso = await this.pessoaModel.findByEmail(dadosPessoa.email);
                if (emailEmUso && emailEmUso.id_pessoa !== parseInt(id)) {
                    throw new Error('Email já está em uso');
                }
            }

            // Atualizar pessoa
            console.log('Iniciando atualização da pessoa...');
            console.log('Dados filtrados para atualização:', dadosPessoa);
            const pessoaAtualizada = await this.pessoaModel.update(id, dadosPessoa);
            console.log('Pessoa atualizada com sucesso:', pessoaAtualizada ? 'sim' : 'não');
            
            // Atualizar login se fornecido
            if (dadosPessoa.nivelAcesso && dadosPessoa.statusLogin) {
                await this.updatePessoaLogin(id, {
                    nivelacesso: dadosPessoa.nivelAcesso,
                    status: dadosPessoa.statusLogin
                });
            }
            
            // Atualizar módulos se fornecidos
            if (dadosPessoa.modulos) {
                await this.updatePessoaModulos(id, dadosPessoa.modulos);
            }

            // Debug headers para verificar detecção AJAX
            // console.log('=== DEBUG HEADERS ===');
            // console.log('req.xhr:', req.xhr);
            // console.log('accept header:', req.headers.accept);
            // console.log('content-type header:', req.headers['content-type']);
            // console.log('all headers:', req.headers);
            
            // Para requisições AJAX (incluindo fetch)
            const isAjax = req.xhr || 
                          req.headers.accept?.indexOf('json') > -1 || 
                          req.headers['content-type']?.indexOf('json') > -1 ||
                          req.headers['x-requested-with'] === 'XMLHttpRequest';
            
            // console.log('É requisição AJAX?', isAjax);
            
            if (isAjax) {
                // console.log('Retornando JSON response');
                return res.json({
                    success: true,
                    data: pessoaAtualizada,
                    message: 'Pessoa atualizada com sucesso!'
                });
            }
            
            // console.log('Fazendo redirecionamento...');

            // Verificar se é atualização de perfil (quando vem da rota /pessoas/profile)
            const isProfileUpdate = req.originalUrl.includes('/profile') || req.path.includes('/profile');
            
            if (isProfileUpdate) {
                // Para perfil, redirecionar para a página de origem ou dashboard
                const returnUrl = req.body.returnUrl || req.query.returnUrl || req.get('referer') || '/dashboard';
                res.redirect(`${returnUrl}?success=${encodeURIComponent('Perfil atualizado com sucesso!')}`);
            } else {
                // Redirecionamento normal para outras atualizações
                res.redirect(`/pessoas/${id}`);
            }
        } catch (error) {
            console.error('Erro ao atualizar pessoa:', error);
            
            const errorMessage = error.message || 'Erro ao atualizar pessoa';
            
            // Para requisições AJAX (incluindo fetch)
            if (req.xhr || req.headers.accept?.indexOf('json') > -1 || req.headers['content-type']?.indexOf('json') > -1 || req.headers['x-requested-with'] === 'XMLHttpRequest') {
                const status = error.message.includes('não encontrada') ? 404 : 
                              error.message.includes('negado') ? 403 : 400;
                
                return res.status(status).json({
                    success: false,
                    message: errorMessage
                });
            }

            // Verificar se é atualização de perfil para redirecionar adequadamente
            const isProfileUpdate = req.originalUrl.includes('/profile') || req.path.includes('/profile');
            
            if (isProfileUpdate) {
                // Para perfil, redirecionar para a página de origem ou dashboard com erro
                const returnUrl = req.body.returnUrl || req.query.returnUrl || req.get('referer') || '/dashboard';
                res.redirect(`${returnUrl}?error=${encodeURIComponent(errorMessage)}`);
            } else {
                // Redirecionamento com erro para outras atualizações
                res.redirect(`/pessoas/${req.params.id}/edit?error=${encodeURIComponent(errorMessage)}`);
            }
        }
    }

    /**
     * Altera status ativo/inativo da pessoa
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async toggleStatus(req, res) {
        try {
            const { id } = req.params;
            const { ativo } = req.body;

            // Verificar se é administrador
            if (req.session.user.nivelacesso !== enums.nivelAcesso.ADMINISTRADOR) {
                return res.status(403).json({
                    success: false,
                    message: messages.error.forbidden
                });
            }

            const pessoa = await this.pessoaModel.findById(id);
            if (!pessoa) {
                return res.status(404).json({
                    success: false,
                    message: 'Pessoa não encontrada'
                });
            }

            // Atualizar status
            await this.pessoaModel.update(id, { ativo: ativo === true || ativo === 'true' });

            res.json({
                success: true,
                message: 'Status atualizado com sucesso'
            });
        } catch (error) {
            console.error('Erro ao alterar status:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Erro ao alterar status'
            });
        }
    }

    /**
     * Gerencia login da pessoa
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async manageLogin(req, res) {
        try {
            const { id } = req.params;
            const { action, usuario, senha, ativo } = req.body;

            // Verificar se é administrador
            if (req.session.user.nivelacesso !== enums.nivelAcesso.ADMINISTRADOR) {
                return res.status(403).json({
                    success: false,
                    message: messages.error.forbidden
                });
            }

            const pessoa = await this.pessoaModel.findById(id);
            if (!pessoa) {
                return res.status(404).json({
                    success: false,
                    message: 'Pessoa não encontrada'
                });
            }

            let message = '';

            switch (action) {
                case 'create':
                    if (!senha) {
                        throw new Error('Senha é obrigatória');
                    }
                    await this.pessoaModel.createLogin(id, { senha });
                    message = 'Login criado com sucesso';
                    break;

                case 'update_password':
                    if (!senha) {
                        throw new Error('Nova senha é obrigatória');
                    }
                    await this.pessoaModel.updatePassword(id, senha);
                    message = 'Senha atualizada com sucesso';
                    break;

                case 'toggle_status':
                    await this.pessoaModel.toggleLoginStatus(id, ativo === true || ativo === 'true');
                    message = 'Status do login atualizado com sucesso';
                    break;

                default:
                    throw new Error('Ação inválida');
            }

            res.json({
                success: true,
                message
            });
        } catch (error) {
            console.error('Erro ao gerenciar login:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Erro ao gerenciar login'
            });
        }
    }

    /**
     * Exclui uma pessoa
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async destroy(req, res) {
        try {
            // Definir request atual no modelo para verificações de segurança
            this.pessoaModel.setCurrentRequest(req);
            
            const { id } = req.params;

            // Verificar se é administrador
            if (req.session.user.nivelacesso !== enums.nivelAcesso.ADMINISTRADOR) {
                return res.status(403).json({
                    success: false,
                    message: messages.error.forbidden
                });
            }

            // Não permitir auto-exclusão
            if (req.session.user.id_pessoa === parseInt(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Não é possível excluir seu próprio usuário'
                });
            }

            const pessoa = await this.pessoaModel.findById(id);
            if (!pessoa) {
                return res.status(404).json({
                    success: false,
                    message: 'Pessoa não encontrada'
                });
            }

            // Verificar se pessoa tem estágios associados
            // TODO: Implementar verificação de relacionamentos

            await this.pessoaModel.delete(id);

            // Para requisições AJAX
            if (req.xhr || req.headers.accept?.indexOf('json') > -1 || req.headers['x-requested-with'] === 'XMLHttpRequest') {
                return res.json({
                    success: true,
                    message: messages.success.deleted
                });
            }

            // Redirecionamento normal
            res.redirect(`/pessoas?success=${encodeURIComponent(messages.success.deleted)}`);
        } catch (error) {
            console.error('Erro ao excluir pessoa:', error);
            
            const errorMessage = error.message || 'Erro ao excluir pessoa';
            
            // Para requisições AJAX
            if (req.xhr || req.headers.accept?.indexOf('json') > -1 || req.headers['x-requested-with'] === 'XMLHttpRequest') {
                return res.status(500).json({
                    success: false,
                    message: errorMessage
                });
            }

            // Redirecionamento com erro
            res.redirect(`/pessoas?error=${encodeURIComponent(errorMessage)}`);
        }
    }

    /**
     * Busca pessoas por tipo (API)
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async getByType(req, res) {
        try {
            const { tipo } = req.params;
            const { search } = req.query;

            let pessoas;
            switch (tipo) {
                case 'orientadores':
                    pessoas = await this.pessoaModel.findOrientadores();
                    break;
                case 'estagiarios':
                    pessoas = await this.pessoaModel.findEstagiarios();
                    break;
                case 'empresas':
                    pessoas = await this.pessoaModel.findEmpresas();
                    break;
                default:
                    pessoas = await this.pessoaModel.findByNivelAcesso(tipo);
            }

            // Filtrar por busca se fornecida (insensível a acentos)
            if (search) {
                const SQLOptimizer = require('../utils/sql-optimizer');
                pessoas = pessoas.filter(pessoa => 
                    SQLOptimizer.accentInsensitiveIncludes(pessoa.nome, search) ||
                    SQLOptimizer.accentInsensitiveIncludes(pessoa.email, search)
                );
            }

            res.json({
                success: true,
                data: pessoas
            });
        } catch (error) {
            console.error('Erro ao buscar pessoas por tipo:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Erro ao buscar pessoas'
            });
        }
    }

    /**
     * Perfil do usuário logado
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async profile(req, res) {
        try {
            const userId = req.session.user.id_pessoa;
            const pessoa = await this.pessoaModel.findById(userId);

            if (!pessoa) {
                throw new Error('Usuário não encontrado');
            }

            // Para requisições AJAX
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.json({
                    success: true,
                    data: pessoa
                });
            }

            // Formatar dados para exibição
            const pessoaFormatada = {
                ...pessoa,
                categoriaTexto: Helpers.getCategoriaTexto(pessoa.categoria),
                tipoTexto: Helpers.getTipoTexto(pessoa.tipo)
            };

            res.render('profile', {
                title: 'Meu Perfil',
                user: req.session.user,
                pessoa: pessoaFormatada,
                success: req.query.success || null,
                error: req.query.error || null,
                currentPage: 'profile',
                currentUrl: req.originalUrl,
                returnUrl: req.query.returnUrl || req.get('referer') || '/dashboard'
            });
        } catch (error) {
            console.error('Erro ao carregar perfil:', error);
            
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(500).json({
                    success: false,
                    message: 'Erro ao carregar perfil'
                });
            }

            res.status(500).render('error', {
                title: 'Erro',
                message: 'Erro ao carregar perfil',
                error: { status: 500 },
                currentPage: 'error'
            });
        }
    }
    
    /**
     * Cria login para uma pessoa
     * @param {number} idPessoa - ID da pessoa
     * @param {Object} loginData - Dados do login
     */
    async createPessoaLogin(idPessoa, loginData) {
        try {
            const databaseConfig = require('../config/database');
            
            // Verificar se já existe login para esta pessoa
            const existingLogin = await databaseConfig.get(
                'SELECT id_pessoa FROM pessoa_login WHERE id_pessoa = ?',
                [idPessoa]
            );
            
            if (existingLogin) {
                throw new Error('Já existe um login para esta pessoa');
            }
            
            // Inserir login com senha padrão temporária
            const bcrypt = require('bcrypt');
            const senhaTemporaria = await bcrypt.hash('123456', 10); // Senha padrão temporária
            
            const query = `
                INSERT INTO pessoa_login (id_pessoa, senha, nivelacesso, status, dataultimaatualizacao)
                VALUES (?, ?, ?, ?, NOW())
            `;
            
            await databaseConfig.run(query, [idPessoa, senhaTemporaria, loginData.nivelacesso, loginData.status]);
            
        } catch (error) {
            console.error('Erro ao criar login da pessoa:', error);
            throw error;
        }
    }
    
    /**
     * Cria vínculos da pessoa com módulos
     * @param {number} idPessoa - ID da pessoa
     * @param {Array} modulos - Array com IDs dos módulos
     */
    async createPessoaModulos(idPessoa, modulos) {
        try {
            const databaseConfig = require('../config/database');
            
            // Inserir vínculos com módulos
            const query = `
                INSERT INTO pessoa_modulos (id_pessoa, id_modulo, ativo, dataultimaatualizacao)
                VALUES (?, ?, 1, NOW())
            `;
            
            for (const idModulo of modulos) {
                await databaseConfig.run(query, [idPessoa, idModulo]);
            }
            
        } catch (error) {
             console.error('Erro ao criar vínculos com módulos:', error);
             throw error;
         }
     }
     
     /**
      * Atualiza login de uma pessoa
      * @param {number} idPessoa - ID da pessoa
      * @param {Object} loginData - Dados do login
      */
     async updatePessoaLogin(idPessoa, loginData) {
         try {
             const databaseConfig = require('../config/database');
             
             // Verificar se existe login para esta pessoa
             const existingLogin = await databaseConfig.get(
                 'SELECT id_pessoa FROM pessoa_login WHERE id_pessoa = ?',
                 [idPessoa]
             );
             
             if (existingLogin) {
                 // Atualizar login existente
                 const query = `
                     UPDATE pessoa_login 
                     SET nivelacesso = ?, status = ?, dataultimaatualizacao = NOW()
                     WHERE id_pessoa = ?
                 `;
                 
                 await databaseConfig.run(query, [loginData.nivelacesso, loginData.status, idPessoa]);
             } else {
                 // Criar novo login
                 await this.createPessoaLogin(idPessoa, loginData);
             }
             
         } catch (error) {
             console.error('Erro ao atualizar login da pessoa:', error);
             throw error;
         }
     }
     
     /**
      * Atualiza vínculos da pessoa com módulos
      * @param {number} idPessoa - ID da pessoa
      * @param {Array} modulos - Array com IDs dos módulos
      */
     async updatePessoaModulos(idPessoa, modulos) {
         try {
             const databaseConfig = require('../config/database');
             
             // Remover vínculos existentes
             await databaseConfig.run(
                 'DELETE FROM pessoa_modulos WHERE id_pessoa = ?',
                 [idPessoa]
             );
             
             // Inserir novos vínculos
             const query = `
                 INSERT INTO pessoa_modulos (id_pessoa, id_modulo, ativo, dataultimaatualizacao)
                 VALUES (?, ?, 1, NOW())
             `;
             
             for (const idModulo of modulos) {
                 await databaseConfig.run(query, [idPessoa, idModulo]);
             }
             
         } catch (error) {
             console.error('Erro ao atualizar vínculos com módulos:', error);
             throw error;
         }
     }
 }
 
 module.exports = PessoaController;