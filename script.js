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

// ── DYNAMIC STYLE FRAMEWORKS (PURE LAYOUT BLUEPRINTS - NO HARDCODED NAMES) ──
const styleInstructions = {
  poll: `
COMPOSITION — "POLL DEBATE" STYLE (your main viral style):
- Portrait 3:4 ratio
- TOP 55%: Main dramatic scene. Main news subject/politician figure large on LEFT foreground (waist up), real crisis scene on RIGHT background
- BOTTOM 45%: Must fade to solid near-black — empty zone for text/poll graphics overlay
- Main Subject: shown from waist up, slightly left of center, intense or contemplative expression, looking slightly right
- Background RIGHT: the actual real-world scene from the news (protest, parliament, housing, border, street)
- Lighting: dramatic cinematic rim light on figure, moody overcast or golden hour background
- Color grade: dark, high contrast, slightly desaturated, French political tones (deep blue/red)`,

  shock: `
COMPOSITION — "SHOCK & IMPACT" STYLE:
- Full frame dramatic wide establishing shot
- BOTTOM 40% fades to solid dark for text overlay
- The SCENE is the subject — no single dominant person
- Could be: stormy sky over Paris, massive protest crowd, empty Palais Bourbon at night
- Color grade: dark, ominous, high contrast, cold tones`,

  split: `
COMPOSITION — "SPLIT COMPARISON" STYLE:
- Frame split diagonally as if physically torn
- LEFT HALF: warm golden tones — prosperity, traditional France, café, family, Eiffel Tower
- RIGHT HALF: cold gray/blue — poverty, urban tension, crowded HLM buildings, grey skies
- French tricolor flag tears dramatically through the diagonal split center
- BOTTOM 30%: solid dark gradient for text overlay`,

  portrait: `
COMPOSITION — "POLITICAL PORTRAIT" STYLE:
- Tight 3/4 angle portrait filling LEFT 60% of frame from chest up
- Subject looking slightly off-camera, intense expression
- RIGHT side: blurred parliament, protest, or relevant political background
- BOTTOM 40%: dark gradient fading to black for text overlay
- Dramatic side rim lighting, dark moody background`
};

// ── FETCH FULL ARTICLE ──
async function fetchFullArticle(url) {
  if (!url) return null;

  const proxies = [
    `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
    `https://corsproxy.io/?${encodeURIComponent(url)}`
  ];

  for (const proxyUrl of proxies) {
    try {
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) continue;

      const data = await res.json();
      const html = data.contents || data;
      if (typeof html !== 'string') continue;

      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<nav[\s\S]*?<\/nav>/gi, '')
        .replace(/<header[\s\S]*?<\/header>/gi, '')
        .replace(/<footer[\s\S]*?<\/footer>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s{3,}/g, '\n')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .trim();

      if (text.length > 200) return text.slice(0, 3000);
    } catch (e) {
      continue;
    }
  }
  return null;
}

// ── GENERATE (BUTTON CLICK) ──
async function generate(index) {
  const article = articles[index];
  if (!article) { showErr('Article data missing.'); return; }

  current = article;

  const btn = document.getElementById(`gb${index}`);
  let oldHtml = '';
  if (btn) {
    oldHtml = btn.innerHTML;
    btn.disabled = true;
    btn.classList.add('loading');
    const label = btn.querySelector('.gb-label');
    if (label) label.textContent = 'Generating with Gemini...';
  }

  hideErr();

  try {
    lastResult = await callGemini(article, style);
    fillModal(article, lastResult);
    if (typeof openModal === 'function') {
      openModal();
    } else {
      const modal = document.getElementById('modal') || document.getElementById('resultModal');
      if (modal) modal.classList.add('open');
    }
    toast('Viral prompt ready!');
  } catch (e) {
    showErr('Generation Failed: ' + e.message);
    console.error('Gemini Generation Error:', e);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.classList.remove('loading');
      btn.innerHTML = oldHtml;
    }
  }
}

