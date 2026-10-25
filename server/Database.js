const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const databasePath = process.env.FLOWEBUY_DB_PATH || path.join(__dirname, 'flowebuy.db');

const db = new sqlite3.Database(databasePath);
const opened = new Promise((resolve, reject) => {
    db.once('open', resolve);
    db.once('error', reject);
});

function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (error) {
            if (error) return reject(error);
            resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
}

function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (error, row) => {
            if (error) return reject(error);
            resolve(row);
        });
    });
}

db.ready = (async () => {
    await opened;
    await run('PRAGMA foreign_keys = ON');

    await run(`CREATE TABLE IF NOT EXISTS lojas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        descricao TEXT,
        icone TEXT,
        status TEXT DEFAULT 'Live',
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await run(`CREATE TABLE IF NOT EXISTS produtos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        loja_id INTEGER NOT NULL,
        nome TEXT NOT NULL,
        preco REAL NOT NULL CHECK (preco >= 0),
        img TEXT,
        FOREIGN KEY(loja_id) REFERENCES lojas(id) ON DELETE CASCADE
    )`);

    await run(`CREATE TABLE IF NOT EXISTS metricas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo TEXT NOT NULL,
        valor REAL NOT NULL DEFAULT 0,
        data_registo DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await run(`CREATE TABLE IF NOT EXISTS carrinho (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        produto_id INTEGER NOT NULL,
        quantidade INTEGER NOT NULL DEFAULT 1 CHECK (quantidade > 0),
        FOREIGN KEY(produto_id) REFERENCES produtos(id) ON DELETE CASCADE
    )`);

    const { count } = await get('SELECT COUNT(*) AS count FROM lojas');
    if (count === 0) {
        const lojasIniciais = [
            ['Lumière Skincare', 'Produtos orgânicos e veganos.', '🧴'],
            ['TechNova Store', 'Gadgets de última geração.', '📱'],
            ['Velocity Run', 'Calçado desportivo.', '👟'],
            ['Beefy Premium', 'Carnes selecionadas.', '🥩']
        ];

        for (const loja of lojasIniciais) {
            await run(
                'INSERT INTO lojas (nome, descricao, icone) VALUES (?, ?, ?)',
                loja
            );
        }
    }

    console.log(`Base SQLite pronta: ${databasePath}`);
})();

module.exports = db;
