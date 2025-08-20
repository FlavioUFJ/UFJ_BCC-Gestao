/**
 * Controlador de Frequência
 * Gerencia todas as rotas relacionadas às frequências de estágio
 */

const databaseConfig = require('../config/database');
const { messages, enums } = require('../config');
const Pessoa = require('../models/Pessoa');
const FrequenciaService = require('../services/FrequenciaService');

class FrequenciaController {
    constructor() {
        this.pessoaModel = new Pessoa();
        this.frequenciaService = new FrequenciaService();
    }

    /**
     * Converte data do formato brasileiro dd/mm/aaaa para formato americano aaaa-mm-dd
     * @param {string} dataBrasileira - Data no formato dd/mm/aaaa
     * @returns {string|null} Data no formato aaaa-mm-dd ou null se inválida
     */
    converterDataBrasileiraParaAmericana(dataBrasileira) {
        if (!dataBrasileira || dataBrasileira.trim() === '') {
            return null;
        }
        
        const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
        const match = dataBrasileira.match(regex);
        
        if (!match) {
            return null;
        }
        
        const dia = match[1];
        const mes = match[2];
        const ano = match[3];
        
        // Validar se a data é válida
        const data = new Date(ano, mes - 1, dia);
        if (data.getFullYear() != ano || data.getMonth() != mes - 1 || data.getDate() != dia) {
            return null;
        }
        
        return `${ano}-${mes}-${dia}`;
    }

