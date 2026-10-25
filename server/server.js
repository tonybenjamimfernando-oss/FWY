const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./Database');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const publicDirectory = path.join(__dirname, '../public');

app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '100kb' }));
app.use(express.static(publicDirectory));

function sendDatabaseError(res, error) {
    console.error('Erro na base de dados:', error.message);
    return res.status(500).json({ error: 'Não foi possível concluir a operação.' });
}

app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'flowebuy-api' });
});

app.get('/api/lojas', (_req, res) => {
    db.all('SELECT * FROM lojas ORDER BY id DESC', [], (error, rows) => {
        if (error) return sendDatabaseError(res, error);
        res.json(rows);
    });
});

app.post('/api/lojas', (req, res) => {
    const body = req.body || {};
    const nome = typeof body.nome === 'string' ? body.nome.trim() : '';
    const descricao = typeof body.descricao === 'string' ? body.descricao.trim() : '';
    const icone = typeof body.icone === 'string' ? body.icone.trim() : '🏪';

    if (!nome || nome.length > 120) {
        return res.status(400).json({ error: 'O nome da loja é obrigatório e deve ter até 120 caracteres.' });
    }
    if (descricao.length > 1000) {
        return res.status(400).json({ error: 'A descrição deve ter até 1000 caracteres.' });
    }

    db.run(
        'INSERT INTO lojas (nome, descricao, icone) VALUES (?, ?, ?)',
        [nome, descricao, icone || '🏪'],
        function (error) {
            if (error) return sendDatabaseError(res, error);
            return res.status(201).json({
                id: this.lastID,
                nome,
                descricao,
                icone: icone || '🏪',
                status: 'Live'
            });
        }
    );
});

app.post('/api/lojas/:id/produtos', (req, res) => {
    const lojaId = Number(req.params.id);
    const body = req.body || {};
    const nome = typeof body.nome === 'string' ? body.nome.trim() : '';
    const preco = Number(body.preco);
    const imagem = typeof body.img === 'string' ? body.img.trim() : '';

    if (!Number.isSafeInteger(lojaId) || lojaId < 1) {
        return res.status(400).json({ error: 'Identificador de loja inválido.' });
    }
    if (!nome || nome.length > 160) {
        return res.status(400).json({ error: 'O nome do produto é obrigatório e deve ter até 160 caracteres.' });
    }
    if (!Number.isFinite(preco) || preco < 0 || preco > 1000000000) {
        return res.status(400).json({ error: 'Indique um preço válido e não negativo.' });
    }
    if (imagem.length > 2000) {
        return res.status(400).json({ error: 'O endereço da imagem é demasiado longo.' });
    }
    if (imagem) {
        try {
            const url = new URL(imagem);
            if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('Protocolo inválido');
        } catch (_error) {
            return res.status(400).json({ error: 'O endereço da imagem deve começar por http:// ou https://.' });
        }
    }

    db.get('SELECT id FROM lojas WHERE id = ?', [lojaId], (lookupError, loja) => {
        if (lookupError) return sendDatabaseError(res, lookupError);
        if (!loja) return res.status(404).json({ error: 'Loja não encontrada.' });

        db.run(
            'INSERT INTO produtos (loja_id, nome, preco, img) VALUES (?, ?, ?, ?)',
            [lojaId, nome, preco, imagem || null],
            function (error) {
                if (error) return sendDatabaseError(res, error);
                return res.status(201).json({
                    id: this.lastID,
                    loja_id: lojaId,
                    nome,
                    preco,
                    img: imagem || ''
                });
            }
        );
    });
});

app.get('/api/lojas/:id/produtos', (req, res) => {
    const lojaId = Number(req.params.id);
    if (!Number.isSafeInteger(lojaId) || lojaId < 1) {
        return res.status(400).json({ error: 'Identificador de loja inválido.' });
    }

    db.all('SELECT * FROM produtos WHERE loja_id = ? ORDER BY id DESC', [lojaId], (error, rows) => {
        if (error) return sendDatabaseError(res, error);
        res.json(rows);
    });
});

app.get('/api/metricas', (_req, res) => {
    db.all('SELECT tipo, SUM(valor) AS total FROM metricas GROUP BY tipo', [], (error, rows) => {
        if (error) return sendDatabaseError(res, error);
        res.json(rows);
    });
});

app.post('/api/chat', (req, res) => {
    const mensagem = req.body && typeof req.body.mensagem === 'string'
        ? req.body.mensagem.trim()
        : '';

    if (!mensagem || mensagem.length > 4000) {
        return res.status(400).json({ error: 'A mensagem é obrigatória e deve ter até 4000 caracteres.' });
    }

    // Resposta provisória: ainda não é atendimento humano nem IA integrada.
    const resposta = mensagem.toLocaleLowerCase().includes('preço')
        ? 'Consulte os preços apresentados na loja. O suporte real ainda será integrado.'
        : 'A sua mensagem foi recebida neste ambiente de desenvolvimento. O atendimento real ainda será integrado.';

    return res.json({ resposta, mode: 'development-demo' });
});

app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Endpoint da API não encontrado.' });
});

app.get('*', (_req, res) => {
    res.sendFile(path.join(publicDirectory, 'index.html'));
});

app.use((error, _req, res, _next) => {
    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
        return res.status(400).json({ error: 'O corpo do pedido contém JSON inválido.' });
    }
    console.error('Erro inesperado:', error);
    return res.status(500).json({ error: 'Ocorreu um erro interno.' });
});

db.ready
    .then(() => {
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`FLOWEBUY em desenvolvimento: http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        console.error('Não foi possível inicializar a base de dados:', error);
        db.close(() => process.exit(1));
    });
