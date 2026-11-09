/**
 * Migração para adicionar índices de performance
 * Sistema de Gestão de Estágios - UFJ BCC
 * 
 * Esta migração adiciona índices compostos para otimizar:
 * - Consultas com múltiplas condições OR
 * - JOINs entre tabelas principais
 * - Consultas de dashboard e relatórios
 * - Consultas de controle de acesso por usuário
 */

const databaseConfig = require('../../src/config/database');

class AddPerformanceIndexes {
    /**
     * Executa a migração - adiciona os índices
     */
    static async up() {
        console.log('🚀 Iniciando migração: Adicionando índices de performance...');
        
        try {
            // Índices para tabela campo_estagio
            await this.createIndex(
                'idx_campo_estagio_pessoas_acesso',
                'campo_estagio',
                '(id_pessoa_orientador, id_pessoa_supervisor, id_pessoa_estagiario, id_pessoa_concedente)',
                'Otimiza consultas de acesso por usuário'
            );

            await this.createIndex(
                'idx_campo_estagio_status_datas',
                'campo_estagio',
                '(status, data_inicio, data_fim)',
                'Otimiza filtros por status e período'
            );

            await this.createIndex(
                'idx_campo_estagio_admin',
                'campo_estagio',
                '(situacao, dataultimaatualizacao DESC)',
                'Otimiza consultas do dashboard administrativo'
            );

            await this.createIndex(
                'idx_campo_estagio_nome_status',
                'campo_estagio',
                '(nome_estagio, status)',
                'Otimiza busca por nome e status'
            );

            // Índices para tabela frequencia
            await this.createIndex(
                'idx_frequencia_estagio_data',
                'frequencia',
                '(id_campo_estagio, data_frequencia DESC)',
                'Otimiza consultas de frequência por estágio'
            );

            await this.createIndex(
                'idx_frequencia_periodo',
                'frequencia',
                '(data_frequencia, status_aprovacao)',
                'Otimiza consultas por período'
            );

            // Índices para tabela plano_atividade
            await this.createIndex(
                'idx_plano_atividade_estagio',
                'plano_atividade',
                '(id_campo_estagio, data_inicio, data_fim)',
                'Otimiza consultas de plano por estágio'
            );

            // Índices para tabela pessoa
            await this.createIndex(
                'idx_pessoa_categoria_ativo',
                'pessoa',
                '(categoria, ativo)',
                'Otimiza consultas por categoria (controle de acesso)'
            );

            await this.createIndex(
                'idx_pessoa_email_ativo',
                'pessoa',
                '(email, ativo)',
                'Otimiza consultas de login'
            );

            // Índices para JOINs específicos
            await this.createIndex(
                'idx_campo_estagio_join_orientador',
                'campo_estagio',
                '(id_pessoa_orientador, status, data_inicio)',
                'Otimiza JOINs com orientador'
            );

            await this.createIndex(
                'idx_campo_estagio_join_estagiario',
                'campo_estagio',
                '(id_pessoa_estagiario, status, data_inicio)',
                'Otimiza JOINs com estagiário'
            );

            await this.createIndex(
                'idx_campo_estagio_join_supervisor',
                'campo_estagio',
                '(id_pessoa_supervisor, status, data_inicio)',
                'Otimiza JOINs com supervisor'
            );

            await this.createIndex(
                'idx_campo_estagio_join_concedente',
                'campo_estagio',
                '(id_pessoa_concedente, status, data_inicio)',
                'Otimiza JOINs com concedente'
            );

            // Índices para estatísticas
            await this.createIndex(
                'idx_campo_estagio_estatisticas',
                'campo_estagio',
                '(data_inicio, data_fim, status, situacao)',
                'Otimiza consultas de estatísticas'
            );

            // Índices para logs (se existir a tabela)
            try {
                await this.createIndex(
                    'idx_log_usuario_data',
                    'log',
                    '(id_usuario, data_log DESC)',
                    'Otimiza consultas de log por usuário'
                );
            } catch (error) {
                console.log('⚠️  Tabela log não encontrada, pulando índice de log');
            }

            // Atualizar estatísticas do banco
            console.log('📊 Atualizando estatísticas do banco de dados...');
            await databaseConfig.run('ANALYZE');

            console.log('✅ Migração concluída com sucesso!');
            console.log('📈 Índices de performance adicionados e estatísticas atualizadas.');
            
        } catch (error) {
            console.error('❌ Erro durante a migração:', error.message);
            throw error;
        }
    }

