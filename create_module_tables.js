const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

console.log('Criando tabelas para sistema modular...');

db.serialize(() => {
    // Tabela de módulos
    db.run(`CREATE TABLE IF NOT EXISTS modulos (
        id_modulo INTEGER PRIMARY KEY AUTOINCREMENT,
        nome VARCHAR(100) NOT NULL,
        descricao TEXT,
        icone VARCHAR(50),
        cor VARCHAR(20),
        url VARCHAR(200),
        ativo BOOLEAN DEFAULT 1,
        ordem INTEGER DEFAULT 0,
        dataCadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
        dataultimaatualizacao DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('Erro ao criar tabela modulos:', err);
        } else {
            console.log('✓ Tabela modulos criada com sucesso');
        }
    });

    // Tabela de relacionamento usuário-módulos
    db.run(`CREATE TABLE IF NOT EXISTS usuario_modulos (
        id_usuario_modulo INTEGER PRIMARY KEY AUTOINCREMENT,
        id_pessoa INTEGER NOT NULL,
        id_modulo INTEGER NOT NULL,
        ativo BOOLEAN DEFAULT 1,
        dataCadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
        dataultimaatualizacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_pessoa) REFERENCES pessoa(id_pessoa),
        FOREIGN KEY (id_modulo) REFERENCES modulos(id_modulo),
        UNIQUE(id_pessoa, id_modulo)
    )`, (err) => {
        if (err) {
            console.error('Erro ao criar tabela usuario_modulos:', err);
        } else {
            console.log('✓ Tabela usuario_modulos criada com sucesso');
        }
    });

    // Inserir módulos padrão
    const modulosPadrao = [
        {
            nome: 'Estágio',
            descricao: 'Gestão de estágios supervisionados',
            icone: 'fas fa-briefcase',
            cor: '#007bff',
            url: '/dashboard',
            ordem: 1
        },
        {
            nome: 'PFC - Monografia',
            descricao: 'Gestão de Projetos de Final de Curso e Monografias',
            icone: 'fas fa-graduation-cap',
            cor: '#28a745',
            url: '/pfc',
            ordem: 2
        },
        {
            nome: 'Extensão',
            descricao: 'Gestão de projetos de extensão universitária',
            icone: 'fas fa-hands-helping',
            cor: '#ffc107',
            url: '/extensao',
            ordem: 3
        },
        {
            nome: 'Coordenação',
            descricao: 'Ferramentas de coordenação acadêmica',
            icone: 'fas fa-users-cog',
            cor: '#dc3545',
            url: '/coordenacao',
            ordem: 4
        }
    ];

    const stmt = db.prepare(`INSERT OR IGNORE INTO modulos (nome, descricao, icone, cor, url, ordem) VALUES (?, ?, ?, ?, ?, ?)`);
    
    modulosPadrao.forEach(modulo => {
        stmt.run(modulo.nome, modulo.descricao, modulo.icone, modulo.cor, modulo.url, modulo.ordem);
    });
    
    stmt.finalize((err) => {
        if (err) {
            console.error('Erro ao inserir módulos padrão:', err);
        } else {
            console.log('✓ Módulos padrão inseridos com sucesso');
        }
        
        // Verificar se as tabelas foram criadas
        db.all("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('modulos', 'usuario_modulos')", (err, tables) => {
            if (err) {
                console.error('Erro ao verificar tabelas:', err);
            } else {
                console.log('\nTabelas criadas:');
                tables.forEach(table => {
                    console.log(`- ${table.name}`);
                });
            }
            
            // Mostrar módulos inseridos
            db.all("SELECT * FROM modulos ORDER BY ordem", (err, modulos) => {
                if (err) {
                    console.error('Erro ao buscar módulos:', err);
                } else {
                    console.log('\nMódulos cadastrados:');
                    modulos.forEach(modulo => {
                        console.log(`- ${modulo.nome}: ${modulo.descricao}`);
                    });
                }
                db.close();
            });
        });
    });
});