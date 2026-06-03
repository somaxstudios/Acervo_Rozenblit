// ============================================================
// ACERVO ROZENBLIT — SCRIPT PRINCIPAL
// Museu Digital da Memória Sonora de Pernambuco
// ============================================================

// ============================================================
// CONFIGURAÇÃO SUPABASE
// ============================================================
const USE_SUPABASE = true;
const SUPABASE_URL = 'https://ulbqzvztwrqmaxbzsmmv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_shOmcA8udv3Tw0xKYzafAw_s1YXgbDk';

// Campos públicos permitidos — nunca expor campos internos
const CAMPOS_PUBLICOS = 'id, titulo, artista, gravadora, numero, formato, ano_producao, ano, data_lancamento, created_at';
const CAMPOS_INTERNOS = ['prateleira', 'stream_status', 'taken_down', 'pode_lancar'];

let supabaseClient = null;

// ============================================================
// ESTADO GLOBAL
// ============================================================
let catalogoCompleto = [];   // Todos os registros do Supabase
let catalogoFiltrado = [];   // Registros após filtros e busca
let filtroAtual = { tipo: 'todos', valor: null };
let paginaAtual = 'home';
let dadosCarregados = false;

// ============================================================
// INICIALIZAÇÃO
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
    initSupabase();
    initLoadingScreen();

    try {
        await carregarDados();
    } catch (err) {
        console.error('Erro ao carregar dados:', err);
        mostrarErroCarregamento();
    }
});

function initSupabase() {
    if (USE_SUPABASE && window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log('✅ Supabase inicializado');
    } else {
        console.warn('⚠️ Supabase não disponível');
    }
}

function initLoadingScreen() {
    const loader = document.getElementById('loading-screen');
    if (!loader) return;
    // O loading é removido após os dados carregarem
}

function ocultarLoading() {
    const loader = document.getElementById('loading-screen');
    if (loader) {
        loader.classList.add('hidden');
    }
}

function mostrarErroCarregamento() {
    ocultarLoading();
    const grid = document.getElementById('catalogo-grid');
    if (grid) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-20">
                <div class="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style="background: rgba(164,79,37,0.1);">
                    <i data-lucide="wifi-off" class="w-8 h-8" style="color: #a44f25;"></i>
                </div>
                <p style="color: #a44f25; font-family: 'Playfair Display', serif; font-size: 1.1rem;">Não foi possível carregar o acervo no momento.</p>
                <p style="color: #6f604c; font-size: 0.85rem; margin-top: 8px;">Tente recarregar a página.</p>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    }
}

// ============================================================
// CARREGAMENTO DE DADOS
// ============================================================
let catalogo = [];

async function carregarDados() {
    try {
        const [catalogoRes, fichasRes] = await Promise.all([
            fetch('catalogo.json'),
            fetch('fichas.json')
        ]);
        if (!catalogoRes.ok || !fichasRes.ok) throw new Error('Erro ao carregar JSONs');

        let catalogoData = await catalogoRes.json();
        const fichasData = await fichasRes.json();

        // Detecta a estrutura do catálogo:
        if (Array.isArray(catalogoData)) {
            catalogo = catalogoData;
        } else if (catalogoData.catalogo && Array.isArray(catalogoData.catalogo)) {
            catalogo = catalogoData.catalogo;
        } else {
            throw new Error('Formato do catálogo inválido: esperado array ou objeto com chave "catalogo"');
        }

        // Mapear fichas
        if (!fichasData.fichas || !Array.isArray(fichasData.fichas)) {
            throw new Error('Formato das fichas inválido: esperado objeto com chave "fichas"');
        }
        fichasData.fichas.forEach(ficha => {
            fichasMap.set(ficha.id, ficha);
        });

        renderizarCatalogo();
    } catch (error) {
        console.error(error);
        document.getElementById('catalogo-grid').innerHTML = `<div class="col-span-full text-center text-red-600 p-10">${error.message}</div>`;
    } finally {
        setTimeout(() => {
            document.getElementById('loading-screen')?.classList.add('hidden-loading');
        }, 300);
    }
}

