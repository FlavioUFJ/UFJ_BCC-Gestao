/**
 * Controlador de Planos de Atividade
 * Gerencia todas as rotas relacionadas aos planos de atividade dos estágios
 */

const databaseConfig = require('../config/database');
const { messages, enums } = require('../config');
const Pessoa = require('../models/Pessoa');

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
            const userId = req.session.user.id;
            const userCategory = req.session.user.categoria;
            
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
            
            // Filtrar por usuário baseado na categoria
            if (userCategory === 'Estagiário') {
                query += ` WHERE ce.id_pessoa_estagiario = ?`;
            } else if (userCategory === 'Professor') {
                query += ` WHERE ce.id_pessoa_orientador = ?`;
            } else if (userCategory === 'Supervisor') {
                query += ` WHERE ce.id_pessoa_supervisor = ?`;
            }
            
            query += ` ORDER BY pa_dataultimaatualizacao DESC`;
            
            const params = ['Estagiário', 'Professor', 'Supervisor'].includes(userCategory) ? [userId] : [];
            const planos = await databaseConfig.all(query, params);
            
            if (req.xhr || req.headers.accept?.includes('application/json')) {
                return res.json({ success: true, data: planos });
            }
            
            res.render('planos-atividade-list', { 
                title: 'Planos de Atividade',
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
            console.log('DEBUG: Iniciando criação de plano de atividade');
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
            console.log('DEBUG: Validando campos obrigatórios');
            if (!id_campo_estagio || !atividades || !objetivos || !cronograma || !data_inicial || !data_final || !cargahoraria) {
                console.log('DEBUG: Campos obrigatórios faltando:', {
                    id_campo_estagio: !!id_campo_estagio,
                    atividades: !!atividades,
                    objetivos: !!objetivos,
                    cronograma: !!cronograma,
                    data_inicial: !!data_inicial,
                    data_final: !!data_final,
                    cargahoraria: !!cargahoraria
                });
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
            
            // Função para converter data DD/MM/YYYY para YYYY-MM-DD
            const converterDataParaISO = (dataBR) => {
                if (!dataBR || dataBR.length !== 10) return null;
                const partes = dataBR.split('/');
                if (partes.length !== 3) return null;
                return `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
            };

            // Converter datas do formato brasileiro para ISO
            const dataInicialISO = converterDataParaISO(data_inicial);
            const dataFinalISO = converterDataParaISO(data_final);

            if (!dataInicialISO || !dataFinalISO) {
                return res.status(400).json({
                    success: false,
                    message: 'Formato de data inválido. Use DD/MM/AAAA'
                });
            }

            // Validações de data
            const campoEstagio = await this.buscarCampoEstagio(id_campo_estagio);
            if (!campoEstagio) {
                return res.status(404).json({
                    success: false,
                    message: 'Campo de estágio não encontrado'
                });
            }

            const dataInicialCampo = new Date(campoEstagio.ce_data_inicio);
            const dataFinalCampo = new Date(campoEstagio.ce_data_fim);
            const dataInicialPlano = new Date(dataInicialISO);
            const dataFinalPlano = new Date(dataFinalISO);

            // Validar se data inicial do plano é >= data inicial do campo
            if (dataInicialPlano < dataInicialCampo) {
                return res.status(400).json({
                    success: false,
                    message: 'A data inicial do plano não pode ser menor que a data inicial do estágio'
                });
            }

            // Validar se data final do plano é <= data final do campo
            if (dataFinalPlano > dataFinalCampo) {
                return res.status(400).json({
                    success: false,
                    message: 'A data final do plano não pode ser maior que a data final do estágio'
                });
            }

            // Validar se data inicial <= data final
            if (dataInicialPlano > dataFinalPlano) {
                return res.status(400).json({
                    success: false,
                    message: 'A data inicial não pode ser maior que a data final'
                });
            }

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
                situacao || 'Em edição',
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
            
            console.log('DEBUG: Executando SQL:', sql);
            console.log('DEBUG: Parâmetros:', params);
            
            const result = await databaseConfig.run(sql, params);
            
            console.log('DEBUG: Plano criado com sucesso, ID:', result.lastID);
            
            if (req.xhr || req.headers.accept?.includes('application/json')) {
                return res.json({ success: true, message: 'Plano de atividade criado com sucesso', data: { id: result.lastID } });
            }
            
            res.redirect('/estagios/dashboard?success=Plano de atividade criado com sucesso');
        } catch (error) {
            console.error('Erro ao criar plano de atividade:', error);
            
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

            res.render('plano-atividade-view', {
                title: 'Visualizar Plano de Atividade',
                plano,
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

            // Verificar se pode ser editado (apenas se estiver "Em edição")
            if (plano.pa_situacao === 'Aprovado') {
                return res.status(403).render('error', {
                    title: 'Erro',
                    message: 'Plano de atividade aprovado não pode ser editado'
                });
            }
            
            // Criar objeto campoEstagio para compatibilidade com o formulário
            const campoEstagio = {
                id_campo_estagio: plano.pa_id_campo_estagio,
                empresa: plano.nome_concedente,
                data_inicial: plano.ce_data_inicio,
                data_final: plano.ce_data_fim,
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

            // Verificar se pode ser editado
            if (planoExistente.situacao === 'Aprovado') {
                return res.status(403).json({
                    success: false,
                    message: 'Plano de atividade aprovado não pode ser editado'
                });
            }

            // Função para converter data DD/MM/YYYY para YYYY-MM-DD
            const converterDataParaISO = (dataBR) => {
                if (!dataBR || dataBR.length !== 10) return null;
                const partes = dataBR.split('/');
                if (partes.length !== 3) return null;
                return `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
            };

            // Converter datas do formato brasileiro para ISO
            const dataInicialISO = converterDataParaISO(data_inicial);
            const dataFinalISO = converterDataParaISO(data_final);

            if (!dataInicialISO || !dataFinalISO) {
                return res.status(400).json({
                    success: false,
                    message: 'Formato de data inválido. Use DD/MM/AAAA'
                });
            }

            const dataAtual = new Date().toISOString();

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
            
            // Buscar dados completos do plano de atividade
            const plano = await databaseConfig.get(`
                SELECT 
                    pa.*,
                    ce.empresa,
                    ce.endereco,
                    ce.telefone,
                    ce.data_inicial as campo_data_inicial,
                    ce.data_final as campo_data_final,
                    pe.nome as nome_estagiario,
                    pe.email as email_estagiario,
                    pe.telefone as telefone_estagiario,
                    po.nome as nome_orientador,
                    po.email as email_orientador,
                    ps.nome as nome_supervisor,
                    ps.email as email_supervisor
                FROM campo_estagio_planoatividade pa
                LEFT JOIN campo_estagio ce ON pa.id_campo_estagio = ce.id_campo_estagio
                LEFT JOIN pessoa pe ON ce.id_pessoa_estagiario = pe.id_pessoa
                LEFT JOIN pessoa po ON ce.id_pessoa_orientador = po.id_pessoa
                LEFT JOIN pessoa ps ON ce.id_pessoa_supervisor = ps.id_pessoa
                WHERE pa.id_planoatividade = ?
            `, [id]);
            
            if (!plano) {
                return res.status(404).json({
                    success: false,
                    message: 'Plano de atividade não encontrado'
                });
            }
            
            // Renderizar template HTML para PDF
            const htmlContent = await this.renderPDFTemplate(plano);
            
            // Configurar cabeçalhos para download do PDF
            const filename = `plano_atividade_${plano.nome_estagiario?.replace(/\s+/g, '_') || 'documento'}_${new Date().toISOString().split('T')[0]}.pdf`;
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            
            // Por enquanto, retornar o HTML que seria convertido em PDF
            // TODO: Implementar conversão real para PDF usando puppeteer ou similar
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.send(htmlContent);
            
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
        const dataInicial = plano.pa_data_inicial ? new Date(plano.pa_data_inicial).toLocaleDateString('pt-BR') : 'Não informado';
        const dataFinal = plano.pa_data_final ? new Date(plano.pa_data_final).toLocaleDateString('pt-BR') : 'Não informado';
        const dataLancamento = plano.pa_data_lancamento ? new Date(plano.pa_data_lancamento).toLocaleDateString('pt-BR') : 'Não informado';
        
        return `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Plano de Atividade - ${plano.nome_estagiario}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                .section { margin-bottom: 25px; }
                .section-title { background: #f0f0f0; padding: 10px; font-weight: bold; border-left: 4px solid #007bff; }
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
                .info-item { margin-bottom: 10px; }
                .info-label { font-weight: bold; }
                .content-box { border: 1px solid #ddd; padding: 15px; margin: 10px 0; min-height: 100px; }
                .signatures { margin-top: 50px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 30px; }
                .signature-box { text-align: center; border-top: 1px solid #333; padding-top: 10px; }
                @media print { body { margin: 0; } }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>PLANO DE ATIVIDADE DE ESTÁGIO</h1>
                <h2>Universidade Federal de Jataí - UFJ</h2>
                <h3>Bacharelado em Ciência da Computação</h3>
            </div>
            
            <div class="section">
                <div class="section-title">INFORMAÇÕES GERAIS</div>
                <div class="info-grid">
                    <div>
                        <div class="info-item">
                            <span class="info-label">Estagiário:</span> ${plano.nome_estagiario || 'Não informado'}
                        </div>
                        <div class="info-item">
                            <span class="info-label">Email:</span> ${plano.email_estagiario || 'Não informado'}
                        </div>
                        <div class="info-item">
                            <span class="info-label">Empresa:</span> ${plano.nome_concedente || 'Não informado'}
                        </div>
                        <div class="info-item">
                            <span class="info-label">Situação:</span> ${plano.pa_situacao || 'Em edição'}
                        </div>
                    </div>
                    <div>
                        <div class="info-item">
                            <span class="info-label">Orientador:</span> ${plano.nome_orientador || 'Não informado'}
                        </div>
                        <div class="info-item">
                            <span class="info-label">Supervisor:</span> ${plano.nome_supervisor || 'Não informado'}
                        </div>
                        <div class="info-item">
                            <span class="info-label">Período:</span> ${dataInicial} - ${dataFinal}
                        </div>
                        <div class="info-item">
                            <span class="info-label">Carga Horária:</span> ${plano.pa_cargahoraria || 'Não informado'} horas/semana
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">ATIVIDADES A DESENVOLVER</div>
                <div class="content-box">
                    ${plano.pa_atividades ? plano.pa_atividades.replace(/\n/g, '<br>') : 'Não informado'}
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">OBJETIVOS</div>
                <div class="content-box">
                    ${plano.pa_objetivos ? plano.pa_objetivos.replace(/\n/g, '<br>') : 'Não informado'}
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">CRONOGRAMA</div>
                <div class="content-box">
                    ${plano.pa_cronograma ? plano.pa_cronograma.replace(/\n/g, '<br>') : 'Não informado'}
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">RECURSOS NECESSÁRIOS</div>
                <div class="content-box">
                    ${plano.pa_recursos ? plano.pa_recursos.replace(/\n/g, '<br>') : 'Não informado'}
                </div>
            </div>
            
            <div class="signatures">
                <div class="signature-box">
                    <div>_________________________________</div>
                    <div><strong>Estagiário</strong></div>
                    <div>${plano.nome_estagiario || 'Não informado'}</div>
                </div>
                <div class="signature-box">
                    <div>_________________________________</div>
                    <div><strong>Orientador</strong></div>
                    <div>${plano.nome_orientador || 'Não informado'}</div>
                </div>
                <div class="signature-box">
                    <div>_________________________________</div>
                    <div><strong>Supervisor</strong></div>
                    <div>${plano.nome_supervisor || 'Não informado'}</div>
                </div>
            </div>
            
            <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #666;">
                <p>Documento gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
                <p>Sistema de Gestão de Estágios - UFJ BCC</p>
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
                pa.dataultimaatualizacao AS pa_dataultimaatualizacao 
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
}

module.exports = PlanoAtividadeController;