/**
 * Módulo para gerenciamento do formulário de administração de pessoas
 * Refatorado para melhor organização, performance e manutenibilidade
 */

class PessoaFormManager {
    constructor() {
        this.modulosDisponiveis = [];
        this.modulosSelecionados = [];
        this.incompatibilidades = {};
        this.isLoading = false;
        
        // Bind methods to preserve context
        this.init = this.init.bind(this);
        this.savePessoa = this.savePessoa.bind(this);
        this.adicionarModulo = this.adicionarModulo.bind(this);
    }

    async init() {
        console.log('[DEBUG] PessoaFormManager.init() chamado');
        
        try {
            this.setupEventListeners();
            this.setupFormValidation();
            this.setupCategoriaHandling();
            
            // Não carregar módulos automaticamente - usar lazy loading
            // await this.loadModulos();
            
            // Verificar se é edição e preencher dados
            if (window.isEditMode) {
                console.log('[DEBUG] Chamando preencherDadosEdicao...');
                await this.preencherDadosEdicao();
                // Carregar módulos apenas se a pessoa tem módulos associados
                if (window.pessoaData && window.pessoaData.modulos && window.pessoaData.modulos.length > 0) {
                    await this.ensureModulosLoaded();
                }
            }
        } catch (error) {
            console.error('Erro na inicialização:', error);
            this.showAlert('Erro ao inicializar formulário: ' + error.message, 'danger');
        }
    }

    setupEventListeners() {
        // Usar delegação de eventos para melhor performance
        this.setupEventDelegation();
    }
    
    setupEventDelegation() {
        // Event delegation para clicks - um único listener para todo o documento
        document.addEventListener('click', this.handleGlobalClick.bind(this), { passive: false });
        
        // Event delegation para submits
        document.addEventListener('submit', this.handleGlobalSubmit.bind(this), { passive: false });
        
        // Event delegation para mudanças de input
        document.addEventListener('change', this.handleGlobalChange.bind(this), { passive: true });
        
        // Event delegation para input (máscaras) - throttled para performance
        document.addEventListener('input', this.throttle(this.handleGlobalInput.bind(this), 100), { passive: true });
        
        // Event delegation para focus - lazy loading de módulos
        document.addEventListener('focus', this.handleGlobalFocus.bind(this), { passive: true });
    }
    
