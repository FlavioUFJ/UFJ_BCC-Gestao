/**
 * Gerenciador de Pessoas - Componente para buscar e cadastrar pessoas
 * Usado nos formulários que precisam selecionar pessoas
 */
class PessoaManager {
    constructor() {
        this.modalHtml = `
            <div class="modal fade" id="pessoaModal" tabindex="-1" aria-labelledby="pessoaModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="pessoaModalLabel">Buscar ou Cadastrar Pessoa</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <!-- Abas -->
                            <ul class="nav nav-tabs" id="pessoaTabs" role="tablist">
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link active" id="buscar-tab" data-bs-toggle="tab" data-bs-target="#buscar" type="button" role="tab">Buscar Pessoa</button>
                                </li>
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link" id="cadastrar-tab" data-bs-toggle="tab" data-bs-target="#cadastrar" type="button" role="tab">Cadastrar Nova</button>
                                </li>
                            </ul>
                            
                            <div class="tab-content" id="pessoaTabContent">
                                <!-- Aba Buscar -->
                                <div class="tab-pane fade show active" id="buscar" role="tabpanel">
                                    <div class="mt-3">
                                        <div class="row">
                                            <div class="col-md-8">
                                                <input type="text" class="form-control" id="termoBusca" placeholder="Digite nome ou email para buscar..." minlength="2">
                                            </div>
                                            <div class="col-md-4">
                                                <select class="form-select" id="categoriaBusca">
                                                    <option value="todos">Todas as categorias</option>
                                                    <option value="1">Coordenador</option>
                                                    <option value="2">Professor Orientador</option>
                                                    <option value="3">Aluno/Estagiário</option>
                                                    <option value="4">Concedente/Local de Estágio</option>
                                                    <option value="5">Supervisor</option>
                                                    <option value="6">Curso/Instituição de Ensino</option>
                                                    <option value="99">Usuário Geral</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div class="mt-3" id="resultadosBusca"></div>
                                        <div class="d-flex justify-content-between align-items-center mt-3" id="paginationControls" style="display: none !important;">
                                            <button type="button" class="btn btn-outline-secondary btn-sm" id="btnPrevious" disabled>
                                                <i class="fas fa-chevron-left"></i>
                                            </button>
                                            <span id="pageInfo" class="text-muted">Página 1</span>
                                            <button type="button" class="btn btn-outline-secondary btn-sm" id="btnNext">
                                                <i class="fas fa-chevron-right"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Aba Cadastrar -->
                                <div class="tab-pane fade" id="cadastrar" role="tabpanel">
                                    <form id="formCadastrarPessoa" class="mt-3">
                                        <div class="row">
                                            <div class="col-md-6">
                                                <label for="tipo" class="form-label">Tipo *</label>
                                                <select class="form-select" id="tipo" name="tipo" required>
                                                    <option value="">Selecione...</option>
                                                    <option value="Pessoa Física">Pessoa Física</option>
                                                    <option value="Pessoa Jurídica">Pessoa Jurídica</option>
                                                    <option value="Não Informada">Não Informada</option>
                                                </select>
                                            </div>
                                            <div class="col-md-6">
                                                <label for="categoria" class="form-label">Categoria</label>
                                                <select class="form-select" id="categoria" name="categoria">
                                                    <option value="">Selecione...</option>
                                                    <option value="Coordenador">Coordenador</option>
                                                    <option value="Professor Orientador">Professor Orientador</option>
                                                    <option value="Aluno/Estagiário">Aluno/Estagiário</option>
                                                    <option value="Concedente/Local de Estágio">Concedente/Local de Estágio</option>
                                                    <option value="Supervisor">Supervisor</option>
                                                    <option value="Curso/Instituição de Ensino">Curso/Instituição de Ensino</option>
                                                    <option value="Usuário Geral">Usuário Geral</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div class="row mt-3">
                                            <div class="col-md-6">
                                                <label for="nome" class="form-label">Nome *</label>
                                                <input type="text" class="form-control" id="nome" name="nome" required>
                                            </div>
                                            <div class="col-md-6">
                                                <label for="cnpj_cpf" class="form-label">CPF/CNPJ</label>
                                                <input type="text" class="form-control" id="cnpj_cpf" name="cnpj_cpf">
                                            </div>
                                        </div>
                                        <div class="row mt-3">
                                            <div class="col-md-6">
                                                <label for="email" class="form-label">Email *</label>
                                                <input type="email" class="form-control" id="email" name="email" required>
                                            </div>
                                            <div class="col-md-6">
                                                <label for="telefone" class="form-label">Telefone</label>
                                                <input type="text" class="form-control" id="telefone" name="telefone">
                                            </div>
                                        </div>
                                        <div class="mt-3">
                                            <button type="submit" class="btn btn-primary">Cadastrar Pessoa</button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.currentCallback = null;
        this.currentInputId = null;
        this.currentPage = 1;
        this.itemsPerPage = 15;
        this.totalItems = 0;
        this.allPersons = [];
        this.init();
    }
    
    init() {
        // Adicionar modal ao DOM se não existir
        if (!document.getElementById('pessoaModal')) {
            document.body.insertAdjacentHTML('beforeend', this.modalHtml);
        }
        
        this.bindEvents();
    }
    
    bindEvents() {
        // Busca em tempo real
        const termoBusca = document.getElementById('termoBusca');
        const categoriaBusca = document.getElementById('categoriaBusca');
        
        if (termoBusca) {
            termoBusca.addEventListener('input', this.debounce(() => {
                const termo = termoBusca.value.trim();
                if (termo.length === 0) {
                    // Se campo foi limpo, voltar para listagem paginada
                    this.currentPage = 1;
                    this.carregarTodasPessoas();
                } else {
                    // Buscar com qualquer quantidade de caracteres
                    this.buscarPessoas();
                }
            }, 300));
        }
        
        if (categoriaBusca) {
            categoriaBusca.addEventListener('change', () => {
                this.buscarPessoas();
            });
        }
        
        // Form de cadastro
        const formCadastrar = document.getElementById('formCadastrarPessoa');
        if (formCadastrar) {
            formCadastrar.addEventListener('submit', (e) => {
                e.preventDefault();
                this.cadastrarPessoa();
            });
        }
        
        // Formatação automática dos campos
        const cpfCnpjInput = document.getElementById('cnpj_cpf');
        const telefoneInput = document.getElementById('telefone');
        
        if (cpfCnpjInput) {
            cpfCnpjInput.addEventListener('input', (e) => {
                this.formatarCpfCnpj(e.target);
            });
        }
        
        if (telefoneInput) {
            telefoneInput.addEventListener('input', (e) => {
                this.formatarTelefone(e.target);
            });
        }
        
        // Controles de paginação
        const btnPrevious = document.getElementById('btnPrevious');
        const btnNext = document.getElementById('btnNext');
        
        if (btnPrevious) {
            btnPrevious.addEventListener('click', () => {
                this.previousPage();
            });
        }
        
        if (btnNext) {
            btnNext.addEventListener('click', () => {
                this.nextPage();
            });
        }
    }
    
    // Função para abrir o modal e definir callback
    abrirModal(inputId, callback, config = {}) {
        this.currentInputId = inputId;
        this.currentCallback = callback;
        this.currentConfig = config;
        
        // Configurações padrão
        const defaultConfig = {
            showBuscarTab: true,
            cadastrarTabTitle: 'Cadastrar Nova',
            submitButtonText: 'Salvar',
            modalTitle: 'Buscar ou Cadastrar Pessoa',
            editMode: false,
            personData: null,
            showTabs: true
        };
        
        this.config = { ...defaultConfig, ...config };
        
        // Mapear campos para categorias automaticamente
        const categoriaMap = {
            'id_pessoa_curso': '6', // Curso/Instituição de Ensino
            'id_pessoa_estagiario': '3', // Aluno/Estagiário
            'id_pessoa_orientador': '2', // Professor Orientador
            'id_pessoa_concedente': '4', // Concedente/Local de Estágio
            'id_pessoa_supervisor': '5' // Supervisor
        };
        
        // Definir categoria automaticamente baseada no inputId
        const categoriaAutomatica = categoriaMap[inputId];
        
        // Configurar título do modal
        document.getElementById('pessoaModalLabel').textContent = this.config.modalTitle;
        
        // Configurar abas
        const buscarTab = document.getElementById('buscar-tab');
        const cadastrarTab = document.getElementById('cadastrar-tab');
        const buscarPane = document.getElementById('buscar');
        const cadastrarPane = document.getElementById('cadastrar');
        const tabsContainer = document.querySelector('.nav-tabs');
        
        // Configurar visibilidade das abas
        if (this.config.showTabs) {
            tabsContainer.style.display = 'flex';
            // Reabilitar eventos das abas quando visíveis
            buscarTab.style.pointerEvents = 'auto';
            cadastrarTab.style.pointerEvents = 'auto';
            // Restaurar visibilidade dos textos das abas
            buscarTab.style.visibility = 'visible';
            cadastrarTab.style.visibility = 'visible';
            
            // Configurar visibilidade da aba buscar
            if (this.config.showBuscarTab) {
                buscarTab.style.display = 'block';
                buscarTab.classList.add('active');
                cadastrarTab.classList.remove('active');
                buscarPane.classList.add('show', 'active');
                cadastrarPane.classList.remove('show', 'active');
            } else {
                buscarTab.style.display = 'none';
                cadastrarTab.classList.add('active');
                buscarTab.classList.remove('active');
                cadastrarPane.classList.add('show', 'active');
                buscarPane.classList.remove('show', 'active');
            }
            
            // Configurar título da aba cadastrar
            cadastrarTab.textContent = this.config.cadastrarTabTitle;
        } else {
            // Ocultar completamente as abas e mostrar apenas o formulário de cadastro
            tabsContainer.style.display = 'none';
            // Garantir que apenas a aba de cadastro esteja ativa
            buscarTab.classList.remove('active');
            cadastrarTab.classList.remove('active');
            buscarPane.classList.remove('show', 'active');
            cadastrarPane.classList.add('show', 'active');
            // Desabilitar eventos das abas quando ocultas
            buscarTab.style.pointerEvents = 'none';
            cadastrarTab.style.pointerEvents = 'none';
            // Ocultar completamente os textos das abas
            buscarTab.style.visibility = 'hidden';
            cadastrarTab.style.visibility = 'hidden';
        }
        
        // Configurar botão de submit
        const submitButton = document.querySelector('#formCadastrarPessoa button[type="submit"]');
        if (submitButton) {
            submitButton.textContent = this.config.submitButtonText;
        }
        
        // Limpar campos
        if (!this.config.editMode) {
            document.getElementById('termoBusca').value = '';
            // Aplicar categoria automática se definida, senão usar 'todos'
            document.getElementById('categoriaBusca').value = categoriaAutomatica || 'todos';
            document.getElementById('resultadosBusca').innerHTML = '';
            document.getElementById('formCadastrarPessoa').reset();
            
            // Se há categoria automática, também definir no formulário de cadastro
            if (categoriaAutomatica) {
                const categoriaTextoMap = {
                    '6': 'Curso/Instituição de Ensino',
                    '3': 'Aluno/Estagiário',
                    '2': 'Professor Orientador',
                    '4': 'Concedente/Local de Estágio',
                    '5': 'Supervisor'
                };
                const categoriaSelect = document.getElementById('categoria');
                if (categoriaSelect && categoriaTextoMap[categoriaAutomatica]) {
                    categoriaSelect.value = categoriaTextoMap[categoriaAutomatica];
                }
            }
        }
        
        // Carregar dados para edição se fornecidos
        if (this.config.editMode && this.config.personData) {
            this.carregarDadosParaEdicao(this.config.personData);
        }
        
        // Reset pagination
        this.currentPage = 1;
        
        // Carregar todas as pessoas se aba buscar estiver visível e as abas estiverem sendo mostradas
        if (this.config.showTabs && this.config.showBuscarTab) {
            this.carregarTodasPessoas();
        }
        
        // Abrir modal
        const modal = new bootstrap.Modal(document.getElementById('pessoaModal'));
        
        // Adicionar listener para garantir que o loading seja removido quando o modal for fechado
        const modalElement = document.getElementById('pessoaModal');
        modalElement.addEventListener('hidden.bs.modal', () => {
            // Remover classe loading do body caso tenha ficado ativa
            document.body.classList.remove('loading');
        }, { once: true });
        
        modal.show();
    }
    
    carregarDadosParaEdicao(personData) {
        // Preencher os campos do formulário com os dados da pessoa
        document.getElementById('nome').value = personData.nome || '';
        document.getElementById('email').value = personData.email || '';
        document.getElementById('telefone').value = personData.telefone || '';
        document.getElementById('cnpj_cpf').value = personData.cnpj_cpf || '';
        
        // Mapear categoria do banco para o valor do select
        const categoriaReverseMap = {
            '1': 'Coordenador',
            '2': 'Professor Orientador',
            '3': 'Aluno/Estagiário',
            '4': 'Concedente/Local de Estágio',
            '5': 'Supervisor',
            '6': 'Curso/Instituição de Ensino',
            '99': 'Usuário Geral'
        };
        
        const categoriaSelect = document.getElementById('categoria');
        if (categoriaSelect && personData.categoria) {
            categoriaSelect.value = categoriaReverseMap[personData.categoria] || '';
        }
        
        // Mapear tipo do banco para o valor do select
        const tipoReverseMap = {
            'F': 'Pessoa Física',
            'J': 'Pessoa Jurídica',
            'N': 'Não Informada'
        };
        
        const tipoSelect = document.getElementById('tipo');
        if (tipoSelect && personData.tipo) {
            tipoSelect.value = tipoReverseMap[personData.tipo] || '';
        }
        
        // Armazenar o ID da pessoa para uso na atualização
        this.editingPersonId = personData.id_pessoa;
    }
    
    async buscarPessoas() {
        const termo = document.getElementById('termoBusca').value.trim();
        const categoria = document.getElementById('categoriaBusca').value;
        console.log('DEBUG Frontend - Valores capturados:', { termo, categoria });
        const resultadosDiv = document.getElementById('resultadosBusca');
        
        // Ocultar controles de paginação durante busca específica
        document.getElementById('paginationControls').style.display = 'none';
        
        try {
            const response = await fetch(`/secure/pessoas/buscar?termo=${encodeURIComponent(termo)}&categoria=${categoria}`);
            const data = await response.json();
            
            if (data.success) {
                this.exibirResultados(data.pessoas);
            } else {
                resultadosDiv.innerHTML = `<div class="alert alert-warning">${data.message}</div>`;
            }
        } catch (error) {
            console.error('Erro ao buscar pessoas:', error);
            resultadosDiv.innerHTML = '<div class="alert alert-danger">Erro ao buscar pessoas</div>';
        }
    }
    
    exibirResultados(pessoas) {
        const resultadosDiv = document.getElementById('resultadosBusca');
        
        if (pessoas.length === 0) {
            resultadosDiv.innerHTML = '<p class="text-muted">Nenhuma pessoa encontrada</p>';
            return;
        }
        
        // Mapear códigos de categoria para nomes legíveis
        const categoriaNomes = {
            '1': 'Coordenador',
            '2': 'Professor Orientador',
            '3': 'Aluno/Estagiário',
            '4': 'Concedente/Local de Estágio',
            '5': 'Supervisor',
            '6': 'Curso/Instituição de Ensino',
            '99': 'Usuário Geral'
        };
        
        let html = '<div class="list-group">';
        pessoas.forEach((pessoa, index) => {
            const categoriaNome = categoriaNomes[pessoa.categoria] || 'Sem categoria';
            html += `
                <div class="list-group-item list-group-item-action pessoa-item" style="cursor: pointer;" data-pessoa-id="${pessoa.id_pessoa}" data-pessoa-nome="${pessoa.nome}" data-index="${index}">  
                    <div class="d-flex w-100 justify-content-between">
                        <h6 class="mb-1">${pessoa.nome}</h6>
                        <small class="text-muted">${categoriaNome}</small>
                    </div>
                    <p class="mb-1">${pessoa.email || 'Sem email'}</p>
                </div>
            `;
        });
        html += '</div>';
        
        resultadosDiv.innerHTML = html;
        
        // Adicionar event listeners para cada item
        const items = resultadosDiv.querySelectorAll('.pessoa-item');
        items.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const pessoaId = item.getAttribute('data-pessoa-id');
                const pessoaNome = item.getAttribute('data-pessoa-nome');
                this.selecionarPessoa(pessoaId, pessoaNome);
            });
        });
    }
    
    selecionarPessoa(id, nome) {
        try {
            console.log('Selecionando pessoa:', { id, nome });
            
            if (this.currentCallback) {
                // Criar objeto pessoa com a estrutura esperada pelos callbacks
                const pessoa = {
                    id_pessoa: id,
                    nome: nome
                };
                this.currentCallback(pessoa);
            } else {
                console.warn('Nenhum callback definido para seleção de pessoa');
            }
            
            // Fechar modal com tratamento de erro
            const modalElement = document.getElementById('pessoaModal');
            if (modalElement) {
                const modal = bootstrap.Modal.getInstance(modalElement);
                if (modal) {
                    modal.hide();
                } else {
                    // Fallback: criar nova instância do modal e fechar
                    const newModal = new bootstrap.Modal(modalElement);
                    newModal.hide();
                }
            } else {
                console.error('Modal pessoaModal não encontrado');
            }
        } catch (error) {
            console.error('Erro ao selecionar pessoa:', error);
            // Tentar fechar modal mesmo com erro
            try {
                const modalElement = document.getElementById('pessoaModal');
                if (modalElement) {
                    modalElement.style.display = 'none';
                    document.body.classList.remove('modal-open');
                    const backdrop = document.querySelector('.modal-backdrop');
                    if (backdrop) {
                        backdrop.remove();
                    }
                }
            } catch (fallbackError) {
                console.error('Erro no fallback de fechamento do modal:', fallbackError);
            }
        }
    }
    
    async cadastrarPessoa() {
        const formData = new FormData(document.getElementById('formCadastrarPessoa'));
        const data = Object.fromEntries(formData.entries());
        
        // Mapear os valores do tipo para os códigos esperados pelo banco
        const tipoMap = {
            'Pessoa Física': 'F',
            'Pessoa Jurídica': 'J',
            'Não Informada': 'N'
        };
        
        // Mapear os valores da categoria para os códigos esperados pelo banco
        const categoriaMap = {
            'Coordenador': '1',
            'Professor Orientador': '2',
            'Aluno/Estagiário': '3',
            'Concedente/Local de Estágio': '4',
            'Supervisor': '5',
            'Curso/Instituição de Ensino': '6',
            'Usuário Geral': '99'
        };
        
        if (data.tipo && tipoMap[data.tipo]) {
            data.tipo = tipoMap[data.tipo];
        }
        
        if (data.categoria && categoriaMap[data.categoria]) {
            data.categoria = categoriaMap[data.categoria];
        }
        
        try {
            let response, result;
            
            if (this.config && this.config.editMode && this.editingPersonId) {
                // Modo edição - fazer PUT para atualizar
                response = await fetch(`/api/pessoas/${this.editingPersonId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
            } else {
                // Modo cadastro - fazer POST para criar
                response = await fetch('/secure/pessoas/criar', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
            }
            
            result = await response.json();
            
            if (result.success) {
                alert(result.message);
                
                // Selecionar a pessoa (recém-criada ou editada)
                if (this.currentCallback) {
                    const pessoa = result.pessoa || { id_pessoa: this.editingPersonId, nome: data.nome };
                    this.currentCallback(pessoa.id_pessoa, pessoa.nome);
                }
                
                // Fechar modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('pessoaModal'));
                modal.hide();
            } else {
                alert('Erro: ' + result.message);
            }
        } catch (error) {
            console.error('Erro ao cadastrar pessoa:', error);
            alert('Erro ao cadastrar pessoa');
        }
    }
    
