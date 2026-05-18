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
    // Pure structural keyword tokens to force perfect category separation
    const qMap = {
      politics: 'politique',
      general: 'actualité',
      business: 'économie',
      entertainment: 'culture',
      health: 'santé',
      sports: 'sport'
    };
    const q = qMap[cat] || 'actualité';
    
    // 1. Target URL pointing directly to structural GNews French headlines
    const targetUrl = `https://gnews.io/api/v4/top-headlines?q=${encodeURIComponent(q)}&lang=fr&max=9&apikey=${gk()}`;
    
    // 2. Wrap it with corsproxy.io to bypass the browser's "Failed to fetch" block instantly
    const url = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
    
    console.log(`Fetching isolated news for [${cat}] via stable proxy...`);
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
  poll: `IMAGE STYLE: Cinematic photorealistic scene. Real French locations — Paris streets, Champs-Élysées, Palais Bourbon, public squares with crowds. Dramatic golden hour or moody overcast lighting. French flags visible. Diverse crowd shot from behind OR establishing wide shot. Dark vignette at bottom for text overlay. NO TEXT in the image. Ultra detailed, 8K quality, press photography style.`,
  shock: `IMAGE STYLE: High-impact dramatic single image. Dark moody atmosphere — stormy sky over Paris landmarks, empty Assemblée Nationale at night, tense protest crowd at dusk. French tricolor elements. Cinematic wide shot. Powerful chiaroscuro lighting. NO TEXT in the image. Ultra detailed, 8K, cinematic.`,
  split: `IMAGE STYLE: TWO contrasting scenes split diagonally as if torn apart. Left side: warm golden tones, traditional French family/prosperity, Eiffel Tower background. Right side: cold gray tones, economic tension, urban struggle. French tricolor flag dramatically split down the center as the dividing element. NO TEXT in the image. Photorealistic, 8K.`,
  portrait: `IMAGE STYLE: Dramatic political portrait. A stern older male or young female politician type (NO real faces — fictional character). 3/4 angle close-up. Dark dramatic background with blurred parliament or protest scene behind. Intense thinking expression. Cinematic rim lighting. Dark area at bottom for text. NO TEXT in the image. Photorealistic, 8K.`
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
  const prompt = `You are an expert viral content creator for a French political news Facebook page. The page posts provocative debate images with NON👍/OUI❤️ polls — political engagement-bait style. Your content must feel urgent, emotional, and shareable.

${imgStyle}

NEWS ARTICLE:
Title: ${article.title}
Source: ${article.source?.name || 'French press'}
Description: ${article.description || 'N/A'}
Published: ${article.publishedAt}

Generate content in this EXACT format — no extra text, no markdown:

IMAGE_PROMPT: [4-6 sentence English image generation prompt following the style rules above. Very specific about lighting, mood, composition, French elements. End with: --ar 4:5 --style raw --q 2]

TITRE: [Main French debate question or statement, ALL CAPS, max 10 words, provocative and emotional]

HIGHLIGHT_WORD: [ONE single word from the TITRE to highlight in RED color — the most emotionally charged word]

SOUS_TITRE: [Short French subtitle, max 10 words, adds context — or write NONE if not needed]

POLL_QUESTION: [The debate question for the poll card, French, ALL CAPS, ends with " ?", max 12 words, must create a clear YES/NO debate]

FACEBOOK_CAPTION: [Full French Facebook caption. 4-5 sentences. Open with an emotional hook. State the key news fact. Create urgency or outrage. Ask followers to vote NON👍 or OUI❤️. End with 4-5 hashtags: #France #Politique #Débat #Actualité and one topic-specific tag]`;

  // Find this line inside your callGemini(article, st) function:
const res = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${gm()}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.88, maxOutputTokens: 1100 }
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
