const FrequenciaService = require('../src/services/FrequenciaService');

class FrequenciaController {
    // Listar frequências
    async listar(req, res) {
        try {
            const userId = req.user.id;
            const userNivelAcesso = req.user.nivelacesso;
            
            const frequencias = await FrequenciaService.buscarFrequenciasPorUsuario(userId, userNivelAcesso);
            const estatisticas = await FrequenciaService.buscarEstatisticasFrequencia(userId, userNivelAcesso);
            
            res.json({
                success: true,
                data: frequencias,
                estatisticas: estatisticas
            });
        } catch (error) {
            console.error('Erro ao listar frequências:', error);
            res.status(500).json({ 
                success: false,
                error: 'Erro interno do servidor',
                message: error.message 
            });
        }
    }

    /**
     * Exibir formulário para criar nova frequência
     */
    async criar(req, res) {
        try {
            const planoAtividadeId = req.query.planoAtividadeId || req.params.planoAtividadeId;
            
            if (!planoAtividadeId) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'ID do plano de atividade é obrigatório' 
                });
            }
            
            // Verificar se o usuário tem permissão
            const temPermissao = await FrequenciaService.validarPermissaoAcesso(
                req.user.id, 
                req.user.nivel_acesso, 
                planoAtividadeId
            );
            
            if (!temPermissao) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Acesso negado' 
                });
            }
            
            res.render('frequencia-form', {
                frequencia: null,
                planoAtividadeId: planoAtividadeId,
                user: req.user
            });
        } catch (error) {
            console.error('Erro ao exibir formulário de criação:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Erro interno do servidor' 
            });
        }
    }

    /**
     * Salvar nova frequência (POST)
     */
    async salvar(req, res) {
        try {
            const dadosFrequencia = req.body;
            
            // Verificar se o plano de atividade foi fornecido
            if (!dadosFrequencia.id_planoatividade) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'ID do plano de atividade é obrigatório' 
                });
            }
            
            // Verificar permissão
            const temPermissao = await FrequenciaService.validarPermissaoAcesso(
                req.user.id, 
                req.user.nivel_acesso, 
                dadosFrequencia.id_planoatividade
            );
            
            if (!temPermissao) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Acesso negado' 
                });
            }
            
            const frequencia = await FrequenciaService.criarFrequencia(dadosFrequencia);
            
            res.json({ 
                success: true, 
                message: 'Frequência criada com sucesso',
                data: frequencia 
            });
        } catch (error) {
            console.error('Erro ao salvar frequência:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Erro interno do servidor' 
            });
        }
    }

    // Exibir frequência específica
    async exibir(req, res) {
        try {
            const { id } = req.params;
            
            const frequencia = await FrequenciaService.buscarFrequenciaPorId(id);
            
            if (!frequencia) {
                return res.status(404).json({
                    success: false,
                    message: 'Frequência não encontrada'
                });
            }
            
            // Verificar permissão de acesso
            const temPermissao = await FrequenciaService.validarPermissaoAcesso(
                req.user.id, 
                req.user.nivelacesso, 
                frequencia.id_planoatividade
            );
            
            if (!temPermissao) {
                return res.status(403).json({
                    success: false,
                    message: 'Você não tem permissão para acessar esta frequência'
                });
            }
            
            res.json({
                success: true,
                data: frequencia
            });
        } catch (error) {
            console.error('Erro ao exibir frequência:', error);
            res.status(500).json({ 
                success: false,
                error: 'Erro interno do servidor',
                message: error.message 
            });
        }
    }

    /**
     * Exibir formulário para editar frequência
     */
    async editar(req, res) {
        try {
            const { id } = req.params;
            
            const frequencia = await FrequenciaService.buscarFrequenciaPorId(id);
            
            if (!frequencia) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Frequência não encontrada' 
                });
            }
            
            // Verificar permissão usando o plano de atividade
            const temPermissao = await FrequenciaService.validarPermissaoAcesso(
                req.user.id, 
                req.user.nivel_acesso,
                frequencia.id_planoatividade
            );
            
            if (!temPermissao) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Acesso negado' 
                });
            }
            
            res.render('frequencia-form', {
                frequencia: frequencia,
                planoAtividadeId: frequencia.id_planoatividade,
                user: req.user
            });
        } catch (error) {
            console.error('Erro ao exibir formulário de edição:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Erro interno do servidor' 
            });
        }
    }

    /**
     * Atualizar frequência existente (PUT)
     */
    async atualizar(req, res) {
        try {
            const { id } = req.params;
            const dadosFrequencia = req.body;
            
            // Buscar frequência existente para verificar permissões
            const frequenciaExistente = await FrequenciaService.buscarFrequenciaPorId(id);
            
            if (!frequenciaExistente) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Frequência não encontrada' 
                });
            }
            
            // Verificar permissão
            const temPermissao = await FrequenciaService.validarPermissaoAcesso(
                req.user.id, 
                req.user.nivel_acesso, 
                frequenciaExistente.id_planoatividade
            );
            
            if (!temPermissao) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Acesso negado' 
                });
            }
            
            const frequencia = await FrequenciaService.atualizarFrequencia(id, dadosFrequencia);
            
            res.json({ 
                success: true, 
                message: 'Frequência atualizada com sucesso',
                data: frequencia 
            });
        } catch (error) {
            console.error('Erro ao atualizar frequência:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Erro interno do servidor' 
            });
        }
    }

    /**
     * Excluir frequência (DELETE)
     */
    async excluir(req, res) {
        try {
            const { id } = req.params;
            
            // Buscar frequência existente para verificar permissões
            const frequenciaExistente = await FrequenciaService.buscarFrequenciaPorId(id);
            
            if (!frequenciaExistente) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Frequência não encontrada' 
                });
            }
            
            // Verificar permissão
            const temPermissao = await FrequenciaService.validarPermissaoAcesso(
                req.user.id, 
                req.user.nivel_acesso, 
                frequenciaExistente.id_planoatividade
            );
            
            if (!temPermissao) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Acesso negado' 
                });
            }
            
            const sucesso = await FrequenciaService.excluirFrequencia(id);
            
            if (sucesso) {
                res.json({ 
                    success: true, 
                    message: 'Frequência excluída com sucesso' 
                });
            } else {
                res.status(400).json({ 
                    success: false, 
                    message: 'Não foi possível excluir a frequência' 
                });
            }
        } catch (error) {
            console.error('Erro ao excluir frequência:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Erro interno do servidor' 
            });
        }
    }

    // Gerar PDF da frequência
    async gerarPDF(req, res) {
        try {
            const { id } = req.params;
            
            const frequencia = await FrequenciaService.buscarFrequenciaPorId(id);
            if (!frequencia) {
                return res.status(404).json({
                    success: false,
                    message: 'Frequência não encontrada'
                });
            }
            
            // Verificar permissão
            const temPermissao = await FrequenciaService.validarPermissaoAcesso(
                req.user.id, 
                req.user.nivelacesso, 
                frequencia.id_planoatividade
            );
            
            if (!temPermissao) {
                return res.status(403).json({
                    success: false,
                    message: 'Você não tem permissão para gerar PDF desta frequência'
                });
            }
            
            // TODO: Implementar geração de PDF
            res.json({
                success: false,
                message: 'Geração de PDF em desenvolvimento'
            });
        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            res.status(500).json({ 
                success: false,
                error: 'Erro interno do servidor',
                message: error.message 
            });
        }
    }

    // Aprovar frequência (estagiário)
    async aprovarEstagiario(req, res) {
        try {
            const { id } = req.params;
            
            const resultado = await FrequenciaService.aprovarFrequencia(id, 'estagiario', req.user.id);
            
            res.json({
                success: true,
                message: 'Frequência aprovada pelo estagiário com sucesso',
                data: resultado
            });
        } catch (error) {
            console.error('Erro ao aprovar frequência (estagiário):', error);
            res.status(500).json({ 
                success: false,
                error: 'Erro interno do servidor',
                message: error.message 
            });
        }
    }

    // Aprovar frequência (orientador)
    async aprovarOrientador(req, res) {
        try {
            const { id } = req.params;
            
            const resultado = await FrequenciaService.aprovarFrequencia(id, 'orientador', req.user.id);
            
            res.json({
                success: true,
                message: 'Frequência aprovada pelo orientador com sucesso',
                data: resultado
            });
        } catch (error) {
            console.error('Erro ao aprovar frequência (orientador):', error);
            res.status(500).json({ 
                success: false,
                error: 'Erro interno do servidor',
                message: error.message 
            });
        }
    }

    // Aprovar frequência (supervisor)
    async aprovarSupervisor(req, res) {
        try {
            const { id } = req.params;
            
            const resultado = await FrequenciaService.aprovarFrequencia(id, 'supervisor', req.user.id);
            
            res.json({
                success: true,
                message: 'Frequência aprovada pelo supervisor com sucesso',
                data: resultado
            });
        } catch (error) {
            console.error('Erro ao aprovar frequência (supervisor):', error);
            res.status(500).json({ 
                success: false,
                error: 'Erro interno do servidor',
                message: error.message 
            });
        }
    }

    // Adicionar registro diário
    async adicionarRegistroDiario(req, res) {
        try {
            const { id } = req.params; // id da frequência
            const dadosRegistro = req.body;
            
            // Verificar se a frequência existe
            const frequencia = await FrequenciaService.buscarFrequenciaPorId(id);
            if (!frequencia) {
                return res.status(404).json({
                    success: false,
                    message: 'Frequência não encontrada'
                });
            }
            
            // Verificar permissão
            const temPermissao = await FrequenciaService.validarPermissaoAcesso(
                req.user.id, 
                req.user.nivelacesso, 
                frequencia.id_planoatividade
            );
            
            if (!temPermissao) {
                return res.status(403).json({
                    success: false,
                    message: 'Você não tem permissão para adicionar registros a esta frequência'
                });
            }
            
            dadosRegistro.id_campo_estagio_frequencia = id;
            const novoRegistro = await FrequenciaService.adicionarRegistroDiario(dadosRegistro);
            
            res.json({
                success: true,
                message: 'Registro diário adicionado com sucesso',
                data: novoRegistro
            });
        } catch (error) {
            console.error('Erro ao adicionar registro diário:', error);
            res.status(500).json({ 
                success: false,
                error: 'Erro interno do servidor',
                message: error.message 
            });
        }
    }

    // Atualizar registro diário
    async atualizarRegistroDiario(req, res) {
        try {
            const { id, registroId } = req.params;
            const dadosRegistro = req.body;
            
            // Verificar se a frequência existe
            const frequencia = await FrequenciaService.buscarFrequenciaPorId(id);
            if (!frequencia) {
                return res.status(404).json({
                    success: false,
                    message: 'Frequência não encontrada'
                });
            }
            
            // Verificar permissão
            const temPermissao = await FrequenciaService.validarPermissaoAcesso(
                req.user.id, 
                req.user.nivelacesso, 
                frequencia.id_planoatividade
            );
            
            if (!temPermissao) {
                return res.status(403).json({
                    success: false,
                    message: 'Você não tem permissão para atualizar registros desta frequência'
                });
            }
            
            const registroAtualizado = await FrequenciaService.atualizarRegistroDiario(registroId, dadosRegistro);
            
            res.json({
                success: true,
                message: 'Registro diário atualizado com sucesso',
                data: registroAtualizado
            });
        } catch (error) {
            console.error('Erro ao atualizar registro diário:', error);
            res.status(500).json({ 
                success: false,
                error: 'Erro interno do servidor',
                message: error.message 
            });
        }
    }

    // Excluir registro diário
    async excluirRegistroDiario(req, res) {
        try {
            const { id, registroId } = req.params;
            
            // Verificar se a frequência existe
            const frequencia = await FrequenciaService.buscarFrequenciaPorId(id);
            if (!frequencia) {
                return res.status(404).json({
                    success: false,
                    message: 'Frequência não encontrada'
                });
            }
            
            // Verificar permissão
            const temPermissao = await FrequenciaService.validarPermissaoAcesso(
                req.user.id, 
                req.user.nivelacesso, 
                frequencia.id_planoatividade
            );
            
            if (!temPermissao) {
                return res.status(403).json({
                    success: false,
                    message: 'Você não tem permissão para excluir registros desta frequência'
                });
            }
            
            await FrequenciaService.excluirRegistroDiario(registroId);
            
            res.json({
                success: true,
                message: 'Registro diário excluído com sucesso'
            });
        } catch (error) {
            console.error('Erro ao excluir registro diário:', error);
            res.status(500).json({ 
                success: false,
                error: 'Erro interno do servidor',
                message: error.message 
            });
        }
    }
}

module.exports = new FrequenciaController();