/**
 * Funcionalidade para mostrar/ocultar senha
 * Adiciona ícones de olho em campos de senha para alternar visibilidade
 */

class PasswordToggle {
    constructor() {
        this.init();
    }

    init() {
        // Aguardar o DOM estar carregado
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupPasswordToggles());
        } else {
            this.setupPasswordToggles();
        }
    }

    setupPasswordToggles() {
        // Encontrar todos os campos de senha
        const passwordInputs = document.querySelectorAll('input[type="password"]');
        
        passwordInputs.forEach(input => {
            this.addToggleToPasswordField(input);
        });
    }

    addToggleToPasswordField(passwordInput) {
        // Verificar se já foi processado
        if (passwordInput.dataset.passwordToggleAdded) {
            return;
        }

        // Marcar como processado
        passwordInput.dataset.passwordToggleAdded = 'true';

        // Criar container se não existir
        let container = passwordInput.parentElement;
        if (!container.classList.contains('password-input-container')) {
            // Criar novo container
            const newContainer = document.createElement('div');
            newContainer.className = 'password-input-container';
            
            // Verificar se há ícone à esquerda (input-group)
            const inputGroup = passwordInput.closest('.input-group');
            if (inputGroup) {
                newContainer.classList.add('has-left-icon');
            }
            
            // Inserir container antes do input
            passwordInput.parentNode.insertBefore(newContainer, passwordInput);
            
            // Mover input para dentro do container
            newContainer.appendChild(passwordInput);
            
            container = newContainer;
        }

        // Criar botão de toggle
        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'password-toggle-btn';
        toggleBtn.setAttribute('aria-label', 'Mostrar/ocultar senha');
        toggleBtn.innerHTML = '<i class="fas fa-eye"></i>';

        // Adicionar evento de clique
        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.togglePasswordVisibility(passwordInput, toggleBtn);
        });

        // Adicionar botão ao container
        container.appendChild(toggleBtn);
    }

    togglePasswordVisibility(passwordInput, toggleBtn) {
        const icon = toggleBtn.querySelector('i');
        
        if (passwordInput.type === 'password') {
            // Mostrar senha
            passwordInput.type = 'text';
            icon.className = 'fas fa-eye-slash';
            toggleBtn.setAttribute('aria-label', 'Ocultar senha');
        } else {
            // Ocultar senha
            passwordInput.type = 'password';
            icon.className = 'fas fa-eye';
            toggleBtn.setAttribute('aria-label', 'Mostrar senha');
        }
    }

    // Método público para adicionar toggle a um campo específico
    addToggleToField(fieldId) {
        const field = document.getElementById(fieldId);
        if (field && field.type === 'password') {
            this.addToggleToPasswordField(field);
        }
    }

    // Método público para reinicializar (útil para conteúdo dinâmico)
    reinitialize() {
        this.setupPasswordToggles();
    }
}

// Inicializar automaticamente
const passwordToggle = new PasswordToggle();

// Exportar para uso global
window.PasswordToggle = PasswordToggle;
window.passwordToggle = passwordToggle;

// Função de conveniência para adicionar a campos específicos
window.addPasswordToggle = function(fieldId) {
    passwordToggle.addToggleToField(fieldId);
};

// Função para reinicializar após carregamento dinâmico
window.reinitializePasswordToggles = function() {
    passwordToggle.reinitialize();
};