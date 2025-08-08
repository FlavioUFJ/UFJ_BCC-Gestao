/**
 * Serviço de Plano de Atividade
 * Centraliza toda a lógica de negócio relacionada aos planos de atividade
 */

const databaseConfig = require('../config/database');
const { enums, messages } = require('../config');

class PlanoAtividadeService {
    constructor() {
        // Inicialização do serviço
    }

    /**
     * Busca planos de atividade por usuário
     * @param {number} idUsuario - ID do usuário
     * @param {string} nivelAcesso - Nível de acesso do usuário
     * @returns {Promise<Array>}
     */
    async buscarPlanosAtividadePorUsuario(idUsuario, nivelAcesso) {
        try {
            let sql = `
                SELECT 
                    pa.id_plano_atividade,
                    pa.id_campo_estagio,
                    pa.situacao,
                    pa.data_inicial,
                    pa.data_final,
                    pa.cargahoraria,
                    pa.observacoes,
                    pa.data_cadastro,
                    pa.data_atualizacao,
                    ce.tipo_estagio,
                    ce.semestre_ano,
                    pe.nome as nome_estagiario,
                    po.nome as nome_orientador,
                    ps.nome as nome_supervisor,
                    pc.nome as nome_concedente
                FROM campo_estagio_planoatividade pa
                INNER JOIN campo_estagio ce ON pa.id_campo_estagio = ce.id_campo_estagio
                LEFT JOIN pessoa pe ON ce.id_pessoa_estagiario = pe.id_pessoa
                LEFT JOIN pessoa po ON ce.id_pessoa_orientador = po.id_pessoa
                LEFT JOIN pessoa ps ON ce.id_pessoa_supervisor = ps.id_pessoa
                LEFT JOIN pessoa pc ON ce.id_pessoa_concedente = pc.id_pessoa
            `;
            
            const params = [];
            
            // Aplicar filtro baseado no nível de acesso e categoria do usuário
            if (nivelAcesso !== 'Administrador') {
                // Buscar a categoria do usuário
                const usuarioSql = 'SELECT categoria FROM pessoa WHERE id_pessoa = ?';
                const usuario = await databaseConfig.get(usuarioSql, [idUsuario]);
                const categoriaUsuario = usuario?.categoria;
                
                // Aplicar restrições baseadas na categoria
                switch (categoriaUsuario) {
                    case '1': // Coordenador - nenhuma restrição, recupera todos os dados
                        break;
                        
                    case '2': // Professor Orientador - apenas planos onde é orientador
                        sql += ' WHERE ce.id_pessoa_orientador = ?';
                        params.push(idUsuario);
                        break;
                        
                    case '3': // Aluno/Estagiário - apenas seus próprios planos
                        sql += ' WHERE ce.id_pessoa_estagiario = ?';
                        params.push(idUsuario);
                        break;
                        
                    case '4': // Concedente/Local de Estágio - planos onde é concedente
                        sql += ' WHERE ce.id_pessoa_concedente = ?';
                        params.push(idUsuario);
                        break;
                        
                    case '5': // Supervisor - planos onde é supervisor
                        sql += ' WHERE ce.id_pessoa_supervisor = ?';
                        params.push(idUsuario);
                        break;
                        
                    case '6': // Instituição/Curso - planos relacionados via id_pessoa_curso
                        sql += ' WHERE ce.id_pessoa_curso = ?';
                        params.push(idUsuario);
                        break;
                        
                    case '99': // Usuário Geral - sem acesso aos dados
                        sql += ' WHERE 1 = 0'; // Retorna vazio
                        break;
                        
                    default: // Categoria não reconhecida - apenas seus próprios planos
                        sql += ' WHERE ce.id_pessoa_estagiario = ?';
                        params.push(idUsuario);
                        break;
                }
            }
            
            sql += ' ORDER BY pa.data_atualizacao DESC, pa.data_cadastro DESC';
            
            const result = await databaseConfig.all(sql, params);
            return result || [];
        } catch (error) {
            console.error('Erro ao buscar planos de atividade por usuário:', error);
            return [];
        }
    }

