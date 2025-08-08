/**
 * Gerenciador de Importação de CSV
 * Funcionalidade para importar cadastro de pessoas via arquivo CSV
 */
class ImportadorCsv {
    constructor() {
        this.init();
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        // Botão para baixar modelo CSV
        const btnBaixarModelo = document.getElementById('btnBaixarModelo');
        if (btnBaixarModelo) {
            btnBaixarModelo.addEventListener('click', () => {
                this.baixarModeloCsv();
            });
        }

        // Botão para importar CSV
        const btnImportar = document.getElementById('btnImportar');
        if (btnImportar) {
            btnImportar.addEventListener('click', () => {
                this.importarCsv();
            });
        }

        // Validação do arquivo selecionado
        const arquivoCsv = document.getElementById('arquivoCsv');
        if (arquivoCsv) {
            arquivoCsv.addEventListener('change', (e) => {
                this.validarArquivo(e.target.files[0]);
            });
        }
    }

    baixarModeloCsv() {
        // Criar dados do modelo CSV
        const dadosModelo = [
            ['Tipo', 'Categoria', 'Nome', 'Email', 'Telefone', 'CPF/CNPJ'],
            ['Pessoa Física', 'Coordenador', 'Ana Coordenadora', 'ana.coord@email.com', '(11) 99999-1111', '111.111.111-11'],
            ['Pessoa Física', 'Professor Orientador', 'João Silva', 'joao@email.com', '(11) 99999-9999', '123.456.789-00'],
            ['Pessoa Física', 'Aluno/Estagiário', 'Pedro Aluno', 'pedro.aluno@email.com', '(11) 88888-2222', '222.222.222-22'],
            ['Pessoa Jurídica', 'Concedente/Local de Estágio', 'Empresa ABC Ltda', 'contato@empresa.com', '(11) 3333-4444', '12.345.678/0001-90'],
            ['Pessoa Física', 'Supervisor', 'Maria Santos', 'maria@email.com', '(11) 88888-7777', '987.654.321-00'],
            ['Pessoa Jurídica', 'Curso/Instituição de Ensino', 'Universidade XYZ', 'contato@universidade.edu', '(11) 4444-5555', '98.765.432/0001-10'],
            ['Pessoa Física', 'Usuário Geral', 'Carlos Geral', 'carlos@email.com', '(11) 77777-8888', '333.333.333-33'],
            ['Não Informada', 'Usuário Geral', 'Sistema Automático', 'sistema@email.com', '', '']
        ];

        // Converter para CSV
        const csvContent = dadosModelo.map(linha => 
            linha.map(campo => `"${campo}"`).join(',')
        ).join('\n');
        
        // Criar e baixar arquivo CSV
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'modelo_importacao_pessoas.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    validarArquivo(arquivo) {
        if (!arquivo) return;

        const tiposPermitidos = ['text/csv', 'application/csv', 'text/plain'];
        const extensoesPermitidas = ['.csv'];
        
        const nomeArquivo = arquivo.name.toLowerCase();
        const extensaoValida = extensoesPermitidas.some(ext => nomeArquivo.endsWith(ext));
        const tipoValido = tiposPermitidos.includes(arquivo.type) || arquivo.type === '';

        if (!extensaoValida) {
            this.mostrarErro('Por favor, selecione um arquivo .csv válido.');
            document.getElementById('arquivoCsv').value = '';
            return false;
        }

        // Verificar tamanho (máximo 5MB)
        const tamanhoMaximo = 5 * 1024 * 1024; // 5MB
        if (arquivo.size > tamanhoMaximo) {
            this.mostrarErro('O arquivo deve ter no máximo 5MB.');
            document.getElementById('arquivoCsv').value = '';
            return false;
        }

        return true;
    }

    async importarCsv() {
        const arquivo = document.getElementById('arquivoCsv').files[0];
        const substituirDuplicados = document.getElementById('substituirDuplicados').checked;

        if (!arquivo) {
            this.mostrarErro('Por favor, selecione um arquivo para importar.');
            return;
        }

        if (!this.validarArquivo(arquivo)) {
            return;
        }

        try {
            this.mostrarProgresso(true);
            this.atualizarProgresso(10, 'Lendo arquivo...');

            // Ler arquivo CSV
            const dadosCsv = await this.lerArquivoCsv(arquivo);
            this.atualizarProgresso(30, 'Validando dados...');

            // Validar dados
            const dadosValidados = this.validarDados(dadosCsv);
            if (dadosValidados.erros.length > 0) {
                this.mostrarResultado(false, dadosValidados.erros);
                return;
            }

            this.atualizarProgresso(50, 'Enviando dados...');

            // Enviar dados para o servidor
            const resultado = await this.enviarDados(dadosValidados.dados, substituirDuplicados);
            this.atualizarProgresso(100, 'Concluído!');

            setTimeout(() => {
                this.mostrarResultado(resultado.success, resultado.message, resultado.detalhes);
                if (resultado.success) {
                    // Recarregar lista de pessoas com delay para evitar conflitos
                    if (typeof GerenciadorPessoas !== 'undefined') {
                        setTimeout(() => {
                            GerenciadorPessoas.buscarPessoas();
                        }, 200);
                    }
                }
            }, 500);

        } catch (error) {
            console.error('Erro na importação:', error);
            this.mostrarErro('Erro ao processar arquivo: ' + error.message);
        } finally {
            setTimeout(() => {
                this.mostrarProgresso(false);
            }, 1000);
        }
    }