// ── DYNAMIC NEWS-MATCHING GEMINI PROMPT GENERATOR ──
// ── DYNAMIC NEWS-MATCHING GEMINI PROMPT GENERATOR ──
async function callGemini(article, st) {
  if (!gm()) { showErr('Please enter your Gemini API key first.'); if (!panelOpen) togglePanel(); return; }

  const imgStyle = styleInstructions[st] || styleInstructions.poll;

  let fullText = null;
  try { fullText = await fetchFullArticle(article.url); } catch(e) { fullText = null; }

  const articleContext = fullText
    ? `ARTICLE TITLE: ${article.title}
SOURCE: ${article.source?.name || 'French press'}
PUBLISHED: ${article.publishedAt || 'Recent'}
CATEGORY_TAB: ${cat}
FULL ARTICLE TEXT (use this for all details — names, facts, numbers, quotes):
"""
${fullText}
"""`.trim()
    : `ARTICLE TITLE: ${article.title}
SOURCE: ${article.source?.name || 'French press'}
PUBLISHED: ${article.publishedAt || 'Recent'}
CATEGORY_TAB: ${cat}
DESCRIPTION: ${article.description || 'No description available'}
NOTE: Only title and description available. Extract maximum detail from these.`.trim();

  const masterPrompt = `
You are the lead visual content strategist for a viral French media Facebook page with 500,000+ followers.
Your graphics use dramatic, high-impact AI-generated images with bold French text overlays.
Every output must match the context, subjects, and tone of the input news with 100% precision.

CRITICAL SYSTEM RULE: Output raw text ONLY. Do NOT wrap your entire response inside markdown code blocks like \`\`\`text or \`\`\`. Start immediately with the first key field name.

━━━ THE INPUT NEWS DATA ━━━
${articleContext}

━━━ MANDATORY LAYOUT STYLE SELECTION (CRITICAL) ━━━
You must design this specific social media asset using the following exact layout blueprint rules:
${imgStyle}

━━━ YOUR EXTRACTION & IDENTITY ALIGNMENT TASK ━━━
Carefully analyze the headline, category tab, and text description above to build a perfectly accurate prompt:

1. THEMATIC CATEGORY ENFORCEMENT (CRITICAL):
   - Look at the CATEGORY_TAB value. If it is "entertainment" or "sports", YOU MUST NEVER FORCE A FRENCH POLITICIAN (like Macron, Attal, or Grégoire) into the scene. 
   - For Entertainment/Culture: Keep the prompt focused purely on pop culture, Hollywood, cinema, international actors, actresses, directors, or TV sets mentioned in the news text.
   - For Sports: Keep the prompt focused purely on athletes, stadiums, matches, pitches, jerseys, or sporting events mentioned.

2. IDENTIFY THE EXACT PEOPLE IN THE NEWS:
   - Who is this story explicitly about? Isolate their exact names from the text (e.g., Ellen Pompeo, Shonda Rhimes, an international actress, an executive, an athlete).
   - In your final prompt output, you must explicitly write their exact names and generate highly precise physical descriptions of them (describe their real-world gender, approximate age, hairstyle, expression, and context-appropriate clothing like medical scrubs, a Hollywood suit, or a sports jersey).
   - If multiple distinct people are named in the news conflict, include both of them standing together or interacting in the layout scene.

3. INTELLIGENT FALLBACKS (ONLY FOR POLITICS/BUSINESS/GENERAL IF NO NAMES EXIST):
   - Only if the CATEGORY_TAB is "politics", "business", or "general", AND absolutely no specific individual name can be found in the text, you may fall back to:
     • Macro-Economics/International/Diplomacy: Force Emmanuel Macron. Describe him accurately.
     • Domestic Scandals/Security/Justice/Social Crises: Force Gabriel Attal. Describe him accurately.
   - Otherwise, always default to a realistic general archetype matching the topic exactly (e.g., "a senior French corporate executive in a glass skyscraper", "a tired French worker", or "local citizens at a public rally").

4. REALISTIC SCENE ENVIRONMENT:
   Never use abstract backgrounds. Match the physical setting to the news text details:
   - For Entertainment/TV News: Describe a highly polished, high-tech Hollywood studio backlot, a bustling modern television set with cameras and lighting rigs, or an iconic scene layout mimicking the show mentioned.
   - For Public Service Crises: A realistic French public school corridor or weathered institutional office building.
   - For Social/Strike Crises: Crowded urban French streets, protest banners with bold hand-painted lettering, or police barriers.

5. ADAPTIVE PROTECTION ZONES & FLAG EMBLEMS:
   - If the CATEGORY_TAB is related to French national news or politics, include a crisp French flag in the architecture. If it is international entertainment or Hollywood, use relevant setting details instead.
   - If the active style block above requires a "Poll", append: "the lower 45% of the frame smoothly fades to a completely solid, uniform near-black (#0a0a0a) gradient field that is entirely clear of details, reserved exclusively for graphic text banners."
   - If NOT a poll style, append: "the lower 30% of the frame smoothly transitions to a clean, solid dark near-black (#0a0a0a) gradient field to act as a clear canvas for headline text overlays."

━━━ CAMERA TECH SPECS ━━━
Conclude the prompt description with: "photojournalism style, cinematic side rim lighting, sharp focus on subject foreground, volumetric air particles, high-contrast desaturated color grading, shot on Canon EOS R5, 35mm lens, f/2.8, 8k resolution, hyper-realistic --ar 4:5 --style raw".

━━━ STRUCTURED OUTPUT FORMAT ━━━
Respond with ONLY these fields in order. No markdown headings or bold symbols.
CRITICAL: If the active style has no poll, fill POLL_QUESTION, NON_LABEL, OUI_LABEL with: NONE

IMAGE_PROMPT:
[Dense 5-7 sentence English generation prompt mapping the exact real names and visual descriptors identified.]

TITRE:
[Main provocative French headline reflecting the true topic. ALL CAPS. Max 10 words.]

HIGHLIGHT_PHRASE:
[The 2-4 most shocking words from TITRE.]

SOUS_TITRE:
[One specific metric, name, or statistic in French. Max 10 words. If none: NONE]

POLL_QUESTION:
[Binary poll debate question in French. ALL CAPS. Ends with ' ?'. Max 12 words. If no poll: NONE]

NON_LABEL:
[What NON👍 stands for. 3-5 French words. If no poll: NONE]

OUI_LABEL:
[What OUI❤️ stands for. 3-5 French words. If no poll: NONE]

FACEBOOK_CAPTION:
[Complete French social media caption matching the accurate topic context, a provocative question, '👉 Donnez votre avis...' CTA with hashtags.]

IMAGE_NEGATIVE:
[Exclusion parameters: english text on walls, cartoon style, duplicate heads, happy smiling faces, bright cheer colors.]`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${gm()}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: masterPrompt }] }],
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 2500
        }
      })
    }
  );

  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error?.message || `Gemini API error ${res.status} — check your API key`);
  }

  const data = await res.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error('Gemini returned empty response. Please try again.');

  return parse(rawText);
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

// ── PARSER WITH MARKDOWN SANITIZATION ──
function parse(text) {
  // Strip away rogue markdown wrappers if the AI falls back into code-block habits
  let cleanText = text.replace(/```[a-zA-Z]*/g, '').replace(/```/g, '').trim();
  console.log('CLEANED GEMINI OUTPUT:\n', cleanText);

  function getField(fieldName) {
    const pattern = new RegExp(
      '(?:^|\\n)[#\\s\\*]*' + fieldName + '[#\\s\\*]*[:\\-]?\\s*([\\s\\S]*?)(?=\\n[#\\s\\*]*[A-Z_]{4,}[#\\s\\*]*[:\\-]?|$)',
      'i'
    );
    const match = cleanText.match(pattern);
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

  if (!imagePrompt && cleanText.toUpperCase().includes('IMAGE_PROMPT')) {
    const fallbackParts = cleanText.split(/IMAGE_PROMPT\s*:/i);
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
    imagePrompt: fullImagePrompt || cleanText.slice(0, 500),
    frText,
    titre,
    highlightPhrase,
    sousTitre,
    pollQuestion,
    nonLabel,
    ouiLabel,
    caption: caption || cleanText,
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
