/* =========================================
   FLOWEBUY - APPLICATION LOGIC (PRODUCTION)
   ========================================= */

const API_URL = 'http://localhost:3000/api';
let carrinhoCount = 0;

// --- FUNÇÕES UTILITÁRIAS ---
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

// --- 1. INICIALIZAÇÃO E CARREGAMENTO DE DADOS ---
document.addEventListener("DOMContentLoaded", async () => {
    await carregarLojas();
    setupGlobalListeners();
});

async function carregarLojas() {
    const gridLojas = $('#grid-lojas');
    if (!gridLojas) return; // Verificação de integridade

    try {
        const response = await fetch(`${API_URL}/lojas`);
        const lojas = await response.json();
        
        gridLojas.innerHTML = ''; // Limpa o estado anterior
        lojas.forEach(loja => {
            const card = document.createElement('div');
            card.className = 'loja-card';
            card.innerHTML = `
                <div class="loja-card-header">
                    <div class="loja-icon">${loja.icone}</div>
                    <div class="badge-live">${loja.status}</div>
                </div>
                <div>
                    <h3>${loja.nome}</h3>
                    <p>${loja.descricao}</p>
                </div>
                <div class="loja-card-footer">
                    <span>Entrar na Loja</span>
                    <span>&rarr;</span>
                </div>
            `;
            card.onclick = () => abrirLoja(loja.id, loja.nome);
            gridLojas.appendChild(card);
        });
    } catch (error) {
        console.error("Erro ao carregar lojas:", error);
        gridLojas.innerHTML = '<p>Erro ao carregar o mercado. Verifique o servidor.</p>';
    }
}

// --- 2. NAVEGAÇÃO ---
function abrirLoja(id, nomeLoja) {
    const lojaView = $('#loja-view');
    const tituloLoja = $('#titulo-loja');
    
    if (!lojaView || !tituloLoja) return;

    tituloLoja.innerText = nomeLoja;
    lojaView.classList.add('aberta');
    
    const navItems = $$('.nav-item');
    if(navItems.length > 0) mudarSala('home', navItems[0]);
    
    const salaProduto = $('#sala-produto');
    if(salaProduto) salaProduto.classList.remove('ativa');
    
    carregarProdutos(id);
}

function fecharLoja() {
    const lojaView = $('#loja-view');
    if (lojaView) lojaView.classList.remove('aberta');
}

function mudarSala(nomeSala, elementoNav) {
    $$('.app-content > .sala').forEach(sala => sala.classList.remove('ativa'));
    const salaAlvo = $(`#sala-${nomeSala}`);
    if(salaAlvo) salaAlvo.classList.add('ativa');

    if(elementoNav) {
        $$('.nav-item').forEach(item => item.classList.remove('ativo'));
        elementoNav.classList.add('ativo');
    }
    
    const salaProduto = $('#sala-produto');
    if(salaProduto) salaProduto.classList.remove('ativa');
}

// --- 3. PRODUTOS ---
async function carregarProdutos(lojaId) {
    const listaProdutos = $('#lista-produtos');
    if (!listaProdutos) return;

    try {
        // Simulação de fallback caso a loja não tenha produtos na BD
        const response = await fetch(`${API_URL}/lojas/${lojaId}/produtos`);
        const produtos = await response.json();
        
        if(produtos.length === 0) {
            listaProdutos.innerHTML = '<p style="padding:20px; color:var(--text-muted);">Esta loja ainda não tem produtos registados.</p>';
            return;
        }

        listaProdutos.innerHTML = '';
        produtos.forEach(prod => {
            const card = document.createElement('div');
            card.className = 'produto-card';
            card.innerHTML = `
                <img src="${prod.img}" class="produto-img" alt="${prod.nome}">
                <h4>${prod.nome}</h4>
                <div class="preco">$${prod.preco.toFixed(2)}</div>
                <button class="btn-add-quick">+</button>
            `;
            card.onclick = (e) => {
                if(e.target.classList.contains('btn-add-quick')) {
                    adicionarCarrinho();
                    return;
                }
                abrirDetalheProduto(prod);
            };
            listaProdutos.appendChild(card);
        });
    } catch(e) {
        console.error("Erro ao carregar produtos", e);
    }
}

function abrirDetalheProduto(produto) {
    const img = $('#produto-img');
    const nome = $('#produto-nome');
    const preco = $('#produto-preco');
    const sala = $('#sala-produto');

    if(img) img.src = produto.img;
    if(nome) nome.innerText = produto.nome;
    if(preco) preco.innerText = `$${produto.preco.toFixed(2)}`;
    if(sala) sala.classList.add('ativa');
}

function voltarParaHome() {
    const sala = $('#sala-produto');
    if(sala) sala.classList.remove('ativa');
}

