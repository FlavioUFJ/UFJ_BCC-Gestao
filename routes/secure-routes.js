/**
 * Rotas com controle de acesso implementado
 * Demonstra como usar o DatabaseHelper para aplicar filtros automáticos
 */

const express = require('express');
const DatabaseHelper = require('../helpers/database-helper');
const databaseConfig = require('../src/config/database');
const router = express.Router();

console.log('[SECURE-ROUTES] Arquivo secure-routes.js carregado');

// Middleware para log de todas as requisições que chegam às rotas seguras
router.use((req, res, next) => {
    console.log(`[SECURE-ROUTES] Requisição recebida: ${req.method} ${req.path}`);
    next();
});

// Instância do helper de banco de dados
const dbHelper = new DatabaseHelper();

// Rota de teste simples (sem autenticação)
router.get('/test', (req, res) => {
    console.log('[SECURE-ROUTES] Rota de teste /secure/test acessada');
    res.json({ 
        message: 'Rota de teste das rotas seguras funcionando', 
        method: req.method, 
        path: req.path,
        fullUrl: req.originalUrl,
        timestamp: new Date().toISOString()
    });
});

// Rota de teste com middleware de autenticação
router.get('/test-auth', requireAuth, (req, res) => {
    console.log('[SECURE-ROUTES] Rota de teste com auth /secure/test-auth acessada');
    res.json({ 
        message: 'Rota de teste com autenticação funcionando', 
        user: req.session.user,
        timestamp: new Date().toISOString()
    });
});

// Middleware para extrair dados do usuário da sessão
function getUserFromSession(req) {
    if (!req.session.user) {
        return null;
    }
    
    return {
        id_pessoa: req.session.user.id_pessoa,
        nivelacesso: req.session.user.nivelacesso,
        nome: req.session.user.nome
    };
}

// Middleware de autenticação
function requireAuth(req, res, next) {
    console.log('=== DEBUG SESSÃO ===');
    console.log('Session ID:', req.sessionID);
    console.log('Session exists:', !!req.session);
    console.log('Session user:', req.session ? req.session.user : 'No session');
    console.log('Cookies:', req.headers.cookie);
    console.log('Headers:', req.headers);
    console.log('==================');
    
    if (!req.session.user) {
        // Verificar se é uma requisição AJAX/JSON
        if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1) || req.headers['content-type'] === 'application/json') {
            return res.status(401).json({
                success: false,
                message: 'Usuário não autenticado. Faça login para continuar.',
                redirect: '/auth/login'
            });
        }
        return res.redirect('/auth/login');
    }
    next();
}

/**
 * Rota segura para rotinas administrativas
 * Aplica filtros automáticos baseados no nível de acesso do usuário
 */
router.get('/rotinas-seguras', requireAuth, async (req, res) => {
    try {
        const user = getUserFromSession(req);
        if (!user) {
            return res.redirect('/auth/login');
        }

        // Funcionalidade de campo de estágio removida
        const campos_estagio = [];
        
        // Verifica se usuário é admin para mostrar informações adicionais
        const isAdmin = await dbHelper.isAdmin(user);
        
        const camposFormatados = [];

        res.render('rotinas-seguras', {
            title: 'Rotinas com Controle de Acesso',
            campos_estagio: camposFormatados,
            user: user,
            isAdmin: isAdmin,
            totalRegistros: camposFormatados.length,
            currentPage: 'rotinas-seguras',
            success: req.query.success,
            error: req.query.error
        });

    } catch (error) {
        console.error('Erro ao buscar rotinas seguras:', error);
        res.status(500).render('error', {
            title: 'Erro',
            message: 'Erro interno do servidor',
            error: error.message,
            currentPage: 'error'
        });
    }
});

/**
 * Rota para buscar pessoas
 * Permite acesso a usuários autenticados para preenchimento de formulários
 */
router.get('/pessoas/buscar', requireAuth, async (req, res) => {
    console.log('=== ROTA /pessoas/buscar CHAMADA ===');
    const { termo, categoria, pagina = 1, limite = 25 } = req.query;
    console.log('DEBUG - Parâmetros recebidos:', { termo, categoria, pagina, limite });
    console.log('DEBUG - URL completa:', req.originalUrl);
    console.log('DEBUG - Method:', req.method);
    
    let whereClause = '';
    let params = [];
    
    if (termo && termo.trim() !== '') {
        // Se há termo de busca
        if (categoria && categoria !== 'todos') {
            // Verificar se há múltiplas categorias separadas por vírgula
            const categorias = categoria.split(',').map(c => c.trim()).filter(c => c);
            if (categorias.length > 1) {
                // Para múltiplas categorias, usar LIKE para cada uma
                const categoriaConditions = categorias.map(() => "(categoria = ? OR categoria LIKE ? OR categoria LIKE ? OR categoria LIKE ?)").join(' OR ');
                whereClause = `WHERE (${categoriaConditions}) AND (nome LIKE ? OR email LIKE ?)`;
                const categoriaParams = [];
                categorias.forEach(cat => {
                    categoriaParams.push(cat, `${cat},%`, `%,${cat},%`, `%,${cat}`);
                });
                params = [...categoriaParams, `%${termo}%`, `%${termo}%`];
            } else {
                // Para uma categoria, usar condições para verificar se contém a categoria
                whereClause = 'WHERE (categoria = ? OR categoria LIKE ? OR categoria LIKE ? OR categoria LIKE ?) AND (nome LIKE ? OR email LIKE ?)';
                params = [categoria, `${categoria},%`, `%,${categoria},%`, `%,${categoria}`, `%${termo}%`, `%${termo}%`];
            }
        } else {
            whereClause = 'WHERE nome LIKE ? OR email LIKE ?';
            params = [`%${termo}%`, `%${termo}%`];
        }
    } else {
        // Se não há termo de busca, retornar todas as pessoas
        if (categoria && categoria !== 'todos') {
            // Verificar se há múltiplas categorias separadas por vírgula
            const categorias = categoria.split(',').map(c => c.trim()).filter(c => c);
            if (categorias.length > 1) {
                // Para múltiplas categorias, usar LIKE para cada uma
                const categoriaConditions = categorias.map(() => "(categoria = ? OR categoria LIKE ? OR categoria LIKE ? OR categoria LIKE ?)").join(' OR ');
                whereClause = `WHERE (${categoriaConditions})`;
                const categoriaParams = [];
                categorias.forEach(cat => {
                    categoriaParams.push(cat, `${cat},%`, `%,${cat},%`, `%,${cat}`);
                });
                params = categoriaParams;
            } else {
                // Para uma categoria, usar condições para verificar se contém a categoria
                whereClause = 'WHERE (categoria = ? OR categoria LIKE ? OR categoria LIKE ? OR categoria LIKE ?)';
                params = [categoria, `${categoria},%`, `%,${categoria},%`, `%,${categoria}`];
            }
        } else {
            whereClause = '';
            params = [];
        }
    }
    
    // Primeiro, contar o total de registros
    const countSql = `SELECT COUNT(*) as total FROM pessoa ${whereClause}`;
    console.log('DEBUG - SQL count:', countSql);
    
    const databaseConfig = require('../src/config/database');
    const db = databaseConfig;
    
    try {
        const countResult = await db.get(countSql, params);
        const total = countResult.total;
        const offset = (parseInt(pagina) - 1) * parseInt(limite);
        
        // Buscar os registros com paginação
        const sql = `SELECT id_pessoa, nome, email, tipo, telefone, cnpj_cpf, categoria FROM pessoa ${whereClause} ORDER BY nome LIMIT ? OFFSET ?`;
        const finalParams = [...params, parseInt(limite), offset];
        
        console.log('DEBUG - SQL gerado:', sql);
        console.log('DEBUG - Parâmetros SQL:', finalParams);
        
        const pessoas = await db.all(sql, finalParams);
        
        console.log('DEBUG - Pessoas encontradas:', pessoas.length, 'de', total);
        res.json({ 
            success: true, 
            pessoas: pessoas,
            total: total,
            pagina: parseInt(pagina),
            limite: parseInt(limite)
        });
    } catch (err) {
        console.error('Erro ao buscar pessoas:', err);
        return res.json({ success: false, message: 'Erro ao buscar pessoas' });
    }
});

