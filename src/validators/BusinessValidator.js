/**
 * Validador de Regras de Negócio
 * Implementa validações específicas das regras de negócio do sistema
 */

const Pessoa = require('../models/Pessoa');
const Estagio = require('../models/Estagio');
const { enums } = require('../config');
const Helpers = require('../utils/helpers');

/**
 * Classe para validações de regras de negócio
 */
class BusinessValidator {
    constructor() {
        this.pessoaModel = new Pessoa();
        this.estagioModel = new Estagio();
    }

    /**
     * Valida se pessoa pode ser orientador
     * @param {number} idPessoa - ID da pessoa
     * @returns {Object} Resultado da validação
     */
    async validateOrientador(idPessoa) {
        try {
            const pessoa = await this.pessoaModel.findById(idPessoa);
            
            if (!pessoa) {
                return {
                    valid: false,
                    message: 'Pessoa não encontrada'
                };
            }

            if (pessoa.tipoacesso !== enums.tipoAcesso.ORIENTADOR) {
                return {
                    valid: false,
                    message: 'Pessoa deve ter tipo de acesso "Orientador"'
                };
            }

            if (!pessoa.ativo) {
                return {
                    valid: false,
                    message: 'Orientador deve estar ativo no sistema'
                };
            }

            // Verificar se orientador não está sobrecarregado
            const estagiosAtivos = await this.estagioModel.findAll({
                where: {
                    id_orientador: idPessoa,
                    status: [enums.statusEstagio.EM_ANDAMENTO, enums.statusEstagio.PENDENTE]
                }
            });

            const maxEstagios = 10; // Máximo de estágios por orientador
            if (estagiosAtivos.data.length >= maxEstagios) {
                return {
                    valid: false,
                    message: `Orientador já possui o máximo de ${maxEstagios} estágios ativos`
                };
            }

            return {
                valid: true,
                message: 'Orientador válido'
            };
        } catch (error) {
            return {
                valid: false,
                message: 'Erro ao validar orientador: ' + error.message
            };
        }
    }

    /**
     * Valida se pessoa pode ser estagiário
     * @param {number} idPessoa - ID da pessoa
     * @returns {Object} Resultado da validação
     */
    async validateEstagiario(idPessoa) {
        try {
            const pessoa = await this.pessoaModel.findById(idPessoa);
            
            if (!pessoa) {
                return {
                    valid: false,
                    message: 'Pessoa não encontrada'
                };
            }

            if (pessoa.tipoacesso !== enums.tipoAcesso.ESTAGIARIO) {
                return {
                    valid: false,
                    message: 'Pessoa deve ter tipo de acesso "Estagiário"'
                };
            }

            if (!pessoa.ativo) {
                return {
                    valid: false,
                    message: 'Estagiário deve estar ativo no sistema'
                };
            }

            // Verificar se estagiário não possui estágio ativo
            const estagioAtivo = await this.estagioModel.findOne({
                where: {
                    id_estagiario: idPessoa,
                    status: [enums.statusEstagio.EM_ANDAMENTO, enums.statusEstagio.PENDENTE]
                }
            });

            if (estagioAtivo) {
                return {
                    valid: false,
                    message: 'Estagiário já possui um estágio ativo'
                };
            }

            return {
                valid: true,
                message: 'Estagiário válido'
            };
        } catch (error) {
            return {
                valid: false,
                message: 'Erro ao validar estagiário: ' + error.message
            };
        }
    }