    /**
     * Lista frequências com filtros baseados no usuário
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async listar(req, res) {
        return this.index(req, res);
    }

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
                console.error('[FREQUENCIA] Dados do usuário incompletos:', {
                    userId,
                    userNivelAcesso,
                    sessionUser: req.session.user
                });
                return res.status(400).json({ success: false, message: 'Dados do usuário incompletos' });
            }
            
            let query = `
                SELECT 
                    cef.id_campo_estagio_frequencia,
                    cef.id_planoatividade,
                    cef.data_abertura,
                    cef.data_encerramento,
                    cef.mesdereferencia,
                    cef.total_hora_mesreferencia,
                    cef.aprovado_estagiario,
                    cef.aprovado_orientador,
                    cef.aprovado_supervisor,
                    cef.resumo_atividades,
                    cef.dataultimaatualizacao,
                    pe.nome AS nome_estagiario,
                    po.nome AS nome_orientador,
                    ps.nome AS nome_supervisor,
                    pc.nome AS nome_concedente,
                    ce.tipo_estagio,
                    ce.semestre_ano,
                    ce.situacao AS ce_situacao,
                    pa.situacao AS pa_situacao
                FROM campo_estagio_frequencia cef
                INNER JOIN campo_estagio_planoatividade pa ON cef.id_planoatividade = pa.id_planoatividade
                INNER JOIN campo_estagio ce ON pa.id_campo_estagio = ce.id_campo_estagio
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
            
            query += ` ORDER BY cef.dataultimaatualizacao DESC`;
            
            const frequencias = await databaseConfig.all(query, params);
            
            if (req.xhr || req.headers.accept?.includes('application/json')) {
                return res.json({ success: true, data: frequencias });
            }
            
            res.render('frequencia-list', { 
                title: 'Frequências - CoordenAI - Gestão',
                frequencias,
                user: req.session.user
            });
        } catch (error) {
            console.error('Erro ao listar frequências:', error);
            
            if (req.xhr || req.headers.accept?.includes('application/json')) {
                return res.status(500).json({ 
                    success: false, 
                    message: 'Erro interno do servidor' 
                });
            }
            
            res.status(500).render('error', {
                title: 'Erro',
                message: 'Erro interno do servidor',
                error: { status: 500 },
                currentPage: 'error'
            });
        }
    }

    /**
     * Exibe formulário para criar nova frequência
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async criar(req, res) {
        return this.create(req, res);
    }

    async create(req, res) {
        try {
            const { planoAtividadeId, plano_atividade_id } = req.query;
            const planoId = planoAtividadeId || plano_atividade_id;
            
            if (!planoId) {
                return res.status(400).render('error', {
                    title: 'Erro',
                    message: 'ID do plano de atividade é obrigatório',
                    error: { status: 400 },
                    currentPage: 'error'
                });
            }

            // Buscar dados do plano de atividade
            const planoAtividade = await databaseConfig.get(`
                SELECT 
                    pa.id_planoatividade,
                    pa.id_campo_estagio,
                    pa.situacao AS pa_situacao,
                    pe.nome AS nome_estagiario,
                    po.nome AS nome_orientador,
                    ps.nome AS nome_supervisor,
                    pc.nome AS nome_concedente,
                    ce.tipo_estagio,
                    ce.semestre_ano
                FROM campo_estagio_planoatividade pa
                INNER JOIN campo_estagio ce ON pa.id_campo_estagio = ce.id_campo_estagio
                LEFT JOIN pessoa pe ON ce.id_pessoa_estagiario = pe.id_pessoa
                LEFT JOIN pessoa po ON ce.id_pessoa_orientador = po.id_pessoa
                LEFT JOIN pessoa ps ON ce.id_pessoa_supervisor = ps.id_pessoa
                LEFT JOIN pessoa pc ON ce.id_pessoa_concedente = pc.id_pessoa
                WHERE pa.id_planoatividade = ?
            `, [planoId]);

            if (!planoAtividade) {
                return res.status(404).render('error', {
                    title: 'Erro',
                    message: 'Plano de atividade não encontrado',
                    error: { status: 404 },
                    currentPage: 'error'
                });
            }

            res.render('frequencia-form', {
                title: 'Nova Frequência - CoordenAI - Gestão',
                planoAtividade,
                planoAtividadeId: planoId,
                frequencia: null,
                user: req.session.user,
                currentPage: 'frequencia-form',
                action: 'create'
            });
        } catch (error) {
            console.error('Erro ao exibir formulário de criação de frequência:', error);
            res.status(500).render('error', {
                title: 'Erro',
                message: 'Erro interno do servidor',
                error: { status: 500 },
                currentPage: 'error'
            });
        }
    }

    /**
     * Salva nova frequência
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async salvar(req, res) {
        return this.store(req, res);
    }

    async store(req, res) {
        try {
            const {
                id_planoatividade,
                data_abertura,
                data_encerramento,
                mesdereferencia,
                resumo_atividades,
                registros_diarios
            } = req.body;

            // Validações básicas
            if (!id_planoatividade || !data_abertura || !mesdereferencia) {
                return res.status(400).json({
                    success: false,
                    message: 'Campos obrigatórios não preenchidos'
                });
            }

            // Converter datas do formato brasileiro para americano
            const dataAberturaAmericana = this.converterDataBrasileiraParaAmericana(data_abertura);
            const dataEncerramentoAmericana = data_encerramento ? this.converterDataBrasileiraParaAmericana(data_encerramento) : null;

            if (!dataAberturaAmericana) {
                return res.status(400).json({
                    success: false,
                    message: 'Data de abertura inválida. Use o formato dd/mm/aaaa'
                });
            }

            if (data_encerramento && !dataEncerramentoAmericana) {
                return res.status(400).json({
                    success: false,
                    message: 'Data de encerramento inválida. Use o formato dd/mm/aaaa'
                });
            }

            // Verificar se já existe frequência para este plano de atividade e mês
            const frequenciaExistente = await databaseConfig.get(
                'SELECT id_campo_estagio_frequencia FROM campo_estagio_frequencia WHERE id_planoatividade = ? AND mesdereferencia = ?',
                [id_planoatividade, mesdereferencia]
            );

            if (frequenciaExistente) {
                return res.status(400).json({
                    success: false,
                    message: 'Já existe uma frequência cadastrada para este mês'
                });
            }

            // Debug: verificar valores antes da inserção
            // Garantir que valores undefined sejam convertidos para null
            const parametros = [
                id_planoatividade,
                dataAberturaAmericana,
                dataEncerramentoAmericana === undefined ? null : dataEncerramentoAmericana,
                mesdereferencia,
                resumo_atividades === undefined ? null : resumo_atividades
            ];
            
            // console.log('[DEBUG] Valores para inserção:', {
            //     id_planoatividade,
            //     dataAberturaAmericana,
            //     dataEncerramentoAmericana,
            //     mesdereferencia,
            //     resumo_atividades
            // });
            // console.log('[DEBUG] Parâmetros da query:', parametros);
            // console.log('[DEBUG] Tipos dos parâmetros:', parametros.map(p => typeof p));
            // console.log('[DEBUG] Parâmetros undefined:', parametros.map((p, i) => p === undefined ? i : null).filter(i => i !== null));
            // console.log('[DEBUG] Parâmetros null:', parametros.map((p, i) => p === null ? i : null).filter(i => i !== null));

            // Iniciar transação
            await databaseConfig.run('START TRANSACTION');

            try {
                // Inserir cabeçalho da frequência
                const resultFrequencia = await databaseConfig.run(`
                    INSERT INTO campo_estagio_frequencia (
                        id_planoatividade,
                        data_abertura,
                        data_encerramento,
                        mesdereferencia,
                        resumo_atividades
                    ) VALUES (?, ?, ?, ?, ?)
                `, parametros);

                const frequenciaId = resultFrequencia.insertId;
                // console.log('[DEBUG] FrequenciaId obtido:', frequenciaId);
                // console.log('[DEBUG] Resultado completo:', resultFrequencia);

                // Inserir registros diários se fornecidos
                if (registros_diarios && Array.isArray(registros_diarios)) {
                    for (const registro of registros_diarios) {
                        if (registro.data_da_frequencia && registro.hora_inicial && registro.hora_final) {
                            // Converter data do registro diário para formato americano
                            const dataFrequenciaAmericana = this.converterDataBrasileiraParaAmericana(registro.data_da_frequencia);
                            
                            if (!dataFrequenciaAmericana) {
                                throw new Error(`Data de frequência inválida no registro diário: ${registro.data_da_frequencia}. Use o formato dd/mm/aaaa`);
                            }

                            // Validar formato das horas
                            if (!registro.hora_inicial || !registro.hora_final) {
                                throw new Error(`Horários obrigatórios não preenchidos no registro diário`);
                            }

                            // Validar formato HH:MM ou HH:MM:SS (input type="time" pode enviar ambos)
                            const regexHora = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
                            if (!regexHora.test(registro.hora_inicial)) {
                                throw new Error(`Hora inicial inválida: ${registro.hora_inicial}. Use o formato HH:MM ou HH:MM:SS`);
                            }
                            if (!regexHora.test(registro.hora_final)) {
                                throw new Error(`Hora final inválida: ${registro.hora_final}. Use o formato HH:MM ou HH:MM:SS`);
                            }

                            // Normalizar para HH:MM (remover segundos se presentes)
                            const horaInicialNormalizada = registro.hora_inicial.substring(0, 5);
                            const horaFinalNormalizada = registro.hora_final.substring(0, 5);

                            // Sempre recalcular total de horas no backend (não confiar no frontend)
                            // console.log(`[DEBUG] Processando registro: hora_inicial=${registro.hora_inicial}, hora_final=${registro.hora_final}`);
                            // console.log(`[DEBUG] Horas normalizadas: inicial=${horaInicialNormalizada}, final=${horaFinalNormalizada}`);
                            
                            const horaInicial = new Date(`1970-01-01T${horaInicialNormalizada}:00`);
                            const horaFinal = new Date(`1970-01-01T${horaFinalNormalizada}:00`);
                            
                            // console.log(`[DEBUG] Objetos Date criados: horaInicial=${horaInicial}, horaFinal=${horaFinal}`);
                            
                            if (isNaN(horaInicial.getTime()) || isNaN(horaFinal.getTime())) {
                                throw new Error(`Horários inválidos: inicial=${registro.hora_inicial}, final=${registro.hora_final}`);
                            }

                            const diffMs = horaFinal - horaInicial;
                            if (diffMs < 0) {
                                throw new Error(`Hora final deve ser posterior à hora inicial`);
                            }

                            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                            const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                            const totalHora = `${diffHours.toString().padStart(2, '0')}:${diffMinutes.toString().padStart(2, '0')}:00`;
                            
                            // console.log(`[DEBUG] Total hora calculado: ${totalHora}`);

                            await databaseConfig.run(`
                                INSERT INTO frequencia_registrodiario (
                                    id_campo_estagio_frequencia,
                                    data_da_frequencia,
                                    hora_inicial,
                                    hora_final,
                                    total_hora,
                                    atividade_do_dia
                                ) VALUES (?, ?, ?, ?, ?, ?)
                            `, [
                                frequenciaId,
                                dataFrequenciaAmericana,
                                registro.hora_inicial,
                                registro.hora_final,
                                totalHora,
                                registro.atividade_do_dia || ''
                            ]);
                            
                            // console.log('[DEBUG] Registro diário inserido:', {
                            //     frequenciaId,
                            //     dataFrequenciaAmericana,
                            //     hora_inicial: registro.hora_inicial,
                            //     hora_final: registro.hora_final,
                            //     totalHora,
                            //     atividade_do_dia: registro.atividade_do_dia || ''
                            // });
                        }
                    }
                }

                // Confirmar transação
                await databaseConfig.run('COMMIT');

                res.json({
                    success: true,
                    message: 'Frequência criada com sucesso!',
                    id: frequenciaId
                });
            } catch (error) {
                // Reverter transação em caso de erro
                await databaseConfig.run('ROLLBACK');
                throw error;
            }
        } catch (error) {
            console.error('Erro ao criar frequência:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor: ' + error.message
            });
        }
    }

    /**
     * Exibe detalhes de uma frequência específica
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async exibir(req, res) {
        return this.show(req, res);
    }

    async show(req, res) {
        try {
            const { id } = req.params;

            // Buscar dados da frequência
            const frequencia = await databaseConfig.get(`
                SELECT 
                    cef.*,
                    pe.nome AS nome_estagiario,
                    po.nome AS nome_orientador,
                    ps.nome AS nome_supervisor,
                    pc.nome AS nome_concedente,
                    ce.tipo_estagio,
                    ce.semestre_ano,
                    pa.situacao AS pa_situacao
                FROM campo_estagio_frequencia cef
                INNER JOIN campo_estagio_planoatividade pa ON cef.id_planoatividade = pa.id_planoatividade
                INNER JOIN campo_estagio ce ON pa.id_campo_estagio = ce.id_campo_estagio
                LEFT JOIN pessoa pe ON ce.id_pessoa_estagiario = pe.id_pessoa
                LEFT JOIN pessoa po ON ce.id_pessoa_orientador = po.id_pessoa
                LEFT JOIN pessoa ps ON ce.id_pessoa_supervisor = ps.id_pessoa
                LEFT JOIN pessoa pc ON ce.id_pessoa_concedente = pc.id_pessoa
                WHERE cef.id_campo_estagio_frequencia = ?
            `, [id]);

            if (!frequencia) {
                return res.status(404).render('error', {
                    title: 'Erro',
                    message: 'Frequência não encontrada',
                    error: { status: 404 },
                    currentPage: 'error'
                });
            }

            // Verificar permissões (mesma lógica do lancamentoDiario)
            if (userRole !== 'Administrador' && userId !== frequencia.id_estagiario) {
                return res.status(403).render('error', {
                    title: 'Erro - CoordenAI',
                    message: 'Acesso negado',
                    user: req.session.user
                });
            }

            // Buscar registros diários
            const registrosDiarios = await databaseConfig.all(`
                SELECT *
                FROM frequencia_registrodiario
                WHERE id_campo_estagio_frequencia = ?
                ORDER BY data_da_frequencia ASC
            `, [id]);

            res.render('error', {
                title: 'Funcionalidade não implementada',
                message: 'A visualização de detalhes da frequência ainda não foi implementada.',
                user: req.session.user
            });
        } catch (error) {
            console.error('Erro ao exibir frequência:', error);
            res.status(500).render('error', {
                title: 'Erro',
                message: 'Erro interno do servidor',
                error: { status: 500 },
                currentPage: 'error'
            });
        }
    }

    /**
     * Exibe formulário de edição de frequência
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async editar(req, res) {
        return this.edit(req, res);
    }

    async edit(req, res) {
        try {
            const { id } = req.params;
            const userId = req.session.user.id;
            const userRole = req.session.user.nivelacesso;

            // Buscar dados da frequência
            const frequencia = await databaseConfig.get(`
                SELECT 
                    cef.*,
                    pe.nome AS nome_estagiario,
                    po.nome AS nome_orientador,
                    ps.nome AS nome_supervisor,
                    pc.nome AS nome_concedente,
                    ce.tipo_estagio,
                    ce.semestre_ano,
                    pa.situacao AS pa_situacao,
                    ce.id_pessoa_estagiario as id_estagiario
                FROM campo_estagio_frequencia cef
                INNER JOIN campo_estagio_planoatividade pa ON cef.id_planoatividade = pa.id_planoatividade
                INNER JOIN campo_estagio ce ON pa.id_campo_estagio = ce.id_campo_estagio
                LEFT JOIN pessoa pe ON ce.id_pessoa_estagiario = pe.id_pessoa
                LEFT JOIN pessoa po ON ce.id_pessoa_orientador = po.id_pessoa
                LEFT JOIN pessoa ps ON ce.id_pessoa_supervisor = ps.id_pessoa
                LEFT JOIN pessoa pc ON ce.id_pessoa_concedente = pc.id_pessoa
                WHERE cef.id_campo_estagio_frequencia = ?
            `, [id]);

            if (!frequencia) {
                return res.status(404).render('error', {
                    title: 'Erro',
                    message: 'Frequência não encontrada',
                    error: { status: 404 },
                    currentPage: 'error'
                });
            }

            // Buscar registros diários
            const registrosDiarios = await databaseConfig.all(`
                SELECT *
                FROM frequencia_registrodiario
                WHERE id_campo_estagio_frequencia = ?
                ORDER BY data_da_frequencia ASC
            `, [id]);

            // Incluir registros diários no objeto frequência
            frequencia.registros_diarios = registrosDiarios;

            // Buscar dados do plano de atividade
            const planoAtividade = await databaseConfig.get(`
                SELECT 
                    pa.*,
                    ce.tipo_estagio,
                    ce.semestre_ano,
                    pe.nome AS nome_estagiario,
                    po.nome AS nome_orientador,
                    ps.nome AS nome_supervisor,
                    pc.nome AS nome_concedente
                FROM campo_estagio_planoatividade pa
                INNER JOIN campo_estagio ce ON pa.id_campo_estagio = ce.id_campo_estagio
                LEFT JOIN pessoa pe ON ce.id_pessoa_estagiario = pe.id_pessoa
                LEFT JOIN pessoa po ON ce.id_pessoa_orientador = po.id_pessoa
                LEFT JOIN pessoa ps ON ce.id_pessoa_supervisor = ps.id_pessoa
                LEFT JOIN pessoa pc ON ce.id_pessoa_concedente = pc.id_pessoa
                WHERE pa.id_planoatividade = ?
            `, [frequencia.id_planoatividade]);

            res.render('frequencia-form', {
                title: 'Editar Frequência - CoordenAI - Gestão',
                frequencia,
                registrosDiarios,
                planoAtividade,
                planoAtividadeId: frequencia.id_planoatividade,
                user: req.session.user,
                currentPage: 'frequencia-form',
                action: 'edit'
            });
        } catch (error) {
            console.error('Erro ao exibir formulário de edição de frequência:', error);
            res.status(500).render('error', {
                title: 'Erro',
                message: 'Erro interno do servidor',
                error: { status: 500 },
                currentPage: 'error'
            });
        }
    }

    /**
     * Atualiza uma frequência existente
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async atualizar(req, res) {
        try {
            const { id } = req.params;
            const {
                data_abertura,
                data_encerramento,
                mesdereferencia,
                resumo_atividades,
                registros_diarios
            } = req.body;

            // Validações básicas
            if (!data_abertura || !mesdereferencia) {
                return res.status(400).json({
                    success: false,
                    message: 'Campos obrigatórios não preenchidos'
                });
            }

            // Verificar se a frequência existe
            const frequenciaExistente = await databaseConfig.get(
                'SELECT * FROM campo_estagio_frequencia WHERE id_campo_estagio_frequencia = ?',
                [id]
            );

            if (!frequenciaExistente) {
                return res.status(404).json({
                    success: false,
                    message: 'Frequência não encontrada'
                });
            }

            // Converter datas do formato brasileiro para americano
            const dataAberturaAmericana = this.converterDataBrasileiraParaAmericana(data_abertura);
            const dataEncerramentoAmericana = data_encerramento ? this.converterDataBrasileiraParaAmericana(data_encerramento) : null;

            if (!dataAberturaAmericana) {
                return res.status(400).json({
                    success: false,
                    message: 'Data de abertura inválida. Use o formato dd/mm/aaaa'
                });
            }

            if (data_encerramento && !dataEncerramentoAmericana) {
                return res.status(400).json({
                    success: false,
                    message: 'Data de encerramento inválida. Use o formato dd/mm/aaaa'
                });
            }

            // Iniciar transação
            await databaseConfig.run('START TRANSACTION');

            try {
                // Atualizar cabeçalho da frequência
                await databaseConfig.run(`
                    UPDATE campo_estagio_frequencia SET
                        data_abertura = ?,
                        data_encerramento = ?,
                        mesdereferencia = ?,
                        resumo_atividades = ?
                    WHERE id_campo_estagio_frequencia = ?
                `, [
                    dataAberturaAmericana,
                    dataEncerramentoAmericana,
                    mesdereferencia,
                    resumo_atividades || null,
                    id
                ]);

                // Remover registros diários existentes
                await databaseConfig.run(
                    'DELETE FROM frequencia_registrodiario WHERE id_campo_estagio_frequencia = ?',
                    [id]
                );

                // Inserir novos registros diários se fornecidos
                if (registros_diarios && Array.isArray(registros_diarios)) {
                    for (const registro of registros_diarios) {
                        if (registro.data_da_frequencia && registro.hora_inicial && registro.hora_final) {
                            // Converter data do registro diário para formato americano
                            const dataFrequenciaAmericana = this.converterDataBrasileiraParaAmericana(registro.data_da_frequencia);
                            
                            if (!dataFrequenciaAmericana) {
                                throw new Error(`Data de frequência inválida no registro diário: ${registro.data_da_frequencia}. Use o formato dd/mm/aaaa`);
                            }

                            // Validar formato das horas
                            if (!registro.hora_inicial || !registro.hora_final) {
                                throw new Error(`Horários obrigatórios não preenchidos no registro diário`);
                            }

                            // Validar formato HH:MM ou HH:MM:SS (input type="time" pode enviar ambos)
                            const regexHora = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
                            if (!regexHora.test(registro.hora_inicial)) {
                                throw new Error(`Hora inicial inválida: ${registro.hora_inicial}. Use o formato HH:MM ou HH:MM:SS`);
                            }
                            if (!regexHora.test(registro.hora_final)) {
                                throw new Error(`Hora final inválida: ${registro.hora_final}. Use o formato HH:MM ou HH:MM:SS`);
                            }

                            // Normalizar para HH:MM (remover segundos se presentes)
                            const horaInicialNormalizada = registro.hora_inicial.substring(0, 5);
                            const horaFinalNormalizada = registro.hora_final.substring(0, 5);

                            // Sempre recalcular total de horas no backend (não confiar no frontend)
                            // console.log(`[DEBUG] Processando registro: hora_inicial=${registro.hora_inicial}, hora_final=${registro.hora_final}`);
                            // console.log(`[DEBUG] Horas normalizadas: inicial=${horaInicialNormalizada}, final=${horaFinalNormalizada}`);
                            
                            const horaInicial = new Date(`1970-01-01T${horaInicialNormalizada}:00`);
                            const horaFinal = new Date(`1970-01-01T${horaFinalNormalizada}:00`);
                            
                            // console.log(`[DEBUG] Objetos Date criados: horaInicial=${horaInicial}, horaFinal=${horaFinal}`);
                            
                            if (isNaN(horaInicial.getTime()) || isNaN(horaFinal.getTime())) {
                                throw new Error(`Horários inválidos: inicial=${registro.hora_inicial}, final=${registro.hora_final}`);
                            }

                            const diffMs = horaFinal - horaInicial;
                            if (diffMs < 0) {
                                throw new Error(`Hora final deve ser posterior à hora inicial`);
                            }

                            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                            const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                            const totalHora = `${diffHours.toString().padStart(2, '0')}:${diffMinutes.toString().padStart(2, '0')}:00`;
                            
                            // console.log(`[DEBUG] Total hora calculado: ${totalHora}`);

                            await databaseConfig.run(`
                                INSERT INTO frequencia_registrodiario (
                                    id_campo_estagio_frequencia,
                                    data_da_frequencia,
                                    hora_inicial,
                                    hora_final,
                                    total_hora,
                                    atividade_do_dia
                                ) VALUES (?, ?, ?, ?, ?, ?)
                            `, [
                                id,
                                dataFrequenciaAmericana,
                                horaInicialNormalizada,
                                horaFinalNormalizada,
                                totalHora,
                                registro.atividade_do_dia || ''
                            ]);
                        }
                    }
                }

                // Confirmar transação
                await databaseConfig.run('COMMIT');

                res.json({
                    success: true,
                    message: 'Frequência atualizada com sucesso!'
                });
            } catch (error) {
                // Reverter transação em caso de erro
                await databaseConfig.run('ROLLBACK');
                throw error;
            }
        } catch (error) {
            console.error('[FREQUENCIA] Erro ao atualizar frequência:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor: ' + error.message
            });
        }
    }

    /**
     * Exclui uma frequência
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async excluir(req, res) {
        try {
            // TODO: Implementar exclusão de frequência
            return res.status(501).json({ success: false, message: 'Método não implementado ainda' });
        } catch (error) {
            console.error('[FREQUENCIA] Erro ao excluir frequência:', error);
            return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
        }
    }

    /**
     * Gera PDF de uma frequência
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async gerarPDF(req, res) {
        try {
            const { id } = req.params;
            
            // Buscar dados da frequência
              const frequenciaQuery = `
                  SELECT 
                      cef.id_campo_estagio_frequencia,
                      cef.id_planoatividade,
                      cef.data_abertura,
                      cef.data_encerramento,
                      cef.mesdereferencia,
                      cef.total_hora_mesreferencia,
                      cef.aprovado_estagiario,
                      cef.aprovado_orientador,
                      cef.aprovado_supervisor,
                      cef.resumo_atividades,
                      cef.dataultimaatualizacao,
                      pe.nome AS nome_estagiario,
                      po.nome AS nome_orientador,
                      ps.nome AS nome_supervisor,
                      pc.nome AS nome_concedente,
                      ce.tipo_estagio,
                      ce.semestre_ano,
                      ce.situacao AS ce_situacao,
                      pa.situacao AS pa_situacao
                  FROM campo_estagio_frequencia cef
                  INNER JOIN campo_estagio_planoatividade pa ON cef.id_planoatividade = pa.id_planoatividade
                  INNER JOIN campo_estagio ce ON pa.id_campo_estagio = ce.id_campo_estagio
                  LEFT JOIN pessoa pe ON ce.id_pessoa_estagiario = pe.id_pessoa
                  LEFT JOIN pessoa po ON ce.id_pessoa_orientador = po.id_pessoa
                  LEFT JOIN pessoa ps ON ce.id_pessoa_supervisor = ps.id_pessoa
                  LEFT JOIN pessoa pc ON ce.id_pessoa_concedente = pc.id_pessoa
                  WHERE cef.id_campo_estagio_frequencia = ?
              `;
            
            const frequencia = await databaseConfig.get(frequenciaQuery, [id]);
            
            if (!frequencia) {
                return res.status(404).json({ success: false, message: 'Frequência não encontrada' });
            }
            
            // Buscar registros diários
            const registrosQuery = `
                SELECT 
                    data_da_frequencia,
                    hora_inicial,
                    hora_final,
                    total_hora,
                    atividade_do_dia
                FROM frequencia_registrodiario
                WHERE id_campo_estagio_frequencia = ?
                ORDER BY data_da_frequencia ASC
            `;
            
            const registros = await databaseConfig.all(registrosQuery, [id]);
            
            // Determinar aprovações para tabela
            const aprovacaoEstagiario = frequencia.aprovado_estagiario === 'Sim' ? frequencia.nome_estagiario : '';
            const aprovacaoOrientador = frequencia.aprovado_orientador === 'Sim' ? frequencia.nome_orientador : '';
            const aprovacaoSupervisor = frequencia.aprovado_supervisor === 'Sim' ? frequencia.nome_supervisor : '';
            
            const temAprovacao = aprovacaoEstagiario || aprovacaoOrientador || aprovacaoSupervisor;
            
            // Formatar data da última atualização
            const dataUltimaAtualizacao = frequencia.dataultimaatualizacao 
                ? new Date(frequencia.dataultimaatualizacao).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : 'Data não disponível';
            
            // Organizar registros em 4 colunas
            const registrosPorColuna = [];
            const totalRegistros = registros.length;
            const registrosPorColunaCount = Math.ceil(totalRegistros / 4);
            
            for (let i = 0; i < 4; i++) {
                const inicio = i * registrosPorColunaCount;
                const fim = Math.min(inicio + registrosPorColunaCount, totalRegistros);
                registrosPorColuna.push(registros.slice(inicio, fim));
            }
            
            // Template HTML para o PDF
            const htmlTemplate = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 20px;
                        font-size: 12px;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                        border-bottom: 2px solid #333;
                        padding-bottom: 15px;
                    }
                    .header h1 {
                        margin: 0;
                        font-size: 18px;
                        color: #333;
                    }
                    .info-section {
                        margin-bottom: 20px;
                    }
                    .info-row {
                        display: flex;
                        align-items: center;
                        margin-bottom: 5px;
                    }
                    .info-label {
                        font-weight: bold;
                        width: 150px;
                    }
                    .registros-container {
                        margin: 20px 0;
                    }
                    .registros-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr 1fr 1fr;
                        gap: 15px;
                        margin-bottom: 30px;
                    }
                    .coluna {
                        border: 1px solid #ddd;
                        padding: 5px;
                    }
                    .registro {
                        margin-bottom: 8px;
                        padding: 5px;
                        border-bottom: 1px solid #eee;
                        font-size: 10px;
                    }
                    .registro-data {
                        font-weight: bold;
                        color: #333;
                    }
                    .registro-horario {
                        color: #666;
                        margin: 2px 0;
                    }
                    .registro-atividade {
                        color: #444;
                        font-style: italic;
                        word-wrap: break-word;
                    }
                    .footer {
                        margin-top: 40px;
                        border-top: 2px solid #333;
                        padding-top: 20px;
                    }
                    .assinaturas {
                        display: grid;
                        grid-template-columns: 1fr 1fr 1fr;
                        gap: 30px;
                        margin-bottom: 20px;
                    }
                    .assinatura {
                        text-align: center;
                    }
                    .linha-assinatura {
                        border-bottom: 1px solid #333;
                        height: 40px;
                        margin-bottom: 5px;
                    }
                    .nome-pessoa {
                        font-weight: bold;
                        margin-bottom: 3px;
                    }
                    .cargo-pessoa {
                        font-size: 10px;
                        color: #666;
                    }
                    .aprovacao {
                        text-align: center;
                        font-weight: bold;
                        color: #2c5aa0;
                        margin-top: 15px;
                    }
                    .tabela-aprovacao {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 15px;
                    }
                    .tabela-aprovacao th {
                        background-color: #f8f9fa;
                        padding: 10px;
                        text-align: center;
                        font-weight: bold;
                        border: 1px solid #ddd;
                    }
                    .tabela-aprovacao td {
                        padding: 10px;
                        text-align: center;
                        border: 1px solid #ddd;
                        vertical-align: top;
                    }
                    .nome-aprovador {
                        font-weight: bold;
                        color: #2c5aa0;
                    }
                    .categoria-aprovador {
                        font-size: 10px;
                        color: #666;
                        margin-top: 3px;
                    }
                    .nao-aprovado {
                        text-align: center;
                        font-weight: bold;
                        color: #dc3545;
                        padding: 15px;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>RELATÓRIO DE FREQUÊNCIA</h1>
                </div>
                
                <div class="info-section">
                     <div class="info-row">
                         <span class="info-label">Estagiário:</span>
                         <span>${frequencia.nome_estagiario}</span>
                         <span class="info-label" style="margin-left: 50px;">Tipo de Estágio:</span>
                         <span>${frequencia.tipo_estagio}</span>
                     </div>
                     <div class="info-row">
                         <span class="info-label">Orientador:</span>
                         <span>${frequencia.nome_orientador}</span>
                         <span class="info-label" style="margin-left: 50px;">Total de Horas:</span>
                         <span>${frequencia.total_hora_mesreferencia || '0'}h</span>
                     </div>
                     <div class="info-row">
                         <span class="info-label">Supervisor:</span>
                         <span>${frequencia.nome_supervisor}</span>
                     </div>
                     <div class="info-row">
                         <span class="info-label">Período:</span>
                         <span>${frequencia.mesdereferencia} - ${frequencia.semestre_ano}</span>
                     </div>
                 </div>
                
                <div class="registros-container">
                    <h3>Registros de Frequência Diária</h3>
                    <div class="registros-grid">
                        ${registrosPorColuna.map((coluna, index) => `
                            <div class="coluna">
                                ${coluna.map(registro => `
                                    <div class="registro">
                                        <div class="registro-data">${new Date(registro.data_da_frequencia).toLocaleDateString('pt-BR')}</div>
                                        <div class="registro-horario">${registro.hora_inicial} - ${registro.hora_final} (${registro.total_hora})</div>
                                        <div class="registro-atividade">${registro.atividade_do_dia || 'Sem descrição'}</div>
                                    </div>
                                `).join('')}
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                ${frequencia.resumo_atividades ? `
                <div class="info-section">
                    <h3>Resumo das Atividades</h3>
                    <p>${frequencia.resumo_atividades}</p>
                </div>
                ` : ''}
                
                <div class="footer">
                    ${temAprovacao ? `
                        <table class="tabela-aprovacao">
                            <thead>
                                <tr>
                                    <th colspan="3">Relatório aprovado por</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
                                        ${aprovacaoEstagiario ? `
                                            <div class="nome-aprovador">${aprovacaoEstagiario}</div>
                                            <div class="categoria-aprovador">Estagiário</div>
                                        ` : ''}
                                    </td>
                                    <td>
                                        ${aprovacaoOrientador ? `
                                            <div class="nome-aprovador">${aprovacaoOrientador}</div>
                                            <div class="categoria-aprovador">Orientador</div>
                                        ` : ''}
                                    </td>
                                    <td>
                                        ${aprovacaoSupervisor ? `
                                            <div class="nome-aprovador">${aprovacaoSupervisor}</div>
                                            <div class="categoria-aprovador">Supervisor</div>
                                        ` : ''}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    ` : `
                        <table class="tabela-aprovacao">
                            <tbody>
                                <tr>
                                    <td colspan="3" class="nao-aprovado">Relatório não aprovado</td>
                                </tr>
                            </tbody>
                        </table>
                    `}
                    <div class="data-atualizacao" style="text-align: center; margin-top: 15px; font-size: 12px; color: #666;">
                        Registro das frequências atualizado pela última vez em ${dataUltimaAtualizacao}
                    </div>
                </div>
            </body>
            </html>
            `;
            
            // Gerar PDF usando a configuração do puppeteer do projeto
             const { generatePDF } = require('../config/puppeteer');
             
             const pdfBuffer = await generatePDF(htmlTemplate, {
                 format: 'A4',
                 margin: {
                     top: '20mm',
                     right: '15mm',
                     bottom: '20mm',
                     left: '15mm'
                 },
                 printBackground: true
             });
            
            // Configurar headers para download
             const filename = `frequencia_${frequencia.nome_estagiario.replace(/\s+/g, '_')}_${frequencia.mesdereferencia}_${frequencia.semestre_ano}.pdf`;
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', pdfBuffer.length);
            
            res.send(pdfBuffer);
            
        } catch (error) {
            console.error('[FREQUENCIA] Erro ao gerar PDF:', error);
            return res.status(500).json({ success: false, message: 'Erro interno do servidor: ' + error.message });
        }
    }

    /**
     * Aprova frequência como estagiário
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async aprovarEstagiario(req, res) {
        try {
            const { id } = req.params;
            const userId = req.session.user.id_pessoa;
            
            // Verificar se o usuário é realmente um estagiário na frequência
            const verificacao = await this.verificarPermissaoAprovacao(id, userId, 'estagiario');
            if (!verificacao.success) {
                return res.status(403).json(verificacao);
            }
            
            // Verificar se já foi aprovado pelo estagiário
            const frequencia = await this.frequenciaService.buscarFrequenciaPorId(id);
            if (frequencia.aprovado_estagiario === 'Sim') {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Esta frequência já foi aprovada pelo estagiário' 
                });
            }
            
            const resultado = await this.frequenciaService.aprovarFrequencia(id, 'estagiario', userId);
            
            return res.json({
                success: true,
                message: 'Frequência aprovada pelo estagiário com sucesso',
                data: resultado
            });
        } catch (error) {
            console.error('[FREQUENCIA] Erro ao aprovar como estagiário:', error);
            return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
        }
    }
    
    /**
     * Aprova frequência como orientador
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async aprovarOrientador(req, res) {
        try {
            const { id } = req.params;
            const userId = req.session.user.id_pessoa;
            
            // Verificar se o usuário é realmente um orientador na frequência
            const verificacao = await this.verificarPermissaoAprovacao(id, userId, 'orientador');
            if (!verificacao.success) {
                return res.status(403).json(verificacao);
            }
            
            // Verificar se já foi aprovado pelo orientador
            const frequencia = await this.frequenciaService.buscarFrequenciaPorId(id);
            if (frequencia.aprovado_orientador === 'Sim') {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Esta frequência já foi aprovada pelo orientador' 
                });
            }
            
            const resultado = await this.frequenciaService.aprovarFrequencia(id, 'orientador', userId);
            
            return res.json({
                success: true,
                message: 'Frequência aprovada pelo orientador com sucesso',
                data: resultado
            });
        } catch (error) {
            console.error('[FREQUENCIA] Erro ao aprovar como orientador:', error);
            return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
        }
    }
    
    /**
     * Aprova frequência como supervisor
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async aprovarSupervisor(req, res) {
        try {
            const { id } = req.params;
            const userId = req.session.user.id_pessoa;
            
            // Verificar se o usuário é realmente um supervisor na frequência
            const verificacao = await this.verificarPermissaoAprovacao(id, userId, 'supervisor');
            if (!verificacao.success) {
                return res.status(403).json(verificacao);
            }
            
            // Verificar se já foi aprovado pelo supervisor
            const frequencia = await this.frequenciaService.buscarFrequenciaPorId(id);
            if (frequencia.aprovado_supervisor === 'Sim') {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Esta frequência já foi aprovada pelo supervisor' 
                });
            }
            
            const resultado = await this.frequenciaService.aprovarFrequencia(id, 'supervisor', userId);
            
            return res.json({
                success: true,
                message: 'Frequência aprovada pelo supervisor com sucesso',
                data: resultado
            });
        } catch (error) {
            console.error('[FREQUENCIA] Erro ao aprovar como supervisor:', error);
            return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
        }
    }
    
    /**
     * Verifica se o usuário tem permissão para aprovar a frequência no papel especificado
     * @param {number} frequenciaId - ID da frequência
     * @param {number} userId - ID do usuário
     * @param {string} papel - Papel do usuário (estagiario, orientador, supervisor)
     * @returns {Promise<Object>}
     */
    async verificarPermissaoAprovacao(frequenciaId, userId, papel) {
        try {
            const sql = `
                SELECT 
                    ce.id_pessoa_estagiario,
                    ce.id_pessoa_orientador,
                    ce.id_pessoa_supervisor,
                    p.categoria
                FROM campo_estagio_frequencia cef
                INNER JOIN campo_estagio_planoatividade pa ON cef.id_planoatividade = pa.id_planoatividade
                INNER JOIN campo_estagio ce ON pa.id_campo_estagio = ce.id_campo_estagio
                JOIN pessoa p ON p.id_pessoa = ?
                WHERE cef.id_campo_estagio_frequencia = ?
            `;
            
            const resultado = await databaseConfig.get(sql, [userId, frequenciaId]);
            
            if (!resultado) {
                return { success: false, message: 'Frequência não encontrada' };
            }
            
            // Verificar se o usuário tem o papel correto (removida validação de categoria)
            let temPermissao = false;
            let categoriaEsperada = '';
            
            switch (papel) {
                case 'estagiario':
                    temPermissao = resultado.id_pessoa_estagiario === userId;
                    categoriaEsperada = 'Estagiário';
                    break;
                case 'orientador':
                    temPermissao = resultado.id_pessoa_orientador === userId;
                    categoriaEsperada = 'Orientador';
                    break;
                case 'supervisor':
                    temPermissao = resultado.id_pessoa_supervisor === userId;
                    categoriaEsperada = 'Supervisor';
                    break;
            }
            
            if (!temPermissao) {
                return { 
                    success: false, 
                    message: `Você não tem permissão para aprovar esta frequência como ${categoriaEsperada}` 
                };
            }
            
            return { success: true, categoria: categoriaEsperada };
        } catch (error) {
            console.error('[FREQUENCIA] Erro ao verificar permissão:', error);
            return { success: false, message: 'Erro ao verificar permissões' };
        }
    }

