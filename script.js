// ─── DADOS ────────────────────────────────────────────────────────────────────
let PERGUNTAS = [], PREMIOS = [], CURSOS = [];

Promise.all([
    fetch('quiz.json').then(r => r.json()),
    fetch('premios.json').then(r => r.json()),
    fetch('cursos.json').then(r => r.json())
]).then(([quiz, premios, cursos]) => {
    PERGUNTAS = quiz;
    PREMIOS   = premios;
    CURSOS    = cursos;
    renderCursos();
    renderLeads();
    initLottery();
});

// ─── SCROLL FADE ─────────────────────────────────────────────────────────────
const obs = new IntersectionObserver(es => {
    es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
}, { threshold: .1 });
document.querySelectorAll('.fade-in').forEach(el => obs.observe(el));

// ─── TABS ────────────────────────────────────────────────────────────────────
function switchTab(t) {
    ['quiz','raspa','form'].forEach((n, i) => {
        document.querySelectorAll('.app-tab')[i].classList.toggle('active', n === t);
        document.getElementById('panel-' + n).classList.toggle('active', n === t);
    });
}

// ─── CURSOS (renderização dinâmica a partir do JSON) ─────────────────────────
function renderCursos() {
    const grid = document.getElementById('cursos-grid');
    if (!grid || !CURSOS.length) return;
    const tagColors = { info: 'var(--azul)', enf: 'var(--verde)', adm: 'var(--laranja)' };
    grid.innerHTML = CURSOS.map(c => `
        <div class="curso-card ${c.id} fade-in">
            <div class="curso-emoji">${c.emoji}</div>
            <div class="curso-nome">${c.nome}</div>
            <div class="curso-duracao">${c.duracao}</div>
            <div class="curso-desc">${c.descricao}</div>
            <div class="curso-tags">${c.tags.map(t => `<span class="curso-tag">${t}</span>`).join('')}</div>
        </div>
    `).join('');
    grid.querySelectorAll('.fade-in').forEach(el => obs.observe(el));
}

// ─── QUIZ ─────────────────────────────────────────────────────────────────────
let pts = {}, qIdx = 0, sel = [];
const NUM_Q = 5;

function startQuiz() {
    const s = localStorage.getItem('know_quiz');
    if (s) { const r = JSON.parse(s); showResult(r.curso, r.emoji, r.descricao); return; }
    pts = {}; qIdx = 0;
    const idx = [];
    while (idx.length < NUM_Q) {
        const r = Math.floor(Math.random() * PERGUNTAS.length);
        if (!idx.includes(r)) idx.push(r);
    }
    sel = idx.map(i => PERGUNTAS[i]);
    showScreen('quiz-question');
    renderQ();
}

function renderQ() {
    const p = sel[qIdx];
    document.getElementById('quiz-bar').style.width = (qIdx / NUM_Q * 100) + '%';
    document.getElementById('quiz-prog-label').textContent = 'Pergunta ' + (qIdx + 1) + ' de ' + NUM_Q;
    document.getElementById('quiz-q-text').textContent = p.pergunta;
    const c = document.getElementById('quiz-opts'); c.innerHTML = '';
    p.opcoes.forEach(op => {
        const b = document.createElement('button');
        b.className = 'quiz-opt';
        b.innerHTML = '<span class="quiz-opt-letter">' + op.letra + '</span>' + op.texto;
        b.onclick = () => pick(op.curso);
        c.appendChild(b);
    });
}

function pick(curso) {
    pts[curso] = (pts[curso] || 0) + 1;
    qIdx++;
    if (qIdx >= NUM_Q) calcResult(); else renderQ();
}

function calcResult() {
    document.getElementById('quiz-bar').style.width = '100%';
    const vencedor = Object.entries(pts).sort((a, b) => b[1] - a[1])[0][0];
    const curso = CURSOS.find(c => c.nome === vencedor) || CURSOS[0];
    const resultado = { curso: curso.nome, emoji: curso.emoji, descricao: curso.descricao };
    localStorage.setItem('know_quiz', JSON.stringify(resultado));
    showResult(resultado.curso, resultado.emoji, resultado.descricao);
}