    // Throttle function para otimizar performance
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    }
    
    handleGlobalClick(e) {
        const target = e.target;
        const targetId = target.id;
        const targetClass = target.className;
        
        // Botão voltar
        if (targetId === 'btnVoltar' || target.closest('#btnVoltar')) {
            e.preventDefault();
            this.voltarPagina();
            return;
        }
        
        // Botão adicionar módulo
        if (targetId === 'btnAdicionarModulo') {
            e.preventDefault();
            this.adicionarModulo();
            return;
        }
        
        // Botões de remover módulo
        if (targetClass.includes('btn-remover-modulo') || target.closest('.btn-remover-modulo')) {
            e.preventDefault();
            const btn = target.closest('.btn-remover-modulo') || target;
            const moduloId = btn.dataset.moduloId;
            if (moduloId) {
                this.removerModulo(moduloId);
            }
            return;
        }
        
        // Checkboxes de categoria
        if (target.type === 'checkbox' && target.name === 'categoria') {
            // Usar requestAnimationFrame para otimizar atualizações de UI
            requestAnimationFrame(() => {
                this.updateCategoriaField();
                this.aplicarRegrasIncompatibilidade();
            });
            return;
        }
        
        // Select de módulos - lazy loading quando usuário interage
        if (targetId === 'moduloSelect') {
            this.ensureModulosLoaded();
            return;
        }
    }
    
    handleGlobalSubmit(e) {
        if (e.target.id === 'pessoaForm') {
            this.handleFormSubmit(e);
        }
    }
    
    handleGlobalChange(e) {
        const target = e.target;
        const targetId = target.id;
        
        // Validação em tempo real para campos específicos
        switch (targetId) {
            case 'email':
                // Debounce para validação de email
                clearTimeout(this.emailValidationTimeout);
                this.emailValidationTimeout = setTimeout(() => {
                    this.validateEmail(target.value);
                }, 300);
                break;
                
            case 'tipo':
            case 'nome':
            case 'cnpj_cpf':
            case 'telefone':
            case 'nivelAcesso':
            case 'statusLogin':
                // Limpar erros imediatamente para feedback rápido
                this.clearFieldError(targetId);
                break;
        }
    }
    
    handleGlobalInput(e) {
        const target = e.target;
        const targetId = target.id;
        
        // Aplicar máscaras apenas quando necessário
        switch (targetId) {
            case 'cnpj_cpf':
                target.value = this.formatCpfCnpj(target.value);
                break;
                
            case 'telefone':
                target.value = this.formatTelefone(target.value);
                break;
        }
    }
    
    handleGlobalFocus(e) {
        const target = e.target;
        const targetId = target.id;
        
        // Lazy loading para select de módulos quando recebe foco
        if (targetId === 'moduloSelect') {
            this.ensureModulosLoaded();
        }
    }

    handleFormSubmit(e) {
        e.preventDefault();
        if (!this.isLoading) {
            this.savePessoa();
        }
    }

    setupCategoriaHandling() {
        const checkboxes = document.querySelectorAll('.categoria-checkbox');
        
        // Configurar regras de incompatibilidade
        this.configurarIncompatibilidadeCategorias();
        
        // Adicionar event listeners aos checkboxes
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateCategoriaField();
                this.aplicarRegrasIncompatibilidade();
            });
        });
        
        // Inicializar o campo hidden com valores já selecionados
        this.updateCategoriaField();
        
        // Aplicar regras iniciais se houver categorias pré-selecionadas
        this.aplicarRegrasIncompatibilidade();
    }

    async preencherDadosEdicao() {
        console.log('[DEBUG] Função preencherDadosEdicao chamada');
        
        if (!window.isEditMode || !window.pessoaData) {
            return;
        }

        const pessoa = window.pessoaData;
        console.log('[DEBUG] Dados da pessoa:', pessoa);

        try {
            // Preencher checkboxes de categoria
            if (pessoa.categoria) {
                this.preencherCategorias(pessoa.categoria);
            }

            // Preencher dados de login
            this.preencherDadosLogin(pessoa);

            // Carregar módulos da pessoa
            await this.carregarModulosPessoa(pessoa);
        } catch (error) {
            console.error('Erro ao preencher dados de edição:', error);
            this.showAlert('Erro ao carregar dados para edição', 'warning');
        }
    }

    preencherCategorias(categoriaString) {
        const categorias = categoriaString.split(',');
        console.log('Categorias da pessoa:', categorias);
        
        // Mapear valores do banco para valores dos checkboxes
        const categoriaMap = {
            '1': 'Coordenador',
            '2': 'Professor',
            '3': 'Aluno',
            '4': 'Concedente',
            '5': 'Supervisor',
            '6': 'Instituição',
            '99': 'Usuário Geral'
        };
        
        categorias.forEach(catId => {
            const catValue = categoriaMap[catId.trim()];
            if (catValue) {
                const checkbox = document.querySelector(`input[value="${catValue}"]`);
                if (checkbox) {
                    checkbox.checked = true;
                    console.log('Checkbox marcado:', catValue);
                }
            }
        });
        
        // Atualizar campo oculto
        this.updateCategoriaField();
    }

    preencherDadosLogin(pessoa) {
        console.log('[DEBUG] Iniciando preenchimento de dados de login');
        
        if (pessoa.nivelAcesso) {
            const nivelAcessoSelect = document.getElementById('nivelAcesso');
            if (nivelAcessoSelect) {
                nivelAcessoSelect.value = pessoa.nivelAcesso;
                console.log('[DEBUG] Nível de acesso preenchido:', pessoa.nivelAcesso);
            }
        }
        
        if (pessoa.statusLogin) {
            const statusLoginSelect = document.getElementById('statusLogin');
            if (statusLoginSelect) {
                statusLoginSelect.value = pessoa.statusLogin;
                console.log('[DEBUG] Status login preenchido:', pessoa.statusLogin);
            }
        }
    }

    updateCategoriaField() {
        const checkboxes = document.querySelectorAll('.categoria-checkbox');
        const hiddenInput = document.getElementById('categoria');
        const selectedCategories = [];
        
        // Mapeamento de nomes para números (conforme banco de dados)
        const categoriaToNumber = {
            'Coordenador': '1',
            'Professor': '2',
            'Aluno': '3',
            'Concedente': '4',
            'Supervisor': '5',
            'Instituição': '6',
            'Usuário Geral': '99'
        };
        
        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                const numeroCategoria = categoriaToNumber[checkbox.value];
                if (numeroCategoria) {
                    selectedCategories.push(numeroCategoria);
                }
            }
        });
        
        if (hiddenInput) {
            hiddenInput.value = selectedCategories.join(',');
        }
    }

    configurarIncompatibilidadeCategorias() {
        // Definir regras de incompatibilidade
        this.incompatibilidades = {
            'Coordenador': ['Aluno', 'Concedente', 'Instituição', 'Usuário Geral'],
            'Professor': ['Aluno', 'Concedente', 'Instituição', 'Usuário Geral'],
            'Aluno': ['Coordenador', 'Professor', 'Concedente', 'Supervisor', 'Instituição', 'Usuário Geral'],
            'Concedente': ['Coordenador', 'Aluno', 'Professor'],
            'Supervisor': ['Coordenador', 'Aluno', 'Professor', 'Instituição'],
            'Instituição': ['Coordenador', 'Professor', 'Aluno', 'Supervisor', 'Usuário Geral'],
            'Usuário Geral': ['Coordenador', 'Professor', 'Aluno', 'Concedente', 'Supervisor', 'Instituição']
        };
    }

    aplicarRegrasIncompatibilidade() {
        const checkboxes = document.querySelectorAll('.categoria-checkbox');
        
        // Primeiro, limpar todas as regras
        this.limparRegrasIncompatibilidade();
        
        // Verificar quais categorias estão selecionadas
        const categoriasAtivas = [];
        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                categoriasAtivas.push(checkbox.value);
            }
        });
        
        // Aplicar regras de incompatibilidade
        categoriasAtivas.forEach(categoriaAtiva => {
            if (this.incompatibilidades[categoriaAtiva]) {
                this.incompatibilidades[categoriaAtiva].forEach(categoriaIncompativel => {
                    const checkbox = document.querySelector(`.categoria-checkbox[value="${categoriaIncompativel}"]`);
                    if (checkbox && !checkbox.checked) {
                        checkbox.disabled = true;
                        checkbox.parentElement.classList.add('categoria-disabled');
                    }
                });
            }
        });
    }

    limparRegrasIncompatibilidade() {
        const checkboxes = document.querySelectorAll('.categoria-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.disabled = false;
            checkbox.parentElement.classList.remove('categoria-disabled');
        });
    }

    setupFormValidation() {
        // Configurar máscaras de entrada
        this.setupInputMasks();
        
        // Validação em tempo real
        this.setupRealTimeValidation();
    }

    setupInputMasks() {
        // Máscara para CPF/CNPJ
        const cpfCnpjInput = document.getElementById('cpfCnpj');
        if (cpfCnpjInput) {
            // Aplicar máscara ao valor já existente
            if (cpfCnpjInput.value) {
                cpfCnpjInput.value = this.formatCpfCnpj(cpfCnpjInput.value);
            }
            
            // Aplicar máscara durante a digitação
            cpfCnpjInput.addEventListener('input', (e) => {
                e.target.value = this.formatCpfCnpj(e.target.value);
            });
        }
        
        // Máscara para telefone
        const telefoneInput = document.getElementById('telefone');
        if (telefoneInput) {
            // Aplicar máscara ao valor já existente
            if (telefoneInput.value) {
                telefoneInput.value = this.formatTelefone(telefoneInput.value);
            }
            
            // Aplicar máscara durante a digitação
            telefoneInput.addEventListener('input', (e) => {
                e.target.value = this.formatTelefone(e.target.value);
            });
        }
    }

    // Função reutilizável para formatação de CPF/CNPJ
    formatCpfCnpj(value) {
        const cleanValue = value.replace(/\D/g, '');
        
        if (cleanValue.length <= 11) {
            // CPF: 000.000.000-00
            return cleanValue
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        } else {
            // CNPJ: 00.000.000/0000-00
            return cleanValue
                .replace(/(\d{2})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1/$2')
                .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
        }
    }

    // Função reutilizável para formatação de telefone
    formatTelefone(value) {
        const cleanValue = value.replace(/\D/g, '');
        
        if (cleanValue.length <= 10) {
            // Telefone fixo: (00) 0000-0000
            return cleanValue
                .replace(/(\d{2})(\d)/, '($1) $2')
                .replace(/(\d{4})(\d)/, '$1-$2');
        } else {
            // Celular: (00) 00000-0000
            return cleanValue
                .replace(/(\d{2})(\d)/, '($1) $2')
                .replace(/(\d{5})(\d)/, '$1-$2');
        }
    }

    setupRealTimeValidation() {
        // Validação de email
        const emailInput = document.getElementById('email');
        if (emailInput) {
            emailInput.addEventListener('blur', () => {
                this.validateEmail(emailInput.value);
            });
        }
    }



    // Função reutilizável para validação de documentos
    validateDocument(document, type) {
        if (type === 'cpf') {
            return this.validateCpf(document);
        } else if (type === 'cnpj') {
            return this.validateCnpj(document);
        }
        return false;
    }
    
    // Validação de CPF
    validateCpf(cpf) {
        const cleanCpf = cpf.replace(/\D/g, '');
        
        if (cleanCpf.length !== 11) return false;
        if (/^(\d)\1{10}$/.test(cleanCpf)) return false;
        
        return this.calculateCpfDigits(cleanCpf);
    }
    
    // Cálculo dos dígitos verificadores do CPF
    calculateCpfDigits(cleanCpf) {
        let sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += parseInt(cleanCpf.charAt(i)) * (10 - i);
        }
        let remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;
        if (remainder !== parseInt(cleanCpf.charAt(9))) return false;
        
        sum = 0;
        for (let i = 0; i < 10; i++) {
            sum += parseInt(cleanCpf.charAt(i)) * (11 - i);
        }
        remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;
        return remainder === parseInt(cleanCpf.charAt(10));
    }
    
    // Validação de CNPJ
    validateCnpj(cnpj) {
        const cleanCnpj = cnpj.replace(/\D/g, '');
        
        if (cleanCnpj.length !== 14) return false;
        if (/^(\d)\1{13}$/.test(cleanCnpj)) return false;
        
        return this.calculateCnpjDigits(cleanCnpj);
    }
    
    // Cálculo dos dígitos verificadores do CNPJ
    calculateCnpjDigits(cleanCnpj) {
        const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        const weights2 = [6, 7, 8, 9, 2, 3, 4, 5, 6, 7, 8, 9];
        
        let sum = 0;
        for (let i = 0; i < 12; i++) {
            sum += parseInt(cleanCnpj.charAt(i)) * weights1[i];
        }
        let remainder = sum % 11;
        const digit1 = remainder < 2 ? 0 : 11 - remainder;
        
        if (digit1 !== parseInt(cleanCnpj.charAt(12))) return false;
        
        sum = 0;
        for (let i = 0; i < 13; i++) {
            sum += parseInt(cleanCnpj.charAt(i)) * weights2[i];
        }
        remainder = sum % 11;
        const digit2 = remainder < 2 ? 0 : 11 - remainder;
        
        return digit2 === parseInt(cleanCnpj.charAt(13));
    }
    
    // Validação de telefone
    validateTelefone(telefone) {
        const cleanTelefone = telefone.replace(/\D/g, '');
        return cleanTelefone.length >= 10 && cleanTelefone.length <= 11;
    }

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const emailInput = document.getElementById('email');
        
        if (email && !emailRegex.test(email)) {
            emailInput.classList.add('is-invalid');
            return false;
        } else {
            emailInput.classList.remove('is-invalid');
            return true;
        }
    }

    // Lazy loading para módulos - carrega apenas quando necessário
    async loadModulos(force = false) {
        // Se já carregou e não é forçado, não recarrega
        if (this.modulosDisponiveis && this.modulosDisponiveis.length > 0 && !force) {
            return;
        }
        
        const select = document.getElementById('moduloSelect');
        const btnAdicionar = document.getElementById('btnAdicionarModulo');
        
        try {
            // Mostrar estado de carregamento
            if (select) {
                select.innerHTML = '<option value="">Carregando módulos...</option>';
                select.disabled = true;
            }
            if (btnAdicionar) {
                btnAdicionar.disabled = true;
            }
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos de timeout
            
            const response = await fetch('/admin/modulos', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Resposta não é JSON válido');
            }
            
            const modulos = await response.json();
            
            if (!Array.isArray(modulos)) {
                throw new Error('Resposta inválida do servidor: esperado array de módulos');
            }
            
            this.modulosDisponiveis = modulos;
            
            if (!select) {
                console.warn('Select de módulos não encontrado');
                return;
            }
            
            if (modulos.length === 0) {
                select.innerHTML = '<option value="">Nenhum módulo cadastrado</option>';
                select.disabled = false;
                return;
            }
            
            select.innerHTML = '<option value="">Selecione um módulo...</option>' + 
                modulos.map(modulo => {
                    if (!modulo.id_modulo || !modulo.nome) {
                        console.warn('Módulo inválido ignorado:', modulo);
                        return '';
                    }
                    return `
                        <option value="${this.escapeHtml(modulo.id_modulo)}" 
                                data-icone="${this.escapeHtml(modulo.icone || 'fas fa-cube')}" 
                                data-cor="${this.escapeHtml(modulo.cor || '#6c757d')}" 
                                data-descricao="${this.escapeHtml(modulo.descricao || '')}">
                            ${this.escapeHtml(modulo.nome)}
                        </option>
                    `;
                }).filter(Boolean).join('');
            
            select.disabled = false;
            if (btnAdicionar) {
                btnAdicionar.disabled = false;
            }
            
        } catch (error) {
            console.error('Erro ao carregar módulos:', error);
            
            if (select) {
                select.innerHTML = '<option value="">Erro ao carregar módulos</option>';
                select.disabled = false;
            }
            
            let errorMessage = 'Erro ao carregar módulos disponíveis';
            let alertType = 'danger';
            
            if (error.name === 'AbortError') {
                errorMessage = 'Tempo limite excedido. Verifique sua conexão e tente novamente.';
                alertType = 'warning';
            } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
                errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
                alertType = 'warning';
            } else if (error.message.includes('HTTP 404')) {
                errorMessage = 'Serviço de módulos não encontrado. Contate o administrador.';
            } else if (error.message.includes('HTTP 500')) {
                errorMessage = 'Erro interno do servidor. Tente novamente em alguns minutos.';
            } else if (error.message.includes('HTTP 403')) {
                errorMessage = 'Acesso negado. Verifique suas permissões.';
            } else if (error.message.includes('não é JSON')) {
                errorMessage = 'Resposta inválida do servidor. Tente recarregar a página.';
            }
            
            this.showAlert(errorMessage, alertType);
            
            // Adicionar botão de retry apenas para erros recuperáveis
            if (alertType === 'warning') {
                setTimeout(() => {
                    const alertContainer = document.querySelector('#alertContainer .alert:last-child');
                    if (alertContainer && !alertContainer.querySelector('.retry-btn')) {
                        const retryBtn = document.createElement('button');
                        retryBtn.className = 'btn btn-sm btn-outline-primary mt-2 retry-btn';
                        retryBtn.innerHTML = '<i class="fas fa-redo me-1"></i>Tentar Novamente';
                        retryBtn.onclick = () => {
                            alertContainer.remove();
                            this.loadModulos(true);
                        };
                        alertContainer.appendChild(retryBtn);
                    }
                }, 100);
            }
        }
    }
    
    // Carregamento lazy quando o usuário interage com a seção de módulos
    async ensureModulosLoaded() {
        if (!this.modulosDisponiveis || this.modulosDisponiveis.length === 0) {
            await this.loadModulos();
        }
    }

    async adicionarModulo() {
        // Garantir que os módulos estejam carregados antes de adicionar
        await this.ensureModulosLoaded();
        const select = document.getElementById('moduloSelect');
        if (!select) {
            this.showAlert('Erro interno: select não encontrado', 'danger');
            return;
        }
        
        const selectedOption = select.options[select.selectedIndex];
        
        if (!selectedOption.value) {
            this.showAlert('Selecione um módulo para adicionar.', 'warning');
            return;
        }
        
        const moduloId = selectedOption.value;
        
        // Verificar se o módulo já foi adicionado
        if (this.modulosSelecionados.find(m => m.id_modulo == moduloId)) {
            this.showAlert('Este módulo já foi adicionado.', 'warning');
            return;
        }
        
        // Encontrar dados completos do módulo
        const modulo = this.modulosDisponiveis.find(m => m.id_modulo == moduloId);
        if (!modulo) {
            this.showAlert('Erro ao encontrar dados do módulo.', 'danger');
            return;
        }
        
        // Adicionar à lista de selecionados
        this.modulosSelecionados.push(modulo);
        
        // Atualizar tabela
        this.atualizarTabelaModulos();
        
        // Resetar select
        select.selectedIndex = 0;
    }

    removerModulo(moduloId) {
        this.modulosSelecionados = this.modulosSelecionados.filter(m => m.id_modulo != moduloId);
        this.atualizarTabelaModulos();
    }

    atualizarTabelaModulos() {
        const tbody = document.getElementById('tabelaModulosBody');
        const semModulos = document.getElementById('semModulos');
        
        if (!tbody) {
            console.warn('Tbody da tabela de módulos não encontrado');
            return;
        }
        
        if (this.modulosSelecionados.length === 0) {
            if (semModulos) {
                semModulos.style.display = '';
            }
            // Remover outras linhas
            const linhas = tbody.querySelectorAll('tr:not(#semModulos)');
            linhas.forEach(linha => linha.remove());
            return;
        }
        
        // Ocultar mensagem "sem módulos"
        if (semModulos) {
            semModulos.style.display = 'none';
        }
        
        // Limpar tabela (exceto a linha "sem módulos")
        const linhas = tbody.querySelectorAll('tr:not(#semModulos)');
        linhas.forEach(linha => linha.remove());
        
        // Adicionar linhas dos módulos selecionados
        this.modulosSelecionados.forEach(modulo => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="text-center">
                    <i class="${this.escapeHtml(modulo.icone || 'fas fa-cube')}" 
                       style="color: ${this.escapeHtml(modulo.cor || '#6c757d')}; font-size: 1.2em;"></i>
                </td>
                <td class="fw-medium">${this.escapeHtml(modulo.nome)}</td>
                <td class="text-muted">${this.escapeHtml(modulo.descricao || '')}</td>
                <td>
                    <button type="button" class="btn btn-sm btn-outline-danger" 
                            onclick="window.pessoaFormManager.removerModulo(${modulo.id_modulo})" 
                            title="Remover módulo">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    async carregarModulosPessoa(pessoa) {
        if (!window.isEditMode || !pessoa) {
            return;
        }

        try {
            // Primeiro tentar usar os dados que já foram passados pelo controlador
            if (pessoa.modulos && pessoa.modulos.length > 0) {
                const modulosIds = pessoa.modulos;
                console.log('Módulos da pessoa (IDs do controlador):', modulosIds);
                
                // Para cada ID de módulo, encontrar os dados completos na lista de módulos disponíveis
                modulosIds.forEach(moduloId => {
                    const modulo = this.modulosDisponiveis.find(m => m.id_modulo == moduloId);
                    if (modulo && !this.modulosSelecionados.find(m => m.id_modulo == modulo.id_modulo)) {
                        this.modulosSelecionados.push(modulo);
                        console.log('Módulo adicionado:', modulo.nome);
                    }
                });
                
                // Atualizar a tabela
                this.atualizarTabelaModulos();
            } else {
                // Se não há dados do controlador, buscar via API
                const pessoaId = document.getElementById('pessoaId')?.value;
                if (!pessoaId) return;
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);
                
                const response = await fetch(`/pessoas/api/${pessoaId}/modulos`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    if (response.status === 404) {
                        console.log('Pessoa não possui módulos cadastrados');
                        return;
                    }
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    throw new Error('Resposta não é JSON válido');
                }
                
                const modulosPessoa = await response.json();
                console.log('Módulos da pessoa (API):', modulosPessoa);
                
                if (Array.isArray(modulosPessoa)) {
                    // Adicionar módulos já vinculados à lista de selecionados
                    modulosPessoa.forEach(modulo => {
                        if (modulo && modulo.id_modulo && !this.modulosSelecionados.find(m => m.id_modulo == modulo.id_modulo)) {
                            this.modulosSelecionados.push(modulo);
                        }
                    });
                    
                    // Atualizar a tabela
                    this.atualizarTabelaModulos();
                }
            }
        } catch (error) {
            console.error('Erro ao carregar módulos da pessoa:', error);
            
            let errorMessage = 'Erro ao carregar módulos da pessoa';
            let alertType = 'warning';
            
            if (error.name === 'AbortError') {
                errorMessage = 'Timeout ao carregar módulos da pessoa';
            } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
                errorMessage = 'Erro de conexão ao carregar módulos da pessoa';
            } else if (error.message.includes('HTTP 403')) {
                errorMessage = 'Acesso negado ao carregar módulos da pessoa';
                alertType = 'danger';
            } else if (error.message.includes('HTTP 500')) {
                errorMessage = 'Erro interno do servidor ao carregar módulos';
            } else if (error.message.includes('não é JSON')) {
                errorMessage = 'Resposta inválida ao carregar módulos da pessoa';
            }
            
            this.showAlert(errorMessage, alertType);
        }
    }

    async savePessoa() {
        if (this.isLoading) {
            return;
        }

        // Validações
        if (!this.validateForm()) {
            return;
        }

        this.setLoadingState(true);

        try {
            const pessoaId = document.getElementById('pessoaId')?.value;
            
            // Limpar máscara do CPF/CNPJ (manter apenas números)
            const cpfCnpjValue = document.getElementById('cpfCnpj')?.value || '';
            const cpfCnpjLimpo = cpfCnpjValue.replace(/\D/g, '');
            
            const data = {
                tipo: document.getElementById('tipo')?.value,
                nome: document.getElementById('nome')?.value,
                email: document.getElementById('email')?.value,
                cnpj_cpf: cpfCnpjLimpo,
                categoria: document.getElementById('categoria')?.value,
                telefone: document.getElementById('telefone')?.value,
                // Dados de login
                nivelAcesso: document.getElementById('nivelAcesso')?.value,
                statusLogin: document.getElementById('statusLogin')?.value,
                // Módulos selecionados
                modulos: this.modulosSelecionados.map(m => m.id_modulo)
            };
            
            const url = pessoaId ? `/pessoas/${pessoaId}` : '/pessoas';
            const method = pessoaId ? 'PUT' : 'POST';
            
            // Configurar timeout e abort controller
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos para operações de salvamento
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(data),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            // Verificar se a resposta é JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                if (response.status === 302 || response.status === 301) {
                    throw new Error('Sessão expirada. Faça login novamente.');
                }
                throw new Error('Resposta inválida do servidor');
            }
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                const message = pessoaId ? 
                    'Pessoa, dados de login e módulos atualizados com sucesso!' : 
                    'Pessoa, dados de login e módulos cadastrados com sucesso!';
                
                this.showAlert(message, 'success');
                
                // Se for um novo cadastro, limpar o formulário para facilitar novo cadastro
                if (!pessoaId) {
                    setTimeout(() => {
                        this.limparFormulario();
                    }, 2000);
                }
            } else {
                // Tratar erros específicos baseados no status HTTP
                let errorMessage = result.message || 'Erro desconhecido';
                let alertType = 'danger';
                
                if (response.status === 422) {
                    // Erro de validação
                    if (result.errors) {
                        const firstError = Object.values(result.errors)[0];
                        errorMessage = Array.isArray(firstError) ? firstError[0] : firstError;
                    }
                    alertType = 'warning';
                } else if (response.status === 409) {
                    // Conflito (email duplicado, etc.)
                    if (errorMessage.includes('email') || errorMessage.includes('Email')) {
                        errorMessage = '⚠️ Este email já está cadastrado no sistema. Por favor, utilize um email diferente.';
                    } else if (errorMessage.includes('cpf') || errorMessage.includes('cnpj')) {
                        errorMessage = '⚠️ Este CPF/CNPJ já está cadastrado no sistema.';
                    }
                    alertType = 'warning';
                } else if (response.status === 403) {
                    errorMessage = 'Acesso negado. Você não tem permissão para esta operação.';
                } else if (response.status === 404) {
                    errorMessage = 'Registro não encontrado.';
                } else if (response.status >= 500) {
                    errorMessage = 'Erro interno do servidor. Tente novamente em alguns minutos.';
                }
                
                this.showAlert('Erro ao salvar: ' + errorMessage, alertType);
            }
        } catch (error) {
            console.error('Erro ao salvar pessoa:', error);
            
            let errorMessage = 'Erro ao salvar pessoa';
            let alertType = 'danger';
            
            if (error.name === 'AbortError') {
                errorMessage = 'Operação cancelada por timeout. Verifique sua conexão e tente novamente.';
                alertType = 'warning';
            } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
                errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
                alertType = 'warning';
            } else if (error.message.includes('Sessão expirada')) {
                errorMessage = 'Sessão expirada. A página será recarregada.';
                alertType = 'warning';
                setTimeout(() => {
                    window.location.reload();
                }, 3000);
            } else if (error.message.includes('Resposta inválida')) {
                errorMessage = 'Resposta inválida do servidor. Tente recarregar a página.';
                alertType = 'warning';
            } else {
                errorMessage += ': ' + error.message;
            }
            
            this.showAlert(errorMessage, alertType);
            
            // Adicionar botão de retry para erros recuperáveis
            if (alertType === 'warning' && !error.message.includes('Sessão expirada')) {
                setTimeout(() => {
                    const alertContainer = document.querySelector('#alertContainer .alert:last-child');
                    if (alertContainer && !alertContainer.querySelector('.retry-btn')) {
                        const retryBtn = document.createElement('button');
                        retryBtn.className = 'btn btn-sm btn-outline-primary mt-2 retry-btn';
                        retryBtn.innerHTML = '<i class="fas fa-redo me-1"></i>Tentar Novamente';
                        retryBtn.onclick = () => {
                            alertContainer.remove();
                            this.savePessoa();
                        };
                        alertContainer.appendChild(retryBtn);
                    }
                }, 100);
            }
        } finally {
            this.setLoadingState(false);
        }
    }

    validateForm() {
        const errors = [];
        
        // Validar campos obrigatórios
        const tipo = document.getElementById('tipo')?.value;
        if (!tipo || !tipo.trim()) {
            errors.push({ field: 'tipo', message: 'Tipo é obrigatório' });
            this.showFieldError('tipo', 'Tipo é obrigatório');
        } else {
            this.clearFieldError('tipo');
        }
        
        const nome = document.getElementById('nome')?.value;
        if (!nome || !nome.trim()) {
            errors.push({ field: 'nome', message: 'Nome é obrigatório' });
            this.showFieldError('nome', 'Nome é obrigatório');
        } else if (nome.trim().length < 2) {
            errors.push({ field: 'nome', message: 'Nome deve ter pelo menos 2 caracteres' });
            this.showFieldError('nome', 'Nome deve ter pelo menos 2 caracteres');
        } else {
            this.clearFieldError('nome');
        }
        
        const email = document.getElementById('email')?.value;
        if (!email || !email.trim()) {
            errors.push({ field: 'email', message: 'Email é obrigatório' });
            this.showFieldError('email', 'Email é obrigatório');
        } else if (!this.validateEmail(email)) {
            errors.push({ field: 'email', message: 'Email inválido' });
            this.showFieldError('email', 'Email inválido');
        } else {
            this.clearFieldError('email');
        }
        
        const cpfCnpj = document.getElementById('cpfCnpj')?.value;
        if (!cpfCnpj || !cpfCnpj.trim()) {
            errors.push({ field: 'cpfCnpj', message: 'CPF/CNPJ é obrigatório' });
            this.showFieldError('cpfCnpj', 'CPF/CNPJ é obrigatório');
        } else if (!this.isValidCpfCnpj(cpfCnpj)) {
            errors.push({ field: 'cpfCnpj', message: 'CPF/CNPJ inválido' });
            this.showFieldError('cpfCnpj', 'CPF/CNPJ inválido');
        } else {
            this.clearFieldError('cpfCnpj');
        }
        
        // Validar se pelo menos uma categoria foi selecionada
        const categoriaValue = document.getElementById('categoria')?.value;
        if (!categoriaValue || categoriaValue.trim() === '') {
            errors.push({ field: 'categoria', message: 'Pelo menos uma categoria deve ser selecionada' });
            this.showFieldError('categoria', 'Pelo menos uma categoria deve ser selecionada');
        } else {
            this.clearFieldError('categoria');
        }
        
        // Validar telefone se preenchido
        const telefone = document.getElementById('telefone')?.value;
        if (telefone && telefone.trim() && !this.isValidPhone(telefone)) {
            errors.push({ field: 'telefone', message: 'Telefone inválido' });
            this.showFieldError('telefone', 'Telefone inválido');
        } else {
            this.clearFieldError('telefone');
        }
        
        // Validar dados de login obrigatórios
        const nivelAcesso = document.getElementById('nivelAcesso')?.value;
        const statusLogin = document.getElementById('statusLogin')?.value;
        
        if (!nivelAcesso) {
            errors.push({ field: 'nivelAcesso', message: 'Nível de acesso é obrigatório' });
            this.showFieldError('nivelAcesso', 'Nível de acesso é obrigatório');
        } else {
            this.clearFieldError('nivelAcesso');
        }
        
        if (!statusLogin) {
            errors.push({ field: 'statusLogin', message: 'Status do login é obrigatório' });
            this.showFieldError('statusLogin', 'Status do login é obrigatório');
        } else {
            this.clearFieldError('statusLogin');
        }
        
        // Validar se pelo menos um módulo foi selecionado
        if (this.modulosSelecionados.length === 0) {
            errors.push({ field: 'modulos', message: 'Pelo menos um módulo deve ser selecionado' });
            this.showAlert('Por favor, selecione pelo menos um módulo para a pessoa.', 'danger');
        }

        // Se há erros, mostrar o primeiro erro e retornar false
        if (errors.length > 0) {
            const firstError = errors[0];
            this.showAlert(firstError.message, 'warning');
            
            // Focar no primeiro campo com erro
            const fieldElement = document.getElementById(firstError.field);
            if (fieldElement) {
                fieldElement.focus();
            }
            
            return false;
        }

        return true;
    }

    setLoadingState(loading) {
        this.isLoading = loading;
        const form = document.getElementById('pessoaForm');
        const submitBtn = form?.querySelector('button[type="submit"]');
        
        if (loading) {
            form?.classList.add('loading');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Salvando...';
            }
        } else {
            form?.classList.remove('loading');
            if (submitBtn) {
                submitBtn.disabled = false;
                const isEdit = document.getElementById('pessoaId')?.value;
                submitBtn.innerHTML = `<i class="fas fa-save me-1"></i>${isEdit ? 'Atualizar' : 'Salvar'}`;
            }
        }
    }

    voltarPagina() {
        // Tentar voltar para a página anterior
        if (window.history.length > 1) {
            window.history.back();
        } else {
            // Se não há histórico, ir para a origem ou página padrão
            const origem = window.origemUrl || '/admin/pessoas';
            window.location.href = origem;
        }
        
        // Se a página foi aberta em uma nova aba, tentar fechá-la após um pequeno delay
        setTimeout(() => {
            if (window.opener) {
                window.close();
            }
        }, 100);
    }

    limparFormulario() {
        // Limpar campos do formulário
        const form = document.getElementById('pessoaForm');
        if (form) {
            form.reset();
        }
        
        // Limpar checkboxes de categoria
        const checkboxes = document.querySelectorAll('.categoria-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        
        // Limpar campo hidden de categoria
        const categoriaField = document.getElementById('categoria');
        if (categoriaField) {
            categoriaField.value = '';
        }
        
        // Limpar módulos selecionados
        this.modulosSelecionados = [];
        this.atualizarTabelaModulos();
        
        // Resetar selects para primeira opção
        const selects = document.querySelectorAll('select');
        selects.forEach(select => {
            select.selectedIndex = 0;
        });
        
        // Focar no primeiro campo
        const primeiroCampo = document.getElementById('tipo');
        if (primeiroCampo) {
            primeiroCampo.focus();
        }
    }

    showAlert(message, type) {
        const alertContainer = document.getElementById('alertContainer');
        if (!alertContainer) {
            console.warn('Container de alertas não encontrado');
            // Fallback: usar console ou alert nativo
            if (type === 'danger') {
                console.error('ERRO:', message);
            } else if (type === 'warning') {
                console.warn('AVISO:', message);
            } else {
                console.log('INFO:', message);
            }
            return;
        }
        
        // Definir ícone baseado no tipo
        let icon = 'exclamation-triangle';
        if (type === 'success') {
            icon = 'check-circle';
        } else if (type === 'warning') {
            icon = 'exclamation-triangle';
        } else if (type === 'danger') {
            icon = 'times-circle';
        } else if (type === 'info') {
            icon = 'info-circle';
        }
        
        // Criar ID único para o alerta
        const alertId = 'alert-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
        const alertHtml = `
            <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
                <i class="fas fa-${icon} me-2"></i>
                <span class="alert-message">${this.escapeHtml(message)}</span>
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
            </div>
        `;
        
        // Limitar número de alertas simultâneos
        const existingAlerts = alertContainer.querySelectorAll('.alert');
        if (existingAlerts.length >= 3) {
            // Remover o alerta mais antigo
            existingAlerts[0].remove();
        }
        
        // Adicionar novo alerta
        alertContainer.insertAdjacentHTML('beforeend', alertHtml);
        
        // Scroll para o alerta se necessário
        const newAlert = document.getElementById(alertId);
        if (newAlert) {
            // Verificar se o alerta está visível na viewport
            const rect = newAlert.getBoundingClientRect();
            if (rect.top < 0 || rect.bottom > window.innerHeight) {
                newAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
        
        // Auto-remover baseado no tipo
        let autoRemoveTime = 5000; // 5 segundos padrão
        if (type === 'success') {
            autoRemoveTime = 4000; // 4 segundos para sucesso
        } else if (type === 'danger') {
            autoRemoveTime = 8000; // 8 segundos para erros
        } else if (type === 'warning') {
            autoRemoveTime = 6000; // 6 segundos para avisos
        }
        
        setTimeout(() => {
            const alert = document.getElementById(alertId);
            if (alert && !alert.querySelector('.retry-btn')) {
                // Só remove automaticamente se não tem botão de retry
                alert.remove();
            }
        }, autoRemoveTime);
    }

    // Validações específicas
    isValidCpfCnpj(value) {
        const cleanValue = value.replace(/\D/g, '');
        
        if (cleanValue.length === 11) {
            return this.isValidCpf(cleanValue);
        } else if (cleanValue.length === 14) {
            return this.isValidCnpj(cleanValue);
        }
        
        return false;
    }
    
    isValidCpf(cpf) {
        if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
            return false;
        }
        
        let sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += parseInt(cpf.charAt(i)) * (10 - i);
        }
        
        let remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;
        if (remainder !== parseInt(cpf.charAt(9))) return false;
        
        sum = 0;
        for (let i = 0; i < 10; i++) {
            sum += parseInt(cpf.charAt(i)) * (11 - i);
        }
        
        remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;
        
        return remainder === parseInt(cpf.charAt(10));
    }
    
    isValidCnpj(cnpj) {
        if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) {
            return false;
        }
        
        let length = cnpj.length - 2;
        let numbers = cnpj.substring(0, length);
        let digits = cnpj.substring(length);
        let sum = 0;
        let pos = length - 7;
        
        for (let i = length; i >= 1; i--) {
            sum += numbers.charAt(length - i) * pos--;
            if (pos < 2) pos = 9;
        }
        
        let result = sum % 11 < 2 ? 0 : 11 - sum % 11;
        if (result !== parseInt(digits.charAt(0))) return false;
        
        length = length + 1;
        numbers = cnpj.substring(0, length);
        sum = 0;
        pos = length - 7;
        
        for (let i = length; i >= 1; i--) {
            sum += numbers.charAt(length - i) * pos--;
            if (pos < 2) pos = 9;
        }
        
        result = sum % 11 < 2 ? 0 : 11 - sum % 11;
        
        return result === parseInt(digits.charAt(1));
    }
    
    isValidPhone(phone) {
        const cleanPhone = phone.replace(/\D/g, '');
        return cleanPhone.length >= 10 && cleanPhone.length <= 11;
    }
    
    // Funções utilitárias para manipulação de DOM
    toggleClass(element, className, condition) {
        if (condition) {
            element.classList.add(className);
        } else {
            element.classList.remove(className);
        }
    }
    
    findOrCreateElement(parent, selector, tagName, className) {
        let element = parent.querySelector(selector);
        if (!element) {
            element = document.createElement(tagName);
            if (className) element.className = className;
            parent.appendChild(element);
        }
        return element;
    }
    
    removeElementIfExists(parent, selector) {
        const element = parent.querySelector(selector);
        if (element) {
            element.remove();
        }
    }
    
    // Métodos para mostrar/limpar erros de campo (refatorados)
    showFieldError(fieldId, message) {
        const field = document.getElementById(fieldId);
        if (!field) return;
        
        this.toggleClass(field, 'is-invalid', true);
        
        // Remover feedback anterior se existir
        this.removeElementIfExists(field.parentNode, '.invalid-feedback');
        
        // Adicionar novo feedback
        const feedback = this.findOrCreateElement(
            field.parentNode, 
            '.invalid-feedback', 
            'div', 
            'invalid-feedback'
        );
        feedback.textContent = message;
    }
    
    clearFieldError(fieldId) {
        const field = document.getElementById(fieldId);
        if (!field) return;
        
        this.toggleClass(field, 'is-invalid', false);
        this.removeElementIfExists(field.parentNode, '.invalid-feedback');
    }

    // Utility function para escapar HTML e prevenir XSS
    escapeHtml(text) {
        if (typeof text !== 'string') {
            return text;
        }
        
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        
        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    }
    
    // Método para verificar conectividade
    async checkConnectivity() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            
            const response = await fetch('/health-check', {
                method: 'HEAD',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            return response.ok;
        } catch (error) {
            return false;
        }
    }
    
    // Método para retry com backoff exponencial
    async retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await fn();
            } catch (error) {
                if (i === maxRetries - 1) {
                    throw error;
                }
                
                const delay = baseDelay * Math.pow(2, i);
                console.log(`Tentativa ${i + 1} falhou, tentando novamente em ${delay}ms...`);
                
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.pessoaFormManager = new PessoaFormManager();
        window.pessoaFormManager.init();
    } catch (error) {
        console.error('Erro crítico na inicialização:', error);
        
        // Mostrar erro para o usuário
        const alertContainer = document.getElementById('alertContainer');
        if (alertContainer) {
            alertContainer.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Erro ao inicializar a página. Recarregue a página ou contate o suporte.
                    <button type="button" class="btn btn-sm btn-outline-light ms-2" onclick="window.location.reload()">
                        <i class="fas fa-redo me-1"></i>Recarregar
                    </button>
                </div>
            `;
        }
    }
});

// Tratamento global de erros não capturados
window.addEventListener('error', (event) => {
    console.error('Erro JavaScript não capturado:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Promise rejeitada não tratada:', event.reason);
    event.preventDefault();
});

// Manter compatibilidade com código existente
window.PessoaForm = {
    adicionarModulo: () => {
        try {
            return window.pessoaFormManager?.adicionarModulo();
        } catch (error) {
            console.error('Erro ao adicionar módulo:', error);
            if (window.pessoaFormManager) {
                window.pessoaFormManager.showAlert('Erro ao adicionar módulo', 'danger');
            }
        }
    },
    voltarPagina: () => {
        try {
            return window.pessoaFormManager?.voltarPagina();
        } catch (error) {
            console.error('Erro ao voltar página:', error);
            // Fallback simples
            window.history.back();
        }
    }
};