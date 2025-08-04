-- Script para remover a tabela estagiarios e suas dependências
-- Execute este script para limpar o banco de dados

-- 1. Remover tabelas que dependem de estagiarios
DROP TABLE IF EXISTS planos_atividade;
DROP TABLE IF EXISTS relatorios_estagio;

-- 2. Remover a tabela estagiarios
DROP TABLE IF EXISTS estagiarios;

-- 3. Recriar apenas as tabelas necessárias (sem estagiarios)
-- Tabela de planos de atividade (sem referência a estagiarios)
CREATE TABLE IF NOT EXISTS planos_atividade (
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
);

-- Tabela de relatórios de estágio (sem referência a estagiarios)
CREATE TABLE IF NOT EXISTS relatorios_estagio (
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
);

SELECT 'Tabela estagiarios e suas dependências removidas com sucesso!' as resultado;