const sqlite3 = require('sqlite3').verbose();

// Conectar ao banco de dados
const db = new sqlite3.Database('./database.db');

console.log('Iniciando reestruturação das tabelas de parâmetros...');

db.serialize(() => {
    // 1. Deletar as tabelas existentes
    console.log('1. Deletando tabelas existentes...');
    db.run('DROP TABLE IF EXISTS parametrovalor', (err) => {
        if (err) {
            console.error('Erro ao deletar tabela parametrovalor:', err);
        } else {
            console.log('✓ Tabela parametrovalor deletada');
        }
    });
    
    db.run('DROP TABLE IF EXISTS parametro', (err) => {
        if (err) {
            console.error('Erro ao deletar tabela parametro:', err);
        } else {
            console.log('✓ Tabela parametro deletada');
        }
    });

    // 2. Criar nova tabela parametro com a estrutura correta
    console.log('2. Criando nova tabela parametro...');
    const createParametroTable = `
        CREATE TABLE parametro (
            id_parametro INTEGER PRIMARY KEY AUTOINCREMENT,
            identificador VARCHAR(100),
            descricao TEXT,
            modulo TEXT,
            quantidadevalor INTEGER
        )
    `;
    
    db.run(createParametroTable, (err) => {
        if (err) {
            console.error('Erro ao criar tabela parametro:', err);
        } else {
            console.log('✓ Tabela parametro criada com sucesso');
        }
    });

    // 3. Criar tabela parametrovalor
    console.log('3. Criando tabela parametrovalor...');
    const createParametroValorTable = `
        CREATE TABLE parametrovalor (
            id_parametrovalor INTEGER PRIMARY KEY AUTOINCREMENT,
            id_parametro INTEGER NOT NULL,
            identificadorvalor VARCHAR(200),
            valor VARCHAR(200),
            FOREIGN KEY (id_parametro) REFERENCES parametro(id_parametro)
        )
    `;
    
    db.run(createParametroValorTable, (err) => {
        if (err) {
            console.error('Erro ao criar tabela parametrovalor:', err);
        } else {
            console.log('✓ Tabela parametrovalor criada com sucesso');
        }
    });

    // Aguardar um pouco para garantir que as tabelas foram criadas
    setTimeout(() => {
        // 4. Inserir exemplo do parâmetro "Conta de email"
        console.log('4. Inserindo parâmetro de exemplo "Conta de email"...');
        const insertParametro = `
            INSERT INTO parametro (identificador, descricao, modulo, quantidadevalor)
            VALUES (?, ?, ?, ?)
        `;
        
        const parametroData = [
            'Conta de email',
            'São parâmetros a serem utilizados para envio automático de e-mail ou para utilizar em rotinas de recuperação de senha. Dica para contas Gmail: Se você estiver usando uma conta Google com verificação em duas etapas, precisará criar uma senha de aplicativo específica para este sistema.',
            null, // módulo null = ativo para todos os módulos
            5
        ];
        
        db.run(insertParametro, parametroData, function(err) {
            if (err) {
                console.error('Erro ao inserir parâmetro:', err);
                return;
            }
            
            console.log('✓ Parâmetro "Conta de email" inserido com ID:', this.lastID);
            const parametroId = this.lastID;
            
            // 5. Inserir os valores do parâmetro
            console.log('5. Inserindo valores do parâmetro...');
            const insertValor = `
                INSERT INTO parametrovalor (id_parametro, identificadorvalor, valor)
                VALUES (?, ?, ?)
            `;
            
            const valores = [
                [parametroId, 'Servidor SMTP', 'smtp.gmail.com'],
                [parametroId, 'Porta SMTP', '587'],
                [parametroId, 'Usuário do E-mail', 'coordenador@ufj.edu.br'],
                [parametroId, 'Senha', 'xxxxxxx'],
                [parametroId, 'E-mail Remetente', 'computacao@ufj.edu.br']
            ];
            
            let insertedCount = 0;
            valores.forEach((valor, index) => {
                db.run(insertValor, valor, (err) => {
                    if (err) {
                        console.error(`Erro ao inserir valor ${index + 1}:`, err);
                    } else {
                        insertedCount++;
                        console.log(`✓ Valor ${index + 1} inserido: ${valor[1]}`);
                        
                        if (insertedCount === valores.length) {
                            console.log('\n🎉 Reestruturação das tabelas de parâmetros concluída com sucesso!');
                            console.log('\nResumo das operações:');
                            console.log('- Tabelas antigas deletadas');
                            console.log('- Tabela "parametro" criada com nova estrutura');
                            console.log('- Tabela "parametrovalor" criada');
                            console.log('- Parâmetro de exemplo "Conta de email" inserido com 5 valores');
                            
                            db.close((err) => {
                                if (err) {
                                    console.error('Erro ao fechar conexão:', err);
                                } else {
                                    console.log('\n✓ Conexão com banco de dados fechada');
                                }
                            });
                        }
                    }
                });
            });
        });
    }, 500); // Aguardar 500ms
});