function renderizarCatalogo() {
    const grid = document.getElementById('catalogo-grid');
    if (!grid) return;

    if (!catalogo || catalogo.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center text-texto-suave p-10">Nenhum item encontrado no catálogo.</div>`;
        return;
    }

    grid.innerHTML = catalogo.map(item => {
        // Garante que item tem as propriedades esperadas
        const titulo = item.titulo || 'Sem título';
        const artista = item.artista || 'Desconhecido';
        const gravadora = item.gravadora || '';
        const id = item.id || item.ID; // suporta id ou ID
        return `
        <div class="bg-papel/90 rounded-xl overflow-hidden shadow-sm card-hover cursor-pointer" onclick="abrirModal(${id})">
            <div class="aspect-square bg-gradient-to-br from-verde-cacto to-ouro flex items-center justify-center relative">
                <svg width="60" height="60" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="36" fill="rgba(255,255,255,0.2)"/>
                    <circle cx="40" cy="40" r="28" fill="none" stroke="white" stroke-width="0.8"/>
                    <text x="40" y="48" text-anchor="middle" fill="white" font-size="28" font-family="Georgia">${titulo.charAt(0)}</text>
                </svg>
            </div>
            <div class="p-3">
                <h3 class="font-playfair text-sm font-bold text-verde-cacto line-clamp-2">${titulo}</h3>
                <p class="text-xs text-texto-suave mt-1">${artista}</p>
                ${gravadora ? `<p class="text-xs text-barro mt-1">${gravadora}</p>` : ''}
            </div>
        </div>`;
    }).join('');

    if (window.lucide) lucide.createIcons();
}

async function fetchCatalogoSupabase() {
    if (!supabaseClient) return null;
    try {
        const { data, error } = await supabaseClient
            .from('catalogo')
            .select(CAMPOS_PUBLICOS)
            .order('titulo', { ascending: true });
        if (error) {
            console.error('Erro Supabase:', error);
            return null;
        }
        return data || [];
    } catch (err) {
        console.error('Exceção Supabase:', err);
        return null;
    }
}

// ============================================================
// NORMALIZAÇÃO E SANITIZAÇÃO
// ============================================================
function sanitizarItem(item) {
    const sanitizado = { ...item };
    CAMPOS_INTERNOS.forEach(campo => delete sanitizado[campo]);
    return sanitizado;
}

function extrairAnoDoItem(item) {
    if (item.ano_producao) return Number(item.ano_producao);
    if (item.ano) return Number(item.ano);
    if (item.data_lancamento) {
        const ano = new Date(item.data_lancamento).getFullYear();
        return isNaN(ano) ? null : ano;
    }
    return null;
}

function extrairDecadaDoItem(item) {
    const ano = extrairAnoDoItem(item);
    if (!ano) return null;
    return String(Math.floor(ano / 10) * 10);
}

function textoAnoItem(item) {
    const ano = extrairAnoDoItem(item);
    return ano ? String(ano) : 'Ano não informado';
}

function normalizarTexto(txt) {
    if (!txt) return '';
    return txt.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

// ============================================================
// ESTATÍSTICAS REAIS
// ============================================================
function popularEstatisticas() {
    const total = catalogoCompleto.length;

    const artistasUnicos = new Set(
        catalogoCompleto
            .map(i => (i.artista || '').trim().toLowerCase())
            .filter(a => a && a !== 'sem identificação' && a !== '')
    ).size;

    const etiquetasUnicas = new Set(
        catalogoCompleto
            .map(i => (i.gravadora || '').trim().toLowerCase())
            .filter(e => e && e !== '')
    ).size;

    const formatosUnicos = new Set(
        catalogoCompleto
            .map(i => (i.formato || '').trim().toLowerCase())
            .filter(f => f && f !== '')
    ).size;

    const decadasReais = new Set(
        catalogoCompleto
            .map(i => extrairDecadaDoItem(i))
            .filter(d => d !== null)
    ).size;

    const setEl = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val.toLocaleString('pt-BR');
    };

    setEl('stat-titulos', total);
    setEl('stat-artistas', artistasUnicos);
    setEl('stat-etiquetas', etiquetasUnicas);
    setEl('stat-formatos', formatosUnicos);

    const elDecadas = document.getElementById('stat-decadas');
    if (elDecadas) {
        if (decadasReais > 0) {
            elDecadas.textContent = decadasReais;
        } else {
            const card = elDecadas.closest('.stat-card');
            if (card) card.style.display = 'none';
        }
    }
}