/**
 * Rota para buscar dados de uma pessoa específica
 * Demonstra controle de acesso em consultas individuais
 */
router.get('/pessoa/:id', requireAuth, async (req, res) => {
    try {
        const user = getUserFromSession(req);
        const pessoaId = parseInt(req.params.id);
        
        if (!user) {
            return res.redirect('/auth/login');
        }

        // Query para buscar dados da pessoa
        const query = `
            SELECT 
                p.id_pessoa,
                p.nome,
                p.tipo,
                p.cnpj_cpf,
                p.categoria,
                p.telefone,
                p.email,
                p.dataCadastro
            FROM pessoa p
            WHERE p.id_pessoa = ?
        `;

        const pessoa = await dbHelper.selectOne(query, [pessoaId], user, 'pessoa');
        
        if (!pessoa) {
            return res.status(404).render('error', {
                title: 'Não encontrado',
                message: 'Pessoa não encontrada ou você não tem acesso a este registro',
                currentPage: 'error'
            });
        }

        res.json({
            success: true,
            data: pessoa
        });

    } catch (error) {
        console.error('Erro ao buscar pessoa:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

/**
 * Rota para exibir formulário de novo campo de estágio
 */
router.get('/estagios/campo/novo', requireAuth, async (req, res) => {
    try {
        const user = getUserFromSession(req);
        
        if (!user) {
            return res.redirect('/auth/login');
        }



        res.render('campo-estagio-form', {
            title: 'Cadastro Campo de Estágio',
            user: user,
            isAdmin: await dbHelper.isAdmin(user),
            currentPage: 'campo-estagio-novo',
            isEdicao: false,
            campoEstagio: null
        });

    } catch (error) {
        console.error('Erro ao carregar formulário de campo de estágio:', error);
        res.status(500).render('error', {
            title: 'Erro',
            message: 'Erro ao carregar formulário',
            error: error.message,
            currentPage: 'error'
        });
    }
});

/**
 * Rota para exibir formulário de edição de campo de estágio
 */
router.get('/estagios/campo/editar/:id', requireAuth, async (req, res) => {
    try {
        const user = getUserFromSession(req);
        const campoId = parseInt(req.params.id);
        
        if (!user) {
            return res.redirect('/auth/login');
        }

        // Buscar dados do campo de estágio
        const db = databaseConfig;
        const query = `
            SELECT 
                ce.*,
                pe.nome as nome_estagiario,
                po.nome as nome_orientador,
                pc.nome as nome_concedente,
                ps.nome as nome_supervisor,
                pcurso.nome as nome_curso
            FROM campo_estagio ce
            LEFT JOIN pessoa pe ON ce.id_pessoa_estagiario = pe.id_pessoa
            LEFT JOIN pessoa po ON ce.id_pessoa_orientador = po.id_pessoa
            LEFT JOIN pessoa pc ON ce.id_pessoa_concedente = pc.id_pessoa
            LEFT JOIN pessoa ps ON ce.id_pessoa_supervisor = ps.id_pessoa
            LEFT JOIN pessoa pcurso ON ce.id_pessoa_curso = pcurso.id_pessoa
            WHERE ce.id_campo_estagio = ?
        `;
        
        const campoEstagio = await db.get(query, [campoId]);
        

        
        if (!campoEstagio) {
            return res.status(404).render('error', {
                title: 'Não encontrado',
                message: 'Campo de estágio não encontrado',
                currentPage: 'error'
            });
        }

        res.render('campo-estagio-form', {
            title: 'Editar Campo de Estágio',
            user: user,
            isAdmin: await dbHelper.isAdmin(user),
            currentPage: 'campo-estagio-editar',
            campoEstagio: campoEstagio,
            isEdicao: true,
            referrer: req.query.referrer || null
        });

    } catch (error) {
        console.error('Erro ao carregar formulário de edição:', error);
        res.status(500).render('error', {
            title: 'Erro',
            message: 'Erro ao carregar formulário de edição',
            error: error.message,
            currentPage: 'error'
        });
    }
});

/**
 * Rota para editar campo de estágio (POST)
 */
router.post('/estagios/campo/editar/:id', requireAuth, async (req, res) => {
    try {
        const user = getUserFromSession(req);
        const campoId = parseInt(req.params.id);
        
        if (!user) {
            return res.json({ success: false, message: 'Usuário não autenticado' });
        }

        const {
            situacao,
            numero_processosei,
            apolice_seguro,
            nome_seguradora,
            tipo_estagio,
            data_inicio,
            data_fim,
            semestre_ano,
            cargahoraria,
            id_pessoa_curso,
            id_pessoa_estagiario,
            numero_matricula,
            periodo,
            id_pessoa_orientador,
            id_pessoa_concedente,
            numero_convenio,
            id_pessoa_supervisor,
            valor_bolsa,
            valor_valetransporte,
            observacoes,
            estagiopropriainstituicao
        } = req.body;

        // Campos date já vêm no formato ISO (YYYY-MM-DD), apenas validar
        let dataInicioISO = null;
        let dataFimISO = null;
        
        if (data_inicio) {
            // Validar se está no formato correto YYYY-MM-DD
            if (/^\d{4}-\d{2}-\d{2}$/.test(data_inicio)) {
                dataInicioISO = data_inicio;
            }
        }
        
        if (data_fim) {
            // Validar se está no formato correto YYYY-MM-DD
            if (/^\d{4}-\d{2}-\d{2}$/.test(data_fim)) {
                dataFimISO = data_fim;
            }
        }

        const db = databaseConfig;
        
        const sql = `
            UPDATE campo_estagio SET
                situacao = ?,
                numero_processosei = ?,
                apolice_seguro = ?,
                nome_seguradora = ?,
                tipo_estagio = ?,
                data_inicio = ?,
                data_fim = ?,
                semestre_ano = ?,
                cargahoraria = ?,
                id_pessoa_curso = ?,
                id_pessoa_estagiario = ?,
                numero_matricula = ?,
                periodo = ?,
                id_pessoa_orientador = ?,
                id_pessoa_concedente = ?,
                numero_convenio = ?,
                id_pessoa_supervisor = ?,
                valor_bolsa = ?,
                valor_valetransporte = ?,
                observacoes = ?,
                estagiopropriainstituicao = ?
            WHERE id_campo_estagio = ?
        `;
        
        const params = [
            situacao || 'Em Edição',
            numero_processosei || null,
            apolice_seguro || null,
            nome_seguradora || null,
            tipo_estagio || null,
            dataInicioISO,
            dataFimISO,
            semestre_ano || null,
            cargahoraria || null,
            id_pessoa_curso || null,
            id_pessoa_estagiario || null,
            numero_matricula || null,
            periodo || null,
            id_pessoa_orientador || null,
            id_pessoa_concedente || null,
            numero_convenio || null,
            id_pessoa_supervisor || null,
            valor_bolsa || null,
            valor_valetransporte || null,
            observacoes || null,
            estagiopropriainstituicao || 'Não',
            campoId
        ];

        await db.run(sql, params);
        
        res.json({ 
            success: true, 
            message: 'Campo de estágio atualizado com sucesso!',
            campoEstagioId: campoId
        });

    } catch (error) {
        console.error('Erro ao atualizar campo de estágio:', error);
        res.json({ 
            success: false, 
            message: 'Erro ao atualizar campo de estágio: ' + error.message 
        });
    }
});

/**
 * Rota para atualizar campo de estágio (PUT)
 */
router.put('/estagios/campo/atualizar/:id', requireAuth, async (req, res) => {
    try {
        const user = getUserFromSession(req);
        const campoId = parseInt(req.params.id);
        
        if (!user) {
            return res.json({ success: false, message: 'Usuário não autenticado' });
        }

        const {
            situacao,
            numero_processosei,
            apolice_seguro,
            nome_seguradora,
            tipo_estagio,
            data_inicio,
            data_fim,
            semestre_ano,
            cargahoraria,
            id_pessoa_curso,
            id_pessoa_estagiario,
            numero_matricula,
            periodo,
            id_pessoa_orientador,
            id_pessoa_concedente,
            numero_convenio,
            id_pessoa_supervisor,
            valor_bolsa,
            valor_valetransporte,
            observacoes,
            estagiopropriainstituicao
        } = req.body;

        // Campos date já vêm no formato ISO (YYYY-MM-DD), apenas validar
        let dataInicioISO = null;
        let dataFimISO = null;
        
        if (data_inicio) {
            // Validar se está no formato correto YYYY-MM-DD
            if (/^\d{4}-\d{2}-\d{2}$/.test(data_inicio)) {
                dataInicioISO = data_inicio;
            }
        }
        
        if (data_fim) {
            // Validar se está no formato correto YYYY-MM-DD
            if (/^\d{4}-\d{2}-\d{2}$/.test(data_fim)) {
                dataFimISO = data_fim;
            }
        }

        const db = databaseConfig;
        
        const sql = `
            UPDATE campo_estagio SET
                situacao = ?,
                numero_processosei = ?,
                apolice_seguro = ?,
                nome_seguradora = ?,
                tipo_estagio = ?,
                data_inicio = ?,
                data_fim = ?,
                semestre_ano = ?,
                cargahoraria = ?,
                id_pessoa_curso = ?,
                id_pessoa_estagiario = ?,
                numero_matricula = ?,
                periodo = ?,
                id_pessoa_orientador = ?,
                id_pessoa_concedente = ?,
                numero_convenio = ?,
                id_pessoa_supervisor = ?,
                valor_bolsa = ?,
                valor_valetransporte = ?,
                observacoes = ?,
                estagiopropriainstituicao = ?
            WHERE id_campo_estagio = ?
        `;
        
        const params = [
            situacao || 'Em Edição',
            numero_processosei || null,
            apolice_seguro || null,
            nome_seguradora || null,
            tipo_estagio || null,
            dataInicioISO,
            dataFimISO,
            semestre_ano || null,
            cargahoraria || null,
            id_pessoa_curso || null,
            id_pessoa_estagiario || null,
            numero_matricula || null,
            periodo || null,
            id_pessoa_orientador || null,
            id_pessoa_concedente || null,
            numero_convenio || null,
            id_pessoa_supervisor || null,
            valor_bolsa || null,
            valor_valetransporte || null,
            observacoes || null,
            estagiopropriainstituicao || 'Não',
            campoId
        ];

        await db.run(sql, params);
        
        res.json({ 
            success: true, 
            message: 'Campo de estágio atualizado com sucesso!'
        });

    } catch (error) {
        console.error('Erro ao atualizar campo de estágio:', error);
        res.json({ 
            success: false, 
            message: 'Erro ao atualizar campo de estágio: ' + error.message 
        });
    }
});

/**
 * Rota para excluir campo de estágio
 */
router.delete('/estagios/campo/excluir/:id', requireAuth, async (req, res) => {
    try {
        const user = getUserFromSession(req);
        const campoId = parseInt(req.params.id);
        
        if (!user) {
            return res.json({ success: false, message: 'Usuário não autenticado' });
        }

        // Buscar dados do campo de estágio para verificar permissões
        const db = databaseConfig;
        const campoEstagio = await db.get(
            'SELECT * FROM campo_estagio WHERE id_campo_estagio = ?',
            [campoId]
        );
        
        if (!campoEstagio) {
            return res.status(404).json({ 
                success: false, 
                message: 'Campo de estágio não encontrado' 
            });
        }

        // Verificar permissões baseadas na situação do campo e nível de acesso
        const isAdmin = user.nivelacesso === 'Administrador';
        const situacaoCampo = campoEstagio.situacao;
        
        let podeExcluir = false;
        let motivoNegacao = '';
        
        if (isAdmin) {
            // Administrador: Desabilitar apenas para 'Finalizado'
            podeExcluir = situacaoCampo !== 'Finalizado';
            if (!podeExcluir) {
                motivoNegacao = 'Campos de estágio finalizados não podem ser excluídos';
            }
        } else {
            // Outros usuários: Desabilitar para 'Concluído' e 'Finalizado'
            podeExcluir = situacaoCampo === 'Em Edição';
            if (!podeExcluir) {
                motivoNegacao = 'Você não tem permissão para excluir campos concluídos ou finalizados';
            }
        }
        
        if (!podeExcluir) {
            return res.status(403).json({ 
                success: false, 
                message: motivoNegacao 
            });
        }

        // Excluir o registro
        await db.run('DELETE FROM campo_estagio WHERE id_campo_estagio = ?', [campoId]);
        
        res.json({ 
            success: true, 
            message: 'Campo de estágio excluído com sucesso!' 
        });

    } catch (error) {
        console.error('Erro ao excluir campo de estágio:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao excluir campo de estágio: ' + error.message 
        });
    }
});

/**
 * Rota para criar novo campo de estágio
 */
router.post('/estagios/campo/criar', requireAuth, async (req, res) => {
    try {
        const user = getUserFromSession(req);
        
        if (!user) {
            return res.json({ success: false, message: 'Usuário não autenticado' });
        }

        const {
            situacao,
            numero_processosei,
            apolice_seguro,
            nome_seguradora,
            tipo_estagio,
            data_inicio,
            data_fim,
            semestre_ano,
            cargahoraria,
            id_pessoa_curso,
            id_pessoa_estagiario,
            numero_matricula,
            periodo,
            id_pessoa_orientador,
            id_pessoa_concedente,
            numero_convenio,
            id_pessoa_supervisor,
            valor_bolsa,
            valor_valetransporte,
            observacoes,
            estagiopropriainstituicao
        } = req.body;

        // Debug: Log dos campos recebidos
        // console.log('[DEBUG] Campos recebidos:', {
        //     situacao,
        //     tipo_estagio,
        //     semestre_ano,
        //     cargahoraria,
        //     id_pessoa_curso,
        //     numero_matricula
        // });
        
        // Debug específico para tipo_estagio
        // console.log('[DEBUG BACKEND] tipo_estagio recebido:', tipo_estagio);
        // console.log('[DEBUG BACKEND] tipo_estagio type:', typeof tipo_estagio);
        // console.log('[DEBUG BACKEND] tipo_estagio length:', tipo_estagio ? tipo_estagio.length : 'null/undefined');
        // console.log('[DEBUG BACKEND] tipo_estagio charCodes:', tipo_estagio ? Array.from(tipo_estagio).map(c => c.charCodeAt(0)) : 'null/undefined');
        // console.log('[DEBUG BACKEND] req.body completo:', req.body);
        
        // Validação dos campos obrigatórios
        if (!situacao || !tipo_estagio || !semestre_ano || !cargahoraria || !id_pessoa_curso || !numero_matricula) {
            // console.log('[DEBUG] Campos faltando:', {
            //     situacao: !situacao,
            //     tipo_estagio: !tipo_estagio,
            //     semestre_ano: !semestre_ano,
            //     cargahoraria: !cargahoraria,
            //     id_pessoa_curso: !id_pessoa_curso,
            //     numero_matricula: !numero_matricula
            // });
            return res.json({ success: false, message: 'Campos obrigatórios não preenchidos' });
        }

        // Converter datas do formato brasileiro para ISO (corrigido para evitar problema de fuso horário)
        let dataInicioISO = null;
        let dataFimISO = null;
        
        if (data_inicio) {
            const partes = data_inicio.split('/');
            if (partes.length === 3) {
                // Usar construtor Date para evitar problemas de fuso horário
                const dataObj = new Date(partes[2], partes[1] - 1, partes[0]);
                dataInicioISO = dataObj.toISOString().split('T')[0];
            }
        }
        
        if (data_fim) {
            const partes = data_fim.split('/');
            if (partes.length === 3) {
                // Usar construtor Date para evitar problemas de fuso horário
                const dataObj = new Date(partes[2], partes[1] - 1, partes[0]);
                dataFimISO = dataObj.toISOString().split('T')[0];
            }
        }

        const db = databaseConfig;
        
        const sql = `INSERT INTO campo_estagio (
            situacao, numero_processosei, apolice_seguro, nome_seguradora,
            tipo_estagio, data_inicio, data_fim, semestre_ano, cargahoraria,
            id_pessoa_curso, id_pessoa_estagiario, numero_matricula, periodo,
            id_pessoa_orientador, id_pessoa_concedente, numero_convenio,
            id_pessoa_supervisor, valor_bolsa, valor_valetransporte,
            observacoes, estagiopropriainstituicao, dataultimaatualizacao
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`;
        
        const params = [
            situacao,
            numero_processosei || null,
            apolice_seguro || null,
            nome_seguradora || null,
            tipo_estagio,
            dataInicioISO,
            dataFimISO,
            semestre_ano,
            parseInt(cargahoraria),
            parseInt(id_pessoa_curso),
            id_pessoa_estagiario ? parseInt(id_pessoa_estagiario) : null,
            numero_matricula,
            periodo || null,
            id_pessoa_orientador ? parseInt(id_pessoa_orientador) : null,
            id_pessoa_concedente ? parseInt(id_pessoa_concedente) : null,
            numero_convenio || null,
            id_pessoa_supervisor ? parseInt(id_pessoa_supervisor) : null,
            valor_bolsa ? parseFloat(valor_bolsa) : null,
            valor_valetransporte ? parseFloat(valor_valetransporte) : null,
            observacoes || null,
            estagiopropriainstituicao || 'Não'
        ];

        const result = await db.run(sql, params);
        
        res.json({ 
            success: true, 
            message: 'Campo de estágio salvo com sucesso!',
            id: result.id
        });

    } catch (error) {
        console.error('Erro ao criar campo de estágio:', error);
        res.json({ 
            success: false, 
            message: 'Erro ao salvar campo de estágio: ' + error.message 
        });
    }
});

/**
 * Rota para buscar parâmetros
 * Permite acesso a usuários autenticados para carregar parâmetros do sistema
 */
router.get('/parametros/buscar', requireAuth, async (req, res) => {
    try {
        const { identificador } = req.query;
        
        if (!identificador) {
            return res.json({ success: false, message: 'Identificador é obrigatório' });
        }

        const db = databaseConfig;
        
        // Buscar parâmetro por identificador
        const parametro = await db.get('SELECT * FROM parametro WHERE identificador = ?', [identificador]);
        
        if (!parametro) {
            return res.json({ success: false, message: 'Parâmetro não encontrado', parametros: [] });
        }

        // Buscar valores do parâmetro
        const valores = await db.all('SELECT * FROM parametrovalor WHERE id_parametro = ?', [parametro.id_parametro]);
        
        // Formatar valores para o frontend
        const valoresFormatados = {};
        valores.forEach(valor => {
            if (valor.identificadorvalor && valor.valor) {
                valoresFormatados[valor.identificadorvalor] = valor.valor;
            }
        });

        res.json({
            success: true,
            parametros: [{
                ...parametro,
                valores: valoresFormatados,
                valor: valores.length > 0 ? valores.map(v => v.valor).join('|') : ''
            }]
        });
        
    } catch (error) {
        console.error('Erro ao buscar parâmetros:', error);
        res.json({ success: false, message: 'Erro ao buscar parâmetros', parametros: [] });
    }
});

/**
 * Rota para buscar valor específico de um parâmetro
 * Permite acesso a usuários autenticados para carregar um valor específico
 */
router.get('/parametros/buscar-valor', requireAuth, async (req, res) => {
    try {
        const { identificador, identificadorValor } = req.query;
        
        if (!identificador || !identificadorValor) {
            return res.json({ 
                success: false, 
                message: 'Identificador do parâmetro e identificador do valor são obrigatórios' 
            });
        }

        const db = databaseConfig;
        
        // Buscar valor específico usando LEFT OUTER JOIN
        const resultado = await db.get(`
            SELECT p.identificador, pv.identificadorvalor, pv.valor 
            FROM parametro p 
            LEFT OUTER JOIN parametrovalor pv ON p.id_parametro = pv.id_parametro 
            WHERE p.identificador LIKE ? AND pv.identificadorvalor LIKE ?
        `, [`%${identificador}%`, `%${identificadorValor}%`]);
        
        if (!resultado || !resultado.valor) {
            return res.json({ 
                success: false, 
                message: 'Valor do parâmetro não encontrado' 
            });
        }

        res.json({
            success: true,
            resultado: {
                identificador: resultado.identificador,
                identificadorvalor: resultado.identificadorvalor,
                valor: resultado.valor
            }
        });
        
    } catch (error) {
        console.error('Erro ao buscar valor específico do parâmetro:', error);
        res.json({ 
            success: false, 
            message: 'Erro interno do servidor' 
        });
    }
});

/**
 * Rota para verificar nível de acesso do usuário
 */
router.get('/usuario/nivel-acesso', requireAuth, async (req, res) => {
    try {
        const user = getUserFromSession(req);
        
        if (!user) {
            return res.json({ success: false, message: 'Usuário não autenticado' });
        }

        res.json({
            success: true,
            nivelAcesso: user.nivelacesso || 'Usuário'
        });
        
    } catch (error) {
        console.error('Erro ao verificar nível de acesso:', error);
        res.json({ success: false, message: 'Erro ao verificar nível de acesso' });
    }
});



/**
 * Rota para gerar PDF do Campo de Estágio
 */
router.get('/estagios/campo/:id/pdf', requireAuth, async (req, res) => {
    try {
        const CampoEstagioController = require('../src/controllers/CampoEstagioController');
        const controller = new CampoEstagioController();
        await controller.gerarPDF(req, res);
    } catch (error) {
        console.error('Erro ao gerar PDF do campo de estágio:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

/**
 * Rota para criar nova pessoa
 * Permite acesso a usuários autenticados para cadastro durante preenchimento de formulários
 */
router.post('/pessoas/criar', requireAuth, async (req, res) => {
    // console.log('[DEBUG] Rota /pessoas/criar executada');
    // console.log('[DEBUG] Dados recebidos:', req.body);
    let { nome, email, telefone, cnpj_cpf, tipo, categoria, id_pessoaVinculo } = req.body;
    
    // Log dos valores individuais para debug
    // console.log('[DEBUG] Valores extraídos:', {
    //     nome, email, telefone, cnpj_cpf, tipo, categoria, id_pessoaVinculo
    // });
    
    // Garantir que campos undefined sejam null
    telefone = telefone || null;
    cnpj_cpf = cnpj_cpf || null;
    categoria = categoria || null;
    id_pessoaVinculo = id_pessoaVinculo || null;
    
    // Limpar máscaras de formatação antes de salvar
    if (telefone) {
        telefone = telefone.replace(/\D/g, '');
    }
    
    if (cnpj_cpf) {
        cnpj_cpf = cnpj_cpf.replace(/\D/g, '');
    }
    
    // console.log('[DEBUG] Valores após limpeza:', {
    //     nome, email, telefone, cnpj_cpf, tipo, categoria, id_pessoaVinculo
    // });
    
    // Validação dos campos obrigatórios
    if (!nome || !tipo) {
        return res.json({ success: false, message: 'Nome e tipo são obrigatórios' });
    }
    
    if (!email || email.trim() === '') {
        return res.json({ success: false, message: 'Email é obrigatório' });
    }
    
    const db = databaseConfig;
    
    try {
        // Verificar se já existe pessoa com mesmo email
        const existingPerson = await db.get('SELECT id_pessoa FROM pessoa WHERE email = ?', [email]);
        
        if (existingPerson) {
            return res.json({ success: false, message: 'Já existe uma pessoa cadastrada com este email' });
        }
        
        // Inserir nova pessoa
        const sql = `INSERT INTO pessoa (nome, email, telefone, cnpj_cpf, tipo, categoria, id_pessoaVinculo, dataCadastro) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`;
        
        const params = [nome, email, telefone, cnpj_cpf, tipo, categoria, id_pessoaVinculo];
        // console.log('[DEBUG] SQL:', sql);
        // console.log('[DEBUG] Parâmetros:', params);
        
        const result = await db.run(sql, params);
        // console.log('[DEBUG] Resultado da inserção:', result);
        
        const ultimoId = result.insertId;
        if (!ultimoId) {
            console.error('[ERROR] insertId não retornado na inserção:', result);
            return res.json({ success: false, message: 'Erro ao obter ID da pessoa criada' });
        }
        
        // console.log('[DEBUG] Último ID inserido:', ultimoId);
        
        // Buscar a pessoa recém-criada para retornar os dados completos
        const pessoa = await db.get('SELECT * FROM pessoa WHERE id_pessoa = ?', [ultimoId]);
        // console.log('[DEBUG] Pessoa encontrada:', pessoa);
        
        res.json({ success: true, pessoa: pessoa, message: 'Pessoa cadastrada com sucesso!' });
    } catch (err) {
        console.error('Erro ao criar pessoa:', err);
        return res.json({ success: false, message: 'Erro ao salvar pessoa' });
    }
});

/**
 * Rota para demonstrar query complexa com JOINs
 * Mostra como usar condições de acesso em consultas com múltiplas tabelas
 */
router.get('/relatorio-completo', requireAuth, async (req, res) => {
    try {
        const user = getUserFromSession(req);
        
        if (!user) {
            return res.redirect('/auth/login');
        }

        // Relatório de campo_estagio removido - Campo de Estágio
        const relatorio = [];
        
        res.render('relatorio-completo', {
            title: 'Relatório Completo com Controle de Acesso',
            dados: relatorio,
            user: user,
            isAdmin: await dbHelper.isAdmin(user),
            currentPage: 'relatorio-completo'
        });

    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        res.status(500).render('error', {
            title: 'Erro',
            message: 'Erro ao gerar relatório',
            error: error.message,
            currentPage: 'error'
        });
    }
});

// Função auxiliar para conversão de datas (copiada do server.js)
function convertISOToBRDate(isoDate) {
    if (!isoDate) return '';
    
    try {
        const date = new Date(isoDate);
        if (isNaN(date.getTime())) {
            return isoDate; // Retorna o valor original se não for uma data válida
        }
        
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        
        return `${day}/${month}/${year}`;
    } catch (error) {
        console.error('Erro ao converter data:', error);
        return isoDate;
    }
}

/**
 * Rota para anexar plano assinado ao campo de estágio
 */
router.post('/estagios/campo/anexar-plano', requireAuth, async (req, res) => {
    try {
        const user = getUserFromSession(req);
        const { campo_estagio_id } = req.body;
        
        if (!user) {
            return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
        }
        
        if (!campo_estagio_id) {
            return res.status(400).json({ success: false, message: 'ID do campo de estágio é obrigatório' });
        }
        
        // Verificar se os parâmetros necessários estão configurados
        const db = databaseConfig;
        
        const parametroPastas = await db.get(
            'SELECT * FROM parametro WHERE identificador = ?', 
            ['Pastas dos Anexos']
        );
        
        const parametroPlanos = await db.get(
            'SELECT * FROM parametro WHERE identificador = ?', 
            ['Planos Assinados']
        );
        
        if (!parametroPastas || !parametroPlanos) {
            return res.status(400).json({
                success: false,
                message: 'Parâmetros "Pastas dos Anexos" e "Planos Assinados" devem estar configurados'
            });
        }
        
        // Buscar valores dos parâmetros
        const valorPastas = await db.get(
            'SELECT valor FROM parametrovalor WHERE id_parametro = ? LIMIT 1',
            [parametroPastas.id_parametro]
        );
        
        const valorPlanos = await db.get(
            'SELECT valor FROM parametrovalor WHERE id_parametro = ? LIMIT 1',
            [parametroPlanos.id_parametro]
        );
        
        if (!valorPastas || !valorPlanos) {
            return res.status(400).json({
                success: false,
                message: 'Valores dos parâmetros "Pastas dos Anexos" e "Planos Assinados" devem estar configurados'
            });
        }
        
        // Verificar se o campo de estágio existe
        const campoEstagio = await db.get(
            'SELECT * FROM campo_estagio WHERE id_campo_estagio = ?',
            [campo_estagio_id]
        );
        
        if (!campoEstagio) {
            return res.status(404).json({ success: false, message: 'Campo de estágio não encontrado' });
        }
        
        // Simular o salvamento do arquivo (implementação completa requer multer)
        // Por enquanto, apenas atualizar o campo url_planoassinado com um caminho simulado
        const nomeArquivo = `plano_assinado_${campo_estagio_id}_${Date.now()}.pdf`;
        const caminhoArquivo = `${valorPastas.valor}/${valorPlanos.valor}/${nomeArquivo}`;
        
        // Atualizar o campo url_planoassinado
        await db.run(
            'UPDATE campo_estagio SET url_planoassinado = ? WHERE id_campo_estagio = ?',
            [caminhoArquivo, campo_estagio_id]
        );
        
        res.json({
            success: true,
            message: 'Plano assinado anexado com sucesso!',
            caminho: caminhoArquivo
        });
        
    } catch (error) {
        console.error('Erro ao anexar plano assinado:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor: ' + error.message
        });
    }
});

// ===== ROTAS DO DASHBOARD ADMINISTRATIVO =====

/**
 * Rota para exibir dashboard administrativo de estágios
 */
router.get('/estagios/dashboard-administrativo', requireAuth, async (req, res) => {
    try {
        const user = getUserFromSession(req);
        
        if (!user) {
            return res.redirect('/auth/login');
        }
        
        // Verificar se é administrador
        if (user.nivelacesso !== 'Administrador') {
            return res.status(403).render('error', {
                title: 'Acesso Negado',
                message: 'Apenas administradores podem acessar esta página',
                currentPage: 'error'
            });
        }
        
        res.render('dashboard-estagio-administrativo', {
            title: 'Dashboard Administrativo - Estágios',
            user: user,
            currentPage: 'dashboard-estagio-administrativo'
        });
        
    } catch (error) {
        console.error('Erro ao carregar dashboard administrativo:', error);
        res.status(500).render('error', {
            title: 'Erro',
            message: 'Erro ao carregar dashboard administrativo',
            error: error.message,
            currentPage: 'error'
        });
    }
});

/**
 * API para dados dos dashboards informativos
 */
router.get('/estagios/dashboard-administrativo/dados', requireAuth, async (req, res) => {
    try {
        const user = getUserFromSession(req);
        
        if (!user || user.nivelacesso !== 'Administrador') {
            return res.json({ success: false, message: 'Acesso negado' });
        }
        
        const db = databaseConfig;
        
        // Dashboard 1: Campos de Estágio
        const totalCampos = await db.get('SELECT COUNT(*) as total FROM campo_estagio');
        const totalConcedentes = await db.get('SELECT COUNT(DISTINCT id_pessoa_concedente) as total FROM campo_estagio WHERE id_pessoa_concedente IS NOT NULL');
        const totalEstagiarios = await db.get('SELECT COUNT(DISTINCT id_pessoa_estagiario) as total FROM campo_estagio WHERE id_pessoa_estagiario IS NOT NULL');
        const totalSupervisores = await db.get('SELECT COUNT(DISTINCT id_pessoa_supervisor) as total FROM campo_estagio WHERE id_pessoa_supervisor IS NOT NULL');
        const totalOrientadores = await db.get('SELECT COUNT(DISTINCT id_pessoa_orientador) as total FROM campo_estagio WHERE id_pessoa_orientador IS NOT NULL');
        
        // Dashboard 2: Planos de Atividade
        const totalPlanos = await db.get('SELECT COUNT(*) as total FROM campo_estagio_planoatividade');
        const statusPlanos = await db.all('SELECT situacao, COUNT(*) as quantidade FROM campo_estagio_planoatividade GROUP BY situacao');
        
        // Dashboard 3: Frequências
        const totalFrequencias = await db.get('SELECT COUNT(*) as total FROM campo_estagio_frequencia');
        const frequenciasAprovadas = await db.get(`
            SELECT COUNT(*) as total FROM campo_estagio_frequencia 
            WHERE aprovado_estagiario = 'Sim' AND aprovado_orientador = 'Sim' AND aprovado_supervisor = 'Sim'
        `);
        const frequenciasPendentes = await db.get(`
            SELECT COUNT(*) as total FROM campo_estagio_frequencia 
            WHERE NOT (aprovado_estagiario = 'Sim' AND aprovado_orientador = 'Sim' AND aprovado_supervisor = 'Sim')
        `);
        const frequenciasAbertas = await db.get('SELECT COUNT(*) as total FROM campo_estagio_frequencia WHERE data_encerramento IS NULL');
        
        const dados = {
            campos: {
                total: totalCampos.total,
                concedentes: totalConcedentes.total,
                estagiarios: totalEstagiarios.total,
                supervisores: totalSupervisores.total,
                orientadores: totalOrientadores.total
            },
            planos: {
                total: totalPlanos.total,
                status: statusPlanos
            },
            frequencias: {
                total: totalFrequencias.total,
                aprovadas: frequenciasAprovadas.total,
                pendentes: frequenciasPendentes.total,
                abertas: frequenciasAbertas.total
            }
        };
        
        res.json({ success: true, data: dados });
        
    } catch (error) {
        console.error('Erro ao buscar dados dos dashboards:', error);
        res.json({ success: false, message: 'Erro ao buscar dados' });
    }
});

/**
 * API para dados da tabela de campos de estágio
 */
router.get('/estagios/dashboard-administrativo/campos', requireAuth, async (req, res) => {
    try {
        const user = getUserFromSession(req);
        
        if (!user || user.nivelacesso !== 'Administrador') {
            return res.json({ success: false, message: 'Acesso negado' });
        }
        
        const db = databaseConfig;
        
        const query = `
            SELECT 
                ce.id_campo_estagio,
                ce.situacao,
                pe.nome as nome_estagiario,
                po.nome as nome_orientador,
                pc.nome as nome_concedente,
                ps.nome as nome_supervisor
            FROM campo_estagio ce
            LEFT JOIN pessoa pe ON ce.id_pessoa_estagiario = pe.id_pessoa
            LEFT JOIN pessoa po ON ce.id_pessoa_orientador = po.id_pessoa
            LEFT JOIN pessoa pc ON ce.id_pessoa_concedente = pc.id_pessoa
            LEFT JOIN pessoa ps ON ce.id_pessoa_supervisor = ps.id_pessoa
            ORDER BY ce.id_campo_estagio DESC
        `;
        
        const campos = await db.all(query);
        
        res.json({ success: true, data: campos });
        
    } catch (error) {
        console.error('Erro ao buscar campos de estágio:', error);
        res.json({ success: false, message: 'Erro ao buscar campos de estágio' });
    }
});

/**
 * API para dados da tabela de planos de atividade
 */
router.get('/estagios/dashboard-administrativo/planos/:campoId', requireAuth, async (req, res) => {
    try {
        const user = getUserFromSession(req);
        const campoId = parseInt(req.params.campoId);
        
        if (!user || user.nivelacesso !== 'Administrador') {
            return res.json({ success: false, message: 'Acesso negado' });
        }
        
        const db = databaseConfig;
        
        const query = `
            SELECT 
                ce.id_planoatividade, 
                ce.id_campo_estagio, 
                ce.situacao, 
                ce.data_inicial, 
                ce.data_final, 
                ce.cargahoraria, 
                ce.atividades, 
                ce.dataultimaatualizacao, 
                ce.url_planoassinado
            FROM 
                campo_estagio_planoatividade AS ce 
            WHERE 
                ce.id_campo_estagio = ?
            GROUP BY ce.id_planoatividade
            ORDER BY ce.dataultimaatualizacao DESC
        `;
        
        const planos = await db.all(query, [campoId]);
        
        res.json({ success: true, data: planos });
        
    } catch (error) {
        console.error('Erro ao buscar planos de atividade:', error);
        res.json({ success: false, message: 'Erro ao buscar planos de atividade' });
    }
});

/**
 * API para dados da tabela de frequências
 */
router.get('/estagios/dashboard-administrativo/frequencias/:planoId', requireAuth, async (req, res) => {
    try {
        const user = getUserFromSession(req);
        const planoId = parseInt(req.params.planoId);
        
        if (!user || user.nivelacesso !== 'Administrador') {
            return res.json({ success: false, message: 'Acesso negado' });
        }
        
        const db = databaseConfig;
        
        const query = `
            SELECT 
                cef.mesdereferencia, 
                cef.total_hora_mesreferencia, 
                cef.aprovado_estagiario, 
                cef.aprovado_orientador, 
                cef.aprovado_supervisor
            FROM 
                campo_estagio_frequencia AS cef
            WHERE cef.id_planoatividade = ?
            ORDER BY cef.mesdereferencia DESC
        `;
        
        const frequencias = await db.all(query, [planoId]);
        
        // Formatar dados das frequências
        const frequenciasFormatadas = frequencias.map(freq => {
            return {
                mesdereferencia: freq.mesdereferencia,
                total_hora_mesreferencia: freq.total_hora_mesreferencia,
                aprovado_estagiario: freq.aprovado_estagiario,
                aprovado_orientador: freq.aprovado_orientador,
                aprovado_supervisor: freq.aprovado_supervisor
            };
        });
        
        res.json({ success: true, data: frequenciasFormatadas });
        
    } catch (error) {
        console.error('Erro ao buscar frequências:', error);
        res.json({ success: false, message: 'Erro ao buscar frequências' });
    }
});

// Rota para enviar notificações por email quando campo de estágio é concluído
router.post('/estagios/campo/enviar-notificacao/:id', requireAuth, async (req, res) => {
    console.log('[SECURE-ROUTES] Rota de envio de notificação acessada para campo ID:', req.params.id);
    
    try {
        const campoId = req.params.id;
        
        // Buscar dados do campo de estágio e pessoas envolvidas
        const query = `
            SELECT 
                ce.*,
                pe.nome as nome_estagiario, pe.email as email_estagiario,
                po.nome as nome_orientador, po.email as email_orientador,
                ps.nome as nome_supervisor, ps.email as email_supervisor
            FROM campo_estagio ce
            LEFT JOIN pessoa pe ON ce.id_pessoa_estagiario = pe.id_pessoa
            LEFT JOIN pessoa po ON ce.id_pessoa_orientador = po.id_pessoa
            LEFT JOIN pessoa ps ON ce.id_pessoa_supervisor = ps.id_pessoa
            WHERE ce.id_campo_estagio = ?
        `;
        
        const user = getUserFromSession(req);
        // console.log('[DEBUG NOTIFICAÇÃO] Usuário extraído da sessão:', user);
        // console.log('[DEBUG NOTIFICAÇÃO] req.session.user:', req.session.user);
        
        if (!user || !user.id_pessoa) {
            console.error('[ERROR NOTIFICAÇÃO] Usuário não autenticado ou sem id_pessoa:', { user, sessionUser: req.session.user });
            return res.status(401).json({
                success: false,
                message: 'Usuário não autenticado'
            });
        }
        
        const rows = await dbHelper.executeCustom(query, [campoId], user, 'campo_estagio', 'all');
        
        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Campo de estágio não encontrado'
            });
        }
        
        const campo = rows[0];
        
        // Preparar lista de destinatários
        const destinatarios = [];
        if (campo.email_estagiario) destinatarios.push({ nome: campo.nome_estagiario, email: campo.email_estagiario });
        if (campo.email_orientador) destinatarios.push({ nome: campo.nome_orientador, email: campo.email_orientador });
        if (campo.email_supervisor) destinatarios.push({ nome: campo.nome_supervisor, email: campo.email_supervisor });
        
        if (destinatarios.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Nenhum e-mail válido encontrado para os envolvidos no campo de estágio'
            });
        }
        
        // Configurar dados do e-mail
        const assunto = 'Liberação para atuação no campo de estágio';
        const corpoEmail = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <p>Informamos que, após a conclusão da documentação e a assinatura dos termos do convênio, as partes estão <b>autorizadas a iniciar as atividades de estágio</b>.</p>
            
            <p>Reforçamos a importância do correto preenchimento dos documentos obrigatórios:</p> 
			<p><b>Plano de Atividades, Controle de Frequência e Relatório Final de estágio</b>.</p>
            <p>Esses documentos devem ser registrados exclusivamente no aplicativo, disponível em: https://coordenai.computacaoufj.online/</p>
            <p>Desejamos a todos um excelente trabalho e uma parceria produtiva.</p>
            
            <p><b>Envolvidos no estágio:</b><br>
            ${campo.nome_estagiario}<br>
            <i>Estagiário</i><br><br>
            ${campo.nome_supervisor}<br>
            <i>Supervisor</i><br><br>
            ${campo.nome_orientador}<br>
            <i>Orientador</i></p>
            
            <br>
            <p><b>Atenciosamente,</b><br>
            Coordenação de Estágio</p>
        </div>
        `;
        
        // Importar configuração de e-mail
        const emailConfig = require('../src/config/email');
        
        console.log('[EMAIL] Enviando notificações para:', destinatarios.map(d => d.email).join(', '));
        console.log('[EMAIL] Assunto:', assunto);
        
        // Enviar e-mails reais para todos os destinatários
        const resultadosEnvio = [];
        
        for (let i = 0; i < destinatarios.length; i++) {
            const destinatario = destinatarios[i];
            
            try {
                await emailConfig.enviarEmail(destinatario.email, assunto, corpoEmail);
                resultadosEnvio.push({ nome: destinatario.nome, email: destinatario.email, status: 'enviado' });
                console.log(`[EMAIL] E-mail enviado com sucesso para ${destinatario.email}`);
                
                // Adicionar delay entre envios (exceto no último)
                if (i < destinatarios.length - 1) {
                    console.log('[EMAIL] Aguardando 5 segundos antes do próximo envio...');
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            } catch (error) {
                console.error(`[EMAIL] Erro ao enviar e-mail para ${destinatario.email}:`, error);
                resultadosEnvio.push({ nome: destinatario.nome, email: destinatario.email, status: 'erro', erro: error.message });
                
                // Adicionar delay mesmo em caso de erro
                if (i < destinatarios.length - 1) {
                    console.log('[EMAIL] Aguardando 5 segundos antes do próximo envio...');
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }
        }
        
        const sucessos = resultadosEnvio.filter(r => r.status === 'enviado').length;
        const erros = resultadosEnvio.filter(r => r.status === 'erro').length;
        
        if (sucessos > 0) {
            res.json({
                success: true,
                message: `E-mails enviados: ${sucessos} sucesso(s), ${erros} erro(s)`,
                destinatarios: resultadosEnvio
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Falha ao enviar todos os e-mails',
                destinatarios: resultadosEnvio
            });
        }
        
    } catch (error) {
        console.error('Erro ao enviar notificações por e-mail:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor: ' + error.message
        });
    }
});

// Importar e montar rotas de estágios
const estagiosRoutes = require('../src/routes/estagios');
router.use('/estagios', estagiosRoutes);

console.log('[SECURE-ROUTES] Todas as rotas definidas com sucesso');
module.exports = router;