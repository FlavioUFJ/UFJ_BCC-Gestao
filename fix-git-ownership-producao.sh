#!/bin/bash

# Script para corrigir problema de ownership do Git no servidor de produção
# Erro: fatal: detected dubious ownership in repository

echo "=== Corrigindo problema de ownership do Git ==="
echo "Data/Hora: $(date)"
echo

# Diretório da aplicação
APP_DIR="/opt/nodejs/apps/gestao-bcc"

echo "Verificando diretório: $APP_DIR"

# Verificar se o diretório existe
if [ ! -d "$APP_DIR" ]; then
    echo "ERRO: Diretório $APP_DIR não encontrado!"
    exit 1
fi

echo "Diretório encontrado. Aplicando correções..."
echo

# Solução 1: Adicionar diretório como seguro no Git
echo "1. Adicionando diretório como seguro no Git..."
git config --global --add safe.directory "$APP_DIR"
if [ $? -eq 0 ]; then
    echo "   ✓ Diretório adicionado como seguro"
else
    echo "   ✗ Erro ao adicionar diretório como seguro"
fi
echo

# Solução 2: Corrigir ownership dos arquivos (se necessário)
echo "2. Verificando ownership atual..."
ls -la "$APP_DIR" | head -5
echo

# Verificar quem é o usuário atual
CURRENT_USER=$(whoami)
echo "Usuário atual: $CURRENT_USER"
echo

# Opção para corrigir ownership (comentada por segurança)
echo "3. Para corrigir ownership (execute manualmente se necessário):"
echo "   sudo chown -R $CURRENT_USER:$CURRENT_USER $APP_DIR"
echo "   ou"
echo "   sudo chown -R www-data:www-data $APP_DIR  # se usar Apache/Nginx"
echo

# Testar se o problema foi resolvido
echo "4. Testando se o problema foi resolvido..."
cd "$APP_DIR"
if [ $? -eq 0 ]; then
    echo "   ✓ Conseguiu acessar o diretório"
    
    # Testar comando git
    git status > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "   ✓ Git funcionando normalmente"
        echo
        echo "=== PROBLEMA RESOLVIDO ==="
        echo "Agora você pode executar:"
        echo "   cd $APP_DIR"
        echo "   git pull origin dev"
    else
        echo "   ✗ Git ainda apresenta problemas"
        echo "   Pode ser necessário corrigir ownership manualmente"
    fi
else
    echo "   ✗ Não conseguiu acessar o diretório"
fi

echo
echo "=== Configurações Git atuais ==="
git config --global --get-regexp safe.directory

echo
echo "=== Script finalizado ==="
echo "Se o problema persistir, execute manualmente:"
echo "1. sudo chown -R \$USER:\$USER $APP_DIR"
echo "2. git config --global --add safe.directory $APP_DIR"
echo "3. cd $APP_DIR && git pull origin dev"