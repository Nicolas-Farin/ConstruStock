import sqlite3 from "sqlite3";
import { open } from "sqlite";

const db = await open({
  filename: "./database.sqlite",
  driver: sqlite3.Database,
});

await db.exec(`
PRAGMA foreign_keys = ON;
`);

// =====================================================
// ITENS
// =====================================================
await db.exec(`
CREATE TABLE IF NOT EXISTS itens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  descricao TEXT,
  sku TEXT,
  codigo_barras TEXT,
  categoria TEXT,
  fornecedor TEXT,
  marca TEXT,
  estoque_atual INTEGER DEFAULT 0,
  estoque_minimo INTEGER DEFAULT 0,
  preco_custo REAL DEFAULT 0,
  preco_venda REAL DEFAULT 0,
  tipo_unidade TEXT,
  localizacao TEXT,
  peso REAL DEFAULT 0,
  dimensoes TEXT,
  tipo_material TEXT,
  observacoes TEXT,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP
)
`);


// =====================================================
// USUÁRIOS
// =====================================================
await db.exec(`
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    senha TEXT NOT NULL,
    telefone TEXT,
    cargo TEXT,
    ativo INTEGER DEFAULT 1,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);


// =====================================================
// CATEGORIAS
// =====================================================
await db.exec(`
CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL UNIQUE,
    descricao TEXT,
    cor TEXT,
    ativo INTEGER DEFAULT 1,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

// =====================================================
// CATEGORIAS PADRÃO
// =====================================================
await db.run(`INSERT OR IGNORE INTO categorias (id, nome, descricao, cor) VALUES (?, ?, ?, ?)`,
  [1, "Construção", "Materiais gerais de construção", "#f97316"]);

await db.run(`INSERT OR IGNORE INTO categorias (id, nome, descricao, cor) VALUES (?, ?, ?, ?)`,
  [2, "Hidráulica", "Produtos hidráulicos", "#3b82f6"]);

await db.run(`INSERT OR IGNORE INTO categorias (id, nome, descricao, cor) VALUES (?, ?, ?, ?)`,
  [3, "Elétrica", "Produtos elétricos", "#eab308"]);

await db.run(`INSERT OR IGNORE INTO categorias (id, nome, descricao, cor) VALUES (?, ?, ?, ?)`,
  [4, "Ferramentas", "Ferramentas manuais e elétricas", "#10b981"]);

// =====================================================
// FORNECEDORES
// =====================================================
await db.exec(`
CREATE TABLE IF NOT EXISTS fornecedores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- DADOS DA EMPRESA
    nome TEXT NOT NULL,
    nome_fantasia TEXT,
    cnpj TEXT UNIQUE NOT NULL,
    inscricao_estadual TEXT,
    categoria TEXT,
    produtos TEXT,

    -- CONTATO
    responsavel TEXT,
    email TEXT,
    telefone TEXT,
    celular TEXT,
    site TEXT,

    -- ENDEREÇO
    cep TEXT,
    endereco TEXT,
    numero TEXT,
    bairro TEXT,
    cidade TEXT,
    estado TEXT,

    -- CONDIÇÕES COMERCIAIS
    condicao_pagamento TEXT,
    prazo_entrega_dias INTEGER DEFAULT 0,
    frete_medio REAL DEFAULT 0,
    pedido_minimo REAL DEFAULT 0,

    -- OBSERVAÇÕES
    observacoes TEXT,

    -- CONTROLE
    ativo INTEGER DEFAULT 1,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

await db.exec(`
  CREATE TABLE IF NOT EXISTS fornecedor_precos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fornecedor_id INTEGER NOT NULL,
    categoria_id INTEGER NOT NULL,
    preco_base REAL NOT NULL,
    FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id),
    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL ON UPDATE CASCADE
  )
