const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const multer = require('multer');
const xlsx = require('xlsx');
const puppeteer = require('puppeteer');
const expressLayouts = require('express-ejs-layouts');
const nodemailer = require('nodemailer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// Middlewares
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configuração de sessão
app.use(session({
    secret: 'gestao-estagio-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 horas
}));

// Configuração do multer para upload de arquivos
const upload = multer({ dest: 'uploads/' });

// Importar rotas com controle de acesso
const secureRoutes = require('./routes/secure-routes');

// Definição dos valores enum para os campos da tabela campo_estagio
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

// Função para obter valores enum
function getEnumValues(campo) {
    return ENUM_VALUES[campo] || [];
}

// Rota para criar backup manual
app.post('/admin/criar-backup', requireAdmin, async (req, res) => {
    try {
        console.log('Criando backup manual...');
        const backup = await criarBackup();
        console.log(`Backup manual criado: ${backup.fileName}`);
        
        res.json({ 
            success: true, 
            message: `Backup criado com sucesso: ${backup.fileName}`,
            fileName: backup.fileName
        });
    } catch (error) {
        console.error('Erro ao criar backup manual:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao criar backup: ' + error.message 
        });
    }
});

// Rota para listar backups
app.get('/admin/listar-backups', requireAdmin, (req, res) => {
    try {
        const backups = listarBackups();
        res.json({ success: true, backups });
    } catch (error) {
        console.error('Erro ao listar backups:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao listar backups: ' + error.message 
        });
    }
});

// Rota para restaurar backup
app.post('/admin/restaurar-backup', requireAdmin, async (req, res) => {
    const { backupFileName } = req.body;
    
    if (!backupFileName) {
        return res.status(400).json({ 
            success: false, 
            message: 'Nome do arquivo de backup é obrigatório' 
        });
    }
    
    try {
        console.log(`Restaurando backup: ${backupFileName}`);
        const result = await restaurarBackup(backupFileName);
        console.log(`Backup restaurado: ${result.fileName}`);
        
        res.json({ 
            success: true, 
            message: `Backup restaurado com sucesso: ${result.fileName}`,
            currentBackup: `backup_antes_restore_${new Date().toISOString().replace(/[:.]/g, '-')}.db`
        });
    } catch (error) {
        console.error('Erro ao restaurar backup:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao restaurar backup: ' + error.message 
        });
    }
});

// Rota para download de backup
app.get('/admin/download-backup/:fileName', requireAdmin, (req, res) => {
    const { fileName } = req.params;
    const backupPath = path.join(__dirname, 'backups', fileName);
    
    if (!fs.existsSync(backupPath)) {
        return res.status(404).json({ 
            success: false, 
            message: 'Arquivo de backup não encontrado' 
        });
    }
    
    res.download(backupPath, fileName, (err) => {
        if (err) {
            console.error('Erro ao fazer download do backup:', err);
            res.status(500).json({ 
                success: false, 
                message: 'Erro ao fazer download do backup' 
            });
        }
    });
});

// Remover PDF assinado (coordenador)
app.delete('/admin/plano/:id/remover-pdf', requireAdmin, (req, res) => {
    const estagiarioId = req.params.id;
    
    // Buscar o arquivo atual para deletá-lo
    db.get('SELECT pdf_assinado FROM planos_atividade WHERE estagiario_id = ?', 
        [estagiarioId], (err, row) => {
        if (err) {
            console.error('Erro ao buscar PDF:', err);
            return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
        }
        
        if (!row || !row.pdf_assinado) {
            return res.status(404).json({ success: false, message: 'PDF não encontrado' });
        }
        
        // Remover arquivo físico
        const fs = require('fs');
        const filePath = path.join(__dirname, 'uploads', row.pdf_assinado);
        
        fs.unlink(filePath, (unlinkErr) => {
            if (unlinkErr) {
                console.error('Erro ao deletar arquivo:', unlinkErr);
            }
            
            // Remover referência do banco de dados
            db.run('UPDATE planos_atividade SET pdf_assinado = NULL WHERE estagiario_id = ?', 
                [estagiarioId], (updateErr) => {
                if (updateErr) {
                    console.error('Erro ao atualizar banco:', updateErr);
                    return res.status(500).json({ success: false, message: 'Erro ao remover PDF' });
                }
                
                res.json({ success: true, message: 'PDF removido com sucesso!' });
            });
        });
    });
});

// Função para enviar e-mail
async function enviarEmail(destinatario, assunto, conteudo) {
    return new Promise((resolve, reject) => {
        // Buscar configurações de e-mail do banco
        db.all('SELECT chave, valor FROM parametros WHERE chave LIKE "email_%"', (err, params) => {
            if (err) {
                console.error('Erro ao buscar parâmetros de e-mail:', err);
                return reject(err);
            }
            
            const config = {};
            params.forEach(param => {
                config[param.chave] = param.valor;
            });
            
            // Verificar se as configurações estão completas
            if (!config.email_host || !config.email_user || !config.email_password) {
                return reject(new Error('Configurações de e-mail incompletas'));
            }
            
            // Configurar transporter
            const port = parseInt(config.email_port) || 587;
            const transporter = nodemailer.createTransport({
                host: config.email_host,
                port: port,
                secure: port === 465, // true para porta 465, false para outras portas
                auth: {
                    user: config.email_user,
                    pass: config.email_password
                },
                tls: {
                    // Não rejeitar conexões não autorizadas
                    rejectUnauthorized: false
                }
            });
            
            // Configurar e-mail
            const mailOptions = {
                from: config.email_from || config.email_user,
                to: destinatario,
                subject: assunto,
                html: conteudo
            };
            
            // Enviar e-mail
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error('Erro ao enviar e-mail:', error);
                    return reject(error);
                }
                console.log('E-mail enviado:', info.response);
                resolve(info);
            });
        });
    });
}

// Função para enviar e-mail usando configurações de parâmetros específicos
async function enviarEmailComParametros(destinatario, assunto, conteudo, configEmail) {
    return new Promise((resolve, reject) => {
        // Verificar se as configurações essenciais estão presentes
        if (!configEmail.email_host || !configEmail.email_user || !configEmail.email_password) {
            return reject(new Error('Configurações de e-mail incompletas'));
        }
        
        // Configurar transporter
        const port = parseInt(configEmail.email_port) || 587;
        const transporter = nodemailer.createTransport({
            host: configEmail.email_host,
            port: port,
            secure: port === 465, // true para porta 465, false para outras portas
            auth: {
                user: configEmail.email_user,
                pass: configEmail.email_password
            },
            tls: {
                // Não rejeitar conexões não autorizadas
                rejectUnauthorized: false
            }
        });
        
        // Configurar e-mail
        const mailOptions = {
            from: configEmail.email_from || configEmail.email_user,
            to: destinatario,
            subject: assunto,
            html: conteudo
        };
        
        // Enviar e-mail
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Erro ao enviar e-mail:', error);
                return reject(error);
            }
            console.log('E-mail enviado:', info.response);
            resolve(info);
        });
    });
}

// Função para criar backup do banco de dados
function criarBackup() {
    return new Promise((resolve, reject) => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFileName = `backup_${timestamp}.db`;
        const backupPath = path.join(__dirname, 'backups', backupFileName);
        
        // Criar diretório de backups se não existir
        const backupsDir = path.join(__dirname, 'backups');
        if (!fs.existsSync(backupsDir)) {
            fs.mkdirSync(backupsDir, { recursive: true });
        }
        
        // Criar backup copiando o arquivo do banco
        fs.copyFile('./database.db', backupPath, (err) => {
            if (err) {
                console.error('Erro ao criar backup:', err);
                reject(err);
            } else {
                console.log(`Backup criado: ${backupFileName}`);
                resolve({ fileName: backupFileName, path: backupPath });
            }
        });
    });
}

// Função para restaurar backup
function restaurarBackup(backupFileName) {
    return new Promise((resolve, reject) => {
        const backupPath = path.join(__dirname, 'backups', backupFileName);
        
        if (!fs.existsSync(backupPath)) {
            reject(new Error('Arquivo de backup não encontrado'));
            return;
        }
        
        // Fazer backup do banco atual antes de restaurar
        const currentBackupName = `backup_antes_restore_${new Date().toISOString().replace(/[:.]/g, '-')}.db`;
        const currentBackupPath = path.join(__dirname, 'backups', currentBackupName);
        
        fs.copyFile('./database.db', currentBackupPath, (err) => {
            if (err) {
                console.error('Erro ao fazer backup do banco atual:', err);
            }
            
            // Restaurar o backup selecionado
            fs.copyFile(backupPath, './database.db', (err) => {
                if (err) {
                    console.error('Erro ao restaurar backup:', err);
                    reject(err);
                } else {
                    console.log(`Backup restaurado: ${backupFileName}`);
                    resolve({ fileName: backupFileName });
                }
            });
        });
    });
}

// Função para listar backups disponíveis
function listarBackups() {
    const backupsDir = path.join(__dirname, 'backups');
    
    if (!fs.existsSync(backupsDir)) {
        return [];
    }
    
    const files = fs.readdirSync(backupsDir)
        .filter(file => file.endsWith('.db'))
        .map(file => {
            const filePath = path.join(backupsDir, file);
            const stats = fs.statSync(filePath);
            
            // Formatar tamanho do arquivo
            const formatSize = (bytes) => {
                if (bytes === 0) return '0 Bytes';
                const k = 1024;
                const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
            };
            
            // Formatar data
            const formatDate = (date) => {
                return date.toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
            };
            
            return {
                fileName: file,
                size: formatSize(stats.size),
                date: formatDate(stats.mtime),
                created: stats.mtime
            };
        })
        .sort((a, b) => b.created - a.created); // Ordenar por data de criação (mais recente primeiro)
    
    return files;
}

// Inicialização do banco de dados
const db = new sqlite3.Database('./database.db');

