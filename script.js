// Dados carregados dos JSONs
let PERGUNTAS = [];
let PREMIOS = [];
let CURSOS = [];

// INIT — carrega os JSONs e inicializa tudo
Promise.all([
    fetch('quiz.json').then(r => r.json()),
    fetch('premios.json').then(r => r.json()),
    fetch('cursos.json').then(r => r.json())
]).then(([quiz, premios, cursos]) => {
    PERGUNTAS = quiz;
    PREMIOS = premios;
    CURSOS = cursos;
    renderCursos();   // Gera os cards da seção #cursos a partir de cursos.json
    populateSelect(); // Popula o <select> do formulário a partir de cursos.json
    initRaspa();
    renderLeads();
});

// SCROLL ANIMATIONS
const obs = new IntersectionObserver(es => {
    es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
}, { threshold: .1 });
document.querySelectorAll('.fade-in').forEach(el => obs.observe(el));

// ─── TABS ────────────────────────────────────────────────────────────────────

function switchTab(t) {
    ['quiz', 'raspa', 'form'].forEach((n, i) => {
        document.querySelectorAll('.app-tab')[i].classList.toggle('active', n === t);
        document.getElementById('panel-' + n).classList.toggle('active', n === t);
    });
}

// ─── CURSOS ──────────────────────────────────────────────────────────────────

// Mapeia o id do curso para a classe CSS de cor da barra superior
const CURSO_CLASS = { info: 'info', enf: 'enf', adm: 'adm' };

function renderCursos() {
    const grid = document.getElementById('cursos-grid');
    if (!grid) return;
    grid.innerHTML = CURSOS.map(c => `
        <div class="curso-card ${CURSO_CLASS[c.id] || ''} fade-in">
            <div class="curso-emoji">${c.emoji}</div>
            <div class="curso-nome">${c.nome}</div>
            <div class="curso-duracao">${c.duracao}</div>
            <div class="curso-desc">${c.descricao}</div>
            <div class="curso-tags">${c.tags.map(t => `<span class="curso-tag">${t}</span>`).join('')}</div>
        </div>
    `).join('');

    // Registra os cards gerados no observer de animação scroll
    grid.querySelectorAll('.fade-in').forEach(el => obs.observe(el));
}

function populateSelect() {
    const sel = document.getElementById('f-curso');
    if (!sel) return;
    CURSOS.forEach(c => {
        const opt = document.createElement('option');
        opt.value = `Técnico em ${c.nome}`;
        opt.textContent = `Técnico em ${c.nome}`;
        sel.appendChild(opt);
    });
}

// ─── QUIZ ────────────────────────────────────────────────────────────────────

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

// ─── RASPADINHA ───────────────────────────────────────────────────────────────

let raspaCanvas, raspaCtx, raspaDrawing = false, raspaFeito = false, raspaTotal = 0;

function initRaspa() {
    const msg = document.getElementById('raspa-msg');
    const hoje = new Date().toDateString();
    msg.style.display = 'none'; msg.className = 'raspa-msg';
    document.getElementById('raspa-icon').textContent = '🎁';
    document.getElementById('raspa-nome').textContent = 'Surpresa!';
    document.getElementById('raspa-sub-txt').textContent = '';
    document.getElementById('raspa-prog-fill').style.width = '0%';
    document.getElementById('raspa-prog-label').textContent = '0% raspado';
    document.getElementById('raspa-instrucao').textContent = 'Segure e arraste o mouse para raspar e descobrir seu brinde! Válido uma vez por dia.';
    raspaFeito = false;

    // Sorteia prêmio do premios.json (campos: icon, name, sub)
    const p = PREMIOS[Math.floor(Math.random() * PREMIOS.length)];
    document.getElementById('raspa-icon').textContent = p.icon;
    document.getElementById('raspa-nome').textContent = p.name;
    document.getElementById('raspa-sub-txt').textContent = p.sub;

    raspaCanvas = document.getElementById('raspa-canvas');
    const bg = document.getElementById('raspa-premio-bg');
    raspaCanvas.width = bg.offsetWidth;
    raspaCanvas.height = bg.offsetHeight;
    raspaTotal = raspaCanvas.width * raspaCanvas.height;
    raspaCtx = raspaCanvas.getContext('2d');

    if (localStorage.getItem('know_raspa') === hoje) {
        raspaCtx.fillStyle = '#333';
        raspaCtx.fillRect(0, 0, raspaCanvas.width, raspaCanvas.height);
        raspaCtx.fillStyle = '#e74c3c';
        raspaCtx.font = 'bold 16px DM Sans, sans-serif';
        raspaCtx.textAlign = 'center';
        raspaCtx.fillText('Você já participou hoje!', raspaCanvas.width / 2, raspaCanvas.height / 2 - 10);
        raspaCtx.fillStyle = '#888';
        raspaCtx.font = '13px DM Sans, sans-serif';
        raspaCtx.fillText('Volte amanhã para tentar novamente.', raspaCanvas.width / 2, raspaCanvas.height / 2 + 16);
        raspaCanvas.style.cursor = 'not-allowed';
        raspaFeito = true;
        return;
    }

    raspaCanvas.style.cursor = 'crosshair';
    for (let y = 0; y < raspaCanvas.height; y += 20) {
        raspaCtx.fillStyle = y % 40 === 0 ? '#1a1a1a' : '#222';
        raspaCtx.fillRect(0, y, raspaCanvas.width, 20);
    }
    raspaCtx.fillStyle = '#f5c518';
    raspaCtx.font = 'bold 18px Bebas Neue, sans-serif';
    raspaCtx.textAlign = 'center';
    raspaCtx.letterSpacing = '3px';
    raspaCtx.fillText('RASPE AQUI ✦ RASPE AQUI ✦ RASPE AQUI', raspaCanvas.width / 2, raspaCanvas.height / 2 - 12);
    raspaCtx.fillStyle = '#888';
    raspaCtx.font = '13px DM Sans, sans-serif';
    raspaCtx.fillText('Segure e arraste o mouse', raspaCanvas.width / 2, raspaCanvas.height / 2 + 14);

    raspaCanvas.onmousedown = e => { raspaDrawing = true; raspar(e); };
    raspaCanvas.onmousemove = e => { if (raspaDrawing) raspar(e); };
    raspaCanvas.onmouseup = () => raspaDrawing = false;
    raspaCanvas.onmouseleave = () => raspaDrawing = false;
    raspaCanvas.ontouchstart = e => { e.preventDefault(); raspaDrawing = true; rasparTouch(e); };
    raspaCanvas.ontouchmove = e => { e.preventDefault(); if (raspaDrawing) rasparTouch(e); };
    raspaCanvas.ontouchend = () => raspaDrawing = false;
}