    lerArquivoCsv(arquivo) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const csvText = e.target.result;
                    const linhas = this.parseCsv(csvText);
                    resolve(linhas);
                } catch (error) {
                    reject(new Error('Erro ao ler arquivo CSV: ' + error.message));
                }
            };
            reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
            reader.readAsText(arquivo, 'UTF-8');
        });
    }

    parseCsv(csvText) {
        const linhas = [];
        const linhasTexto = csvText.split('\n');
        
        for (let i = 0; i < linhasTexto.length; i++) {
            const linha = linhasTexto[i].trim();
            if (!linha) continue; // Pular linhas vazias
            
            const campos = [];
            let campoAtual = '';
            let dentroAspas = false;
            
            for (let j = 0; j < linha.length; j++) {
                const char = linha[j];
                
                if (char === '"') {
                    if (dentroAspas && linha[j + 1] === '"') {
                        // Aspas duplas escapadas
                        campoAtual += '"';
                        j++; // Pular próximo caractere
                    } else {
                        // Alternar estado das aspas
                        dentroAspas = !dentroAspas;
                    }
                } else if (char === ',' && !dentroAspas) {
                    // Separador de campo
                    campos.push(campoAtual.trim());
                    campoAtual = '';
                } else {
                    campoAtual += char;
                }
            }
            
            // Adicionar último campo
            campos.push(campoAtual.trim());
            linhas.push(campos);
        }
        
        return linhas;
    }

    validarDados(dadosCsv) {
        const erros = [];
        const dados = [];

        if (!dadosCsv || dadosCsv.length < 2) {
            erros.push('O arquivo deve conter pelo menos uma linha de cabeçalho e uma linha de dados.');
            return { erros, dados };
        }

        const cabecalhos = dadosCsv[0].map(h => h ? h.toString().trim().toLowerCase() : '');
        const indicesColunas = {
            tipo: this.encontrarIndiceColuna(cabecalhos, ['tipo']),
            categoria: this.encontrarIndiceColuna(cabecalhos, ['categoria']),
            nome: this.encontrarIndiceColuna(cabecalhos, ['nome']),
            email: this.encontrarIndiceColuna(cabecalhos, ['email', 'e-mail']),
            telefone: this.encontrarIndiceColuna(cabecalhos, ['telefone', 'fone']),
            cnpj_cpf: this.encontrarIndiceColuna(cabecalhos, ['cpf', 'cnpj', 'cpf/cnpj', 'cnpj/cpf'])
        };

        // Verificar colunas obrigatórias
        const colunasObrigatorias = ['tipo', 'categoria', 'nome', 'email'];
        for (const coluna of colunasObrigatorias) {
            if (indicesColunas[coluna] === -1) {
                erros.push(`Coluna obrigatória '${coluna}' não encontrada.`);
            }
        }

        if (erros.length > 0) {
            return { erros, dados };
        }

        // Validar dados das linhas
        for (let i = 1; i < dadosCsv.length; i++) {
            const linha = dadosCsv[i];
            if (!linha || linha.every(cell => !cell)) continue; // Pular linhas vazias

            const pessoa = {
                tipo: this.obterValorColuna(linha, indicesColunas.tipo),
                categoria: this.obterValorColuna(linha, indicesColunas.categoria),
                nome: this.obterValorColuna(linha, indicesColunas.nome),
                email: this.obterValorColuna(linha, indicesColunas.email),
                telefone: this.obterValorColuna(linha, indicesColunas.telefone),
                cnpj_cpf: this.obterValorColuna(linha, indicesColunas.cnpj_cpf)
            };

            // Validar campos obrigatórios
            if (!pessoa.tipo || !pessoa.categoria || !pessoa.nome || !pessoa.email) {
                erros.push(`Linha ${i + 1}: Campos obrigatórios não preenchidos.`);
                continue;
            }

            // Validar email
            if (!this.validarEmail(pessoa.email)) {
                erros.push(`Linha ${i + 1}: Email inválido (${pessoa.email}).`);
                continue;
            }

            // Mapear valores
            pessoa.tipo = this.mapearTipo(pessoa.tipo);
            pessoa.categoria = this.mapearCategoria(pessoa.categoria);

            if (!pessoa.tipo) {
                erros.push(`Linha ${i + 1}: Tipo inválido. Use: Pessoa Física, Pessoa Jurídica ou Não Informada.`);
                continue;
            }

            if (!pessoa.categoria) {
                erros.push(`Linha ${i + 1}: Categoria inválida.`);
                continue;
            }

            // Limpar máscaras de formatação antes de adicionar aos dados
            if (pessoa.telefone) {
                pessoa.telefone = this.limparMascaraTelefone(pessoa.telefone);
            }
            if (pessoa.cnpj_cpf) {
                pessoa.cnpj_cpf = this.limparMascaraCpfCnpj(pessoa.cnpj_cpf);
            }

            dados.push(pessoa);
        }

        return { erros, dados };
    }

    encontrarIndiceColuna(cabecalhos, possiveisNomes) {
        for (const nome of possiveisNomes) {
            const indice = cabecalhos.findIndex(h => h.includes(nome));
            if (indice !== -1) return indice;
        }
        return -1;
    }

    obterValorColuna(linha, indice) {
        if (indice === -1 || !linha[indice]) return '';
        return linha[indice].toString().trim();
    }

    validarEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    mapearTipo(tipo) {
        const tipos = {
            'pessoa física': 'F',
            'pessoa fisica': 'F',
            'física': 'F',
            'fisica': 'F',
            'f': 'F',
            'pessoa jurídica': 'J',
            'pessoa juridica': 'J',
            'jurídica': 'J',
            'juridica': 'J',
            'j': 'J',
            'não informada': 'N',
            'nao informada': 'N',
            'n': 'N'
        };
        return tipos[tipo.toLowerCase()] || null;
    }

    mapearCategoria(categoria) {
        const categorias = {
            'coordenador': '1',
            'professor orientador': '2',
            'orientador': '2',
            'aluno': '3',
            'estagiário': '3',
            'estagiario': '3',
            'aluno/estagiário': '3',
            'concedente': '4',
            'concedente/local de estágio': '4',
            'local de estágio': '4',
            'supervisor': '5',
            'curso': '6',
            'instituição': '6',
            'instituicao': '6',
            'curso/instituição': '6',
            'usuário geral': '99',
            'usuario geral': '99',
            'geral': '99'
        };
        return categorias[categoria.toLowerCase()] || null;
    }

    // Função para limpar máscara do telefone (manter apenas dígitos)
    limparMascaraTelefone(telefone) {
        return telefone ? telefone.replace(/\D/g, '') : '';
    }

    // Função para limpar máscara do CPF/CNPJ (manter apenas dígitos)
    limparMascaraCpfCnpj(cpfCnpj) {
        return cpfCnpj ? cpfCnpj.replace(/\D/g, '') : '';
    }

    async enviarDados(dados, substituirDuplicados) {
        const response = await fetch('/api/pessoas/importar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                pessoas: dados,
                substituirDuplicados: substituirDuplicados
            }),
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Erro na comunicação com o servidor');
        }

        return await response.json();
    }

    mostrarProgresso(mostrar) {
        const progressoDiv = document.getElementById('progressoImportacao');
        const resultadoDiv = document.getElementById('resultadoImportacao');
        
        if (mostrar) {
            progressoDiv.style.display = 'block';
            resultadoDiv.style.display = 'none';
        } else {
            progressoDiv.style.display = 'none';
        }
    }

    atualizarProgresso(porcentagem, texto) {
        const progressBar = document.querySelector('#progressoImportacao .progress-bar');
        const textoDiv = document.querySelector('#progressoImportacao div:first-child strong');
        
        if (progressBar) {
            progressBar.style.width = porcentagem + '%';
            progressBar.setAttribute('aria-valuenow', porcentagem);
        }
        
        if (textoDiv) {
            textoDiv.textContent = texto;
        }
    }

    mostrarResultado(sucesso, mensagem, detalhes = null) {
        const resultadoDiv = document.getElementById('resultadoImportacao');
        
        let html = `
            <div class="alert ${sucesso ? 'alert-success' : 'alert-danger'}">
                <h6><i class="fas ${sucesso ? 'fa-check-circle' : 'fa-exclamation-triangle'} me-2"></i>
                    ${sucesso ? 'Importação Concluída' : 'Erro na Importação'}
                </h6>
                <p class="mb-0">${mensagem}</p>
        `;
        
        if (detalhes) {
            html += `<hr><small>${detalhes}</small>`;
        }
        
        html += '</div>';
        
        resultadoDiv.innerHTML = html;
        resultadoDiv.style.display = 'block';
        
        if (sucesso) {
            // Limpar formulário após sucesso
            document.getElementById('formImportarCsv').reset();
        }
    }

    mostrarErro(mensagem) {
        this.mostrarResultado(false, mensagem);
    }
}

// Classe disponível globalmente - será instanciada manualmente quando necessário