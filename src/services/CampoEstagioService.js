/**
 * Serviço de Campo de Estágio
 * Centraliza toda a lógica de negócio relacionada aos campos de estágio
 */

const databaseConfig = require('../config/database');
const { enums, messages } = require('../config');

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
                    ce.dataultimaatualizacao
                FROM campo_estagio ce
                LEFT JOIN pessoa pe ON ce.id_pessoa_estagiario = pe.id_pessoa
                LEFT JOIN pessoa po ON ce.id_pessoa_orientador = po.id_pessoa
                LEFT JOIN pessoa pc ON ce.id_pessoa_concedente = pc.id_pessoa
                LEFT JOIN pessoa ps ON ce.id_pessoa_supervisor = ps.id_pessoa
                LEFT JOIN pessoa pcr ON ce.id_pessoa_curso = pcr.id_pessoa
            `;
            
            const params = [];
            
            // Aplicar filtro baseado no nível de acesso e categoria do usuário
            if (nivelAcesso !== 'Administrador') {
                // Buscar a categoria do usuário
                const usuarioSql = 'SELECT categoria FROM pessoa WHERE id_pessoa = ?';
                const usuario = await databaseConfig.get(usuarioSql, [idUsuario]);
                const categoriaUsuario = usuario?.categoria;
                
                // Aplicar restrições baseadas na categoria
                // Agora considerando que o usuário pode ter múltiplas funções
                const condicoes = [];
                
                switch (categoriaUsuario) {
                    case '1': // Coordenador - nenhuma restrição, recupera todos os dados
                        break;
                        
                    case '2': // Professor/Orientador - estágios onde é orientador
                        condicoes.push('ce.id_pessoa_orientador = ?');
                        params.push(idUsuario);
                        break;
                        
                    case '3': // Aluno/Estagiário - apenas seus próprios estágios
                        condicoes.push('ce.id_pessoa_estagiario = ?');
                        params.push(idUsuario);
                        break;
                        
                    case '4': // Concedente/Local de Estágio - estágios onde é concedente
                        condicoes.push('ce.id_pessoa_concedente = ?');
                        params.push(idUsuario);
                        break;
                        
                    case '5': // Supervisor - estágios onde é supervisor
                        condicoes.push('ce.id_pessoa_supervisor = ?');
                        params.push(idUsuario);
                        break;
                        
                    case '6': // Instituição/Curso - estágios relacionados via id_pessoa_curso
                        condicoes.push('ce.id_pessoa_curso = ?');
                        params.push(idUsuario);
                        break;
                        
                    case '99': // Usuário Geral - sem acesso aos dados
                        sql += ' WHERE 1 = 0'; // Retorna vazio
                        break;
                        
                    default: // Categoria não reconhecida - apenas seus próprios estágios
                        condicoes.push('ce.id_pessoa_estagiario = ?');
                        params.push(idUsuario);
                        break;
                }
                
                // Além da categoria principal, verificar se o usuário está vinculado em outras funções
                // Isso permite que um usuário veja estágios onde participa em qualquer função
                if (categoriaUsuario !== '1' && categoriaUsuario !== '99') {
                    // Adicionar condições para verificar se o usuário está em outras funções
                    const funcoesAdicionais = [
                        'ce.id_pessoa_estagiario = ?',
                        'ce.id_pessoa_orientador = ?',
                        'ce.id_pessoa_supervisor = ?',
                        'ce.id_pessoa_concedente = ?',
                        'ce.id_pessoa_curso = ?'
                    ];
                    
                    // Remover a condição já adicionada pela categoria principal
                    const condicaoExistente = condicoes[0];
                    const funcoesParaAdicionar = funcoesAdicionais.filter(funcao => funcao !== condicaoExistente);
                    
                    // Adicionar todas as outras funções possíveis
                    funcoesParaAdicionar.forEach(funcao => {
                        condicoes.push(funcao);
                        params.push(idUsuario);
                    });
                }
                
                // Aplicar as condições com OR se houver múltiplas
                if (condicoes.length > 0) {
                    sql += ' WHERE (' + condicoes.join(' OR ') + ')';
                }
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
            let sql = `
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN situacao = 'Aprovado' THEN 1 ELSE 0 END) as aprovados,
                    SUM(CASE WHEN situacao = 'Em Edição' THEN 1 ELSE 0 END) as em_edicao,
                    SUM(CASE WHEN situacao = 'Cancelado' THEN 1 ELSE 0 END) as cancelados
                FROM campo_estagio
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
                        
                    case '2': // Professor/Orientador - estágios onde é orientador
                        sql += ' WHERE id_pessoa_orientador = ?';
                        params.push(idUsuario);
                        break;
                        
                    case '3': // Aluno/Estagiário - apenas seus próprios estágios
                        sql += ' WHERE id_pessoa_estagiario = ?';
                        params.push(idUsuario);
                        break;
                        
                    case '4': // Concedente/Local de Estágio - estágios onde é concedente
                        sql += ' WHERE id_pessoa_concedente = ?';
                        params.push(idUsuario);
                        break;
                        
                    case '5': // Supervisor - estágios onde é supervisor
                        sql += ' WHERE id_pessoa_supervisor = ?';
                        params.push(idUsuario);
                        break;
                        
                    case '6': // Instituição/Curso - estágios relacionados via id_pessoa_curso
                         sql += ' WHERE id_pessoa_curso = ?';
                         params.push(idUsuario);
                         break;
                        
                    case '99': // Usuário Geral - sem acesso aos dados
                        sql += ' WHERE 1 = 0'; // Retorna vazio
                        break;
                        
                    default: // Categoria não reconhecida - apenas seus próprios estágios
                        sql += ' WHERE id_pessoa_estagiario = ?';
                        params.push(idUsuario);
                        break;
                }
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
            const sql = `
                SELECT 
                    ce.*,
                    pe.nome as nome_estagiario,
                    po.nome as nome_orientador,
                    pc.nome as nome_concedente,
                    ps.nome as nome_supervisor,
                    pcr.nome as nome_curso
                FROM campo_estagio ce
                LEFT JOIN pessoa pe ON ce.id_pessoa_estagiario = pe.id_pessoa
                LEFT JOIN pessoa po ON ce.id_pessoa_orientador = po.id_pessoa
                LEFT JOIN pessoa pc ON ce.id_pessoa_concedente = pc.id_pessoa
                LEFT JOIN pessoa ps ON ce.id_pessoa_supervisor = ps.id_pessoa
                LEFT JOIN pessoa pcr ON ce.id_pessoa_curso = pcr.id_pessoa
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

            // Buscar a categoria do usuário
            const usuarioSql = 'SELECT categoria FROM pessoa WHERE id_pessoa = ?';
            const usuario = await databaseConfig.get(usuarioSql, [idUsuario]);
            const categoriaUsuario = usuario?.categoria;

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