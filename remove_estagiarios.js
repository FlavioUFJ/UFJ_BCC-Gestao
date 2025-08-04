const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

console.log('Iniciando remoção da tabela estagiarios e suas dependências...');

db.serialize(() => {
    // 1. Remover tabelas que dependem de estagiarios
    db.run('DROP TABLE IF EXISTS planos_atividade', (err) => {
        if (err) {
            console.error('Erro ao remover planos_atividade:', err);
        } else {
            console.log('Tabela planos_atividade removida com sucesso');
        }
    });
    
    db.run('DROP TABLE IF EXISTS relatorios_estagio', (err) => {
        if (err) {
            console.error('Erro ao remover relatorios_estagio:', err);
        } else {
            console.log('Tabela relatorios_estagio removida com sucesso');
        }
    });
    
    // 2. Remover a tabela estagiarios
    db.run('DROP TABLE IF EXISTS estagiarios', (err) => {
        if (err) {
            console.error('Erro ao remover estagiarios:', err);
        } else {
            console.log('Tabela estagiarios removida com sucesso');
        }
    });
    
    // 3. Recriar apenas as tabelas necessárias (sem estagiarios)
    // Tabela de planos de atividade (sem referência a estagiarios)
    db.run(`CREATE TABLE IF NOT EXISTS planos_atividade (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campo_estagio_id INTEGER,
        empresa TEXT,
        supervisor_empresa TEXT,
        telefone_supervisor TEXT,
        email_supervisor TEXT,
        periodo_inicio TEXT,
        periodo_fim TEXT,
        carga_horaria_semanal INTEGER,
        atividades_desenvolvidas TEXT,
        objetivos TEXT,
        cronograma TEXT,
        recursos_necessarios TEXT,
        pdf_assinado TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (campo_estagio_id) REFERENCES campo_estagio (id_campo_estagio)
    )`, (err) => {
        if (err) {
            console.error('Erro ao recriar planos_atividade:', err);
        } else {
            console.log('Tabela planos_atividade recriada com sucesso');
        }
    });
    
    // Tabela de relatórios de estágio (sem referência a estagiarios)
    db.run(`CREATE TABLE IF NOT EXISTS relatorios_estagio (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campo_estagio_id INTEGER,
        periodo TEXT,
        atividades_realizadas TEXT,
        dificuldades_encontradas TEXT,
        conhecimentos_adquiridos TEXT,
        sugestoes_melhorias TEXT,
        avaliacao_supervisor TEXT,
        nota_supervisor DECIMAL(3,1),
        observacoes_supervisor TEXT,
        pdf_assinado TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (campo_estagio_id) REFERENCES campo_estagio (id_campo_estagio)
    )`, (err) => {
        if (err) {
            console.error('Erro ao recriar relatorios_estagio:', err);
        } else {
            console.log('Tabela relatorios_estagio recriada com sucesso');
        }
    });
});

db.close((err) => {
    if (err) {
        console.error('Erro ao fechar banco de dados:', err);
    } else {
        console.log('\nOperação concluída! Tabela estagiarios e suas dependências foram removidas.');
        console.log('As tabelas foram recriadas sem referências à tabela estagiarios.');
    }
});