// ============================================================
// ARTISTAS EM DESTAQUE (baseado nos dados reais)
// ============================================================
function popularArtistasDestaque() {
    const grid = document.getElementById('artistas-destaque-grid');
    if (!grid) return;

    const contagem = {};
    catalogoCompleto.forEach(item => {
        const artista = (item.artista || '').trim();
        if (!artista || normalizarTexto(artista) === 'sem identificacao' || artista === '') return;
        contagem[artista] = (contagem[artista] || 0) + 1;
    });

    const top6 = Object.entries(contagem)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);

    if (top6.length === 0) {
        grid.closest('section').style.display = 'none';
        return;
    }

    const cores = [
        { bg: 'linear-gradient(135deg, #315f43, #4f7f52)', txt: '#fffaf0' },
        { bg: 'linear-gradient(135deg, #c49a3a, #a44f25)', txt: '#fffaf0' },
        { bg: 'linear-gradient(135deg, #c96b36, #a44f25)', txt: '#fffaf0' },
        { bg: 'linear-gradient(135deg, #245f73, #1a4a5a)', txt: '#fffaf0' },
        { bg: 'linear-gradient(135deg, #6b4c3b, #a44f25)', txt: '#fffaf0' },
        { bg: 'linear-gradient(135deg, #4f7f52, #c49a3a)', txt: '#fffaf0' },
    ];

    grid.innerHTML = top6.map(([nome, qtd], i) => {
        const cor = cores[i % cores.length];
        const inicial = nome.charAt(0).toUpperCase();
        const nomeEsc = nome.replace(/'/g, "\\'");
        return `
        <div class="rounded-2xl overflow-hidden card-hover group cursor-pointer"
             style="background: rgba(255, 250, 240, 0.86); border: 1px solid rgba(49, 95, 67, 0.16);"
             onclick="navigateTo('catalogo'); setTimeout(() => setFiltro('artista', '${nomeEsc}'), 300);">
            <div class="h-36 md:h-44 flex items-center justify-center relative overflow-hidden" style="background: ${cor.bg};">
                <span class="text-7xl font-bold select-none" style="font-family: 'Playfair Display', serif; color: rgba(255,255,255,0.15); user-select:none;">${inicial}</span>
                <div class="absolute inset-0 flex items-center justify-center">
                    ${gerarDiscoSVG(nome, '#fffaf0', 'rgba(255,255,255,0.12)')}
                </div>
            </div>
            <div class="p-4 text-center">
                <h3 class="font-playfair text-base md:text-lg transition-colors line-clamp-2" style="color: #315f43;">${escaparHTML(nome)}</h3>
                <p class="text-xs mt-1" style="color: #6f604c;">${qtd} ${qtd === 1 ? 'título' : 'títulos'} no acervo</p>
                <span class="mt-3 text-xs font-medium flex items-center justify-center gap-1" style="color: #a44f25;">
                    Ver no catálogo <i data-lucide="arrow-right" class="w-3 h-3"></i>
                </span>
            </div>
        </div>`;
    }).join('');

    if (window.lucide) lucide.createIcons();
}

function gerarDiscoSVG(label, corBorda, corFundo) {
    return `<svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="40" cy="40" r="38" fill="${corFundo}" stroke="${corBorda}" stroke-width="1" stroke-opacity="0.3"/>
        <circle cx="40" cy="40" r="28" fill="none" stroke="${corBorda}" stroke-width="0.5" stroke-opacity="0.2"/>
        <circle cx="40" cy="40" r="18" fill="none" stroke="${corBorda}" stroke-width="0.5" stroke-opacity="0.2"/>
        <circle cx="40" cy="40" r="6" fill="${corBorda}" fill-opacity="0.25"/>
        <circle cx="40" cy="40" r="2.5" fill="${corBorda}" fill-opacity="0.5"/>
    </svg>`;
}

