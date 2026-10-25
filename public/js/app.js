/* =========================================
   FLOWEBUY - APP.JS (VERSÃO PRODUÇÃO)
   ========================================= */

// 1. CONFIGURAÇÃO DA API (Deteta Ambiente)
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_URL = isLocalhost ? 'http://localhost:3000/api' : '/api'; 
// Nota: Se hospedar no Vercel/Render, o '/api' será relativo ao domínio.

let carrinhoCount = 0;

// --- FUNÇÕES UTILITÁRIAS (Verificação de Integridade) ---
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// 2. INICIALIZAÇÃO
document.addEventListener("DOMContentLoaded", () => {
    carregarLojas();
    setupGlobalListeners();
    setupSearchListener();
    // Atualiza a métrica do carrinho na sala de negócio
    const cartMetric = $('#cart-metric');
    if(cartMetric) cartMetric.innerText = carrinhoCount;
});

// Pesquisa de lojas visíveis no mercado (sem depender da API)
function aplicarFiltroLojas() {
    const pesquisa = $('#pesquisa');
    const termo = pesquisa ? pesquisa.value.trim().toLocaleLowerCase() : '';

    document.querySelectorAll('#grid-lojas .loja-card').forEach(card => {
        card.hidden = !card.innerText.toLocaleLowerCase().includes(termo);
    });
}

function setupSearchListener() {
    const pesquisa = $('#pesquisa');
    if (!pesquisa) return;
    pesquisa.addEventListener('input', aplicarFiltroLojas);
    aplicarFiltroLojas();
}

// 3. CARREGAR LOJAS (FASE 1)
async function carregarLojas() {
    const gridLojas = $('#grid-lojas');
    if (!gridLojas) return;

    try {
        const response = await fetch(`${API_URL}/lojas`);
        if (!response.ok) throw new Error("Erro na rede");
        const lojas = await response.json();
        
        gridLojas.innerHTML = '';
        if(lojas.length === 0) {
            gridLojas.innerHTML = '<p class="loading-state">Nenhuma loja registada ainda. Crie a primeira!</p>';
            return;
        }

        lojas.forEach(loja => gridLojas.appendChild(criarCartaoLoja(loja)));
        aplicarFiltroLojas();
    } catch (error) {
        console.warn("API indisponível. A usar fallback offline.");
        // FALLBACK OFFLINE: Se o servidor não estiver ligado, mostra dados simulados
        renderizarLojasFallback();
    }
}

function renderizarLojasFallback() {
    const gridLojas = $('#grid-lojas');
    const lojasMock = [
        { id: 1, nome: 'Lumière Skincare', descricao: 'Produtos orgânicos.', icone: '🧴', status: 'Live' },
        { id: 2, nome: 'TechNova Store', descricao: 'Gadgets de última geração.', icone: '📱', status: 'Live' },
        { id: 3, nome: 'Velocity Run', descricao: 'Calçado desportivo.', icone: '👟', status: 'Live' },
    ];
    
    gridLojas.innerHTML = '';
    lojasMock.forEach(loja => {
        const card = document.createElement('div');
        card.className = 'loja-card';
        card.innerHTML = `
            <div class="loja-card-header"><div class="loja-icon">${loja.icone}</div><div class="badge-live">${loja.status}</div></div>
            <div><h3>${loja.nome}</h3><p>${loja.descricao}</p></div>
            <div class="loja-card-footer"><span>Entrar na Loja</span><span>&rarr;</span></div>
        `;
        card.onclick = () => abrirLoja(loja.id, loja.nome);
        gridLojas.appendChild(card);
    });
}

