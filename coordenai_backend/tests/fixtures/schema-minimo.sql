-- Esquema MÍNIMO para testes de fumaça do login e da página de módulos.
-- NÃO é o esquema do sistema: foi deduzido das consultas do código e contém
-- apenas as tabelas e colunas que esses dois fluxos usam.

CREATE TABLE IF NOT EXISTS pessoa (
    id_pessoa INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(200) NOT NULL,
    email VARCHAR(200) NOT NULL,
    telefone VARCHAR(30) NULL,
    cnpj_cpf VARCHAR(20) NULL,
    tipo VARCHAR(20) NULL,
    categoria VARCHAR(50) NULL,
    id_pessoaVinculo INT NULL,
    dataCadastro DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pessoa_login (
    id_pessoa INT PRIMARY KEY,
    senha VARCHAR(255) NOT NULL,
    nivelacesso VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Ativo',
    dataultimaatualizacao DATETIME NULL
);

CREATE TABLE IF NOT EXISTS modulos (
    id_modulo INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao VARCHAR(255) NULL,
    icone VARCHAR(100) NULL,
    cor VARCHAR(30) NULL,
    url VARCHAR(200) NULL,
    ordem INT DEFAULT 0,
    ativo TINYINT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS pessoa_modulos (
    id_pessoa INT NOT NULL,
    id_modulo INT NOT NULL,
    ativo TINYINT DEFAULT 1,
    PRIMARY KEY (id_pessoa, id_modulo)
);