    // Função para formatar CPF/CNPJ automaticamente
    formatarCpfCnpj(input) {
        let valor = input.value.replace(/\D/g, ''); // Remove tudo que não é dígito
        
        if (valor.length <= 11) {
            // Formato CPF: 000.000.000-00
            valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
            valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
            valor = valor.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        } else {
            // Formato CNPJ: 00.000.000/0000-00
            valor = valor.replace(/(\d{2})(\d)/, '$1.$2');
            valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
            valor = valor.replace(/(\d{3})(\d)/, '$1/$2');
            valor = valor.replace(/(\d{4})(\d{1,2})$/, '$1-$2');
        }
        
        input.value = valor;
    }
    
    // Função para formatar telefone automaticamente
    formatarTelefone(input) {
        let valor = input.value.replace(/\D/g, ''); // Remove tudo que não é dígito
        
        // Formato: (00)00000-0000 ou (00)0000-0000
        if (valor.length >= 11) {
            // Celular com 9 dígitos
            valor = valor.replace(/(\d{2})(\d{5})(\d{4})/, '($1)$2-$3');
        } else if (valor.length >= 10) {
            // Telefone fixo com 8 dígitos
            valor = valor.replace(/(\d{2})(\d{4})(\d{4})/, '($1)$2-$3');
        } else if (valor.length >= 6) {
            valor = valor.replace(/(\d{2})(\d{4,5})/, '($1)$2');
        } else if (valor.length >= 2) {
            valor = valor.replace(/(\d{2})/, '($1)');
        }
        
        input.value = valor;
    }
    
