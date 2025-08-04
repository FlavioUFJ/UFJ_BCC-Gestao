/**
 * Middleware de Validação
 * Centraliza todas as validações de entrada do sistema
 */

const { validation } = require('../config');

/**
 * Classe para validação de dados
 */
class ValidationMiddleware {
    /**
     * Valida dados de pessoa
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     * @param {Function} next - Next middleware
     */
    static validatePessoa(req, res, next) {
        const { nome, email, telefone, cep, tipoacesso } = req.body;
        const errors = [];

        // Validar nome
        if (!nome || nome.trim().length < 2) {
            errors.push('Nome deve ter pelo menos 2 caracteres');
        }
        if (nome && nome.length > 100) {
            errors.push('Nome deve ter no máximo 100 caracteres');
        }

        // Validar email
        if (!email) {
            errors.push('Email é obrigatório');
        } else if (!ValidationMiddleware.isValidEmail(email)) {
            errors.push('Email deve ter um formato válido');
        }

        // Validar telefone (opcional)
        if (telefone && !ValidationMiddleware.isValidPhone(telefone)) {
            errors.push('Telefone deve ter um formato válido');
        }

        // Validar CEP (opcional)
        if (cep && !ValidationMiddleware.isValidCEP(cep)) {
            errors.push('CEP deve ter um formato válido (00000-000)');
        }

        // Validar tipo de acesso
        if (!tipoacesso) {
            errors.push('Tipo de acesso é obrigatório');
        }

        if (errors.length > 0) {
            return ValidationMiddleware.handleValidationErrors(req, res, errors);
        }

        next();
    }

    /**
     * Valida dados de estágio
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     * @param {Function} next - Next middleware
     */
    static validateEstagio(req, res, next) {
        const {
            id_estagiario,
            id_orientador,
            id_empresa,
            tipo_estagio,
            data_inicio,
            data_fim,
            carga_horaria_semanal,
            atividades_desenvolvidas
        } = req.body;
        const errors = [];

        // Validar IDs obrigatórios
        if (!id_estagiario || !ValidationMiddleware.isValidId(id_estagiario)) {
            errors.push('Estagiário é obrigatório');
        }
        if (!id_orientador || !ValidationMiddleware.isValidId(id_orientador)) {
            errors.push('Orientador é obrigatório');
        }
        if (!id_empresa || !ValidationMiddleware.isValidId(id_empresa)) {
            errors.push('Empresa é obrigatória');
        }

        // Validar tipo de estágio
        if (!tipo_estagio) {
            errors.push('Tipo de estágio é obrigatório');
        }

        // Validar datas
        if (!data_inicio) {
            errors.push('Data de início é obrigatória');
        } else if (!ValidationMiddleware.isValidDate(data_inicio)) {
            errors.push('Data de início deve ter um formato válido');
        }

        if (data_fim && !ValidationMiddleware.isValidDate(data_fim)) {
            errors.push('Data de fim deve ter um formato válido');
        }

        // Validar se data de fim é posterior à data de início
        if (data_inicio && data_fim) {
            const inicio = new Date(data_inicio);
            const fim = new Date(data_fim);
            if (fim <= inicio) {
                errors.push('Data de fim deve ser posterior à data de início');
            }
        }

        // Validar carga horária
        if (carga_horaria_semanal) {
            const carga = parseInt(carga_horaria_semanal);
            if (isNaN(carga) || carga < 1 || carga > 40) {
                errors.push('Carga horária semanal deve ser entre 1 e 40 horas');
            }
        }

        // Validar atividades
        if (!atividades_desenvolvidas || atividades_desenvolvidas.trim().length < 10) {
            errors.push('Atividades desenvolvidas devem ter pelo menos 10 caracteres');
        }

        if (errors.length > 0) {
            return ValidationMiddleware.handleValidationErrors(req, res, errors);
        }

        next();
    }

    /**
     * Valida dados de login
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     * @param {Function} next - Next middleware
     */
    static validateLogin(req, res, next) {
        const { usuario, senha } = req.body;
        const errors = [];

        // Validar usuário
        if (!usuario || usuario.trim().length < 3) {
            errors.push('Usuário deve ter pelo menos 3 caracteres');
        }

        // Validar senha
        if (!senha || senha.length < 6) {
            errors.push('Senha deve ter pelo menos 6 caracteres');
        }

        if (errors.length > 0) {
            return ValidationMiddleware.handleValidationErrors(req, res, errors);
        }

        next();
    }

    /**
     * Valida alteração de senha
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     * @param {Function} next - Next middleware
     */
    static validatePasswordChange(req, res, next) {
        const { senhaAtual, novaSenha, confirmarSenha } = req.body;
        const errors = [];

        // Validar senha atual
        if (!senhaAtual) {
            errors.push('Senha atual é obrigatória');
        }

        // Validar nova senha
        if (!novaSenha || novaSenha.length < 6) {
            errors.push('Nova senha deve ter pelo menos 6 caracteres');
        }

        // Validar confirmação de senha
        if (!confirmarSenha) {
            errors.push('Confirmação de senha é obrigatória');
        } else if (novaSenha !== confirmarSenha) {
            errors.push('Nova senha e confirmação devem ser iguais');
        }

        // Validar se nova senha é diferente da atual
        if (senhaAtual && novaSenha && senhaAtual === novaSenha) {
            errors.push('Nova senha deve ser diferente da senha atual');
        }

        if (errors.length > 0) {
            return ValidationMiddleware.handleValidationErrors(req, res, errors);
        }

        next();
    }

