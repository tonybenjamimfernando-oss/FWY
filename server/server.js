const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./Database');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Servir os ficheiros estáticos da pasta public
app.use(express.static(path.join(__dirname, '../public')));

// --- API ROUTES ---
app.get('/api/lojas', (req, res) => {
    db.all("SELECT * FROM lojas", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/lojas', (req, res) => {
    const { nome, descricao, icone } = req.body;
    if (!nome) return res.status(400).json({ error: "Nome obrigatório." });

    db.run(`INSERT INTO lojas (nome, descricao, icone) VALUES (?, ?, ?)`,
           [nome, descricao, icone || '🏪'], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, nome, descricao, icone });
    });
});

app.get('/api/lojas/:id/produtos', (req, res) => {
    db.all("SELECT * FROM produtos WHERE loja_id = ?", [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/metricas', (req, res) => {
    db.all("SELECT tipo, SUM(valor) as total FROM metricas GROUP BY tipo", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/chat', (req, res) => {
    const { mensagem } = req.body || {};
    if (typeof mensagem !== 'string' || !mensagem.trim()) {
        return res.status(400).json({ error: "Mensagem obrigatória." });
    }

    // Simulação de resposta (aqui pode plugar a OpenAI API)
    setTimeout(() => {
        let resposta = "Recebido! Um agente responderá em breve.";
        if (mensagem.toLowerCase().includes("preço")) resposta = "Os nossos preços estão na aba Home.";
        res.json({ resposta });
    }, 1000);
});

// Catch-all para SPA (Serve o index.html para qualquer rota que não seja API)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor FLOWEBUY em http://localhost:${PORT}`);
});
