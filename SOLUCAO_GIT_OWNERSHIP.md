# Solução para Erro de Propriedade Duvidosa do Git

## Problema
```
fatal: detected dubious ownership in repository at '/var/www/html/gestao'
To add an exception for this directory, call:
```

## Causa
Este erro ocorre quando o Git detecta que o repositório está em um diretório que pertence a um usuário diferente do usuário atual. Isso é uma medida de segurança do Git.

## Soluções

### Solução 1: Adicionar Exceção (Recomendada)
```bash
# Adicionar exceção para o diretório específico
git config --global --add safe.directory /var/www/html/gestao

# Ou adicionar exceção apenas para o repositório local
cd /var/www/html/gestao
git config --add safe.directory /var/www/html/gestao
```

### Solução 2: Corrigir Propriedade dos Arquivos
```bash
# Verificar o proprietário atual
ls -la /var/www/html/gestao

# Alterar proprietário para o usuário ubuntu (se necessário)
sudo chown -R ubuntu:ubuntu /var/www/html/gestao

# Ou alterar para o usuário atual
sudo chown -R $USER:$USER /var/www/html/gestao
```

### Solução 3: Verificar e Corrigir Permissões
```bash
# Verificar permissões atuais
ls -la /var/www/html/

# Corrigir permissões se necessário
sudo chmod -R 755 /var/www/html/gestao
sudo chown -R ubuntu:www-data /var/www/html/gestao
```

## Comandos de Execução Imediata

### Passo 1: Adicionar Exceção
```bash
cd /var/www/html/gestao
git config --global --add safe.directory /var/www/html/gestao
```

### Passo 2: Tentar o Pull Novamente
```bash
git pull origin dev
```

### Passo 3: Se Ainda Houver Erro, Corrigir Propriedade
```bash
sudo chown -R ubuntu:ubuntu /var/www/html/gestao
git pull origin dev
```

## Verificação Final
```bash
# Verificar status do repositório
git status

# Verificar branch atual
git branch

# Verificar últimos commits
git log --oneline -5
```

## Comandos Resumidos para Execução Rápida
```bash
# Execute estes comandos em sequência:
cd /var/www/html/gestao
git config --global --add safe.directory /var/www/html/gestao
git pull origin dev

# Se ainda houver erro:
sudo chown -R ubuntu:ubuntu /var/www/html/gestao
git pull origin dev
```

## Prevenção
Para evitar este problema no futuro:
1. Sempre use o mesmo usuário para operações Git
2. Configure as permissões corretas desde o início
3. Use `sudo` apenas quando necessário

## Notas Importantes
- Este erro é comum em servidores onde diferentes usuários acessam o mesmo repositório
- A solução com `safe.directory` é segura e recomendada
- Sempre verifique as permissões após corrigir o problema