const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./Database');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public'))); // Serve o Front-End

// --- ROTAS DA API ---

// 1. Obter todas as lojas (Fase 1)
app.get('/api/lojas', (req, res) => {
    db.all("SELECT * FROM lojas", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 2. Criar nova loja (Fase 6 - Publicação Real)
app.post('/api/lojas', (req, res) => {
    const { nome, descricao, icone } = req.body;
    if (!nome) return res.status(400).json({ error: "O nome da loja é obrigatório." });

    const sql = `INSERT INTO lojas (nome, descricao, icone) VALUES (?, ?, ?)`;
    db.run(sql, [nome, descricao, icone || '🏪'], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID, nome, descricao, icone: icone || '🏪' });
    });
});

// 3. Obter produtos de uma loja (Fase 2)
app.get('/api/lojas/:id/produtos', (req, res) => {
    db.all("SELECT * FROM produtos WHERE loja_id = ?", [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 4. Obter Métricas do Business Center (Fase 4)
app.get('/api/metricas', (req, res) => {
    db.all("SELECT tipo, SUM(valor) as total FROM metricas GROUP BY tipo", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 5. Chat (resposta simulada; ainda não integra uma API de IA)
app.post('/api/chat', (req, res) => {
    const { mensagem } = req.body || {};
    if (typeof mensagem !== 'string' || !mensagem.trim()) {
        return res.status(400).json({ error: 'A mensagem é obrigatória.' });
    }

    const texto = mensagem.toLowerCase();
    let resposta = 'Entendido! Um agente FLOWEBUY entrará em contacto em breve.';
    if (texto.includes('preço')) resposta = 'Os nossos preços variam por produto. Consulte a aba Home!';
    else if (texto.includes('entrega')) resposta = 'As condições de entrega dependem da localização e do vendedor. Consulte os detalhes do produto ou da loja.';

    res.json({ resposta });
});

// Rota catch-all para o Front-End SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor FLOWEBUY a correr na porta ${PORT}`);
});