function showResult(curso, emoji, descricao) {
    document.getElementById('result-icon').textContent = emoji;
    document.getElementById('result-course').textContent = 'Técnico em ' + curso;
    document.getElementById('result-text').textContent = descricao;
    showScreen('quiz-result');
}

function resetQuiz() { localStorage.removeItem('know_quiz'); showScreen('quiz-welcome'); }

function showScreen(id) {
    document.querySelectorAll('.quiz-screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

// ─── RASPADINHA LOTERIA AMERICANA ────────────────────────────────────────────
// Cada prêmio tem um símbolo principal + 2 emojis de apoio para preencher a grade.
// A linha vencedora (3 iguais em uma fileira horizontal) é o prêmio ganho.

const LOTTERY_PRIZES = [
    {
        id: 'desc_10',
        icon: '🎟️',
        name: '10% de Desconto',
        sub: 'Na sua primeira mensalidade!',
        symbols: ['🎟️', '💸', '💰']   // símbolo do prêmio + 2 apoios
    },
    {
        id: 'isencao',
        icon: '🎁',
        name: 'Isenção de Matrícula',
        sub: 'Sua taxa de matrícula sai de graça!',
        symbols: ['🎁', '🎓', '✨']
    },
    {
        id: 'kit',
        icon: '🎒',
        name: 'Kit KNOW Oficial',
        sub: 'Caderno, mochila e caneta do colégio!',
        symbols: ['🎒', '📓', '✏️']
    }
];

let lotteryBoard = [];   // 3x3: lotteryBoard[row][col] = symbol
let lotteryWinRow = -1; // qual fileira ganhou (-1 = nenhuma)
let cellRevealed = [];   // 3x3 booleans
let isDrawing = false;
let lotteryDone = false;
let activePrize = null;

function initLottery() {
    const hoje = new Date().toDateString();
    const bloqueado = document.getElementById('lottery-blocked-msg');
    const game = document.getElementById('lottery-game');

    // Reseta estado
    lotteryDone = false;
    lotteryBoard = [];
    cellRevealed = [];
    activePrize = null;
    lotteryWinRow = -1;

    if (localStorage.getItem('know_raspa') === hoje) {
        bloqueado.style.display = 'block';
        game.style.display = 'none';
        return;
    }
    bloqueado.style.display = 'none';
    game.style.display = 'block';

    // Oculta resultado anterior
    const resultDiv = document.getElementById('lottery-result');
    resultDiv.className = 'lottery-prize-reveal';
    resultDiv.innerHTML = '';

    // Sorteia o prêmio vencedor e a linha vencedora
    activePrize = LOTTERY_PRIZES[Math.floor(Math.random() * LOTTERY_PRIZES.length)];
    lotteryWinRow = Math.floor(Math.random() * 3); // 0, 1 ou 2

    // Monta o pool de símbolos de TODOS os prêmios para as caselas "perdedoras"
    const allSymbols = LOTTERY_PRIZES.flatMap(p => p.symbols);

    // Constrói a grade 3x3
    for (let r = 0; r < 3; r++) {
        lotteryBoard[r] = [];
        cellRevealed[r] = [];
        for (let c = 0; c < 3; c++) {
            if (r === lotteryWinRow) {
                // fileira vencedora: tudo com o ícone principal do prêmio
                lotteryBoard[r][c] = activePrize.icon;
            } else {
                // fileiras perdedoras: símbolo aleatório, garantindo que nunca
                // forme 3 iguais acidentalmente em outra fileira
                lotteryBoard[r][c] = pickLoser(allSymbols, activePrize.icon, r, c);
            }
            cellRevealed[r][c] = false;
        }
    }

    renderLotteryGrid();
    renderLotteryLegend();
}

function pickLoser(pool, winSymbol, row, col) {
    // Embaralha e pega o primeiro que não seja o símbolo vencedor
    const shuffled = pool.slice().sort(() => Math.random() - .5);
    for (const sym of shuffled) {
        if (sym !== winSymbol) return sym;
    }
    return pool[0]; // fallback
}

function renderLotteryLegend() {
    const legend = document.getElementById('lottery-legend');
    legend.innerHTML = LOTTERY_PRIZES.map(p =>
        `<div class="lottery-legend-item"><span>${p.icon}</span> ${p.name}</div>`
    ).join('');
}

function renderLotteryGrid() {
    const grid = document.getElementById('lottery-grid');
    grid.innerHTML = '';

    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            const cell = document.createElement('div');
            cell.className = 'lottery-cell';
            cell.dataset.row = r;
            cell.dataset.col = c;

            // Símbolo (escondido inicialmente)
            const sym = document.createElement('div');
            sym.className = 'lottery-cell-symbol';
            sym.textContent = lotteryBoard[r][c];
            cell.appendChild(sym);

            // Canvas de cobertura
            const canvas = document.createElement('canvas');
            canvas.className = 'lottery-cell-cover';
            cell.appendChild(canvas);

            // Inicializa o canvas de raspar
            requestAnimationFrame(() => initCellCanvas(canvas, cell, r, c));

            grid.appendChild(cell);
        }
    }
}

