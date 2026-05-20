let cat = 'politics';
let style = 'poll';
let articles = [];
let current = null;
let lastResult = null;
let panelOpen = true;

// ── KEYS ──
function saveKeys() {
  const gmInput = document.getElementById('geminiKey').value.trim();
  if (!gmInput) { showErr('Please enter your Gemini API key.'); return; }
  sessionStorage.setItem('_gm', gmInput);
  document.getElementById('geminiKey').classList.add('ok');
  document.getElementById('cfgSub').textContent = '✓ Gemini key active — cleared when tab closes';
  togglePanel();
  toast('Key saved for this session!');
}
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
  const k2 = gm();
  if (k2) {
    document.getElementById('geminiKey').value = k2;
    document.getElementById('geminiKey').classList.add('ok');
    document.getElementById('cfgSub').textContent = '✓ Key active — session only';
    togglePanel();
  }
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

// ── FETCH NEWS (BFMTV Direct RSS) ──
async function fetchNews() {
  const btn = document.getElementById('fetchBtn');
  btn.disabled = true; btn.classList.add('loading');
  hideErr();
  try {
    const catRSSMap = {
      politics:      'https://www.bfmtv.com/rss/politique/',
      general:       'https://www.bfmtv.com/rss/news-24-7/',
      business:      'https://www.bfmtv.com/rss/economie/',
      entertainment: 'https://www.bfmtv.com/rss/culture/',
      health:        'https://www.bfmtv.com/rss/sante/',
      sports:        'https://www.bfmtv.com/rss/sport/'
    };

    const rssUrl = catRSSMap[cat] || catRSSMap['general'];
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(rssUrl)}`;

    console.log(`Fetching BFMTV RSS [${cat}]...`);
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error(`RSS fetch error: ${res.status}`);

    const xmlText = await res.text();
    console.log('Raw XML preview:', xmlText.substring(0, 300));

    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, 'application/xml');

    if (xml.querySelector('parsererror')) {
      throw new Error('XML parse failed — BFMTV feed may have changed.');
    }

    const items = Array.from(xml.getElementsByTagName('item'));
    console.log('Items found:', items.length);

    if (items.length === 0) throw new Error('No articles in BFMTV RSS feed.');

    articles = items.slice(0, 9).map(item => {
      const getText = (tag) =>
        item.getElementsByTagName(tag)[0]?.textContent?.trim() || '';

      const mediaContent = item.getElementsByTagName('media:content')[0];
      const enclosure    = item.getElementsByTagName('enclosure')[0];
      const description  = getText('description');

      const image =
        mediaContent?.getAttribute('url') ||
        enclosure?.getAttribute('url')    ||
        extractImgFromHTML(description)   ||
        null;

      const contentEncoded = item.getElementsByTagName('content:encoded')[0];
      const content = contentEncoded?.textContent?.trim() || description;

      return {
        title:       getText('title'),
        description: description,
        content:     content,
        url:         getText('link'),
        image:       image,
        publishedAt: getText('pubDate') || new Date().toISOString(),
        source: { name: 'BFMTV', url: 'https://www.bfmtv.com' }
      };
    });

    console.log('First article:', articles[0]);
    renderNews(articles);

  } catch (e) {
    showErr('Load Fail: ' + e.message);
    console.error('BFMTV RSS Error:', e);
  } finally {
    btn.disabled = false; btn.classList.remove('loading');
  }
}

// ── Extract first image URL from HTML string ──
function extractImgFromHTML(html) {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

// ── Strip HTML tags for Gemini ──
function stripHTML(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// ── Time ago helper ──
function ago(d) {
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

// ── RENDER NEWS ──
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
        ${a.image
          ? `<img src="${a.image}" alt="" onerror="this.parentElement.innerHTML='🗼'"><div class="card-img-fade"></div>`
          : '🗼'}
      </div>
      <div class="card-body">
        <div class="card-meta">
          <span class="card-source">${a.source?.name || 'BFMTV'}</span>
          <span class="card-dot"></span>
          <span class="card-time">${ago(a.publishedAt)}</span>
          <span class="card-cat-tag">${cat}</span>
        </div>
        <div class="card-title">${a.title}</div>
        <div class="card-desc">${stripHTML(a.description || '')}</div>
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

// ── STYLE COMPOSITION RULES ──
// ── NEW PURE-COMPOSITION STYLE FRAMEWORKS (NO HARDCODED NAMES) ──
const styleInstructions = {
  poll: `COMPOSITION: A cinematic photojournalistic scene. The main subjects from the news must be positioned clearly in the foreground. The lower 35% of the frame must smoothly fade into a solid, clean, dark near-black (#0a0a0a) gradient field to act as a perfect canvas for graphic headline text overlays. Shot on 35mm lens, realistic textures, press photography style.`,
  shock: `COMPOSITION: A high-impact dramatic single image scene. The primary actors from the article must be centered with intense, emotional expressions. A heavy dark vignette must cast deep shadows over the borders and the bottom layout quadrant to preserve maximum text readability. Dark atmospheric lighting.`,
  split: `COMPOSITION: A dramatic visual scene split diagonally as if physically torn or cracked down the center line. The LEFT SIDE must show a contrasting background setting relevant to the news topic, while the RIGHT SIDE depicts an opposing visual environment. The primary news subjects must stand overlapping the central division.`,
  portrait: `COMPOSITION: A striking close-up, 3/4 angle political portrait framing the main person from the news article. The background behind them must be dramatically blurred with cinematic bokeh, showing relevant architectural context. Intense side rim lighting, leaving the bottom area dark and clear for graphic text.`
};

// ── DYNAMIC NEWS-MATCHING GEMINI PROMPT GENERATOR ──
async function callGemini(article, st) {
  if (!gm()) { showErr('Please enter your Gemini API key first.'); if (!panelOpen) togglePanel(); return; }
  
  const imgStyle = styleInstructions[st] || styleInstructions.poll;
  
  // Try fetching full article text via proxies if available, otherwise fallback to details safely
  let fullText = null;
  try { if (typeof fetchFullArticle === 'function') fullText = await fetchFullArticle(article.url); } catch(e) { fullText = null; }

  const articleContext = fullText
    ? `Title: ${article.title}\nSource: ${article.source?.name || 'French press'}\nFull Text:\n${fullText}`
    : `Title: ${article.title}\nSource: ${article.source?.name || 'French press'}\nDescription: ${article.description || 'N/A'}`;

  const prompt = `You are an expert viral content creator for a French political news Facebook page. Your job is to transform a real news article into a high-engagement visual post and poll package.

STEP 1: CLOSELY ANALYZE THE TARGET NEWS ARTICLE:
${articleContext}

STEP 2: IDENTIFY THE ACTUAL PEOPLE INSIDE THIS NEWS:
* Read the title and context above. Who is this story actually about? (e.g., if it mentions François Villeroy de Galhau, Édouard Philippe, Sabrina Roubache, or a judge, they are the subjects. If NO specific individual is named, use the relevant general group archetype like "a senior French corporate executive", "a French union worker", or "local citizens").
* YOU MUST NEVER DEFAULT TO EMMANUEL MACRON OR GABRIEL ATTAL UNLESS THEY ARE EXPLICITLY NAMED IN THE TITLE OR DESCRIPTION ABOVE.

STEP 3: CREATE DETAILED VISUAL DESCRIPTIONS:
Based on the actual people identified in Step 2, determine their gender, approximate age, and realistic professional appearance (e.g., glasses, specific hairstyles, intense or thoughtful expressions). Always include a crisp French national flag (tricolor drape) somewhere clear in the background architectural scenery.

STEP 4: APPLY THIS LAYOUT STRUCTURE TO YOUR IMAGE PROMPT:
${imgStyle}

Generate content in this EXACT format — no extra text, no markdown, and strictly use ONLY these five field keys below:

IMAGE_PROMPT: [Write a highly detailed 5-6 sentence English image generation prompt for Midjourney or DALL-E 3 based strictly on the analysis above. First, explicitly detail the specific PEOPLE found in the news (state their exact names, describe their realistic age, gender, facial features, hair, clothing, and expressions). If multiple distinct people are named in the news, you MUST include both of them standing together in the scene. Second, detail the exact environmental PLACE, background objects, and atmospheric weather matching the news topic. Third, integrate the required layout composition parameter rules: demand that the text overlay areas are kept flat, dark, clean, and completely free of distracting busy details. End with: wide angle photo, dramatic cinematic lighting, volumetric air particles, high detailed texture, 8k resolution --ar 3:4]

TITRE: [Main French debate question or statement based on the article's core conflict, ALL CAPS, max 10 words, provocative and emotional]

HIGHLIGHT_WORD: [ONE single word from the TITRE to highlight in RED color — the most emotionally charged word]

SOUS_TITRE: [Short French subtitle, max 10 words, adds context — or write NONE if not needed]

FACEBOOK_CAPTION: [Full French Facebook caption. 4-5 sentences. Open with an emotional hook directly referencing the news facts. Create urgency or outrage. Ask followers to vote NON👍 or OUI❤️. End with 4-5 hashtags: #France #Politique #Débat #Actualité and one specific topic tag based on the news]`;

  // Using your exact original stable fetch pipeline
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${gm()}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.75, maxOutputTokens: 1200 }
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


// ── TAB SWITCHER ──
function switchTab(tabIndex) {
  document.querySelectorAll('.tabs .tab').forEach((tab, idx) => {
    tab.classList.toggle('active', idx === tabIndex);
  });
  document.querySelectorAll('.modal-body .tab-panel').forEach((panel, idx) => {
    panel.classList.toggle('active', idx === tabIndex);
  });
}

// ── MODAL CONTROLS ──
function openModal() {
  const overlay = document.getElementById('modalOverlay');
  if (overlay) { overlay.classList.add('open'); overlay.style.display = 'flex'; }
}

function closeModal() {
  const overlay = document.getElementById('modalOverlay');
  if (overlay) { overlay.classList.remove('open'); overlay.style.display = 'none'; }
}

function bgClose(event) {
  if (event.target.id === 'modalOverlay') closeModal();
}

// ── PARSER ──
function parse(text) {
  console.log('RAW GEMINI OUTPUT:\n', text);

  function getField(fieldName) {
    const pattern = new RegExp(
      '(?:^|\\n)[#\\s\\*]*' + fieldName + '[#\\s\\*]*[:\\-]?\\s*([\\s\\S]*?)(?=\\n[#\\s\\*]*[A-Z_]{4,}[#\\s\\*]*[:\\-]?|$)',
      'i'
    );
    const match = text.match(pattern);
    return match ? match[1].trim() : '';
  }

  let imagePrompt     = getField('IMAGE_PROMPT');
  const titre         = getField('TITRE');
  const highlightPhrase = getField('HIGHLIGHT_PHRASE');
  const sousTitre     = getField('SOUS_TITRE');
  const pollQuestion  = getField('POLL_QUESTION');
  const nonLabel      = getField('NON_LABEL');
  const ouiLabel      = getField('OUI_LABEL');
  const caption       = getField('FACEBOOK_CAPTION');
  const negative      = getField('IMAGE_NEGATIVE');

  if (!imagePrompt && text.toUpperCase().includes('IMAGE_PROMPT')) {
    const fallbackParts = text.split(/IMAGE_PROMPT\s*:/i);
    if (fallbackParts[1]) {
      imagePrompt = fallbackParts[1].split(/\n[A-Z_]+:/i)[0].replace(/[\*#]/g, '').trim();
    }
  }

  const fullImagePrompt = negative && !imagePrompt.toUpperCase().includes('NEGATIVE')
    ? `${imagePrompt}\n\n[NEGATIVE PROMPT]: ${negative}`
    : imagePrompt;

  const frText = `
MAIN TITLE — bold white ALL CAPS large font:
${titre || '(No title generated)'}

HIGHLIGHT WITH YELLOW/RED BRUSH STROKE:
"${highlightPhrase || '(No highlight phrase)'}"

SUBTITLE — smaller white text below title:
${(sousTitre && sousTitre !== 'NONE') ? sousTitre : '(No subtitle)'}

━━━ POLL SECTION — bottom of image ━━━
Poll question:
${pollQuestion || '(No poll question)'}

LEFT SIDE — NON 👍 (blue):
${nonLabel || 'NON'}

RIGHT SIDE — OUI ❤️ (red):
${ouiLabel || 'OUI'}
`.trim();

  return {
    imagePrompt: fullImagePrompt || text.slice(0, 500),
    frText,
    titre,
    highlightPhrase,
    sousTitre,
    pollQuestion,
    nonLabel,
    ouiLabel,
    caption: caption || text,
    negative
  };
}

// ── FILL MODAL ──
function fillModal(article, r) {
  document.getElementById('modalRef').textContent = article.title;
  document.getElementById('pImage').textContent = r.imagePrompt;
  document.getElementById('pText').textContent = r.frText;

  let qHtml = r.pollQuestion || r.titre || '';
  if (r.highlightPhrase && qHtml) {
    const escaped = r.highlightPhrase.replace(/[.*+?^${}()|\[\]]/g, '\\$&');
    const re = new RegExp('(' + escaped + ')', 'i');
    qHtml = qHtml.replace(re, '<span class="hl">$1</span>');
  }
  document.getElementById('pollQ').innerHTML = qHtml;

  const nonEl = document.querySelector('.poll-opt.non .poll-label');
  const ouiEl = document.querySelector('.poll-opt.oui .poll-label');
  if (nonEl) nonEl.innerHTML = `NON<br><small style="font-size:10px;font-weight:400;opacity:0.8">${r.nonLabel || ''}</small>`;
  if (ouiEl) ouiEl.innerHTML = `OUI<br><small style="font-size:10px;font-weight:400;opacity:0.8">${r.ouiLabel || ''}</small>`;

  document.getElementById('pCaption').textContent = r.caption;
  switchTab(0);
}

// ── REGENERATE ──
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
  const all = `=== IMAGE PROMPT ===\n${lastResult.imagePrompt}\n\n=== FRENCH TEXT OVERLAY ===\n${lastResult.frText}\n\n=== POLL QUESTION ===\n${lastResult.pollQuestion}\n\n=== FACEBOOK CAPTION ===\n${lastResult.caption}`;
  navigator.clipboard.writeText(all).then(() => toast('Everything copied!')).catch(() => {});
}

// ── UTILS ──
function showErr(m) {
  document.getElementById('errorMsg').textContent = m;
  document.getElementById('errorBar').classList.add('show');
}
function hideErr() {
  document.getElementById('errorBar').classList.remove('show');
}
function toast(m) {
  const t = document.getElementById('toast');
  t.textContent = '✓ ' + m; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