    /**
     * Valida upload de arquivo
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     * @param {Function} next - Next middleware
     */
    static validateFileUpload(allowedTypes = [], maxSize = null) {
        return (req, res, next) => {
            const errors = [];

            if (!req.file && !req.files) {
                errors.push('Nenhum arquivo foi enviado');
                return ValidationMiddleware.handleValidationErrors(req, res, errors);
            }

            const files = req.files || [req.file];

            for (const file of files) {
                // Validar tipo de arquivo
                if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
                    errors.push(`Tipo de arquivo não permitido: ${file.mimetype}`);
                }

                // Validar tamanho do arquivo
                if (maxSize && file.size > maxSize) {
                    errors.push(`Arquivo muito grande: ${file.originalname}`);
                }
            }

            if (errors.length > 0) {
                return ValidationMiddleware.handleValidationErrors(req, res, errors);
            }

            next();
        };
    }

    /**
     * Sanitiza dados de entrada
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     * @param {Function} next - Next middleware
     */
    static sanitizeInput(req, res, next) {
        // Sanitizar strings no body
        if (req.body && typeof req.body === 'object') {
            req.body = ValidationMiddleware.sanitizeObject(req.body);
        }

        // Sanitizar query parameters
        if (req.query && typeof req.query === 'object') {
            req.query = ValidationMiddleware.sanitizeObject(req.query);
        }

        next();
    }

    /**
     * Sanitiza um objeto recursivamente
     * @param {Object} obj - Objeto a ser sanitizado
     * @returns {Object} Objeto sanitizado
     */
    static sanitizeObject(obj) {
        const sanitized = {};
        
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                // Remover tags HTML e caracteres perigosos
                sanitized[key] = value
                    .replace(/<script[^>]*>.*?<\/script>/gi, '')
                    .replace(/<[^>]*>/g, '')
                    .trim();
            } else if (typeof value === 'object' && value !== null) {
                sanitized[key] = ValidationMiddleware.sanitizeObject(value);
            } else {
                sanitized[key] = value;
            }
        }
        
        return sanitized;
    }

    /**
     * Valida formato de email
     * @param {string} email - Email a ser validado
     * @returns {boolean} True se válido
     */
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Valida formato de telefone
     * @param {string} phone - Telefone a ser validado
     * @returns {boolean} True se válido
     */
    static isValidPhone(phone) {
        const phoneRegex = /^\(?\d{2}\)?[\s-]?\d{4,5}[\s-]?\d{4}$/;
        return phoneRegex.test(phone.replace(/\D/g, ''));
    }

    /**
     * Valida formato de CEP
     * @param {string} cep - CEP a ser validado
     * @returns {boolean} True se válido
     */
    static isValidCEP(cep) {
        const cepRegex = /^\d{5}-?\d{3}$/;
        return cepRegex.test(cep);
    }

    /**
     * Valida se é um ID válido
     * @param {*} id - ID a ser validado
     * @returns {boolean} True se válido
     */
    static isValidId(id) {
        return !isNaN(parseInt(id)) && parseInt(id) > 0;
    }

    /**
     * Valida formato de data
     * @param {string} date - Data a ser validada
     * @returns {boolean} True se válida
     */
    static isValidDate(date) {
        const parsedDate = new Date(date);
        return !isNaN(parsedDate.getTime());
    }

    /**
     * Trata erros de validação
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     * @param {Array} errors - Array de erros
     */
    static handleValidationErrors(req, res, errors) {
        // Para requisições AJAX
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(400).json({
                success: false,
                message: 'Dados inválidos',
                errors
            });
        }

        // Para requisições normais, redirecionar com erro
        const errorMessage = errors.join('; ');
        const referer = req.get('Referer') || '/';
        res.redirect(`${referer}?error=${encodeURIComponent(errorMessage)}`);
    }

    /**
     * Middleware para validar paginação
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     * @param {Function} next - Next middleware
     */
    static validatePagination(req, res, next) {
        const { page, limit } = req.query;
        
        if (page) {
            const pageNum = parseInt(page);
            if (isNaN(pageNum) || pageNum < 1) {
                req.query.page = 1;
            } else if (pageNum > 1000) {
                req.query.page = 1000;
            }
        }
        
        if (limit) {
            const limitNum = parseInt(limit);
            if (isNaN(limitNum) || limitNum < 1) {
                req.query.limit = validation.pagination.defaultLimit;
            } else if (limitNum > validation.pagination.maxLimit) {
                req.query.limit = validation.pagination.maxLimit;
            }
        }
        
        next();
    }
}

module.exports = ValidationMiddleware;