`);

// Inserindo fornecedores base (usei um CNPJ fictício para evitar erro de UNIQUE constraint)
await db.run(`
  INSERT OR IGNORE INTO fornecedores (
    id, nome, nome_fantasia, cnpj, inscricao_estadual, categoria, produtos,
    responsavel, email, telefone, celular, site, cep, endereco, numero,
    bairro, cidade, estado, observacoes, ativo
  )
  VALUES
    (
      1, 'Votorantim Cimentos S.A.', 'Votorantim', '00000000000001', '123456789', 
      'Construção', 'Cimento, Argamassa', 'Carlos Silva', 'vendas@votorantim.com', 
      '1133334444', '11999998888', 'votorantim.com.br', '01001-000', 
      'Praça da Sé', '100', 'Centro', 'São Paulo', 'SP', 
      'Entrega apenas em horário comercial. Confirmar agendamento 24h antes.', 1
    ),
    (
      2, 'Weber Saint-Gobain', 'Quartzolit', '00000000000002', '987654321', 
      'Construção', 'Argamassa, Rejunte', 'Ana Paula', 'contato@quartzolit.com', 
      '1933332222', '19988887777', 'quartzolit.com.br', '13010-001', 
      'Av. Brasil', '250', 'Jd. Guanabara', 'Campinas', 'SP', 
      'Pedido mínimo de 2 toneladas para frete grátis.', 1
    ),
    (
      3, 'Tubos e Conexões Tigre', 'Tigre', '00000000000003', '111222333', 
      'Hidráulica', 'Tubos, Conexões PVC', 'Fernando Costa', 'fernando@tigre.com', 
      '4733331111', '47977776666', 'tigre.com.br', '89219-710', 
      'Rua Xavantes', '54', 'Atiradores', 'Joinville', 'SC', 
      'Prazos de entrega podem variar em até 5 dias úteis no fim de ano.', 1
    ),
    (
      4, 'Amanco Wavin', 'Amanco', '00000000000004', '444555666', 
      'Hidráulica', 'Tubos, Caixas D Água', 'Juliana Rios', 'vendas@amanco.com', 
      '1144445555', '11966665555', 'amanco.com.br', '04711-904', 
      'Av. das Nações Unidas', '14401', 'Chácara Santo Antônio', 'São Paulo', 'SP', 
      'Oferece desconto de 5% para pagamentos à vista.', 1
    ),
    (
      5, 'Vedacit Impermeabilizantes', 'Vedacit', '00000000000005', '777888999', 
      'Construção', 'Impermeabilizantes, Aditivos', 'Roberto Almeida', 'roberto@vedacit.com', 
      '1122223333', '11955554444', 'vedacit.com.br', '02047-020', 
      'Rua Tomás Sepe', '55', 'Jardim São Paulo', 'São Paulo', 'SP', 
      'Consultar estoque de manta asfáltica antes do pedido, produto com alta rotatividade.', 1
    )
`);

await db.run(`
  INSERT OR IGNORE INTO fornecedor_precos (fornecedor_id, categoria_id, preco_base)
  VALUES
  (1, 1, 40.00), (1, 2, 32.50), (1, 3, 45.50), (1, 4, 35.00),
  (2, 1, 30.00), (2, 2, 25.00), (2, 3, 34.50), (2, 4, 22.50),
  (3, 1, 22.50), (3, 2, 23.50), (3, 3, 27.50), (3, 4, 25.00),
  (4, 1, 37.00), (4, 2, 33.00), (4, 3, 29.50), (4, 4, 40.50),
  (5, 1, 31.50), (5, 2, 40.00), (5, 3, 34.00), (5, 4, 38.00)
`);

// =====================================================
// PRODUTOS
// =====================================================
await db.exec(`
CREATE TABLE IF NOT EXISTS produtos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    descricao TEXT,
    sku TEXT UNIQUE,
    codigo_barras TEXT,
    categoria_id INTEGER,
    fornecedor_principal_id INTEGER,
    marca TEXT,
    unidade_medida TEXT,
    localizacao TEXT,
    imagem_principal VARCHAR(255),
    preco_custo REAL DEFAULT 0,
    preco_venda REAL DEFAULT 0,
    imposto_percentual REAL DEFAULT 0,
    margem_lucro REAL DEFAULT 0,
    peso REAL,
    dimensoes TEXT,
    tipo_material TEXT,
    estoque_atual INTEGER DEFAULT 0,
    estoque_minimo INTEGER DEFAULT 0,
    estoque_maximo INTEGER DEFAULT 0,
    produto_ativo INTEGER DEFAULT 1,
    produto_destaque INTEGER DEFAULT 0,
    reposicao_automatica INTEGER DEFAULT 0,
    alerta_estoque INTEGER DEFAULT 1,
    data_validade DATE,
    observacoes TEXT,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (fornecedor_principal_id) REFERENCES fornecedores(id) ON DELETE SET NULL ON UPDATE CASCADE
);
`);

// =====================================================
// PRODUTO_FORNECEDORES (Relacionamento N:N)
// =====================================================
await db.exec(`
CREATE TABLE IF NOT EXISTS produto_fornecedores (
    produto_id INTEGER NOT NULL,
    fornecedor_id INTEGER NOT NULL,
    PRIMARY KEY (produto_id, fornecedor_id),
    FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE,
    FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON DELETE CASCADE
);
`);

// =====================================================
// MOVIMENTAÇÕES DE ESTOQUE
// =====================================================
await db.exec(`
CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    produto_id INTEGER NOT NULL,
    usuario_id INTEGER,
    fornecedor_id INTEGER,
    tipo TEXT NOT NULL,
    quantidade INTEGER NOT NULL,
    estoque_antes INTEGER NOT NULL,
    estoque_depois INTEGER NOT NULL,
    preco_unitario REAL,
    motivo TEXT,
    observacoes TEXT,
    numero_documento TEXT,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (produto_id) REFERENCES produtos(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id)
);
`);

await db.exec(`
CREATE INDEX IF NOT EXISTS idx_movimentacoes_data
ON movimentacoes_estoque(criado_em);
`);

// =====================================================
// ALERTAS
// =====================================================
await db.exec(`
CREATE TABLE IF NOT EXISTS alertas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    produto_id INTEGER,
    tipo TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    visualizado INTEGER DEFAULT 0,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (produto_id) REFERENCES produtos(id)
);
`);

// =====================================================
// HISTÓRICO DE PRODUTOS
// =====================================================
await db.exec(`
CREATE TABLE IF NOT EXISTS historico_produto (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    produto_id INTEGER NOT NULL,
    usuario_id INTEGER,
    campo_alterado TEXT,
    valor_antigo TEXT,
    valor_novo TEXT,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (produto_id) REFERENCES produtos(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);
`);

// =====================================================
// COTAÇÕES
// =====================================================
await db.exec(`
CREATE TABLE IF NOT EXISTS cotacoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fornecedor_id INTEGER NOT NULL,
  data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
  data_entrega DATE,
  status TEXT DEFAULT 'Pendente',
  grupo_comparacao TEXT,
  observacoes TEXT,
  valor_total REAL DEFAULT 0,
  valor_frete REAL DEFAULT 0, 
  FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id)
);
`);

await db.exec(`
CREATE TABLE IF NOT EXISTS cotacao_itens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cotacao_id INTEGER NOT NULL,
  produto_id INTEGER NOT NULL,
  quantidade INTEGER NOT NULL,
  preco_unitario REAL NOT NULL,
  subtotal REAL NOT NULL,
  FOREIGN KEY(cotacao_id) REFERENCES cotacoes(id),
  FOREIGN KEY(produto_id) REFERENCES produtos(id)
);
`);

// =====================================================
// NOTIFICAÇÕES DO SISTEMA
// =====================================================
await db.exec(`
CREATE TABLE IF NOT EXISTS notificacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    link TEXT,
    lida INTEGER DEFAULT 0,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

