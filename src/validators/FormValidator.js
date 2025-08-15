/**
 * Validador de Formulários
 * Implementa validações específicas para formulários e entrada de dados
 */

const Helpers = require('../utils/helpers');
const { enums } = require('../config');

/**
 * Classe para validações de formulários
 */
class FormValidator {
    constructor() {
        this.errors = [];
        this.warnings = [];
    }

    /**
     * Limpa erros e avisos
     */
    clear() {
        this.errors = [];
        this.warnings = [];
    }

    /**
     * Adiciona erro
     * @param {string} field - Campo com erro
     * @param {string} message - Mensagem de erro
     */
    addError(field, message) {
        this.errors.push({ field, message });
    }

    /**
     * Adiciona aviso
     * @param {string} field - Campo com aviso
     * @param {string} message - Mensagem de aviso
     */
    addWarning(field, message) {
        this.warnings.push({ field, message });
    }

    /**
     * Verifica se há erros
     * @returns {boolean}
     */
    hasErrors() {
        return this.errors.length > 0;
    }

    /**
     * Verifica se há avisos
     * @returns {boolean}
     */
    hasWarnings() {
        return this.warnings.length > 0;
    }

    /**
     * Retorna todos os erros
     * @returns {Array}
     */
    getErrors() {
        return this.errors;
    }

    /**
     * Retorna todos os avisos
     * @returns {Array}
     */
    getWarnings() {
        return this.warnings;
    }

    /**
     * Retorna primeiro erro de um campo
     * @param {string} field - Nome do campo
     * @returns {string|null}
     */
    getFieldError(field) {
        const error = this.errors.find(e => e.field === field);
        return error ? error.message : null;
    }

    /**
     * Valida campo obrigatório
     * @param {string} field - Nome do campo
     * @param {*} value - Valor do campo
     * @param {string} label - Label do campo
     * @returns {boolean}
     */
    required(field, value, label = field) {
        if (Helpers.isEmpty(value)) {
            this.addError(field, `${label} é obrigatório`);
            return false;
        }
        return true;
    }

    /**
     * Valida tamanho mínimo
     * @param {string} field - Nome do campo
     * @param {string} value - Valor do campo
     * @param {number} min - Tamanho mínimo
     * @param {string} label - Label do campo
     * @returns {boolean}
     */
    minLength(field, value, min, label = field) {
        if (value && value.length < min) {
            this.addError(field, `${label} deve ter pelo menos ${min} caracteres`);
            return false;
        }
        return true;
    }

    /**
     * Valida tamanho máximo
     * @param {string} field - Nome do campo
     * @param {string} value - Valor do campo
     * @param {number} max - Tamanho máximo
     * @param {string} label - Label do campo
     * @returns {boolean}
     */
    maxLength(field, value, max, label = field) {
        if (value && value.length > max) {
            this.addError(field, `${label} deve ter no máximo ${max} caracteres`);
            return false;
        }
        return true;
    }

    /**
     * Valida valor mínimo
     * @param {string} field - Nome do campo
     * @param {number} value - Valor do campo
     * @param {number} min - Valor mínimo
     * @param {string} label - Label do campo
     * @returns {boolean}
     */
    minValue(field, value, min, label = field) {
        const num = parseFloat(value);
        if (!isNaN(num) && num < min) {
            this.addError(field, `${label} deve ser pelo menos ${min}`);
            return false;
        }
        return true;
    }

    /**
     * Valida valor máximo
     * @param {string} field - Nome do campo
     * @param {number} value - Valor do campo
     * @param {number} max - Valor máximo
     * @param {string} label - Label do campo
     * @returns {boolean}
     */
    maxValue(field, value, max, label = field) {
        const num = parseFloat(value);
        if (!isNaN(num) && num > max) {
            this.addError(field, `${label} deve ser no máximo ${max}`);
            return false;
        }
        return true;
    }

    /**
     * Valida formato de email
     * @param {string} field - Nome do campo
     * @param {string} value - Valor do campo
     * @param {string} label - Label do campo
     * @returns {boolean}
     */
    email(field, value, label = field) {
        if (value && !Helpers.isValidEmail(value)) {
            this.addError(field, `${label} deve ter um formato válido`);
            return false;
        }
        return true;
    }

