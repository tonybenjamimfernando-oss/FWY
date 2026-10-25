/* =========================================
   FLOWEBUY - APP.JS (VERSÃO PRODUÇÃO)
   ========================================= */

// 1. CONFIGURAÇÃO DA API (Deteta Ambiente)
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_URL = isLocalhost ? 'http://localhost:3000/api' : '/api'; 
// Nota: Se hospedar no Vercel/Render, o '/api' será relativo ao domínio.

let carrinhoCount = 0;
let produtoSelecionadoId = null;
let checkoutEmCurso = false;

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
        await atualizarBadgeCarrinho();
    } catch (error) {
        console.error('Falha ao recuperar a sessão:', error);
        currentUser = null;
        atualizarHeaderAuth();
    }
    if (authStateSubscription) authStateSubscription.unsubscribe();
    const { data } = window.supabaseClient.auth.onAuthStateChange((_event, session) => {
        currentUser = session ? session.user : null;
        atualizarHeaderAuth();
        atualizarBadgeCarrinho();
        // Mantém o seletor de gestão sincronizado com a sessão autenticada.
        carregarLojas();
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
            .select('id, owner_id, nome, descricao, icone, status, created_at')
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
    // O mercado continua público; o formulário de produtos só lista lojas do utilizador autenticado.
    const lojasGeriveis = currentUser ? lojas.filter(loja => loja.owner_id === currentUser.id) : [];
    select.innerHTML = '';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = !currentUser
        ? 'Inicie sessão para gerir produtos'
        : (lojasGeriveis.length ? 'Selecione a sua loja…' : 'Crie uma loja para adicionar produtos');
    select.appendChild(placeholder);

    lojasGeriveis.forEach(loja => {
        const option = document.createElement('option');
        option.value = String(loja.id);
        option.textContent = String(loja.nome || 'Loja sem nome');
        select.appendChild(option);
    });

    if (valorAnterior && lojasGeriveis.some(loja => String(loja.id) === valorAnterior)) {
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
                adicionarAoCarrinho(prod.id);
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

    produtoSelecionadoId = produto.id;
    if(img) img.src = produto.img || '';
    if(nome) nome.innerText = produto.nome || 'Produto';
    const precoNumero = Number(produto.preco);
    if(preco) preco.innerText = Number.isFinite(precoNumero) ? `${precoNumero.toFixed(2)}` : 'Preço sob consulta';
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
/* CARRINHO PERSISTENTE E CHECKOUT */
function feedbackCarrinho(mensagem, estado) {
    const el = $('#carrinho-feedback');
    if (!el) return;
    el.textContent = mensagem || '';
    el.dataset.state = estado || '';
}
function formatarPreco(valor) {
    const n = Number(valor);
    return Number.isFinite(n) ? '$' + n.toFixed(2) : 'Preço indisponível';
}
async function adicionarAoCarrinho(produtoId) {
    if (!currentUser) { abrirAuth('login'); mensagemAuth('login', 'Inicie sessão para guardar produtos no seu carrinho.', 'error'); return; }
    try {
        const { error } = await window.supabaseClient.rpc('adicionar_ao_carrinho', { p_produto_id: produtoId });
        if (error) throw error;
        await atualizarBadgeCarrinho();
        feedbackCarrinho('Produto adicionado ao carrinho.', 'success');
    } catch (error) { console.error('Falha ao adicionar ao carrinho:', error); window.alert(error.message || 'Não foi possível adicionar este produto.'); }
}
function adicionarCarrinho() {
    if (produtoSelecionadoId == null) { window.alert('Abra primeiro um produto válido.'); return; }
    adicionarAoCarrinho(produtoSelecionadoId);
}
async function atualizarBadgeCarrinho() {
    const badge = $('#cart-badge');
    if (!currentUser || !window.supabaseClient) {
        carrinhoCount = 0;
        if (badge) { badge.innerText = '0'; badge.classList.remove('show'); }
        const metric = $('#cart-metric'); if (metric) metric.innerText = '0';
        return;
    }
    try {
        const { data, error } = await window.supabaseClient.from('carrinho').select('quantidade');
        if (error) throw error;
        carrinhoCount = (data || []).reduce((sum, item) => sum + Number(item.quantidade || 0), 0);
        if (badge) { badge.innerText = String(carrinhoCount); badge.classList.toggle('show', carrinhoCount > 0); }
        const metric = $('#cart-metric'); if (metric) metric.innerText = String(carrinhoCount);
    } catch (error) { console.warn('Não foi possível atualizar o carrinho:', error); if (badge) badge.innerText = '!'; }
}
async function abrirCarrinho() {
    if (!currentUser) { abrirAuth('login'); mensagemAuth('login', 'Inicie sessão para consultar o seu carrinho.', 'error'); return; }
    mudarSala('carrinho', null);
    await carregarCarrinho();
}
async function carregarCarrinho() {
    const lista = $('#carrinho-lista'); const totalEl = $('#carrinho-total-valor');
    if (!lista || !totalEl) return;
    if (!currentUser) { lista.replaceChildren(); const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'Inicie sessão para consultar o seu carrinho.'; lista.appendChild(p); totalEl.textContent = '$0.00'; return; }
    lista.innerHTML = '<p class="muted">A carregar o carrinho…</p>'; feedbackCarrinho('', '');
    try {
        const { data: itens, error } = await window.supabaseClient.from('carrinho').select('id, produto_id, quantidade, produtos(id, nome, preco, img, loja_id)').order('created_at', { ascending: true });
        if (error) throw error;
        lista.replaceChildren(); let totalEstimado = 0;
        (itens || []).forEach(item => {
            const produto = Array.isArray(item.produtos) ? item.produtos[0] : item.produtos; if (!produto) return;
            const preco = Number(produto.preco); const quantidade = Number(item.quantidade);
            if (Number.isFinite(preco) && preco >= 0 && Number.isFinite(quantidade)) totalEstimado += preco * quantidade;
            const row = document.createElement('article'); row.className = 'cart-item-row';
            const img = document.createElement('img'); img.className = 'cart-item-image'; img.alt = ''; img.loading = 'lazy';
            if (typeof produto.img === 'string' && /^https?:\/\//i.test(produto.img)) img.src = produto.img;
            const details = document.createElement('div'); details.className = 'cart-item-details';
            const title = document.createElement('strong'); title.textContent = produto.nome || 'Produto';
            const meta = document.createElement('span'); meta.textContent = 'Quantidade: ' + quantidade + ' × ' + formatarPreco(preco);
            const subtotal = document.createElement('span'); subtotal.className = 'cart-item-subtotal'; subtotal.textContent = formatarPreco(preco * quantidade);
            details.append(title, meta, subtotal);
            const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'cart-remove-btn'; remove.textContent = 'Remover'; remove.setAttribute('aria-label', 'Remover ' + (produto.nome || 'produto') + ' do carrinho'); remove.addEventListener('click', () => removerDoCarrinho(item.id));
            row.append(img, details, remove); lista.appendChild(row);
        });
        if (!itens || itens.length === 0) { const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'O seu carrinho está vazio. Explore uma loja e adicione produtos.'; lista.appendChild(p); }
        totalEl.textContent = formatarPreco(totalEstimado);
    } catch (error) { console.error('Falha ao carregar carrinho:', error); lista.innerHTML = '<p class="muted">Não foi possível carregar o carrinho. Tente novamente.</p>'; feedbackCarrinho('Erro ao consultar o carrinho. Verifique a ligação e tente novamente.', 'error'); }
}
async function removerDoCarrinho(itemId) {
    if (!currentUser) return;
    try { const { error } = await window.supabaseClient.from('carrinho').delete().eq('id', itemId); if (error) throw error; await Promise.all([carregarCarrinho(), atualizarBadgeCarrinho()]); }
    catch (error) { console.error('Falha ao remover item:', error); feedbackCarrinho(error.message || 'Não foi possível remover o produto.', 'error'); }
}
async function finalizarCompra() {
    if (checkoutEmCurso) return;
    if (!currentUser) { abrirAuth('login'); return; }
    const moradaEl = $('#morada-entrega');
    const morada = moradaEl ? moradaEl.value.trim() : '';
    if (morada.length < 5 || morada.length > 500) {
        feedbackCarrinho('Introduza uma morada de entrega válida (5 a 500 caracteres).', 'error');
        if (moradaEl) moradaEl.focus();
        return;
    }
    const btn = $('.cart-checkout-btn');
    const original = btn ? btn.textContent : 'Pagar com Stripe';
    checkoutEmCurso = true;
    if (btn) { btn.disabled = true; btn.textContent = 'A verificar pagamento…'; }
    feedbackCarrinho('A verificar se o pagamento seguro está configurado…', 'info');
    try {
        const { data: sessionData, error: sessionError } = await window.supabaseClient.auth.getSession();
        if (sessionError) throw sessionError;
        const session = sessionData && sessionData.session;
        if (!session || !session.access_token) throw new Error('A sua sessão expirou. Inicie sessão novamente.');

        const paymentUrl = 'https://ugcovxdztsjuyhjjrfce.supabase.co/functions/v1/create-payment';
        const preflight = await fetch(paymentUrl, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + session.access_token,
                'apikey': 'sb_publishable_yp7ad33iJELOdqmZp5Sp6Q_DWj53vym'
            }
        });
        const readiness = await preflight.json().catch(() => ({}));
        if (!preflight.ok || readiness.configured !== true) {
            throw new Error(readiness.error || 'O pagamento ainda não está configurado. Nenhuma encomenda foi criada.');
        }

        if (btn) btn.textContent = 'A reservar stock…';
        feedbackCarrinho('A validar o stock e a criar a encomenda de forma transacional…', 'info');
        const { data, error } = await window.supabaseClient.rpc('fazer_checkout', { morada_entrega: morada });
        if (error) throw error;
        if (!data || data.success !== true || !Array.isArray(data.encomendas) || !data.encomendas.length) {
            throw new Error('O servidor não confirmou a criação da encomenda.');
        }
        const orderIds = data.encomendas.map(order => Number(order.encomenda_id)).filter(id => Number.isSafeInteger(id) && id > 0);
        if (!orderIds.length) throw new Error('O servidor devolveu referências de encomenda inválidas.');

        if (btn) btn.textContent = 'A abrir pagamento seguro…';
        feedbackCarrinho('Stock reservado. A abrir o checkout seguro do Stripe…', 'info');
        const paymentResponse = await fetch(paymentUrl, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + session.access_token,
                'apikey': 'sb_publishable_yp7ad33iJELOdqmZp5Sp6Q_DWj53vym',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ encomenda_ids: orderIds })
        });
        const payment = await paymentResponse.json().catch(() => ({}));
        if (!paymentResponse.ok || !payment.url) {
            throw new Error(payment.error || 'Não foi possível iniciar o pagamento. A encomenda permanece pendente; contacte o suporte antes de repetir.');
        }
        const result = $('#checkout-result');
        if (result) result.textContent = 'Encomenda(s) ' + orderIds.map(id => '#' + id).join(', ') + ' criada(s). Será redirecionado para o Stripe. A encomenda só será marcada como paga após confirmação segura do webhook.';
        window.location.assign(payment.url);
    } catch (error) {
        console.error('Falha no checkout/pagamento:', error);
        feedbackCarrinho(error.message || 'Não foi possível concluir a compra. Tente novamente ou contacte o suporte.', 'error');
    } finally {
        checkoutEmCurso = false;
        if (btn) { btn.disabled = false; btn.textContent = original; }
    }
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
    const stockInput = $('#novo-produto-stock');
    const imagemInput = $('#novo-produto-imagem');
    const feedback = $('#product-feedback');
    const btn = $('.product-form .btn-publish');
    if (!storeSelect || !nomeInput || !precoInput || !btn) return;
    const lojaId = Number(storeSelect.value);
    const nome = nomeInput.value.trim();
    const preco = Number(precoInput.value);
    const stock = stockInput && stockInput.value.trim() !== '' ? Number(stockInput.value) : 0;
    const img = imagemInput ? imagemInput.value.trim() : '';
    const mostrarFeedback = (mensagem, estado) => {
        if (feedback) { feedback.textContent = mensagem; feedback.dataset.state = estado || ''; }
    };
    if (!Number.isSafeInteger(lojaId) || lojaId < 1) { mostrarFeedback('Selecione uma loja válida.', 'error'); return; }
    if (!nome || nome.length > 160) { mostrarFeedback('Introduza o nome do produto (até 160 caracteres).', 'error'); return; }
    if (precoInput.value.trim() === '' || !Number.isFinite(preco) || preco < 0) { mostrarFeedback('Introduza um preço válido.', 'error'); return; }
    if (!Number.isSafeInteger(stock) || stock < 0 || stock > 1000000) { mostrarFeedback('Introduza um stock inteiro entre 0 e 1.000.000.', 'error'); return; }
    if (img && !/^https?:\/\//i.test(img)) { mostrarFeedback('A imagem deve usar um endereço HTTP ou HTTPS.', 'error'); return; }
    const textoOriginal = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'A guardar…';
    try {
        const { data: { user }, error: authError } = await window.supabaseClient.auth.getUser();
        if (authError) throw authError;
        if (!user) { abrirAuth('login'); throw new Error('Inicie sessão antes de adicionar produtos.'); }
        const { data: lojaPropria, error: lojaError } = await window.supabaseClient
            .from('lojas').select('id').eq('id', lojaId).eq('owner_id', user.id).maybeSingle();
        if (lojaError) throw lojaError;
        if (!lojaPropria) throw new Error('Só pode adicionar produtos às suas próprias lojas.');
        const { error } = await window.supabaseClient.from('produtos').insert({
            loja_id: lojaId, nome, preco, img: img || null, stock
        });
        if (error) throw error;
        mostrarFeedback('Produto guardado com sucesso no Supabase.', 'success');
        nomeInput.value = '';
        precoInput.value = '';
        if (stockInput) stockInput.value = '0';
        if (imagemInput) imagemInput.value = '';
        await carregarProdutos(lojaId);
    } catch (error) {
        mostrarFeedback(error.message || 'Não foi possível guardar o produto.', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = textoOriginal;
    }
}

// 9. MÉTRICAS REAIS DO CENTRO DE NEGÓCIO
// Métricas reais consultadas por loja do utilizador autenticado.
// Métricas reais consultadas por loja do utilizador autenticado.
async function carregarMetricas() {
    const kpis = $$('.kpi-value');
    const receitaKpi = kpis[2], encomendasKpi = kpis[0], stockKpi = kpis[1];
    const aviso = $('.competitive-alert p'), chart = $('.empty-chart'), chartLabel = $('.finance-header .muted'), inventario = $('.inventory-list');
    if (!currentUser || !window.supabaseClient) {
        if (aviso) aviso.textContent = 'Inicie sessão para consultar métricas reais.';
        if (encomendasKpi) encomendasKpi.textContent = '—';
        if (stockKpi) stockKpi.textContent = '—';
        if (receitaKpi) receitaKpi.textContent = '—';
        return;
    }
    try {
        const { data: lojas, error: lojaError } = await window.supabaseClient.from('lojas').select('id').eq('owner_id', currentUser.id);
        if (lojaError) throw lojaError;
        const ids = (lojas || []).map(x => Number(x.id)).filter(x => Number.isSafeInteger(x) && x > 0);
        if (!ids.length) {
            if (encomendasKpi) encomendasKpi.textContent = '0';
            if (stockKpi) stockKpi.textContent = '0';
            if (receitaKpi) receitaKpi.textContent = 'USD 0.00';
            if (chart) chart.textContent = 'Ainda não existem encomendas para as suas lojas.';
            if (inventario) inventario.replaceChildren();
            return;
        }
        const [o, p] = await Promise.all([
            window.supabaseClient.from('encomendas').select('id,total,status,loja_id').in('loja_id', ids),
            window.supabaseClient.from('produtos').select('id,nome,stock,loja_id').in('loja_id', ids).order('stock', { ascending: true })
        ]);
        if (o.error) throw o.error;
        if (p.error) throw p.error;
        const orders = o.data || [], products = p.data || [];
        const paid = orders.filter(x => ['pago','paid'].includes(String(x.status || '').toLowerCase()));
        const revenue = paid.reduce((sum,x) => sum + Math.max(0,Number(x.total)||0),0);
        const low = products.filter(x => Number(x.stock) < 5);
        if (encomendasKpi) encomendasKpi.textContent = String(orders.length);
        if (stockKpi) stockKpi.textContent = String(low.length);
        if (receitaKpi) receitaKpi.textContent = 'USD ' + revenue.toFixed(2);
        if (aviso) {
            if (low.length) aviso.textContent = 'Atenção: ' + low.length + ' produto(s) com stock baixo.';
            else aviso.textContent = 'Dados reais das suas lojas; receita calculada apenas com encomendas pagas.';
        }
        if (chartLabel) chartLabel.textContent = String(paid.length) + ' encomenda(s) paga(s)';
        if (chart) {
            if (paid.length) chart.textContent = 'Receita registada em USD: ' + revenue.toFixed(2) + '; encomendas pagas: ' + paid.length + '.';
            else chart.textContent = 'Ainda não há encomendas pagas. As encomendas pendentes não são receita.';
        }
        if (inventario) {
            inventario.replaceChildren();
            products.slice(0,30).forEach(x => {
                const row=document.createElement('div'); row.className='inventory-item';
                const info=document.createElement('div'); info.className='inv-info';
                const name=document.createElement('span'); name.className='inv-name'; name.textContent=String(x.nome||'Produto');
                const label=document.createElement('span'); label.className='inv-sku'; label.textContent=Number(x.stock)<5?'Stock baixo':'Inventário disponível';
                const stock=document.createElement('span'); stock.className='inv-stock'; stock.textContent=String(Number(x.stock)||0)+' un.';
                info.append(name,label); row.append(info,stock); inventario.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Falha ao carregar métricas reais:', error);
        if (aviso) aviso.textContent = 'Não foi possível consultar as métricas. Verifique as permissões.';
        if (encomendasKpi) encomendasKpi.textContent = '—';
        if (stockKpi) stockKpi.textContent = '—';
        if (receitaKpi) receitaKpi.textContent = '—';
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
 + revenue.toFixed(2);
        if (aviso) aviso.textContent = lowStock.length
            ? 'Atenção: ' + lowStock.length + ' produto(s) com stock inferior a 5 unidades. Reveja o inventário.'
            : 'Dados reais das suas lojas. A receita considera apenas encomendas com estado Pago.';
        if (chartLabel) chartLabel.textContent = paidOrders.length + ' encomenda(s) paga(s)';
        if (chart) {
            chart.textContent = paidOrders.length
                ? 'Receita confirmada: 

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
 + revenue.toFixed(2) + '. Encomendas pagas: ' + paidOrders.length + '. Encomendas pendentes/canceladas não entram na receita.'
                : 'Ainda não há encomendas pagas. As encomendas pendentes não são contabilizadas como receita.';
        }
        if (inventario) {
            inventario.replaceChildren();
            if (!produtos || !produtos.length) {
                const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'Ainda não existem produtos nas suas lojas.'; inventario.appendChild(p);
            } else {
                (produtos || []).slice(0, 30).forEach(product => {
                    const row = document.createElement('div'); row.className = 'inventory-item';
                    const info = document.createElement('div'); info.className = 'inv-info';
                    const name = document.createElement('span'); name.className = 'inv-name'; name.textContent = String(product.nome || 'Produto');
                    const sku = document.createElement('span'); sku.className = 'inv-sku'; sku.textContent = Number(product.stock) < 5 ? 'Stock baixo' : 'Inventário disponível';
                    const stock = document.createElement('span'); stock.className = 'inv-stock'; stock.textContent = String(Number(product.stock) || 0) + ' un.';
                    if (Number(product.stock) < 5) stock.style.color = '#b91c1c';
                    info.append(name, sku); row.append(info, stock); inventario.appendChild(row);
                });
            }
        }
    } catch (error) {
        console.error('Falha ao carregar métricas reais:', error);
        if (aviso) aviso.textContent = 'Não foi possível consultar as métricas. Verifique a ligação e as permissões.';
        if (encomendasKpi) encomendasKpi.textContent = '—';
        if (conversaoKpi) conversaoKpi.textContent = '—';
        if (receitaKpi) receitaKpi.textContent = '—';
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
