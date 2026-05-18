let cat = 'politics';
let style = 'poll';
let articles = [];
let current = null;
let lastResult = null;
let panelOpen = true;

// ── KEYS ──
function saveKeys() {
  const gkInput = document.getElementById('gnewsKey').value.trim();
  const gmInput = document.getElementById('geminiKey').value.trim();
  if (!gkInput || !gmInput) { showErr('Please enter both API keys.'); return; }
  sessionStorage.setItem('_gn', gkInput);
  sessionStorage.setItem('_gm', gmInput);
  document.getElementById('gnewsKey').classList.add('ok');
  document.getElementById('geminiKey').classList.add('ok');
  document.getElementById('cfgSub').textContent = '✓ Keys active — cleared automatically when tab closes';
  togglePanel();
  toast('Keys saved for this session!');
}
const gk = () => sessionStorage.getItem('_gn') || '';
const gm = () => sessionStorage.getItem('_gm') || '';

function toggleVis(id) {
  const e = document.getElementById(id);
  e.type = e.type === 'password' ? 'text' : 'password';
}

function togglePanel() {
  panelOpen = !panelOpen;
  document.getElementById('panelBody').classList.toggle('open', panelOpen);
  document.getElementById('chevron').classList.toggle('open', panelOpen);
}

window.addEventListener('load', () => {
  const k1 = gk(), k2 = gm();
  if (k1) { document.getElementById('gnewsKey').value = k1; document.getElementById('gnewsKey').classList.add('ok'); }
  if (k2) { document.getElementById('geminiKey').value = k2; document.getElementById('geminiKey').classList.add('ok'); }
  if (k1 && k2) { document.getElementById('cfgSub').textContent = '✓ Keys active — session only'; togglePanel(); }
});

function setCat(btn, c) {
  document.querySelectorAll('.cat-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  cat = c;
}
function setStyle(card, s) {
  document.querySelectorAll('.style-card').forEach(c => c.classList.remove('active'));
  card.classList.add('active');
  style = s;
}

// ── FETCH NEWS ──
async function fetchNews() {
  if (!gk()) { showErr('Please enter your GNews API key first.'); if (!panelOpen) togglePanel(); return; }
  const btn = document.getElementById('fetchBtn');
  btn.disabled = true; btn.classList.add('loading');
  hideErr();
  try {
    const qMap = {
      politics: 'politique',
      general: 'actualité',
      business: 'économie',
      entertainment: 'culture',
      health: 'santé',
      sports: 'sport'
    };
    const q = qMap[cat] || 'actualité';
    
    // Pure direct secure HTTPS layout request string
    const url = `https://gnews.io/api/v4/top-headlines?q=${encodeURIComponent(q)}&lang=fr&max=9&apikey=${gk()}`;
    
    console.log(`Direct HTTPS Request for [${cat}]:`, url);
    const res = await fetch(url);
    
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.errors?.[0] || `GNews API server error ${res.status}`);
    }
    
    const data = await res.json();
    if (!data.articles || data.articles.length === 0) {
      throw new Error('No fresh articles found matching this category tab.');
    }
    
    articles = data.articles;
    renderNews(articles);
  } catch (e) {
    showErr('Load Fail: ' + e.message);
    console.error("GNews App Error:", e);
  } finally {
    btn.disabled = false; btn.classList.remove('loading');
  }
}

