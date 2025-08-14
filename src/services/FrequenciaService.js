/**
 * Serviço de Frequência
 * Centraliza toda a lógica de negócio relacionada às frequências de estágio
 * NOTA: Este módulo está em desenvolvimento
 */

const databaseConfig = require('../config/database');
const { enums, messages } = require('../config');

class FrequenciaService {
    constructor() {
        // Inicialização do serviço
    }

    /**
     * Busca frequências por usuário
     * @param {number} idUsuario - ID do usuário
     * @param {string} nivelAcesso - Nível de acesso do usuário
     * @returns {Promise<Array>}
     */
    async buscarFrequenciasPorUsuario(idUsuario, nivelAcesso) {
        try {
            let query = `
                SELECT 
                    cef.id_campo_estagio_frequencia,
                    cef.id_planoatividade,
                    cef.data_abertura,
                    cef.data_encerramento,
                    cef.mesdereferencia,
                    cef.total_hora_mesreferencia,
                    cef.aprovado_estagiario,
                    cef.aprovado_orientador,
                    cef.aprovado_supervisor,
                    cef.resumo_atividades,
                    cef.dataultimaatualizacao,
                    pe.nome AS nome_estagiario,
                    po.nome AS nome_orientador,
                    ps.nome AS nome_supervisor,
                    pc.nome AS nome_concedente,
                    ce.tipo_estagio,
                    ce.semestre_ano,
                    ce.situacao AS ce_situacao,
                    pa.situacao AS pa_situacao
                FROM campo_estagio_frequencia cef
                INNER JOIN campo_estagio_planoatividade pa ON cef.id_planoatividade = pa.id_planoatividade
                INNER JOIN campo_estagio ce ON pa.id_campo_estagio = ce.id_campo_estagio
                LEFT JOIN pessoa pe ON ce.id_pessoa_estagiario = pe.id_pessoa
                LEFT JOIN pessoa po ON ce.id_pessoa_orientador = po.id_pessoa
                LEFT JOIN pessoa ps ON ce.id_pessoa_supervisor = ps.id_pessoa
                LEFT JOIN pessoa pc ON ce.id_pessoa_concedente = pc.id_pessoa
            `;
            
            const params = [];
            
            // Aplicar filtro baseado no nível de acesso
            if (nivelAcesso !== 'Administrador') {
                query += ` WHERE (ce.id_pessoa_orientador = ? OR 
                                 ce.id_pessoa_supervisor = ? OR 
                                 ce.id_pessoa_estagiario = ? OR 
                                 ce.id_pessoa_concedente = ?)`;
                params.push(idUsuario, idUsuario, idUsuario, idUsuario);
            }
            
            query += ` ORDER BY cef.dataultimaatualizacao DESC`;
            
            return await databaseConfig.all(query, params);
        } catch (error) {
            console.error('Erro ao buscar frequências por usuário:', error);
            return [];
        }
    }

    /**
     * Busca estatísticas de frequências
     * @param {number} idUsuario - ID do usuário (opcional)
     * @param {string} nivelAcesso - Nível de acesso do usuário
     * @returns {Promise<Object>}
     */
    async buscarEstatisticasFrequencia(idUsuario = null, nivelAcesso = null) {
        try {
            let query = `
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN cef.aprovado_estagiario = 'Sim' AND cef.aprovado_orientador = 'Sim' AND cef.aprovado_supervisor = 'Sim' THEN 1 ELSE 0 END) as aprovadas,
                    SUM(CASE WHEN cef.aprovado_estagiario = 'Não' OR cef.aprovado_orientador = 'Não' OR cef.aprovado_supervisor = 'Não' THEN 1 ELSE 0 END) as pendentes
                FROM campo_estagio_frequencia cef
                INNER JOIN campo_estagio_planoatividade pa ON cef.id_planoatividade = pa.id_planoatividade
                INNER JOIN campo_estagio ce ON pa.id_campo_estagio = ce.id_campo_estagio
            `;
            
            const params = [];
            
            // Aplicar filtro baseado no nível de acesso
            if (nivelAcesso !== 'Administrador' && idUsuario) {
                query += ` WHERE (ce.id_pessoa_orientador = ? OR 
                                 ce.id_pessoa_supervisor = ? OR 
                                 ce.id_pessoa_estagiario = ? OR 
                                 ce.id_pessoa_concedente = ?)`;
                params.push(idUsuario, idUsuario, idUsuario, idUsuario);
            }
            
            const result = await databaseConfig.get(query, params);
            
            return {
                total: result?.total || 0,
                aprovadas: result?.aprovadas || 0,
                pendentes: result?.pendentes || 0,
                rejeitadas: 0 // Para compatibilidade futura
            };
        } catch (error) {
            console.error('Erro ao buscar estatísticas de frequência:', error);
            return {
                total: 0,
                aprovadas: 0,
                pendentes: 0,
                rejeitadas: 0
            };
        }
    }