    /**
     * Busca estatísticas de planos de atividade
     * @param {number} idUsuario - ID do usuário (opcional)
     * @param {string} nivelAcesso - Nível de acesso do usuário
     * @returns {Promise<Object>}
     */
    async buscarEstatisticasPlanoAtividade(idUsuario = null, nivelAcesso = null) {
        try {
            let sql = `
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN pa.situacao = 'Aprovado' THEN 1 ELSE 0 END) as aprovados,
                    SUM(CASE WHEN pa.situacao = 'Em edição' THEN 1 ELSE 0 END) as em_edicao,
                    SUM(CASE WHEN pa.situacao = 'Pendente' THEN 1 ELSE 0 END) as pendentes
                FROM campo_estagio_planoatividade pa
                INNER JOIN campo_estagio ce ON pa.id_campo_estagio = ce.id_campo_estagio
            `;
            
            const params = [];
            
            // Aplicar filtro baseado no nível de acesso e categoria do usuário
            if (nivelAcesso !== 'Administrador' && idUsuario) {
                // Buscar a categoria do usuário
                const usuarioSql = 'SELECT categoria FROM pessoa WHERE id_pessoa = ?';
                const usuario = await databaseConfig.get(usuarioSql, [idUsuario]);
                const categoriaUsuario = usuario?.categoria;
                
                // Aplicar restrições baseadas na categoria
                switch (categoriaUsuario) {
                    case '1': // Coordenador - nenhuma restrição, recupera todos os dados
                        break;
                        
                    case '2': // Professor Orientador - apenas planos onde é orientador
                        sql += ' WHERE ce.id_pessoa_orientador = ?';
                        params.push(idUsuario);
                        break;
                        
                    case '3': // Aluno/Estagiário - apenas seus próprios planos
                        sql += ' WHERE ce.id_pessoa_estagiario = ?';
                        params.push(idUsuario);
                        break;
                        
                    case '4': // Concedente/Local de Estágio - planos onde é concedente
                        sql += ' WHERE ce.id_pessoa_concedente = ?';
                        params.push(idUsuario);
                        break;
                        
                    case '5': // Supervisor - planos onde é supervisor
                        sql += ' WHERE ce.id_pessoa_supervisor = ?';
                        params.push(idUsuario);
                        break;
                        
                    case '6': // Instituição/Curso - planos relacionados via id_pessoa_curso
                         sql += ' WHERE ce.id_pessoa_curso = ?';
                         params.push(idUsuario);
                         break;
                        
                    case '99': // Usuário Geral - sem acesso aos dados
                        sql += ' WHERE 1 = 0'; // Retorna vazio
                        break;
                        
                    default: // Categoria não reconhecida - apenas seus próprios planos
                        sql += ' WHERE ce.id_pessoa_estagiario = ?';
                        params.push(idUsuario);
                        break;
                }
            }
            
            const result = await databaseConfig.get(sql, params);
            
            return {
                total: result?.total || 0,
                aprovados: result?.aprovados || 0,
                em_edicao: result?.em_edicao || 0,
                pendentes: result?.pendentes || 0
            };
        } catch (error) {
            console.error('Erro ao buscar estatísticas de planos de atividade:', error);
            return {
                total: 0,
                aprovados: 0,
                em_edicao: 0,
                pendentes: 0
            };
        }
    }

    /**
     * Busca plano de atividade por ID
     * @param {number} id - ID do plano de atividade
     * @returns {Promise<Object|null>}
     */
    async buscarPlanoAtividadePorId(id) {
        try {
            const sql = `
                SELECT 
                    pa.*,
                    ce.tipo_estagio,
                    ce.semestre_ano,
                    pe.nome as nome_estagiario,
                    po.nome as nome_orientador,
                    ps.nome as nome_supervisor,
                    pc.nome as nome_concedente
                FROM campo_estagio_planoatividade pa
                INNER JOIN campo_estagio ce ON pa.id_campo_estagio = ce.id_campo_estagio
                LEFT JOIN pessoa pe ON ce.id_pessoa_estagiario = pe.id_pessoa
                LEFT JOIN pessoa po ON ce.id_pessoa_orientador = po.id_pessoa
                LEFT JOIN pessoa ps ON ce.id_pessoa_supervisor = ps.id_pessoa
                LEFT JOIN pessoa pc ON ce.id_pessoa_concedente = pc.id_pessoa
                WHERE pa.id_plano_atividade = ?
            `;
            
            const result = await databaseConfig.get(sql, [id]);
            return result || null;
        } catch (error) {
            console.error('Erro ao buscar plano de atividade por ID:', error);
            return null;
        }
    }