    /**
     * Valida se pessoa pode ser empresa
     * @param {number} idPessoa - ID da pessoa
     * @returns {Object} Resultado da validação
     */
    async validateEmpresa(idPessoa) {
        try {
            const pessoa = await this.pessoaModel.findById(idPessoa);
            
            if (!pessoa) {
                return {
                    valid: false,
                    message: 'Pessoa não encontrada'
                };
            }

            if (pessoa.tipoacesso !== enums.tipoAcesso.EMPRESA) {
                return {
                    valid: false,
                    message: 'Pessoa deve ter tipo de acesso "Empresa"'
                };
            }

            if (!pessoa.ativo) {
                return {
                    valid: false,
                    message: 'Empresa deve estar ativa no sistema'
                };
            }

            // Validar CNPJ se fornecido
            if (pessoa.documento && !Helpers.isValidCNPJ(pessoa.documento)) {
                return {
                    valid: false,
                    message: 'CNPJ da empresa é inválido'
                };
            }

            return {
                valid: true,
                message: 'Empresa válida'
            };
        } catch (error) {
            return {
                valid: false,
                message: 'Erro ao validar empresa: ' + error.message
            };
        }
    }

    /**
     * Valida período do estágio
     * @param {string} dataInicio - Data de início
     * @param {string} dataFim - Data de fim
     * @param {string} tipoEstagio - Tipo do estágio
     * @returns {Object} Resultado da validação
     */
    validatePeriodoEstagio(dataInicio, dataFim, tipoEstagio) {
        try {
            const inicio = new Date(dataInicio);
            const fim = dataFim ? new Date(dataFim) : null;
            const hoje = new Date();

            // Validar data de início
            if (inicio < hoje.setHours(0, 0, 0, 0)) {
                return {
                    valid: false,
                    message: 'Data de início não pode ser anterior a hoje'
                };
            }

            // Validar data de fim se fornecida
            if (fim) {
                if (fim <= inicio) {
                    return {
                        valid: false,
                        message: 'Data de fim deve ser posterior à data de início'
                    };
                }

                // Validar duração mínima e máxima baseada no tipo
                const diasDuracao = Helpers.daysDifference(inicio, fim);
                
                switch (tipoEstagio) {
                    case enums.tipoEstagio.OBRIGATORIO:
                        if (diasDuracao < 90) {
                            return {
                                valid: false,
                                message: 'Estágio obrigatório deve ter duração mínima de 90 dias'
                            };
                        }
                        if (diasDuracao > 730) { // 2 anos
                            return {
                                valid: false,
                                message: 'Estágio obrigatório deve ter duração máxima de 2 anos'
                            };
                        }
                        break;
                        
                    case enums.tipoEstagio.NAO_OBRIGATORIO:
                        if (diasDuracao < 30) {
                            return {
                                valid: false,
                                message: 'Estágio não obrigatório deve ter duração mínima de 30 dias'
                            };
                        }
                        if (diasDuracao > 365) { // 1 ano
                            return {
                                valid: false,
                                message: 'Estágio não obrigatório deve ter duração máxima de 1 ano'
                            };
                        }
                        break;
                }
            }

            return {
                valid: true,
                message: 'Período válido'
            };
        } catch (error) {
            return {
                valid: false,
                message: 'Erro ao validar período: ' + error.message
            };
        }
    }

    /**
     * Valida carga horária do estágio
     * @param {number} cargaHoraria - Carga horária semanal
     * @param {string} tipoEstagio - Tipo do estágio
     * @returns {Object} Resultado da validação
     */
    validateCargaHoraria(cargaHoraria, tipoEstagio) {
        try {
            const carga = parseInt(cargaHoraria);
            
            if (isNaN(carga) || carga <= 0) {
                return {
                    valid: false,
                    message: 'Carga horária deve ser um número positivo'
                };
            }

            // Validar limites baseados no tipo
            switch (tipoEstagio) {
                case enums.tipoEstagio.OBRIGATORIO:
                    if (carga < 20) {
                        return {
                            valid: false,
                            message: 'Estágio obrigatório deve ter carga horária mínima de 20h semanais'
                        };
                    }
                    if (carga > 30) {
                        return {
                            valid: false,
                            message: 'Estágio obrigatório deve ter carga horária máxima de 30h semanais'
                        };
                    }
                    break;
                    
                case enums.tipoEstagio.NAO_OBRIGATORIO:
                    if (carga < 10) {
                        return {
                            valid: false,
                            message: 'Estágio não obrigatório deve ter carga horária mínima de 10h semanais'
                        };
                    }
                    if (carga > 40) {
                        return {
                            valid: false,
                            message: 'Estágio não obrigatório deve ter carga horária máxima de 40h semanais'
                        };
                    }
                    break;
            }

            return {
                valid: true,
                message: 'Carga horária válida'
            };
        } catch (error) {
            return {
                valid: false,
                message: 'Erro ao validar carga horária: ' + error.message
            };
        }
    }

