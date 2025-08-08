#!/bin/bash

# Script de Monitoramento do Servidor de Aplicação
# Este script verifica o status da aplicação e fornece informações de diagnóstico
# Uso: ./monitor-servidor.sh [comando]

set -e

# Configurações
APP_NAME="gestao-bcc-ufj"
APP_DIR="/opt/nodejs/apps/gestao-bcc"
LOG_DIR="$APP_DIR/logs"
DB_NAME="gestao_bccufj"
DB_USER="comercial"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Função para exibir ajuda
show_help() {
    echo "Uso: $0 [comando]"
    echo ""
    echo "Comandos disponíveis:"
    echo "  status     - Mostra status geral da aplicação"
    echo "  logs       - Mostra logs recentes da aplicação"
    echo "  pm2        - Mostra status detalhado do PM2"
    echo "  db         - Testa conexão com banco de dados"
    echo "  health     - Verifica saúde completa do sistema"
    echo "  restart    - Reinicia a aplicação"
    echo "  stop       - Para a aplicação"
    echo "  start      - Inicia a aplicação"
    echo "  help       - Mostra esta ajuda"
    echo ""
}

# Função para verificar status da aplicação
check_status() {
    echo -e "${BLUE}=====================================${NC}"
    echo -e "${BLUE}    STATUS DA APLICAÇÃO GESTÃO BCC   ${NC}"
    echo -e "${BLUE}=====================================${NC}"
    echo ""
    
    # Status do PM2
    echo -e "${YELLOW}📊 Status PM2:${NC}"
    if command -v pm2 > /dev/null 2>&1; then
        if pm2 describe "$APP_NAME" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Aplicação está rodando${NC}"
            pm2 status "$APP_NAME"
        else
            echo -e "${RED}❌ Aplicação não está rodando no PM2${NC}"
        fi
    else
        echo -e "${RED}❌ PM2 não está instalado${NC}"
    fi
    echo ""
    
    # Status do processo
    echo -e "${YELLOW}🔍 Processos Node.js:${NC}"
    ps aux | grep -E "(node|pm2)" | grep -v grep || echo "Nenhum processo Node.js encontrado"
    echo ""
    
    # Status da porta
    echo -e "${YELLOW}🌐 Status da Porta 3000:${NC}"
    if netstat -tlnp 2>/dev/null | grep -q ":3000 "; then
        echo -e "${GREEN}✅ Porta 3000 está em uso${NC}"
        netstat -tlnp | grep ":3000 "
    else
        echo -e "${RED}❌ Porta 3000 não está em uso${NC}"
    fi
    echo ""
    
    # Teste HTTP
    echo -e "${YELLOW}🌍 Teste HTTP:${NC}"
    if command -v curl > /dev/null 2>&1; then
        if curl -f -s -m 5 http://localhost:3000 > /dev/null; then
            echo -e "${GREEN}✅ Servidor HTTP respondendo${NC}"
        else
            echo -e "${RED}❌ Servidor HTTP não está respondendo${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  curl não disponível para teste HTTP${NC}"
    fi
    echo ""
}

# Função para mostrar logs
show_logs() {
    echo -e "${BLUE}=====================================${NC}"
    echo -e "${BLUE}         LOGS DA APLICAÇÃO           ${NC}"
    echo -e "${BLUE}=====================================${NC}"
    echo ""
    
    if [ -d "$LOG_DIR" ]; then
        echo -e "${YELLOW}📄 Logs PM2 (últimas 20 linhas):${NC}"
        if pm2 describe "$APP_NAME" > /dev/null 2>&1; then
            pm2 logs "$APP_NAME" --lines 20 --nostream
        else
            echo -e "${RED}❌ Aplicação não está rodando no PM2${NC}"
        fi
        echo ""
        
        echo -e "${YELLOW}📄 Logs de Erro (últimas 10 linhas):${NC}"
        if [ -f "$LOG_DIR/errors-$(date +%Y-%m-%d).log" ]; then
            tail -n 10 "$LOG_DIR/errors-$(date +%Y-%m-%d).log"
        else
            echo "Nenhum log de erro encontrado para hoje"
        fi
        echo ""
        
        echo -e "${YELLOW}📄 Logs de Requisições (últimas 5 linhas):${NC}"
        if [ -f "$LOG_DIR/requests-$(date +%Y-%m-%d).log" ]; then
            tail -n 5 "$LOG_DIR/requests-$(date +%Y-%m-%d).log"
        else
            echo "Nenhum log de requisições encontrado para hoje"
        fi
    else
        echo -e "${RED}❌ Diretório de logs não encontrado: $LOG_DIR${NC}"
    fi
    echo ""
}

# Função para mostrar status detalhado do PM2
show_pm2() {
    echo -e "${BLUE}=====================================${NC}"
    echo -e "${BLUE}       STATUS DETALHADO PM2          ${NC}"
    echo -e "${BLUE}=====================================${NC}"
    echo ""
    
    if command -v pm2 > /dev/null 2>&1; then
        echo -e "${YELLOW}📊 Lista de processos:${NC}"
        pm2 list
        echo ""
        
        if pm2 describe "$APP_NAME" > /dev/null 2>&1; then
            echo -e "${YELLOW}🔍 Detalhes da aplicação:${NC}"
            pm2 describe "$APP_NAME"
            echo ""
            
            echo -e "${YELLOW}📈 Monitoramento:${NC}"
            pm2 monit --no-daemon || echo "Use 'pm2 monit' para monitoramento interativo"
        else
            echo -e "${RED}❌ Aplicação $APP_NAME não encontrada no PM2${NC}"
        fi
    else
        echo -e "${RED}❌ PM2 não está instalado${NC}"
    fi
    echo ""
}

