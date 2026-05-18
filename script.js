let cat = ‘politics’;
let style = ‘poll’;
let articles = [];
let current = null;
let lastResult = null;
let panelOpen = true;

// ── KEYS ──
function saveKeys() {
const gkInput = document.getElementById(‘gnewsKey’).value.trim();
const gmInput = document.getElementById(‘geminiKey’).value.trim();
if (!gkInput || !gmInput) { showErr(‘Please enter both API keys.’); return; }
sessionStorage.setItem(’_gn’, gkInput);
sessionStorage.setItem(’_gm’, gmInput);
document.getElementById(‘gnewsKey’).classList.add(‘ok’);
document.getElementById(‘geminiKey’).classList.add(‘ok’);
document.getElementById(‘cfgSub’).textContent = ‘✓ Keys active — cleared automatically when tab closes’;
togglePanel();
toast(‘Keys saved for this session!’);
}
const gk = () => sessionStorage.getItem(’_gn’) || ‘’;
const gm = () => sessionStorage.getItem(’_gm’) || ‘’;

function toggleVis(id) {
const e = document.getElementById(id);
e.type = e.type === ‘password’ ? ‘text’ : ‘password’;
}

function togglePanel() {
panelOpen = !panelOpen;
document.getElementById(‘panelBody’).classList.toggle(‘open’, panelOpen);
document.getElementById(‘chevron’).classList.toggle(‘open’, panelOpen);
}

window.addEventListener(‘load’, () => {
const k1 = gk(), k2 = gm();
if (k1) { document.getElementById(‘gnewsKey’).value = k1; document.getElementById(‘gnewsKey’).classList.add(‘ok’); }
if (k2) { document.getElementById(‘geminiKey’).value = k2; document.getElementById(‘geminiKey’).classList.add(‘ok’); }
if (k1 && k2) { document.getElementById(‘cfgSub’).textContent = ‘✓ Keys active — session only’; togglePanel(); }
});

function setCat(btn, c) {
document.querySelectorAll(’.cat-tab’).forEach(b => b.classList.remove(‘active’));
btn.classList.add(‘active’);
cat = c;
}

function setStyle(card, s) {
document.querySelectorAll(’.style-card’).forEach(c => c.classList.remove(‘active’));
card.classList.add(‘active’);
style = s;
}

// ── FETCH NEWS ──
async function fetchNews() {
if (!gk()) { showErr(‘Please enter your GNews API key first.’); if (!panelOpen) togglePanel(); return; }
const btn = document.getElementById(‘fetchBtn’);
btn.disabled = true; btn.classList.add(‘loading’);
hideErr();
try {
const qMap = {
politics: ‘politique’,
general: ‘actualité’,
business: ‘économie’,
entertainment: ‘culture’,
health: ‘santé’,
sports: ‘sport’
};
const q = qMap[cat] || ‘actualité’;
const targetUrl = `https://gnews.io/api/v4/top-headlines?q=${encodeURIComponent(q)}&lang=fr&max=9&apikey=${gk()}`;
const url = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

```
const res = await fetch(url);
if (!res.ok) {
  const e = await res.json().catch(() => ({}));
  throw new Error(e.errors?.[0] || `GNews API error ${res.status}`);
}
const data = await res.json();
if (!data.articles || data.articles.length === 0) {
  throw new Error('No articles found for this category.');
}
articles = data.articles;
renderNews(articles);
```

} catch (e) {
showErr(’News fetch failed: ’ + e.message);
console.error(‘fetchNews error:’, e);
} finally {
btn.disabled = false; btn.classList.remove(‘loading’);
}
}

function ago(d) {
const s = (Date.now() - new Date(d)) / 1000;
if (s < 60) return ‘Just now’;
if (s < 3600) return `${Math.floor(s/60)}m ago`;
if (s < 86400) return `${Math.floor(s/3600)}h ago`;
return `${Math.floor(s/86400)}d ago`;
}