// ============================================================
// ETIQUETAS HISTÓRICAS (baseado no banco)
// ============================================================
function popularEtiquetas() {
    const container = document.getElementById('etiquetas-grid');
    if (!container) return;

    const etiquetasDef = [
        { nome: 'Mocambo', inicial: 'M', bg: 'linear-gradient(135deg, #315f43, #4f7f52)', desc: 'A jóia da coroa. Símbolo máximo da Rozenblit, revelou grandes nomes da MPB e do frevo.' },
        { nome: 'Rozenblit', inicial: 'R', bg: 'linear-gradient(135deg, #c49a3a, #a44f25)', desc: 'A etiqueta principal, nome da família visionária que revolucionou a fonografia nordestina.' },
        { nome: 'Passarela', inicial: 'P', bg: 'linear-gradient(135deg, #c96b36, #a44f25)', desc: 'Dedicada aos ritmos carnavalescos, frevos e marchinhas que embalaram gerações.' },
        { nome: 'Solar', inicial: 'S', bg: 'linear-gradient(135deg, #245f73, #1a4a5a)', desc: 'Abrigo de talentos regionais, forró pé-de-serra e música de raiz nordestina.' },
        { nome: 'Polydisc', inicial: 'PD', bg: 'linear-gradient(135deg, #e8d8b8, #c49a3a)', desc: 'Compactos e EPs que democratizaram o acesso à música popular brasileira.' },
    ];

    // Etiquetas presentes no banco
    const etiquetasNoBanco = new Set(
        catalogoCompleto.map(i => (i.gravadora || '').trim())
    );

    // Contar registros por etiqueta
    const contagemEtiqueta = {};
    catalogoCompleto.forEach(item => {
        const g = (item.gravadora || '').trim();
        if (g) contagemEtiqueta[g] = (contagemEtiqueta[g] || 0) + 1;
    });

    // Etiquetas definidas presentes no banco
    const etiquetasFiltradas = etiquetasDef.filter(e =>
        [...etiquetasNoBanco].some(b => normalizarTexto(b).includes(normalizarTexto(e.nome)))
    );

    // Outras etiquetas do banco não listadas acima
    const nomesDef = etiquetasDef.map(e => normalizarTexto(e.nome));
    const outrasEtiquetas = [...etiquetasNoBanco].filter(e =>
        e && !nomesDef.some(n => normalizarTexto(e).includes(n))
    ).slice(0, 4);

    if (etiquetasFiltradas.length === 0 && outrasEtiquetas.length === 0) {
        container.closest('section').style.display = 'none';
        return;
    }

    let html = etiquetasFiltradas.map(e => {
        const qtd = Object.entries(contagemEtiqueta)
            .filter(([k]) => normalizarTexto(k).includes(normalizarTexto(e.nome)))
            .reduce((acc, [, v]) => acc + v, 0);
        return `
        <div class="rounded-2xl overflow-hidden card-hover group cursor-pointer"
             style="background: rgba(255, 250, 240, 0.86); border: 1px solid rgba(49, 95, 67, 0.16);"
             onclick="navigateTo('catalogo'); setTimeout(() => setFiltro('etiqueta', '${e.nome}'), 300);">
            <div class="h-40 flex items-center justify-center relative overflow-hidden" style="background: ${e.bg};">
                <span class="text-6xl font-bold text-white/15 group-hover:text-white/25 transition-all select-none" style="font-family:'Playfair Display',serif;">${e.inicial}</span>
                <div class="absolute inset-0 flex items-center justify-center">${gerarDiscoSVG(e.nome, '#ffffff', 'rgba(255,255,255,0.1)')}</div>
            </div>
            <div class="p-5">
                <h3 class="font-playfair text-xl mb-2" style="color: #315f43;">${escaparHTML(e.nome)}</h3>
                <p class="text-sm leading-relaxed" style="color: #6f604c;">${e.desc}</p>
                ${qtd > 0 ? `<p class="text-xs mt-3 font-medium" style="color: #a44f25;">${qtd} título${qtd !== 1 ? 's' : ''} no acervo</p>` : ''}
            </div>
        </div>`;
    }).join('');

    // Outras etiquetas extras
    if (outrasEtiquetas.length > 0) {
        const coresExtras = ['linear-gradient(135deg,#6b4c3b,#a44f25)', 'linear-gradient(135deg,#4f7f52,#245f73)'];
        html += outrasEtiquetas.map((e, i) => {
            const qtd = contagemEtiqueta[e] || 0;
            return `
            <div class="rounded-2xl overflow-hidden card-hover group cursor-pointer"
                 style="background: rgba(255, 250, 240, 0.86); border: 1px solid rgba(49, 95, 67, 0.16);"
                 onclick="navigateTo('catalogo'); setTimeout(() => setFiltro('etiqueta', '${e.replace(/'/g,"\\'")}'), 300);">
                <div class="h-40 flex items-center justify-center relative overflow-hidden" style="background: ${coresExtras[i % coresExtras.length]};">
                    <span class="text-5xl font-bold text-white/15 group-hover:text-white/25 transition-all select-none" style="font-family:'Playfair Display',serif;">${e.charAt(0)}</span>
                    <div class="absolute inset-0 flex items-center justify-center">${gerarDiscoSVG(e, '#ffffff', 'rgba(255,255,255,0.1)')}</div>
                </div>
                <div class="p-5">
                    <h3 class="font-playfair text-xl mb-2" style="color: #315f43;">${escaparHTML(e)}</h3>
                    ${qtd > 0 ? `<p class="text-xs mt-3 font-medium" style="color: #a44f25;">${qtd} título${qtd !== 1 ? 's' : ''} no acervo</p>` : ''}
                </div>
            </div>`;
        }).join('');
    }

    container.innerHTML = html;
    if (window.lucide) lucide.createIcons();
}

