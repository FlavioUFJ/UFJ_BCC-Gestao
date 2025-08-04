/**
 * Utilitários e Helpers
 * Funções auxiliares reutilizáveis em todo o sistema
 */

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

/**
 * Classe com funções utilitárias
 */
class Helpers {
    /**
     * Formata data para exibição
     * @param {Date|string} date - Data a ser formatada
     * @param {string} format - Formato desejado (default: 'dd/mm/yyyy')
     * @returns {string} Data formatada
     */
    static formatDate(date, format = 'dd/mm/yyyy') {
        if (!date) return '';
        
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        
        switch (format) {
            case 'dd/mm/yyyy':
                return `${day}/${month}/${year}`;
            case 'yyyy-mm-dd':
                return `${year}-${month}-${day}`;
            case 'dd/mm/yyyy hh:mm':
                return `${day}/${month}/${year} ${hours}:${minutes}`;
            case 'dd/mm/yyyy hh:mm:ss':
                return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
            case 'relative':
                return Helpers.getRelativeTime(d);
            default:
                return `${day}/${month}/${year}`;
        }
    }
    
    /**
     * Retorna tempo relativo (ex: "há 2 horas")
     * @param {Date} date - Data de referência
     * @returns {string} Tempo relativo
     */
    static getRelativeTime(date) {
        const now = new Date();
        const diff = now - date;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        const months = Math.floor(days / 30);
        const years = Math.floor(days / 365);
        
        if (years > 0) return `há ${years} ano${years > 1 ? 's' : ''}`;
        if (months > 0) return `há ${months} mês${months > 1 ? 'es' : ''}`;
        if (days > 0) return `há ${days} dia${days > 1 ? 's' : ''}`;
        if (hours > 0) return `há ${hours} hora${hours > 1 ? 's' : ''}`;
        if (minutes > 0) return `há ${minutes} minuto${minutes > 1 ? 's' : ''}`;
        return 'agora mesmo';
    }
    
    /**
     * Formata CPF/CNPJ
     * @param {string} document - Documento a ser formatado
     * @returns {string} Documento formatado
     */
    static formatDocument(document) {
        if (!document) return '';
        
        const cleaned = document.replace(/\D/g, '');
        
        if (cleaned.length === 11) {
            // CPF: 000.000.000-00
            return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        } else if (cleaned.length === 14) {
            // CNPJ: 00.000.000/0000-00
            return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
        }
        
        return document;
    }
    
    /**
     * Formata telefone
     * @param {string} phone - Telefone a ser formatado
     * @returns {string} Telefone formatado
     */
    static formatPhone(phone) {
        if (!phone) return '';
        
        const cleaned = phone.replace(/\D/g, '');
        
        if (cleaned.length === 10) {
            // (00) 0000-0000
            return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        } else if (cleaned.length === 11) {
            // (00) 00000-0000
            return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        }
        
        return phone;
    }
    
    /**
     * Formata CEP
     * @param {string} cep - CEP a ser formatado
     * @returns {string} CEP formatado
     */
    static formatCEP(cep) {
        if (!cep) return '';
        
        const cleaned = cep.replace(/\D/g, '');
        
        if (cleaned.length === 8) {
            return cleaned.replace(/(\d{5})(\d{3})/, '$1-$2');
        }
        
        return cep;
    }
    
    /**
     * Formata moeda brasileira
     * @param {number} value - Valor a ser formatado
     * @returns {string} Valor formatado
     */
    static formatCurrency(value) {
        if (value === null || value === undefined) return 'R$ 0,00';
        
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }
    
    /**
     * Trunca texto
     * @param {string} text - Texto a ser truncado
     * @param {number} length - Tamanho máximo
     * @param {string} suffix - Sufixo (default: '...')
     * @returns {string} Texto truncado
     */
    static truncateText(text, length = 100, suffix = '...') {
        if (!text || text.length <= length) return text || '';
        
        return text.substring(0, length).trim() + suffix;
    }
    
    /**
     * Capitaliza primeira letra
     * @param {string} text - Texto a ser capitalizado
     * @returns {string} Texto capitalizado
     */
    static capitalize(text) {
        if (!text) return '';
        
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    }
    
    /**
     * Capitaliza cada palavra
     * @param {string} text - Texto a ser capitalizado
     * @returns {string} Texto com palavras capitalizadas
     */
    static capitalizeWords(text) {
        if (!text) return '';
        
        return text.split(' ')
            .map(word => Helpers.capitalize(word))
            .join(' ');
    }
    
    /**
     * Gera hash MD5
     * @param {string} text - Texto para gerar hash
     * @returns {string} Hash MD5
     */
    static generateMD5(text) {
        return crypto.createHash('md5').update(text).digest('hex');
    }
    
    /**
     * Gera token aleatório
     * @param {number} length - Tamanho do token
     * @returns {string} Token gerado
     */
    static generateToken(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }
    
    /**
     * Gera slug a partir de texto
     * @param {string} text - Texto para gerar slug
     * @returns {string} Slug gerado
     */
    static generateSlug(text) {
        if (!text) return '';
        
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove acentos
            .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
            .replace(/\s+/g, '-') // Substitui espaços por hífens
            .replace(/-+/g, '-') // Remove hífens duplicados
            .replace(/^-|-$/g, ''); // Remove hífens do início e fim
    }
    
    /**
     * Valida CPF
     * @param {string} cpf - CPF a ser validado
     * @returns {boolean} True se válido
     */
    static isValidCPF(cpf) {
        if (!cpf) return false;
        
        const cleaned = cpf.replace(/\D/g, '');
        
        if (cleaned.length !== 11 || /^(\d)\1{10}$/.test(cleaned)) {
            return false;
        }
        
        let sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += parseInt(cleaned.charAt(i)) * (10 - i);
        }
        
