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
    
    // const targetUrl = `https://gnews.io/api/v4/top-headlines?q=${encodeURIComponent(q)}&lang=fr&max=9&apikey=${gk()}`;
    const targetUrl = `https://gnews.io/api/v4/top-headlines?q=${encodeURIComponent(q)}&lang=fr&country=fr&max=9&apikey=${gk()}`;
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
  // 1. Resolve the selected style instructions from your configuration object
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

  // 2. Build the updated, adaptive master prompt
  const masterPrompt = `
You are the lead visual content strategist for a viral French political Facebook page with 500,000+ followers.
Your graphics use dramatic, gritty AI-generated images with bold French text overlays.
Every output must feel incredibly urgent, emotionally volatile, and highly debate-worthy.

━━━ THE INPUT NEWS DATA ━━━
${articleContext}

━━━ MANDATORY LAYOUT STYLE SELECTION (CRITICAL) ━━━
You must design this specific social media asset using the following exact layout blueprint rules:
${imgStyle}

━━━ YOUR EXTRACTION TASK ━━━
Carefully read the headline and description above to isolate:
- MAIN FRENCH POLITICIAN: The specific public figure named (e.g., Emmanuel Grégoire, Emmanuel Macron, Jean-Luc Mélenchon).
- REAL CONFLICT DETAILS: Identify the specific metric or system failure (e.g., 78 animateurs suspendus, 23,000 dossiers, 31 suspicions de violences sexuelles, grève des syndicats).
- LOCAL BACKDROP: The concrete geographic location or infrastructure in France linked to the crisis.

━━━ STAGE-DIRECTION & IMAGE PROMPT GENERATION RULES ━━━
You must write a highly detailed image generation prompt following these precise constraints:

1. REAL POLITICIAN LIKENESS & POSTURE (INTELLIGENT FALLBACK):
   Look at the input news data. You must explicitly name a real public figure and physically map their exact likeness for the image generator according to these conditions:
   - If "Emmanuel Grégoire" is in the text: Describe him as "A distinguished French politician, slim build, early 50s, short thinning receding grey-brown hair, wearing subtle glasses, sharp analytical eyes, looking intensely slightly off-camera to the right with a contemplative hand-on-chin posture, wearing an official French tricolor mayoral/deputy sash (blue, white, red) over a dark tailored suit jacket."
   - If "Emmanuel Macron" is in the text: Describe him as "The real-world French President Emmanuel Macron. A slim man in his late 40s, short brown hair neatly combed back, clean-shaven, sharp facial features, wearing a dark navy bespoke tailored suit with a white shirt and slim tie, looking intensely forward with a furrowed brow."
   - If "Jean-Luc Mélenchon" is in the text: Describe him as "An older heavy-set French man, late 60s, thick grey-white hair, glasses, wearing a dark coat, hand on chin in deep contemplation."
   - If NO specific French politician is named in the news text, dynamically evaluate the theme and force one of these two real public figures:
     • For International Affairs, Global Reports, Diplomacy, or Macro-Economics: Force the image to depict Emmanuel Macron. Describe him as: "The real-world French President Emmanuel Macron. A slim man in his late 40s, short brown hair neatly combed back, clean-shaven, sharp facial features, wearing a dark navy bespoke tailored suit with a white shirt and slim tie, looking intensely forward with a furrowed brow, a look of deep concern."
     • For Security, Justice, Immigration, Domestic Scandals, or Social Crises: Force the image to depict Gabriel Attal. Describe him as: "The real-world French politician Gabriel Attal. A slim 37-year-old man, sharp youthful facial features, short styled dark brown hair, completely clean-shaven, intense deep-set eyes, wearing a crisp modern dark navy tailored suit with a white shirt, standing in a posture of deep concern and contemplation."

2. DETAILED REALISTIC BACKGROUND ENVIRONMENT: Never use abstract rooms or simple walls. Describe a specific, gritty real-world environment tied directly to the structural issue in the news:
   - Schools / Extra-curricular / Public Services: "In the background, a dimly lit Paris public municipal school corridor, institutional walls with weathered plaster and slightly peeled beige paint, bulletin boards with overlapping messy flyers, a localized French text sign reading 'ÉCOLE MUNICIPALE', cluttered child lockers, cold industrial lighting."
   - Strikes / Demonstrations / Manifestations: "In the background, crowded urban French streets, protest banners with bold hand-painted lettering, smoke flares filtering hazy sunlight, police barriers, angry trade union workers wearing high-visibility vests."
   - Urban Crisis / Crime / Housing: "In the background, a crowded French HLM public housing project with rundown concrete facades, laundry hanging from balconies, broken cobblestone pavement, and grey overcast skies conveying a sense of structural neglect."

3. EXPLICIT FRENCH EMBLEMS: Explicitly instruct the generator to include a crisp French national flag (tricolor drape) somewhere clear in the background architectural scenery.

4. ADAPTIVE TEXT OVERLAY PROTECTION ZONE (READ CAREFULLY):
   - If the active style block above requires a "Poll", append this exact literal string: "the lower 45% of the frame smoothly fades to a completely solid, uniform near-black (#0a0a0a) gradient field that is entirely clear of details, objects, or scenery, reserved exclusively for graphic text banners and poll overlay templates."
   - If the active style block does NOT require a poll (e.g., Shock & Impact, Split Comparison, Portrait), append this exact literal string instead: "the lower 30% of the frame smoothly transitions to a clean, solid dark near-black (#0a0a0a) gradient field completely free of background details to act as a clear canvas for a standalone headline overlay text."

5. CAMERA TECH SPECS: Conclude the prompt string exactly with: "photojournalism style, cinematic side rim lighting, sharp focus on subject foreground, volumetric air particles, high-contrast desaturated color grading, shot on Canon EOS R5, 35mm lens, f/2.8, 8k resolution, hyper-realistic --ar 4:5 --style raw".

━━━ STRUCTURED OUTPUT FORMAT ━━━
Respond with ONLY these fields in order. Do not include any markdown headings like '###' or '**'. No explanatory talk.
CRITICAL FORMATTING INSTRUCTION: If the active style instructions state "No poll" or "DO NOT generate poll questions", you MUST still output the POLL_QUESTION, NON_LABEL, and OUI_LABEL lines, but fill them exactly with the word: NONE.

IMAGE_PROMPT:
[Provide a dense 5-7 sentence English generation prompt blending the specific named or forced real politician's physical likeness, posture, the gritty contextual background scene, the adaptive text protection zone sentence, and camera parameters.]

TITRE:
[Main provocative French debate or shocking headline statement. ALL CAPS. Max 10 words.]

HIGHLIGHT_PHRASE:
[The 2-4 most shocking words directly extracted from your TITRE field.]

SOUS_TITRE:
[One specific metric, department, or statistic line in French. Max 10 words. If none, write: NONE]

POLL_QUESTION:
[The binary poll debate question in French. ALL CAPS. Ends with ' ?'. Max 12 words. If the selected layout style has no poll, write: NONE]

NON_LABEL:
[What voting NON👍 stands for. 3-5 French words. If the selected layout style has no poll, write: NONE]

OUI_LABEL:
[What voting OUI❤️ stands for. 3-5 French words. If the selected layout style has no poll, write: NONE]

FACEBOOK_CAPTION:
[The complete French social media caption post structure, beginning with an urgent headline hook referencing the politician by name, 2 sentences of specific event details from the title, a provocative question, and the standard '👉 Donnez votre avis...' call-to-action with topic hashtags.]

IMAGE_NEGATIVE:
[Exclusion parameters separated by commas: english text on walls, cartoon style, duplicate heads, happy smiling faces, bright cheer colors.]
`.trim();

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${gm()}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: masterPrompt }] }],
        generationConfig: { 
          temperature: 0.70, // Slightly dialed down to maximize alignment with layout rules
          maxOutputTokens: 4500, 
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
// ── BULLETPROOF RECOVERY PARSER ──
function parse(text) {
  console.log("RAW GEMINI OUTPUT FOR DEBUGGING:\n", text); // Helpful for checking F12 console

  // Helper function that extracts text between key markers even if they contain markdown symbols
  function getField(fieldName) {
    // This regex dynamically strips away common AI artifacts like **, ###, or trailing spaces
    const pattern = new RegExp(
      '(?:^|\\n)[#\\s\\*]*' + fieldName + '[#\\s\\*]*[:\\-]?\\s*([\\s\\S]*?)(?=\\n[#\\s\\*]*[A-Z_]{4,}[#\\s\\*]*[:\\-]?|$)',
      'i'
    );
    const match = text.match(pattern);
    return match ? match[1].trim() : '';
  }

  // Extract each field safely
  let imagePrompt     = getField('IMAGE_PROMPT');
  const titre           = getField('TITRE');
  const highlightPhrase = getField('HIGHLIGHT_PHRASE');
  const sousTitre       = getField('SOUS_TITRE');
  const pollQuestion    = getField('POLL_QUESTION');
  const nonLabel        = getField('NON_LABEL');
  const ouiLabel        = getField('OUI_LABEL');
  const caption         = getField('FACEBOOK_CAPTION');
  const negative        = getField('IMAGE_NEGATIVE');

  // Fallback safety net: If the strict parser failed completely due to erratic AI formatting,
  // we do a brute-force split to at least show the prompt text so your site never stays blank.
  if (!imagePrompt && text.toUpperCase().includes('IMAGE_PROMPT')) {
    const fallbackParts = text.split(/IMAGE_PROMPT\s*:/i);
    if (fallbackParts[1]) {
      imagePrompt = fallbackParts[1].split(/\n[A-Z_]+:/i)[0].replace(/[\*#]/g, '').trim();
    }
  }

  // Combine image prompt with negative parameters cleanly
  const fullImagePrompt = negative && !imagePrompt.toUpperCase().includes('NEGATIVE') 
    ? `${imagePrompt}\n\n[NEGATIVE PROMPT]: ${negative}` 
    : imagePrompt;

  // Reconstruct your beautiful template for the French Text tab view
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
    imagePrompt: fullImagePrompt || text.slice(0, 500), // Ultimate absolute fallback
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