// Criação das tabelas
db.serialize(() => {
    // Tabela estagiarios removida - usando sistema modular com pessoa/pessoa_login

    // Tabela de planos de atividade (sem referência a estagiarios)
    // Esta tabela foi recriada sem dependências da tabela estagiarios removida

    // Tabelas planos_atividade e relatorios_estagio foram recriadas pelo script remove_estagiarios.js
    // sem dependências da tabela estagiarios removida

    // Tabela de parâmetros do sistema
    db.run(`CREATE TABLE IF NOT EXISTS parametros (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chave TEXT UNIQUE NOT NULL,
        valor TEXT,
        descricao TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Inserir parâmetros padrão se não existirem
    const parametrosPadrao = [
        { chave: 'email_host', valor: '', descricao: 'Servidor SMTP para envio de e-mails' },
        { chave: 'email_port', valor: '587', descricao: 'Porta do servidor SMTP' },
        { chave: 'email_user', valor: '', descricao: 'Usuário do e-mail' },
        { chave: 'email_password', valor: '', descricao: 'Senha do e-mail' },
        { chave: 'email_from', valor: 'computacao@ufj.edu.br', descricao: 'E-mail remetente' },
        { chave: 'seguro_numero_apolice', valor: '', descricao: 'Número da apólice de seguro' },
        { chave: 'seguro_nome_seguradora', valor: '', descricao: 'Nome da seguradora' }
    ];

    parametrosPadrao.forEach(param => {
        db.get('SELECT * FROM parametros WHERE chave = ?', [param.chave], (err, row) => {
            if (!row) {
                db.run('INSERT INTO parametros (chave, valor, descricao) VALUES (?, ?, ?)',
                    [param.chave, param.valor, param.descricao]);
            }
        });
    });

    // Código removido - tabela estagiarios foi excluída
    // Sistema agora usa pessoa/pessoa_login para autenticação
});

// Upload do PDF assinado (estagiário)
app.post('/plano/anexar-pdf', requireAuth, upload.single('pdf_assinado'), (req, res) => {
    if (req.session.user.categoria === 'Coordenador') {
        return res.redirect('/admin/rotinas');
    }

    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Nenhum arquivo foi enviado' });
    }

    // Verificar se é um arquivo PDF
    if (req.file.mimetype !== 'application/pdf') {
        return res.status(400).json({ success: false, message: 'Apenas arquivos PDF são aceitos' });
    }

    // Atualizar o plano com o caminho do arquivo
    db.run('UPDATE planos_atividade SET pdf_assinado = ? WHERE estagiario_id = ?', 
        [req.file.filename, req.session.user.id], (err) => {
        if (err) {
            console.error('Erro ao salvar PDF:', err);
            return res.status(500).json({ success: false, message: 'Erro ao salvar arquivo' });
        }
        res.json({ success: true, message: 'PDF anexado com sucesso!' });
    });
});

// Download do PDF assinado (estagiário)
// Rota /plano/pdf-assinado removida - referenciava tabela estagiarios que foi deletada
// Sistema agora usa pessoa/pessoa_login para autenticação

// Rota /admin/plano/pdf-assinado removida - referenciava tabela estagiarios que foi deletada
// Sistema agora usa pessoa/pessoa_login para autenticação

// Middleware de autenticação
function requireAuth(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
}

function requireAdmin(req, res, next) {
    if (req.session.user && (req.session.user.categoria === 'Coordenador' || req.session.user.matricula === 'coordenador' || req.session.user.tipoacesso === 'Administrador')) {
        next();
    } else {
        // Verificar se é uma requisição AJAX
        if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
            res.status(403).json({ success: false, message: 'Acesso negado' });
        } else {
            res.status(403).send('Acesso negado');
        }
    }
}

// Middleware para nível Operacional (pode quase tudo, exceto rotinas administrativas)
function requireOperacional(req, res, next) {
    if (req.session.user && (req.session.user.tipoacesso === 'Operacional' || req.session.user.tipoacesso === 'Administrador' || req.session.user.categoria === 'Coordenador')) {
        next();
    } else {
        // Verificar se é uma requisição AJAX
        if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
            res.status(403).json({ success: false, message: 'Acesso negado' });
        } else {
            res.status(403).send('Acesso negado');
        }
    }
}

// Middleware para nível Visitante (acesso mais restrito, apenas consultas específicas)
function requireVisitante(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Middleware para verificar acesso ao módulo de estágio
function requireModuloEstagio(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    
    // Administradores sempre têm acesso
    if (req.session.user.tipoacesso === 'Administrador' || req.session.user.categoria === 'Coordenador') {
        return next();
    }
    
    const userId = req.session.user.id_pessoa;
    
    if (!userId) {
        // Verificar se é uma requisição AJAX
        if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
            return res.status(403).json({ success: false, message: 'Acesso negado ao módulo de estágio' });
        } else {
            return res.status(403).send('Acesso negado ao módulo de estágio');
        }
    }
    
    // Verificar se o usuário tem acesso ao módulo de estágio
    const query = `
        SELECT um.ativo 
        FROM usuario_modulos um
        INNER JOIN modulos m ON um.id_modulo = m.id_modulo
        WHERE um.id_pessoa = ? AND m.nome = 'Estágio' AND um.ativo = 1
    `;
    
    db.get(query, [userId], (err, result) => {
        if (err) {
            console.error('Erro ao verificar acesso ao módulo:', err);
            if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
                return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
            } else {
                return res.status(500).send('Erro interno do servidor');
            }
        }
        
        if (result && result.ativo === 1) {
            next();
        } else {
            // Verificar se é uma requisição AJAX
            if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
                res.status(403).json({ success: false, message: 'Acesso negado ao módulo de estágio' });
            } else {
                res.status(403).send('Acesso negado ao módulo de estágio');
            }
        }
    });
}

// Usar as rotas com controle de acesso
app.use('/secure', secureRoutes);

// API Routes para os cards do dashboard
app.get('/api/planos-atividade', requireModuloEstagio, (req, res) => {
    const query = `
        SELECT 
            pa.*,
            pe.nome as campo_nome,
            COUNT(pa.id) as total_atividades,
            MAX(pa.updated_at) as data_atualizacao
        FROM planos_atividade pa
        LEFT JOIN campo_estagio ce ON pa.campo_estagio_id = ce.id_campo_estagio
        LEFT JOIN pessoa pe ON ce.id_pessoa_estagiario = pe.id_pessoa
        GROUP BY pa.campo_estagio_id
        ORDER BY pa.updated_at DESC
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Erro ao buscar planos de atividade:', err);
            return res.json({ success: false, error: 'Erro interno do servidor' });
        }
        
        const totalAtividades = rows.reduce((sum, row) => sum + (row.total_atividades || 0), 0);
        const ultimaAtualizacao = rows.length > 0 ? rows[0].data_atualizacao : null;
        
        res.json({
            success: true,
            planos: rows,
            totalAtividades,
            ultimaAtualizacao: ultimaAtualizacao ? new Date(ultimaAtualizacao).toLocaleDateString('pt-BR') : 'Nunca'
        });
    });
});