function renderNews(arts) {
document.getElementById(‘newsLabel’).style.display = ‘flex’;
const c = document.getElementById(‘newsContainer’);
const g = document.createElement(‘div’);
g.className = ‘news-grid’;
arts.forEach((a, i) => {
const card = document.createElement(‘div’);
card.className = ‘news-card’;
card.innerHTML = `<div class="card-img"> ${a.image ?`<img src="${a.image}" alt="" onerror="this.parentElement.innerHTML='🗼'"><div class="card-img-fade"></div>` : '🗼'} </div> <div class="card-body"> <div class="card-meta"> <span class="card-source">${a.source?.name || 'French Press'}</span> <span class="card-dot"></span> <span class="card-time">${ago(a.publishedAt)}</span> <span class="card-cat-tag">${cat}</span> </div> <div class="card-title">${a.title}</div> <div class="card-desc">${a.description || ''}</div> <button class="gen-btn" id="gb${i}" onclick="generate(${i})"> ✨ <span class="gb-label">Generate Viral Prompt</span> <div class="mini-spin"></div> </button> </div>`;
g.appendChild(card);
});
c.innerHTML = ‘’;
c.appendChild(g);
}

// ── STYLE RULES ──
const styleInstructions = {
poll: `COMPOSITION “POLL DEBATE”:

- Portrait 4:5 ratio
- TOP 55%: Politician large on LEFT foreground (waist up), real crisis scene RIGHT background
- BOTTOM 45%: Smooth fade to solid near-black #0a0a0a — completely empty for text and poll overlay
- Lighting: dramatic cinematic rim light on figure, moody overcast or golden hour background
- Color grade: dark, high contrast, desaturated, deep blue/red French political tones`,
  
  shock: `COMPOSITION “SHOCK & IMPACT”:
- Full frame dramatic wide establishing shot
- BOTTOM 40% fades to solid dark for text overlay
- The SCENE is the subject — no single dominant person
- Dark, ominous, high contrast, cold tones`,
  
  split: `COMPOSITION “SPLIT COMPARISON”:
- Frame split diagonally as if physically torn
- LEFT: warm golden tones — prosperity, traditional France, café, Eiffel Tower
- RIGHT: cold gray/blue — poverty, HLM buildings, urban tension
- French tricolor tears through the diagonal center
- BOTTOM 30%: solid dark gradient for text overlay`,
  
  portrait: `COMPOSITION “POLITICAL PORTRAIT”:
- Tight 3/4 angle portrait, subject fills LEFT 60% from chest up
- Subject looking slightly off-camera with intense expression
- RIGHT side: blurred parliament, protest, or relevant background
- BOTTOM 40%: dark gradient to black for text overlay
- Dramatic side rim lighting`
  };

// ── POLITICIAN APPEARANCE DATABASE ──
const politicianDB = {
‘macron’:    ‘a slim man in his mid-40s, neatly combed brown hair, clean-shaven, sharp dark navy suit, confident upright posture, determined expression’,
‘le pen’:    ‘a woman in her mid-50s, straight blonde hair to shoulders, dark blazer, firm jaw, intense blue eyes, authoritative expression’,
‘mélenchon’: ‘a heavy-set man in his late 60s, grey-white hair, round face, rectangular glasses, dark coat, chin raised defiantly, passionate expression’,
‘melencon’:  ‘a heavy-set man in his late 60s, grey-white hair, round face, rectangular glasses, dark coat, defiant expression’,
‘bardella’:  ‘a young man in his late 20s, dark slicked hair, clean-cut sharp features, dark suit, intense focused gaze’,
‘wauquiez’:  ‘a man in his late 40s, brown hair, athletic build, serious stern expression, dark suit’,
‘barnier’:   ‘a tall distinguished man in his 70s, silver-grey hair, formal dark suit, measured calm expression’,
‘philippe’:  ‘a tall bald man in his early 50s, athletic build, dark suit, serious composed expression’,
‘zemmour’:   ‘a short thin man in his 60s, dark greying hair, glasses, combative intense expression, dark suit’,
‘attal’:     ‘a young man in his mid-30s, short brown hair, slim build, modern dark suit, energetic expression’,
‘ciotti’:    ‘a man in his late 50s, dark grey hair, stocky build, dark suit, serious frowning expression’,
‘faure’:     ‘a man in his early 50s, greying brown hair, slim build, suit, moderate serious expression’
};

