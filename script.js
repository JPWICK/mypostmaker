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
    
    const targetUrl = `https://gnews.io/api/v4/top-headlines?q=${encodeURIComponent(q)}&lang=fr&max=9&apikey=${gk()}`;
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

// ── STEP 1: STYLE COMPOSITION RULES ─────────────────────────────
const styleInstructions = {
  poll: `
COMPOSITION — “POLL DEBATE” STYLE (your main viral style):
- Portrait 4:5 ratio
- TOP 55%: Main dramatic scene. Politician figure large on LEFT foreground (waist up), real crisis scene on RIGHT background
- BOTTOM 45%: Must fade to solid near-black — empty zone for text/poll graphics overlay
- Politician: shown from waist up, slightly left of center, intense or contemplative expression, looking slightly right
- Background RIGHT: the actual real-world scene from the news (protest, parliament, housing, border, street)
- Lighting: dramatic cinematic rim light on figure, moody overcast or golden hour background
- Color grade: dark, high contrast, slightly desaturated, French political tones (deep blue/red)`,
  
  shock: `
COMPOSITION — “SHOCK & IMPACT” STYLE:
- Full frame dramatic wide establishing shot
- BOTTOM 40% fades to solid dark for text overlay
- The SCENE is the subject — no single dominant person
- Could be: stormy sky over Paris, massive protest crowd, empty Palais Bourbon at night
- Color grade: dark, ominous, high contrast, cold tones`,
  
  split: `
COMPOSITION — “SPLIT COMPARISON” STYLE:
- Frame split diagonally as if physically torn
- LEFT HALF: warm golden tones — prosperity, traditional France, café, family, Eiffel Tower
- RIGHT HALF: cold gray/blue — poverty, urban tension, crowded HLM buildings, grey skies
- French tricolor flag tears dramatically through the diagonal split center
- BOTTOM 30%: solid dark gradient for text overlay`,
  
  portrait: `
COMPOSITION — “POLITICAL PORTRAIT” STYLE:
- Tight 3/4 angle portrait filling LEFT 60% of frame from chest up
- Subject looking slightly off-camera, intense expression
- RIGHT side: blurred parliament, protest, or relevant political background
- BOTTOM 40%: dark gradient fading to black for text overlay
- Dramatic side rim lighting, dark moody background`
};

// ── STEP 2: FETCH FULL ARTICLE TEXT ─────────────────────────────
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

      // Strip HTML tags and extract readable text
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

      // Return first 3000 chars — enough for Gemini context, not too long
      if (text.length > 200) {
        return text.slice(0, 3000);
      }
    } catch (e) {
      continue; // try next proxy
    }
  }
  return null; // both proxies failed — fall back to title+description only
}

