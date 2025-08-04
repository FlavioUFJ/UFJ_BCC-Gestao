const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

console.log('Iniciando migração: renomeando coluna "fase" para "situacao"...');

db.serialize(() => {
    // Verificar se a coluna 'situacao' já existe
    db.all("PRAGMA table_info(estagiarios)", (err, columns) => {
        if (err) {
            console.error('Erro ao verificar estrutura da tabela:', err);
            db.close();
            return;
        }
        
        const hasSituacao = columns.some(col => col.name === 'situacao');
        const hasFase = columns.some(col => col.name === 'fase');
        
        if (hasSituacao) {
            console.log('Coluna "situacao" já existe. Migração não necessária.');
            db.close();
            return;
        }
        
        if (!hasFase) {
            console.log('Coluna "fase" não encontrada. Criando coluna "situacao"...');
            db.run('ALTER TABLE estagiarios ADD COLUMN situacao TEXT', (err) => {
                if (err) {
                    console.error('Erro ao adicionar coluna situacao:', err);
                } else {
                    console.log('Coluna "situacao" criada com sucesso.');
                }
                db.close();
            });
            return;
        }
        
        console.log('Executando migração...');
        
        // Passo 1: Adicionar nova coluna 'situacao'
        db.run('ALTER TABLE estagiarios ADD COLUMN situacao TEXT', (err) => {
            if (err) {
                console.error('Erro ao adicionar coluna situacao:', err);
                db.close();
                return;
            }
            
            console.log('Coluna "situacao" adicionada.');
            
            // Passo 2: Copiar dados da coluna 'fase' para 'situacao', convertendo valores antigos
            db.run(`UPDATE estagiarios SET situacao = 
                CASE 
                    WHEN fase = 'Fase 1' THEN 'Em edição'
                    WHEN fase = 'Fase 2' THEN 'Aprovado'
                    WHEN fase = 'Fase 3' THEN 'Em edição'
                    WHEN fase = 'Com pendência' THEN 'Em edição'
                    WHEN fase = 'Iniciado' THEN 'Em edição'
                    WHEN fase = 'Cancelado' THEN 'Em edição'
                    WHEN fase = 'Concluído' THEN 'Aprovado'
                    WHEN fase = 'Em edição' THEN 'Em edição'
                    WHEN fase = 'Aprovado' THEN 'Aprovado'
                    ELSE 'Em edição'
                END
                WHERE fase IS NOT NULL`, (err) => {
                if (err) {
                    console.error('Erro ao copiar dados:', err);
                    db.close();
                    return;
                }
                
                console.log('Dados copiados e convertidos para nova coluna.');
                
                // Passo 3: Verificar quantos registros foram atualizados
                db.get('SELECT COUNT(*) as count FROM estagiarios WHERE situacao IS NOT NULL', (err, result) => {
                    if (err) {
                        console.error('Erro ao verificar dados:', err);
                    } else {
                        console.log(`${result.count} registros atualizados com nova situação.`);
                    }
                    
                    // Mostrar alguns exemplos da conversão
                    db.all('SELECT fase, situacao FROM estagiarios WHERE fase IS NOT NULL LIMIT 5', (err, rows) => {
                        if (err) {
                            console.error('Erro ao buscar exemplos:', err);
                        } else {
                            console.log('\nExemplos de conversão:');
                            rows.forEach(row => {
                                console.log(`  "${row.fase}" -> "${row.situacao}"`);
                            });
                        }
                        
                        console.log('\nMigração concluída com sucesso!');
                        console.log('IMPORTANTE: A coluna "fase" ainda existe para compatibilidade.');
                        console.log('Após verificar que tudo está funcionando, você pode remover a coluna "fase" manualmente se desejar.');
                        
                        db.close();
                    });
                });
            });
        });
    });
    
    // Também migrar a tabela campo_estagio se existir
    db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='campo_estagio'", (err, tables) => {
        if (err) {
            console.error('Erro ao verificar tabela campo_estagio:', err);
            return;
        }
        
        if (tables.length > 0) {
            console.log('\nMigrando tabela campo_estagio...');
            
            // Verificar se a coluna 'situacao' já existe na tabela campo_estagio
            db.all("PRAGMA table_info(campo_estagio)", (err, columns) => {
                if (err) {
                    console.error('Erro ao verificar estrutura da tabela campo_estagio:', err);
                    return;
                }
                
                const hasSituacao = columns.some(col => col.name === 'situacao');
                const hasFase = columns.some(col => col.name === 'fase');
                
                if (hasSituacao) {
                    console.log('Coluna "situacao" já existe na tabela campo_estagio.');
                    return;
                }
                
                if (!hasFase) {
                    console.log('Coluna "fase" não encontrada na tabela campo_estagio. Criando coluna "situacao"...');
                    db.run('ALTER TABLE campo_estagio ADD COLUMN situacao TEXT', (err) => {
                        if (err) {
                            console.error('Erro ao adicionar coluna situacao na tabela campo_estagio:', err);
                        } else {
                            console.log('Coluna "situacao" criada na tabela campo_estagio.');
                        }
                    });
                    return;
                }
                
                // Adicionar coluna situacao na tabela campo_estagio
                db.run('ALTER TABLE campo_estagio ADD COLUMN situacao TEXT', (err) => {
                    if (err) {
                        console.error('Erro ao adicionar coluna situacao na tabela campo_estagio:', err);
                        return;
                    }
                    
                    console.log('Coluna "situacao" adicionada na tabela campo_estagio.');
                    
                    // Copiar e converter dados
                    db.run(`UPDATE campo_estagio SET situacao = 
                        CASE 
                            WHEN fase = 'Fase 1' THEN 'Em edição'
                            WHEN fase = 'Fase 2' THEN 'Aprovado'
                            WHEN fase = 'Fase 3' THEN 'Em edição'
                            WHEN fase = 'Com pendência' THEN 'Em edição'
                            WHEN fase = 'Iniciado' THEN 'Em edição'
                            WHEN fase = 'Cancelado' THEN 'Em edição'
                            WHEN fase = 'Concluído' THEN 'Aprovado'
                            WHEN fase = 'Em edição' THEN 'Em edição'
                            WHEN fase = 'Aprovado' THEN 'Aprovado'
                            ELSE 'Em edição'
                        END
                        WHERE fase IS NOT NULL`, (err) => {
                        if (err) {
                            console.error('Erro ao copiar dados na tabela campo_estagio:', err);
                        } else {
                            console.log('Dados migrados na tabela campo_estagio.');
                        }
                    });
                });
            });
        }
    });
});