app.get('/api/relatorios-estagio', requireModuloEstagio, (req, res) => {
    const query = `
        SELECT 
            re.*,
            pe.nome as campo_nome,
            COUNT(re.id) as total_relatorios,
            MAX(re.updated_at) as data_atualizacao
        FROM relatorios_estagio re
        LEFT JOIN campo_estagio ce ON re.campo_estagio_id = ce.id_campo_estagio
        LEFT JOIN pessoa pe ON ce.id_pessoa_estagiario = pe.id_pessoa
        GROUP BY re.campo_estagio_id
        ORDER BY re.updated_at DESC
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Erro ao buscar relatórios de estágio:', err);
            return res.json({ success: false, error: 'Erro interno do servidor' });
        }
        
        const concluidos = rows.filter(row => row.status === 'Concluído').length;
        const ultimaAtualizacao = rows.length > 0 ? rows[0].data_atualizacao : null;
        
        res.json({
            success: true,
            relatorios: rows,
            concluidos,
            ultimaAtualizacao: ultimaAtualizacao ? new Date(ultimaAtualizacao).toLocaleDateString('pt-BR') : 'Nunca'
        });
    });
});

// Rotas
app.get('/', (req, res) => {
    if (req.session.user) {
        if (req.session.user.matricula === 'coordenador') {
            res.redirect('/admin/rotinas');
        } else {
            res.redirect('/dashboard');
        }
    } else {
        res.redirect('/login');
    }
});

app.get('/login', (req, res) => {
    res.render('login', { title: 'Login - Sistema de Gestão de Estágio', error: null });
});

app.post('/login', (req, res) => {
    const { email, senha } = req.body;
    
    // Buscar na tabela pessoa_login (sistema modular)
    const queryLogin = `
        SELECT 
            p.id_pessoa,
            p.nome,
            p.email,
            p.categoria,
            pl.senha,
            pl.status,
            pl.tipoacesso
        FROM pessoa p
        INNER JOIN pessoa_login pl ON p.id_pessoa = pl.id_pessoa
        WHERE p.email = ? AND pl.status = 'Ativo'
    `;
    
    db.get(queryLogin, [email], (err, user) => {
        if (err) {
            return res.render('login', { title: 'Login - Sistema de Gestão de Estágio', error: 'Erro interno do servidor' });
        }
        
        if (user) {
            // Verificar senha
            bcrypt.compare(senha, user.senha, (err, result) => {
                if (result) {
                    req.session.user = user;
                    req.session.isAdmin = user.categoria === 'Coordenador' || user.tipoacesso === 'Administrador';
                    
                    // Todos os usuários vão para a página de módulos após login
                    res.redirect('/dashboard-modular');
                } else {
                    res.render('login', { title: 'Login - Sistema de Gestão de Estágio', error: 'Senha incorreta' });
                }
            });
        } else {
            res.render('login', { title: 'Login - Sistema de Gestão de Estágio', error: 'E-mail não encontrado ou usuário inativo' });
        }
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// Rota para exibir página de recuperação de senha
app.get('/recuperar-senha', (req, res) => {
    res.render('recuperar-senha', { title: 'Recuperar Senha' });
});

// Rota para processar recuperação de senha - integrada com sistema de parâmetros
app.post('/recuperar-senha', async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        return res.render('recuperar-senha', { 
            title: 'Recuperar Senha',
            error: 'Por favor, informe o e-mail.' 
        });
    }
    
    try {
        // 1º - Definir o identificador do parâmetro necessário
        const PARAMETRO_CONTA_EMAIL = 'Conta e-mail';
        
        // 2º - Verificar se o parâmetro "Conta e-mail" existe
        const queryParametro = `
            SELECT p.id_parametro, p.identificador, p.descricao, p.quantidadevalor
            FROM parametro p 
            WHERE p.identificador = ?
        `;
        
        db.get(queryParametro, [PARAMETRO_CONTA_EMAIL], async (err, parametro) => {
            if (err) {
                console.error('Erro ao buscar parâmetro:', err);
                return res.render('recuperar-senha', { 
                    title: 'Recuperar Senha',
                    error: 'Erro interno do servidor. Tente novamente.' 
                });
            }
            
            if (!parametro) {
                // Criar automaticamente o parâmetro "Conta e-mail" se não existir
                const insertParametro = `
                    INSERT INTO parametro (nome, descricao, limite_valores, data_criacao)
                    VALUES (?, ?, ?, datetime('now'))
                `;
                
                db.run(insertParametro, [
                    PARAMETRO_CONTA_EMAIL,
                    'Configurações da conta de e-mail para envio de mensagens do sistema',
                    10
                ], function(insertErr) {
                    if (insertErr) {
                        console.error('Erro ao criar parâmetro:', insertErr);
                        return res.render('recuperar-senha', { 
                            title: 'Recuperar Senha',
                            error: 'Erro interno do servidor. Tente novamente.' 
                        });
                    }
                    
                    return res.render('recuperar-senha', { 
                        title: 'Recuperar Senha',
                        error: `O parâmetro "${PARAMETRO_CONTA_EMAIL}" não foi encontrado e foi criado automaticamente. Por favor, acesse a área administrativa e configure os seguintes valores para este parâmetro: email_host, email_port, email_user, email_password, email_from. Após a configuração, tente novamente a recuperação de senha.`,
                        parametro_info: {
                            nome: PARAMETRO_CONTA_EMAIL,
                            valores_necessarios: ['email_host', 'email_port', 'email_user', 'email_password', 'email_from']
                        }
                    });
                });
                return;
            }
            
            // 3º - Recuperar os valores do parâmetro para utilizar na execução
            const queryValores = `
                SELECT pv.identificadorvalor, pv.valor
                FROM parametrovalor pv
                WHERE pv.id_parametro = ?
            `;
            
            db.all(queryValores, [parametro.id_parametro], async (valoresErr, valores) => {
                if (valoresErr) {
                    console.error('Erro ao buscar valores do parâmetro:', valoresErr);
                    return res.render('recuperar-senha', { 
                        title: 'Recuperar Senha',
                        error: 'Erro interno do servidor. Tente novamente.' 
                    });
                }
                
                if (!valores || valores.length === 0) {
                    return res.render('recuperar-senha', { 
                        title: 'Recuperar Senha',
                        error: `O parâmetro "${PARAMETRO_CONTA_EMAIL}" foi encontrado, mas não possui valores configurados. Por favor, acesse a área administrativa e configure os seguintes valores: email_host, email_port, email_user, email_password, email_from.`,
                        parametro_info: {
                            nome: PARAMETRO_CONTA_EMAIL,
                            valores_necessarios: ['email_host', 'email_port', 'email_user', 'email_password', 'email_from']
                        }
                    });
                }
                
                // Converter valores para objeto de configuração
                const configEmail = {};
                valores.forEach(valor => {
                    configEmail[valor.identificadorvalor] = valor.valor;
                });
                
                // Verificar se as configurações essenciais estão presentes
                const configsEssenciais = ['email_host', 'email_user', 'email_password'];
                const configsFaltando = configsEssenciais.filter(config => !configEmail[config]);
                
                if (configsFaltando.length > 0) {
                    return res.render('recuperar-senha', { 
                        title: 'Recuperar Senha',
                        error: `Configurações de e-mail incompletas. Faltam os seguintes valores no parâmetro "${PARAMETRO_CONTA_EMAIL}": ${configsFaltando.join(', ')}. Por favor, configure estes valores na área administrativa.`,
                        parametro_info: {
                            nome: PARAMETRO_CONTA_EMAIL,
                            valores_necessarios: ['email_host', 'email_port', 'email_user', 'email_password', 'email_from']
                        }
                    });
                }
                
                // Buscar usuário pelo e-mail
                const queryUser = `
                    SELECT 
                        p.id_pessoa,
                        p.nome,
                        p.email,
                        pl.id_pessoa_login
                    FROM pessoa p
                    INNER JOIN pessoa_login pl ON p.id_pessoa = pl.id_pessoa
                    WHERE p.email = ? AND pl.status = 'Ativo'
                `;
                
                db.get(queryUser, [email], async (userErr, user) => {
                    if (userErr) {
                        console.error('Erro ao buscar usuário:', userErr);
                        return res.render('recuperar-senha', { 
                            title: 'Recuperar Senha',
                            error: 'Erro interno do servidor. Tente novamente.' 
                        });
                    }
                    
                    if (!user) {
                        return res.render('recuperar-senha', { 
                            title: 'Recuperar Senha',
                            error: 'E-mail não encontrado no sistema ou usuário inativo.' 
                        });
                    }
                    
                    // Gerar nova senha aleatória
                    const novaSenha = Math.random().toString(36).slice(-8);
                    
                    // Criptografar a nova senha
                    const hash = await bcrypt.hash(novaSenha, 10);
                    
                    // Atualizar a senha do usuário no banco de dados
                    db.run('UPDATE pessoa_login SET senha = ? WHERE id_pessoa = ?', [hash, user.id_pessoa], async function(updateErr) {
                        if (updateErr) {
                            console.error('Erro ao atualizar senha:', updateErr);
                            return res.render('recuperar-senha', { 
                                title: 'Recuperar Senha',
                                error: 'Erro ao atualizar a senha. Tente novamente.' 
                            });
                        }
                        
                        if (this.changes === 0) {
                            return res.render('recuperar-senha', { 
                                title: 'Recuperar Senha',
                                error: 'Erro ao atualizar a senha. Tente novamente.' 
                            });
                        }
                        
                        // Enviar nova senha por e-mail usando as configurações do parâmetro
                        const assunto = 'Nova Senha - Sistema de Gestão de Estágio';
                        const conteudo = `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
                                    <h2 style="color: white; margin: 0;">Sistema de Gestão de Estágio</h2>
                                    <p style="color: white; margin: 5px 0 0 0;">Universidade Federal de Jataí</p>
                                </div>
                                <div style="padding: 30px; background: #f8f9fa;">
                                    <h3 style="color: #333; margin-bottom: 20px;">Nova Senha Gerada</h3>
                                    <p style="color: #666; line-height: 1.6;">Olá, ${user.nome}!</p>
                                    <p style="color: #666; line-height: 1.6;">Uma nova senha foi gerada para sua conta:</p>
                                    <div style="background: white; padding: 15px; border-radius: 5px; border-left: 4px solid #667eea; margin: 20px 0;">
                                        <strong style="font-size: 18px; color: #333;">Nova Senha: ${novaSenha}</strong>
                                    </div>
                                    <p style="color: #666; line-height: 1.6;">Por favor, faça login com esta nova senha e altere-a assim que possível por uma de sua preferência.</p>
                                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                                        <p style="color: #999; font-size: 12px; margin: 0;">Este e-mail foi enviado automaticamente pelo Sistema de Gestão de Estágio da UFJ.</p>
                                    </div>
                                </div>
                            </div>
                        `;
                        
                        try {
                            // Usar função personalizada de envio com as configurações do parâmetro
                            await enviarEmailComParametros(user.email, assunto, conteudo, configEmail);
                            res.render('recuperar-senha', { 
                                title: 'Recuperar Senha',
                                success: `Nova senha enviada para o e-mail ${user.email}. Verifique sua caixa de entrada.` 
                            });
                        } catch (emailError) {
                            console.error('Erro ao enviar e-mail:', emailError);
                            res.render('recuperar-senha', { 
                                title: 'Recuperar Senha',
                                error: 'Senha foi redefinida, mas houve erro no envio do e-mail. Entre em contato com o suporte técnico.' 
                            });
                        }
                    });
                });
            });
        });
    } catch (error) {
        console.error('Erro na recuperação de senha:', error);
        res.render('recuperar-senha', { 
            title: 'Recuperar Senha',
            error: 'Erro interno do servidor. Tente novamente.' 
        });
    }
});

// Dashboard do estagiário - redirecionado para dashboard modular
app.get('/dashboard', requireAuth, (req, res) => {
    res.redirect('/dashboard-modular');
});

// Rota específica para estagio/dashboard - página principal do módulo
app.get('/estagio/dashboard', requireModuloEstagio, async (req, res) => {
    const imported = req.query.imported;
    const errors = req.query.errors;
    const success = req.query.success;
    const error = req.query.error;
    
    const DatabaseHelper = require('./helpers/database-helper');
    const dbHelper = new DatabaseHelper();
    
    try {
        const user = {
            id_pessoa: req.session.user.id_pessoa,
            tipoacesso: req.session.user.tipoacesso || 'Visitante'
        };
        
        const query = `
            SELECT 
                ce.id_campo_estagio,
                ce.numero_matricula,
                pe.nome as nome_estagiario,
                ce.situacao,
                ce.numero_processosei,
                po.nome as nome_orientador,
                pc.nome as nome_concedente,
                ps.nome as nome_supervisor
            FROM campo_estagio ce
            LEFT JOIN pessoa pe ON ce.id_pessoa_estagiario = pe.id_pessoa
            LEFT JOIN pessoa po ON ce.id_pessoa_orientador = po.id_pessoa
            LEFT JOIN pessoa pc ON ce.id_pessoa_concedente = pc.id_pessoa
            LEFT JOIN pessoa ps ON ce.id_pessoa_supervisor = ps.id_pessoa
            ORDER BY pe.nome
        `;
        
        // Aplicar controle de acesso automático
        const camposEstagio = await dbHelper.select(query, [], user, 'campo_estagio');
        
        res.render('dashboard-estagio', { 
            title: 'Módulo Estágio - Sistema de Gestão de Estágio', 
            camposEstagio: camposEstagio || [],
            imported: imported,
            errors: errors,
            success: success,
            error: error,
            user: req.session.user,
            enumValues: ENUM_VALUES
        });
        
    } catch (error) {
        console.error('Erro ao buscar campos de estágio:', error);
        res.render('dashboard-estagio', { 
            title: 'Módulo Estágio - Sistema de Gestão de Estágio', 
            camposEstagio: [],
            imported: imported,
            errors: errors,
            success: success,
            error: error.message,
            user: req.session.user,
            enumValues: ENUM_VALUES
        });
    } finally {
        dbHelper.close();
    }
}); 

// Dashboard modular - mostra todos os módulos com indicação de acesso
app.get('/dashboard-modular', requireAuth, (req, res) => {
    const userId = req.session.user.id_pessoa;
    
    if (!userId) {
        // Fallback para sistema antigo
        return res.render('dashboard-modular', {
            title: 'Dashboard - Sistema de Gestão de Estágio',
            user: req.session.user,
            modulos: [],
            layout: false
        });
    }
    
    // Buscar todos os módulos ativos e verificar acesso do usuário
    const query = `
        SELECT 
            m.id_modulo,
            m.nome,
            m.descricao,
            m.icone,
            m.cor,
            m.url,
            m.ordem,
            CASE 
                WHEN um.id_pessoa IS NOT NULL AND um.ativo = 1 THEN 1
                ELSE 0
            END as tem_acesso
        FROM modulos m
        LEFT JOIN usuario_modulos um ON m.id_modulo = um.id_modulo AND um.id_pessoa = ?
        WHERE m.ativo = 1
        ORDER BY m.ordem, m.nome
    `;
    
    db.all(query, [userId], (err, modulos) => {
        if (err) {
            console.error('Erro ao buscar módulos:', err);
            modulos = [];
        }
        
        res.render('dashboard-modular', {
            title: 'Dashboard - Sistema de Gestão de Estágio',
            user: req.session.user,
            modulos: modulos || [],
            layout: false
        });
    });
});

// Área administrativa - redireciona para rotinas administrativas
app.get('/admin', requireAdmin, (req, res) => {
    res.redirect('/admin/rotinas');
});

// Rota para as rotinas administrativas
app.get('/admin/rotinas', requireAdmin, (req, res) => {
    const origem = req.query.origem || '/estagio/dashboard';
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
    
    db.all(query, (err, campos_estagio) => {
        if (err) {
            console.error('Erro ao buscar campos de estágio:', err);
            return res.status(500).send('Erro interno do servidor');
        }
        
        // Converter datas ISO para formato brasileiro para exibição
        const camposFormatados = campos_estagio.map(campo => {
            return {
                ...campo,
                data_inicio_br: convertISOToBRDate(campo.data_inicio),
                data_fim_br: convertISOToBRDate(campo.data_fim)
            };
        });
        
        res.render('admin-rotinas', { 
            title: 'Rotinas Administrativas',
            campos_estagio: camposFormatados, 
            success: req.query.success,
            origem: origem, 
            error: req.query.error,
            enumValues: ENUM_VALUES
        });
    });
});

// Rota para a página de parâmetros
app.get('/admin/parametros', requireAdmin, (req, res) => {
    const origem = req.query.origem || '/admin/rotinas';
    
    // Buscar todos os parâmetros com seus valores
    const query = `
        SELECT p.id_parametro, p.identificador, p.descricao, p.modulo, p.quantidadevalor,
               pv.id_parametrovalor, pv.identificadorvalor, pv.valor
        FROM parametro p
        LEFT JOIN parametrovalor pv ON p.id_parametro = pv.id_parametro
        ORDER BY p.id_parametro, pv.id_parametrovalor
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Erro ao buscar parâmetros:', err);
            return res.render('admin-parametros', { 
                layout: false,
                parametros: [], 
                origem, 
                error: 'Erro ao carregar parâmetros',
                message: req.session.message
            });
        }
        
        // Agrupar parâmetros com seus valores
        const parametrosMap = new Map();
        
        rows.forEach(row => {
            if (!parametrosMap.has(row.id_parametro)) {
                parametrosMap.set(row.id_parametro, {
                    id_parametro: row.id_parametro,
                    identificador: row.identificador,
                    descricao: row.descricao,
                    modulo: row.modulo,
                    quantidadevalor: row.quantidadevalor,
                    valores: []
                });
            }
            
            if (row.id_parametrovalor) {
                parametrosMap.get(row.id_parametro).valores.push({
                    id_parametrovalor: row.id_parametrovalor,
                    identificadorvalor: row.identificadorvalor,
                    valor: row.valor
                });
            }
        });
        
        const parametros = Array.from(parametrosMap.values());
        
        res.render('admin-parametros', { 
            layout: false,
            parametros: parametros,
            message: req.session.message,
            error: req.session.error,
            origem: origem
        });
        
        // Limpar mensagens da sessão
        delete req.session.message;
        delete req.session.error;
    });
});

// Rota para página de cadastro de campo de estágio
app.get('/admin/campo-estagio/novo', requireAdmin, (req, res) => {
    res.render('campo-estagio-form', {
        title: 'Cadastro de Campo de Estágio',
        enumValues: ENUM_VALUES,
        user: req.session.user,
        layout: false
    });
});

// Rota para criar novo parâmetro
app.post('/admin/parametros/criar', requireAdmin, (req, res) => {
    const { identificador, descricao, modulo, quantidadevalor } = req.body;
    
    // Inserir apenas o parâmetro principal
    db.run('INSERT INTO parametro (identificador, descricao, modulo, quantidadevalor) VALUES (?, ?, ?, ?)',
           [identificador, descricao || null, modulo || null, quantidadevalor], function(err) {
        if (err) {
            console.error('Erro ao criar parâmetro:', err);
            return res.json({ success: false, message: 'Erro ao criar parâmetro' });
        }
        
        res.json({ success: true, message: 'Parâmetro criado com sucesso!', parametroId: this.lastID });
    });
});

