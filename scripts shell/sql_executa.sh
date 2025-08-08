#!/bin/bash

# Verifica se o comando SQL foi passado como argumento
if [ -z "$1" ]; then
    echo "Uso: $0 \"COMANDO_SQL\""
    echo "Exemplo: $0 \"SELECT * FROM tabela;\""
    exit 1
fi

# Comando SQL
COMANDO_SQL="$1"

# Dados de conexão
HOST="localhost"
PORT="3306"
USER="bccufj"
PASSWORD="3606@8295"
DATABASE="gestao_bccufj"

# Executa o comando SQL
mysql -h "$HOST" -P "$PORT" -u "$USER" -p"$PASSWORD" "$DATABASE" -e "$COMANDO_SQL"

# Verifica o status da execução
if [ $? -eq 0 ]; then
    echo "Comando executado com sucesso."
else
    echo "Erro ao executar o comando SQL."
    exit 1
fi