    /**
     * Busca frequência por ID
     * @param {number} id - ID da frequência
     * @returns {Promise<Object|null>}
     */
    async buscarFrequenciaPorId(id) {
        try {
            const frequencia = await databaseConfig.get(`
                SELECT 
                    cef.*,
                    pe.nome AS nome_estagiario,
                    po.nome AS nome_orientador,
                    ps.nome AS nome_supervisor,
                    pc.nome AS nome_concedente,
                    ce.tipo_estagio,
                    ce.semestre_ano,
                    pa.situacao AS pa_situacao
                FROM campo_estagio_frequencia cef
                INNER JOIN campo_estagio_planoatividade pa ON cef.id_planoatividade = pa.id_planoatividade
                INNER JOIN campo_estagio ce ON pa.id_campo_estagio = ce.id_campo_estagio
                LEFT JOIN pessoa pe ON ce.id_pessoa_estagiario = pe.id_pessoa
                LEFT JOIN pessoa po ON ce.id_pessoa_orientador = po.id_pessoa
                LEFT JOIN pessoa ps ON ce.id_pessoa_supervisor = ps.id_pessoa
                LEFT JOIN pessoa pc ON ce.id_pessoa_concedente = pc.id_pessoa
                WHERE cef.id_campo_estagio_frequencia = ?
            `, [id]);
            
            if (frequencia) {
                // Buscar registros diários
                const registrosDiarios = await databaseConfig.all(`
                    SELECT *
                    FROM frequencia_registrodiario
                    WHERE id_campo_estagio_frequencia = ?
                    ORDER BY data_da_frequencia ASC
                `, [id]);
                
                frequencia.registros_diarios = registrosDiarios;
            }
            
            return frequencia;
        } catch (error) {
            console.error('Erro ao buscar frequência por ID:', error);
            return null;
        }
    }

    /**
     * Valida permissão de acesso à frequência
     * @param {number} idUsuario - ID do usuário
     * @param {string} nivelAcesso - Nível de acesso do usuário
     * @param {number} idPlanoAtividade - ID do plano de atividade
     * @returns {Promise<boolean>}
     */
    async validarPermissaoAcesso(idUsuario, nivelAcesso, idPlanoAtividade) {
        try {
            // Administradores têm acesso total
            if (nivelAcesso === 'Administrador') {
                return true;
            }
            
            // Verificar se o usuário tem permissão para acessar este plano de atividade
            const planoAtividade = await databaseConfig.get(`
                SELECT pa.id_planoatividade
                FROM campo_estagio_planoatividade pa
                INNER JOIN campo_estagio ce ON pa.id_campo_estagio = ce.id_campo_estagio
                WHERE pa.id_planoatividade = ?
                AND (ce.id_pessoa_orientador = ? OR 
                     ce.id_pessoa_supervisor = ? OR 
                     ce.id_pessoa_estagiario = ? OR 
                     ce.id_pessoa_concedente = ?)
            `, [idPlanoAtividade, idUsuario, idUsuario, idUsuario, idUsuario]);
            
            return !!planoAtividade;
        } catch (error) {
            console.error('Erro ao validar permissão de acesso:', error);
            return false;
        }
    }