function ago(d) {
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

function renderNews(arts) {
  document.getElementById('newsLabel').style.display = 'flex';
  const c = document.getElementById('newsContainer');
  const g = document.createElement('div');
  g.className = 'news-grid';
  arts.forEach((a, i) => {
    const card = document.createElement('div');
    card.className = 'news-card';
    card.innerHTML = `
      <div class="card-img">
        ${a.image ? `<img src="${a.image}" alt="" onerror="this.parentElement.innerHTML='🗼'"><div class="card-img-fade"></div>` : '🗼'}
      </div>
      <div class="card-body">
        <div class="card-meta">
          <span class="card-source">${a.source?.name || 'French Press'}</span>
          <span class="card-dot"></span>
          <span class="card-time">${ago(a.publishedAt)}</span>
          <span class="card-cat-tag">${cat}</span>
        </div>
        <div class="card-title">${a.title}</div>
        <div class="card-desc">${a.description || ''}</div>
        <button class="gen-btn" id="gb${i}" onclick="generate(${i})">
          ✨ <span class="gb-label">Generate Viral Prompt</span>
          <div class="mini-spin"></div>
        </button>
      </div>`;
    g.appendChild(card);
  });
  c.innerHTML = '';
  c.appendChild(g);
}

// ── GEMINI ──
const styleInstructions = {
  poll: `IMAGE COMPOSITION FRAMEWORK: A clear, dark moody bottom third or left side overlay space containing clean negative space designed specifically for user graphic elements. The background must feature the specified realistic scene, leaving wide open space for text placement without cluttered pixels.`,
  shock: `IMAGE COMPOSITION FRAMEWORK: High-impact dramatic focus. A deep vignette cast heavily over the text areas to preserve high readability. The central focus must hold extreme clarity while edge areas fall back to clean dark shadows.`,
  split: `IMAGE COMPOSITION FRAMEWORK: Distinct visual split showing contrasting structural balancing points. Both quadrants must keep details clean and text space uninhibited by busy objects or harsh bright spots.`,
  portrait: `IMAGE COMPOSITION FRAMEWORK: Close structural facial framing with significant dark side space. The contrast profile must drop sharply on one lateral side to open up flat, readable canvas zones for graphic overlays.`
};

async function generate(idx) {
  if (!gm()) { showErr('Please enter your Gemini API key first.'); if (!panelOpen) togglePanel(); return; }
  current = articles[idx];
  const btn = document.getElementById(`gb${idx}`);
  if (btn) { btn.disabled = true; btn.classList.add('loading'); btn.querySelector('.gb-label').textContent = 'Generating...'; }
  hideErr();
  try {
    lastResult = await callGemini(current, style);
    fillModal(current, lastResult);
    openModal();
  } catch (e) {
    showErr('Gemini error: ' + e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.classList.remove('loading'); btn.querySelector('.gb-label').textContent = 'Generate Viral Prompt'; }
  }
}

async function callGemini(article, st) {
  const imgStyle = styleInstructions[st];
  
  const prompt = `You are an expert viral content creator for a French political news Facebook page. Your job is to transform a real news article into a high-engagement visual post package.

You MUST analyze this specific news content for context clues:
1. PEOPLE: Who are the main actors or characters mentioned? (e.g., Yannick Jadot, green senators, French left-wing politicians, protestors). Generate realistic visual attributes for them (e.g., a serious mid-50s French politician with short grey hair and formal attire).
2. PLACE: Where is this taking place or what is the background environment? (e.g., Paris assembly halls, French political offices, senate podiums).
3. MOOD: What is the exact emotional tone? (e.g., division, political conflict, betrayal, alliance collapse).

Based on these details, synthesize a comprehensive image prompt along with matching viral ad copy elements.

${imgStyle}

NEWS ARTICLE TO CONVERT:
Title: ${article.title}
Source: ${article.source?.name || 'French press'}
Description: ${article.description || 'N/A'}

Generate content in this EXACT format — no extra text, no markdown:

IMAGE_PROMPT: [Write a highly detailed 5-6 sentence English image prompt for an AI image generator. Describe a cinematic photojournalistic scene in France based on the extracted details. First, explicitly detail the specific PEOPLE (describe their dress, facial expressions, and realistic actions). Second, explicitly establish the setting/PLACE and environmental weather/lighting matching the MOOD. Third, include strict composition parameters stating that the frame must provide vast empty negative space or a clean dark background area reserved for graphic text overlays. End with: wide angle photo, shot on 35mm lens, f/2.8, raw press photography style, dramatic cinematic lighting, highly detailed, 8k resolution --ar 4:5]

TITRE: [Main French debate question or statement based on the article conflict, ALL CAPS, max 10 words, provocative and emotional]

HIGHLIGHT_WORD: [ONE single word from the TITRE to highlight in RED color — the most emotionally charged word]

SOUS_TITRE: [Short French subtitle, max 10 words, adds context — or write NONE if not needed]

POLL_QUESTION: [The debate question for the poll card, French, ALL CAPS, ends with " ?", max 12 words, must create a clear YES/NO debate]

FACEBOOK_CAPTION: [Full French Facebook caption. 4-5 sentences. Open with an emotional hook directly referencing the news facts. Create urgency or outrage. Ask followers to vote NON👍 or OUI❤️. End with 4-5 hashtags: #France #Politique #Débat #Actualité and one specific topic tag based on the news]`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${gm()}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.82, maxOutputTokens: 1200 }
      })
    }
  );
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error?.message || `Gemini API error ${res.status}`);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini. Try again.');
  return parse(text);
}

