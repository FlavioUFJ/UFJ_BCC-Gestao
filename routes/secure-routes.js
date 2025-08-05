/**
 * Rotas com controle de acesso implementado
 * Demonstra como usar o DatabaseHelper para aplicar filtros automáticos
 */

const express = require('express');
const DatabaseHelper = require('../helpers/database-helper');
const router = express.Router();

// Instância do helper de banco de dados
const dbHelper = new DatabaseHelper();

// Middleware para extrair dados do usuário da sessão
function getUserFromSession(req) {
    if (!req.session.user) {
        return null;
    }
    
    return {
        id_pessoa: req.session.user.id_pessoa,
        tipoacesso: req.session.user.tipoacesso,
        nome: req.session.user.nome
    };
}

// Middleware de autenticação
function requireAuth(req, res, next) {
    if (!req.session.user) {
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

        // Query que será filtrada automaticamente pelo controle de acesso
        const query = `
            SELECT 
                ce.id_campo_estagio,
                ce.numero_matricula,
                pe.nome as nome_estagiario,
                ce.tipo_estagio,
                ce.semestre_ano,
                ce.situacao,
                ce.apolice_seguro,
                ce.nome_seguradora,
                ce.numero_processosei,
                pe.email as email_estagiario,
                po.nome as nome_orientador,
                pc.nome as nome_concedente,
                ce.numero_convenio,
                ps.nome as nome_supervisor,
                ps.email as email_supervisor,
                ps.telefone as telefone_supervisor,
                ce.supervisor_areaformacao,
                ce.unidade_academica,
                ce.data_inicio,
                ce.data_fim,
                ce.cargahoraria,
                ce.valor_bolsa,
                ce.valor_valetransporte,
                ce.observacoes
            FROM campo_estagio ce
            LEFT JOIN pessoa pe ON ce.id_pessoa_estagiario = pe.id_pessoa
            LEFT JOIN pessoa po ON ce.id_pessoa_orientador = po.id_pessoa
            LEFT JOIN pessoa pc ON ce.id_pessoa_concedente = pc.id_pessoa
            LEFT JOIN pessoa ps ON ce.id_pessoa_supervisor = ps.id_pessoa
            ORDER BY pe.nome
        `;

        // Executa query com controle de acesso automático
        const campos_estagio = await dbHelper.select(query, [], user, 'campo_estagio');
        
        // Verifica se usuário é admin para mostrar informações adicionais
        const isAdmin = await dbHelper.isAdmin(user);
        
        // Converter datas ISO para formato brasileiro
        const camposFormatados = campos_estagio.map(campo => {
            return {
                ...campo,
                data_inicio_br: convertISOToBRDate(campo.data_inicio),
                data_fim_br: convertISOToBRDate(campo.data_fim)
            };
        });

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
 * Permite acesso a usuários autenticados (não apenas admins)
 */
router.get('/estagio/campo/novo', requireAuth, (req, res) => {
    // Definir valores enum necessários para o formulário
    const ENUM_VALUES = {
        situacao: [
            'Em edição',
            'Aprovado'
        ],
        tipo_estagio: [
            'Obrigatório',
            'Não Obrigatório'
        ]
    };
    
    // Capturar a origem da requisição para o botão voltar dinâmico
    const origem = req.query.origem || '/estagio/dashboard';
    
    // Capturar parâmetros de pessoa selecionada (se houver)
    const pessoaSelecionada = {
        id_pessoa: req.query.id_pessoa || null,
        pessoa_nome: req.query.pessoa_nome || null
    };
    
    res.render('campo-estagio-form', {
        title: 'Cadastro de Campo de Estágio',
        enumValues: ENUM_VALUES,
        user: req.session.user,
        origem: origem,
        pessoaSelecionada: pessoaSelecionada,
        currentPage: 'campo-estagio'
    });
});



/**
 * Rota para criar novo campo de estágio
 * Demonstra controle de acesso em operações de inserção
 */
router.post('/estagio/campo/criar', requireAuth, async (req, res) => {
    try {
        const user = getUserFromSession(req);
        
        if (!user) {
            return res.redirect('/auth/login');
        }

        const dadosEstagio = {
            id_pessoa_curso: req.body.id_pessoa_curso,
            tipo_estagio: req.body.tipo_estagio,
            semestre_ano: req.body.semestre_ano,
            situacao: req.body.situacao || 'Em edição',
            id_pessoa_estagiario: req.body.id_pessoa_estagiario,
            numero_matricula: req.body.numero_matricula,
            periodo: req.body.periodo,
            id_pessoa_orientador: req.body.id_pessoa_orientador,
            id_pessoa_concedente: req.body.id_pessoa_concedente,
            id_pessoa_supervisor: req.body.id_pessoa_supervisor,
            unidade_academica: req.body.unidade_academica,
            data_inicio: req.body.data_inicio,
            data_fim: req.body.data_fim,
            cargahoraria: req.body.cargahoraria,
            numero_apolice: req.body.numero_apolice,
            nome_seguradora: req.body.nome_seguradora,
            dataultimaatualizacao: new Date().toISOString()
        };

        // Insere com validação automática de acesso
        const result = await dbHelper.insert('campo_estagio', dadosEstagio, user);
        
        res.json({
            success: true,
            message: 'Campo de estágio criado com sucesso',
            id: result.id
        });

    } catch (error) {
        console.error('Erro ao criar campo de estágio:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * Rota para atualizar campo de estágio
 * Demonstra controle de acesso em operações de atualização
 */
router.put('/estagio/campo/:id', requireAuth, async (req, res) => {
    try {
        const user = getUserFromSession(req);
        const estagioId = parseInt(req.params.id);
        
        if (!user) {
            return res.status(401).json({ success: false, message: 'Não autenticado' });
        }

        const dadosAtualizacao = {
            tipo_estagio: req.body.tipo_estagio,
            semestre_ano: req.body.semestre_ano,
            situacao: req.body.situacao,
            numero_matricula: req.body.numero_matricula,
            periodo: req.body.periodo,
            unidade_academica: req.body.unidade_academica,
            data_inicio: req.body.data_inicio,
            data_fim: req.body.data_fim,
            cargahoraria: req.body.cargahoraria,
            dataultimaatualizacao: new Date().toISOString()
        };

        // Remove campos undefined/null
        Object.keys(dadosAtualizacao).forEach(key => {
            if (dadosAtualizacao[key] === undefined || dadosAtualizacao[key] === null) {
                delete dadosAtualizacao[key];
            }
        });

        // Atualiza com validação automática de acesso
        const result = await dbHelper.update(
            'campo_estagio', 
            dadosAtualizacao, 
            { id_campo_estagio: estagioId }, 
            user
        );
        
        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Registro não encontrado ou você não tem permissão para editá-lo'
            });
        }

        res.json({
            success: true,
            message: 'Campo de estágio atualizado com sucesso'
        });

    } catch (error) {
        console.error('Erro ao atualizar campo de estágio:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * Rota para excluir campo de estágio
 * Demonstra controle de acesso em operações de exclusão
 */
router.delete('/estagio/campo/:id', requireAuth, async (req, res) => {
    try {
        const user = getUserFromSession(req);
        const estagioId = parseInt(req.params.id);
        
        if (!user) {
            return res.status(401).json({ success: false, message: 'Não autenticado' });
        }

        // Exclui com validação automática de acesso
        const result = await dbHelper.delete(
            'campo_estagio', 
            { id_campo_estagio: estagioId }, 
            user
        );
        
        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Registro não encontrado ou você não tem permissão para excluí-lo'
            });
        }

        res.json({
            success: true,
            message: 'Campo de estágio excluído com sucesso'
        });

    } catch (error) {
        console.error('Erro ao excluir campo de estágio:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * Rota para buscar pessoas
 * Permite acesso a usuários autenticados para preenchimento de formulários
 */
router.get('/pessoas/buscar', requireAuth, (req, res) => {
    const { termo, categoria, pagina = 1, limite = 25 } = req.query;
    console.log('DEBUG - Parâmetros recebidos:', { termo, categoria, pagina, limite });
    
    let whereClause = '';
    let params = [];
    
    if (termo && termo.trim() !== '') {
        // Se há termo de busca
        if (categoria && categoria !== 'todos') {
            whereClause = 'WHERE categoria = ? AND (nome LIKE ? OR email LIKE ?)';
            params = [categoria, `%${termo}%`, `%${termo}%`];
        } else {
            whereClause = 'WHERE nome LIKE ? OR email LIKE ?';
            params = [`%${termo}%`, `%${termo}%`];
        }
    } else {
        // Se não há termo de busca, retornar todas as pessoas
        if (categoria && categoria !== 'todos') {
            whereClause = 'WHERE categoria = ?';
            params = [categoria];
        } else {
            whereClause = '';
            params = [];
        }
    }
    
    // Primeiro, contar o total de registros
    const countSql = `SELECT COUNT(*) as total FROM pessoa ${whereClause}`;
    console.log('DEBUG - SQL count:', countSql);
    
    const db = new (require('sqlite3').verbose().Database)('./database.db');
    
    db.get(countSql, params, (err, countResult) => {
        if (err) {
            console.error('Erro ao contar pessoas:', err);
            return res.json({ success: false, message: 'Erro ao buscar pessoas' });
        }
        
        const total = countResult.total;
        const offset = (parseInt(pagina) - 1) * parseInt(limite);
        
        // Buscar os registros com paginação
        const sql = `SELECT id_pessoa, nome, email, tipo, telefone, cnpj_cpf, categoria FROM pessoa ${whereClause} ORDER BY nome COLLATE NOCASE LIMIT ? OFFSET ?`;
        const finalParams = [...params, parseInt(limite), offset];
        
        console.log('DEBUG - SQL gerado:', sql);
        console.log('DEBUG - Parâmetros SQL:', finalParams);
        
        db.all(sql, finalParams, (err, pessoas) => {
            if (err) {
                console.error('Erro ao buscar pessoas:', err);
                return res.json({ success: false, message: 'Erro ao buscar pessoas' });
            }
            
            console.log('DEBUG - Pessoas encontradas:', pessoas.length, 'de', total);
            res.json({ 
                success: true, 
                pessoas: pessoas,
                total: total,
                pagina: parseInt(pagina),
                limite: parseInt(limite)
            });
        });
    });
});

/**
 * Rota para criar nova pessoa
 * Permite acesso a usuários autenticados para cadastro durante preenchimento de formulários
 */
router.post('/pessoas/criar', requireAuth, (req, res) => {
    const { nome, email, telefone, cnpj_cpf, tipo, categoria } = req.body;
    
    // Validação dos campos obrigatórios
    if (!nome || !tipo) {
        return res.json({ success: false, message: 'Nome e tipo são obrigatórios' });
    }
    
    if (!email || email.trim() === '') {
        return res.json({ success: false, message: 'Email é obrigatório' });
    }
    
    const db = new (require('sqlite3').verbose().Database)('./database.db');
    
    // Verificar se já existe pessoa com mesmo email
    db.get('SELECT id_pessoa FROM pessoa WHERE email = ?', [email], (err, existingPerson) => {
        if (err) {
            console.error('Erro ao verificar email:', err);
            return res.json({ success: false, message: 'Erro ao verificar dados' });
        }
        
        if (existingPerson) {
            return res.json({ success: false, message: 'Já existe uma pessoa cadastrada com este email' });
        }
        
        // Inserir nova pessoa
        insertPessoa();
    });
    
    function insertPessoa() {
        const sql = `INSERT INTO pessoa (nome, email, telefone, cnpj_cpf, tipo, categoria, dataCadastro) 
                     VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`;
        
        db.run(sql, [nome, email, telefone, cnpj_cpf, tipo, categoria], function(err) {
            if (err) {
                console.error('Erro ao criar pessoa:', err);
                return res.json({ success: false, message: 'Erro ao salvar pessoa' });
            }
            
            // Buscar a pessoa recém-criada para retornar os dados completos
            db.get('SELECT * FROM pessoa WHERE id_pessoa = ?', [this.lastID], (err, pessoa) => {
                if (err) {
                    console.error('Erro ao buscar pessoa criada:', err);
                    return res.json({ success: false, message: 'Pessoa criada, mas erro ao recuperar dados' });
                }
                
                res.json({ success: true, pessoa: pessoa, message: 'Pessoa cadastrada com sucesso!' });
            });
        });
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

        // Gera condições de acesso para JOINs complexos
        const accessConditions = await dbHelper.getJoinAccessConditions(user, 'ce');
        
        const query = `
            SELECT 
                ce.id_campo_estagio,
                pe.nome as estagiario,
                po.nome as orientador,
                pc.nome as concedente,
                ps.nome as supervisor,
                ce.tipo_estagio,
                ce.situacao,
                ce.data_inicio,
                ce.data_fim
            FROM campo_estagio ce
            LEFT JOIN pessoa pe ON ce.id_pessoa_estagiario = pe.id_pessoa
            LEFT JOIN pessoa po ON ce.id_pessoa_orientador = po.id_pessoa
            LEFT JOIN pessoa pc ON ce.id_pessoa_concedente = pc.id_pessoa
            LEFT JOIN pessoa ps ON ce.id_pessoa_supervisor = ps.id_pessoa
            WHERE ${accessConditions}
            ORDER BY pe.nome
        `;

        const relatorio = await dbHelper.executeCustom(query, [], user, 'campo_estagio');
        
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

module.exports = router;