# Função para testar banco de dados
test_database() {
    echo -e "${BLUE}=====================================${NC}"
    echo -e "${BLUE}      TESTE DE BANCO DE DADOS        ${NC}"
    echo -e "${BLUE}=====================================${NC}"
    echo ""
    
    echo -e "${YELLOW}🗄️  Testando conexão com MariaDB:${NC}"
    if command -v mysql > /dev/null 2>&1; then
        if mysql -u "$DB_USER" -p"pgcadmin" -e "USE $DB_NAME; SELECT 'Conexão OK' as status;" 2>/dev/null; then
            echo -e "${GREEN}✅ Conexão com banco de dados OK${NC}"
            
            echo -e "${YELLOW}📊 Informações do banco:${NC}"
            mysql -u "$DB_USER" -p"pgcadmin" -e "USE $DB_NAME; SELECT VERSION() as versao; SELECT DATABASE() as banco_atual; SELECT COUNT(*) as total_tabelas FROM information_schema.tables WHERE table_schema = '$DB_NAME';" 2>/dev/null
        else
            echo -e "${RED}❌ Falha na conexão com banco de dados${NC}"
        fi
    else
        echo -e "${RED}❌ Cliente MySQL não está instalado${NC}"
    fi
    echo ""
}

# Função para verificação completa de saúde
health_check() {
    echo -e "${BLUE}=====================================${NC}"
    echo -e "${BLUE}    VERIFICAÇÃO COMPLETA DE SAÚDE    ${NC}"
    echo -e "${BLUE}=====================================${NC}"
    echo ""
    
    # Verificar sistema
    echo -e "${YELLOW}🖥️  Sistema:${NC}"
    echo "Uptime: $(uptime)"
    echo "Memória: $(free -h | grep Mem)"
    echo "Disco: $(df -h $APP_DIR | tail -1)"
    echo ""
    
    # Verificar aplicação
    check_status
    
    # Verificar banco
    test_database
    
    # Verificar arquivos importantes
    echo -e "${YELLOW}📁 Arquivos de configuração:${NC}"
    if [ -f "$APP_DIR/.env" ]; then
        echo -e "${GREEN}✅ .env existe${NC}"
    else
        echo -e "${RED}❌ .env não encontrado${NC}"
    fi
    
    if [ -f "$APP_DIR/dadosConexaoSGDB.js" ]; then
        echo -e "${GREEN}✅ dadosConexaoSGDB.js existe${NC}"
    else
        echo -e "${RED}❌ dadosConexaoSGDB.js não encontrado${NC}"
    fi
    
    if [ -f "$APP_DIR/package.json" ]; then
        echo -e "${GREEN}✅ package.json existe${NC}"
    else
        echo -e "${RED}❌ package.json não encontrado${NC}"
    fi
    echo ""
}

# Função para reiniciar aplicação
restart_app() {
    echo -e "${YELLOW}🔄 Reiniciando aplicação...${NC}"
    if pm2 describe "$APP_NAME" > /dev/null 2>&1; then
        pm2 restart "$APP_NAME"
        echo -e "${GREEN}✅ Aplicação reiniciada${NC}"
    else
        echo -e "${RED}❌ Aplicação não está rodando no PM2${NC}"
    fi
}

# Função para parar aplicação
stop_app() {
    echo -e "${YELLOW}🛑 Parando aplicação...${NC}"
    if pm2 describe "$APP_NAME" > /dev/null 2>&1; then
        pm2 stop "$APP_NAME"
        echo -e "${GREEN}✅ Aplicação parada${NC}"
    else
        echo -e "${RED}❌ Aplicação não está rodando no PM2${NC}"
    fi
}

# Função para iniciar aplicação
start_app() {
    echo -e "${YELLOW}🚀 Iniciando aplicação...${NC}"
    if pm2 describe "$APP_NAME" > /dev/null 2>&1; then
        pm2 start "$APP_NAME"
        echo -e "${GREEN}✅ Aplicação iniciada${NC}"
    else
        if [ -f "$APP_DIR/ecosystem.config.js" ]; then
            pm2 start "$APP_DIR/ecosystem.config.js"
        else
            pm2 start "$APP_DIR/server.js" --name "$APP_NAME"
        fi
        echo -e "${GREEN}✅ Aplicação iniciada${NC}"
    fi
}

# Processar comando
case "${1:-status}" in
    "status")
        check_status
        ;;
    "logs")
        show_logs
        ;;
    "pm2")
        show_pm2
        ;;
    "db")
        test_database
        ;;
    "health")
        health_check
        ;;
    "restart")
        restart_app
        ;;
    "stop")
        stop_app
        ;;
    "start")
        start_app
        ;;
    "help")
        show_help
        ;;
    *)
        echo -e "${RED}❌ Comando inválido: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac