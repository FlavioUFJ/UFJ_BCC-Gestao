-- =====================================================
-- ÍNDICES COMPOSTOS PARA OTIMIZAÇÃO DE PERFORMANCE
-- Sistema de Gestão de Estágios - UFJ BCC
-- =====================================================

-- Índices para tabela campo_estagio (principal)
-- Otimiza consultas de acesso por usuário (múltiplas funções)
CREATE INDEX IF NOT EXISTS idx_campo_estagio_pessoas_acesso 
ON campo_estagio (id_pessoa_orientador, id_pessoa_supervisor, id_pessoa_estagiario, id_pessoa_concedente);

-- Índice para consultas por status e datas (filtros comuns)
CREATE INDEX IF NOT EXISTS idx_campo_estagio_status_datas 
ON campo_estagio (status, data_inicio, data_fim);

-- Índice para consultas administrativas (dashboard)
CREATE INDEX IF NOT EXISTS idx_campo_estagio_admin 
ON campo_estagio (situacao, dataultimaatualizacao DESC);

-- Índice para busca por nome e status
CREATE INDEX IF NOT EXISTS idx_campo_estagio_nome_status 
ON campo_estagio (nome_estagio, status);

-- Índice para consultas de carga horária
CREATE INDEX IF NOT EXISTS idx_campo_estagio_carga_horaria 
ON campo_estagio (carga_horaria_total, carga_horaria_cumprida, status);

-- =====================================================
-- ÍNDICES PARA TABELA FREQUENCIA
-- =====================================================

-- Índice principal para consultas de frequência por estágio
CREATE INDEX IF NOT EXISTS idx_frequencia_estagio_data 
ON frequencia (id_campo_estagio, data_frequencia DESC);

-- Índice para consultas de frequência por período
CREATE INDEX IF NOT EXISTS idx_frequencia_periodo 
ON frequencia (data_frequencia, status_aprovacao);

-- Índice para consultas de aprovação
CREATE INDEX IF NOT EXISTS idx_frequencia_aprovacao 
ON frequencia (status_aprovacao, data_aprovacao);

-- =====================================================
-- ÍNDICES PARA TABELA PLANO_ATIVIDADE
-- =====================================================

-- Índice para consultas de plano por estágio
CREATE INDEX IF NOT EXISTS idx_plano_atividade_estagio 
ON plano_atividade (id_campo_estagio, data_inicio, data_fim);

-- Índice para consultas de atividades por status
CREATE INDEX IF NOT EXISTS idx_plano_atividade_status 
ON plano_atividade (status, data_criacao DESC);

-- =====================================================
-- ÍNDICES PARA TABELA PESSOA
-- =====================================================

-- Índice para consultas por categoria (muito usado para controle de acesso)
CREATE INDEX IF NOT EXISTS idx_pessoa_categoria_ativo 
ON pessoa (categoria, ativo);

-- Índice para consultas por email (login)
CREATE INDEX IF NOT EXISTS idx_pessoa_email_ativo 
ON pessoa (email, ativo);

-- Índice para busca por nome
CREATE INDEX IF NOT EXISTS idx_pessoa_nome 
ON pessoa (nome);

-- =====================================================
-- ÍNDICES PARA OTIMIZAÇÃO DE JOINS
-- =====================================================

-- Índice composto para JOINs frequentes entre campo_estagio e pessoa
-- Otimiza as consultas que fazem JOIN com múltiplas pessoas
CREATE INDEX IF NOT EXISTS idx_campo_estagio_join_orientador 
ON campo_estagio (id_pessoa_orientador, status, data_inicio);

CREATE INDEX IF NOT EXISTS idx_campo_estagio_join_estagiario 
ON campo_estagio (id_pessoa_estagiario, status, data_inicio);

CREATE INDEX IF NOT EXISTS idx_campo_estagio_join_supervisor 
ON campo_estagio (id_pessoa_supervisor, status, data_inicio);

CREATE INDEX IF NOT EXISTS idx_campo_estagio_join_concedente 
ON campo_estagio (id_pessoa_concedente, status, data_inicio);

-- =====================================================
-- ÍNDICES PARA CONSULTAS DE ESTATÍSTICAS
-- =====================================================

-- Índice para consultas de estatísticas por período
CREATE INDEX IF NOT EXISTS idx_campo_estagio_estatisticas 
ON campo_estagio (data_inicio, data_fim, status, situacao);

-- Índice para contagem por orientador
CREATE INDEX IF NOT EXISTS idx_campo_estagio_count_orientador 
ON campo_estagio (id_pessoa_orientador, situacao);

-- =====================================================
-- ÍNDICES PARA TABELAS DE LOG E AUDITORIA
-- =====================================================

-- Índice para consultas de log por usuário e data
CREATE INDEX IF NOT EXISTS idx_log_usuario_data 
ON log (id_usuario, data_log DESC);

-- Índice para consultas de log por ação
CREATE INDEX IF NOT EXISTS idx_log_acao_data 
ON log (acao, data_log DESC);

-- =====================================================
-- COMENTÁRIOS E OBSERVAÇÕES
-- =====================================================

/*
ESTES ÍNDICES FORAM CRIADOS PARA OTIMIZAR:

1. Consultas de acesso por usuário (múltiplas condições OR)
   - Substituídas por consultas com UNION e índices específicos
   
2. JOINs múltiplos entre campo_estagio e pessoa
   - Índices compostos para cada tipo de relacionamento
   
3. Consultas de dashboard administrativo
   - Índices para filtros comuns (status, datas, situação)
   
4. Consultas de frequência e plano de atividades
   - Índices para relacionamentos e filtros temporais
   
5. Consultas de estatísticas e relatórios
   - Índices para agregações e contagens

IMPORTANTE:
- Monitore o uso destes índices com EXPLAIN QUERY PLAN
- Remova índices não utilizados para economizar espaço
- Considere índices parciais para dados com alta seletividade
- Atualize estatísticas regularmente com ANALYZE
*/

-- =====================================================
-- COMANDOS DE MANUTENÇÃO
-- =====================================================

-- Atualizar estatísticas após criação dos índices
-- ANALYZE;

-- Verificar uso dos índices (executar após período de uso)
-- SELECT name, tbl_name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%';

-- Verificar tamanho dos índices
-- PRAGMA index_info('nome_do_indice');