    /**
     * Busca planos de atividade por campo de estágio
     * @param {number} idCampoEstagio - ID do campo de estágio
     * @returns {Promise<Array>}
     */
    async buscarPlanosPorCampoEstagio(idCampoEstagio) {
        try {
            const sql = `
                SELECT 
                    pa.*,
                    ce.tipo_estagio,
                    ce.semestre_ano,
                    pe.nome as nome_estagiario,
                    po.nome as nome_orientador,
                    ps.nome as nome_supervisor,
                    pc.nome as nome_concedente
                FROM campo_estagio_planoatividade pa
                INNER JOIN campo_estagio ce ON pa.id_campo_estagio = ce.id_campo_estagio
                LEFT JOIN pessoa pe ON ce.id_pessoa_estagiario = pe.id_pessoa
                LEFT JOIN pessoa po ON ce.id_pessoa_orientador = po.id_pessoa
                LEFT JOIN pessoa ps ON ce.id_pessoa_supervisor = ps.id_pessoa
                LEFT JOIN pessoa pc ON ce.id_pessoa_concedente = pc.id_pessoa
                WHERE pa.id_campo_estagio = ?
                ORDER BY pa.data_atualizacao DESC, pa.data_cadastro DESC
            `;
            
            const result = await databaseConfig.all(sql, [idCampoEstagio]);
            return result || [];
        } catch (error) {
            console.error('Erro ao buscar planos por campo de estágio:', error);
            return [];
        }
    }

    /**
     * Valida permissão de acesso ao plano de atividade
     * @param {number} idPlanoAtividade - ID do plano de atividade
     * @param {number} idUsuario - ID do usuário
     * @param {string} nivelAcesso - Nível de acesso do usuário
     * @returns {Promise<boolean>}
     */
    async validarPermissaoAcesso(idPlanoAtividade, idUsuario, nivelAcesso) {
        try {
            // Administradores têm acesso total
            if (nivelAcesso === 'Administrador') {
                return true;
            }

            // Buscar o plano de atividade
            const planoAtividade = await this.buscarPlanoAtividadePorId(idPlanoAtividade);
            if (!planoAtividade) {
                return false;
            }

            // Buscar a categoria do usuário
            const usuarioSql = 'SELECT categoria FROM pessoa WHERE id_pessoa = ?';
            const usuario = await databaseConfig.get(usuarioSql, [idUsuario]);
            const categoriaUsuario = usuario?.categoria;

            // Buscar dados do campo de estágio relacionado
            const campoEstagio = await databaseConfig.get(
                'SELECT * FROM campo_estagio WHERE id_campo_estagio = ?',
                [planoAtividade.id_campo_estagio]
            );

            if (!campoEstagio) {
                return false;
            }

            // Verificar permissão baseada na categoria
            switch (categoriaUsuario) {
                case '1': // Coordenador - acesso total
                    return true;
                    
                case '2': // Professor Orientador - apenas planos onde é orientador
                    return campoEstagio.id_pessoa_orientador === idUsuario;
                    
                case '3': // Aluno/Estagiário - apenas seus próprios planos
                    return campoEstagio.id_pessoa_estagiario === idUsuario;
                    
                case '4': // Concedente/Local de Estágio - planos onde é concedente
                    return campoEstagio.id_pessoa_concedente === idUsuario;
                    
                case '5': // Supervisor - planos onde é supervisor
                    return campoEstagio.id_pessoa_supervisor === idUsuario;
                    
                case '6': // Instituição/Curso - planos relacionados via id_pessoa_curso
                    return campoEstagio.id_pessoa_curso === idUsuario;
                    
                default:
                    return false;
            }
        } catch (error) {
            console.error('Erro ao validar permissão de acesso ao plano:', error);
            return false;
        }
    }
}

module.exports = PlanoAtividadeService;