    /**
     * Criar nova frequência
     * @param {Object} dadosFrequencia - Dados da frequência
     * @returns {Promise<Object>}
     */
    async criarFrequencia(dadosFrequencia) {
        try {
            const result = await databaseConfig.run(`
                INSERT INTO campo_estagio_frequencia 
                (id_planoatividade, data_abertura, data_encerramento, mesdereferencia, resumo_atividades, dataultimaatualizacao)
                VALUES (?, ?, ?, ?, ?, NOW())
            `, [
                dadosFrequencia.id_planoatividade,
                dadosFrequencia.data_abertura || null,
                dadosFrequencia.data_encerramento || null,
                dadosFrequencia.mesdereferencia,
                dadosFrequencia.resumo_atividades || null
            ]);
            
            const frequenciaId = result.lastID;
            
            // Se houver registros diários, inserir também
            if (dadosFrequencia.registros_diarios && dadosFrequencia.registros_diarios.length > 0) {
                for (const registro of dadosFrequencia.registros_diarios) {
                    const totalHora = this.calcularTotalHoras(registro.hora_inicial, registro.hora_final);
                    
                    await databaseConfig.run(`
                        INSERT INTO frequencia_registrodiario 
                        (id_campo_estagio_frequencia, data_da_frequencia, hora_inicial, hora_final, total_hora, atividade_do_dia, dataultimaatualizacao)
                        VALUES (?, ?, ?, ?, ?, ?, NOW())
                    `, [
                        frequenciaId,
                        registro.data_da_frequencia,
                        registro.hora_inicial,
                        registro.hora_final,
                        totalHora,
                        registro.atividade_do_dia || null
                    ]);
                }
            }
            
            // Buscar e retornar a frequência criada
            return await this.buscarFrequenciaPorId(frequenciaId);
        } catch (error) {
            console.error('Erro ao criar frequência:', error);
            throw error;
        }
    }
    
    /**
     * Atualizar frequência
     * @param {number} id - ID da frequência
     * @param {Object} dadosFrequencia - Dados da frequência
     * @returns {Promise<Object>}
     */
    async atualizarFrequencia(id, dadosFrequencia) {
        try {
            await databaseConfig.run(`
                UPDATE campo_estagio_frequencia 
                SET data_abertura = ?, data_encerramento = ?, mesdereferencia = ?, 
                    resumo_atividades = ?, dataultimaatualizacao = NOW()
                WHERE id_campo_estagio_frequencia = ?
            `, [
                dadosFrequencia.data_abertura || null,
                dadosFrequencia.data_encerramento || null,
                dadosFrequencia.mesdereferencia,
                dadosFrequencia.resumo_atividades || null,
                id
            ]);
            
            // Buscar e retornar a frequência atualizada
            return await this.buscarFrequenciaPorId(id);
        } catch (error) {
            console.error('Erro ao atualizar frequência:', error);
            throw error;
        }
    }
    
    /**
     * Excluir frequência
     * @param {number} id - ID da frequência
     * @returns {Promise<boolean>}
     */
    async excluirFrequencia(id) {
        try {
            const result = await databaseConfig.run(
                'DELETE FROM campo_estagio_frequencia WHERE id_campo_estagio_frequencia = ?',
                [id]
            );
            
            return result.changes > 0;
        } catch (error) {
            console.error('Erro ao excluir frequência:', error);
            throw error;
        }
    }
    
    /**
     * Aprovar frequência
     * @param {number} id - ID da frequência
     * @param {string} tipoAprovacao - Tipo de aprovação (estagiario, orientador, supervisor)
     * @param {number} usuarioId - ID do usuário que está aprovando
     * @returns {Promise<Object>}
     */
    async aprovarFrequencia(id, tipoAprovacao, usuarioId) {
        try {
            let campoAprovacao;
            
            switch (tipoAprovacao) {
                case 'estagiario':
                    campoAprovacao = 'aprovado_estagiario';
                    break;
                case 'orientador':
                    campoAprovacao = 'aprovado_orientador';
                    break;
                case 'supervisor':
                    campoAprovacao = 'aprovado_supervisor';
                    break;
                default:
                    throw new Error('Tipo de aprovação inválido');
            }
            
            const result = await databaseConfig.run(`
                UPDATE campo_estagio_frequencia 
                SET ${campoAprovacao} = 'Sim', dataultimaatualizacao = NOW()
                WHERE id_campo_estagio_frequencia = ?
            `, [id]);
            
            if (result.changes === 0) {
                throw new Error('Frequência não encontrada');
            }
            
            return await this.buscarFrequenciaPorId(id);
        } catch (error) {
            console.error('Erro ao aprovar frequência:', error);
            throw error;
        }
    }
    