// =====================================================
// PEDIDOS (VENDAS)
// =====================================================
await db.exec(`
CREATE TABLE IF NOT EXISTS pedidos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente TEXT NOT NULL,
    data_expedicao DATE,
    forma_pagamento TEXT,
    parcelas INTEGER DEFAULT 1,
    status TEXT DEFAULT 'Pendente',
    valor_total REAL DEFAULT 0,
    lucro_total REAL DEFAULT 0,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

// =====================================================
// ITENS DO PEDIDO
// =====================================================
await db.exec(`
CREATE TABLE IF NOT EXISTS pedido_itens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pedido_id INTEGER NOT NULL,
    produto_id INTEGER NOT NULL,
    quantidade INTEGER NOT NULL,
    preco_custo REAL NOT NULL, -- Congela o custo no momento da venda para calcular lucro exato
    preco_venda REAL NOT NULL, -- Congela o preço vendido
    subtotal REAL NOT NULL,
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
    FOREIGN KEY (produto_id) REFERENCES produtos(id)
);
`);

// =====================================================
// DEVOLUÇÕES (ESTORNOS PARCIAIS DE PEDIDOS)
// =====================================================
await db.exec(`
CREATE TABLE IF NOT EXISTS devolucoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pedido_id INTEGER NOT NULL,
    motivo TEXT,
    valor_total REAL DEFAULT 0,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id)
);
`);

// =====================================================
// ITENS DA DEVOLUÇÃO
// =====================================================
await db.exec(`
CREATE TABLE IF NOT EXISTS devolucao_itens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    devolucao_id INTEGER NOT NULL,
    produto_id INTEGER NOT NULL,
    quantidade INTEGER NOT NULL,
    preco_venda REAL NOT NULL,
    subtotal REAL NOT NULL,
    FOREIGN KEY (devolucao_id) REFERENCES devolucoes(id) ON DELETE CASCADE,
    FOREIGN KEY (produto_id) REFERENCES produtos(id)
);
`);

// =====================================================
// USUÁRIO ADMIN PADRÃO
// =====================================================
await db.run(`
INSERT OR IGNORE INTO usuarios (id, nome, email, senha)
VALUES (?, ?, ?, ?)
`, [1, "Administrador", "admin@email.com", "123456"]);

// =====================================================
// CONFIGURAÇÕES DO SISTEMA
// =====================================================
await db.exec(`
CREATE TABLE IF NOT EXISTS configuracoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chave TEXT UNIQUE NOT NULL,
    valor TEXT NOT NULL,
    descricao TEXT
);
`);

// Inserindo o volume máximo padrão (10.000 itens)
await db.run(`
INSERT OR IGNORE INTO configuracoes (chave, valor, descricao) 
VALUES ('capacidade_maxima_estoque', '10000', 'Capacidade física total do armazém')
`);

export default db;