function getPosCanvas(e) {
    const r = raspaCanvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function raspar(e) {
    if (raspaFeito) return;
    const pos = getPosCanvas(e);
    raspaCtx.globalCompositeOperation = 'destination-out';
    raspaCtx.beginPath();
    raspaCtx.arc(pos.x, pos.y, 22, 0, Math.PI * 2);
    raspaCtx.fill();
    calcProgresso();
}

function rasparTouch(e) {
    if (raspaFeito) return;
    const t = e.touches[0];
    const r = raspaCanvas.getBoundingClientRect();
    raspaCtx.globalCompositeOperation = 'destination-out';
    raspaCtx.beginPath();
    raspaCtx.arc(t.clientX - r.left, t.clientY - r.top, 28, 0, Math.PI * 2);
    raspaCtx.fill();
    calcProgresso();
}

function calcProgresso() {
    const img = raspaCtx.getImageData(0, 0, raspaCanvas.width, raspaCanvas.height);
    let transparent = 0;
    for (let i = 3; i < img.data.length; i += 4) { if (img.data[i] === 0) transparent++; }
    const pct = Math.min(100, Math.round(transparent / raspaTotal * 100));
    document.getElementById('raspa-prog-fill').style.width = pct + '%';
    document.getElementById('raspa-prog-label').textContent = pct + '% raspado';
    if (pct >= 5 && !raspaFeito) {
        raspaFeito = true;
        raspaCtx.globalCompositeOperation = 'destination-out';
        raspaCtx.fillRect(0, 0, raspaCanvas.width, raspaCanvas.height);
        document.getElementById('raspa-prog-fill').style.width = '100%';
        document.getElementById('raspa-prog-label').textContent = '100% raspado 🎉';
        localStorage.setItem('know_raspa', new Date().toDateString());
        const msg = document.getElementById('raspa-msg');
        msg.textContent = '🎊 Parabéns! Apresente esta tela na secretaria para retirar seu brinde. Válido por 30 dias.';
        msg.style.display = 'block';
        raspaCanvas.style.cursor = 'default';
    }
}

// ─── FORMULÁRIO ───────────────────────────────────────────────────────────────

function validateEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

function showErr(id, show) {
    document.getElementById('err-' + id).classList.toggle('show', show);
    document.getElementById('f-' + id).classList.toggle('error', show);
}

function submitForm() {
    const nome = document.getElementById('f-nome').value.trim();
    const idade = parseInt(document.getElementById('f-idade').value);
    const email = document.getElementById('f-email').value.trim();
    const curso = document.getElementById('f-curso').value;
    let ok = true;
    showErr('nome', !nome || nome.length < 3); if (!nome || nome.length < 3) ok = false;
    showErr('idade', isNaN(idade) || idade < 14 || idade > 80); if (isNaN(idade) || idade < 14 || idade > 80) ok = false;
    showErr('email', !validateEmail(email)); if (!validateEmail(email)) ok = false;
    showErr('curso', !curso); if (!curso) ok = false;
    if (!ok) return;
    const leads = JSON.parse(localStorage.getItem('know_leads') || '[]');
    leads.push({ nome, idade, email, curso, data: new Date().toLocaleDateString('pt-BR') });
    localStorage.setItem('know_leads', JSON.stringify(leads));
    document.getElementById('f-nome').value = ''; document.getElementById('f-idade').value = '';
    document.getElementById('f-email').value = ''; document.getElementById('f-curso').value = '';
    const s = document.getElementById('form-success'); s.classList.add('show');
    setTimeout(() => s.classList.remove('show'), 4000);
    renderLeads();
}

function renderLeads() {
    const leads = JSON.parse(localStorage.getItem('know_leads') || '[]');
    const cont = document.getElementById('leads-container');
    const cnt = document.getElementById('leads-count');
    if (!leads.length) { cont.innerHTML = '<div class="admin-empty">Nenhum cadastro ainda. Os dados aparecerão aqui após envio do formulário.</div>'; cnt.textContent = ''; return; }
    cnt.textContent = leads.length + ' cadastro(s) registrado(s)';
    let h = '<div style="overflow-x:auto"><table class="leads-table"><thead><tr><th>Nome</th><th>Idade</th><th>Curso</th><th>Data</th></tr></thead><tbody>';
    leads.forEach(l => { h += `<tr><td><strong>${l.nome}</strong><br><small style="color:var(--cinza-claro)">${l.email}</small></td><td>${l.idade}</td><td>${l.curso}</td><td>${l.data}</td></tr>`; });
    h += '</tbody></table></div>'; cont.innerHTML = h;
}

function clearLeads() {
    if (confirm('Tem certeza que deseja apagar todos os cadastros?')) { localStorage.removeItem('know_leads'); renderLeads(); }
}