function detectPolitician(text) {
const lower = (text || ‘’).toLowerCase();
for (const [name, desc] of Object.entries(politicianDB)) {
if (lower.includes(name)) {
const proper = name.split(’ ‘).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(’ ’);
return { name: proper, desc };
}
}
return null;
}

// ── SCENE DETECTOR ──
function detectScene(text) {
const lower = (text || ‘’).toLowerCase();
if (lower.match(/immigr|migrant|frontière|asile|clandestin|étranger/))
return ‘a dark French border crossing at night with gendarmerie vehicles, razor wire fencing, overcrowded waiting area under harsh floodlights, grim suburban banlieue apartment blocks looming in the misty background’;
if (lower.match(/logement|squat|loyer|hlm|immobilier|logement/))
return ‘a crumbling grey HLM social housing block in a Parisian suburb, peeling paint, graffiti-covered walls, broken windows, grey overcast sky, makeshift shelters visible at the base’;
if (lower.match(/budget|économi|dette|déficit|récession|chômage|emploi/))
return ‘a shuttered French factory with rusted gates, padlocked doors, empty car park, torn “En Vente” signs, grey industrial wasteland stretching into the distance with overcast Parisian sky’;
if (lower.match(/crime|insécuri|agress|violence|délinquance|terroris/))
return ‘a dark rain-slicked Paris street at night, French CRS riot police in full tactical gear forming a line, blue and red emergency lights reflecting on wet cobblestones, tense crowd in background’;
if (lower.match(/retraite|pension|séniore|vieillesse/))
return ‘a long queue of elderly French citizens outside a grey social services building in winter, worried expressions, some leaning on canes, Haussmann buildings lining the foggy street’;
if (lower.match(/islam|laïcité|religion|voile|mosquée|communautarisme/))
return ‘a public French square with a prominent Marianne statue, French tricolor flying, a divided crowd in the foggy distance, Haussmann architecture surrounding the scene’;
if (lower.match(/élection|vote|scrutin|sondage|campagne|référendum/))
return ‘French polling station exterior at dusk, campaign posters plastered across Haussmann building walls, a small anxious crowd gathering, French tricolor flags drooping in still air’;
if (lower.match(/grève|manifestat|syndicat|protest|mouvement social/))
return ‘a massive protest crowd stretching down a wide Paris boulevard, red smoke flares in the air, union banners waving, French flags prominent, cobblestones visible underfoot, dramatic overcast sky’;
if (lower.match(/santé|hôpital|médecin|urgence|soignant/))
return ‘an overcrowded French hospital emergency corridor at night, exhausted medical staff in blue scrubs with dark under-eye circles, patients on trolleys lining the hallway, harsh fluorescent lighting’;
if (lower.match(/éducation|école|université|enseignant|lycée/))
return ‘a striking French school exterior, locked gates, abandoned classrooms visible through windows, a lone teacher standing outside with a sign, grey Parisian sky overhead’;
// Default political scene
return ‘the imposing Palais Bourbon at night, its neoclassical columns lit by cold spotlights, an empty rain-soaked plaza in the foreground, storm clouds gathering dramatically overhead, French tricolor flying’;
}

// ── GENERATE FUNCTION (this was missing!) ──
async function generate(idx) {
if (!gm()) {
showErr(‘Please enter your Gemini API key first.’);
if (!panelOpen) togglePanel();
return;
}

current = articles[idx];
const btn = document.getElementById(`gb${idx}`);

// Update button state
if (btn) {
btn.disabled = true;
btn.classList.add(‘loading’);
const label = btn.querySelector(’.gb-label’);
if (label) label.textContent = ‘Generating…’;
}

hideErr();

try {
lastResult = await callGemini(current, style);
fillModal(current, lastResult);
openModal();
} catch (e) {
showErr(‘Generation failed: ’ + e.message);
console.error(‘generate() error:’, e);
} finally {
if (btn) {
btn.disabled = false;
btn.classList.remove(‘loading’);
const label = btn.querySelector(’.gb-label’);
if (label) label.textContent = ‘Generate Viral Prompt’;
}
}
}