function initCellCanvas(canvas, cell, row, col) {
    const rect = cell.getBoundingClientRect();
    const w = rect.width || cell.offsetWidth;
    const h = rect.height || cell.offsetHeight;
    if (!w || !h) { setTimeout(() => initCellCanvas(canvas, cell, row, col), 50); return; }

    canvas.width  = Math.round(w);
    canvas.height = Math.round(h);
    canvas.style.width  = Math.round(w) + 'px';
    canvas.style.height = Math.round(h) + 'px';
    const ctx = canvas.getContext('2d');

    // Fundo da cobertura: estilo lottery com gradiente dourado
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#2a2310');
    grad.addColorStop(0.5, '#3d3418');
    grad.addColorStop(1, '#2a2310');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Padrão de linhas diagonais
    ctx.strokeStyle = 'rgba(245,197,24,0.08)';
    ctx.lineWidth = 1;
    for (let x = -h; x < w + h; x += 8) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + h, h); ctx.stroke();
    }

    // Símbolo de raspar no centro
    ctx.fillStyle = 'rgba(245,197,24,0.5)';
    ctx.font = `bold ${Math.floor(w * 0.22)}px DM Sans, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', w / 2, h / 2);

    // Eventos de mouse
    let drawing = false;
    let totalPixels = w * h;
    let revealedPct = 0;

    canvas.addEventListener('mousedown', e => { e.preventDefault(); drawing = true; scratchAt(e, ctx, canvas, cell, row, col, totalPixels); });
    canvas.addEventListener('mousemove', e => { if (!drawing) return; scratchAt(e, ctx, canvas, cell, row, col, totalPixels); });
    canvas.addEventListener('mouseup', () => drawing = false);
    canvas.addEventListener('mouseleave', () => drawing = false);
    canvas.addEventListener('touchstart', e => { e.preventDefault(); drawing = true; scratchAtTouch(e, ctx, canvas, cell, row, col, totalPixels); }, { passive: false });
    canvas.addEventListener('touchmove', e => { e.preventDefault(); if (drawing) scratchAtTouch(e, ctx, canvas, cell, row, col, totalPixels); }, { passive: false });
    canvas.addEventListener('touchend', () => drawing = false);
}

function scratchAt(e, ctx, canvas, cell, row, col, totalPixels) {
    if (lotteryDone && !cellRevealed[row][col]) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    doScratch(x, y, ctx, canvas, cell, row, col, totalPixels);
}

function scratchAtTouch(e, ctx, canvas, cell, row, col, totalPixels) {
    const t = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    doScratch(t.clientX - rect.left, t.clientY - rect.top, ctx, canvas, cell, row, col, totalPixels);
}

function doScratch(x, y, ctx, canvas, cell, row, col, totalPixels) {
    if (cellRevealed[row][col]) return;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.fill();

    // Conta transparência para detectar quando a casela está suficientemente raspada
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let transparent = 0;
    for (let i = 3; i < data.length; i += 4) { if (data[i] < 10) transparent++; }
    const pct = transparent / totalPixels;

    if (pct >= 0.50) {
        // Raspa o restante desta casela
        revealCell(ctx, canvas, cell, row, col);
    }
}

function revealCell(ctx, canvas, cell, row, col) {
    if (cellRevealed[row][col]) return;
    cellRevealed[row][col] = true;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    cell.classList.add('revealed');
    checkWin();
}

function checkWin() {
    // Verifica se a fileira vencedora está completamente revelada
    const winRowRevealed = cellRevealed[lotteryWinRow] && cellRevealed[lotteryWinRow].every(v => v);
    if (!winRowRevealed) return;

    // Destaca as 3 caselas vencedoras
    const cells = document.querySelectorAll('.lottery-cell');
    for (let c = 0; c < 3; c++) {
        cells[lotteryWinRow * 3 + c].classList.add('winner');
    }

    lotteryDone = true;
    localStorage.setItem('know_raspa', new Date().toDateString());

    // Revela também as outras fileiras (opcional, mostra o jogo todo)
    setTimeout(() => {
        const allCells = document.querySelectorAll('.lottery-cell');
        allCells.forEach((cell, idx) => {
            const r = Math.floor(idx / 3), c = idx % 3;
            if (!cellRevealed[r][c]) {
                const canvas = cell.querySelector('canvas');
                const ctx = canvas.getContext('2d');
                revealCell(ctx, canvas, cell, r, c);
            }
        });

        // Mostra o prêmio
        const resultDiv = document.getElementById('lottery-result');
        resultDiv.innerHTML = `
            <div class="lp-icon">${activePrize.icon}</div>
            <div class="lp-name">${activePrize.name}</div>
            <div class="lp-sub">${activePrize.sub}</div>
            <div class="lp-msg">🎊 Parabéns! Apresente esta tela na secretaria para retirar seu brinde. Válido por 30 dias.</div>
        `;
        resultDiv.classList.add('show');
    }, 500);
}

// ─── FORMULÁRIO ───────────────────────────────────────────────────────────────
function validateEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

function showErr(id, show) {
    document.getElementById('err-' + id).classList.toggle('show', show);
    document.getElementById('f-' + id).classList.toggle('error', show);
}

function submitForm() {
    const nome  = document.getElementById('f-nome').value.trim();
    const idade = parseInt(document.getElementById('f-idade').value);
    const email = document.getElementById('f-email').value.trim();
    const curso = document.getElementById('f-curso').value;
    let ok = true;
    showErr('nome',  !nome || nome.length < 3);  if (!nome || nome.length < 3) ok = false;
    showErr('idade', isNaN(idade) || idade < 14 || idade > 80); if (isNaN(idade) || idade < 14 || idade > 80) ok = false;
    showErr('email', !validateEmail(email));      if (!validateEmail(email)) ok = false;
    showErr('curso', !curso);                     if (!curso) ok = false;
    if (!ok) return;
    const leads = JSON.parse(localStorage.getItem('know_leads') || '[]');
    leads.push({ nome, idade, email, curso, data: new Date().toLocaleDateString('pt-BR') });
    localStorage.setItem('know_leads', JSON.stringify(leads));
    document.getElementById('f-nome').value = '';
    document.getElementById('f-idade').value = '';
    document.getElementById('f-email').value = '';
    document.getElementById('f-curso').value = '';
    const s = document.getElementById('form-success');
    s.classList.add('show');
    setTimeout(() => s.classList.remove('show'), 4000);
    renderLeads();
}

function renderLeads() {
    const leads = JSON.parse(localStorage.getItem('know_leads') || '[]');
    const cont  = document.getElementById('leads-container');
    const cnt   = document.getElementById('leads-count');
    if (!leads.length) {
        cont.innerHTML = '<div class="admin-empty">Nenhum cadastro ainda. Os dados aparecerão aqui após envio do formulário.</div>';
        cnt.textContent = ''; return;
    }
    cnt.textContent = leads.length + ' cadastro(s) registrado(s)';
    let h = '<div style="overflow-x:auto"><table class="leads-table"><thead><tr><th>Nome</th><th>Idade</th><th>Curso</th><th>Data</th></tr></thead><tbody>';
    leads.forEach(l => {
        h += `<tr><td><strong>${l.nome}</strong><br><small style="color:var(--cinza-claro)">${l.email}</small></td><td>${l.idade}</td><td>${l.curso}</td><td>${l.data}</td></tr>`;
    });
    h += '</tbody></table></div>';
    cont.innerHTML = h;
}

function clearLeads() {
    if (confirm('Tem certeza que deseja apagar todos os cadastros?')) {
        localStorage.removeItem('know_leads'); renderLeads();
    }
}