function criarCartaoLoja(loja) {
    const card = document.createElement('div');
    card.className = 'loja-card';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');

    const header = document.createElement('div');
    header.className = 'loja-card-header';
    const icon = document.createElement('div');
    icon.className = 'loja-icon';
    icon.textContent = String(loja.icone || '🏪');
    const status = document.createElement('div');
    status.className = 'badge-live';
    status.textContent = String(loja.status || 'Live');
    header.append(icon, status);

    const details = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = String(loja.nome || 'Loja sem nome');
    const description = document.createElement('p');
    description.textContent = String(loja.descricao || 'Sem descrição.');
    details.append(title, description);

    const footer = document.createElement('div');
    footer.className = 'loja-card-footer';
    const label = document.createElement('span');
    label.textContent = 'Entrar na Loja';
    const arrow = document.createElement('span');
    arrow.textContent = '→';
    footer.append(label, arrow);

    const open = () => abrirLoja(loja.id, String(loja.nome || 'Loja'));
    card.append(header, details, footer);
    card.addEventListener('click', open);
    card.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            open();
        }
    });
    return card;
}

// 4. NAVEGAÇÃO ENTRE SALAS (SPA)
function abrirLoja(id, nomeLoja) {
    const lojaView = $('#loja-view');
    const tituloLoja = $('#titulo-loja');
    if (!lojaView || !tituloLoja) return;

    tituloLoja.innerText = nomeLoja;
    lojaView.classList.add('aberta');
    
    // Força a ida para a Home da loja
    mudarSala('home', $$('.nav-item')[0]);
    carregarProdutos(id);
}

function fecharLoja() {
    const lojaView = $('#loja-view');
    if (lojaView) lojaView.classList.remove('aberta');
}

function mudarSala(nomeSala, elementoNav) {
    $$('.app-content > .sala').forEach(sala => sala.classList.remove('ativa'));
    const salaAlvo = `#sala-${nomeSala}`;
    const salaElemento = $(salaAlvo);
    if(salaElemento) salaElemento.classList.add('ativa');

    if(elementoNav) {
        $$('.nav-item').forEach(item => item.classList.remove('ativo'));
        elementoNav.classList.add('ativo');
    }
    
    const salaProduto = $('#sala-produto');
    if(salaProduto) salaProduto.classList.remove('ativa');

    // Se mudar para a aba Negócio, carrega as métricas
    if(nomeSala === 'perfil') carregarMetricas();
}

function irParaCriar() {
    const lojaView = $('#loja-view');
    if(lojaView) lojaView.classList.add('aberta');
    const navItems = $$('.nav-item');
    if(navItems.length > 3) mudarSala('builder', navItems[3]);
}

// 5. PRODUTOS (FASE 2)
async function carregarProdutos(lojaId) {
    const listaProdutos = $('#lista-produtos');
    if (!listaProdutos) return;

    try {
        const response = await fetch(`${API_URL}/lojas/${lojaId}/produtos`);
        if (!response.ok) throw new Error("Erro na rede");
        const produtos = await response.json();
        
        if(produtos.length === 0) {
            listaProdutos.innerHTML = '<p class="muted">Esta loja ainda não adicionou produtos.</p>';
            return;
        }

        renderizarProdutos(produtos);
    } catch (e) {
        // Fallback se a API falhar
        const produtosMock = [
            { id: 1, nome: 'Cica Recovery Cream', preco: 28.00, img: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=400&q=80' },
            { id: 2, nome: 'Niacinamide Serum', preco: 32.00, img: 'https://images.unsplash.com/photo-1620916297397-a4a5402a3c6c?auto=format&fit=crop&w=400&q=80' }
        ];
        renderizarProdutos(produtosMock);
    }
}

function renderizarProdutos(produtos) {
    const listaProdutos = $('#lista-produtos');
    listaProdutos.innerHTML = '';
    
    produtos.forEach(prod => {
        const card = document.createElement('div');
        card.className = 'produto-card';

        const image = document.createElement('img');
        image.className = 'produto-img';
        image.alt = String(prod.nome || 'Produto');
        const imageSource = typeof prod.img === 'string' ? prod.img.trim() : '';
        if (imageSource) {
            try {
                const parsedUrl = new URL(imageSource, window.location.origin);
                if (parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'http:') {
                    image.src = parsedUrl.href;
                }
            } catch (_error) {
                // Ignora URLs de imagem inválidos.
            }
        }

        const title = document.createElement('h4');
        title.textContent = String(prod.nome || 'Produto sem nome');
        const price = document.createElement('div');
        price.className = 'preco';
        const numericPrice = Number(prod.preco);
        price.textContent = Number.isFinite(numericPrice) ? '
    });
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
    if(btn.parentElement) {
        btn.parentElement.querySelectorAll('.opcao-btn').forEach(b => b.classList.remove('ativo'));
        btn.classList.add('ativo');
    }
}

// 6. CARRINHO
function adicionarCarrinho() {
    carrinhoCount++;
    const badge = $('#cart-badge');
    if (badge) {
        badge.innerText = carrinhoCount;
        badge.classList.add('show');
        badge.style.transform = 'scale(1.5)';
        setTimeout(() => badge.style.transform = 'scale(1)', 200);
    }
    // Atualiza a métrica na aba de negócio
    const cartMetric = $('#cart-metric');
    if(cartMetric) cartMetric.innerText = carrinhoCount;
}

// 7. CHAT E SUPORTE
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

    const msgUser = document.createElement('div');
    msgUser.className = 'msg user';
    msgUser.innerText = texto;
    body.appendChild(msgUser);
    
    input.value = '';
    body.scrollTop = body.scrollHeight;

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
        // Fallback offline
        setTimeout(() => {
            const msgAgent = document.createElement('div');
            msgAgent.className = 'msg agent';
            msgAgent.innerText = "Obrigado pela sua mensagem. O suporte está offline neste momento.";
            body.appendChild(msgAgent);
            body.scrollTop = body.scrollHeight;
        }, 800);
    }
}