    // Carregar todas as pessoas para paginação
    async carregarTodasPessoas() {
        try {
            const categoria = document.getElementById('categoriaBusca').value;
            console.log('DEBUG Frontend - carregarTodasPessoas categoria:', categoria);
            const response = await fetch(`/secure/pessoas/buscar?termo=&categoria=${categoria}`);
            const data = await response.json();
            
            if (data.success) {
                this.allPersons = data.pessoas;
                this.totalItems = this.allPersons.length;
                this.exibirResultadosPaginados();
            } else {
                document.getElementById('resultadosBusca').innerHTML = `<div class="alert alert-warning">${data.message}</div>`;
            }
        } catch (error) {
            console.error('Erro ao carregar pessoas:', error);
            document.getElementById('resultadosBusca').innerHTML = '<div class="alert alert-danger">Erro ao carregar pessoas</div>';
        }
    }
    
    // Exibir resultados com paginação
    exibirResultadosPaginados() {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pessoasPagina = this.allPersons.slice(startIndex, endIndex);
        
        this.exibirResultados(pessoasPagina);
        this.atualizarControlesPaginacao();
    }
    
    // Atualizar controles de paginação
    atualizarControlesPaginacao() {
        const totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
        const paginationControls = document.getElementById('paginationControls');
        const btnPrevious = document.getElementById('btnPrevious');
        const btnNext = document.getElementById('btnNext');
        const pageInfo = document.getElementById('pageInfo');
        
        if (this.totalItems > this.itemsPerPage) {
            paginationControls.style.display = 'flex';
            
            btnPrevious.disabled = this.currentPage === 1;
            btnNext.disabled = this.currentPage === totalPages;
            
            pageInfo.textContent = `Página ${this.currentPage} de ${totalPages} (${this.totalItems} registros)`;
        } else {
            paginationControls.style.display = 'none';
        }
    }
    
    // Página anterior
    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.exibirResultadosPaginados();
        }
    }
    
    // Próxima página
    nextPage() {
        const totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.exibirResultadosPaginados();
        }
    }
    
    // Função utilitária para debounce
    debounce(func, wait) {
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
}

// Instanciar o gerenciador globalmente
const pessoaManager = new PessoaManager();

// Função helper para criar botões de busca de pessoa
function criarBotaoBuscarPessoa(inputId, labelText = 'Buscar') {
    return `<button type="button" class="btn btn-outline-secondary btn-sm ms-2" onclick="pessoaManager.abrirModal('${inputId}', function(id, nome) { 
        document.getElementById('${inputId}').value = id;
        document.getElementById('${inputId}_nome').value = nome;
    })">
        <i class="fas fa-search"></i> ${labelText}
    </button>`;
}