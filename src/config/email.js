/**
 * Configuração de Email
 * Centraliza todas as configurações relacionadas ao envio de emails
 */

const nodemailer = require('nodemailer');
const databaseConfig = require('./database');

class EmailConfig {
    constructor() {
        this.transporter = null;
        this.config = null;
    }

    /**
     * Carrega configurações de email do banco de dados
     * @returns {Promise<Object>}
     */
    async loadConfig() {
        if (this.config) {
            return this.config;
        }

        try {
            // Buscar o parâmetro "Conta e-mail" e seus valores
            const query = `
                SELECT pv.identificadorvalor, pv.valor 
                FROM parametro p
                INNER JOIN parametrovalor pv ON p.id_parametro = pv.id_parametro
                WHERE p.identificador = 'Conta e-mail'
            `;
            
            const params = await databaseConfig.all(query);
            
            this.config = {};
            
            // Mapear os valores para as chaves esperadas
            params.forEach(param => {
                const identificador = param.identificadorvalor;
                const valor = param.valor;
                
                // Mapear identificadores para as chaves esperadas
                switch(identificador) {
                    case 'Servidor SMTP':
                        this.config.email_host = valor;
                        break;
                    case 'Porta SMTP':
                        this.config.email_port = valor;
                        break;
                    case 'Usuário do E-mail':
                        this.config.email_user = valor;
                        break;
                    case 'Senha':
                        this.config.email_password = valor;
                        break;
                    case 'E-mail Remetente':
                        this.config.email_from = valor;
                        break;
                }
            });
            
            console.log('Configurações carregadas:', {
                host: this.config.email_host,
                port: this.config.email_port,
                user: this.config.email_user ? this.config.email_user.substring(0, 3) + '***' : 'não definido',
                from: this.config.email_from
            });
            
            return this.config;
        } catch (error) {
            console.error('Erro ao carregar configurações de email:', error);
            throw new Error('Não foi possível carregar as configurações de email');
        }
    }

    /**
     * Cria e configura o transporter do nodemailer
     * @returns {Promise<nodemailer.Transporter>}
     */
    async createTransporter() {
        if (this.transporter) {
            return this.transporter;
        }

        const config = await this.loadConfig();
        
        // Verificar se as configurações essenciais estão presentes
        if (!config.email_host || !config.email_user || !config.email_password) {
            throw new Error('Configurações de email incompletas. Verifique host, usuário e senha.');
        }

        const port = parseInt(config.email_port) || 587;
        
        this.transporter = nodemailer.createTransport({
            host: config.email_host,
            port: port,
            secure: port === 465, // true para porta 465, false para outras portas
            auth: {
                user: config.email_user,
                pass: config.email_password
            },
            tls: {
                // Não rejeitar conexões não autorizadas
                rejectUnauthorized: false
            },
            // Configurações específicas para Gmail e outros provedores
            pool: true, // Usar pool de conexões
            maxConnections: 1, // Limitar conexões simultâneas
            maxMessages: 3, // Limitar mensagens por conexão
            rateDelta: 20000, // Intervalo entre mensagens (20 segundos)
            rateLimit: 3 // Máximo 3 mensagens por rateDelta
        });

        return this.transporter;
    }

    /**
     * Envia um email
     * @param {string} destinatario - Email do destinatário
     * @param {string} assunto - Assunto do email
     * @param {string} conteudo - Conteúdo HTML do email
     * @param {Object} opcoes - Opções adicionais
     * @returns {Promise<Object>}
     */
    async enviarEmail(destinatario, assunto, conteudo, opcoes = {}) {
        try {
            const transporter = await this.createTransporter();
            const config = await this.loadConfig();
            
            // Configurar remetente com nome personalizado
            let fromAddress;
            if (opcoes.remetente) {
                fromAddress = opcoes.remetente;
            } else if (config.email_from && config.email_user) {
                // Usar formato "Nome <email>" se ambos estão disponíveis
                fromAddress = `${config.email_from} <${config.email_user}>`;
            } else {
                // Fallback para apenas o email
                fromAddress = config.email_from || config.email_user;
            }
            
            const mailOptions = {
                from: fromAddress,
                to: destinatario,
                subject: assunto,
                html: conteudo,
                ...opcoes // Permite sobrescrever opções
            };
            
            console.log('Enviando email com remetente:', fromAddress);
            
            const info = await transporter.sendMail(mailOptions);
            console.log('Email enviado com sucesso:', info.response);
            
            return {
                success: true,
                messageId: info.messageId,
                response: info.response
            };
        } catch (error) {
            console.error('Erro ao enviar email:', error);
            throw new Error(`Falha no envio do email: ${error.message}`);
        }
    }

    /**
     * Testa a configuração de email
     * @returns {Promise<boolean>}
     */
    async testarConfiguracao() {
        try {
            const transporter = await this.createTransporter();
            await transporter.verify();
            console.log('Configuração de email válida');
            return true;
        } catch (error) {
            console.error('Erro na configuração de email:', error);
            return false;
        }
    }

    /**
     * Recarrega as configurações (útil quando são atualizadas)
     */
    recarregarConfiguracoes() {
        this.config = null;
        this.transporter = null;
    }

    /**
     * Templates de email pré-definidos
     */
    static templates = {
        /**
         * Template para recuperação de senha
         * @param {string} nome - Nome do usuário
         * @param {string} linkRecuperacao - Link para recuperação
         * @returns {string}
         */
        recuperacaoSenha: (nome, linkRecuperacao) => `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Recuperação de Senha</h2>
                <p>Olá, <strong>${nome}</strong>!</p>
                <p>Você solicitou a recuperação de sua senha no CoordenAI - Gestão Inteligente.</p>
                <p>Clique no link abaixo para redefinir sua senha:</p>
                <p style="text-align: center; margin: 30px 0;">
                    <a href="${linkRecuperacao}" 
                       style="background-color: #007bff; color: white; padding: 12px 24px; 
                              text-decoration: none; border-radius: 4px; display: inline-block;">
                        Redefinir Senha
                    </a>
                </p>
                <p><small>Este link expira em 1 hora por motivos de segurança.</small></p>
                <p><small>Se você não solicitou esta recuperação, ignore este email.</small></p>
            </div>
        `,

        /**
         * Template para notificação de novo estágio
         * @param {string} nomeOrientador - Nome do orientador
         * @param {string} nomeEstagiario - Nome do estagiário
         * @param {string} linkSistema - Link para o sistema
         * @returns {string}
         */
        novoEstagio: (nomeOrientador, nomeEstagiario, linkSistema) => `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Novo Estágio Cadastrado</h2>
                <p>Olá, <strong>${nomeOrientador}</strong>!</p>
                <p>Um novo estágio foi cadastrado e você foi definido como orientador:</p>
                <ul>
                    <li><strong>Estagiário:</strong> ${nomeEstagiario}</li>
                </ul>
                <p>Acesse o sistema para mais detalhes:</p>
                <p style="text-align: center; margin: 30px 0;">
                    <a href="${linkSistema}" 
                       style="background-color: #28a745; color: white; padding: 12px 24px; 
                              text-decoration: none; border-radius: 4px; display: inline-block;">
                        Acessar Sistema
                    </a>
                </p>
            </div>
        `
    };
}

// Singleton instance
const emailConfig = new EmailConfig();

module.exports = emailConfig;