// ── BRIDGE FUNCTION FOR BUTTON CLICK ──
async function generate(index) {
  // 1. Get the target article from your global array
  const article = articles[index];
  if (!article) {
    showErr('Article data missing.');
    return;
  }
  
  // 2. Set the global 'current' variable so regenerate() works later
  current = article;
  
  // 3. UI Feedback: Change button state to loading
  const btn = document.getElementById(`gb${index}`);
  let oldHtml = '';
  if (btn) {
    oldHtml = btn.innerHTML;
    btn.disabled = true;
    btn.classList.add('loading');
    // If your CSS doesn't automatically show mini-spin on .loading, force it:
    const label = btn.querySelector('.gb-label');
    if (label) label.textContent = 'Generating with Gemini...';
  }
  
  hideErr();
  
  try {
    // 4. Run the main Gemini logic using the globally active style variable
    lastResult = await callGemini(article, style);
    
    // 5. Send data to your modal updater
    fillModal(article, lastResult);
    
    // 6. Open your modal (assuming you have a openModal function in your UI)
    if (typeof openModal === 'function') {
      openModal();
    } else {
      // Fallback if your layout uses a class toggle on a modal container element
      const modal = document.getElementById('modal') || document.getElementById('resultModal');
      if (modal) modal.classList.add('open');
    }
    
    toast('Viral prompt ready!');
  } catch (e) {
    showErr('Generation Failed: ' + e.message);
    console.error("Gemini Generation Error:", e);
  } finally {
    // 7. Restore button state
    if (btn) {
      btn.disabled = false;
      btn.classList.remove('loading');
      btn.innerHTML = oldHtml;
    }
  }
}
// ── STEP 3: MAIN GEMINI CALL ─────────────────────────────────────
async function callGemini(article, st) {
  const imgStyle = styleInstructions[st] || styleInstructions.poll;

  let fullText = null;
  try {
    fullText = await fetchFullArticle(article.url);
  } catch(e) {
    fullText = null;
  }

  const articleContext = fullText
    ? ` ARTICLE TITLE: ${article.title} SOURCE: ${article.source?.name || 'French press'} PUBLISHED: ${article.publishedAt || 'Recent'} FULL ARTICLE TEXT (use this for all details — names, facts, numbers, quotes): """ ${fullText} """`.trim()
    : ` ARTICLE TITLE: ${article.title} SOURCE: ${article.source?.name || 'French press'} PUBLISHED: ${article.publishedAt || 'Recent'} DESCRIPTION: ${article.description || 'No description available'} NOTE: Only title and description available. Extract maximum detail from these.`.trim();

  const masterPrompt = `
You are the lead visual content strategist for a viral French political Facebook page with 500,000+ followers.
Your posts use dramatic AI-generated images with bold French text overlays and NON👍/OUI❤️ polls.
Every post must feel urgent, emotionally charged, and debate-worthy.

━━━ THE NEWS ARTICLE ━━━
${articleContext}

━━━ YOUR TASK ━━━
Read the article carefully and extract:
• POLITICIAN NAMES: Full names and roles of every political figure mentioned
• KEY FACTS: Specific numbers, dates, statistics, policy names, locations
• CORE CONFLICT: What is the central controversy or debate?
• EMOTIONAL ANGLE: What will make French citizens angry, worried, or passionate?
• VISUAL SCENE: What real place or situation best represents this news visually?

━━━ IMAGE COMPOSITION RULES ━━━
${imgStyle}

━━━ IMAGE PROMPT RULES (follow ALL of these) ━━━
1. REAL POLITICIAN RESEMBLANCE: If article names a specific politician, describe a figure that STRONGLY RESEMBLES them...
2. BACKGROUND SCENE: Show the EXACT real-world situation from the news...
3. FRENCH IDENTITY ELEMENTS: Always include at least ONE: French tricolor flag, Palais Bourbon exterior...
4. TEXT SPACE: State clearly: "the lower 45% of the image fades smoothly to solid near-black (#0a0a0a)..."
5. TECHNICAL TAG: End with exactly: shot on Canon EOS R5, 35mm lens, f/2.8...

━━━ OUTPUT FORMAT ━━━
Respond with ONLY these fields in order. No markdown. No extra text. No field explanations.

IMAGE_PROMPT:
[5-7 sentence English image prompt following ALL 5 rules above.]

TITRE:
[Main French provocative debate question or statement. ALL CAPS. Max 10 words.]

HIGHLIGHT_PHRASE:
[The 2-5 most shocking words from TITRE.]

SOUS_TITRE:
[One specific French fact or stat from the article. Max 10 words. If none write: NONE]

POLL_QUESTION:
[The binary debate question. French. ALL CAPS. Ends with " ?". Max 12 words.]

NON_LABEL:
[What voting NON👍 represents. 3-5 French words.]

OUI_LABEL:
[What voting OUI❤️ represents. 3-5 French words.]

FACEBOOK_CAPTION:
[Full French Facebook post structure]

IMAGE_NEGATIVE:
[5-8 comma-separated things to EXCLUDE]
`.trim();

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${gm()}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: masterPrompt }] }],
        generationConfig: {
          temperature: 0.82,
          maxOutputTokens: 1600,
          topK: 40,
          topP: 0.95
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



// ── TAB SWITCHER SYSTEM ──
// ── TAILORED SWITCH TAB MECHANISM ──
function switchTab(tabIndex) {
  // 1. Cycle through button tabs (.tab)
  const tabs = document.querySelectorAll('.tabs .tab');
  tabs.forEach((tab, idx) => {
    if (idx === tabIndex) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  // 2. Cycle through content panels (.tab-panel)
  const panels = document.querySelectorAll('.modal-body .tab-panel');
  panels.forEach((panel, idx) => {
    if (idx === tabIndex) {
      panel.classList.add('active');
    } else {
      panel.classList.remove('active');
    }
  });
}

// ── CUSTOM MODAL OVERLAY CONTROLS ──
function openModal() {
  const overlay = document.getElementById('modalOverlay');
  if (overlay) {
    overlay.classList.add('open');
    // Force active visual state if your CSS depends on display transitions
    overlay.style.display = 'flex'; 
  }
}

function closeModal() {
  const overlay = document.getElementById('modalOverlay');
  if (overlay) {
    overlay.classList.remove('open');
    overlay.style.display = 'none';
  }
}

// Handles clicking outside the white box to close the window smoothly
function bgClose(event) {
  if (event.target.id === 'modalOverlay') {
    closeModal();
  }
}

// ── STEP 4: ROBUST PARSER ────────────────────────────────────────
function parse(text) {
  function get(fieldName) {
    const pattern = new RegExp(
      '(?:^|\\n)\\*{0,2}' + fieldName + '\\*{0,2}\\s*:\\s*([\\s\\S]*?)(?=\\n\\*{0,2}[A-Z_]{3,}\\*{0,2}\\s*:|$)',
      'i'
    );
    const m = text.match(pattern);
    return m ? m[1].trim() : '';
  }

  const imagePrompt     = get('IMAGE_PROMPT');
  const titre           = get('TITRE');
  const highlightPhrase = get('HIGHLIGHT_PHRASE');
  const sousTitre       = get('SOUS_TITRE');
  const pollQuestion    = get('POLL_QUESTION');
  const nonLabel        = get('NON_LABEL');
  const ouiLabel        = get('OUI_LABEL');
  const caption         = get('FACEBOOK_CAPTION');
  const negative        = get('IMAGE_NEGATIVE');

  const fullImagePrompt = negative
    ? `${imagePrompt}\n\nNEGATIVE PROMPT: ${negative}`
    : imagePrompt;

  const frText = `
MAIN TITLE — bold white ALL CAPS large font:
${titre}

HIGHLIGHT WITH YELLOW/RED BRUSH STROKE:
"${highlightPhrase}"

SUBTITLE — smaller white text below title:
${(sousTitre && sousTitre !== 'NONE') ? sousTitre : '(no subtitle)'}

━━━ POLL SECTION — bottom of image ━━━
Poll question:
${pollQuestion}

LEFT SIDE — NON 👍 (blue):
${nonLabel || 'NON'}

RIGHT SIDE — OUI ❤️ (red):
${ouiLabel || 'OUI'}
`.trim();

  return {
    imagePrompt: fullImagePrompt,
    frText,
    titre,
    highlightPhrase,
    sousTitre,
    pollQuestion,
    nonLabel,
    ouiLabel,
    caption,
    negative
  };
}

// ── STEP 5: UPDATED fillModal() ──────────────────────────────────
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

function showErr(m) { document.getElementById('errorMsg').textContent = m; document.getElementById('errorBar').classList.add('show'); }
function hideErr() { document.getElementById('errorBar').classList.remove('show'); }
function toast(m) {
  const t = document.getElementById('toast');
  t.textContent = '✓ ' + m; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
