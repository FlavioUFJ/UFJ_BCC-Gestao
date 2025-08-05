const Parametro = require('../models/Parametro');
const { validationResult } = require('express-validator');

/**
 * Controller para gerenciamento de parâmetros do sistema
 */
class ParametroController {
    constructor() {
        this.parametroModel = new Parametro();
    }

    /**
     * Lista todos os parâmetros
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async index(req, res) {
        try {
            const parametros = await this.parametroModel.findAll();
            
            res.render('admin/parametro', {
                title: 'Gerenciar Parâmetros',
                parametros: parametros.data || [],
                user: req.session.user,
                currentPage: 'parametro'
            });
        } catch (error) {
            console.error('Erro ao listar parâmetros:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    /**
     * Busca parâmetro por identificador (API)
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async buscar(req, res) {
        try {
            console.log('DEBUG: Iniciando busca de parâmetro');
            const { identificador } = req.query;
            console.log('DEBUG: Identificador recebido:', identificador);
            
            if (!identificador) {
                console.log('DEBUG: Identificador não fornecido');
                return res.status(400).json({
                    success: false,
                    message: 'Identificador é obrigatório'
                });
            }

            console.log('DEBUG: Chamando findWithValoresByIdentificador');
            const parametro = await this.parametroModel.findWithValoresByIdentificador(identificador);
            console.log('DEBUG: Resultado da busca:', parametro);
            
            if (!parametro) {
                return res.status(404).json({
                    success: false,
                    message: 'Parâmetro não encontrado'
                });
            }

            // Converter valores para o formato esperado pelo frontend
            const valoresFormatados = {};
            if (parametro.valores && parametro.valores.length > 0) {
                parametro.valores.forEach(valor => {
                    if (valor.identificadorvalor && valor.valor) {
                        valoresFormatados[valor.identificadorvalor] = valor.valor;
                    }
                });
            }

            res.json({
                success: true,
                parametro: {
                    id_parametro: parametro.id_parametro,
                    identificador: parametro.identificador,
                    descricao: parametro.descricao,
                    modulo: parametro.modulo,
                    quantidadevalor: parametro.quantidadevalor,
                    valores: valoresFormatados
                }
            });
        } catch (error) {
            console.error('Erro ao buscar parâmetro:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    /**
     * Obtém um parâmetro específico (API)
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async get(req, res) {
        try {
            const { id } = req.params;
            
            const parametro = await this.parametroModel.findById(id);
            
            if (!parametro) {
                return res.status(404).json({
                    success: false,
                    message: 'Parâmetro não encontrado'
                });
            }

            const valores = await this.parametroModel.findValores(id);

            res.json({
                success: true,
                parametro: {
                    ...parametro,
                    valores
                }
            });
        } catch (error) {
            console.error('Erro ao obter parâmetro:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    /**
     * Cria um novo parâmetro (API)
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async create(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Dados inválidos',
                    errors: errors.array()
                });
            }

            const { identificador, descricao, modulo, quantidadevalor } = req.body;
            
            // Verificar se já existe parâmetro com o mesmo identificador
            const existente = await this.parametroModel.findByIdentificador(identificador);
            if (existente) {
                return res.status(400).json({
                    success: false,
                    message: 'Já existe um parâmetro com este identificador'
                });
            }

            const parametro = await this.parametroModel.create({
                identificador,
                descricao,
                modulo,
                quantidadevalor: parseInt(quantidadevalor)
            });

            res.status(201).json({
                success: true,
                message: 'Parâmetro criado com sucesso',
                parametro
            });
        } catch (error) {
            console.error('Erro ao criar parâmetro:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    /**
     * Atualiza um parâmetro (API)
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async update(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Dados inválidos',
                    errors: errors.array()
                });
            }

            const { id_parametro, identificador, descricao, modulo, quantidadevalor } = req.body;
            
            // Verificar se o parâmetro existe
            const parametroExistente = await this.parametroModel.findById(id_parametro);
            if (!parametroExistente) {
                return res.status(404).json({
                    success: false,
                    message: 'Parâmetro não encontrado'
                });
            }

            // Verificar se já existe outro parâmetro com o mesmo identificador
            const outroParametro = await this.parametroModel.findByIdentificador(identificador);
            if (outroParametro && outroParametro.id_parametro != id_parametro) {
                return res.status(400).json({
                    success: false,
                    message: 'Já existe outro parâmetro com este identificador'
                });
            }

            const sucesso = await this.parametroModel.update(id_parametro, {
                identificador,
                descricao,
                modulo,
                quantidadevalor: parseInt(quantidadevalor)
            });

            if (sucesso) {
                res.json({
                    success: true,
                    message: 'Parâmetro atualizado com sucesso'
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Nenhuma alteração foi feita'
                });
            }
        } catch (error) {
            console.error('Erro ao atualizar parâmetro:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    /**
     * Exclui um parâmetro (API)
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async delete(req, res) {
        try {
            const { id } = req.params;
            
            const parametro = await this.parametroModel.findById(id);
            if (!parametro) {
                return res.status(404).json({
                    success: false,
                    message: 'Parâmetro não encontrado'
                });
            }

            const sucesso = await this.parametroModel.delete(id);

            if (sucesso) {
                res.json({
                    success: true,
                    message: 'Parâmetro excluído com sucesso'
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Erro ao excluir parâmetro'
                });
            }
        } catch (error) {
            console.error('Erro ao excluir parâmetro:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    /**
     * Cria um valor para um parâmetro (API)
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async createValor(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Dados inválidos',
                    errors: errors.array()
                });
            }

            const { parametroId, identificadorvalor, valor } = req.body;
            
            // Verificar se o parâmetro existe
            const parametro = await this.parametroModel.findById(parametroId);
            if (!parametro) {
                return res.status(404).json({
                    success: false,
                    message: 'Parâmetro não encontrado'
                });
            }

            const novoValor = await this.parametroModel.createValor({
                parametroId,
                identificadorvalor,
                valor
            });

            res.status(201).json({
                success: true,
                message: 'Valor criado com sucesso',
                valor: novoValor
            });
        } catch (error) {
            console.error('Erro ao criar valor:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    /**
     * Atualiza um valor de parâmetro (API)
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async updateValor(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Dados inválidos',
                    errors: errors.array()
                });
            }

            const { id } = req.params;
            const { identificadorvalor, valor } = req.body;

            const sucesso = await this.parametroModel.updateValor(id, {
                identificadorvalor,
                valor
            });

            if (sucesso) {
                res.json({
                    success: true,
                    message: 'Valor atualizado com sucesso'
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Nenhuma alteração foi feita'
                });
            }
        } catch (error) {
            console.error('Erro ao atualizar valor:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    /**
     * Exclui um valor de parâmetro (API)
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async deleteValor(req, res) {
        try {
            const { id } = req.params;

            const sucesso = await this.parametroModel.deleteValor(id);

            if (sucesso) {
                res.json({
                    success: true,
                    message: 'Valor excluído com sucesso'
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Erro ao excluir valor'
                });
            }
        } catch (error) {
            console.error('Erro ao excluir valor:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }
}

module.exports = ParametroController;