// ── FETCH FULL ARTICLE ──
async function fetchFullArticle(url) {
if (!url) return null;
const proxies = [
`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
`https://corsproxy.io/?${encodeURIComponent(url)}`
];
for (const proxyUrl of proxies) {
try {
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 6000);
const res = await fetch(proxyUrl, { signal: controller.signal });
clearTimeout(timeout);
if (!res.ok) continue;
const data = await res.json();
const html = data.contents || data;
if (typeof html !== ‘string’) continue;
const text = html
.replace(/<script[\s\S]*?</script>/gi, ‘’)
.replace(/<style[\s\S]*?</style>/gi, ‘’)
.replace(/<nav[\s\S]*?</nav>/gi, ‘’)
.replace(/<header[\s\S]*?</header>/gi, ‘’)
.replace(/<footer[\s\S]*?</footer>/gi, ‘’)
.replace(/<[^>]+>/g, ’ ’)
.replace(/\s{3,}/g, ‘\n’)
.replace(/ /g, ’ ’)
.replace(/&/g, ‘&’)
.replace(/</g, ‘<’)
.replace(/>/g, ‘>’)
.replace(/"/g, ‘”’)
.trim();
if (text.length > 200) return text.slice(0, 3000);
} catch (e) {
continue;
}
}
return null;
}

// ── CALL GEMINI ──
async function callGemini(article, st) {
const imgStyle = styleInstructions[st] || styleInstructions.poll;

// Try to get full article text
let fullText = null;
try { fullText = await fetchFullArticle(article.url); } catch(e) {}

const articleText = `${article.title} ${article.description || ''} ${fullText || ''}`;
const politician = detectPolitician(articleText);
const scene = detectScene(articleText);

const politicianDesc = politician
? `A figure strongly resembling ${politician.name} — ${politician.desc}.`
: `A generic stern French male political figure, 60s, dark suit, intense worried expression.`;

const articleContext = fullText
? `TITLE: ${article.title}\nSOURCE: ${article.source?.name || 'French press'}\nFULL TEXT:\n${fullText}`
: `TITLE: ${article.title}\nSOURCE: ${article.source?.name || 'French press'}\nDESCRIPTION: ${article.description || 'N/A'}`;

const prompt = `You are a viral content strategist for a French political Facebook page with 500,000 followers. You create provocative debate posts with dramatic images and NON👍/OUI❤️ polls that drive massive engagement and comments.

NEWS ARTICLE:
${articleContext}

IMAGE COMPOSITION RULES:
${imgStyle}

POLITICIAN TO SHOW: ${politicianDesc}
BACKGROUND SCENE: ${scene}
CRITICAL RULE: The lower 45% of the image must fade smoothly to solid near-black #0a0a0a. This zone must be completely empty — no people, no scene detail — it is reserved for text and poll graphic overlays added by the designer. NO TEXT anywhere in the image itself.
END TAG: shot on Canon EOS R5, 35mm f/2.8, ISO 800, photojournalism style, dramatic rim lighting, ultra sharp, 8K resolution –ar 4:5 –style raw –q 2

YOUR OUTPUT — respond with ONLY these 8 fields. No markdown. No asterisks. No bullet points. No explanations. Just the field name followed by colon and the content:

IMAGE_PROMPT:
[6 sentences: S1=politician description and position in frame. S2=clothing and facial expression. S3=background scene from the news. S4=French identity element visible. S5=lighting mood and color grade. S6=dark empty bottom zone + end tag.]

TITRE:
[French ALL CAPS provocative debate question or statement. Max 10 words. References actual news. Emotionally charged.]

HIGHLIGHT_PHRASE:
[The 2-4 most shocking words from TITRE that will get a yellow brush stroke. Must be exact words that appear in TITRE.]

SOUS_TITRE:
[One specific French fact or number from this article. Max 10 words. If no fact available write the word: NONE]

POLL_QUESTION:
[French ALL CAPS question ending with “ ?” Max 12 words. Creates clear binary YES or NO debate about this news.]

NON_LABEL:
[What voting NON means in this poll. 2-4 French words. Specific to this news story.]

OUI_LABEL:
[What voting OUI means in this poll. 2-4 French words. Specific to this news story.]

FACEBOOK_CAPTION:
[French Facebook post. Line1: shocking hook with politician name and news event. Line2-3: specific facts from article. Line4: direct question to followers. Line5: “👉 Votez 👍 NON ou ❤️ OUI en commentaire !” Line6: #France #Politique #Débat #Actualité plus 2 topic hashtags.]`;

const res = await fetch(
`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${gm()}`,
{
method: ‘POST’,
headers: { ‘Content-Type’: ‘application/json’ },
body: JSON.stringify({
contents: [{ parts: [{ text: prompt }] }],
generationConfig: {
temperature: 0.85,
maxOutputTokens: 1500,
topK: 40,
topP: 0.95
}
})
}
);

if (!res.ok) {
const errData = await res.json().catch(() => ({}));
throw new Error(errData.error?.message || `Gemini API error ${res.status} — check your key`);
}

const data = await res.json();
const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
if (!rawText) throw new Error(‘Gemini returned empty response. Please try again.’);

console.log(‘Gemini raw output:\n’, rawText); // helpful for debugging
return parse(rawText);
}

