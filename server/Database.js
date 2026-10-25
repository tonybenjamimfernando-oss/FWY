const sqlite3 = require('sqlite3').verbose();

// Cria ou abre a base de dados 'flowebuy.db'
const db = new sqlite3.Database('./flowebuy.db', (err) => {
    if (err) {
        console.error('Erro ao abrir a base de dados:', err.message);
    } else {
        console.log('Conectado à base de dados SQLite.');
        criarTabelas();
    }
});

function criarTabelas() {
    // Tabela de Lojas
    db.run(`CREATE TABLE IF NOT EXISTS lojas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        descricao TEXT,
        icone TEXT,
        status TEXT DEFAULT 'Live',
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tabela de Produtos
    db.run(`CREATE TABLE IF NOT EXISTS produtos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        loja_id INTEGER,
        nome TEXT NOT NULL,
        preco REAL NOT NULL,
        img TEXT,
        FOREIGN KEY(loja_id) REFERENCES lojas(id)
    )`);

    // Tabela de Métricas (Para o Business Center)
    db.run(`CREATE TABLE IF NOT EXISTS metricas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo TEXT,
        valor REAL,
        data_registo DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tabela do Carrinho
    db.run(`CREATE TABLE IF NOT EXISTS carrinho (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        produto_id INTEGER,
        quantidade INTEGER DEFAULT 1,
        FOREIGN KEY(produto_id) REFERENCES produtos(id)
    )`);
    
    // Inserir dados iniciais (apenas se estiver vazio)
    db.get("SELECT count(*) as count FROM lojas", (err, row) => {
        if (row.count === 0) {
            const lojasIniciais = [
                ['Lumière Skincare', 'Produtos orgânicos e veganos.', '🧴'],
                ['TechNova Store', 'Gadgets de última geração.', '📱'],
                ['Velocity Run', 'Calçado desportivo.', '👟'],
                ['Beefy Premium', 'Carnes selecionadas.', '🥩']
            ];
            lojasIniciais.forEach(loja => {
                db.run(`INSERT INTO lojas (nome, descricao, icone) VALUES (?, ?, ?)`, loja);
            });
        }
    });
}

module.exports = db;