    /**
     * Valida formato de CPF
     * @param {string} field - Nome do campo
     * @param {string} value - Valor do campo
     * @param {string} label - Label do campo
     * @returns {boolean}
     */
    cpf(field, value, label = field) {
        if (value && !Helpers.isValidCPF(value)) {
            this.addError(field, `${label} deve ter um formato válido`);
            return false;
        }
        return true;
    }

    /**
     * Valida formato de CNPJ
     * @param {string} field - Nome do campo
     * @param {string} value - Valor do campo
     * @param {string} label - Label do campo
     * @returns {boolean}
     */
    cnpj(field, value, label = field) {
        if (value && !Helpers.isValidCNPJ(value)) {
            this.addError(field, `${label} deve ter um formato válido`);
            return false;
        }
        return true;
    }

    /**
     * Valida formato de telefone
     * @param {string} field - Nome do campo
     * @param {string} value - Valor do campo
     * @param {string} label - Label do campo
     * @returns {boolean}
     */
    phone(field, value, label = field) {
        if (value && !Helpers.isValidPhone(value)) {
            this.addError(field, `${label} deve ter um formato válido`);
            return false;
        }
        return true;
    }

    /**
     * Valida formato de CEP
     * @param {string} field - Nome do campo
     * @param {string} value - Valor do campo
     * @param {string} label - Label do campo
     * @returns {boolean}
     */
    cep(field, value, label = field) {
        if (value && !Helpers.isValidCEP(value)) {
            this.addError(field, `${label} deve ter um formato válido`);
            return false;
        }
        return true;
    }

    /**
     * Valida formato de data
     * @param {string} field - Nome do campo
     * @param {string} value - Valor do campo
     * @param {string} label - Label do campo
     * @returns {boolean}
     */
    date(field, value, label = field) {
        if (value && !Helpers.isValidDate(value)) {
            this.addError(field, `${label} deve ter um formato de data válido`);
            return false;
        }
        return true;
    }

    /**
     * Valida se data é futura
     * @param {string} field - Nome do campo
     * @param {string} value - Valor do campo
     * @param {string} label - Label do campo
     * @returns {boolean}
     */
    futureDate(field, value, label = field) {
        if (value) {
            const date = new Date(value);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (date <= today) {
                this.addError(field, `${label} deve ser uma data futura`);
                return false;
            }
        }
        return true;
    }

    /**
     * Valida se data é passada
     * @param {string} field - Nome do campo
     * @param {string} value - Valor do campo
     * @param {string} label - Label do campo
     * @returns {boolean}
     */
    pastDate(field, value, label = field) {
        if (value) {
            const date = new Date(value);
            const today = new Date();
            today.setHours(23, 59, 59, 999);
            
            if (date >= today) {
                this.addError(field, `${label} deve ser uma data passada`);
                return false;
            }
        }
        return true;
    }

    /**
     * Valida se data está após outra data
     * @param {string} field - Nome do campo
     * @param {string} value - Valor do campo
     * @param {string} afterDate - Data de referência
     * @param {string} label - Label do campo
     * @param {string} afterLabel - Label da data de referência
     * @returns {boolean}
     */
    dateAfter(field, value, afterDate, label = field, afterLabel = 'data de referência') {
        if (value && afterDate) {
            const date1 = new Date(value);
            const date2 = new Date(afterDate);
            
            // Validar se as datas são válidas
            if (isNaN(date1.getTime()) || isNaN(date2.getTime())) {
                this.addError(field, `${label} ou ${afterLabel} contém data inválida`);
                return false;
            }
            
            if (date1.getTime() <= date2.getTime()) {
                this.addError(field, `${label} deve ser posterior à ${afterLabel}`);
                return false;
            }
        }
        return true;
    }

