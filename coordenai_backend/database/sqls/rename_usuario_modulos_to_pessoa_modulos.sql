-- Script para renomear a tabela usuario_modulos para pessoa_modulos
-- Data: 2025-01-11
-- Descrição: Alteração para manter coerência do sistema

-- Renomear a tabela
RENAME TABLE usuario_modulos TO pessoa_modulos;

-- Verificar se a operação foi bem-sucedida
SELECT 'Tabela renomeada com sucesso de usuario_modulos para pessoa_modulos' AS resultado;