    /**
     * Reverte a migração - remove os índices
     */
    static async down() {
        console.log('🔄 Revertendo migração: Removendo índices de performance...');
        
        const indexes = [
            'idx_campo_estagio_pessoas_acesso',
            'idx_campo_estagio_status_datas',
            'idx_campo_estagio_admin',
            'idx_campo_estagio_nome_status',
            'idx_frequencia_estagio_data',
            'idx_frequencia_periodo',
            'idx_plano_atividade_estagio',
            'idx_pessoa_categoria_ativo',
            'idx_pessoa_email_ativo',
            'idx_campo_estagio_join_orientador',
            'idx_campo_estagio_join_estagiario',
            'idx_campo_estagio_join_supervisor',
            'idx_campo_estagio_join_concedente',
            'idx_campo_estagio_estatisticas',
            'idx_log_usuario_data'
        ];

        try {
            for (const indexName of indexes) {
                await this.dropIndex(indexName);
            }
            
            console.log('✅ Migração revertida com sucesso!');
            
        } catch (error) {
            console.error('❌ Erro ao reverter migração:', error.message);
            throw error;
        }
    }

    /**
     * Cria um índice de forma segura
     */
    static async createIndex(indexName, tableName, columns, description) {
        try {
            const sql = `CREATE INDEX IF NOT EXISTS ${indexName} ON ${tableName} ${columns}`;
            await databaseConfig.run(sql);
            console.log(`✅ Índice criado: ${indexName} - ${description}`);
        } catch (error) {
            console.error(`❌ Erro ao criar índice ${indexName}:`, error.message);
            throw error;
        }
    }

    /**
     * Remove um índice de forma segura
     */
    static async dropIndex(indexName) {
        try {
            const sql = `DROP INDEX IF EXISTS ${indexName}`;
            await databaseConfig.run(sql);
            console.log(`🗑️  Índice removido: ${indexName}`);
        } catch (error) {
            console.error(`❌ Erro ao remover índice ${indexName}:`, error.message);
            // Não propagar o erro para não interromper a remoção de outros índices
        }
    }

    /**
     * Verifica se um índice existe
     */
    static async indexExists(indexName) {
        try {
            const result = await databaseConfig.get(
                "SELECT name FROM sqlite_master WHERE type='index' AND name=?",
                [indexName]
            );
            return !!result;
        } catch (error) {
            return false;
        }
    }

    /**
     * Lista todos os índices criados por esta migração
     */
    static async listCreatedIndexes() {
        try {
            const result = await databaseConfig.all(
                "SELECT name, tbl_name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%' ORDER BY name"
            );
            
            console.log('📋 Índices de performance ativos:');
            result.forEach(index => {
                console.log(`   - ${index.name} (tabela: ${index.tbl_name})`);
            });
            
            return result;
        } catch (error) {
            console.error('❌ Erro ao listar índices:', error.message);
            return [];
        }
    }
}

module.exports = AddPerformanceIndexes;

// Permitir execução direta do script
if (require.main === module) {
    const command = process.argv[2];
    
    switch (command) {
        case 'up':
            AddPerformanceIndexes.up()
                .then(() => process.exit(0))
                .catch(() => process.exit(1));
            break;
            
        case 'down':
            AddPerformanceIndexes.down()
                .then(() => process.exit(0))
                .catch(() => process.exit(1));
            break;
            
        case 'list':
            AddPerformanceIndexes.listCreatedIndexes()
                .then(() => process.exit(0))
                .catch(() => process.exit(1));
            break;
            
        default:
            console.log('Uso: node add-performance-indexes.js [up|down|list]');
            console.log('  up   - Aplica a migração (cria índices)');
            console.log('  down - Reverte a migração (remove índices)');
            console.log('  list - Lista índices existentes');
            process.exit(1);
    }
}