    // Os métodos aprovarOrientador e aprovarSupervisor já estão implementados acima (linhas 832-909)
    // Removendo duplicatas não implementadas

    /**
     * Exibe o formulário de lançamento diário
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async lancamentoDiario(req, res) {
        try {
            const { id } = req.params;
            const userId = req.session.user.id;
            const userRole = req.session.user.role;

            // Buscar a frequência
            const frequenciaRows = await databaseConfig.all(`
                SELECT 
                    f.*,
                    e.nome as nome_estagiario,
                    ce.id_pessoa_estagiario as id_estagiario
                FROM campo_estagio_frequencia f
                INNER JOIN campo_estagio_planoatividade pa ON f.id_planoatividade = pa.id_planoatividade
                INNER JOIN campo_estagio ce ON pa.id_campo_estagio = ce.id_campo_estagio
                INNER JOIN pessoa e ON ce.id_pessoa_estagiario = e.id_pessoa
                WHERE f.id_campo_estagio_frequencia = ?
            `, [id]);

            if (frequenciaRows.length === 0) {
                return res.status(404).render('error', {
                    title: 'Erro - CoordenAI',
                    message: 'Frequência não encontrada',
                    user: req.session.user
                });
            }

            const frequencia = frequenciaRows[0];

            res.render('frequencia-form-lancamento-diario', {
                title: 'Lançamento Diário - CoordenAI',
                frequencia,
                estagiario: { nome: frequencia.nome_estagiario },
                user: req.session.user
            });

        } catch (error) {
            console.error('Erro ao exibir formulário de lançamento diário:', error);
            res.status(500).render('error', {
                title: 'Erro - CoordenAI',
                message: 'Erro interno do servidor',
                user: req.session.user
            });
        }
    }

    /**
     * Salva um novo registro diário
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async salvarLancamentoDiario(req, res) {
        try {
            const { id_campo_estagio_frequencia, data_frequencia, hora_inicial, hora_final, atividade_do_dia } = req.body;
            const userId = req.session.user.id;
            const userRole = req.session.user.role;

            // Validar campos obrigatórios
            if (!id_campo_estagio_frequencia || !data_frequencia || !hora_inicial || !hora_final || !atividade_do_dia) {
                return res.status(400).json({
                    success: false,
                    message: 'Todos os campos são obrigatórios'
                });
            }

            // Converter data brasileira para americana
            const dataFrequenciaAmericana = this.converterDataBrasileiraParaAmericana(data_frequencia);
            if (!dataFrequenciaAmericana) {
                return res.status(400).json({
                    success: false,
                    message: 'Data inválida. Use o formato dd/mm/aaaa'
                });
            }

            // Validar formato das horas (aceitar HH:MM ou HH:MM:SS)
            const regexHora = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
            if (!regexHora.test(hora_inicial)) {
                return res.status(400).json({
                    success: false,
                    message: `Hora inicial inválida: ${hora_inicial}. Use o formato HH:MM`
                });
            }
            if (!regexHora.test(hora_final)) {
                return res.status(400).json({
                    success: false,
                    message: `Hora final inválida: ${hora_final}. Use o formato HH:MM`
                });
            }

            // Normalizar horas para HH:MM (remover segundos se presentes)
            const horaInicialNormalizada = hora_inicial.substring(0, 5);
            const horaFinalNormalizada = hora_final.substring(0, 5);

            // Verificar permissões
            const frequenciaRows = await databaseConfig.all(`
                SELECT 
                    f.*,
                    ce.id_pessoa_estagiario as id_estagiario
                FROM campo_estagio_frequencia f
                INNER JOIN campo_estagio_planoatividade pa ON f.id_planoatividade = pa.id_planoatividade
                INNER JOIN campo_estagio ce ON pa.id_campo_estagio = ce.id_campo_estagio
                WHERE f.id_campo_estagio_frequencia = ?
            `, [id_campo_estagio_frequencia]);

            if (frequenciaRows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Frequência não encontrada'
                });
            }

            const frequencia = frequenciaRows[0];

            // Calcular total de horas
            const [horaIni, minIni] = horaInicialNormalizada.split(':').map(Number);
            const [horaFim, minFim] = horaFinalNormalizada.split(':').map(Number);
            
            const dataBase = new Date(dataFrequenciaAmericana + 'T00:00:00');
            const dataInicial = new Date(dataBase);
            dataInicial.setHours(horaIni, minIni, 0, 0);
            
            const dataFinal = new Date(dataBase);
            dataFinal.setHours(horaFim, minFim, 0, 0);
            
            // Se hora final for menor que inicial, assumir que passou da meia-noite
            if (dataFinal.getTime() <= dataInicial.getTime()) {
                dataFinal.setDate(dataFinal.getDate() + 1);
            }
            
            const diffMs = dataFinal - dataInicial;
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            
            const totalHora = `${String(diffHours).padStart(2, '0')}:${String(diffMinutes).padStart(2, '0')}:00`;

            // Inserir registro diário
            await databaseConfig.run(`
                INSERT INTO frequencia_registrodiario (
                    id_campo_estagio_frequencia,
                    data_da_frequencia,
                    hora_inicial,
                    hora_final,
                    total_hora,
                    atividade_do_dia
                ) VALUES (?, ?, ?, ?, ?, ?)
            `, [
                id_campo_estagio_frequencia,
                dataFrequenciaAmericana,
                horaInicialNormalizada,
                horaFinalNormalizada,
                totalHora,
                atividade_do_dia
            ]);

            res.json({
                success: true,
                message: 'Lançamento diário salvo com sucesso'
            });

        } catch (error) {
            console.error('Erro ao salvar lançamento diário:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }
}

module.exports = FrequenciaController;