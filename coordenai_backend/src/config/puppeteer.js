/**
 * Configuração do Puppeteer - ARQUIVO DE EXEMPLO
 * Copie este arquivo para puppeteer.js e ajuste as configurações conforme necessário
 * 
 * IMPORTANTE: Para servidores ARM64, você pode precisar:
 * 1. Instalar o Chrome/Chromium específico para ARM64
 * 2. Definir PUPPETEER_EXECUTABLE_PATH no ambiente
 * 3. Ajustar os argumentos conforme a arquitetura
 */

const puppeteer = require('puppeteer');

/**
 * Configuração padrão do Puppeteer
 * Ajuste conforme a arquitetura do servidor (x64, ARM64, etc.)
 */
const defaultConfig = {
    headless: "new",
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
    ],
    // Para ARM64, defina o caminho do executável:
    // executablePath: '/usr/bin/chromium-browser' // Exemplo para Linux ARM64
    // executablePath: process.env.PUPPETEER_EXECUTABLE_PATH
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
};

/**
 * Configurações específicas para diferentes arquiteturas
 */
const architectureConfigs = {
    // Configuração para servidores ARM64 Linux
    arm64: {
        ...defaultConfig,
        args: [
            ...defaultConfig.args,
            '--disable-extensions',
            '--disable-plugins',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding'
        ],
        // Exemplo de caminho comum para ARM64
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser'
    },
    
    // Configuração para servidores x64
    x64: {
        ...defaultConfig
    }
};

/**
 * Detecta a arquitetura e retorna a configuração apropriada
 */
function getArchitectureConfig() {
    const arch = process.arch;
    console.log('[PUPPETEER] Arquitetura detectada:', arch);
    
    if (arch === 'arm64') {
        return architectureConfigs.arm64;
    }
    
    return architectureConfigs.x64;
}

/**
 * Lança uma instância do Puppeteer com configuração otimizada
 * @param {Object} customConfig - Configurações personalizadas (opcional)
 * @returns {Promise<Browser>} Instância do browser
 */
async function launchBrowser(customConfig = {}) {
    try {
        const baseConfig = getArchitectureConfig();
        const config = { ...baseConfig, ...customConfig };
        
        console.log('[PUPPETEER] Iniciando browser com configuração:', {
            headless: config.headless,
            argsCount: config.args.length,
            executablePath: config.executablePath ? 'Customizado' : 'Padrão',
            architecture: process.arch
        });
        
        const browser = await puppeteer.launch(config);
        
        console.log('[PUPPETEER] Browser iniciado com sucesso');
        return browser;
        
    } catch (error) {
        console.error('[PUPPETEER] Erro ao iniciar browser:', error.message);
        
        // Tentar configuração de fallback para ambientes mais restritivos
        if (!customConfig.fallback) {
            console.log('[PUPPETEER] Tentando configuração de fallback...');
            
            const fallbackConfig = {
                ...getArchitectureConfig(),
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--single-process',
                    '--disable-gpu',
                    '--disable-extensions',
                    '--disable-plugins',
                    '--disable-images',
                    '--virtual-time-budget=5000'
                ],
                fallback: true
            };
            
            return await launchBrowser(fallbackConfig);
        }
        
        throw error;
    }
}

/**
 * Gera PDF com configuração otimizada
 * @param {string} htmlContent - Conteúdo HTML para conversão
 * @param {Object} pdfOptions - Opções do PDF (opcional)
 * @returns {Promise<Buffer>} Buffer do PDF gerado
 */
async function generatePDF(htmlContent, pdfOptions = {}) {
    let browser = null;
    
    try {
        browser = await launchBrowser();
        const page = await browser.newPage();
        
        // Configurações da página para melhor performance
        await page.setDefaultNavigationTimeout(30000);
        await page.setDefaultTimeout(30000);
        
        // Desabilitar recursos desnecessários para PDF
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const resourceType = req.resourceType();
            if (resourceType === 'image' || resourceType === 'media' || resourceType === 'font') {
                req.abort();
            } else {
                req.continue();
            }
        });
        
        await page.setContent(htmlContent, { 
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });
        
        const defaultPdfOptions = {
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20mm',
                right: '15mm',
                bottom: '20mm',
                left: '15mm'
            }
        };
        
        const pdfBuffer = await page.pdf({ ...defaultPdfOptions, ...pdfOptions });
        
        console.log('[PUPPETEER] PDF gerado com sucesso, tamanho:', pdfBuffer.length, 'bytes');
        return pdfBuffer;
        
    } catch (error) {
        console.error('[PUPPETEER] Erro ao gerar PDF:', error.message);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
            console.log('[PUPPETEER] Browser fechado');
        }
    }
}

module.exports = {
    launchBrowser,
    generatePDF,
    defaultConfig,
    getArchitectureConfig
};