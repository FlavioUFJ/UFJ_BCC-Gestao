CREATE TABLE IF NOT EXISTS `pessoa` (
  `id_pessoa` INT NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(180) NOT NULL DEFAULT 'Nome da pessoa.',
  `tipo` ENUM('F', 'J', 'N') NOT NULL COMMENT 'Informar se a pessoa é do tipo:\nF - Física\nJ - Jurídica\nN - Não informado',
  `cnpj_cpf` VARCHAR(14) NULL COMMENT 'Validar o preenchimento do atributo conforme o valor informado atributo Tipo.',
  `categoria` ENUM('1', '2', '3', '4', '5', '6', '99') NOT NULL COMMENT 'Infomar a categoria da pessoa:\n1- Coordenador\n2- Professor Orientador\n3- Aluno/Estagiário\n4- Concedente/Local de Estágio\n5- Supervisor\n6- Curso/Instituição de Ensino\n99 - Usuário Geral',
  `telefone` VARCHAR(14) NOT NULL,
  `email` VARCHAR(160) NOT NULL,
  `dataCadastro` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ultimoContato` DATETIME NULL,
  `dataultimaatualizacao` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_pessoa`),
  UNIQUE INDEX `email_UNIQUE` (`email` ASC) VISIBLE)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `pessoaFisica`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `pessoaFisica` (
  `id_pessoa` INT NOT NULL,
  `escolaridade` ENUM('1', '2', '3', '4') NOT NULL COMMENT 'Deve ser informado:\n1 - Fundamental\n2 - Ensino Médio\n3- Graduação\n4 - Pós-Graduação',
  `sexo` ENUM('1', '2', '3') NULL COMMENT 'Informar os valroes conforme:\n1 - Masculino\n2 - Feminino\n3 - Não informado',
  `dataNascimento` DATE NULL,
  `nomeSocial` VARCHAR(160) NULL,
  `funcao_id` INT NULL,
  PRIMARY KEY (`id_pessoa`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `pessoaJuridica`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `pessoaJuridica` (
  `id_pessoa` INT NOT NULL,
  `razaoSocial` VARCHAR(180) NOT NULL,
  `nomeFantasia` VARCHAR(160) NULL,
  `inscricaoEstadual` VARCHAR(100) NULL,
  PRIMARY KEY (`id_pessoa`),
  UNIQUE INDEX `razaoSocial_UNIQUE` (`razaoSocial` ASC) VISIBLE)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `campo_estagio`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `campo_estagio` (
  `id_campo_estagio` INT NOT NULL AUTO_INCREMENT,
  `id_pessoa_curso` INT NOT NULL COMMENT 'Recebe a chave estrangeira relacionada a pessoa da categoria 6.',
  `tipo_estagio` ENUM('Obrigatório', 'Não Obrigatótio') NULL,
  `semestre_ano` VARCHAR(6) NULL COMMENT 'Informar o semestre de início do estágio, no formato s/aaaa.',
  `fase` ENUM('Iniciado', 'Com pendência', 'Cancelado', 'Concluído', 'Arquivado') NULL,
  `apolice_seguro` VARCHAR(25) NULL COMMENT 'Número da apólice de seguro',
  `nome_seguradora` VARCHAR(120) NULL,
  `numero_processosei` VARCHAR(20) NULL,
  `id_pessoa_estagiario` INT NOT NULL COMMENT 'Recebe a chave estrangeira relacionada a pessoa da categoria 3.',
  `numero_matricula` VARCHAR(10) NULL COMMENT 'Número da matrícula do aluno estagiário.',
  `periodo` VARCHAR(2) NULL COMMENT 'Período em que o aluno está matriculado.',
  `id_pessoa_orientador` INT NOT NULL COMMENT 'Recebe a chave estrangeira relacionada a pessoa da categoria 2',
  `id_pessoa_concedente` INT NOT NULL COMMENT 'Recebe a chave estrangeira relacionada a pessoa da categoria 4.',
  `numero_convenio` VARCHAR(12) NULL,
  `id_pessoa_supervisor` INT NOT NULL COMMENT 'Recebe a chave estrangeira relacionada a pessoa da categoria 5.',
  `supervisor_areaformacao` VARCHAR(200) NULL COMMENT 'Informar a área de formação e experiência do supervisor do estagiário.',
  `unidade_academica` VARCHAR(120) NULL,
  `data_inicio` DATE NULL COMMENT 'Data de início do estágio.',
  `data_fim` VARCHAR(45) NULL COMMENT 'Data do fim do estágio.',
  `cargahoraria` INT NULL COMMENT 'Carga horária semanal a ser executada pelo estagiário.',
  `valor_bolsa` DECIMAL(16,2) NULL COMMENT 'Informar se o tipo de estágio for Não obrigatório.',
  `valor_valetransporte` DECIMAL(16,2) NULL COMMENT 'Informar se o tipo de estágio for Não obrigatório.',
  `observacoes` LONGTEXT NULL,
  `dataultimaatualizacao` DATETIME NULL,
  PRIMARY KEY (`id_campo_estagio`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `pessoa_login`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `pessoa_login` (
  `id_pessoa_login` INT NOT NULL AUTO_INCREMENT,
  `id_pessoa` INT NOT NULL,
  `senha` VARCHAR(250) NOT NULL,
  `status` ENUM('Ativo', 'Inativo', 'Bloqueado') NULL,
  `dataultimaatualizacao` DATETIME NULL,
  `nivelacesso` VARCHAR(40) NULL COMMENT 'Adminsitrador\nOperador\nVisitante',
  PRIMARY KEY (`id_pessoa_login`, `senha`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `campo_estagio_planoatividade`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `campo_estagio_planoatividade` (
  `id_campo_estagio_planoatividade` INT NOT NULL AUTO_INCREMENT,
  `id_campo_estagio` INT NOT NULL,
  `situacao` ENUM('Em edição', 'Aprovado') NULL COMMENT 'Deve informar Aprovado somente quando todas as autenticações forem gravadas no banco.',
  `estagiarioapto` ENUM('Sim', 'Não') NULL COMMENT 'O aluno atende o período mínimo e restrições do PPC para realizar o estágio?',
  `data_lancamento` DATETIME NULL COMMENT 'Data de lançamento do relatório no sistema.',
  `data_fechamento` DATETIME NULL COMMENT 'A data de fechamento deve ser informada quando todas as autenticações forem gravadas no banco.',
  `data_inicial` DATE NULL COMMENT 'Data inicial das atividades relatadas no relatório.',
  `data_final` DATE NULL COMMENT 'Data final das atividades relatadas no relatório.',
  `cargahoraria` INT NULL COMMENT 'Informar a carga horária semanal a ser executada pelo estagiário.',
  `atividades` LONGTEXT NULL COMMENT 'Descreva as atividades previstas para o período de estágio, podendo ser organizadas de forma semanal, mensal ou conforme a dinâmica estabelecida pelo local de realização.',
  `cronograma` LONGTEXT NULL COMMENT 'Apresente o cronograma de execução das atividades, indicando a distribuição ao longo do tempo. Exemplo: 1º mês – Estudo da plataforma; 1ª semana – Integração e conhecimento das políticas da empresa.',
  `objetivos` LONGTEXT NULL COMMENT 'Descreva os objetivos que se deseja alcançar com o estágio, considerando tanto a perspectiva do estagiário quanto a do supervisor.',
  `recursos` LONGTEXT NULL COMMENT 'Informe os recursos, equipamentos, softwares e materiais necessários para a execução das atividades propostas.',
  `autenticacao_estagiario` MEDIUMTEXT NULL COMMENT 'Autenticação a ser gerada pelo sistema, informando o nome, login, data e hora que o usuário autenticou o relatório.',
  `autenticacao_supervisor` MEDIUMTEXT NULL,
  `autenticacao_orientador` MEDIUMTEXT NULL,
  `dataultimaatualizacao` DATETIME NULL,
  PRIMARY KEY (`id_campo_estagio_planoatividade`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `campo_estagio_relatorio`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `campo_estagio_relatorio` (
  `id_campo_estagio_relatorio` INT NOT NULL AUTO_INCREMENT,
  `tipo` ENUM('Parcial', 'Final') NULL,
  `data_lancamento` DATETIME NULL COMMENT 'Data de lançamento do relatório no sistema.',
  `data_fechamento` DATETIME NULL COMMENT 'A data de fechamento deve ser informada quando todas as autenticações forem gravadas no banco.',
  `aprovado` ENUM('Sim', 'Não') NULL COMMENT 'Se o tipo de relatório for final, validar o preenchimento deste campo.',
  `data_inicial` DATE NULL COMMENT 'Data inicial das atividades relatadas no relatório.',
  `data_final` DATE NULL COMMENT 'Data final das atividades relatadas no relatório.',
  `atividades` LONGTEXT NULL COMMENT 'Atividades desenvolvidas no período informado.',
  `ambiente` ENUM('Excelente', 'Bom', 'Regular', 'Insatisfatório', 'Não se aplica') NULL COMMENT 'As condições oferecidas para executar as atividades foram adequadas?',
  `acompanhamento` ENUM('Excelente', 'Bom', 'Regular', 'Insatisfatório', 'Não se aplica') NULL COMMENT 'Como você avalia o acompanhamento realizado pelo supervisor durante a execução das atividades no estágio?.\n',
  `desafios` LONGTEXT NULL COMMENT 'Informar quais foram os desafios enfrentados na execução das atividades.',
  `frequencia` ENUM('Sim', 'Não') NULL COMMENT 'O estagiário compareceu/exerceu as atividades propostas no período informado?',
  `autenticacao_estagiario` MEDIUMTEXT NULL COMMENT 'Autenticação a ser gerada pelo sistema, informando o nome, login, data e hora que o usuário autenticou o relatório.',
  `autenticacao_supervisor` MEDIUMTEXT NULL,
  `autenticacao_orientador` MEDIUMTEXT NULL,
  `dataultimaatualizacao` DATETIME NULL,
  `id_planoatividade_relatorio` INT NOT NULL,
  PRIMARY KEY (`id_campo_estagio_relatorio`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `parametro`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `parametro` (
  `id_parametro` INT NOT NULL AUTO_INCREMENT,
  `identificador` VARCHAR(100) NULL,
  `descricao` MEDIUMTEXT NULL COMMENT 'Uma descrição como utilizar o parâmetro, como obter/calcular o seu valor.',
  `modulo` LONGTEXT NULL COMMENT 'Para qual módulo o parametro é utilizado ou exclusivo',
  `quantidadevalor` INT NULL COMMENT 'Quantidade de valores que compoem o parâmetro.',
  PRIMARY KEY (`id_parametro`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `parametrovalor`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `parametrovalor` (
  `id_parametrovalor` INT NOT NULL AUTO_INCREMENT,
  `id_parametro` INT NOT NULL,
  `identificadorvalor` VARCHAR(200) NULL,
  `valor` VARCHAR(200) NULL,
  PRIMARY KEY (`id_parametrovalor`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `modulos`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `modulos` (
  `id_modulo` INT NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(100) NULL,
  `descricao` MEDIUMTEXT NULL,
  `icone` VARCHAR(50) NULL,
  `cor` VARCHAR(20) NULL,
  `url` VARCHAR(200) NULL,
  `ativo` TINYINT NULL,
  `ordem` INT NULL,
  `dataCadastro` DATETIME NULL,
  `dataultimaatualizacao` DATETIME NULL,
  PRIMARY KEY (`id_modulo`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `usuario_modulos`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `usuario_modulos` (
  `id_usuario_modulo` INT NOT NULL AUTO_INCREMENT,
  `modulos_id_modulo` INT NOT NULL,
  `pessoa_id_pessoa` INT NOT NULL,
  `ativo` TINYINT NULL,
  `dataCadastro` DATETIME NULL,
  `dataultimaatualizacao` DATETIME NULL,
  PRIMARY KEY (`id_usuario_modulo`))
ENGINE = InnoDB;