// Rota para buscar um parâmetro específico
app.get('/admin/parametros/:id', requireAdmin, (req, res) => {
    const parametroId = req.params.id;
    
    const query = `
        SELECT p.id_parametro, p.identificador, p.descricao, p.modulo, p.quantidadevalor,
               pv.id_parametrovalor, pv.identificadorvalor, pv.valor
        FROM parametro p
        LEFT JOIN parametrovalor pv ON p.id_parametro = pv.id_parametro
        WHERE p.id_parametro = ?
        ORDER BY pv.id_parametrovalor
    `;
    
    db.all(query, [parametroId], (err, rows) => {
        if (err) {
            console.error('Erro ao buscar parâmetro:', err);
            return res.json({ success: false, message: 'Erro ao buscar parâmetro' });
        }
        
        if (rows.length === 0) {
            return res.json({ success: false, message: 'Parâmetro não encontrado' });
        }
        
        const parametro = {
            id_parametro: rows[0].id_parametro,
            identificador: rows[0].identificador,
            descricao: rows[0].descricao,
            modulo: rows[0].modulo,
            quantidadevalor: rows[0].quantidadevalor,
            valores: []
        };
        
        rows.forEach(row => {
            if (row.id_parametrovalor) {
                parametro.valores.push({
                    id_parametrovalor: row.id_parametrovalor,
                    identificadorvalor: row.identificadorvalor,
                    valor: row.valor
                });
            }
        });
        
        res.json({ success: true, parametro });
    });
});

// Rota API para buscar parâmetro por identificador (para uso público)
app.get('/api/parametros/buscar', (req, res) => {
    const { identificador } = req.query;
    
    if (!identificador) {
        return res.json({ success: false, message: 'Identificador é obrigatório' });
    }
    
    const query = `
        SELECT p.id_parametro, p.identificador, p.descricao, p.modulo, p.quantidadevalor,
               pv.id_parametrovalor, pv.identificadorvalor, pv.valor
        FROM parametro p
        LEFT JOIN parametrovalor pv ON p.id_parametro = pv.id_parametro
        WHERE p.identificador = ?
        ORDER BY pv.id_parametrovalor
    `;
    
    db.all(query, [identificador], (err, rows) => {
        if (err) {
            console.error('Erro ao buscar parâmetro:', err);
            return res.json({ success: false, message: 'Erro ao buscar parâmetro' });
        }
        
        if (rows.length === 0) {
            return res.json({ success: false, message: 'Parâmetro não encontrado' });
        }
        
        const parametro = {
            id_parametro: rows[0].id_parametro,
            identificador: rows[0].identificador,
            descricao: rows[0].descricao,
            modulo: rows[0].modulo,
            quantidadevalor: rows[0].quantidadevalor,
            valores: []
        };
        
        rows.forEach(row => {
            if (row.id_parametrovalor) {
                parametro.valores.push({
                    id_parametrovalor: row.id_parametrovalor,
                    identificadorvalor: row.identificadorvalor,
                    valor: row.valor
                });
            }
        });
        
        res.json({ success: true, parametro });
    });
});

// Rota para editar parâmetro
app.post('/admin/parametros/editar', requireAdmin, (req, res) => {
    const { id_parametro, identificador, descricao, modulo, quantidadevalor } = req.body;
    
    // Atualizar apenas o parâmetro principal
    db.run('UPDATE parametro SET identificador = ?, descricao = ?, modulo = ?, quantidadevalor = ? WHERE id_parametro = ?',
           [identificador, descricao || null, modulo || null, quantidadevalor, id_parametro], function(err) {
        if (err) {
            console.error('Erro ao atualizar parâmetro:', err);
            return res.json({ success: false, message: 'Erro ao atualizar parâmetro' });
        }
        
        res.json({ success: true, message: 'Parâmetro atualizado com sucesso!' });
    });
});

// Rota para atualizar valor específico
app.post('/admin/parametros/atualizar-valor', requireAdmin, (req, res) => {
    const { valorId, valor } = req.body;
    
    db.run('UPDATE parametrovalor SET valor = ? WHERE id_parametrovalor = ?',
           [valor, valorId], function(err) {
        if (err) {
            console.error('Erro ao atualizar valor:', err);
            return res.json({ success: false, message: 'Erro ao atualizar valor' });
        }
        
        res.json({ success: true, message: 'Valor atualizado com sucesso!' });
    });
});

// Rota para atualizar valor (compatibilidade com função atualizarValor)
app.post('/admin/parametros/valor/atualizar', requireAdmin, (req, res) => {
    const { id_parametrovalor, valor } = req.body;
    
    db.run('UPDATE parametrovalor SET valor = ? WHERE id_parametrovalor = ?',
           [valor, id_parametrovalor], function(err) {
        if (err) {
            console.error('Erro ao atualizar valor:', err);
            return res.json({ success: false, message: 'Erro ao atualizar valor' });
        }
        
        res.json({ success: true, message: 'Valor atualizado com sucesso!' });
    });
});

// Rota para criar valor de parâmetro
app.post('/admin/parametros/valor/criar', requireAdmin, (req, res) => {
    const { parametroId, identificadorvalor, valor } = req.body;
    
    // Verificar se o parâmetro existe e quantos valores já tem
    db.get('SELECT quantidadevalor FROM parametro WHERE id_parametro = ?', [parametroId], (err, parametro) => {
        if (err) {
            console.error('Erro ao buscar parâmetro:', err);
            return res.json({ success: false, message: 'Erro ao buscar parâmetro' });
        }
        
        if (!parametro) {
            return res.json({ success: false, message: 'Parâmetro não encontrado' });
        }
        
        // Contar quantos valores já existem
        db.get('SELECT COUNT(*) as count FROM parametrovalor WHERE id_parametro = ?', [parametroId], (err, result) => {
            if (err) {
                console.error('Erro ao contar valores:', err);
                return res.json({ success: false, message: 'Erro ao verificar valores existentes' });
            }
            
            if (result.count >= parametro.quantidadevalor) {
                return res.json({ success: false, message: `Este parâmetro já possui o máximo de ${parametro.quantidadevalor} valores permitidos` });
            }
            
            // Inserir o novo valor
            db.run('INSERT INTO parametrovalor (id_parametro, identificadorvalor, valor) VALUES (?, ?, ?)',
                   [parametroId, identificadorvalor, valor], function(err) {
                if (err) {
                    console.error('Erro ao criar valor:', err);
                    return res.json({ success: false, message: 'Erro ao criar valor' });
                }
                
                res.json({ success: true, message: 'Valor criado com sucesso!' });
            });
        });
    });
});

// Rota para editar valor de parâmetro
app.post('/admin/parametros/valor/editar', requireAdmin, (req, res) => {
    const { valorId, identificadorvalor, valor } = req.body;
    
    db.run('UPDATE parametrovalor SET identificadorvalor = ?, valor = ? WHERE id_parametrovalor = ?',
           [identificadorvalor, valor, valorId], function(err) {
        if (err) {
            console.error('Erro ao editar valor:', err);
            return res.json({ success: false, message: 'Erro ao editar valor' });
        }
        
        res.json({ success: true, message: 'Valor editado com sucesso!' });
    });
});

// Rota para excluir valor de parâmetro (POST)
app.post('/admin/parametros/valor/excluir', requireAdmin, (req, res) => {
    const { id_parametrovalor } = req.body;
    
    db.run('DELETE FROM parametrovalor WHERE id_parametrovalor = ?', [id_parametrovalor], function(err) {
        if (err) {
            console.error('Erro ao excluir valor:', err);
            return res.json({ success: false, message: 'Erro ao excluir valor' });
        }
        
        res.json({ success: true, message: 'Valor excluído com sucesso!' });
    });
});

// Rota para excluir valor de parâmetro (DELETE - mantida para compatibilidade)
app.delete('/admin/parametros/valor/:id/excluir', requireAdmin, (req, res) => {
    const valorId = req.params.id;
    
    db.run('DELETE FROM parametrovalor WHERE id_parametrovalor = ?', [valorId], function(err) {
        if (err) {
            console.error('Erro ao excluir valor:', err);
            return res.json({ success: false, message: 'Erro ao excluir valor' });
        }
        
        res.json({ success: true, message: 'Valor excluído com sucesso!' });
    });
});

// Rota para excluir parâmetro
app.delete('/admin/parametros/:id/excluir', requireAdmin, (req, res) => {
    const parametroId = req.params.id;
    
    // Primeiro excluir os valores
    db.run('DELETE FROM parametrovalor WHERE id_parametro = ?', [parametroId], function(err) {
        if (err) {
            console.error('Erro ao excluir valores do parâmetro:', err);
            return res.json({ success: false, message: 'Erro ao excluir valores do parâmetro' });
        }
        
        // Depois excluir o parâmetro
        db.run('DELETE FROM parametro WHERE id_parametro = ?', [parametroId], function(err) {
            if (err) {
                console.error('Erro ao excluir parâmetro:', err);
                return res.json({ success: false, message: 'Erro ao excluir parâmetro' });
            }
            
            res.json({ success: true, message: 'Parâmetro excluído com sucesso!' });
        });
    });
});

// Rota removida - tabela estagiarios foi excluída

// Função para converter data brasileira (dd/mm/aaaa) para formato ISO (aaaa-mm-dd)
function convertBRDateToISO(brDate) {
    if (!brDate || brDate.trim() === '') return null;
    
    // Remove espaços e caracteres não numéricos exceto /
    const cleanDate = brDate.trim().replace(/[^0-9\/]/g, '');
    
    const parts = cleanDate.split('/');
    if (parts.length !== 3) return null;
    
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    
    // Validação básica
    if (day.length !== 2 || month.length !== 2 || year.length !== 4) return null;
    if (parseInt(day) < 1 || parseInt(day) > 31) return null;
    if (parseInt(month) < 1 || parseInt(month) > 12) return null;
    if (parseInt(year) < 1900 || parseInt(year) > 2100) return null;
    
    return `${year}-${month}-${day}`;
}

// Função para converter data do formato ISO (aaaa-mm-dd) para formato brasileiro (dd/mm/aaaa)
function convertISOToBRDate(isoDate) {
    if (!isoDate) return '';
    
    // Parse manual para evitar problemas de timezone
    const parts = isoDate.split('-');
    if (parts.length !== 3) return '';
    
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];
    
    return `${day}/${month}/${year}`;
}

// Rota /plano/salvar removida - referenciava tabela estagiarios que foi deletada
// Sistema agora usa pessoa/pessoa_login para autenticação

// Rota /plano/editar removida - referenciava tabela estagiarios que foi deletada
// Sistema agora usa pessoa/pessoa_login para autenticação

// Rota /plano/atualizar removida - referenciava tabela estagiarios que foi deletada
// Sistema agora usa pessoa/pessoa_login para autenticação

// Gerar PDF do plano (estagiário)
// Rota /plano/pdf removida - referenciava tabela estagiarios que foi deletada
// Sistema agora usa pessoa/pessoa_login para autenticação

// Excluir plano (estagiário)
app.post('/plano/excluir', requireAuth, (req, res) => {
    console.log('Rota /plano/excluir chamada pelo usuário:', req.session.user.nome);
    
    if (req.session.user.matricula === 'coordenador') {
        return res.redirect('/admin/rotinas');
    }
    
    console.log('Tentando excluir plano do estagiário ID:', req.session.user.id);
    
    db.run('DELETE FROM planos_atividade WHERE estagiario_id = ?', [req.session.user.id], (err) => {
        if (err) {
            console.error('Erro ao excluir plano:', err);
            return res.status(500).send('Erro ao excluir plano');
        }
        console.log('Plano excluído com sucesso para estagiário ID:', req.session.user.id);
        res.redirect('/dashboard');
    });
});

// Rota /admin/importar removida - referenciava tabela estagiarios que foi deletada
// Sistema agora usa pessoa/pessoa_login para autenticação

