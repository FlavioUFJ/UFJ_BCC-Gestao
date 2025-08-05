#!/bin/bash

# Script de Diagnóstico do Servidor - Sistema de Gestão UFJ
# Execute este script no servidor Oracle Cloud para diagnosticar problemas

echo "=========================================="
echo "DIAGNÓSTICO DO SERVIDOR - GESTÃO UFJ"
echo "=========================================="
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}1. VERIFICANDO STATUS DOS SERVIÇOS${NC}"
echo "------------------------------------------"

echo "Status do Nginx:"
sudo systemctl is-active nginx
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Nginx está rodando${NC}"
else
    echo -e "${RED}✗ Nginx não está rodando${NC}"
fi

echo ""
echo "Status do PM2:"
sudo systemctl is-active pm2-ubuntu
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ PM2 está rodando${NC}"
else
    echo -e "${RED}✗ PM2 não está rodando${NC}"
fi

echo ""
echo -e "${YELLOW}2. VERIFICANDO CONFIGURAÇÃO DO NGINX${NC}"
echo "------------------------------------------"

echo "Testando configuração do Nginx:"
sudo nginx -t
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Configuração do Nginx está OK${NC}"
else
    echo -e "${RED}✗ Erro na configuração do Nginx${NC}"
fi

echo ""
echo "Verificando sites habilitados:"
ls -la /etc/nginx/sites-enabled/ | grep gestao
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Site gestao.computacaoufj.online está habilitado${NC}"
else
    echo -e "${RED}✗ Site gestao.computacaoufj.online NÃO está habilitado${NC}"
fi

echo ""
echo -e "${YELLOW}3. VERIFICANDO PORTAS${NC}"
echo "------------------------------------------"

echo "Porta 80 (HTTP):"
sudo netstat -tlnp | grep :80
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Porta 80 está em uso${NC}"
else
    echo -e "${RED}✗ Porta 80 não está em uso${NC}"
fi

echo ""
echo "Porta 443 (HTTPS):"
sudo netstat -tlnp | grep :443
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Porta 443 está em uso${NC}"
else
    echo -e "${RED}✗ Porta 443 não está em uso${NC}"
fi

echo ""
echo "Porta 3000 (Aplicação):"
sudo netstat -tlnp | grep :3000
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Porta 3000 está em uso${NC}"
else
    echo -e "${RED}✗ Porta 3000 não está em uso${NC}"
fi

echo ""
echo -e "${YELLOW}4. VERIFICANDO APLICAÇÃO PM2${NC}"
echo "------------------------------------------"

echo "Status dos processos PM2:"
pm2 status

echo ""
echo -e "${YELLOW}5. VERIFICANDO FIREWALL${NC}"
echo "------------------------------------------"

echo "Status do UFW:"
sudo ufw status

echo ""
echo -e "${YELLOW}6. VERIFICANDO LOGS DE ERRO (ÚLTIMAS 10 LINHAS)${NC}"
echo "------------------------------------------"

echo "Logs de erro do Nginx:"
sudo tail -n 10 /var/log/nginx/error.log

echo ""
echo "Logs da aplicação PM2:"
pm2 logs --lines 10

echo ""
echo -e "${YELLOW}7. VERIFICANDO CERTIFICADOS SSL${NC}"
echo "------------------------------------------"

if [ -f "/etc/letsencrypt/live/gestao.computacaoufj.online/fullchain.pem" ]; then
    echo -e "${GREEN}✓ Certificado SSL encontrado${NC}"
    echo "Validade do certificado:"
    sudo openssl x509 -in /etc/letsencrypt/live/gestao.computacaoufj.online/fullchain.pem -text -noout | grep "Not After"
else
    echo -e "${RED}✗ Certificado SSL não encontrado${NC}"
fi

echo ""
echo -e "${YELLOW}8. TESTE DE CONECTIVIDADE${NC}"
echo "------------------------------------------"

echo "Testando conexão local na porta 3000:"
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Aplicação responde localmente${NC}"
else
    echo -e "${RED}✗ Aplicação não responde localmente${NC}"
fi

echo ""
echo "=========================================="
echo -e "${YELLOW}RESUMO DO DIAGNÓSTICO${NC}"
echo "=========================================="

# Verificações finais
NGINX_STATUS=$(sudo systemctl is-active nginx)
PM2_STATUS=$(sudo systemctl is-active pm2-ubuntu)
NGINX_CONFIG=$(sudo nginx -t 2>&1 | grep -c "successful")
APP_PORT=$(sudo netstat -tlnp | grep -c ":3000")

echo "Nginx: $NGINX_STATUS"
echo "PM2: $PM2_STATUS"
echo "Configuração Nginx: $([ $NGINX_CONFIG -gt 0 ] && echo 'OK' || echo 'ERRO')"
echo "Aplicação na porta 3000: $([ $APP_PORT -gt 0 ] && echo 'SIM' || echo 'NÃO')"

echo ""
echo -e "${YELLOW}SOLUÇÕES RECOMENDADAS:${NC}"

if [ "$NGINX_STATUS" != "active" ]; then
    echo -e "${RED}• Reiniciar Nginx: sudo systemctl restart nginx${NC}"
fi

if [ "$PM2_STATUS" != "active" ]; then
    echo -e "${RED}• Reiniciar PM2: sudo systemctl restart pm2-ubuntu${NC}"
fi

if [ $NGINX_CONFIG -eq 0 ]; then
    echo -e "${RED}• Corrigir configuração do Nginx${NC}"
fi

if [ $APP_PORT -eq 0 ]; then
    echo -e "${RED}• Reiniciar aplicação: pm2 restart gestao-app${NC}"
fi

echo ""
echo -e "${GREEN}Para mais detalhes, consulte: DIAGNOSTICO_SERVIDOR.md${NC}"
echo "=========================================="