    /**
     * Valida se data está antes de outra data
     * @param {string} field - Nome do campo
     * @param {string} value - Valor do campo
     * @param {string} beforeDate - Data de referência
     * @param {string} label - Label do campo
     * @param {string} beforeLabel - Label da data de referência
     * @returns {boolean}
     */
    dateBefore(field, value, beforeDate, label = field, beforeLabel = 'data de referência') {
        if (value && beforeDate) {
            const date1 = new Date(value);
            const date2 = new Date(beforeDate);
            
            // Validar se as datas são válidas
            if (isNaN(date1.getTime()) || isNaN(date2.getTime())) {
                this.addError(field, `${label} ou ${beforeLabel} contém data inválida`);
                return false;
            }
            
            if (date1.getTime() >= date2.getTime()) {
                this.addError(field, `${label} deve ser anterior à ${beforeLabel}`);
                return false;
            }
        }
        return true;
    }

    /**
     * Valida se valor está em lista de opções
     * @param {string} field - Nome do campo
     * @param {*} value - Valor do campo
     * @param {Array} options - Lista de opções válidas
     * @param {string} label - Label do campo
     * @returns {boolean}
     */
    inList(field, value, options, label = field) {
        if (value && !options.includes(value)) {
            this.addError(field, `${label} deve ser uma das opções válidas`);
            return false;
        }
        return true;
    }

    /**
     * Valida formato de URL
     * @param {string} field - Nome do campo
     * @param {string} value - Valor do campo
     * @param {string} label - Label do campo
     * @returns {boolean}
     */
    url(field, value, label = field) {
        if (value) {
            try {
                new URL(value);
            } catch {
                this.addError(field, `${label} deve ter um formato de URL válido`);
                return false;
            }
        }
        return true;
    }

    /**
     * Valida se valor é numérico
     * @param {string} field - Nome do campo
     * @param {*} value - Valor do campo
     * @param {string} label - Label do campo
     * @returns {boolean}
     */
    numeric(field, value, label = field) {
        if (value && isNaN(parseFloat(value))) {
            this.addError(field, `${label} deve ser um número válido`);
            return false;
        }
        return true;
    }

    /**
     * Valida se valor é inteiro
     * @param {string} field - Nome do campo
     * @param {*} value - Valor do campo
     * @param {string} label - Label do campo
     * @returns {boolean}
     */
    integer(field, value, label = field) {
        if (value && (!Number.isInteger(parseFloat(value)) || parseFloat(value) !== parseInt(value))) {
            this.addError(field, `${label} deve ser um número inteiro`);
            return false;
        }
        return true;
    }

    /**
     * Valida confirmação de senha
     * @param {string} field - Nome do campo
     * @param {string} value - Valor do campo
     * @param {string} passwordValue - Valor da senha original
     * @param {string} label - Label do campo
     * @returns {boolean}
     */
    confirmPassword(field, value, passwordValue, label = field) {
        if (value !== passwordValue) {
            this.addError(field, `${label} deve ser igual à senha`);
            return false;
        }
        return true;
    }

    /**
     * Valida força da senha
     * @param {string} field - Nome do campo
     * @param {string} value - Valor do campo
     * @param {string} label - Label do campo
     * @returns {boolean}
     */
    strongPassword(field, value, label = field) {
        if (value) {
            const minLength = 8;
            const hasUpper = /[A-Z]/.test(value);
            const hasLower = /[a-z]/.test(value);
            const hasNumber = /\d/.test(value);
            const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(value);
            
            if (value.length < minLength) {
                this.addError(field, `${label} deve ter pelo menos ${minLength} caracteres`);
                return false;
            }
            
            if (!hasUpper) {
                this.addError(field, `${label} deve conter pelo menos uma letra maiúscula`);
                return false;
            }
            
            if (!hasLower) {
                this.addError(field, `${label} deve conter pelo menos uma letra minúscula`);
                return false;
            }
            
            if (!hasNumber) {
                this.addError(field, `${label} deve conter pelo menos um número`);
                return false;
            }
            
            if (!hasSpecial) {
                this.addWarning(field, `${label} recomenda-se incluir caracteres especiais para maior segurança`);
            }
        }
        return true;
    }