// ============================================================
// LINHA DO TEMPO (estática — história da Rozenblit)
// ============================================================
const timelineData = [
    { decada: '1950', fatos: 'Fundação da Rozenblit no Recife. Lançamento da etiqueta Mocambo. Primeiras gravações em 78 RPM.', cor: '#315f43' },
    { decada: '1960', fatos: 'Consolidação como maior gravadora do Norte-Nordeste. Inauguração do estúdio próprio.', cor: '#a44f25' },
    { decada: '1970', fatos: 'Lançamento das etiquetas Solar e Passarela. Catálogo ultrapassa mil títulos.', cor: '#c49a3a' },
    { decada: '1980', fatos: 'Transição para o vinil de 12 polegadas. Parcerias com artistas da nova MPB.', cor: '#245f73' },
    { decada: '1990', fatos: 'Preservação do acervo. Redescoberta por colecionadores e pesquisadores.', cor: '#c96b36' },
    { decada: '2000+', fatos: 'Digitalização do acervo. Criação do museu digital. Reconhecimento como patrimônio cultural.', cor: '#4f7f52' },
];

function popularTimeline() {
    const container = document.getElementById('timeline-container');
    if (!container) return;
    container.innerHTML = timelineData.map(t => `
        <div class="timeline-item flex-shrink-0 w-[140px] md:w-auto text-center relative pt-6 cursor-default group">
            <div class="flex justify-center mb-3 relative z-10">
                <div class="timeline-dot" style="background-color: ${t.cor};"></div>
            </div>
            <span class="text-3xl md:text-4xl font-bold block group-hover:opacity-90 transition-opacity" style="font-family:'Playfair Display',serif; color: #315f43;">${t.decada}</span>
            <p class="text-xs mt-2 leading-relaxed line-clamp-3 group-hover:opacity-80 transition-opacity" style="color: #6f604c;">${t.fatos}</p>
        </div>
    `).join('');
}

// ============================================================
// FILTROS DINÂMICOS
// ============================================================
function gerarFiltrosDinamicos() {
    const container = document.getElementById('filtros-tags');
    if (!container) return;

    // Etiquetas únicas
    const etiquetasSet = [...new Set(
        catalogoCompleto.map(i => (i.gravadora || '').trim()).filter(Boolean)
    )].sort();

    // Formatos únicos
    const formatosSet = [...new Set(
        catalogoCompleto.map(i => (i.formato || '').trim()).filter(Boolean)
    )].sort();

    // Décadas reais
    const decadasSet = [...new Set(
        catalogoCompleto.map(i => extrairDecadaDoItem(i)).filter(d => d !== null)
    )].sort();

    let html = `<span class="text-xs uppercase tracking-wider self-center mr-2" style="color: rgba(107, 96, 76, 0.6);">Filtros:</span>
    <button onclick="setFiltro('todos')" class="filtro-btn px-4 py-2 rounded-full text-sm font-medium transition-all hover:scale-105" data-filtro="todos" data-valor="">Todos</button>`;

    etiquetasSet.slice(0, 6).forEach(e => {
        html += `<button onclick="setFiltro('etiqueta', '${e.replace(/'/g,"\\'")}'" class="filtro-btn px-4 py-2 rounded-full text-sm font-medium transition-all hover:scale-105" data-filtro="etiqueta" data-valor="${escaparAttr(e)}">${escaparHTML(e)}</button>`;
    });

    formatosSet.slice(0, 4).forEach(f => {
        html += `<button onclick="setFiltro('formato', '${f.replace(/'/g,"\\'")}'" class="filtro-btn px-4 py-2 rounded-full text-sm font-medium transition-all hover:scale-105" data-filtro="formato" data-valor="${escaparAttr(f)}">${escaparHTML(f)}</button>`;
    });

    decadasSet.forEach(d => {
        html += `<button onclick="setFiltro('decada', '${d}')" class="filtro-btn px-4 py-2 rounded-full text-sm font-medium transition-all hover:scale-105" data-filtro="decada" data-valor="${d}">Anos ${d.slice(-2)}</button>`;
    });

    container.innerHTML = html;
    atualizarEstiloFiltros();
}

