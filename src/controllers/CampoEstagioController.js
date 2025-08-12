/**
 * Controller de Campo de Estágio
 * Gerencia operações relacionadas aos campos de estágio
 */

const databaseConfig = require('../config/database');
const puppeteer = require('puppeteer');
const CampoEstagioService = require('../services/CampoEstagioService');

class CampoEstagioController {
    constructor() {
        this.campoEstagioService = new CampoEstagioService();
    }

    /**
     * Gera PDF do campo de estágio
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async gerarPDF(req, res) {
        try {
            const { id } = req.params;
            
            // Buscar dados completos do campo de estágio
            const campo = await databaseConfig.get(`
                SELECT 
                    ce.*,
                    pe.nome as nome_estagiario,
                    pe.email as email_estagiario,
                    pe.telefone as telefone_estagiario,
                    po.nome as nome_orientador,
                    po.email as email_orientador,
                    ps.nome as nome_supervisor,
                    ps.email as email_supervisor,
                    pc.nome as nome_concedente,
                    pc.email as email_concedente,
                    pc.telefone as telefone_concedente,
                    pcr.nome as nome_curso
                FROM campo_estagio ce
                LEFT JOIN pessoa pe ON ce.id_pessoa_estagiario = pe.id_pessoa
                LEFT JOIN pessoa po ON ce.id_pessoa_orientador = po.id_pessoa
                LEFT JOIN pessoa ps ON ce.id_pessoa_supervisor = ps.id_pessoa
                LEFT JOIN pessoa pc ON ce.id_pessoa_concedente = pc.id_pessoa
                LEFT JOIN pessoa pcr ON ce.id_pessoa_curso = pcr.id_pessoa
                WHERE ce.id_campo_estagio = ?
            `, [id]);
            
            if (!campo) {
                return res.status(404).json({
                    success: false,
                    message: 'Campo de estágio não encontrado'
                });
            }
            
            // Renderizar template HTML para PDF
            const htmlContent = await this.renderPDFTemplate(campo);
            
            // Gerar PDF usando Puppeteer
            const browser = await puppeteer.launch({
                headless: "new",
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            
            const page = await browser.newPage();
            await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
            
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '20mm',
                    right: '15mm',
                    bottom: '20mm',
                    left: '15mm'
                }
            });
            
            await browser.close();
            
            // Configurar cabeçalhos para download do PDF
            const filename = `${campo.nome_estagiario?.replace(/\s+/g, '_') || 'documento'}_campo_estagio_${new Date().toISOString().split('T')[0]}.pdf`;
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(pdfBuffer);
            
        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    /**
     * Renderizar template HTML para PDF
     * @param {Object} campo - Dados do campo de estágio
     * @returns {string} HTML template
     */
    async renderPDFTemplate(campo) {
        const dataInicio = campo.data_inicio ? new Date(campo.data_inicio).toLocaleDateString('pt-BR') : '';
        const dataFim = campo.data_fim ? new Date(campo.data_fim).toLocaleDateString('pt-BR') : '';
        
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Campo de Estágio</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    font-size: 12pt;
                    line-height: 1.4;
                    margin: 20px;
                    color: #333;
                }
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                    border-bottom: 2px solid #333;
                    padding-bottom: 15px;
                }
                .title {
                    font-size: 18pt;
                    font-weight: bold;
                    margin-bottom: 10px;
                }
                .subtitle {
                    font-size: 12pt;
                    color: #666;
                }
                .field-row {
                    display: flex;
                    margin-bottom: 15px;
                    gap: 20px;
                }
                .field-item {
                    flex: 1;
                }
                .field {
                    margin-bottom: 15px;
                }
                .field-label {
                    font-weight: bold;
                    margin-bottom: 5px;
                    color: #444;
                    font-size: 11pt;
                }
                .field-value {
                    border-bottom: 1px solid #ccc;
                    padding-bottom: 3px;
                    min-height: 20px;
                }
                .text-area {
                    border: 1px solid #ccc;
                    padding: 10px;
                    min-height: 80px;
                    margin-top: 5px;
                }
                .checkbox-field {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .checkbox {
                    width: 15px;
                    height: 15px;
                    border: 1px solid #333;
                    display: inline-block;
                    text-align: center;
                    line-height: 13px;
                }
                .signatures {
                     display: flex;
                     justify-content: space-between;
                     margin-top: 150px;
                     padding-top: 30px;
                 }
                 .footer {
                     position: fixed;
                     bottom: 20px;
                     left: 20px;
                     right: 20px;
                     text-align: center;
                     font-size: 10pt;
                     color: #666;
                     border-top: 1px solid #ccc;
                     padding-top: 10px;
                 }
                .signature {
                    text-align: center;
                    flex: 1;
                    margin: 0 20px;
                }
                .signature::before {
                    content: '';
                    display: block;
                    width: 200px;
                    height: 1px;
                    background-color: #333;
                    margin: 0 auto 10px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="title">CAMPO DE ESTÁGIO</div>
                <div class="subtitle">Universidade Federal de Jataí - UFJ</div>
            </div>
            
            <!-- Linha 1: Situação e Número do Processo SEI -->
            <div class="field-row">
                <div class="field-item">
                    <div class="field-label">Situação</div>
                    <div class="field-value">${campo.situacao || ''}</div>
                </div>
                <div class="field-item">
                    <div class="field-label">Número do Processo SEI</div>
                    <div class="field-value">${campo.numero_processosei || ''}</div>
                </div>
            </div>
            
            <!-- Linha 2: Apólice de Seguro e Nome da Seguradora -->
            <div class="field-row">
                <div class="field-item">
                    <div class="field-label">Apólice de Seguro</div>
                    <div class="field-value">${campo.apolice_seguro || ''}</div>
                </div>
                <div class="field-item">
                    <div class="field-label">Nome da Seguradora</div>
                    <div class="field-value">${campo.nome_seguradora || ''}</div>
                </div>
            </div>
            
            <!-- Linha 3: Tipo de Estágio -->
            <div class="field">
                <div class="field-label">Tipo de Estágio</div>
                <div class="field-value">${campo.tipo_estagio || ''}</div>
            </div>
            
            <!-- Linha 4: Datas, Semestre/Ano e Carga Horária -->
            <div class="field-row">
                <div class="field-item">
                    <div class="field-label">Data de Início</div>
                    <div class="field-value">${dataInicio}</div>
                </div>
                <div class="field-item">
                    <div class="field-label">Data de Fim</div>
                    <div class="field-value">${dataFim}</div>
                </div>
                <div class="field-item">
                    <div class="field-label">Semestre/Ano</div>
                    <div class="field-value">${campo.semestre_ano || ''}</div>
                </div>
                <div class="field-item">
                    <div class="field-label">Carga Horária Semanal</div>
                    <div class="field-value">${campo.cargahoraria ? campo.cargahoraria + 'h' : ''}</div>
                </div>
            </div>
            
            <!-- Linha 5: Instituição/Curso -->
            <div class="field">
                <div class="field-label">Instituição/Curso</div>
                <div class="field-value">${campo.nome_curso || ''}</div>
            </div>
            
            <!-- Linha 6: Nome Estagiário e Apto para Estágio -->
            <div class="field-row">
                <div class="field-item">
                    <div class="field-label">Nome do Estagiário</div>
                    <div class="field-value">${campo.nome_estagiario || ''}</div>
                </div>
                <div class="field-item">
                    <div class="field-label">Apto para Estágio?</div>
                    <div class="field-value">${campo.confirmaaptoestagio || 'Sim'}</div>
                </div>
            </div>
            
            <!-- Linha 7: Matrícula e Período -->
            <div class="field-row">
                <div class="field-item">
                    <div class="field-label">Número da Matrícula</div>
                    <div class="field-value">${campo.numero_matricula || ''}</div>
                </div>
                <div class="field-item">
                    <div class="field-label">Período</div>
                    <div class="field-value">${campo.periodo || ''}</div>
                </div>
            </div>
            
            <!-- Linha 8: Professor Orientador -->
            <div class="field">
                <div class="field-label">Professor Orientador</div>
                <div class="field-value">${campo.nome_orientador || ''}</div>
            </div>
            
            <!-- Linha 9: Concedente -->
            <div class="field">
                <div class="field-label">Concedente</div>
                <div class="field-value">${campo.nome_concedente || ''}</div>
            </div>
            
            <!-- Linha 10: Estágio na própria instituição (apenas se Sim) e Número do Convênio -->
            <div class="field-row">
                ${campo.estagiopropriainstituicao === 'Sim' ? `
                <div class="field-item">
                    <div class="field-label">Estágio na própria instituição</div>
                    <div class="checkbox-field">
                        <span class="checkbox">✓</span>
                        <span>Sim</span>
                    </div>
                </div>` : ''}
                <div class="field-item">
                    <div class="field-label">Número do Convênio</div>
                    <div class="field-value">${campo.numero_convenio || ''}</div>
                </div>
            </div>
            
            <!-- Linha 11: Supervisor -->
            <div class="field">
                <div class="field-label">Supervisor</div>
                <div class="field-value">${campo.nome_supervisor || ''}</div>
            </div>
            
            <!-- Linha 12: Valores da Bolsa e Vale Transporte (apenas se não for Obrigatório) -->
            ${campo.tipo_estagio !== 'Obrigatório' ? `
            <div class="field-row">
                <div class="field-item">
                    <div class="field-label">Valor da Bolsa</div>
                    <div class="field-value">${campo.valor_bolsa ? 'R$ ' + parseFloat(campo.valor_bolsa).toFixed(2).replace('.', ',') : ''}</div>
                </div>
                <div class="field-item">
                    <div class="field-label">Valor do Vale Transporte</div>
                    <div class="field-value">${campo.valor_valetransporte ? 'R$ ' + parseFloat(campo.valor_valetransporte).toFixed(2).replace('.', ',') : ''}</div>
                </div>
            </div>` : ''}
            
            <!-- Linha 13: Observações -->
            <div class="field">
                <div class="field-label">Observações</div>
                <div class="text-area">${campo.observacoes || ''}</div>
            </div>
            
            <!-- Assinaturas -->
             <div class="signatures">
                 <div class="signature">
                     ${campo.nome_estagiario || 'Nome do Estagiário'}<br>
                     <small>Estagiário</small>
                 </div>
                 <div class="signature">
                     ${campo.nome_orientador || 'Nome do Orientador'}<br>
                     <small>Orientador</small>
                 </div>
                 <div class="signature">
                     ${campo.nome_supervisor || 'Nome do Supervisor'}<br>
                     <small>Supervisor</small>
                 </div>
             </div>
             
             <!-- Rodapé -->
             <div class="footer">
                 Relatório gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
             </div>
        </body>
        </html>
        `;
    }
}

module.exports = CampoEstagioController;