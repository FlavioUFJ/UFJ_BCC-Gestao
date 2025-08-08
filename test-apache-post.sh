#!/bin/bash

# Script para testar configuração do Apache com requisições POST
# Execute este script no servidor de produção para diagnosticar problemas

echo "====================================="
echo "DIAGNÓSTICO APACHE - REQUISIÇÕES POST"
echo "====================================="
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}1. TESTANDO CONECTIVIDADE BÁSICA${NC}"
echo "-------------------------------------"
echo "Testando GET request:"
curl -I https://gestao.computacaoufj.online/auth/login
echo ""

echo -e "${YELLOW}2. TESTANDO POST REQUEST${NC}"
echo "-------------------------------------"
echo "Testando POST request com dados de formulário:"
curl -X POST https://gestao.computacaoufj.online/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "User-Agent: Mozilla/5.0 (compatible; TestScript/1.0)" \
  -d "email=test@test.com&senha=123456" \
  -v
echo ""

echo -e "${YELLOW}3. VERIFICANDO LOGS DO APACHE${NC}"
echo "-------------------------------------"
echo "Últimas 10 linhas do log de erro:"
sudo tail -n 10 /var/log/apache2/gestao-bcc-error.log
echo ""
echo "Últimas 10 linhas do log de acesso:"
sudo tail -n 10 /var/log/apache2/gestao-bcc-access.log
echo ""

echo -e "${YELLOW}4. VERIFICANDO CONFIGURAÇÃO DO APACHE${NC}"
echo "-------------------------------------"
echo "Módulos habilitados:"
apache2ctl -M | grep -E "(proxy|headers|rewrite)"
echo ""
echo "Teste de configuração:"
sudo apache2ctl configtest
echo ""

echo -e "${YELLOW}5. VERIFICANDO APLICAÇÃO NODE.JS${NC}"
echo "-------------------------------------"
echo "Status da aplicação PM2:"
pm2 status
echo ""
echo "Testando aplicação diretamente (localhost:3001):"
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=test@test.com&senha=123456" \
  -v
echo ""

echo -e "${YELLOW}6. VERIFICANDO PORTAS${NC}"
echo "-------------------------------------"
echo "Porta 3001 (aplicação):"
sudo netstat -tlnp | grep :3001
echo "Porta 443 (HTTPS):"
sudo netstat -tlnp | grep :443
echo ""

echo -e "${YELLOW}7. TESTANDO HEADERS ESPECÍFICOS${NC}"
echo "-------------------------------------"
echo "Testando com headers completos:"
curl -X POST https://gestao.computacaoufj.online/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" \
  -H "Accept-Language: pt-BR,pt;q=0.9,en;q=0.8" \
  -H "Cache-Control: no-cache" \
  -H "User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36" \
  -d "email=test@test.com&senha=123456" \
  -L -v
echo ""

echo -e "${GREEN}DIAGNÓSTICO CONCLUÍDO${NC}"
echo "====================================="
echo "Analise os resultados acima para identificar o problema."
echo "Pontos importantes a verificar:"
echo "1. Se o POST request retorna erro 404, 405 ou 500"
echo "2. Se os logs mostram as requisições chegando"
echo "3. Se a aplicação Node.js está respondendo diretamente"
echo "4. Se os módulos do Apache estão habilitados"
echo "====================================="