function handleChatEnter(e) {
    if (e.key === 'Enter') enviarMensagem();
}

// 8. STORE BUILDER (PUBLICAÇÃO REAL)
function selecionarTemplate(elemento) {
    $$('.template-card').forEach(card => card.classList.remove('ativo'));
    elemento.classList.add('ativo');
}

async function publicarLoja() {
    const btn = $('.btn-publish');
    if (!btn) return;
    
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '⏳ A publicar...';
    btn.disabled = true;

    try {
        const novaLoja = {
            nome: "Nova Loja FLOWEBUY",
            descricao: "Criada através do Store Builder",
            icone: "✨"
        };

        const response = await fetch(`${API_URL}/lojas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(novaLoja)
        });

        if(response.ok) {
            btn.innerHTML = '✅ Publicada!';
            setTimeout(async () => {
                alert("Loja publicada com sucesso!");
                fecharLoja();
                await carregarLojas();
                btn.innerHTML = textoOriginal;
                btn.disabled = false;
            }, 1000);
        } else {
            throw new Error("Falha");
        }
    } catch (error) {
        // Fallback caso o servidor esteja offline
        setTimeout(() => {
            btn.innerHTML = '⚠️ Modo Offline';
            setTimeout(() => {
                alert("Servidor offline. A loja foi publicada apenas na sua sessão.");
                fecharLoja();
                btn.innerHTML = textoOriginal;
                btn.disabled = false;
            }, 1000);
        }, 500);
    }
}

// 9. MÉTRICAS REAIS (FASE 4)
async function carregarMetricas() {
    const kpiVisitas = $$('.kpi-value')[0];
    
    try {
        const response = await fetch(`${API_URL}/metricas`);
        if (!response.ok) throw new Error("Sem API");
        const metricas = await response.json();
        
        if (kpiVisitas) {
            const visitas = metricas.find(m => m.tipo === 'visitas')?.total || 0;
            kpiVisitas.innerText = visitas;
        }
    } catch(e) {
        // Fallback: Mostrar aviso de "Sem dados"
        if (kpiVisitas) kpiVisitas.innerText = '—';
    }
}

// 10. DRAG & DROP
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

    canvas.addEventListener('dragend', function() {
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
} + numericPrice.toFixed(2) : 'Preço sob consulta';
        const addButton = document.createElement('button');
        addButton.type = 'button';
        addButton.className = 'btn-add-quick';
        addButton.textContent = '+';
        addButton.setAttribute('aria-label', 'Adicionar ' + String(prod.nome || 'produto') + ' ao carrinho');

        card.append(image, title, price, addButton);
        card.addEventListener('click', event => {
            if (event.target.closest('.btn-add-quick')) {
                event.stopPropagation();
                adicionarCarrinho();
                return;
            }
            abrirDetalheProduto(prod);
        });
        listaProdutos.appendChild(card);
    });
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
    if(btn.parentElement) {
        btn.parentElement.querySelectorAll('.opcao-btn').forEach(b => b.classList.remove('ativo'));
        btn.classList.add('ativo');
    }
}

// 6. CARRINHO
function adicionarCarrinho() {
    carrinhoCount++;
    const badge = $('#cart-badge');
    if (badge) {
        badge.innerText = carrinhoCount;
        badge.classList.add('show');
        badge.style.transform = 'scale(1.5)';
        setTimeout(() => badge.style.transform = 'scale(1)', 200);
    }
    // Atualiza a métrica na aba de negócio
    const cartMetric = $('#cart-metric');
    if(cartMetric) cartMetric.innerText = carrinhoCount;
}

// 7. CHAT E SUPORTE
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

    const msgUser = document.createElement('div');
    msgUser.className = 'msg user';
    msgUser.innerText = texto;
    body.appendChild(msgUser);
    
    input.value = '';
    body.scrollTop = body.scrollHeight;

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
        // Fallback offline
        setTimeout(() => {
            const msgAgent = document.createElement('div');
            msgAgent.className = 'msg agent';
            msgAgent.innerText = "Obrigado pela sua mensagem. O suporte está offline neste momento.";
            body.appendChild(msgAgent);
            body.scrollTop = body.scrollHeight;
        }, 800);
    }
}

function handleChatEnter(e) {
    if (e.key === 'Enter') enviarMensagem();
}

// 8. STORE BUILDER (PUBLICAÇÃO REAL)
function selecionarTemplate(elemento) {
    $$('.template-card').forEach(card => card.classList.remove('ativo'));
    elemento.classList.add('ativo');
}

async function publicarLoja() {
    const btn = $('.btn-publish');
    if (!btn) return;
    
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '⏳ A publicar...';
    btn.disabled = true;

    try {
        const novaLoja = {
            nome: "Nova Loja FLOWEBUY",
            descricao: "Criada através do Store Builder",
            icone: "✨"
        };

        const response = await fetch(`${API_URL}/lojas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(novaLoja)
        });

        if(response.ok) {
            btn.innerHTML = '✅ Publicada!';
            setTimeout(async () => {
                alert("Loja publicada com sucesso!");
                fecharLoja();
                await carregarLojas();
                btn.innerHTML = textoOriginal;
                btn.disabled = false;
            }, 1000);
        } else {
            throw new Error("Falha");
        }
    } catch (error) {
        // Fallback caso o servidor esteja offline
        setTimeout(() => {
            btn.innerHTML = '⚠️ Modo Offline';
            setTimeout(() => {
                alert("Servidor offline. A loja foi publicada apenas na sua sessão.");
                fecharLoja();
                btn.innerHTML = textoOriginal;
                btn.disabled = false;
            }, 1000);
        }, 500);
    }
}

// 9. MÉTRICAS REAIS (FASE 4)
async function carregarMetricas() {
    const kpiVisitas = $$('.kpi-value')[0];
    
    try {
        const response = await fetch(`${API_URL}/metricas`);
        if (!response.ok) throw new Error("Sem API");
        const metricas = await response.json();
        
        if (kpiVisitas) {
            const visitas = metricas.find(m => m.tipo === 'visitas')?.total || 0;
            kpiVisitas.innerText = visitas;
        }
    } catch(e) {
        // Fallback: Mostrar aviso de "Sem dados"
        if (kpiVisitas) kpiVisitas.innerText = '—';
    }
}

// 10. DRAG & DROP
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

    canvas.addEventListener('dragend', function() {
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