// Visualizar plano (admin)
// Rota removida - tabela estagiarios foi excluída

// Rota removida - tabela estagiarios foi excluída

// Rota removida - tabela estagiarios foi excluída

// Rota removida - tabela estagiarios foi excluída

// Rota removida - tabela estagiarios foi excluída

// Rota removida - tabela estagiarios foi excluída

// Rota para baixar planilha modelo


// Alterar senha
app.get('/alterar-senha', requireAuth, (req, res) => {
    const primeiroLogin = req.query.primeiro_login === 'true' || req.session.primeiro_login;
    res.render('alterar-senha', { 
        title: 'Alterar Senha - Sistema de Gestão de Estágio', 
        user: req.session.user, 
        error: null, 
        success: null,
        primeiroLogin: primeiroLogin
    });
});

app.post('/alterar-senha', requireAuth, (req, res) => {
    const { senhaAtual, novaSenha, confirmarSenha } = req.body;
    const primeiroLogin = req.session.primeiro_login;

    if (novaSenha !== confirmarSenha) {
        return res.render('alterar-senha', { 
            title: 'Alterar Senha - Sistema de Gestão de Estágio', 
            user: req.session.user, 
            error: 'As senhas não coincidem', 
            success: null,
            primeiroLogin: primeiroLogin
        });
    }

    // Para primeiro login, verificar se a senha atual é a matrícula
    if (primeiroLogin) {
        if (senhaAtual !== req.session.user.matricula) {
            return res.render('alterar-senha', { 
                title: 'Alterar Senha - Sistema de Gestão de Estágio', 
                user: req.session.user, 
                error: 'Senha atual incorreta', 
                success: null,
                primeiroLogin: primeiroLogin
            });
        }
        
        const novaSenhaHash = bcrypt.hashSync(novaSenha, 10);
        db.run("UPDATE pessoa_login SET senha = ?, primeiro_login = 0 WHERE id_pessoa = ?", [novaSenhaHash, req.session.user.id_pessoa], (err) => {
            if (err) {
                return res.render('alterar-senha', { 
                    title: 'Alterar Senha - Sistema de Gestão de Estágio', 
                    user: req.session.user, 
                    error: 'Erro ao alterar senha', 
                    success: null,
                    primeiroLogin: primeiroLogin
                });
            }

            req.session.user.senha = novaSenhaHash;
            req.session.user.primeiro_login = 0;
            req.session.primeiro_login = false;
            res.redirect('/dashboard');
        });
    } else {
        // Login normal - verificar com bcrypt
        bcrypt.compare(senhaAtual, req.session.user.senha, (err, result) => {
            if (!result) {
                return res.render('alterar-senha', { 
                    title: 'Alterar Senha - Sistema de Gestão de Estágio', 
                    user: req.session.user, 
                    error: 'Senha atual incorreta', 
                    success: null,
                    primeiroLogin: primeiroLogin
                });
            }

            const novaSenhaHash = bcrypt.hashSync(novaSenha, 10);
            db.run("UPDATE pessoa_login SET senha = ? WHERE id_pessoa = ?", [novaSenhaHash, req.session.user.id_pessoa], (err) => {
                if (err) {
                    return res.render('alterar-senha', { 
                        title: 'Alterar Senha - Sistema de Gestão de Estágio', 
                        user: req.session.user, 
                        error: 'Erro ao alterar senha', 
                        success: null,
                        primeiroLogin: primeiroLogin
                    });
                }

                req.session.user.senha = novaSenhaHash;
                res.render('alterar-senha', { 
                    title: 'Alterar Senha - Sistema de Gestão de Estágio', 
                    user: req.session.user, 
                    error: null, 
                    success: 'Senha alterada com sucesso!',
                    primeiroLogin: primeiroLogin
                });
            });
        });
    }
});

// Rota para alterar senha de usuário (admin)
app.post('/admin/alterar-senha', requireAdmin, (req, res) => {
    console.log('DEBUG - Dados recebidos no servidor:', req.body);
    const { email, novaSenha } = req.body;
    
    console.log('DEBUG - Tentativa de alterar senha:', { email, novaSenhaLength: novaSenha?.length });
    
    if (!email || !novaSenha) {
        console.log('DEBUG - Dados incompletos recebidos');
        return res.json({ success: false, message: 'Dados incompletos' });
    }
    
    if (novaSenha.length < 4) {
        return res.json({ success: false, message: 'A senha deve ter pelo menos 4 caracteres' });
    }
    
    // Primeiro, buscar o usuário pelo email
    console.log('DEBUG - Buscando usuário por email:', email);
    db.get('SELECT p.id_pessoa, p.nome FROM pessoa p WHERE p.email = ?', [email], (err, pessoa) => {
        if (err) {
            console.error('Erro ao buscar usuário:', err);
            return res.json({ success: false, message: 'Erro interno do servidor' });
        }
        
        console.log('DEBUG - Usuário encontrado:', pessoa);
        if (!pessoa) {
            console.log('DEBUG - Nenhum usuário encontrado com email:', email);
            return res.json({ success: false, message: 'Usuário não encontrado com este e-mail' });
        }
        
        // Verificar se o usuário tem login
        db.get('SELECT id_pessoa FROM pessoa_login WHERE id_pessoa = ?', [pessoa.id_pessoa], (err, login) => {
            if (err) {
                console.error('Erro ao verificar login:', err);
                return res.json({ success: false, message: 'Erro interno do servidor' });
            }
            
            const novaSenhaHash = bcrypt.hashSync(novaSenha, 10);
            
            if (login) {
                // Atualizar senha existente
                console.log('DEBUG - Atualizando senha existente para usuário:', pessoa.id_pessoa);
                db.run('UPDATE pessoa_login SET senha = ? WHERE id_pessoa = ?', [novaSenhaHash, pessoa.id_pessoa], function(err) {
                    if (err) {
                        console.error('Erro ao alterar senha:', err);
                        return res.json({ success: false, message: 'Erro interno do servidor' });
                    }
                    
                    console.log('DEBUG - Senha atualizada com sucesso para:', pessoa.nome);
                    res.json({ success: true, message: `Senha alterada com sucesso para ${pessoa.nome}` });
                });
            } else {
                // Criar novo login
                console.log('DEBUG - Criando novo login para usuário:', pessoa.id_pessoa);
                db.run('INSERT INTO pessoa_login (id_pessoa, senha, status) VALUES (?, ?, ?)', 
                    [pessoa.id_pessoa, novaSenhaHash, 'Ativo'], function(err) {
                    if (err) {
                        console.error('Erro ao criar login:', err);
                        return res.json({ success: false, message: 'Erro interno do servidor' });
                    }
                    
                    console.log('DEBUG - Login criado com sucesso para:', pessoa.nome);
                    res.json({ success: true, message: `Login criado e senha definida com sucesso para ${pessoa.nome}` });
                });
            }
        });
    });
});



// ===== CADASTRO DO CAMPO DE ESTÁGIO (ADMINISTRATIVO) =====
// NOTA: Esta seção gerencia os dados da nova tabela campo_estagio