    /**
     * Adicionar registro diário
     * @param {Object} dadosRegistro - Dados do registro diário
     * @returns {Promise<Object>}
     */
    async adicionarRegistroDiario(dadosRegistro) {
        try {
            // Calcular total de horas
            const totalHora = this.calcularTotalHoras(dadosRegistro.hora_inicial, dadosRegistro.hora_final);
            
            const result = await databaseConfig.run(`
                INSERT INTO frequencia_registrodiario 
                (id_campo_estagio_frequencia, data_da_frequencia, hora_inicial, hora_final, total_hora, atividade_do_dia, dataultimaatualizacao)
                VALUES (?, ?, ?, ?, ?, ?, NOW())
            `, [
                dadosRegistro.id_campo_estagio_frequencia,
                dadosRegistro.data_da_frequencia,
                dadosRegistro.hora_inicial,
                dadosRegistro.hora_final,
                totalHora,
                dadosRegistro.atividade_do_dia || null
            ]);
            
            // Buscar e retornar o registro criado
            const registro = await databaseConfig.get(
                'SELECT * FROM frequencia_registrodiario WHERE id_frequencia_registrodiario = ?',
                [result.lastID]
            );
            
            return registro;
        } catch (error) {
            console.error('Erro ao adicionar registro diário:', error);
            throw error;
        }
    }
    
    /**
     * Atualizar registro diário
     * @param {number} registroId - ID do registro diário
     * @param {Object} dadosRegistro - Dados do registro diário
     * @returns {Promise<Object>}
     */
    async atualizarRegistroDiario(registroId, dadosRegistro) {
        try {
            // Calcular total de horas se hora inicial e final foram fornecidas
            let totalHora = dadosRegistro.total_hora;
            if (dadosRegistro.hora_inicial && dadosRegistro.hora_final) {
                totalHora = this.calcularTotalHoras(dadosRegistro.hora_inicial, dadosRegistro.hora_final);
            }
            
            const result = await databaseConfig.run(`
                UPDATE frequencia_registrodiario 
                SET data_da_frequencia = ?, hora_inicial = ?, hora_final = ?, 
                    total_hora = ?, atividade_do_dia = ?, dataultimaatualizacao = NOW()
                WHERE id_frequencia_registrodiario = ?
            `, [
                dadosRegistro.data_da_frequencia,
                dadosRegistro.hora_inicial,
                dadosRegistro.hora_final,
                totalHora,
                dadosRegistro.atividade_do_dia || null,
                registroId
            ]);
            
            if (result.changes === 0) {
                throw new Error('Registro diário não encontrado');
            }
            
            // Buscar e retornar o registro atualizado
            const registro = await databaseConfig.get(
                'SELECT * FROM frequencia_registrodiario WHERE id_frequencia_registrodiario = ?',
                [registroId]
            );
            
            return registro;
        } catch (error) {
            console.error('Erro ao atualizar registro diário:', error);
            throw error;
        }
    }
    
    /**
     * Excluir registro diário
     * @param {number} registroId - ID do registro diário
     * @returns {Promise<boolean>}
     */
    async excluirRegistroDiario(registroId) {
        try {
            const result = await databaseConfig.run(
                'DELETE FROM frequencia_registrodiario WHERE id_frequencia_registrodiario = ?',
                [registroId]
            );
            
            return result.changes > 0;
        } catch (error) {
            console.error('Erro ao excluir registro diário:', error);
            throw error;
        }
    }
    
    /**
     * Método auxiliar para calcular total de horas
     * @param {string} horaInicial - Hora inicial no formato HH:MM
     * @param {string} horaFinal - Hora final no formato HH:MM
     * @returns {string} Total de horas no formato HH:MM
     */
    calcularTotalHoras(horaInicial, horaFinal) {
        try {
            // Converter strings de hora para minutos
            const [horaIni, minIni] = horaInicial.split(':').map(Number);
            const [horaFim, minFim] = horaFinal.split(':').map(Number);
            
            const minutosIniciais = horaIni * 60 + minIni;
            const minutosFinais = horaFim * 60 + minFim;
            
            let diferencaMinutos = minutosFinais - minutosIniciais;
            
            // Se a hora final for menor que a inicial, assumir que passou da meia-noite
            if (diferencaMinutos < 0) {
                diferencaMinutos += 24 * 60; // Adicionar 24 horas em minutos
            }
            
            // Converter de volta para formato HH:MM
            const horas = Math.floor(diferencaMinutos / 60);
            const minutos = diferencaMinutos % 60;
            
            return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
        } catch (error) {
            console.error('Erro ao calcular total de horas:', error);
            return '00:00';
        }
    }
}

module.exports = FrequenciaService;