    /**
     * Valida arquivo upload
     * @param {string} field - Nome do campo
     * @param {Object} file - Objeto do arquivo
     * @param {Object} options - Opções de validação
     * @param {string} label - Label do campo
     * @returns {boolean}
     */
    file(field, file, options = {}, label = field) {
        if (!file) {
            if (options.required) {
                this.addError(field, `${label} é obrigatório`);
                return false;
            }
            return true;
        }

        // Validar tamanho
        if (options.maxSize && file.size > options.maxSize) {
            const maxSizeMB = Math.round(options.maxSize / (1024 * 1024));
            this.addError(field, `${label} deve ter no máximo ${maxSizeMB}MB`);
            return false;
        }

        // Validar tipo
        if (options.allowedTypes && !options.allowedTypes.includes(file.mimetype)) {
            this.addError(field, `${label} deve ser um dos tipos: ${options.allowedTypes.join(', ')}`);
            return false;
        }

        // Validar extensão
        if (options.allowedExtensions) {
            const ext = file.originalname.split('.').pop().toLowerCase();
            if (!options.allowedExtensions.includes(ext)) {
                this.addError(field, `${label} deve ter uma das extensões: ${options.allowedExtensions.join(', ')}`);
                return false;
            }
        }

        return true;
    }

    /**
     * Valida formulário de pessoa
     * @param {Object} data - Dados do formulário
     * @param {boolean} isEdit - Se é edição
     * @returns {boolean}
     */
    validatePessoa(data, isEdit = false) {
        this.clear();

        // Campos obrigatórios
        this.required('nome', data.nome, 'Nome');
        this.required('email', data.email, 'E-mail');
        this.required('nivelacesso', data.nivelacesso, 'Nível de Acesso');

        // Validações de formato
        this.email('email', data.email, 'E-mail');
        this.maxLength('nome', data.nome, 100, 'Nome');
        this.maxLength('email', data.email, 100, 'E-mail');

        // Validar tipo de acesso
        const tiposValidos = Object.values(enums.nivelAcesso);
        this.inList('nivelacesso', data.nivelacesso, tiposValidos, 'Nível de Acesso');

        // Validar documento baseado no tipo
        if (data.nivelacesso === enums.nivelAcesso.EMPRESA) {
            if (data.documento) {
                this.cnpj('documento', data.documento, 'CNPJ');
            }
        } else {
            if (data.documento) {
                this.cpf('documento', data.documento, 'CPF');
            }
        }

        // Validar telefone se fornecido
        if (data.telefone) {
            this.phone('telefone', data.telefone, 'Telefone');
        }

        // Validar CEP se fornecido
        if (data.cep) {
            this.cep('cep', data.cep, 'CEP');
        }

        // Validar senha (obrigatória apenas na criação)
        if (!isEdit) {
            this.required('senha', data.senha, 'Senha');
            this.strongPassword('senha', data.senha, 'Senha');
            
            if (data.confirmar_senha) {
                this.confirmPassword('confirmar_senha', data.confirmar_senha, data.senha, 'Confirmação de Senha');
            }
        } else if (data.senha) {
            // Se fornecida na edição, validar
            this.strongPassword('senha', data.senha, 'Senha');
            
            if (data.confirmar_senha) {
                this.confirmPassword('confirmar_senha', data.confirmar_senha, data.senha, 'Confirmação de Senha');
            }
        }

        return !this.hasErrors();
    }

    // validateEstagio removido - Campo de Estágio

    /**
     * Valida formulário de login
     * @param {Object} data - Dados do formulário
     * @returns {boolean}
     */
    validateLogin(data) {
        this.clear();

        this.required('email', data.email, 'E-mail');
        this.required('senha', data.senha, 'Senha');
        this.email('email', data.email, 'E-mail');

        return !this.hasErrors();
    }

    /**
     * Retorna resultado da validação
     * @returns {Object}
     */
    getResult() {
        return {
            valid: !this.hasErrors(),
            errors: this.getErrors(),
            warnings: this.getWarnings(),
            hasErrors: this.hasErrors(),
            hasWarnings: this.hasWarnings()
        };
    }
}

module.exports = FormValidator;