// ============================================================
// CATÁLOGO
// ============================================================
function popularCatalogo() {
    catalogoFiltrado = [...catalogoCompleto];
    filtroAtual = { tipo: 'todos', valor: null };
    const si = document.getElementById('search-input');
    if (si) si.value = '';
    atualizarEstiloFiltros();
    renderizarCatalogo();
}

function setFiltro(tipo, valor) {
    filtroAtual = { tipo, valor: valor || null };
    const si = document.getElementById('search-input');
    if (si) si.value = '';
    aplicarFiltros();
    atualizarEstiloFiltros();
}

function filtrarCatalogo() {
    const si = document.getElementById('search-input');
    const termo = si ? si.value.trim() : '';
    filtroAtual = termo.length > 0
        ? { tipo: 'busca', valor: termo }
        : { tipo: 'todos', valor: null };
    aplicarFiltros();
    atualizarEstiloFiltros();
}

function aplicarFiltros() {
    let res = [...catalogoCompleto];
    const { tipo, valor } = filtroAtual;

    if (tipo === 'busca' && valor) {
        const t = normalizarTexto(valor);
        res = res.filter(item =>
            normalizarTexto(item.titulo).includes(t) ||
            normalizarTexto(item.artista).includes(t) ||
            normalizarTexto(item.gravadora).includes(t) ||
            normalizarTexto(item.numero).includes(t) ||
            normalizarTexto(item.formato).includes(t)
        );
    } else if (tipo === 'etiqueta' && valor) {
        res = res.filter(item =>
            normalizarTexto(item.gravadora || '').includes(normalizarTexto(valor))
        );
    } else if (tipo === 'decada' && valor) {
        res = res.filter(item => extrairDecadaDoItem(item) === valor);
    } else if (tipo === 'formato' && valor) {
        res = res.filter(item =>
            normalizarTexto(item.formato || '') === normalizarTexto(valor)
        );
    } else if (tipo === 'artista' && valor) {
        res = res.filter(item =>
            normalizarTexto(item.artista || '').includes(normalizarTexto(valor))
        );
    }

    catalogoFiltrado = res;
    renderizarCatalogo();
}

function atualizarEstiloFiltros() {
    const { tipo, valor } = filtroAtual;
    document.querySelectorAll('.filtro-btn').forEach(btn => {
        const bTipo = btn.getAttribute('data-filtro');
        const bValor = btn.getAttribute('data-valor') || '';
        const ativo =
            (tipo === 'todos' && bTipo === 'todos') ||
            (tipo !== 'todos' && bTipo === tipo && normalizarTexto(bValor) === normalizarTexto(valor || ''));

        if (ativo) {
            btn.style.background = '#315f43';
            btn.style.color = '#fffaf0';
            btn.style.border = '1.5px solid #315f43';
        } else {
            btn.style.background = 'rgba(255,250,240,0.7)';
            btn.style.color = '#6f604c';
            btn.style.border = '1px solid rgba(49, 95, 67, 0.25)';
        }
    });
}