        let remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;
        if (remainder !== parseInt(cleaned.charAt(9))) return false;
        
        sum = 0;
        for (let i = 0; i < 10; i++) {
            sum += parseInt(cleaned.charAt(i)) * (11 - i);
        }
        
        remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;
        
        return remainder === parseInt(cleaned.charAt(10));
    }
    
    /**
     * Valida CNPJ
     * @param {string} cnpj - CNPJ a ser validado
     * @returns {boolean} True se válido
     */
    static isValidCNPJ(cnpj) {
        if (!cnpj) return false;
        
        const cleaned = cnpj.replace(/\D/g, '');
        
        if (cleaned.length !== 14 || /^(\d)\1{13}$/.test(cleaned)) {
            return false;
        }
        
        const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        
        let sum = 0;
        for (let i = 0; i < 12; i++) {
            sum += parseInt(cleaned.charAt(i)) * weights1[i];
        }
        
        let remainder = sum % 11;
        const digit1 = remainder < 2 ? 0 : 11 - remainder;
        
        if (digit1 !== parseInt(cleaned.charAt(12))) return false;
        
        sum = 0;
        for (let i = 0; i < 13; i++) {
            sum += parseInt(cleaned.charAt(i)) * weights2[i];
        }
        
        remainder = sum % 11;
        const digit2 = remainder < 2 ? 0 : 11 - remainder;
        
        return digit2 === parseInt(cleaned.charAt(13));
    }
    
    /**
     * Calcula idade a partir da data de nascimento
     * @param {Date|string} birthDate - Data de nascimento
     * @returns {number} Idade em anos
     */
    static calculateAge(birthDate) {
        if (!birthDate) return 0;
        
        const birth = new Date(birthDate);
        const today = new Date();
        
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        
        return age;
    }
    
    /**
     * Calcula diferença entre datas em dias
     * @param {Date|string} date1 - Primeira data
     * @param {Date|string} date2 - Segunda data
     * @returns {number} Diferença em dias
     */
    static daysDifference(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        
        const timeDiff = Math.abs(d2.getTime() - d1.getTime());
        return Math.ceil(timeDiff / (1000 * 3600 * 24));
    }
    
    /**
     * Verifica se arquivo existe
     * @param {string} filePath - Caminho do arquivo
     * @returns {boolean} True se existe
     */
    static fileExists(filePath) {
        try {
            return fs.existsSync(filePath);
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Cria diretório se não existir
     * @param {string} dirPath - Caminho do diretório
     */
    static ensureDirectory(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }
    
    /**
     * Obtém extensão do arquivo
     * @param {string} filename - Nome do arquivo
     * @returns {string} Extensão do arquivo
     */
    static getFileExtension(filename) {
        return path.extname(filename).toLowerCase();
    }
    
    /**
     * Gera nome único para arquivo
     * @param {string} originalName - Nome original
     * @returns {string} Nome único
     */
    static generateUniqueFilename(originalName) {
        const ext = Helpers.getFileExtension(originalName);
        const name = path.basename(originalName, ext);
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        
        return `${Helpers.generateSlug(name)}-${timestamp}-${random}${ext}`;
    }
    
    /**
     * Converte bytes para formato legível
     * @param {number} bytes - Tamanho em bytes
     * @returns {string} Tamanho formatado
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    /**
     * Sanitiza nome de arquivo
     * @param {string} filename - Nome do arquivo
     * @returns {string} Nome sanitizado
     */
    static sanitizeFilename(filename) {
        return filename
            .replace(/[^a-zA-Z0-9.-]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
    }
    
    /**
     * Debounce para funções
     * @param {Function} func - Função a ser executada
     * @param {number} wait - Tempo de espera em ms
     * @returns {Function} Função com debounce
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    /**
     * Throttle para funções
     * @param {Function} func - Função a ser executada
     * @param {number} limit - Limite de tempo em ms
     * @returns {Function} Função com throttle
     */
    static throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    /**
     * Converte objeto para query string
     * @param {Object} obj - Objeto a ser convertido
     * @returns {string} Query string
     */
    static objectToQueryString(obj) {
        return Object.keys(obj)
            .filter(key => obj[key] !== null && obj[key] !== undefined && obj[key] !== '')
            .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}`)
            .join('&');
    }
    
    /**
     * Converte query string para objeto
     * @param {string} queryString - Query string
     * @returns {Object} Objeto convertido
     */
    static queryStringToObject(queryString) {
        const params = new URLSearchParams(queryString);
        const obj = {};
        
        for (const [key, value] of params) {
            obj[key] = value;
        }
        
        return obj;
    }
    
    /**
     * Clona objeto profundamente
     * @param {Object} obj - Objeto a ser clonado
     * @returns {Object} Objeto clonado
     */
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => Helpers.deepClone(item));
        if (typeof obj === 'object') {
            const cloned = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    cloned[key] = Helpers.deepClone(obj[key]);
                }
            }
            return cloned;
        }
    }
    
    /**
     * Verifica se objeto está vazio
     * @param {Object} obj - Objeto a ser verificado
     * @returns {boolean} True se vazio
     */
    static isEmpty(obj) {
        if (obj === null || obj === undefined) return true;
        if (typeof obj === 'string') return obj.trim().length === 0;
        if (Array.isArray(obj)) return obj.length === 0;
        if (typeof obj === 'object') return Object.keys(obj).length === 0;
        return false;
    }
}

module.exports = Helpers;