    /**
     * Valida transição de status do estágio
     * @param {string} statusAtual - Status atual
     * @param {string} novoStatus - Novo status
     * @param {string} tipoUsuario - Tipo do usuário que está alterando
     * @returns {Object} Resultado da validação
     */
    validateTransicaoStatus(statusAtual, novoStatus, tipoUsuario) {
        try {
            // Definir transições permitidas
            const transicoesPermitidas = {
                [enums.statusEstagio.PENDENTE]: {
                    [enums.tipoAcesso.ADMINISTRADOR]: [enums.statusEstagio.EM_ANDAMENTO, enums.statusEstagio.CANCELADO],
                    [enums.tipoAcesso.ORIENTADOR]: [enums.statusEstagio.EM_ANDAMENTO, enums.statusEstagio.CANCELADO]
                },
                [enums.statusEstagio.EM_ANDAMENTO]: {
                    [enums.tipoAcesso.ADMINISTRADOR]: [enums.statusEstagio.CONCLUIDO, enums.statusEstagio.CANCELADO, enums.statusEstagio.SUSPENSO],
                    [enums.tipoAcesso.ORIENTADOR]: [enums.statusEstagio.CONCLUIDO, enums.statusEstagio.SUSPENSO],
                    [enums.tipoAcesso.ESTAGIARIO]: [enums.statusEstagio.CONCLUIDO]
                },
                [enums.statusEstagio.SUSPENSO]: {
                    [enums.tipoAcesso.ADMINISTRADOR]: [enums.statusEstagio.EM_ANDAMENTO, enums.statusEstagio.CANCELADO],
                    [enums.tipoAcesso.ORIENTADOR]: [enums.statusEstagio.EM_ANDAMENTO]
                },
                [enums.statusEstagio.CONCLUIDO]: {
                    [enums.tipoAcesso.ADMINISTRADOR]: [enums.statusEstagio.EM_ANDAMENTO] // Apenas para correções
                },
                [enums.statusEstagio.CANCELADO]: {
                    [enums.tipoAcesso.ADMINISTRADOR]: [enums.statusEstagio.PENDENTE] // Apenas para reativação
                }
            };

            const statusesPermitidos = transicoesPermitidas[statusAtual]?.[tipoUsuario] || [];
            
            if (!statusesPermitidos.includes(novoStatus)) {
                return {
                    valid: false,
                    message: `Transição de "${statusAtual}" para "${novoStatus}" não permitida para ${tipoUsuario}`
                };
            }

            return {
                valid: true,
                message: 'Transição de status válida'
            };
        } catch (error) {
            return {
                valid: false,
                message: 'Erro ao validar transição de status: ' + error.message
            };
        }
    }

