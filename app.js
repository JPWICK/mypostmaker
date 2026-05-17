let cat = 'politics';
let style = 'poll';
let articles = [];
let current = null;
let lastResult = null;
let panelOpen = true;

// ── KEYS MANAGEMENT ──
function saveKeys() {
  const gkVal = document.getElementById('gnewsKey').value.trim();
  const gmVal = document.getElementById('geminiKey').value.trim();
  
  if (!gkVal || !gmVal) { 
    showErr('Missing Keys: Please supply both functional API keys to save.'); 
    return; 
  }
  
  sessionStorage.setItem('_gn', gkVal);
  sessionStorage.setItem('_gm', gmVal);
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

// ── NEWS PROCESSING (GNEWS) ──
async function fetchNews() {
  if (!gk()) { 
    showErr('Authentication Blocked: GNews API configuration string missing.'); 
    if (!panelOpen) togglePanel(); 
    return; 
  }
  
  const btn = document.getElementById('fetchBtn');
  btn.disabled = true; 
  btn.classList.add('loading');
  hideErr();
  
  try {
    const qMap = {
      politics: 'France politique gouvernement',
      general: 'France actualité',
      business: 'France économie',
      entertainment: 'France culture société',
      health: 'France santé',
      sports: 'France sport'
    };
    const q = qMap[cat] || 'France';
    const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(q)}&lang=fr&country=fr&max=9&sortby=publishedAt&apikey=${gk()}`;
    
    const res = await fetch(url);
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403) {
        throw new Error(`GNews Auth Error (Status ${res.status}): Your GNews API Key appears invalid or expired.`);
      }
      throw new Error(e.errors?.[0] || `GNews System Error (Status ${res.status}). Failed network call connection.`);
    }
    
    const data = await res.json();
    if (!data.articles?.length) {
      throw new Error('Zero Results returned. GNews did not identify articles matching the specified parameters.');
    }
    
    articles = data.articles;
    renderNews(articles);
  } catch (e) {
    showErr(e.message);
  } finally {
    btn.disabled = false; 
    btn.classList.remove('loading');
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

// ── INSTRUCTIONS META MAP ──
const styleInstructions = {
  poll: `IMAGE STYLE: Cinematic photorealistic scene. Real French locations — Paris streets, Champs-Élysées, Palais Bourbon, public squares with crowds. Dramatic golden hour or moody overcast lighting. French flags visible. Diverse crowd shot from behind OR establishing wide shot. Dark vignette at bottom for text overlay. NO TEXT in the image. Ultra detailed, 8K quality, press photography style.`,
  shock: `IMAGE STYLE: High-impact dramatic single image. Dark moody atmosphere — stormy sky over Paris landmarks, empty Assemblée Nationale at night, tense protest crowd at dusk. French tricolor elements. Cinematic wide shot. Powerful chiaroscuro lighting. NO TEXT in the image. Ultra detailed, 8K, cinematic.`,
  split: `IMAGE STYLE: TWO contrasting scenes split diagonally as if torn apart. Left side: warm golden tones, traditional French family/prosperity, Eiffel Tower background. Right side: cold gray tones, economic tension, urban struggle. French tricolor flag dramatically split down the center as the dividing element. NO TEXT in the image. Photorealistic, 8K.`,
  portrait: `IMAGE STYLE: Dramatic political portrait. A stern older male or young female politician type (NO real faces — fictional character). 3/4 angle close-up. Dark dramatic background with blurred parliament or protest scene behind. Intense thinking expression. Cinematic rim lighting. Dark area at bottom for text. NO TEXT in the image. Photorealistic, 8K.`
};

// ── AUTOMATION PIPELINE (GEMINI) ──
async function generate(idx) {
  if (!gm()) { 
    showErr('Authentication Blocked: Gemini API credential payload string missing.'); 
    if (!panelOpen) togglePanel(); 
    return; 
  }
  
  current = articles[idx];
  const btn = document.getElementById(`gb${idx}`);
  if (btn) { 
    btn.disabled = true; 
    btn.classList.add('loading'); 
    btn.querySelector('.gb-label').textContent = 'Generating...'; 
  }
  hideErr();
  
  try {
    lastResult = await callGemini(current, style);
    fillModal(current, lastResult);
    openModal();
  } catch (e) {
    showErr(e.message);
  } finally {
    if (btn) { 
      btn.disabled = false; 
      btn.classList.remove('loading'); 
      btn.querySelector('.gb-label').textContent = 'Generate Viral Prompt'; 
    }
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

  // Upgraded network processing logic with structured error categorization
  let res;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${gm()}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.88, maxOutputTokens: 1100 }
        })
      }
    );
  } catch (netErr) {
    throw new Error("Network Disconnect: Failed to establish channel communication with the Google Gemini API gateway.");
  }

  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    if (res.status === 400) {
      throw new Error(`Gemini Bad Request (400): Ensure syntax properties match specifications.`);
    } else if (res.status === 403) {
      throw new Error(`Gemini Authorization Error (403): API credential invalid or has insufficient permissions.`);
    } else if (res.status === 429) {
      throw new Error(`Gemini Rate Limit Triggered (429): Quota limits exhausted. Slow down request frequency.`);
    }
    throw new Error(e.error?.message || `Gemini Engine Exception Framework reported error status: ${res.status}`);
  }

  const data = await res.json();
  
  // High-performance safety validation handling for Google AI Safety blocks
  if (data.candidates?.[0]?.finishReason === "SAFETY") {
    throw new Error("Generation Flagged: Request blocked by Google Safety Filters. Content contains sensitive elements.");
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text || text.trim() === "") {
    throw new Error('Response Extraction Failure: Gemini engine processed structural tokens but omitted the inner package payload.');
  }

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

  // Verify extraction criteria
  if (!imagePrompt || !titre || !caption) {
    throw new Error("Structural Extraction Failure: The engine failed to cleanly extract mandatory structured data objects from raw response strings.");
  }

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

// ── UI CONTROLLER MODAL DIALOGS ──
function fillModal(article, r) {
  document.getElementById('modalRef').textContent = article.title;
  document.getElementById('pImage').textContent = r.imagePrompt;
  document.getElementById('pText').textContent = r.frText;
  document.getElementById('pCaption').textContent = r.caption;

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

function bgClose(e) { 
  if (e.target === document.getElementById('modalOverlay')) closeModal(); 
}

function switchTab(n) {
  document.querySelectorAll('.tab').forEach((t, i) => t.classList.toggle('active', i === n));
  document.querySelectorAll('.tab-panel').forEach((p, i) => p.classList.toggle('active', i === n));
}

async function regenerate() {
  if (!gm() || !current) return;
  const btn = document.getElementById('regenBtn');
  btn.disabled = true; 
  btn.textContent = '⏳ Regenerating...';
  hideErr();
  
  try {
    lastResult = await callGemini(current, style);
    fillModal(current, lastResult);
    toast('Regenerated!');
  } catch (e) {
    showErr(e.message);
  } finally {
    btn.disabled = false; 
    btn.textContent = '🔄 Regenerate — Different Angle';
  }
}

// ── UTILITIES (COPY, TOAST, ERRORS) ──
function cp(id) {
  const el = document.getElementById(id);
  const text = el.innerText || el.textContent;
  navigator.clipboard.writeText(text)
    .then(() => toast('Copied!'))
    .catch(() => {
      const t = document.createElement('textarea');
      t.value = text; document.body.appendChild(t);
      t.select(); document.execCommand('copy');
      document.body.removeChild(t); 
      toast('Copied!');
    });
}

function copyAll() {
  if (!lastResult) return;
  const all = `=== IMAGE PROMPT ===\n${lastResult.imagePrompt}\n\n=== FRENCH TEXT OVERLAY ===\n${lastResult.frText}\n\n=== POLL QUESTION ===\n${lastResult.pollQ}\n\n=== FACEBOOK CAPTION ===\n${lastResult.caption}`;
  navigator.clipboard.writeText(all).then(() => toast('Everything copied!')).catch(() => {});
}

function showErr(m) { 
  document.getElementById('errorMsg').textContent = m; 
  document.getElementById('errorBar').classList.add('show'); 
}

function hideErr() { 
  document.getElementById('errorBar').classList.remove('show'); 
}

function toast(m) {
  const t = document.getElementById('toast');
  t.textContent = '✓ ' + m; 
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

document.addEventListener('keydown', e => { 
  if (e.key === 'Escape') closeModal(); 
});