// Rotas para operações CRUD da tabela campo_estagio
app.post('/admin/campo-estagio/criar', requireAdmin, (req, res) => {
    console.log('Dados recebidos para criar campo de estágio:', req.body);
    
    const {
        // IDs das pessoas
        id_pessoa_curso, id_pessoa_estagiario, id_pessoa_orientador, 
        id_pessoa_concedente, id_pessoa_supervisor,
        // Outros campos do formulário
        processo_sei, situacao, numero_apolice, nome_seguradora, semestre, ano,
        matricula_estagiario, email_estagiario, numero_convenio,
        telefone_supervisor, email_supervisor, area_atuacao_supervisor,
        tipo_estagio, carga_horaria_semanal, carga_horaria_total,
        data_inicio, data_fim, valor_bolsa, valor_vale_transporte,
        atividades, observacoes
    } = req.body;
    
    // Validação dos campos obrigatórios
    if (!id_pessoa_curso || !id_pessoa_estagiario || !id_pessoa_orientador || 
        !id_pessoa_concedente || !id_pessoa_supervisor) {
        return res.json({ success: false, message: 'Todos os campos de pessoa são obrigatórios' });
    }
    
    if (!processo_sei || !situacao || !semestre || !ano || !matricula_estagiario || 
        !email_estagiario || !tipo_estagio || !data_inicio || !data_fim) {
        return res.json({ success: false, message: 'Campos obrigatórios não preenchidos' });
    }
    
    // Montar semestre_ano
    const semestre_ano = `${semestre}/${ano}`;
    
    const sql = `INSERT INTO campo_estagio (
        id_pessoa_curso, id_pessoa_estagiario, id_pessoa_orientador, 
        id_pessoa_concedente, id_pessoa_supervisor, tipo_estagio, 
        semestre_ano, apolice_seguro, nome_seguradora, numero_processosei,
        numero_matricula, numero_convenio, supervisor_areaformacao,
        data_inicio, data_fim, cargahoraria, valor_bolsa, valor_valetransporte, 
        observacoes, situacao
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    db.run(sql, [
        id_pessoa_curso, id_pessoa_estagiario, id_pessoa_orientador,
        id_pessoa_concedente, id_pessoa_supervisor, tipo_estagio,
        semestre_ano, numero_apolice, nome_seguradora, processo_sei,
        matricula_estagiario, numero_convenio, area_atuacao_supervisor,
        data_inicio, data_fim, carga_horaria_semanal, valor_bolsa, valor_vale_transporte,
        observacoes, situacao
    ], function(err) {
        if (err) {
            console.error('Erro ao criar campo de estágio:', err);
            return res.json({ success: false, message: 'Erro ao salvar dados: ' + err.message });
        }
        
        console.log('Campo de estágio criado com ID:', this.lastID);
        res.json({ success: true, id: this.lastID, message: 'Campo de estágio cadastrado com sucesso!' });
    });
});

app.post('/admin/campo-estagio/:id/editar', requireAdmin, (req, res) => {
    const id = req.params.id;
    console.log('Dados recebidos para editar campo de estágio:', req.body);
    
    const {
        numero_matricula, tipo_estagio, semestre_ano, fase, apolice_seguro,
        nome_seguradora, numero_processosei, numero_convenio, supervisor_areaformacao,
        unidade_academica, data_inicio, data_fim, cargahoraria, valor_bolsa,
        valor_valetransporte, observacoes
    } = req.body;
    
    // Converter datas do formato brasileiro para ISO se fornecidas
    const dataInicioISO = data_inicio ? convertBRDateToISO(data_inicio) : null;
    const dataFimISO = data_fim ? convertBRDateToISO(data_fim) : null;
    
    const sql = `UPDATE campo_estagio SET
        numero_matricula = ?, tipo_estagio = ?, semestre_ano = ?, fase = ?, apolice_seguro = ?,
        nome_seguradora = ?, numero_processosei = ?, numero_convenio = ?, supervisor_areaformacao = ?,
        unidade_academica = ?, data_inicio = ?, data_fim = ?, cargahoraria = ?, valor_bolsa = ?,
        valor_valetransporte = ?, observacoes = ?
        WHERE id = ?`;
    
    db.run(sql, [
        numero_matricula, tipo_estagio, semestre_ano, fase, apolice_seguro,
        nome_seguradora, numero_processosei, numero_convenio, supervisor_areaformacao,
        unidade_academica, dataInicioISO, dataFimISO, cargahoraria, valor_bolsa,
        valor_valetransporte, observacoes, id
    ], function(err) {
        if (err) {
            console.error('Erro ao editar campo de estágio:', err);
            return res.json({ success: false, message: 'Erro ao salvar dados' });
        }
        
        if (this.changes === 0) {
            return res.json({ success: false, message: 'Campo de estágio não encontrado' });
        }
        
        console.log('Campo de estágio editado com sucesso');
        res.json({ success: true });
    });
});

app.delete('/admin/campo-estagio/:id', requireAdmin, (req, res) => {
    const id = req.params.id;
    
    db.run('DELETE FROM campo_estagio WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('Erro ao excluir campo de estágio:', err);
            return res.json({ success: false, message: 'Erro ao excluir campo de estágio' });
        }
        
        if (this.changes === 0) {
            return res.json({ success: false, message: 'Campo de estágio não encontrado' });
        }
        
        console.log('Campo de estágio excluído com sucesso');
        res.json({ success: true });
    });
});





// Função para gerar PDF do relatório
async function generateRelatorioPDF(relatorio) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Relatório de Estágio</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.4; }
            .header { text-align: center; margin-bottom: 30px; }
            .title { font-size: 18px; font-weight: bold; margin-bottom: 20px; }
            .section { margin-bottom: 20px; }
            .field { margin-bottom: 10px; }
            .label { font-weight: bold; }
            .checkbox { display: inline-block; margin-right: 20px; }
            .signature-area { margin-top: 40px; }
            .signature-line { border-bottom: 1px solid #000; width: 300px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="header">
            <h2>UNIVERSIDADE FEDERAL DE JATAÍ</h2>
            <h3>CURSO DE CIÊNCIA DA COMPUTAÇÃO</h3>
            <div class="title">RELATÓRIO DE ESTÁGIO CURRICULAR OBRIGATÓRIO</div>
        </div>
        
        <div class="section">
            <div class="checkbox">
                <input type="checkbox" ${relatorio.tipo === 'PARCIAL' ? 'checked' : ''}> PARCIAL
            </div>
            <div class="checkbox">
                <input type="checkbox" ${relatorio.tipo === 'FINAL' ? 'checked' : ''}> FINAL
            </div>
        </div>
        
        <div class="section">
            <div class="field"><span class="label">Discente:</span> ${relatorio.discente || ''}</div>
            <div class="field"><span class="label">Nº Matrícula:</span> ${relatorio.matricula || ''}</div>
            <div class="field"><span class="label">Curso:</span> ${relatorio.curso || ''}</div>
            <div class="field"><span class="label">Local do Estágio (Concedente):</span> ${relatorio.local_estagio || ''}</div>
            <div class="field"><span class="label">Carga horária semanal:</span> ${relatorio.carga_horaria_semanal || ''} horas</div>
        </div>
        
        <div class="section">
            <div class="label">ATIVIDADES DESENVOLVIDAS</div>
            <p>Descrever todas as atividades desenvolvidas durante o período do Estágio Curricular Obrigatório. As atividades podem ser descritas em tópicos.</p>
            <div style="white-space: pre-wrap; border: 1px solid #ccc; padding: 10px; min-height: 100px;">${relatorio.atividades_desenvolvidas || ''}</div>
        </div>
        
        <div class="section">
            <div class="label">Dificuldades encontradas</div>
            <p>Com base nas atividades realizadas, descreva as dificuldades encontradas</p>
            <div style="white-space: pre-wrap; border: 1px solid #ccc; padding: 10px; min-height: 80px;">${relatorio.dificuldades_encontradas || ''}</div>
        </div>
        
        <div class="section">
            <div class="field">
                <span class="label">Condições oferecidas pela concedente para a realização do estágio é:</span><br>
                <div class="checkbox">
                    <input type="checkbox" ${relatorio.condicoes_concedente === 'Satisfatória' ? 'checked' : ''}> Satisfatória
                </div>
                <div class="checkbox">
                    <input type="checkbox" ${relatorio.condicoes_concedente === 'Insatisfatória' ? 'checked' : ''}> Insatisfatória
                </div>
            </div>
        </div>
        
        <div class="section">
            <div class="field">
                <span class="label">Acompanhamento realizado pelo supervisor foi:</span><br>
                <div class="checkbox">
                    <input type="checkbox" ${relatorio.acompanhamento_supervisor === 'Satisfatório' ? 'checked' : ''}> Satisfatório
                </div>
                <div class="checkbox">
                    <input type="checkbox" ${relatorio.acompanhamento_supervisor === 'Insatisfatório' ? 'checked' : ''}> Insatisfatório
                </div>
            </div>
        </div>
        
        <div class="section">
            <div class="field">
                <span class="label">O estágio contribuiu para agregar conhecimentos e habilidades à sua formação:</span><br>
                <div class="checkbox">
                    <input type="checkbox" ${relatorio.contribuicao_formacao === 'Sim' ? 'checked' : ''}> Sim
                </div>
                <div class="checkbox">
                    <input type="checkbox" ${relatorio.contribuicao_formacao === 'Não' ? 'checked' : ''}> Não
                </div>
            </div>
        </div>
        
        <div class="section">
            <div class="field"><span class="label">Duração do estágio</span></div>
            <div class="field">INÍCIO: ${relatorio.data_inicio_estagio ? convertISOToBRDate(relatorio.data_inicio_estagio) : '___/____/____'} (dia, mês, ano)</div>
            <div class="field">TÉRMINO: ${relatorio.data_termino_estagio ? convertISOToBRDate(relatorio.data_termino_estagio) : '___/____/____'} (dia, mês, ano)</div>
        </div>
        
        <div class="section">
            <div class="field"><span class="label">Período do Relatório</span></div>
            <div class="field">INÍCIO: ${relatorio.data_inicio_periodo ? convertISOToBRDate(relatorio.data_inicio_periodo) : '___/____/____'} (dia, mês, ano)</div>
            <div class="field">TÉRMINO: ${relatorio.data_termino_periodo ? convertISOToBRDate(relatorio.data_termino_periodo) : '___/____/____'} (dia, mês, ano)</div>
        </div>
        
        ${relatorio.tipo === 'FINAL' ? `
        <div class="section">
            <div class="checkbox">
                <input type="checkbox" ${relatorio.status_aprovacao === 'Aprovado' ? 'checked' : ''}> Aprovado
            </div>
            <div class="checkbox">
                <input type="checkbox" ${relatorio.status_aprovacao === 'Reprovado' ? 'checked' : ''}> Reprovado
            </div>
            <p><em>(preenchido pelo coordenador de Estágio só quando tratar de Relatório Final)</em></p>
        </div>
        ` : ''}
        
        <div class="signature-area">
            <p>O relatório deve ser assinado pelo discente, professor orientador, supervisor e coordenador de Estágio.</p>
            <div style="display: flex; justify-content: space-between; margin-top: 40px;">
                <div style="text-align: center;">
                    <div class="signature-line"></div>
                    <p>Discente</p>
                </div>
                <div style="text-align: center;">
                    <div class="signature-line"></div>
                    <p>Professor Orientador</p>
                </div>
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 20px;">
                <div style="text-align: center;">
                    <div class="signature-line"></div>
                    <p>Supervisor</p>
                </div>
                <div style="text-align: center;">
                    <div class="signature-line"></div>
                    <p>Coordenador de Estágio</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
    
    await page.setContent(html);
    const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: {
            top: '20mm',
            right: '20mm',
            bottom: '20mm',
            left: '20mm'
        }
    });
    
    await browser.close();
    return pdfBuffer;
}

// Função para gerar PDF
async function generatePDF(data) {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; margin: 25px; line-height: 1.4; font-size: 12px; }
            .header { text-align: center; margin-bottom: 20px; }
            .title { font-size: 14px; font-weight: bold; margin-bottom: 5px; }
            .subtitle { font-size: 12px; color: #333; }
            .section { margin-bottom: 15px; }
            .section-title { font-size: 12px; font-weight: bold; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 3px; margin-bottom: 8px; }
            .field { margin-bottom: 6px; }
            .field-label { font-weight: bold; display: inline-block; width: 120px; font-size: 11px; }
            .field-value { display: inline-block; font-size: 11px; }
            .textarea-field { margin-top: 8px; }
            .textarea-label { font-weight: bold; margin-bottom: 4px; font-size: 11px; }
            .textarea-value { border: 1px solid #ddd; padding: 8px; min-height: 60px; font-size: 11px; }
            .signatures { margin-top: 30px; page-break-inside: avoid; }
            .signature-section { display: flex; justify-content: space-between; margin-top: 25px; }
            .signature-box { text-align: center; width: 30%; }
            .signature-line { border-bottom: 1px solid #333; margin-bottom: 4px; height: 35px; }
            .signature-label { font-size: 8px; color: #666; }
             .signature-info { font-size: 10px; margin-top: 3px; text-align: center; }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="title">UNIVERSIDADE FEDERAL DE JATAÍ</div>
            <div class="title">CURSO DE CIÊNCIA DA COMPUTAÇÃO</div>
            <div class="subtitle">PLANO DE ATIVIDADES DE ESTÁGIO</div>
        </div>
        
        <div class="section">
            <div class="section-title">DADOS DO ESTAGIÁRIO</div>
            <div class="field">
                <span class="field-label">Nome:</span>
                <span class="field-value">${data.nome}</span>
            </div>
            <div class="field">
                <span class="field-label">Matrícula:</span>
                <span class="field-value">${data.matricula}</span>
            </div>
            <div class="field">
                <span class="field-label">E-mail:</span>
                <span class="field-value">${data.email}</span>
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">DADOS DA EMPRESA</div>
            <div class="field">
                <span class="field-label">Empresa:</span>
                <span class="field-value">${data.empresa}</span>
            </div>
            <div class="field">
                <span class="field-label">Supervisor:</span>
                <span class="field-value">${data.supervisor_empresa}</span>
            </div>
            <div class="field">
                <span class="field-label">Telefone:</span>
                <span class="field-value">${data.telefone_supervisor || 'Não informado'}</span>
            </div>
            <div class="field">
                <span class="field-label">E-mail:</span>
                <span class="field-value">${data.email_supervisor || 'Não informado'}</span>
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">PERÍODO E CARGA HORÁRIA</div>
            <div class="field">
                <span class="field-label">Período:</span>
                <span class="field-value">${convertISOToBRDate(data.periodo_inicio)} a ${convertISOToBRDate(data.periodo_fim)}</span>
            </div>
            <div class="field">
                <span class="field-label">Carga Horária:</span>
                <span class="field-value">${data.carga_horaria_semanal} horas semanais</span>
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">ATIVIDADES E OBJETIVOS</div>
            <div class="textarea-field">
                <div class="textarea-label">Atividades a serem desenvolvidas:</div>
                <div class="textarea-value">${data.atividades_desenvolvidas}</div>
            </div>
            <div class="textarea-field">
                <div class="textarea-label">Objetivos do estágio:</div>
                <div class="textarea-value">${data.objetivos}</div>
            </div>
            ${data.cronograma ? `
            <div class="textarea-field">
                <div class="textarea-label">Cronograma:</div>
                <div class="textarea-value">${data.cronograma}</div>
            </div>` : ''}
            ${data.recursos_necessarios ? `
            <div class="textarea-field">
                <div class="textarea-label">Recursos necessários:</div>
                <div class="textarea-value">${data.recursos_necessarios}</div>
            </div>` : ''}
        </div>
        
        <!-- Seção de Assinaturas -->
        <div class="signatures">
            <div class="signature-section">
                <div class="signature-box">
                    <div class="signature-line"></div>
                    <div class="signature-info">
                        <strong>${data.nome}</strong><br>
                        <span class="signature-label">Estagiário(a) - Mat.: ${data.matricula}</span>
                    </div>
                </div>
                
                <div class="signature-box">
                    <div class="signature-line"></div>
                    <div class="signature-info">
                        <strong>${data.supervisor_empresa || 'Nome do Supervisor'}</strong><br>
                        <span class="signature-label">Supervisor da Empresa - ${data.empresa || 'Nome da Empresa'}</span>
                    </div>
                </div>
                
                <div class="signature-box">
                    <div class="signature-line"></div>
                    <div class="signature-info">
                        <strong>Prof. [Nome do Orientador]</strong><br>
                        <span class="signature-label">Orientador Acadêmico - UFJ</span>
                    </div>
                </div>
            </div>
            
            <div style="margin-top: 20px; text-align: center; font-size: 9px; color: #666;">
                <p>
                    Este documento deve ser assinado por todas as partes envolvidas no estágio.<br>
                    Após assinado, anexar o PDF no Sistema de Gestão de Estágio.
                </p>
            </div>
        </div>
        
        <div style="margin-top: 20px; text-align: center; font-size: 10px; color: #999;">
            Documento gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
        </div>
    </body>
    </html>
    `;
    
    await page.setContent(html);
    const pdf = await page.pdf({
        format: 'A4',
        margin: {
            top: '10mm',
            right: '10mm',
            bottom: '10mm',
            left: '10mm'
        }
    });
    
    await browser.close();
    return pdf;
}

// ===== ROTAS PARA GERENCIAMENTO DE PESSOAS =====

// Buscar pessoas por nome ou email com paginação
app.get('/api/pessoas/buscar', requireAdmin, (req, res) => {
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

// Criar nova pessoa
app.post('/api/pessoas/criar', requireAdmin, (req, res) => {
    const { nome, email, telefone, cnpj_cpf, tipo, categoria } = req.body;
    
    // Validação dos campos obrigatórios
    if (!nome || !tipo) {
        return res.json({ success: false, message: 'Nome e tipo são obrigatórios' });
    }
    
    if (!email || email.trim() === '') {
        return res.json({ success: false, message: 'Email é obrigatório' });
    }
    
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

// Obter dados de uma pessoa específica
app.get('/api/pessoas/:id', requireAdmin, (req, res) => {
    const id = req.params.id;
    
    db.get('SELECT * FROM pessoa WHERE id_pessoa = ?', [id], (err, pessoa) => {
        if (err) {
            console.error('Erro ao buscar pessoa:', err);
            return res.json({ success: false, message: 'Erro ao buscar pessoa' });
        }
        
        if (!pessoa) {
            return res.json({ success: false, message: 'Pessoa não encontrada' });
        }
        
        res.json({ success: true, pessoa: pessoa });
    });
});

// Editar pessoa
app.put('/api/pessoas/:id', requireAdmin, (req, res) => {
    const id = req.params.id;
    const { nome, email, telefone, cnpj_cpf, tipo, categoria } = req.body;
    
    // Validação dos campos obrigatórios
    if (!nome || !tipo) {
        return res.json({ success: false, message: 'Nome e tipo são obrigatórios' });
    }
    
    // Verificar se a pessoa existe
    db.get('SELECT id_pessoa FROM pessoa WHERE id_pessoa = ?', [id], (err, pessoa) => {
        if (err) {
            console.error('Erro ao verificar pessoa:', err);
            return res.json({ success: false, message: 'Erro ao verificar dados' });
        }
        
        if (!pessoa) {
            return res.json({ success: false, message: 'Pessoa não encontrada' });
        }
        
        // Verificar se já existe outra pessoa com mesmo email
        db.get('SELECT id_pessoa FROM pessoa WHERE email = ? AND id_pessoa != ?', [email, id], (err, existingPerson) => {
            if (err) {
                console.error('Erro ao verificar email:', err);
                return res.json({ success: false, message: 'Erro ao verificar dados' });
            }
            
            if (existingPerson) {
                return res.json({ success: false, message: 'Já existe uma pessoa cadastrada com este email' });
            }
            
            // Atualizar pessoa
            updatePessoa();
        });
        
        function updatePessoa() {
            const sql = `UPDATE pessoa SET nome = ?, email = ?, telefone = ?, cnpj_cpf = ?, tipo = ?, categoria = ? WHERE id_pessoa = ?`;
            
            db.run(sql, [nome, email, telefone, cnpj_cpf, tipo, categoria, id], function(err) {
                if (err) {
                    console.error('Erro ao atualizar pessoa:', err);
                    return res.json({ success: false, message: 'Erro ao atualizar pessoa' });
                }
                
                // Buscar a pessoa atualizada para retornar os dados completos
                db.get('SELECT * FROM pessoa WHERE id_pessoa = ?', [id], (err, pessoaAtualizada) => {
                    if (err) {
                        console.error('Erro ao buscar pessoa atualizada:', err);
                        return res.json({ success: false, message: 'Pessoa atualizada, mas erro ao recuperar dados' });
                    }
                    
                    res.json({ success: true, pessoa: pessoaAtualizada, message: 'Pessoa atualizada com sucesso!' });
                });
            });
        }
    });
});

// Excluir pessoa
app.delete('/api/pessoas/:id', requireAdmin, (req, res) => {
    const id = req.params.id;
    
    // Verificar se a pessoa existe
    db.get('SELECT id_pessoa, nome FROM pessoa WHERE id_pessoa = ?', [id], (err, pessoa) => {
        if (err) {
            console.error('Erro ao verificar pessoa:', err);
            return res.json({ success: false, message: 'Erro ao verificar dados' });
        }
        
        if (!pessoa) {
            return res.json({ success: false, message: 'Pessoa não encontrada' });
        }
        
        // Verificar se a pessoa está sendo usada em algum campo de estágio
        const checkUsageQueries = [
            'SELECT COUNT(*) as count FROM campo_estagio WHERE id_pessoa_estagiario = ?',
            'SELECT COUNT(*) as count FROM campo_estagio WHERE id_pessoa_orientador = ?',
            'SELECT COUNT(*) as count FROM campo_estagio WHERE id_pessoa_supervisor = ?',
            'SELECT COUNT(*) as count FROM campo_estagio WHERE id_pessoa_concedente = ?'
        ];
        
        let checksCompleted = 0;
        let isInUse = false;
        
        checkUsageQueries.forEach(query => {
            db.get(query, [id], (err, result) => {
                if (err) {
                    console.error('Erro ao verificar uso da pessoa:', err);
                    return res.json({ success: false, message: 'Erro ao verificar se pessoa pode ser excluída' });
                }
                
                if (result.count > 0) {
                    isInUse = true;
                }
                
                checksCompleted++;
                
                if (checksCompleted === checkUsageQueries.length) {
                    if (isInUse) {
                        return res.json({ 
                            success: false, 
                            message: 'Esta pessoa não pode ser excluída pois está sendo utilizada em campos de estágio' 
                        });
                    }
                    
                    // Excluir pessoa
                    db.run('DELETE FROM pessoa WHERE id_pessoa = ?', [id], function(err) {
                        if (err) {
                            console.error('Erro ao excluir pessoa:', err);
                            return res.json({ success: false, message: 'Erro ao excluir pessoa' });
                        }
                        
                        res.json({ success: true, message: `Pessoa "${pessoa.nome}" excluída com sucesso!` });
                    });
                }
            });
        });
    });
});

// Rota para importar pessoas via planilha
app.post('/api/pessoas/importar', requireAdmin, (req, res) => {
    const { pessoas, substituirDuplicados } = req.body;
    
    if (!pessoas || !Array.isArray(pessoas) || pessoas.length === 0) {
        return res.json({ success: false, message: 'Nenhum dado válido para importar' });
    }
    
    let pessoasImportadas = 0;
    let pessoasAtualizadas = 0;
    let erros = [];
    let processadas = 0;
    
    const processarPessoa = (pessoa, index) => {
        return new Promise((resolve) => {
            // Verificar se já existe pessoa com o mesmo email
            db.get('SELECT id_pessoa FROM pessoa WHERE email = ?', [pessoa.email], (err, pessoaExistente) => {
                if (err) {
                    erros.push(`Linha ${index + 1}: Erro ao verificar email duplicado`);
                    return resolve();
                }
                
                if (pessoaExistente && !substituirDuplicados) {
                    erros.push(`Linha ${index + 1}: Email ${pessoa.email} já existe no sistema`);
                    return resolve();
                }
                
                if (pessoaExistente && substituirDuplicados) {
                    // Atualizar pessoa existente
                    const sql = `UPDATE pessoa SET nome = ?, telefone = ?, cnpj_cpf = ?, tipo = ?, categoria = ? WHERE id_pessoa = ?`;
                    
                    db.run(sql, [
                        pessoa.nome,
                        pessoa.telefone || null,
                        pessoa.cnpj_cpf || null,
                        pessoa.tipo,
                        pessoa.categoria,
                        pessoaExistente.id_pessoa
                    ], function(err) {
                        if (err) {
                            console.error('Erro ao atualizar pessoa:', err);
                            erros.push(`Linha ${index + 1}: Erro ao atualizar pessoa`);
                        } else {
                            pessoasAtualizadas++;
                        }
                        resolve();
                    });
                } else {
                    // Criar nova pessoa
                    const sql = `INSERT INTO pessoa (nome, email, telefone, cnpj_cpf, tipo, categoria, dataCadastro) 
                                 VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`;
                    
                    db.run(sql, [
                        pessoa.nome,
                        pessoa.email,
                        pessoa.telefone || null,
                        pessoa.cnpj_cpf || null,
                        pessoa.tipo,
                        pessoa.categoria
                    ], function(err) {
                        if (err) {
                            console.error('Erro ao criar pessoa:', err);
                            erros.push(`Linha ${index + 1}: Erro ao criar pessoa`);
                        } else {
                            pessoasImportadas++;
                        }
                        resolve();
                    });
                }
            });
        });
    };
    
    // Processar todas as pessoas
    const promessas = pessoas.map((pessoa, index) => processarPessoa(pessoa, index));
    
    Promise.all(promessas).then(() => {
        const totalProcessadas = pessoasImportadas + pessoasAtualizadas;
        let mensagem = '';
        let detalhes = '';
        
        if (totalProcessadas > 0) {
            mensagem = `Importação concluída com sucesso!`;
            detalhes = `${pessoasImportadas} pessoas criadas, ${pessoasAtualizadas} pessoas atualizadas`;
            
            if (erros.length > 0) {
                detalhes += `. ${erros.length} erros encontrados.`;
            }
        } else {
            mensagem = 'Nenhuma pessoa foi importada.';
            if (erros.length > 0) {
                detalhes = `Erros encontrados: ${erros.slice(0, 5).join('; ')}`;
                if (erros.length > 5) {
                    detalhes += ` e mais ${erros.length - 5} erros...`;
                }
            }
        }
        
        res.json({
            success: totalProcessadas > 0,
            message: mensagem,
            detalhes: detalhes,
            estatisticas: {
                importadas: pessoasImportadas,
                atualizadas: pessoasAtualizadas,
                erros: erros.length,
                total: pessoas.length
            }
        });
    }).catch(error => {
        console.error('Erro no processamento:', error);
        res.json({ success: false, message: 'Erro interno no processamento da importação' });
    });
});

// Rotas para as páginas de cadastro de pessoa

// ===== ROTAS PARA MÓDULOS E USUÁRIOS =====

// Listar usuários com login
// Rota para buscar usuários com módulos ativos (para desvinculação)
app.get('/admin/usuarios', requireAdmin, (req, res) => {
    const query = `
        SELECT DISTINCT
            p.id_pessoa,
            p.nome,
            p.email,
            pl.status,
            pl.tipoacesso,
            pl.dataultimaatualizacao
        FROM pessoa p
        INNER JOIN pessoa_login pl ON p.id_pessoa = pl.id_pessoa
        ORDER BY p.nome
    `;
    
    db.all(query, (err, rows) => {
        if (err) {
            console.error('Erro ao buscar usuários:', err);
            return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        res.json(rows);
    });
});

// Rota para buscar todos os usuários (para vinculação)
app.get('/admin/todos-usuarios', requireAdmin, (req, res) => {
    const query = `
        SELECT 
            p.id_pessoa,
            p.nome,
            p.email,
            pl.status,
            pl.tipoacesso,
            pl.dataultimaatualizacao
        FROM pessoa p
        INNER JOIN pessoa_login pl ON p.id_pessoa = pl.id_pessoa
        ORDER BY p.nome
    `;
    
    db.all(query, (err, rows) => {
        if (err) {
            console.error('Erro ao buscar todos os usuários:', err);
            return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        res.json(rows);
    });
});

// Listar pessoas sem login
app.get('/admin/pessoas-sem-login', requireAdmin, (req, res) => {
    const { busca } = req.query;
    
    let query = `
        SELECT p.id_pessoa, p.nome, p.email
        FROM pessoa p
        LEFT JOIN pessoa_login pl ON p.id_pessoa = pl.id_pessoa
        WHERE pl.id_pessoa IS NULL
    `;
    
    let params = [];
    
    // Se há termo de busca, adicionar filtro
    if (busca && busca.trim() !== '') {
        query += ` AND (p.nome LIKE ? OR p.email LIKE ?)`;
        params = [`%${busca}%`, `%${busca}%`];
    }
    
    query += ` ORDER BY p.nome LIMIT 20`;
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Erro ao buscar pessoas sem login:', err);
            return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        res.json(rows);
    });
});

// Criar login para uma pessoa
app.post('/admin/criar-login', requireAdmin, async (req, res) => {
    const { id_pessoa, senha, tipoacesso } = req.body;
    
    if (!id_pessoa || !senha || !tipoacesso) {
        return res.status(400).json({ error: 'ID da pessoa, senha e tipo de acesso são obrigatórios' });
    }
    
    // Validar tipo de acesso
    const tiposValidos = ['Visitante', 'Operacional', 'Administrador'];
    if (!tiposValidos.includes(tipoacesso)) {
        return res.status(400).json({ error: 'Tipo de acesso inválido' });
    }
    
    try {
        // Verificar se a pessoa existe
        const pessoa = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM pessoa WHERE id_pessoa = ?', [id_pessoa], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (!pessoa) {
            return res.status(404).json({ error: 'Pessoa não encontrada' });
        }
        
        // Verificar se já existe login
        const loginExistente = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM pessoa_login WHERE id_pessoa = ?', [id_pessoa], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (loginExistente) {
            return res.status(400).json({ error: 'Esta pessoa já possui login' });
        }
        
        // Criptografar senha
        const senhaHash = await bcrypt.hash(senha, 10);
        
        // Criar login
        const agora = new Date().toISOString();
        db.run(
            'INSERT INTO pessoa_login (id_pessoa, senha, status, dataultimaatualizacao, tipoacesso) VALUES (?, ?, ?, ?, ?)',
            [id_pessoa, senhaHash, 'Ativo', agora, tipoacesso],
            function(err) {
                if (err) {
                    console.error('Erro ao criar login:', err);
                    return res.status(500).json({ error: 'Erro ao criar login' });
                }
                res.json({ success: true, message: 'Login criado com sucesso' });
            }
        );
        
    } catch (error) {
        console.error('Erro ao criar login:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Desativar usuário
app.put('/admin/usuarios/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    const { status, tipoacesso } = req.body;
    
    // Validar status se fornecido
    if (status && !['Ativo', 'Inativo'].includes(status)) {
        return res.status(400).json({ error: 'Status inválido' });
    }
    
    // Validar tipoacesso se fornecido
    if (tipoacesso && !['Administrador', 'Operacional', 'Visitante'].includes(tipoacesso)) {
        return res.status(400).json({ error: 'Tipo de acesso inválido' });
    }
    
    const agora = new Date().toISOString();
    let query = 'UPDATE pessoa_login SET dataultimaatualizacao = ?';
    let params = [agora];
    
    if (status) {
        query += ', status = ?';
        params.push(status);
    }
    
    if (tipoacesso) {
        query += ', tipoacesso = ?';
        params.push(tipoacesso);
    }
    
    query += ' WHERE id_pessoa = ?';
    params.push(id);
    
    db.run(query, params, function(err) {
        if (err) {
            console.error('Erro ao atualizar usuário:', err);
            return res.status(500).json({ error: 'Erro ao atualizar usuário' });
        }
        res.json({ success: true, message: 'Usuário atualizado com sucesso' });
    });
});

// Listar módulos
app.get('/admin/modulos', requireAdmin, (req, res) => {
    db.all('SELECT * FROM modulos ORDER BY ordem, nome', (err, rows) => {
        if (err) {
            console.error('Erro ao buscar módulos:', err);
            return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        res.json(rows);
    });
});

// Criar módulo
app.post('/admin/modulos', requireAdmin, (req, res) => {
    const { nome, descricao, icone, cor, url, ordem } = req.body;
    
    if (!nome || !descricao) {
        return res.status(400).json({ error: 'Nome e descrição são obrigatórios' });
    }
    
    const agora = new Date().toISOString();
    db.run(
        'INSERT INTO modulos (nome, descricao, icone, cor, url, ordem, ativo, dataCadastro) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [nome, descricao, icone || 'fas fa-cube', cor || '#007bff', url || '#', ordem || 0, true, agora],
        function(err) {
            if (err) {
                console.error('Erro ao criar módulo:', err);
                return res.status(500).json({ error: 'Erro ao criar módulo' });
            }
            res.json({ success: true, message: 'Módulo criado com sucesso', id: this.lastID });
        }
    );
});

// Atualizar status do módulo
app.put('/admin/modulos/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    const { ativo } = req.body;
    
    db.run(
        'UPDATE modulos SET ativo = ? WHERE id_modulo = ?',
        [ativo, id],
        function(err) {
            if (err) {
                console.error('Erro ao atualizar módulo:', err);
                return res.status(500).json({ error: 'Erro ao atualizar módulo' });
            }
            res.json({ success: true, message: 'Módulo atualizado com sucesso' });
        }
    );
});

// Listar vínculos de um usuário
app.get('/admin/usuario-modulos/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    
    const query = `
        SELECT 
            m.id_modulo,
            m.nome as nome_modulo,
            m.icone,
            m.cor,
            COALESCE(um.ativo, 0) as ativo,
            um.dataCadastro
        FROM modulos m
        LEFT JOIN usuario_modulos um ON m.id_modulo = um.id_modulo AND um.id_pessoa = ?
        WHERE m.ativo = 1
        ORDER BY m.ordem, m.nome
    `;
    
    db.all(query, [id], (err, rows) => {
        if (err) {
            console.error('Erro ao buscar vínculos do usuário:', err);
            return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        res.json(rows);
    });
});

// Salvar vínculos de usuário
app.post('/admin/usuario-modulos', requireAdmin, (req, res) => {
    const { id_pessoa, vinculos } = req.body;
    
    if (!id_pessoa || !Array.isArray(vinculos)) {
        return res.status(400).json({ error: 'Dados inválidos' });
    }
    
    db.serialize(() => {
        // Remover vínculos existentes
        db.run('DELETE FROM usuario_modulos WHERE id_pessoa = ?', [id_pessoa]);
        
        // Inserir novos vínculos ativos
        const stmt = db.prepare('INSERT INTO usuario_modulos (id_pessoa, id_modulo, ativo, dataCadastro) VALUES (?, ?, ?, ?)');
        const agora = new Date().toISOString();
        
        vinculos.forEach(vinculo => {
            if (vinculo.ativo) {
                stmt.run(id_pessoa, vinculo.id_modulo, 1, agora);
            }
        });
        
        stmt.finalize((err) => {
            if (err) {
                console.error('Erro ao salvar vínculos:', err);
                return res.status(500).json({ error: 'Erro ao salvar vínculos' });
            }
            res.json({ success: true, message: 'Vínculos salvos com sucesso' });
        });
    });
});

// ===== NOVAS ROTAS PARA FUNCIONALIDADES MELHORADAS =====

// Buscar usuários dinamicamente
app.get('/admin/buscar-usuarios', requireAdmin, (req, res) => {
    const { termo } = req.query;
    
    if (!termo || termo.length < 2) {
        return res.json([]);
    }
    
    const query = `
        SELECT 
            p.id_pessoa,
            p.nome,
            p.email,
            pl.status
        FROM pessoa p
        INNER JOIN pessoa_login pl ON p.id_pessoa = pl.id_pessoa
        WHERE (p.nome LIKE ? OR p.email LIKE ?)
        ORDER BY p.nome
        LIMIT 10
    `;
    
    db.all(query, [`%${termo}%`, `%${termo}%`], (err, rows) => {
        if (err) {
            console.error('Erro ao buscar usuários:', err);
            return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        res.json(rows);
    });
});

// Vincular módulos em lote
app.post('/admin/vincular-modulos-lote', requireAdmin, async (req, res) => {
    const { usuarios, modulos } = req.body;
    
    console.log('=== DEBUG VINCULAR MÓDULOS LOTE ===');
    console.log('Dados recebidos:', { usuarios, modulos });
    
    if (!Array.isArray(usuarios) || !Array.isArray(modulos) || usuarios.length === 0 || modulos.length === 0) {
        console.log('ERRO: Dados inválidos');
        return res.status(400).json({ error: 'Dados inválidos: usuários e módulos são obrigatórios' });
    }
    
    const agora = new Date().toISOString();
    let vinculosCriados = 0;
    let erros = 0;
    
    console.log(`Iniciando processamento: ${usuarios.length} usuários x ${modulos.length} módulos`);
    
    try {
        // Usar Promise para aguardar todos os vínculos serem processados
        await new Promise((resolve, reject) => {
            db.serialize(() => {
                const stmt = db.prepare(`
                    INSERT OR REPLACE INTO usuario_modulos (id_pessoa, id_modulo, ativo, dataCadastro) 
                    VALUES (?, ?, 1, ?)
                `);
                
                let processados = 0;
                const totalEsperado = usuarios.length * modulos.length;
                
                usuarios.forEach(idUsuario => {
                    modulos.forEach(idModulo => {
                        console.log(`Processando: Usuário ${idUsuario}, Módulo ${idModulo}`);
                        stmt.run(idUsuario, idModulo, agora, function(err) {
                            processados++;
                            if (err) {
                                console.error(`ERRO ao criar vínculo ${idUsuario}-${idModulo}:`, err);
                                erros++;
                            } else {
                                console.log(`SUCESSO vínculo ${idUsuario}-${idModulo}: ID=${this.lastID}`);
                                vinculosCriados++;
                            }
                            
                            // Verificar se todos foram processados
                            if (processados === totalEsperado) {
                                console.log(`Processamento concluído: ${vinculosCriados} sucessos, ${erros} erros`);
                                stmt.finalize((finalizeErr) => {
                                    if (finalizeErr) {
                                        reject(finalizeErr);
                                    } else {
                                        resolve();
                                    }
                                });
                            }
                        });
                    });
                });
            });
        });
        
        console.log('Enviando resposta:', { vinculosCriados, erros });
        res.json({ 
            success: true, 
            message: `Vínculos processados com sucesso!`,
            vinculosCriados: vinculosCriados,
            erros: erros
        });
        
    } catch (error) {
        console.error('Erro ao processar vínculos:', error);
        res.status(500).json({ error: 'Erro ao salvar vínculos' });
    }
});

// Desvincular módulos
app.post('/admin/desvincular-modulos', requireAdmin, (req, res) => {
    const { id_pessoa, modulos } = req.body;
    
    if (!id_pessoa || !Array.isArray(modulos) || modulos.length === 0) {
        return res.status(400).json({ error: 'Dados inválidos: usuário e módulos são obrigatórios' });
    }
    
    const placeholders = modulos.map(() => '?').join(',');
    const query = `
        UPDATE usuario_modulos 
        SET ativo = 0 
        WHERE id_pessoa = ? AND id_modulo IN (${placeholders})
    `;
    
    db.run(query, [id_pessoa, ...modulos], function(err) {
        if (err) {
            console.error('Erro ao desvincular módulos:', err);
            return res.status(500).json({ error: 'Erro ao desvincular módulos' });
        }
        
        res.json({ 
            success: true, 
            message: `${this.changes} módulo(s) desvinculado(s) com sucesso!`
        });
    });
});

// Desvincular todos os módulos de um usuário
app.post('/admin/desvincular-todos-modulos/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    
    if (!id) {
        return res.status(400).json({ error: 'ID do usuário é obrigatório' });
    }
    
    db.run(
        'UPDATE usuario_modulos SET ativo = 0 WHERE id_pessoa = ?',
        [id],
        function(err) {
            if (err) {
                console.error('Erro ao desvincular todos os módulos:', err);
                return res.status(500).json({ error: 'Erro ao desvincular módulos' });
            }
            
            res.json({ 
                success: true, 
                message: `Todos os módulos foram desvinculados! (${this.changes} vínculos afetados)`
            });
        }
    );
});



app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}`);
    console.log(`Debug: http://localhost:${PORT}/debug-vinculo`);
});

module.exports = app;