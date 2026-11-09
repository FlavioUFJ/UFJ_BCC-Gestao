/**
 * Validador de Regras de Negócio
 * Implementa validações específicas das regras de negócio do sistema
 */

const Pessoa = require('../models/Pessoa');
// const Estagio = require('../models/Estagio'); // Removido - Campo de Estágio
const { enums } = require('../config');
const Helpers = require('../utils/helpers');

/**
 * Classe para validações de regras de negócio
 */
class BusinessValidator {
    constructor() {
        this.pessoaModel = new Pessoa();
        // this.estagioModel = new Estagio(); // Removido - Campo de Estágio
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

            if (pessoa.nivelacesso !== enums.nivelAcesso.ORIENTADOR) {
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

            // Verificação de sobrecarga removida - Campo de Estágio

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

            if (pessoa.nivelacesso !== enums.nivelAcesso.ESTAGIARIO) {
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

            // Verificação de estágio ativo removida - Campo de Estágio

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

            if (pessoa.nivelacesso !== enums.nivelAcesso.EMPRESA) {
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

    // validatePeriodoEstagio removido - Campo de Estágio

    // validateCargaHoraria removido - Campo de Estágio

    // validateTransicaoStatus removido - Campo de Estágio

    // validatePermissaoEdicao removido - Campo de Estágio

    // validateEstagio removido - Campo de Estágio
}

module.exports = BusinessValidator;