function renderizarCatalogo() {
    const grid = document.getElementById('catalogo-grid');
    const noResults = document.getElementById('no-results');
    const countEl = document.getElementById('catalogo-count');
    if (!grid) return;

    if (catalogoFiltrado.length === 0) {
        grid.innerHTML = '';
        if (noResults) noResults.classList.remove('hidden');
        if (countEl) countEl.textContent = '';
        return;
    }
    if (noResults) noResults.classList.add('hidden');
    if (countEl) countEl.textContent = `${catalogoFiltrado.length.toLocaleString('pt-BR')} título${catalogoFiltrado.length !== 1 ? 's' : ''}`;

    grid.innerHTML = catalogoFiltrado.map(item => {
        const ano = textoAnoItem(item);
        const etiqueta = item.gravadora || '';
        const formato = item.formato || '';
        const artista = item.artista || 'Artista não identificado';
        const titulo = item.titulo || 'Sem título';
        return `
        <div class="rounded-xl overflow-hidden card-hover cursor-pointer group"
             style="background: rgba(255, 250, 240, 0.92); border: 1px solid rgba(49, 95, 67, 0.16);"
             onclick="abrirDetalhe(${item.id})">
            <div class="aspect-square overflow-hidden relative flex items-center justify-center" style="background: linear-gradient(135deg, #e8d8b8, #fffaf0);">
                ${gerarPlaceholderCapa(titulo, artista, etiqueta)}
                ${formato ? `<div class="absolute top-2 left-2 px-2 py-1 rounded-md text-[10px] font-medium uppercase" style="background: rgba(49, 95, 67, 0.88); color: #fffaf0;">${escaparHTML(formato)}</div>` : ''}
            </div>
            <div class="p-3 md:p-4">
                <h3 class="font-playfair text-sm md:text-base line-clamp-2 leading-tight transition-colors group-hover:text-verde-cacto" style="color: #315f43;">${escaparHTML(titulo)}</h3>
                <p class="text-xs mt-1 line-clamp-1" style="color: #6f604c;">${escaparHTML(artista)}</p>
                <div class="flex items-center justify-between mt-2 gap-1">
                    ${etiqueta ? `<span class="text-[10px] px-2 py-0.5 rounded-full truncate max-w-[60%]" style="color: #a44f25; background: rgba(164, 79, 37, 0.1);">${escaparHTML(etiqueta)}</span>` : '<span></span>'}
                    <span class="text-[10px] flex-shrink-0" style="color: rgba(107, 96, 76, 0.55);">${escaparHTML(ano)}</span>
                </div>
            </div>
        </div>`;
    }).join('');

    if (window.lucide) lucide.createIcons();
}

// ============================================================
// PLACEHOLDER DE CAPA (CSS puro — sem imagens externas)
// ============================================================
function gerarPlaceholderCapa(titulo, artista, etiqueta) {
    const inicial = (titulo || '?').charAt(0).toUpperCase();
    const cores = [
        { outer: '#315f43', inner: '#4f7f52', label: '#fffaf0' },
        { outer: '#a44f25', inner: '#c96b36', label: '#fffaf0' },
        { outer: '#c49a3a', inner: '#e8c85a', label: '#2b241b' },
        { outer: '#245f73', inner: '#3a7f95', label: '#fffaf0' },
        { outer: '#6b4c3b', inner: '#8b6c5b', label: '#fffaf0' },
    ];
    const idx = (titulo || '').charCodeAt(0) % cores.length;
    const cor = cores[idx];
    const tituloBreve = (titulo || '').substring(0, 18);
    const etqBreve = (etiqueta || '').substring(0, 12);

    return `
    <div class="w-full h-full flex items-center justify-center relative overflow-hidden" style="background: linear-gradient(145deg, #f7f1e3, #e8d8b8);">
        <!-- Sulcos do vinil -->
        <svg width="100%" height="100%" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
            <circle cx="100" cy="100" r="95" fill="${cor.outer}" opacity="0.9"/>
            <circle cx="100" cy="100" r="82" fill="none" stroke="rgba(0,0,0,0.08)" stroke-width="1"/>
            <circle cx="100" cy="100" r="72" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="1"/>
            <circle cx="100" cy="100" r="62" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="1"/>
            <circle cx="100" cy="100" r="52" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="1"/>
            <!-- Selo central -->
            <circle cx="100" cy="100" r="38" fill="${cor.inner}"/>
            <circle cx="100" cy="100" r="36" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
            <!-- Texto do selo -->
            <text x="100" y="92" text-anchor="middle" fill="${cor.label}" font-size="22" font-family="serif" font-weight="bold" opacity="0.9">${inicial}</text>
            <text x="100" y="107" text-anchor="middle" fill="${cor.label}" font-size="6.5" font-family="sans-serif" opacity="0.75">${etqBreve.toUpperCase()}</text>
            <!-- Furo central -->
            <circle cx="100" cy="100" r="4" fill="rgba(0,0,0,0.35)"/>
            <circle cx="100" cy="100" r="2" fill="rgba(0,0,0,0.6)"/>
        </svg>
    </div>`;
}