function parse(text) {
  const get = (key) => {
    const i = text.indexOf(key + ':');
    if (i === -1) return '';
    return text.slice(i + key.length + 1).split(/\n[A-Z_]+:/)[0].trim();
  };
  const imagePrompt = get('IMAGE_PROMPT');
  const titre = get('TITRE');
  const highlight = get('HIGHLIGHT_WORD');
  const sousTitre = get('SOUS_TITRE');
  const pollQ = get('POLL_QUESTION');
  const caption = get('FACEBOOK_CAPTION');

  const frText =
`MAIN TITLE (bold white, ALL CAPS):
${titre}

WORD TO HIGHLIGHT IN RED:
${highlight}

SUBTITLE (smaller white text):
${sousTitre !== 'NONE' ? sousTitre : '— none —'}

POLL FORMAT AT BOTTOM:
NON 👍  (blue)   |   OUI ❤️  (red)`;

  return { imagePrompt, frText, titre, highlight, sousTitre, pollQ, caption };
}

// ── MODAL ──
function fillModal(article, r) {
  document.getElementById('modalRef').textContent = article.title;
  document.getElementById('pImage').textContent = r.imagePrompt;
  document.getElementById('pText').textContent = r.frText;
  document.getElementById('pCaption').textContent = r.caption;

  // Poll preview
  let qHtml = r.pollQ || r.titre || '';
  if (r.highlight && qHtml) {
    const re = new RegExp('(' + r.highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'i');
    qHtml = qHtml.replace(re, '<span class="hl">$1</span>');
  }
  document.getElementById('pollQ').innerHTML = qHtml;
  switchTab(0);
}

function openModal() {
  document.getElementById('modalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow = '';
}
function bgClose(e) { if (e.target === document.getElementById('modalOverlay')) closeModal(); }

function switchTab(n) {
  document.querySelectorAll('.tab').forEach((t, i) => t.classList.toggle('active', i === n));
  document.querySelectorAll('.tab-panel').forEach((p, i) => p.classList.toggle('active', i === n));
}

async function regenerate() {
  if (!gm() || !current) return;
  const btn = document.getElementById('regenBtn');
  btn.disabled = true; btn.textContent = '⏳ Regenerating...';
  try {
    lastResult = await callGemini(current, style);
    fillModal(current, lastResult);
    toast('Regenerated!');
  } catch (e) {
    showErr('Regenerate failed: ' + e.message);
  } finally {
    btn.disabled = false; btn.textContent = '🔄 Regenerate — Different Angle';
  }
}

// ── COPY ──
function cp(id) {
  const el = document.getElementById(id);
  const text = el.innerText || el.textContent;
  navigator.clipboard.writeText(text)
    .then(() => toast('Copied!'))
    .catch(() => {
      const t = document.createElement('textarea');
      t.value = text; document.body.appendChild(t);
      t.select(); document.execCommand('copy');
      document.body.removeChild(t); toast('Copied!');
    });
}

function copyAll() {
  if (!lastResult) return;
  const all = `=== IMAGE PROMPT ===\n${lastResult.imagePrompt}\n\n=== FRENCH TEXT OVERLAY ===\n${lastResult.frText}\n\n=== POLL QUESTION ===\n${lastResult.pollQ}\n\n=== FACEBOOK CAPTION ===\n${lastResult.caption}`;
  navigator.clipboard.writeText(all).then(() => toast('Everything copied!')).catch(() => {});
}

function showErr(m) { document.getElementById('errorMsg').textContent = m; document.getElementById('errorBar').classList.add('show'); }
function hideErr() { document.getElementById('errorBar').classList.remove('show'); }
function toast(m) {
  const t = document.getElementById('toast');
  t.textContent = '✓ ' + m; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
