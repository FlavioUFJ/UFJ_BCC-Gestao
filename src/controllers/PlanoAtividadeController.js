/**
 * Controlador de Planos de Atividade
 * Gerencia todas as rotas relacionadas aos planos de atividade dos estágios
 */

const databaseConfig = require('../config/database');
const { messages, enums } = require('../config');
const Pessoa = require('../models/Pessoa');
const { generatePDF } = require('../config/puppeteer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configurar multer para upload de arquivos PDF
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../../public/uploads/planos-atividade');
        
        // Criar diretório se não existir
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Gerar nome temporário único - será renomeado depois
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, 'temp-plano-' + uniqueSuffix + extension);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    },
    fileFilter: function (req, file, cb) {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Apenas arquivos PDF são permitidos'));
        }
    }
}).single('documento_pdf');

class PlanoAtividadeController {
    constructor() {
        this.pessoaModel = new Pessoa();
    }

    /**
     * Lista planos de atividade com filtros baseados no usuário
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async index(req, res) {
        try {
            // Verificar se o usuário está autenticado
            if (!req.session.user) {
                return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
            }
            
            const userId = req.session.user.id_pessoa;
            const userNivelAcesso = req.session.user.nivelacesso;
            
            // Verificar se os dados do usuário estão completos
            if (!userId || !userNivelAcesso) {
                console.error('[PLANO-ATIVIDADE] Dados do usuário incompletos:', {
                    userId,
                    userNivelAcesso,
                    sessionUser: req.session.user
                });
                return res.status(400).json({ success: false, message: 'Dados do usuário incompletos' });
            }
            
            let query = `
                SELECT 
                    ce.tipo_estagio AS ce_tipo_estagio, 
                    ce.semestre_ano AS ce_semestre_ano, 
                    pe.nome AS nome_estagiario, 
                    po.nome AS nome_orientador, 
                    ps.nome AS nome_supervisor, 
                    pc.nome AS nome_concedente, 
                    ce.situacao AS ce_situacao, 
                    ce.data_inicio AS ce_data_inicio, 
                    ce.data_fim AS ce_data_fim, 
                    ce.cargahoraria AS ce_cargahoraria, 
                    ce.observacoes AS ce_observacoes, 
                    po.categoria AS po_categoria, 
                    pc.categoria AS pc_categoria, 
                    pe.categoria AS pe_categoria, 
                    ps.categoria AS ps_categoria, 
                    pa.id_planoatividade AS pa_id_planoatividade, 
                    pa.id_campo_estagio AS pa_id_campo_estagio, 
                    pa.situacao AS pa_situacao, 
                    pa.data_lancamento AS pa_data_lancamento, 
                    pa.data_fechamento AS pa_data_fechamento, 
                    pa.data_inicial AS pa_data_inicial, 
                    pa.data_final AS pa_data_final, 
                    pa.cargahoraria AS pa_cargahoraria, 
                    pa.atividades AS pa_atividades, 
                    pa.cronograma AS pa_cronograma, 
                    pa.objetivos AS pa_objetivos, 
                    pa.recursos AS pa_recursos, 
                    pa.autenticacao_estagiario AS pa_autenticacao_estagiario, 
                    pa.autenticacao_supervisor AS pa_autenticacao_supervisor, 
                    pa.autenticacao_orientador AS pa_autenticacao_orientador, 
                    pa.dataultimaatualizacao AS pa_dataultimaatualizacao 
                FROM campo_estagio_planoatividade pa 
                LEFT JOIN campo_estagio ce ON pa.id_campo_estagio = ce.id_campo_estagio 
                LEFT JOIN pessoa pe ON ce.id_pessoa_estagiario = pe.id_pessoa 
                LEFT JOIN pessoa po ON ce.id_pessoa_orientador = po.id_pessoa 
                LEFT JOIN pessoa ps ON ce.id_pessoa_supervisor = ps.id_pessoa 
                LEFT JOIN pessoa pc ON ce.id_pessoa_concedente = pc.id_pessoa
            `;
            
            const params = [];
            
            // Aplicar filtro baseado no nível de acesso
            if (userNivelAcesso !== 'Administrador') {
                // Para usuários não-administradores, mostrar apenas registros onde
                // o ID da pessoa aparece em qualquer uma das 4 chaves estrangeiras:
                // orientador, supervisor, estagiário ou concedente
                query += ` WHERE (ce.id_pessoa_orientador = ? OR 
                                 ce.id_pessoa_supervisor = ? OR 
                                 ce.id_pessoa_estagiario = ? OR 
                                 ce.id_pessoa_concedente = ?)`;
                params.push(userId, userId, userId, userId);
            }
            
            query += ` ORDER BY pa_dataultimaatualizacao DESC`;
            
            const planos = await databaseConfig.all(query, params);
            
            if (req.xhr || req.headers.accept?.includes('application/json')) {
                return res.json({ success: true, data: planos });
            }
            
            res.render('planos-atividade-list', { 
                title: 'Plano de Atividades - CoordenAI - Gestão',
                planos,
                user: req.session.user
            });
        } catch (error) {
            console.error('Erro ao listar planos de atividade:', error);
            
            if (req.xhr || req.headers.accept?.includes('application/json')) {
                return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
            }
            
            res.status(500).render('error', { 
                title: 'Erro',
                message: 'Erro ao carregar planos de atividade'
            });
        }
    }

    /**
     * Exibe formulário de criação de plano de atividade
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async create(req, res) {
        try {
            const campoEstagioId = req.query.campo_estagio_id;
            
            if (!campoEstagioId) {
                return res.status(400).render('error', {
                    title: 'Erro',
                    message: 'ID do Campo de Estágio é obrigatório'
                });
            }
            
            // Buscar dados do campo de estágio com nova query unificada
            const campoEstagio = await databaseConfig.get(`
                SELECT 
                    ce.id_campo_estagio as ce_id_campo_estagio, 
                    ce.tipo_estagio AS ce_tipo_estagio, 
                    ce.semestre_ano AS ce_semestre_ano, 
                    pe.nome AS nome_estagiario, 
                    po.nome AS nome_orientador, 
                    ps.nome AS nome_supervisor, 
                    pc.nome AS nome_concedente, 
                    ce.situacao AS ce_situacao, 
                    ce.data_inicio AS ce_data_inicio, 
                    ce.data_fim AS ce_data_fim, 
                    ce.cargahoraria AS ce_cargahoraria, 
                    ce.observacoes AS ce_observacoes, 
                    po.categoria AS po_categoria, 
                    pc.categoria AS pc_categoria, 
                    pe.categoria AS pe_categoria, 
                    ps.categoria AS ps_categoria, 
                    pa.id_planoatividade AS pa_id_planoatividade, 
                    pa.id_campo_estagio AS pa_id_campo_estagio, 
                    pa.situacao AS pa_situacao, 
                    pa.data_lancamento AS pa_data_lancamento, 
                    pa.data_fechamento AS pa_data_fechamento, 
                    pa.data_inicial AS pa_data_inicial, 
                    pa.data_final AS pa_data_final, 
                    pa.cargahoraria AS pa_cargahoraria, 
                    pa.atividades AS pa_atividades, 
                    pa.cronograma AS pa_cronograma, 
                    pa.objetivos AS pa_objetivos, 
                    pa.recursos AS pa_recursos, 
                    pa.autenticacao_estagiario AS pa_autenticacao_estagiario, 
                    pa.autenticacao_supervisor AS pa_autenticacao_supervisor, 
                    pa.autenticacao_orientador AS pa_autenticacao_orientador, 
                    pa.dataultimaatualizacao AS pa_dataultimaatualizacao 
                FROM 
                    campo_estagio_planoatividade AS pa 
                    RIGHT OUTER JOIN campo_estagio AS ce ON pa.id_campo_estagio = ce.id_campo_estagio 
                    RIGHT OUTER JOIN pessoa AS pe ON ce.id_pessoa_estagiario = pe.id_pessoa 
                    RIGHT OUTER JOIN pessoa AS po ON ce.id_pessoa_orientador = po.id_pessoa 
                    RIGHT OUTER JOIN pessoa AS ps ON ce.id_pessoa_supervisor = ps.id_pessoa 
                    RIGHT OUTER JOIN pessoa AS pc ON ce.id_pessoa_concedente = pc.id_pessoa 
                WHERE ce.id_campo_estagio is not NULL
                    AND ce.id_campo_estagio = ?
            `, [campoEstagioId]);
            
            if (!campoEstagio) {
                return res.status(404).render('error', {
                    title: 'Erro',
                    message: 'Campo de Estágio não encontrado'
                });
            }
            
            // Verificar se já existe um plano para este campo de estágio
            const planoExistente = await databaseConfig.get(`
                SELECT id_planoatividade 
                FROM campo_estagio_planoatividade 
                WHERE id_campo_estagio = ?
            `, [campoEstagioId]);
            
            if (planoExistente) {
                return res.status(400).render('error', {
                    title: 'Erro',
                    message: 'Já existe um Plano de Atividade para este Campo de Estágio'
                });
            }
            
            res.render('plano-atividade-form', {
                title: 'Novo Plano de Atividade',
                campoEstagio,
                plano: null,
                user: req.session.user
            });
        } catch (error) {
            console.error('Erro ao exibir formulário de criação:', error);
            res.status(500).render('error', {
                title: 'Erro',
                message: 'Erro interno do servidor'
            });
        }
    }

    /**
     * Processa criação de novo plano de atividade
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async store(req, res) {
        try {
            console.log('DEBUG: Dados recebidos:', req.body);
            
            const {
                id_campo_estagio,
                situacao,
                data_inicial,
                data_final,
                cargahoraria,
                atividades,
                cronograma,
                objetivos,
                recursos
            } = req.body;
            
            // Validações básicas
            if (!id_campo_estagio || !atividades || !objetivos || !cronograma || !data_inicial || !data_final || !cargahoraria) {

                return res.status(400).json({
                    success: false,
                    message: 'Campos obrigatórios não preenchidos'
                });
            }


            
            // Verificar se já existe um plano para este campo de estágio
            const planoExistente = await databaseConfig.get(
                'SELECT id_planoatividade FROM campo_estagio_planoatividade WHERE id_campo_estagio = ?',
                [id_campo_estagio]
            );
            
            if (planoExistente) {
                return res.status(400).json({
                    success: false,
                    message: 'Já existe um plano de atividade para este campo de estágio'
                });
            }
            
            // Validar formato de data ISO (YYYY-MM-DD)
            const validarDataISO = (dataISO) => {
                if (!dataISO) return false;
                const regex = /^\d{4}-\d{2}-\d{2}$/;
                if (!regex.test(dataISO)) return false;
                const date = new Date(dataISO);
                return date instanceof Date && !isNaN(date);
            };

            // Validar datas no formato ISO
            if (!validarDataISO(data_inicial) || !validarDataISO(data_final)) {
                return res.status(400).json({
                    success: false,
                    message: 'Formato de data inválido. Use YYYY-MM-DD'
                });
            }

            const dataInicialISO = data_inicial;
            const dataFinalISO = data_final;

            // Validações de data
            const campoEstagio = await this.buscarCampoEstagio(id_campo_estagio);
            if (!campoEstagio) {
                return res.status(404).json({
                    success: false,
                    message: 'Campo de estágio não encontrado'
                });
            }



            // Função para comparar datas corrigindo problema de timezone
            const compararDatas = (data1, data2) => {
                // Extrair apenas a parte da data (YYYY-MM-DD) para evitar problemas de timezone
                const extrairDataISO = (data) => {
                    if (!data) return null;
                    if (typeof data === 'string') {
                        // Se já é string, extrair parte da data
                        return data.split('T')[0];
                    }
                    // Se é Date object, converter para ISO e extrair data
                    return data.toISOString().split('T')[0];
                };
                
                const dataISO1 = extrairDataISO(data1);
                const dataISO2 = extrairDataISO(data2);
                
                if (!dataISO1 || !dataISO2) {
                    throw new Error('Data inválida para comparação');
                }
                
                return {
                    menor: dataISO1 < dataISO2,
                    maior: dataISO1 > dataISO2,
                    igual: dataISO1 === dataISO2,
                    menorOuIgual: dataISO1 <= dataISO2,
                    maiorOuIgual: dataISO1 >= dataISO2
                };
            };

            // Validação de datas removida - será feita apenas no frontend

            // Formato correto para MySQL DATETIME
            const dataAtual = new Date().toISOString().slice(0, 19).replace('T', ' ');
            
            const sql = `
                INSERT INTO campo_estagio_planoatividade (
                    id_campo_estagio, situacao, data_lancamento,
                    data_inicial, data_final, cargahoraria, atividades,
                    cronograma, objetivos, recursos, dataultimaatualizacao
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const params = [
                id_campo_estagio,
                situacao || 'Em Edição',
                dataAtual,
                dataInicialISO,
                dataFinalISO,
                cargahoraria,
                atividades,
                cronograma,
                objetivos,
                recursos,
                dataAtual
            ];
            
            const result = await databaseConfig.run(sql, params);
            
            if (req.xhr || req.headers.accept?.includes('application/json')) {
                return res.json({ success: true, message: 'Plano de atividade criado com sucesso', data: { id: result.lastID } });
            }
            
            res.redirect('/estagios/dashboard?success=Plano de atividade criado com sucesso');
        } catch (error) {
            console.error('Erro ao salvar plano de atividade:', error);
            
            if (req.xhr || req.headers.accept?.includes('application/json')) {
                return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
            }
            
            res.status(500).render('error', {
                title: 'Erro',
                message: 'Erro ao salvar plano de atividade'
            });
        }
    }

    /**
     * Exibe detalhes de um plano de atividade
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async show(req, res) {
        try {
            const { id } = req.params;
            const plano = await this.buscarPlanoAtividade(id);

            if (!plano) {
                return res.status(404).render('error', {
                    title: 'Erro',
                    message: 'Plano de atividade não encontrado'
                });
            }

            // Para requisições AJAX
            if (req.xhr || req.headers.accept?.includes('application/json')) {
                return res.json({
                    success: true,
                    data: plano
                });
            }

            res.render('error', {
                title: 'Funcionalidade não implementada',
                message: 'A visualização de detalhes do plano de atividade ainda não foi implementada.',
                user: req.session.user
            });
        } catch (error) {
            console.error('Erro ao exibir plano de atividade:', error);
            
            if (req.xhr || req.headers.accept?.includes('application/json')) {
                return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
            }
            
            res.status(500).render('error', {
                title: 'Erro',
                message: 'Erro ao carregar plano de atividade'
            });
        }
    }

    /**
     * Exibe formulário de edição de plano de atividade
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async edit(req, res) {
        try {
            const { id } = req.params;
            
            // Buscar plano de atividade com dados do campo de estágio
            const plano = await databaseConfig.get(`
                SELECT 
                    ce.tipo_estagio AS ce_tipo_estagio, 
                    ce.semestre_ano AS ce_semestre_ano, 
                    pe.nome AS nome_estagiario, 
                    po.nome AS nome_orientador, 
                    ps.nome AS nome_supervisor, 
                    pc.nome AS nome_concedente, 
                    ce.situacao AS ce_situacao, 
                    ce.data_inicio AS ce_data_inicio, 
                    ce.data_fim AS ce_data_fim, 
                    ce.cargahoraria AS ce_cargahoraria, 
                    ce.observacoes AS ce_observacoes, 
                    po.categoria AS po_categoria, 
                    pc.categoria AS pc_categoria, 
                    pe.categoria AS pe_categoria, 
                    ps.categoria AS ps_categoria, 
                    pa.id_planoatividade AS pa_id_planoatividade, 
                    pa.id_campo_estagio AS pa_id_campo_estagio, 
                    pa.situacao AS pa_situacao, 
                    pa.data_lancamento AS pa_data_lancamento, 
                    pa.data_fechamento AS pa_data_fechamento, 
                    pa.data_inicial AS pa_data_inicial, 
                    pa.data_final AS pa_data_final, 
                    pa.cargahoraria AS pa_cargahoraria, 
                    pa.atividades AS pa_atividades, 
                    pa.cronograma AS pa_cronograma, 
                    pa.objetivos AS pa_objetivos, 
                    pa.recursos AS pa_recursos, 
                    pa.autenticacao_estagiario AS pa_autenticacao_estagiario, 
                    pa.autenticacao_supervisor AS pa_autenticacao_supervisor, 
                    pa.autenticacao_orientador AS pa_autenticacao_orientador, 
                    pa.dataultimaatualizacao AS pa_dataultimaatualizacao 
                FROM campo_estagio_planoatividade pa 
                LEFT JOIN campo_estagio ce ON pa.id_campo_estagio = ce.id_campo_estagio 
                LEFT JOIN pessoa pe ON ce.id_pessoa_estagiario = pe.id_pessoa 
                LEFT JOIN pessoa po ON ce.id_pessoa_orientador = po.id_pessoa 
                LEFT JOIN pessoa ps ON ce.id_pessoa_supervisor = ps.id_pessoa 
                LEFT JOIN pessoa pc ON ce.id_pessoa_concedente = pc.id_pessoa
                WHERE pa.id_planoatividade = ?
            `, [id]);

            if (!plano) {
                return res.status(404).render('error', {
                    title: 'Erro',
                    message: 'Plano de atividade não encontrado'
                });
            }

            // Verificar se pode ser editado baseado no nível do usuário
            const user = req.session.user;
            const userNivelAcesso = user.nivelacesso;
            
            if (userNivelAcesso === 'Administrador') {
                // Administradores podem editar qualquer situação
            } else {
                // Outros usuários não podem editar "Aprovado sem Anexo"
                if (plano.pa_situacao === 'Aprovado sem Anexo') {
                    return res.status(403).render('error', {
                        title: 'Erro',
                        message: 'Plano de atividade aprovado não pode ser editado'
                    });
                }
            }
            
            // Criar objeto campoEstagio para compatibilidade com o formulário
            const campoEstagio = {
                ce_id_campo_estagio: plano.pa_id_campo_estagio,
                nome_concedente: plano.nome_concedente,
                ce_data_inicio: plano.ce_data_inicio,
                ce_data_fim: plano.ce_data_fim,
                nome_estagiario: plano.nome_estagiario,
                nome_orientador: plano.nome_orientador,
                nome_supervisor: plano.nome_supervisor
            };

            res.render('plano-atividade-form', {
                title: 'Editar Plano de Atividade',
                plano,
                campoEstagio,
                user: req.session.user
            });
        } catch (error) {
            console.error('Erro ao exibir formulário de edição:', error);
            res.status(500).render('error', {
                title: 'Erro',
                message: 'Erro ao carregar formulário de edição'
            });
        }
    }

    /**
     * Processa atualização de plano de atividade
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async update(req, res) {
        try {
            const { id } = req.params;
            const {
                situacao,
                data_inicial,
                data_final,
                cargahoraria,
                atividades,
                cronograma,
                objetivos,
                recursos
            } = req.body;

            // Validações básicas
            if (!atividades || !objetivos || !cronograma || !data_inicial || !data_final || !cargahoraria) {
                return res.status(400).json({
                    success: false,
                    message: 'Campos obrigatórios não preenchidos'
                });
            }

            // Verificar se o plano existe
            const planoExistente = await databaseConfig.get(
                'SELECT * FROM campo_estagio_planoatividade WHERE id_planoatividade = ?',
                [id]
            );
            if (!planoExistente) {
                return res.status(404).json({
                    success: false,
                    message: 'Plano de atividade não encontrado'
                });
            }

            // Verificar se pode ser editado baseado no nível do usuário
            const user = req.session.user;
            const userNivelAcesso = user.nivelacesso;
            
            if (userNivelAcesso === 'Administrador') {
                // Administradores podem editar qualquer situação
            } else {
                // Outros usuários não podem editar "Aprovado sem Anexo"
                if (planoExistente.situacao === 'Aprovado sem Anexo') {
                    return res.status(403).json({
                        success: false,
                        message: 'Plano de atividade aprovado não pode ser editado'
                    });
                }
            }

            // Validar formato de data ISO (YYYY-MM-DD)
            const validarDataISO = (dataISO) => {
                if (!dataISO) return false;
                const regex = /^\d{4}-\d{2}-\d{2}$/;
                if (!regex.test(dataISO)) return false;
                const date = new Date(dataISO);
                return date instanceof Date && !isNaN(date);
            };

            // Validar datas no formato ISO
            if (!validarDataISO(data_inicial) || !validarDataISO(data_final)) {
                return res.status(400).json({
                    success: false,
                    message: 'Formato de data inválido. Use YYYY-MM-DD'
                });
            }

            const dataInicialISO = data_inicial;
            const dataFinalISO = data_final;

            // Formato correto para MySQL DATETIME
            const dataAtual = new Date().toISOString().slice(0, 19).replace('T', ' ');

            // Atualizar plano de atividade
            const sql = `
                UPDATE campo_estagio_planoatividade SET
                    situacao = ?,
                    data_inicial = ?,
                    data_final = ?,
                    cargahoraria = ?,
                    atividades = ?,
                    cronograma = ?,
                    objetivos = ?,
                    recursos = ?,
                    dataultimaatualizacao = ?
                WHERE id_planoatividade = ?
            `;

            await databaseConfig.run(sql, [
                situacao || planoExistente.situacao,
                dataInicialISO,
                dataFinalISO,
                cargahoraria,
                atividades,
                cronograma,
                objetivos,
                recursos,
                dataAtual,
                id
            ]);

            if (req.xhr || req.headers.accept?.includes('application/json')) {
                return res.json({
                    success: true,
                    message: 'Plano de atividade atualizado com sucesso'
                });
            }

            res.redirect('/estagios/dashboard?success=Plano de atividade atualizado com sucesso');
        } catch (error) {
            console.error('Erro ao atualizar plano de atividade:', error);
            
            if (req.xhr || req.headers.accept?.includes('application/json')) {
                return res.status(500).json({
                    success: false,
                    message: 'Erro interno do servidor'
                });
            }
            
            res.status(500).render('error', {
                title: 'Erro',
                message: 'Erro ao atualizar plano de atividade'
            });
        }
    }

    /**
     * Gera PDF do plano de atividade
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async gerarPDF(req, res) {
        try {
            const { id } = req.params;
            console.log('[PDF-DEBUG] Iniciando geração de PDF para ID:', id);
            
            // Buscar dados completos do plano de atividade
            console.log('[PDF-DEBUG] Executando consulta SQL...');
            const plano = await databaseConfig.get(`SELECT
ce.id_campo_estagio as ce_id_campo_estagio,
ce.tipo_estagio AS ce_tipo_estagio,
ce.semestre_ano AS ce_semestre_ano,
pe.nome AS nome_estagiario,
po.nome AS nome_orientador,
ps.nome AS nome_supervisor,
pc.nome AS nome_concedente,
ce.situacao AS ce_situacao,
ce.data_inicio AS ce_data_inicio,
ce.data_fim AS ce_data_fim,
ce.cargahoraria AS ce_cargahoraria,
ce.observacoes AS ce_observacoes,
po.categoria AS po_categoria,
pc.categoria AS pc_categoria,
pe.categoria AS pe_categoria,
ps.categoria AS ps_categoria,
pa.id_planoatividade AS pa_id_planoatividade,
pa.id_campo_estagio AS pa_id_campo_estagio,
pa.situacao AS pa_situacao,
pa.data_lancamento AS pa_data_lancamento,
pa.data_fechamento AS pa_data_fechamento,
pa.data_inicial AS pa_data_inicial,
pa.data_final AS pa_data_final,
pa.cargahoraria AS pa_cargahoraria,
pa.atividades AS pa_atividades,
pa.cronograma AS pa_cronograma,
pa.objetivos AS pa_objetivos,
pa.recursos AS pa_recursos,
pa.autenticacao_estagiario AS pa_autenticacao_estagiario,
pa.autenticacao_supervisor AS pa_autenticacao_supervisor,
pa.autenticacao_orientador AS pa_autenticacao_orientador,
pa.dataultimaatualizacao AS pa_dataultimaatualizacao

FROM
campo_estagio_planoatividade AS pa
RIGHT OUTER JOIN campo_estagio AS ce ON pa.id_campo_estagio = ce.id_campo_estagio
RIGHT OUTER JOIN pessoa AS pe ON ce.id_pessoa_estagiario = pe.id_pessoa
RIGHT OUTER JOIN pessoa AS po ON ce.id_pessoa_orientador = po.id_pessoa
RIGHT OUTER JOIN pessoa AS ps ON ce.id_pessoa_supervisor = ps.id_pessoa
RIGHT OUTER JOIN pessoa AS pc ON ce.id_pessoa_concedente = pc.id_pessoa
WHERE ce.id_campo_estagio is not NULL AND pa.id_planoatividade = ?
            `, [id]);
            
            if (!plano) {
                return res.status(404).json({
                    success: false,
                    message: 'Plano de atividade não encontrado'
                });
            }
            
            // Renderizar template HTML para PDF
            const htmlContent = await this.renderPDFTemplate(plano);
            
            // Gerar PDF usando configuração centralizada
            const pdfBuffer = await generatePDF(htmlContent, {
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '20mm',
                    right: '15mm',
                    bottom: '20mm',
                    left: '15mm'
                }
            });
            
            // Configurar cabeçalhos para download do PDF
            const filename = `${plano.nome_estagiario?.replace(/\s+/g, '_') || 'documento'}_plano_atividade_${new Date().toISOString().split('T')[0]}.pdf`;
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(pdfBuffer);
            
        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }
    
    /**
     * Renderizar template HTML para PDF
     * @param {Object} plano - Dados do plano de atividade
     * @returns {string} HTML template
     */
    async renderPDFTemplate(plano) {
        // Função auxiliar para validar e formatar dados
        const formatarDado = (valor, valorPadrao = 'Não informado') => {
            if (valor === null || valor === undefined || valor === '' || valor === 'null') {
                return valorPadrao;
            }
            return valor;
        };
        
        // Função auxiliar para formatar datas
        const formatarData = (data) => {
            if (!data || data === null || data === undefined || data === '' || data === 'null') {
                return 'Não informado';
            }
            try {
                return new Date(data).toLocaleDateString('pt-BR');
            } catch (error) {
                return 'Não informado';
            }
        };
        
        const dataInicial = formatarData(plano.pa_data_inicial);
        const dataFinal = formatarData(plano.pa_data_final);
        const dataLancamento = formatarData(plano.pa_data_lancamento);
        
        // Período do estágio (usando datas do campo de estágio se disponíveis)
        const periodoInicial = formatarData(plano.campo_data_inicial || plano.pa_data_inicial);
        const periodoFinal = formatarData(plano.campo_data_final || plano.pa_data_final);
        const periodoCompleto = (periodoInicial !== 'Não informado' && periodoFinal !== 'Não informado') 
            ? `${periodoInicial} a ${periodoFinal}` 
            : 'Não informado';
        
        // Carga horária (priorizar a do plano, depois a do campo de estágio)
        const cargaHoraria = formatarDado(plano.pa_cargahoraria || plano.ce_cargahoraria);
        
        return `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Plano de Atividade - ${plano.nome_estagiario}</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    margin: 20px; 
                    line-height: 1.6; 
                    color: #333;
                }
                .info-header {
                    background: linear-gradient(135deg, #007bff, #0056b3);
                    color: white;
                    border-radius: 8px;
                    padding: 20px;
                    margin-bottom: 30px;
                    text-align: center;
                }
                .info-header h1 {
                    margin: 0 0 10px 0;
                    font-size: 24px;
                    font-weight: bold;
                }
                .info-header h2 {
                    margin: 0 0 5px 0;
                    font-size: 18px;
                    font-weight: normal;
                }
                .info-header h3 {
                    margin: 0;
                    font-size: 16px;
                    font-weight: normal;
                }
                .company-info {
                    text-align: center;
                    margin: 20px 0;
                    padding: 15px;
                    background: #f8f9fa;
                    border-radius: 5px;
                }
                .company-name {
                    font-size: 18px;
                    font-weight: bold;
                    margin-bottom: 10px;
                }
                .period-info {
                    font-style: italic;
                    color: #666;
                    margin-bottom: 15px;
                }
                .people-info {
                    display: flex;
                    justify-content: space-between;
                    text-align: center;
                }
                .person-box {
                    flex: 1;
                    padding: 0 10px;
                }
                .person-name {
                    font-weight: bold;
                    margin-bottom: 5px;
                }
                .person-role {
                    font-style: italic;
                    color: #666;
                    font-size: 12px;
                }
                .form-section {
                    background: #f8f9fa;
                    border-radius: 8px;
                    padding: 20px;
                    margin-bottom: 20px;
                }
                .section-title {
                    color: #495057;
                    border-bottom: 2px solid #dee2e6;
                    padding-bottom: 10px;
                    margin-bottom: 20px;
                    font-size: 16px;
                    font-weight: bold;
                }
                .section-title i {
                    margin-right: 8px;
                    color: #007bff;
                }
                .info-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    margin-bottom: 15px;
                }
                .info-item {
                    margin-bottom: 10px;
                }
                .info-label {
                    font-weight: bold;
                    color: #495057;
                }
                .content-box {
                    border: 1px solid #dee2e6;
                    padding: 15px;
                    margin: 10px 0;
                    min-height: 80px;
                    background: white;
                    border-radius: 4px;
                    white-space: pre-wrap;
                }
                .signatures {
                    margin-top: 60px;
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr;
                    gap: 40px;
                    page-break-inside: avoid;
                }
                .signature-box {
                    text-align: center;
                    padding-top: 40px;
                }
                .signature-line {
                    border-top: 1px solid #333;
                    margin-bottom: 8px;
                    height: 1px;
                }
                .signature-name {
                    font-weight: bold;
                    margin-bottom: 5px;
                    font-size: 14px;
                }
                .signature-role {
                    font-style: italic;
                    color: #666;
                    font-size: 12px;
                }
                .footer {
                    margin-top: 40px;
                    text-align: center;
                    font-size: 11px;
                    color: #666;
                    border-top: 1px solid #dee2e6;
                    padding-top: 15px;
                }
                @media print {
                    body { margin: 0; }
                    .form-section { break-inside: avoid; }
                    .signatures { break-inside: avoid; }
                }
            </style>
        </head>
        <body>
            <!-- Cabeçalho com informações do Plano de Atividade -->
            <div class="info-header">
                <h1><i class="fas fa-clipboard-list"></i> Plano de Atividade</h1>
                <h2>Universidade Federal de Jataí - UFJ</h2>
                <h3>Bacharelado em Ciência da Computação</h3>
            </div>

            <!-- Informações da Empresa e Período -->
            <div class="company-info">
                <div class="company-name">${plano.nome_concedente || 'Não informado'}</div>
                <div class="person-role" style="margin-bottom: 10px; font-size: 14px;">Local do Estágio</div>
                <div class="period-info">Período do estágio: ${dataInicial} - ${dataFinal}</div>
                <div class="people-info">
                    <div class="person-box">
                        <div class="person-name"><strong>${plano.nome_estagiario || 'Não informado'}</strong></div>
                        <div class="person-role">Estagiário</div>
                    </div>
                    <div class="person-box">
                        <div class="person-name"><strong>${plano.nome_orientador || 'Não informado'}</strong></div>
                        <div class="person-role">Orientador</div>
                    </div>
                    <div class="person-box">
                        <div class="person-name"><strong>${plano.nome_supervisor || 'Não informado'}</strong></div>
                        <div class="person-role">Supervisor</div>
                    </div>
                </div>
            </div>

            <!-- Seção: Informações Gerais -->
            <div class="form-section">
                <h5 class="section-title"><i class="fas fa-info-circle"></i>Informações Gerais</h5>
                <div class="info-grid">
                    <div>
                        <div class="info-item">
                            <span class="info-label">Situação:</span> ${plano.pa_situacao || 'Em Edição'}
                        </div>
                        <div class="info-item">
                            <span class="info-label">Período do Estágio:</span> ${periodoCompleto}
                        </div>
                    </div>
                    <div>
                        <div class="info-item">
                            <span class="info-label">Data de Lançamento:</span> ${dataLancamento}
                        </div>
                        <div class="info-item">
                            <span class="info-label">Carga Horária:</span> ${cargaHoraria} horas/semana
                        </div>
                    </div>
                </div>
            </div>

            <!-- Seção: Atividades a Desenvolver -->
            <div class="form-section">
                <h5 class="section-title"><i class="fas fa-tasks"></i>Atividades a Desenvolver</h5>
                <div class="content-box">
                    ${formatarDado(plano.pa_atividades)}
                </div>
            </div>

            <!-- Seção: Objetivos -->
            <div class="form-section">
                <h5 class="section-title"><i class="fas fa-bullseye"></i>Objetivos</h5>
                <div class="content-box">
                    ${formatarDado(plano.pa_objetivos)}
                </div>
            </div>

            <!-- Seção: Cronograma -->
            <div class="form-section">
                <h5 class="section-title"><i class="fas fa-calendar-alt"></i>Cronograma</h5>
                <div class="content-box">
                    ${formatarDado(plano.pa_cronograma)}
                </div>
            </div>

            <!-- Seção: Recursos Necessários -->
            <div class="form-section">
                <h5 class="section-title"><i class="fas fa-tools"></i>Recursos Necessários</h5>
                <div class="content-box">
                    ${formatarDado(plano.pa_recursos)}
                </div>
            </div>

            <!-- Assinaturas -->
            <div class="signatures">
                <div class="signature-box">
                    <div class="signature-line"></div>
                    <div class="signature-name"><strong>${plano.nome_estagiario || 'Não informado'}</strong></div>
                    <div class="signature-role">Estagiário</div>
                </div>
                <div class="signature-box">
                    <div class="signature-line"></div>
                    <div class="signature-name"><strong>${plano.nome_orientador || 'Não informado'}</strong></div>
                    <div class="signature-role">Orientador</div>
                </div>
                <div class="signature-box">
                    <div class="signature-line"></div>
                    <div class="signature-name"><strong>${plano.nome_supervisor || 'Não informado'}</strong></div>
                    <div class="signature-role">Supervisor</div>
                </div>
            </div>

            <!-- Rodapé -->
            <div class="footer">
                <p>Documento gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
                <p>CoordenAI - Gestão Inteligente - UFJ BCC</p>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * Busca dados de um campo de estágio
     * @param {number} id - ID do campo de estágio
     * @returns {Object|null}
     */
    async buscarCampoEstagio(id) {
        const sql = `
            SELECT 
                ce.*,
                pessoaEstagiario.nome as nome_estagiario,
                pessoaOrientador.nome as nome_orientador,
                pessoaSupervisor.nome as nome_supervisor,
                pessoaConcedente.nome as empresa,
                ce.data_inicio as data_inicial,
                ce.data_fim as data_final
            FROM campo_estagio ce
            LEFT JOIN pessoa pessoaEstagiario ON ce.id_pessoa_estagiario = pessoaEstagiario.id_pessoa
            LEFT JOIN pessoa pessoaOrientador ON ce.id_pessoa_orientador = pessoaOrientador.id_pessoa
            LEFT JOIN pessoa pessoaSupervisor ON ce.id_pessoa_supervisor = pessoaSupervisor.id_pessoa
            LEFT JOIN pessoa pessoaConcedente ON ce.id_pessoa_concedente = pessoaConcedente.id_pessoa
            WHERE ce.id_campo_estagio = ?
        `;

        return await databaseConfig.get(sql, [id]);
    }

    /**
     * Busca dados de um plano de atividade
     * @param {number} id - ID do plano de atividade
     * @returns {Object|null}
     */
    async buscarPlanoAtividade(id) {
        const sql = `
            SELECT 
                ce.tipo_estagio AS ce_tipo_estagio, 
                ce.semestre_ano AS ce_semestre_ano, 
                pe.nome AS nome_estagiario, 
                po.nome AS nome_orientador, 
                ps.nome AS nome_supervisor, 
                pc.nome AS nome_concedente, 
                ce.situacao AS ce_situacao, 
                ce.data_inicio AS ce_data_inicio, 
                ce.data_fim AS ce_data_fim, 
                ce.cargahoraria AS ce_cargahoraria, 
                ce.observacoes AS ce_observacoes, 
                po.categoria AS po_categoria, 
                pc.categoria AS pc_categoria, 
                pe.categoria AS pe_categoria, 
                ps.categoria AS ps_categoria, 
                pa.id_planoatividade AS pa_id_planoatividade, 
                pa.id_campo_estagio AS pa_id_campo_estagio, 
                pa.situacao AS pa_situacao, 
                pa.data_lancamento AS pa_data_lancamento, 
                pa.data_fechamento AS pa_data_fechamento, 
                pa.data_inicial AS pa_data_inicial, 
                pa.data_final AS pa_data_final, 
                pa.cargahoraria AS pa_cargahoraria, 
                pa.atividades AS pa_atividades, 
                pa.cronograma AS pa_cronograma, 
                pa.objetivos AS pa_objetivos, 
                pa.recursos AS pa_recursos, 
                pa.autenticacao_estagiario AS pa_autenticacao_estagiario, 
                pa.autenticacao_supervisor AS pa_autenticacao_supervisor, 
                pa.autenticacao_orientador AS pa_autenticacao_orientador, 
                pa.dataultimaatualizacao AS pa_dataultimaatualizacao,
                pa.url_planoassinado AS pa_url_planoassinado 
            FROM campo_estagio_planoatividade pa 
            LEFT JOIN campo_estagio ce ON pa.id_campo_estagio = ce.id_campo_estagio 
            LEFT JOIN pessoa pe ON ce.id_pessoa_estagiario = pe.id_pessoa 
            LEFT JOIN pessoa po ON ce.id_pessoa_orientador = po.id_pessoa 
            LEFT JOIN pessoa ps ON ce.id_pessoa_supervisor = ps.id_pessoa 
            LEFT JOIN pessoa pc ON ce.id_pessoa_concedente = pc.id_pessoa
            WHERE pa.id_planoatividade = ?
        `;

        return await databaseConfig.get(sql, [id]);
    }

    /**
     * Anexar documento PDF ao plano de atividade
     */
    async anexarDocumento(req, res) {
        try {
            // Processar upload usando a configuração global
            upload(req, res, async (err) => {
                if (err) {
                    console.error('Erro no upload:', err);
                    return res.status(400).json({
                        success: false,
                        message: err.message
                    });
                }
                
                if (!req.file) {
                    return res.status(400).json({
                        success: false,
                        message: 'Nenhum arquivo foi enviado'
                    });
                }
                
                const { plano_id } = req.body;
                
                if (!plano_id) {
                    // Remover arquivo se não há plano_id
                    fs.unlinkSync(req.file.path);
                    return res.status(400).json({
                        success: false,
                        message: 'ID do plano de atividade é obrigatório'
                    });
                }
                
                try {
                    // Verificar se o plano existe
                    const plano = await databaseConfig.get(
                        'SELECT id_planoatividade FROM campo_estagio_planoatividade WHERE id_planoatividade = ?',
                        [plano_id]
                    );
                    
                    if (!plano) {
                        // Remover arquivo se plano não existe
                        fs.unlinkSync(req.file.path);
                        return res.status(404).json({
                            success: false,
                            message: 'Plano de atividade não encontrado'
                        });
                    }
                    
                    // Buscar informações do estagiário para gerar nome personalizado
                    const sql = `
                        SELECT pe.nome AS nome_estagiario
                        FROM campo_estagio_planoatividade pa 
                        LEFT JOIN campo_estagio ce ON pa.id_campo_estagio = ce.id_campo_estagio 
                        LEFT JOIN pessoa pe ON ce.id_pessoa_estagiario = pe.id_pessoa 
                        WHERE pa.id_planoatividade = ?
                    `;
                    
                    const resultado = await databaseConfig.get(sql, [plano_id]);
                    
                    let nomeArquivoFinal = req.file.filename;
                    
                    if (resultado && resultado.nome_estagiario) {
                        // Limpar nome do estagiário (remover caracteres especiais)
                        const nomeEstagiario = resultado.nome_estagiario
                            .replace(/[^a-zA-Z0-9\s]/g, '')
                            .replace(/\s+/g, '_')
                            .toLowerCase();
                        
                        // Gerar data e hora atual
                        const agora = new Date();
                        const dataHora = agora.toISOString()
                            .replace(/T/, '_')
                            .replace(/:/g, '-')
                            .replace(/\..*/, '');
                        
                        const extension = path.extname(req.file.originalname);
                        nomeArquivoFinal = `${nomeEstagiario}-planoAtividade-${dataHora}${extension}`;
                        
                        // Renomear o arquivo
                        const caminhoAntigo = req.file.path;
                        const caminhoNovo = path.join(path.dirname(req.file.path), nomeArquivoFinal);
                        
                        fs.renameSync(caminhoAntigo, caminhoNovo);
                    }
                    
                    // Atualizar o plano com o caminho do documento
                    const caminhoRelativo = `/public/uploads/planos-atividade/${nomeArquivoFinal}`;
                    
                    await databaseConfig.run(
                        'UPDATE campo_estagio_planoatividade SET url_planoassinado = ?, situacao = ?, dataultimaatualizacao = CURRENT_TIMESTAMP WHERE id_planoatividade = ?',
                        [caminhoRelativo, 'Aprovado sem Anexo', plano_id]
                    );
                    
                    console.log('Documento anexado com sucesso:', {
                        plano_id: plano_id,
                        arquivo: nomeArquivoFinal,
                        caminho: caminhoRelativo
                    });
                    
                    res.json({
                        success: true,
                        message: 'Documento PDF anexado com sucesso!',
                        arquivo: nomeArquivoFinal,
                        caminho: caminhoRelativo
                    });
                    
                } catch (dbError) {
                    console.error('Erro no banco de dados:', dbError);
                    // Remover arquivo em caso de erro
                    fs.unlinkSync(req.file.path);
                    
                    res.status(500).json({
                        success: false,
                        message: 'Erro ao salvar informações no banco de dados'
                    });
                }
            });
            
        } catch (error) {
            console.error('Erro ao anexar documento:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor: ' + error.message
            });
        }
    }

    /**
     * Exclui um plano de atividade
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async destroy(req, res) {
        try {
            const { id } = req.params;
            const user = req.session.user;

            // Verificar se o usuário está autenticado
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuário não autenticado'
                });
            }

            // Buscar o plano de atividade
            const plano = await databaseConfig.get(
                'SELECT * FROM campo_estagio_planoatividade WHERE id_planoatividade = ?',
                [id]
            );

            if (!plano) {
                return res.status(404).json({
                    success: false,
                    message: 'Plano de atividade não encontrado'
                });
            }

            // Verificar permissões baseadas no nível de acesso e situação do plano
            const userNivelAcesso = user.nivelacesso;
            let podeExcluir = false;
            let motivoNegacao = '';

            if (userNivelAcesso === 'Administrador') {
                // Administradores podem excluir: 'Em Edição', 'Em Aprovação', 'Aprovado sem Anexo'
                podeExcluir = plano.situacao === 'Em Edição' || 
                             plano.situacao === 'Em Aprovação' || 
                             plano.situacao === 'Aprovado sem Anexo';
                if (!podeExcluir) {
                    motivoNegacao = 'Planos aprovados com anexo não podem ser excluídos';
                }
            } else {
                // Outros usuários podem excluir apenas: 'Em Edição' e 'Em Aprovação'
                podeExcluir = plano.situacao === 'Em Edição' || 
                             plano.situacao === 'Em Aprovação';
                if (!podeExcluir) {
                    motivoNegacao = 'Você não tem permissão para excluir planos aprovados';
                }
            }

            if (!podeExcluir) {
                return res.status(403).json({
                    success: false,
                    message: motivoNegacao
                });
            }

            // Excluir o plano de atividade
            await databaseConfig.run(
                'DELETE FROM campo_estagio_planoatividade WHERE id_planoatividade = ?',
                [id]
            );

            console.log(`Plano de atividade ${id} excluído por usuário ${user.id_pessoa} (${userNivelAcesso})`);

            res.json({
                success: true,
                message: 'Plano de atividade excluído com sucesso'
            });

        } catch (error) {
            console.error('Erro ao excluir plano de atividade:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    /**
     * Busca a categoria do usuário logado no plano de atividade
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async buscarCategoriaUsuario(req, res) {
        try {
            const { id } = req.params; // ID do plano de atividade
            const userId = req.session.user.id_pessoa;
            
            if (!id || !userId) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'ID do plano de atividade e usuário são obrigatórios' 
                });
            }
            
            // Buscar as categorias do usuário no plano de atividade
            // Agora considerando que uma pessoa pode ter múltiplas funções
            const query = `
                SELECT 
                    ce.id_pessoa_estagiario,
                    ce.id_pessoa_orientador,
                    ce.id_pessoa_supervisor
                FROM campo_estagio ce
                WHERE ce.id_campo_estagio = ?
            `;
            
            const result = await databaseConfig.get(query, [id]);
            
            if (!result) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Plano de atividade não encontrado' 
                });
            }
            
            const campoEstagio = result;
            const categorias = [];
            
            // Verificar em quais funções o usuário está vinculado
            if (campoEstagio.id_pessoa_estagiario === userId) {
                categorias.push('Estagiário');
            }
            if (campoEstagio.id_pessoa_orientador === userId) {
                categorias.push('Orientador');
            }
            if (campoEstagio.id_pessoa_supervisor === userId) {
                categorias.push('Supervisor');
            }
            
            if (categorias.length === 0) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Usuário não possui permissão neste plano de atividade' 
                });
            }
            
            // Retornar a primeira categoria encontrada (para compatibilidade)
            // mas também todas as categorias disponíveis
            res.json({ 
                success: true, 
                categoria: categorias[0], // Categoria principal para compatibilidade
                categorias: categorias    // Todas as categorias disponíveis
            });
            
        } catch (error) {
            console.error('Erro ao buscar categoria do usuário:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Erro interno do servidor' 
            });
        }
    }

    /**
     * Download do documento assinado
     */
    async downloadDocumentoAssinado(req, res) {
        try {
            const { id } = req.params;
            
            // Buscar informações do plano
            const plano = await databaseConfig.get(
                'SELECT url_planoassinado FROM campo_estagio_planoatividade WHERE id_planoatividade = ?',
                [id]
            );
            
            if (!plano || !plano.url_planoassinado) {
                return res.status(404).json({
                    success: false,
                    message: 'Documento assinado não encontrado'
                });
            }
            
            // Construir caminho completo do arquivo
            const caminhoArquivo = path.join(__dirname, '../..', plano.url_planoassinado);
            
            // Verificar se o arquivo existe
            if (!fs.existsSync(caminhoArquivo)) {
                return res.status(404).json({
                    success: false,
                    message: 'Arquivo não encontrado no servidor'
                });
            }
            
            // Fazer download do arquivo
            const nomeArquivo = path.basename(caminhoArquivo);
            res.download(caminhoArquivo, nomeArquivo, (err) => {
                if (err) {
                    console.error('Erro ao fazer download:', err);
                    if (!res.headersSent) {
                        res.status(500).json({
                            success: false,
                            message: 'Erro ao fazer download do arquivo'
                        });
                    }
                }
            });
            
        } catch (error) {
            console.error('Erro ao fazer download do documento assinado:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    /**
     * Remover documento assinado (apenas administradores)
     */
    async removerDocumentoAssinado(req, res) {
        try {
            const { id } = req.params;
            const user = req.session.user;
            
            // Verificar se o usuário é administrador (já verificado no middleware, mas por segurança)
            if (user.nivelacesso !== 'Administrador') {
                return res.status(403).json({
                    success: false,
                    message: 'Acesso negado. Apenas administradores podem remover documentos assinados.'
                });
            }
            
            // Buscar informações do plano
            const plano = await databaseConfig.get(
                'SELECT url_planoassinado FROM campo_estagio_planoatividade WHERE id_planoatividade = ?',
                [id]
            );
            
            if (!plano || !plano.url_planoassinado) {
                return res.status(404).json({
                    success: false,
                    message: 'Documento assinado não encontrado'
                });
            }
            
            // Construir caminho completo do arquivo
            const caminhoArquivo = path.join(__dirname, '../..', plano.url_planoassinado);
            
            // Remover arquivo do servidor se existir
            if (fs.existsSync(caminhoArquivo)) {
                fs.unlinkSync(caminhoArquivo);
            }
            
            // Atualizar banco de dados para remover referência e alterar situação
            await databaseConfig.run(
                'UPDATE campo_estagio_planoatividade SET url_planoassinado = NULL, situacao = ?, dataultimaatualizacao = CURRENT_TIMESTAMP WHERE id_planoatividade = ?',
                ['Aprovado sem Anexo', id]
            );
            
            console.log('Documento assinado removido:', {
                plano_id: id,
                arquivo_removido: plano.url_planoassinado,
                usuario: user.nome
            });
            
            res.json({
                success: true,
                message: 'Documento assinado removido com sucesso!'
            });
            
        } catch (error) {
            console.error('Erro ao remover documento assinado:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }
}

module.exports = PlanoAtividadeController;