    /**
     * Valida se usuário pode editar estágio
     * @param {Object} estagio - Dados do estágio
     * @param {Object} usuario - Dados do usuário
     * @returns {Object} Resultado da validação
     */
    validatePermissaoEdicao(estagio, usuario) {
        try {
            // Administrador pode editar qualquer estágio
            if (usuario.tipoacesso === enums.tipoAcesso.ADMINISTRADOR) {
                return {
                    valid: true,
                    message: 'Administrador pode editar qualquer estágio'
                };
            }

            // Orientador pode editar estágios que orienta
            if (usuario.tipoacesso === enums.tipoAcesso.ORIENTADOR) {
                if (estagio.id_orientador === usuario.id_pessoa) {
                    // Não pode editar estágios concluídos ou cancelados
                    if ([enums.statusEstagio.CONCLUIDO, enums.statusEstagio.CANCELADO].includes(estagio.status)) {
                        return {
                            valid: false,
                            message: 'Não é possível editar estágios concluídos ou cancelados'
                        };
                    }
                    return {
                        valid: true,
                        message: 'Orientador pode editar estágios que orienta'
                    };
                }
                return {
                    valid: false,
                    message: 'Orientador só pode editar estágios que orienta'
                };
            }

            // Estagiário pode editar apenas dados básicos do próprio estágio
            if (usuario.tipoacesso === enums.tipoAcesso.ESTAGIARIO) {
                if (estagio.id_estagiario === usuario.id_pessoa) {
                    if (estagio.status !== enums.statusEstagio.EM_ANDAMENTO) {
                        return {
                            valid: false,
                            message: 'Estagiário só pode editar estágios em andamento'
                        };
                    }
                    return {
                        valid: true,
                        message: 'Estagiário pode editar dados básicos do próprio estágio',
                        limitedEdit: true // Indica edição limitada
                    };
                }
                return {
                    valid: false,
                    message: 'Estagiário só pode editar o próprio estágio'
                };
            }

            // Empresa pode editar dados da empresa no estágio
            if (usuario.tipoacesso === enums.tipoAcesso.EMPRESA) {
                if (estagio.id_empresa === usuario.id_pessoa) {
                    if (estagio.status !== enums.statusEstagio.EM_ANDAMENTO) {
                        return {
                            valid: false,
                            message: 'Empresa só pode editar estágios em andamento'
                        };
                    }
                    return {
                        valid: true,
                        message: 'Empresa pode editar dados da empresa no estágio',
                        limitedEdit: true // Indica edição limitada
                    };
                }
                return {
                    valid: false,
                    message: 'Empresa só pode editar estágios da própria empresa'
                };
            }

            return {
                valid: false,
                message: 'Usuário não tem permissão para editar estágios'
            };
        } catch (error) {
            return {
                valid: false,
                message: 'Erro ao validar permissão de edição: ' + error.message
            };
        }
    }

    /**
     * Valida dados completos do estágio
     * @param {Object} dadosEstagio - Dados do estágio
     * @returns {Object} Resultado da validação
     */
    async validateEstagio(dadosEstagio) {
        const errors = [];

        try {
            // Validar orientador
            const validacaoOrientador = await this.validateOrientador(dadosEstagio.id_orientador);
            if (!validacaoOrientador.valid) {
                errors.push(validacaoOrientador.message);
            }

            // Validar estagiário
            const validacaoEstagiario = await this.validateEstagiario(dadosEstagio.id_estagiario);
            if (!validacaoEstagiario.valid) {
                errors.push(validacaoEstagiario.message);
            }

            // Validar empresa
            const validacaoEmpresa = await this.validateEmpresa(dadosEstagio.id_empresa);
            if (!validacaoEmpresa.valid) {
                errors.push(validacaoEmpresa.message);
            }

            // Validar período
            const validacaoPeriodo = this.validatePeriodoEstagio(
                dadosEstagio.data_inicio,
                dadosEstagio.data_fim,
                dadosEstagio.tipo_estagio
            );
            if (!validacaoPeriodo.valid) {
                errors.push(validacaoPeriodo.message);
            }

            // Validar carga horária
            const validacaoCarga = this.validateCargaHoraria(
                dadosEstagio.carga_horaria_semanal,
                dadosEstagio.tipo_estagio
            );
            if (!validacaoCarga.valid) {
                errors.push(validacaoCarga.message);
            }

            return {
                valid: errors.length === 0,
                message: errors.length === 0 ? 'Estágio válido' : 'Dados do estágio inválidos',
                errors
            };
        } catch (error) {
            return {
                valid: false,
                message: 'Erro ao validar estágio: ' + error.message,
                errors: [error.message]
            };
        }
    }
}

module.exports = BusinessValidator;