function selecionarOpcao(btn) {
    const parent = btn.parentElement;
    if(parent) {
        parent.querySelectorAll('.opcao-btn').forEach(b => b.classList.remove('ativo'));
        btn.classList.add('ativo');
    }
}

// --- 4. CARRINHO ---
function adicionarCarrinho() {
    carrinhoCount++;
    const badge = $('#cart-badge');
    if (badge) {
        badge.innerText = carrinhoCount;
        badge.classList.add('show');
        badge.style.transform = 'scale(1.5)';
        setTimeout(() => badge.style.transform = 'scale(1)', 200);
    }
}

// --- 5. SUPORTE E CHAT ---
function toggleChat() {
    const panel = $('#chat-panel');
    if(panel) panel.classList.toggle('aberto');
}

async function enviarMensagem() {
    const input = $('#chat-input');
    const body = $('#chat-body');
    if (!input || !body) return;

    const texto = input.value.trim();
    if (texto === "") return;

    // Mensagem do Utilizador
    const msgUser = document.createElement('div');
    msgUser.className = 'msg user';
    msgUser.innerText = texto;
    body.appendChild(msgUser);
    
    input.value = '';
    body.scrollTop = body.scrollHeight;

    // Chamada à API de Chat
    try {
        const response = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mensagem: texto })
        });
        const data = await response.json();

        const msgAgent = document.createElement('div');
        msgAgent.className = 'msg agent';
        msgAgent.innerText = data.resposta;
        body.appendChild(msgAgent);
        body.scrollTop = body.scrollHeight;
    } catch (e) {
        console.error("Erro no chat", e);
    }
}

function handleChatEnter(e) {
    if (e.key === 'Enter') enviarMensagem();
}

// --- 6. STORE BUILDER (PUBLICAÇÃO REAL) ---
function selecionarTemplate(elemento) {
    $$('.template-card').forEach(card => card.classList.remove('ativo'));
    elemento.classList.add('ativo');
}

async function publicarLoja() {
    const btn = $('.btn-publish');
    if (!btn) return;
    
    const textoOriginal = btn.innerHTML;
    
    // Simular loading
    btn.innerHTML = '⏳ A publicar na Base de Dados...';
    btn.style.opacity = '0.7';
    btn.disabled = true;

    try {
        // AQUI: Envia os dados para o servidor
        const novaLoja = {
            nome: "Nova Loja FLOWEBUY", // Poderia vir de um input
            descricao: "Criada através do Store Builder",
            icone: "✨"
        };

        const response = await fetch(`${API_URL}/lojas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(novaLoja)
        });

        if(response.ok) {
            btn.innerHTML = '✅ Loja Gravada com Sucesso!';
            btn.style.background = 'var(--primary)';
            
            setTimeout(async () => {
                alert("A sua loja foi publicada e gravada na base de dados FLOWEBUY!");
                fecharLoja();
                await carregarLojas(); // Atualiza a grelha principal com a nova loja
                btn.innerHTML = textoOriginal;
                btn.style.background = 'linear-gradient(90deg, var(--secondary), #059669)';
                btn.disabled = false;
            }, 1000);
        } else {
            throw new Error("Falha na publicação");
        }
    } catch (error) {
        console.error("Erro na publicação", error);
        btn.innerHTML = '❌ Erro ao publicar';
        btn.disabled = false;
    }
}

// --- 7. DRAG & DROP ---
function setupGlobalListeners() {
    const canvas = $('#builder-canvas');
    if(!canvas) return;
    
    let draggedItem = null;

    canvas.addEventListener('dragstart', function(e) {
        if(e.target.classList.contains('builder-block')) {
            draggedItem = e.target;
            setTimeout(() => e.target.style.opacity = '0.5', 0);
        }
    });

    canvas.addEventListener('dragend', function(e) {
        if(draggedItem) {
            draggedItem.style.opacity = '1';
            draggedItem = null;
        }
    });

    canvas.addEventListener('dragover', function(e) {
        e.preventDefault();
        if(!draggedItem) return;
        
        const afterElement = getDragAfterElement(canvas, e.clientY);
        if (afterElement == null) {
            canvas.appendChild(draggedItem);
        } else {
            canvas.insertBefore(draggedItem, afterElement);
        }
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.builder-block:not([style*="opacity: 0.5"])')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// --- 8. MÉTRICAS REAIS ---
// Esta função pode ser chamada no Business Center
async function carregarMetricas() {
    try {
        const response = await fetch(`${API_URL}/metricas`);
        const metricas = await response.json();
        
        // Atualiza o DOM com base nas métricas reais do servidor
        const kpiVisitas = $$('.kpi-value')[0];
        if (kpiVisitas && metricas.length > 0) {
            // Exemplo: Pega a métrica de 'visitas' do servidor
            kpiVisitas.innerText = metricas.find(m => m.tipo === 'visitas')?.total || 0;
        }
    } catch(e) {
        console.error("Erro ao carregar métricas", e);
    }
}