// ── PARSER — handles all Gemini formatting variations ──
function parse(raw) {
// Line-by-line parser — most reliable approach
function getField(fieldName) {
const lines = raw.split(’\n’);
let capturing = false;
const collected = [];

```
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();

  // Check if this line starts our target field
  // Handles: "FIELD:", "**FIELD:**", "FIELD :", "field:" etc.
  const fieldPattern = new RegExp('^\\*{0,2}' + fieldName + '\\*{0,2}\\s*:', 'i');
  if (fieldPattern.test(trimmed)) {
    capturing = true;
    // Get content after the colon on the same line
    const afterColon = trimmed.replace(fieldPattern, '').trim();
    if (afterColon) collected.push(afterColon);
    continue;
  }

  if (capturing) {
    // Stop if we hit another field header (all-caps word followed by colon)
    const isNewField = /^\*{0,2}[A-Z][A-Z_]{2,}\*{0,2}\s*:/.test(trimmed);
    if (isNewField && trimmed.length > 0) break;

    // Add the line (remove stray asterisks Gemini sometimes adds)
    collected.push(line.replace(/^\*+|\*+$/g, ''));
  }
}

return collected.join('\n').trim();
```

}

const imagePrompt     = getField(‘IMAGE_PROMPT’);
const titre           = getField(‘TITRE’);
const highlightPhrase = getField(‘HIGHLIGHT_PHRASE’);
const sousTitre       = getField(‘SOUS_TITRE’);
const pollQuestion    = getField(‘POLL_QUESTION’);
const nonLabel        = getField(‘NON_LABEL’);
const ouiLabel        = getField(‘OUI_LABEL’);
const caption         = getField(‘FACEBOOK_CAPTION’);

// Build the French text overlay card
const frText = [
‘MAIN TITLE — bold white ALL CAPS:’,
titre || ‘(not generated)’,
‘’,
‘HIGHLIGHT WITH YELLOW BRUSH STROKE:’,
`"${highlightPhrase || '(not generated)'}"`,
‘’,
‘SUBTITLE — smaller white text:’,
(sousTitre && sousTitre !== ‘NONE’) ? sousTitre : ‘(no subtitle)’,
‘’,
‘━━ POLL AT BOTTOM ━━’,
`Poll question: ${pollQuestion || titre}`,
`LEFT  → NON 👍 (blue): ${nonLabel || 'NON'}`,
`RIGHT → OUI ❤️ (red):  ${ouiLabel || 'OUI'}`
].join(’\n’);

return {
imagePrompt,
frText,
titre,
highlightPhrase,
sousTitre,
pollQuestion,
nonLabel,
ouiLabel,
caption
};
}

