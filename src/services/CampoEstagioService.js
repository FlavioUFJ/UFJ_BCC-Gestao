/**
 * Serviço de Campo de Estágio
 * Centraliza toda a lógica de negócio relacionada aos campos de estágio
 */

const databaseConfig = require('../config/database');
const { enums, messages } = require('../config');
const SQLOptimizer = require('../utils/sql-optimizer');

class CampoEstagioService {
    constructor() {
        // Inicialização do serviço
    }

    /**
     * Busca campos de estágio por usuário
     * @param {number} idUsuario - ID do usuário
     * @param {string} nivelAcesso - Nível de acesso do usuário
     * @returns {Promise<Array>}
     */
    async buscarCamposEstagiosPorUsuario(idUsuario, nivelAcesso) {
        try {
            // Definir campos necessários para otimizar JOINs
            const requiredFields = [
                'nome_estagiario', 'nome_orientador', 'nome_concedente', 
                'nome_supervisor', 'nome_curso'
            ];
            
            // Construir JOINs otimizados
            const optimizedJoins = SQLOptimizer.buildOptimizedJoins(requiredFields, 'ce');
            
            let sql = `
                SELECT 
                    ce.id_campo_estagio,
                    ce.situacao,
                    ce.tipo_estagio,
                    ce.semestre_ano,
                    ce.data_inicio,
                    ce.data_fim,
                    ce.cargahoraria,
                    ce.observacoes,
                    pe.nome as nome_estagiario,
                    po.nome as nome_orientador,
                    pc.nome as nome_concedente,
                    ps.nome as nome_supervisor,
                    pcr.nome as nome_curso,
                    ce.dataultimaatualizacao,
                    cepa.plano_anexado_sei
                FROM campo_estagio ce
                LEFT JOIN campo_estagio_planoatividade cepa ON ce.id_campo_estagio = cepa.id_campo_estagio
                ${optimizedJoins}
            `;
            
            const params = [];
            
            // Aplicar filtro baseado no nível de acesso (otimizado)
            const accessConditions = SQLOptimizer.buildUserAccessConditions(idUsuario, nivelAcesso, 'ce');
            if (accessConditions.whereClause) {
                sql += ` WHERE ${accessConditions.whereClause}`;
                params.push(...accessConditions.params);
            }
            
            sql += ' ORDER BY ce.dataultimaatualizacao DESC';
            
            const result = await databaseConfig.all(sql, params);
            return result || [];
        } catch (error) {
            console.error('Erro ao buscar campos de estágio por usuário:', error);
            return [];
        }
    }

    /**
     * Busca estatísticas de campos de estágio
     * @param {number} idUsuario - ID do usuário (opcional)
     * @param {string} nivelAcesso - Nível de acesso do usuário
     * @returns {Promise<Object>}
     */
    async buscarEstatisticasCampoEstagio(idUsuario = null, nivelAcesso = null) {
        try {
            // Usar SQLOptimizer para otimizar CASE WHEN
            const caseConditions = [
                { condition: "situacao = 'Aprovado'", alias: 'aprovados' },
                { condition: "situacao = 'Em Edição'", alias: 'em_edicao' },
                { condition: "situacao = 'Cancelado'", alias: 'cancelados' }
            ];
            
            const optimizedCaseStatements = SQLOptimizer.buildOptimizedCase(caseConditions);
            
            let sql = `
                SELECT 
                    COUNT(*) as total,
                    ${optimizedCaseStatements}
                FROM campo_estagio
            `;
            
            const params = [];
            
            // Aplicar filtro baseado no nível de acesso usando SQLOptimizer
            if (nivelAcesso !== 'Administrador' && idUsuario) {
                const whereClause = SQLOptimizer.buildUserAccessConditions(idUsuario, '');
                sql += ` ${whereClause}`;
                params.push(idUsuario, idUsuario, idUsuario, idUsuario);
            }
            
            const result = await databaseConfig.get(sql, params);
            
            return {
                total: result?.total || 0,
                aprovados: result?.aprovados || 0,
                em_edicao: result?.em_edicao || 0,
                cancelados: result?.cancelados || 0
            };
        } catch (error) {
            console.error('Erro ao buscar estatísticas de campos de estágio:', error);
            return {
                total: 0,
                aprovados: 0,
                em_edicao: 0,
                cancelados: 0
            };
        }
    }

    /**
     * Busca campo de estágio por ID
     * @param {number} id - ID do campo de estágio
     * @returns {Promise<Object|null>}
     */
    async buscarCampoEstagioPorId(id) {
        try {
            // Definir campos necessários para otimizar JOINs
            const requiredFields = [
                'nome_estagiario', 'nome_orientador', 'nome_concedente', 
                'nome_supervisor', 'nome_curso'
            ];
            
            // Construir JOINs otimizados
            const optimizedJoins = SQLOptimizer.buildOptimizedJoins(requiredFields, 'ce');
            
            const sql = `
                SELECT 
                    ce.*,
                    pe.nome as nome_estagiario,
                    po.nome as nome_orientador,
                    pc.nome as nome_concedente,
                    ps.nome as nome_supervisor,
                    pcr.nome as nome_curso
                FROM campo_estagio ce
                ${optimizedJoins}
                WHERE ce.id_campo_estagio = ?
            `;
            
            const result = await databaseConfig.get(sql, [id]);
            return result || null;
        } catch (error) {
            console.error('Erro ao buscar campo de estágio por ID:', error);
            return null;
        }
    }

    /**
     * Valida permissão de acesso ao campo de estágio
     * @param {number} idCampoEstagio - ID do campo de estágio
     * @param {number} idUsuario - ID do usuário
     * @param {string} nivelAcesso - Nível de acesso do usuário
     * @returns {Promise<boolean>}
     */
    async validarPermissaoAcesso(idCampoEstagio, idUsuario, nivelAcesso) {
        try {
            // Administradores têm acesso total
            if (nivelAcesso === 'Administrador') {
                return true;
            }

            // Buscar o campo de estágio
            const campoEstagio = await this.buscarCampoEstagioPorId(idCampoEstagio);
            if (!campoEstagio) {
                return false;
            }

            // Buscar a categoria do usuário com cache (otimizado)
            const categoriaUsuario = await SQLOptimizer.getUserCategoryWithCache(idUsuario, databaseConfig);

            // Verificar permissão baseada na categoria
            switch (categoriaUsuario) {
                case '1': // Coordenador - acesso total
                    return true;
                    
                case '3': // Aluno/Estagiário - apenas seus próprios estágios
                    return campoEstagio.id_pessoa_estagiario === idUsuario;
                    
                case '4': // Concedente/Local de Estágio - estágios onde é concedente
                    return campoEstagio.id_pessoa_concedente === idUsuario;
                    
                case '5': // Supervisor - estágios onde é supervisor
                    return campoEstagio.id_pessoa_supervisor === idUsuario;
                    
                case '6': // Instituição/Curso - estágios relacionados via id_pessoa_curso
                    return campoEstagio.id_pessoa_curso === idUsuario;
                    
                default:
                    return false;
            }
        } catch (error) {
            console.error('Erro ao validar permissão de acesso:', error);
            return false;
        }
    }
}

module.exports = CampoEstagioService;