// ============================================================
// MODAL DE DETALHE REAL
// ============================================================
function abrirDetalhe(id) {
    const item = catalogoCompleto.find(i => i.id === id);
    if (!item) return;

    const modal = document.getElementById('detalhe-modal');
    const content = document.getElementById('detalhe-content');
    if (!modal || !content) return;

    const ano = textoAnoItem(item);
    const etiqueta = item.gravadora || '';
    const formato = item.formato || '';
    const artista = item.artista || 'Artista não identificado';
    const titulo = item.titulo || 'Sem título';
    const numero = item.numero || '';

    content.innerHTML = `
        <div class="flex flex-col md:flex-row gap-6 md:gap-8">
            <div class="w-full md:w-64 flex-shrink-0">
                <div class="w-full aspect-square rounded-xl overflow-hidden shadow-2xl" style="border: 1px solid rgba(49, 95, 67, 0.2);">
                    ${gerarPlaceholderCapa(titulo, artista, etiqueta)}
                </div>
                ${numero ? `<p class="text-center text-xs mt-3 font-mono" style="color: #6f604c;">Nº ${escaparHTML(numero)}</p>` : ''}
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex flex-wrap items-center gap-2 mb-2">
                    ${etiqueta ? `<span class="text-xs uppercase tracking-widest font-medium px-2 py-1 rounded" style="color: #a44f25; background: rgba(164,79,37,0.08);">${escaparHTML(etiqueta)}</span>` : ''}
                    ${formato ? `<span class="text-xs uppercase tracking-widest font-medium px-2 py-1 rounded" style="color: #315f43; background: rgba(49,95,67,0.08);">${escaparHTML(formato)}</span>` : ''}
                    <span class="text-xs" style="color: #6f604c;">${escaparHTML(ano)}</span>
                </div>
                <h2 class="font-playfair text-2xl md:text-3xl mb-1 leading-tight" style="color: #2b241b;">${escaparHTML(titulo)}</h2>
                <p class="font-playfair text-xl italic mb-6" style="color: #315f43;">${escaparHTML(artista)}</p>

                <div class="rounded-xl p-4 mb-4" style="background: rgba(49, 95, 67, 0.05); border: 1px solid rgba(49, 95, 67, 0.12);">
                    <h4 class="font-playfair text-sm mb-3 flex items-center gap-2" style="color: #315f43;">
                        <i data-lucide="list-music" class="w-4 h-4"></i> Faixas
                    </h4>
                    <p class="text-sm italic" style="color: #a44f25; opacity: 0.7;">Faixas ainda não cadastradas.</p>
                </div>

                <div class="rounded-xl p-4" style="background: rgba(164, 79, 37, 0.04); border: 1px solid rgba(164, 79, 37, 0.1);">
                    <h4 class="font-playfair text-sm mb-2 flex items-center gap-2" style="color: #315f43;">
                        <i data-lucide="clipboard-list" class="w-4 h-4"></i> Ficha Técnica
                    </h4>
                    <p class="text-sm italic" style="color: #a44f25; opacity: 0.7;">Ficha técnica ainda não cadastrada.</p>
                </div>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
    if (window.lucide) lucide.createIcons();
}

function fecharDetalhe(event) {
    if (event && event.target !== document.getElementById('detalhe-modal')) return;
    const modal = document.getElementById('detalhe-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = '';
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('detalhe-modal');
        if (modal && !modal.classList.contains('hidden')) fecharDetalhe();
    }
});

// ============================================================
// NAVEGAÇÃO
// ============================================================
function navigateTo(page) {
    paginaAtual = page;
    document.querySelectorAll('.page-section').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById('page-' + page);
    if (target) {
        target.classList.remove('hidden');
        target.style.animation = 'fadeIn 0.5s ease-out forwards';
    }
    updateNavActive();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (page === 'catalogo' && dadosCarregados) popularCatalogo();
    if (window.lucide) lucide.createIcons();
    setTimeout(iniciarObservadorAnimacoes, 100);
}

function updateNavActive() {
    document.querySelectorAll('.nav-link').forEach(btn => {
        const btnPage = btn.getAttribute('data-page');
        if (btnPage === paginaAtual) {
            btn.style.color = '#315f43';
            btn.style.background = 'rgba(49, 95, 67, 0.1)';
            btn.style.fontWeight = '600';
        } else {
            btn.style.color = '#6f604c';
            btn.style.background = 'transparent';
            btn.style.fontWeight = '500';
        }
    });
}

// Dark mode stub — site é predominantemente claro
function toggleDarkMode() {
    console.log('Acervo Rozenblit — identidade visual clara (caatinga, sertão, Recife urbano)');
}

// ============================================================
// UTILITÁRIOS
// ============================================================
function escaparHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escaparAttr(str) {
    if (!str) return '';
    return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function iniciarObservadorAnimacoes() {
    const obs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.card-hover, .timeline-item').forEach(el => {
        if (el.style.opacity !== '1') {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            obs.observe(el);
        }
    });
}

console.log('🎵 Acervo Rozenblit — Museu Digital iniciando...');