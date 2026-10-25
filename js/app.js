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

/* =========================================
   AUTENTICAÇÃO SUPABASE — FLOWEBUY
   ========================================= */
let currentUser = null;
let authStateSubscription = null;

function mensagemAuth(tipo, mensagem, estado) {
    const el = document.getElementById(tipo === 'login' ? 'login-message' : 'register-message');
    if (!el) return;
    el.textContent = mensagem || '';
    if (estado) el.dataset.state = estado; else delete el.dataset.state;
}
function traduzirErroAuth(error) {
    const msg = String(error && error.message || '').toLowerCase();
    if (msg.includes('invalid login credentials')) return 'E-mail ou palavra-passe incorretos.';
    if (msg.includes('email not confirmed')) return 'Confirme o seu e-mail antes de iniciar sessão.';
    if (msg.includes('user already registered')) return 'Este e-mail já tem uma conta. Tente iniciar sessão.';
    if (msg.includes('password') && (msg.includes('least') || msg.includes('short') || msg.includes('characters'))) return 'A palavra-passe deve ter pelo menos 8 caracteres.';
    if (msg.includes('rate limit') || msg.includes('too many requests')) return 'Foram feitos demasiados pedidos. Aguarde alguns minutos e tente novamente.';
    if (msg.includes('network') || msg.includes('fetch')) return 'Não foi possível contactar o serviço. Verifique a ligação à internet.';
    return 'Não foi possível concluir a operação. Verifique os dados e tente novamente.';
}
async function initAuth() {
    if (!window.supabaseClient) {
        console.error('Cliente Supabase não inicializado.');
        return;
    }
    try {
        const { data, error } = await window.supabaseClient.auth.getSession();
        if (error) throw error;
        currentUser = data.session ? data.session.user : null;
        atualizarHeaderAuth();
    } catch (error) {
        console.error('Falha ao recuperar a sessão:', error);
        currentUser = null;
        atualizarHeaderAuth();
    }
    if (authStateSubscription) authStateSubscription.unsubscribe();
    const { data } = window.supabaseClient.auth.onAuthStateChange((_event, session) => {
        currentUser = session ? session.user : null;
        atualizarHeaderAuth();
    });
    authStateSubscription = data.subscription;
}
function atualizarHeaderAuth() {
    const nav = document.querySelector('.top-nav-bar');
    if (!nav) return;
    nav.querySelectorAll('.nav-auth-btn,.user-profile-badge').forEach(el => el.remove());
    const button = document.createElement('button');
    button.type = 'button';
    if (currentUser) {
        button.className = 'user-profile-badge';
        const name = currentUser.user_metadata && currentUser.user_metadata.full_name;
        button.textContent = '👤 ' + (name || (currentUser.email || 'Conta').split('@')[0]);
        button.setAttribute('aria-label', 'Conta: terminar sessão');
        button.onclick = handleLogout;
    } else {
        button.className = 'nav-auth-btn';
        button.textContent = 'Entrar / Registar';
        button.onclick = abrirAuth;
    }
    nav.appendChild(button);
}
function abrirAuth(view) {
    const modal = document.getElementById('auth-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    document.body.classList.add('auth-modal-open');
    switchAuthView(view || 'login');
    requestAnimationFrame(() => modal.classList.add('show'));
    const target = document.getElementById(view === 'register' ? 'reg-name' : 'login-email');
    if (target) target.focus();
}
function fecharAuth() {
    const modal = document.getElementById('auth-modal');
    if (!modal) return;
    modal.classList.remove('show');
    document.body.classList.remove('auth-modal-open');
    window.setTimeout(() => { if (!modal.classList.contains('show')) modal.style.display = 'none'; }, 260);
}
function switchAuthView(view) {
    const login = document.getElementById('auth-login-view');
    const register = document.getElementById('auth-register-view');
    if (!login || !register) return;
    login.style.display = view === 'register' ? 'none' : 'block';
    register.style.display = view === 'register' ? 'block' : 'none';
    mensagemAuth('login', '');
    mensagemAuth('register', '');
}
async function handleLogin(event) {
    event.preventDefault();
    const btn = document.getElementById('login-btn');
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;
    if (!email || !password) { mensagemAuth('login', 'Preencha o e-mail e a palavra-passe.', 'error'); return; }
    btn.disabled = true; btn.textContent = 'A entrar…'; mensagemAuth('login', '');
    try {
        const { error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        document.getElementById('login-form').reset();
        mensagemAuth('login', '');
        fecharAuth();
    } catch (error) {
        mensagemAuth('login', traduzirErroAuth(error), 'error');
    } finally {
        btn.disabled = false; btn.textContent = 'Entrar';
    }
}
async function handleRegister(event) {
    event.preventDefault();
    const btn = document.getElementById('reg-btn');
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const password = document.getElementById('reg-password').value;
    if (!name || name.length > 120) { mensagemAuth('register', 'Introduza um nome válido (máximo 120 caracteres).', 'error'); return; }
    if (!email || password.length < 8) { mensagemAuth('register', 'Introduza um e-mail válido e uma palavra-passe com pelo menos 8 caracteres.', 'error'); return; }
    btn.disabled = true; btn.textContent = 'A criar conta…'; mensagemAuth('register', '');
    try {
        const { data, error } = await window.supabaseClient.auth.signUp({
            email, password,
            options: { data: { full_name: name }, emailRedirectTo: window.location.origin + '/' }
        });
        if (error) throw error;
        document.getElementById('register-form').reset();
        if (data.session) {
            mensagemAuth('register', 'Conta criada e sessão iniciada.', 'success');
            fecharAuth();
        } else {
            switchAuthView('register');
            mensagemAuth('register', 'Conta criada. Verifique o seu e-mail para confirmar a conta antes de iniciar sessão.', 'success');
        }
    } catch (error) {
        mensagemAuth('register', traduzirErroAuth(error), 'error');
    } finally {
        btn.disabled = false; btn.textContent = 'Criar conta';
    }
}
async function handleLogout() {
    if (!currentUser) { abrirAuth('login'); return; }
    if (!window.confirm('Deseja terminar a sessão?')) return;
    try {
        const { error } = await window.supabaseClient.auth.signOut();
        if (error) throw error;
    } catch (error) {
        window.alert(traduzirErroAuth(error));
    }
}

document.addEventListener("DOMContentLoaded", () => {
    initAuth();
    carregarLojas();
    setupGlobalListeners();
    setupSearchListener();
    // Atualiza a métrica do carrinho na sala de negócio
    const cartMetric = $('#cart-metric');
    if(cartMetric) cartMetric.innerText = carrinhoCount;
});
document.getElementById('login-form')?.addEventListener('submit', handleLogin);
document.getElementById('register-form')?.addEventListener('submit', handleRegister);
document.getElementById('auth-modal')?.addEventListener('click', event => {
    if (event.target.id === 'auth-modal') fecharAuth();
});
document.addEventListener('keydown', event => {
    if (event.key === 'Escape') fecharAuth();
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
    gridLojas.innerHTML = '<p class="loading-state">A carregar lojas…</p>';

    try {
        if (!window.supabaseClient) throw new Error('Cliente Supabase não inicializado.');
        const { data: lojas, error } = await window.supabaseClient
            .from('lojas')
            .select('id, nome, descricao, icone, status, created_at')
            .order('created_at', { ascending: false });
        if (error) throw error;

        preencherSeletorLojas(lojas || []);
        gridLojas.innerHTML = '';
        if (!lojas || lojas.length === 0) {
            gridLojas.innerHTML = '<p class="loading-state">Nenhuma loja publicada ainda. Inicie sessão para criar a primeira.</p>';
            aplicarFiltroLojas();
            return;
        }
        lojas.forEach(loja => gridLojas.appendChild(criarCartaoLoja(loja)));
        aplicarFiltroLojas();
    } catch (error) {
        console.warn('Supabase indisponível; a apresentar demonstração local.', error);
        const locais = JSON.parse(localStorage.getItem('flowebuy_lojas') || '[]');
        preencherSeletorLojas(locais);
        if (locais.length) {
            gridLojas.innerHTML = '';
            locais.forEach(loja => gridLojas.appendChild(criarCartaoLoja(loja)));
            aplicarFiltroLojas();
        } else {
            renderizarLojasFallback();
        }
    }
}

function preencherSeletorLojas(lojas) {
    const select = $('#produto-loja');
    if (!select) return;
    const valorAnterior = select.value;
    select.innerHTML = '';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = lojas.length ? 'Selecione uma loja…' : 'Ligue a API para gerir produtos';
    select.appendChild(placeholder);

    lojas.forEach(loja => {
        const option = document.createElement('option');
        option.value = String(loja.id);
        option.textContent = String(loja.nome || 'Loja sem nome');
        select.appendChild(option);
    });

    if (valorAnterior && lojas.some(loja => String(loja.id) === valorAnterior)) {
        select.value = valorAnterior;
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
    aplicarFiltroLojas();
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
    listaProdutos.innerHTML = '<p class="muted">A carregar produtos…</p>';
    try {
        if (!window.supabaseClient) throw new Error('Cliente Supabase não inicializado.');
        const { data: produtos, error } = await window.supabaseClient
            .from('produtos')
            .select('id, loja_id, nome, preco, img, stock, created_at')
            .eq('loja_id', lojaId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        if (!produtos || produtos.length === 0) {
            listaProdutos.innerHTML = '<p class="muted">Esta loja ainda não adicionou produtos.</p>';
            return;
        }
        renderizarProdutos(produtos);
    } catch (error) {
        console.warn('Não foi possível carregar produtos do Supabase.', error);
        listaProdutos.innerHTML = '<p class="muted">Não foi possível carregar os produtos. Tente novamente mais tarde.</p>';
    }
}

function renderizarProdutos(produtos) {
    const listaProdutos = $('#lista-produtos');
    if (!listaProdutos) return;
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
                if (parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'http:') image.src = parsedUrl.href;
            } catch (_error) {}
        }

        const title = document.createElement('h4');
        title.textContent = String(prod.nome || 'Produto sem nome');
        const price = document.createElement('div');
        price.className = 'preco';
        const numericPrice = Number(prod.preco);
        price.textContent = Number.isFinite(numericPrice) ? '$' + numericPrice.toFixed(2) : 'Preço sob consulta';

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
    const nomeInput = $('#loja-nome');
    const descricaoInput = $('#loja-descricao');
    const iconeInput = $('#loja-icone');
    const feedback = $('#builder-feedback');
    if (!btn || !nomeInput) return;
    const nome = nomeInput.value.trim();
    const descricao = descricaoInput ? descricaoInput.value.trim() : '';
    const icone = iconeInput ? iconeInput.value : '🏪';
    const mostrarFeedback = (mensagem, estado) => {
        if (feedback) { feedback.textContent = mensagem; feedback.dataset.state = estado || ''; }
    };
    if (!nome) { mostrarFeedback('Introduza o nome da loja antes de publicar.', 'error'); nomeInput.focus(); return; }
    if (nome.length > 120 || descricao.length > 1000) { mostrarFeedback('Verifique os limites do nome e da descrição.', 'error'); return; }
    const textoOriginal = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'A guardar…';
    try {
        const { data: { user }, error: authError } = await window.supabaseClient.auth.getUser();
        if (authError) throw authError;
        if (!user) { abrirAuth('login'); throw new Error('Inicie sessão na FLOWEBUY antes de publicar uma loja.'); }
        const { error } = await window.supabaseClient.from('lojas').insert({
            owner_id: user.id, nome, descricao, icone, status: 'Live'
        });
        if (error) throw error;
        mostrarFeedback('Loja guardada com sucesso no Supabase.', 'success');
        await carregarLojas();
        nomeInput.value = '';
        if (descricaoInput) descricaoInput.value = '';
        if (iconeInput) iconeInput.value = '🏪';
    } catch (error) {
        mostrarFeedback(error.message || 'Não foi possível guardar a loja.', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = textoOriginal;
    }
}

async function adicionarProduto() {
    const storeSelect = $('#produto-loja');
    const nomeInput = $('#novo-produto-nome');
    const precoInput = $('#novo-produto-preco');
    const imagemInput = $('#novo-produto-imagem');
    const feedback = $('#product-feedback');
    const btn = $('.product-form .btn-publish');
    if (!storeSelect || !nomeInput || !precoInput || !btn) return;
    const lojaId = Number(storeSelect.value);
    const nome = nomeInput.value.trim();
    const preco = Number(precoInput.value);
    const img = imagemInput ? imagemInput.value.trim() : '';
    const mostrarFeedback = (mensagem, estado) => {
        if (feedback) { feedback.textContent = mensagem; feedback.dataset.state = estado || ''; }
    };
    if (!Number.isSafeInteger(lojaId) || lojaId < 1) { mostrarFeedback('Selecione uma loja válida.', 'error'); return; }
    if (!nome || nome.length > 160) { mostrarFeedback('Introduza o nome do produto (até 160 caracteres).', 'error'); return; }
    if (precoInput.value.trim() === '' || !Number.isFinite(preco) || preco < 0) { mostrarFeedback('Introduza um preço válido.', 'error'); return; }
    if (img && !/^https?:\/\//i.test(img)) { mostrarFeedback('A imagem deve usar um endereço HTTP ou HTTPS.', 'error'); return; }
    const textoOriginal = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'A guardar…';
    try {
        const { data: { user }, error: authError } = await window.supabaseClient.auth.getUser();
        if (authError) throw authError;
        if (!user) throw new Error('Inicie sessão antes de adicionar produtos.');
        const { error } = await window.supabaseClient.from('produtos').insert({
            loja_id: lojaId, nome, preco, img: img || null, stock: 0
        });
        if (error) throw error;
        mostrarFeedback('Produto guardado com sucesso no Supabase.', 'success');
        nomeInput.value = '';
        precoInput.value = '';
        if (imagemInput) imagemInput.value = '';
        await carregarProdutos(lojaId);
    } catch (error) {
        mostrarFeedback(error.message || 'Não foi possível guardar o produto.', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = textoOriginal;
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