// ── MODAL ──
function fillModal(article, r) {
// Article reference
document.getElementById(‘modalRef’).textContent = article.title;

// Tab 0 — image prompt
document.getElementById(‘pImage’).textContent = r.imagePrompt || ‘(image prompt not generated)’;

// Tab 1 — French text overlay
document.getElementById(‘pText’).textContent = r.frText;

// Tab 2 — Poll preview
let qHtml = r.pollQuestion || r.titre || ‘’;
if (r.highlightPhrase && qHtml) {
const escaped = r.highlightPhrase.replace(/[.*+?^${}()|[]\]/g, ‘\$&’);
qHtml = qHtml.replace(new RegExp(’(’ + escaped + ‘)’, ‘i’), ‘<span class="hl">$1</span>’);
}
document.getElementById(‘pollQ’).innerHTML = qHtml;

const nonEl = document.querySelector(’.poll-opt.non .poll-label’);
const ouiEl = document.querySelector(’.poll-opt.oui .poll-label’);
if (nonEl) nonEl.innerHTML = `NON<br><small style="font-size:9px;font-weight:400;opacity:0.75;display:block">${r.nonLabel || ''}</small>`;
if (ouiEl) ouiEl.innerHTML = `OUI<br><small style="font-size:9px;font-weight:400;opacity:0.75;display:block">${r.ouiLabel || ''}</small>`;

// Tab 3 — Facebook caption
document.getElementById(‘pCaption’).textContent = r.caption || ‘(caption not generated)’;

switchTab(0);
}

function openModal() {
document.getElementById(‘modalOverlay’).classList.add(‘open’);
document.body.style.overflow = ‘hidden’;
}

function closeModal() {
document.getElementById(‘modalOverlay’).classList.remove(‘open’);
document.body.style.overflow = ‘’;
}

function bgClose(e) {
if (e.target === document.getElementById(‘modalOverlay’)) closeModal();
}

function switchTab(n) {
document.querySelectorAll(’.tab’).forEach((t, i) => t.classList.toggle(‘active’, i === n));
document.querySelectorAll(’.tab-panel’).forEach((p, i) => p.classList.toggle(‘active’, i === n));
}

async function regenerate() {
if (!gm() || !current) return;
const btn = document.getElementById(‘regenBtn’);
btn.disabled = true;
btn.textContent = ‘⏳ Regenerating…’;
try {
lastResult = await callGemini(current, style);
fillModal(current, lastResult);
toast(‘Regenerated!’);
} catch (e) {
showErr(’Regenerate failed: ’ + e.message);
} finally {
btn.disabled = false;
btn.textContent = ‘🔄 Regenerate — Different Angle’;
}
}

// ── COPY ──
function cp(id) {
const el = document.getElementById(id);
const text = el.innerText || el.textContent;
navigator.clipboard.writeText(text)
.then(() => toast(‘Copied!’))
.catch(() => {
const t = document.createElement(‘textarea’);
t.value = text; document.body.appendChild(t);
t.select(); document.execCommand(‘copy’);
document.body.removeChild(t); toast(‘Copied!’);
});
}

function copyAll() {
if (!lastResult) return;
const all = [
‘=== IMAGE PROMPT ===’, lastResult.imagePrompt,
‘’, ‘=== FRENCH TEXT OVERLAY ===’, lastResult.frText,
‘’, ‘=== POLL QUESTION ===’, lastResult.pollQuestion || ‘’,
‘’, ‘=== NON LABEL ===’, lastResult.nonLabel || ‘NON’,
‘’, ‘=== OUI LABEL ===’, lastResult.ouiLabel || ‘OUI’,
‘’, ‘=== FACEBOOK CAPTION ===’, lastResult.caption
].join(’\n’);
navigator.clipboard.writeText(all)
.then(() => toast(‘Everything copied!’))
.catch(() => {});
}

function showErr(m) {
document.getElementById(‘errorMsg’).textContent = m;
document.getElementById(‘errorBar’).classList.add(‘show’);
}
function hideErr() {
document.getElementById(‘errorBar’).classList.remove(‘show’);
}
function toast(m) {
const t = document.getElementById(‘toast’);
t.textContent = ’✓ ’ + m;
t.classList.add(‘show’);
setTimeout(() => t.classList.remove(‘show’), 2500);
}

document.addEventListener(‘keydown’, e => { if (e.key === ‘Escape’) closeModal(); });