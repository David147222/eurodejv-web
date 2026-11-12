// Sestaví statický web EuroDejv do složky dist/ – bez závislostí, stačí Node 18+ (s ImageMagickem navíc zmenší fotky).
// Obsah: content/stranky/*.json (stránky), content/ceniky.json (ceníky), content/reference.json (reference),
// content/pujcovna.json (katalog půjčovny), content/eu.json (projekty EU), content/fotky.json (fotky v textech a jejich popisky), content/nastaveni.json (kontakty, firmy),
// src/struktura.json (menu a patička), src/seo.json (údaje pro vyhledávače, které v nastavení nejsou).
//
// Zkušební sestavení pro GitHub Pages: ZKUSEBNI=1 BASE=/eurodejv-web node build.js
// (web se schová před vyhledávači, všechny odkazy dostanou předponu /eurodejv-web a formulář neodesílá).
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const read = p => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const BASE = (process.env.BASE || '').replace(/\/+$/, '');
const ZKUSEBNI = !!process.env.ZKUSEBNI;

const S = read('content/nastaveni.json');
const STR = read('src/struktura.json');
const SEO = read('src/seo.json');
const CENIKY = read('content/ceniky.json').ceniky;
const REF = read('content/reference.json').reference;
const EU = read('content/eu.json').projekty;
const PUJ = read('content/pujcovna.json').kategorie;
const FOTKY = read('content/fotky.json').fotky;
const FOTO = Object.fromEntries(FOTKY.map(f => [f.klic, f]));
const VERZE = Date.now().toString(36);
const ROK = new Date().getFullYear();

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const text = h => String(h).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const url = id => (id === 'uvod' ? '/' : `/${id}/`);
const slug = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const TEL = 'tel:' + S.telefon.replace(/\s/g, '');
const telText = S.telefon.replace(/^\+420\s*/, '');
const nbsp = s => String(s).replace(/(\d) (\d)/g, '$1&nbsp;$2');

// --- vložené bloky v textech stránek ---------------------------------------------------------
// {{tel}} = odkaz pro vytočení, {{telefon}} = číslo, {{email}} = e-mail, {{foto:kod}} = fotka z content/fotky.json,
// {{cenik:klic}} = ceník z content/ceniky.json, {{reference}} / {{reference-vyber}} = reference,
// {{oblast}} = obce, kde působíme, {{dotazy}} = časté dotazy stránky (pole „dotazy“), {{pujcovna}} = celý katalog půjčovny, {{pujcovna:klic}} = jedna jeho kategorie, {{eu}} = projekty EU, {{firmy}} = obchodní údaje, {{certifikaty}} = loga certifikátů, {{formular}} / {{formular:Téma}} = poptávka

function cenik(klic) {
  const c = CENIKY.find(c => c.klic === klic);
  if (!c) throw new Error('Chybí ceník: ' + klic);
  const radky = c.polozky.map(p => `<tr><td><b>${esc(p.nazev)}</b>${p.popis ? `<small>${esc(p.popis)}</small>` : ''}</td><td class="c">${nbsp(esc(p.cena))}</td></tr>`).join('');
  return `<div class="cenik"><table><caption>${esc(c.nazev)}</caption><tbody>${radky}</tbody></table>${c.poznamka ? `<p class="pozn">${esc(c.poznamka)}</p>` : ''}</div>`;
}

// Katalog půjčovny: karta věci s cenou a tlačítkem „Přidat do poptávky“ (výběr si pamatuje site.js a vloží ho do formuláře)
function polozka(p) {
  const par = (p.parametry || []).filter(Boolean);
  const cena = p.cena ? `<span class="cena">${nbsp(esc(p.cena))}</span>` : (p.odkaz ? `<a class="cena-odkaz" href="${esc(p.odkaz)}">${esc(p.odkaz_text || 'Ceník')} →</a>` : '');
  return `<article class="item${p.foto ? ' s-foto' : ''}">`
    + (p.foto ? `<a class="item-im" href="${esc(p.foto)}" data-lb><img src="${esc(p.foto)}" alt="${esc(p.nazev)}"></a>` : '')
    + `<div class="item-tx"><h3>${esc(p.nazev)}</h3>${p.popis ? `<p>${esc(p.popis)}</p>` : ''}`
    + (par.length ? `<ul class="par">${par.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '')
    + (p.dokument ? `<a class="pdf" href="${esc(p.dokument)}">Návod (PDF)</a>` : '')
    + `<div class="item-ft">${cena}<button type="button" class="add" data-item="${esc(p.nazev)}" aria-pressed="false">Přidat do poptávky</button></div></div></article>`;
}

function pujcovnaKat(klic, nadpis = false) {
  const k = PUJ.find(k => k.klic === klic);
  if (!k) throw new Error('Chybí kategorie půjčovny: ' + klic);
  const head = nadpis ? `<div class="kat-head"><h2>${esc(k.nazev)}</h2>${k.popis ? `<p>${esc(k.popis)}</p>` : ''}${k.odkaz ? `<a class="kat-odkaz" href="${esc(k.odkaz)}">${esc(k.odkaz_text || 'Více')} →</a>` : ''}</div>` : '';
  // Samostatně vložená kategorie (úvod, lešení, drcení) nese vlastní poznámku o DPH; celý katalog ji má jednou na konci
  const dph = nadpis ? '' : '<p class="small dph">Ceny jsou bez DPH.</p>';
  return `${head}<div class="items${klic === 'stroje' ? ' velke' : ''}">${k.polozky.map(polozka).join('')}</div>${dph}`;
}

function pujcovna() {
  const chips = `<nav class="chips" aria-label="Kategorie půjčovny">${PUJ.map(k => `<a href="#${esc(k.klic)}">${esc(k.nazev)}</a>`).join('')}</nav>`;
  return chips + PUJ.map(k => `<div class="kat" id="${esc(k.klic)}">${pujcovnaKat(k.klic, true)}</div>`).join('');
}

const fotkaOdkaz = (f, cls = '') => `<a class="g${cls}" href="${esc(f.foto)}" data-lb><img src="${esc(f.foto)}" alt="${esc(f.alt || '')}"></a>`;

function reference() {
  return REF.map(r => {
    const meta = [r.misto, r.rok].filter(Boolean).map(esc).join(' · ');
    return `<article class="ref" id="${slug(r.nazev)}"><div class="head"><h2>${esc(r.nazev)}</h2>${meta ? `<p class="meta">${meta}</p>` : ''}${r.popis ? `<p>${esc(r.popis)}</p>` : ''}</div>`
      + `<div class="gal">${(r.fotky || []).map(f => fotkaOdkaz(f)).join('')}</div></article>`;
  }).join('');
}

function referenceVyber() {
  return `<div class="tiles">${REF.filter(r => (r.fotky || []).length).map(r => {
    const f = r.fotky[0];
    return `<a class="tile" href="/reference/#${slug(r.nazev)}"><span class="im" style="background-image:url('${esc(f.foto)}')" role="img" aria-label="${esc(f.alt || '')}"></span><span class="tx"><b>${esc(r.nazev)}</b>${r.popis ? `<span>${esc(r.popis)}</span>` : ''}</span></a>`;
  }).join('')}</div>`;
}

function eu() {
  return `<div class="eu">${EU.map(p => `<article class="eu-p"><a href="${esc(p.obrazek)}" data-lb class="eu-im"><img src="${esc(p.obrazek)}" alt="${esc(p.nazev)}"></a><div><h3>${esc(p.nazev)}</h3><p>${esc(p.popis)}</p></div></article>`).join('')}</div>`;
}

function firmy() {
  return `<div class="firmy">${S.firmy.map(f => `<div class="firma"><h3>${esc(f.nazev)}</h3><p>${esc(f.sidlo)}<br>IČO: ${esc(f.ico)} · DIČ: ${esc(f.dic)}<br>Spisová značka: ${esc(f.spisova_znacka)}<br>Datová schránka: ${esc(f.datova_schranka)}${f.jednatele ? `<br>Jednatelé: ${esc(f.jednatele)}` : ''}</p></div>`).join('')}</div>`;
}

function certifikaty() {
  return `<ul class="certs">${S.certifikaty.map(c => `<li><img src="${esc(c.logo)}" alt="${esc(c.nazev)}" width="240" height="160"></li>`).join('')}</ul>`;
}

function formular(tema = '') {
  return `<form class="form" id="poptavka" method="post" action="/poptavka.php"${ZKUSEBNI ? ' data-test' : ''}>
<input type="hidden" name="tema" value="${esc(tema)}"><input type="hidden" name="zpet" value="">
<div class="two"><label>Jméno a příjmení<input name="jmeno" autocomplete="name" required maxlength="120"></label>
<label>Telefon<input name="telefon" type="tel" autocomplete="tel" maxlength="40"></label></div>
<div class="two"><label>E-mail<input name="email" type="email" autocomplete="email" maxlength="160"></label>
<label>Obec<input name="misto" maxlength="160" placeholder="kde se bude pracovat"></label></div>
<div class="vyber" hidden><b>Vybráno z půjčovny</b><ul></ul></div><input type="hidden" name="polozky" value="">
<label>Co potřebujete<textarea name="zprava" rows="4" required maxlength="5000"></textarea></label>
<label><span>Termín <span class="opt">(nepovinné)</span></span><input name="termin" maxlength="120" placeholder="např. 14.–16. 11. nebo co nejdřív"></label>
<label class="hp" aria-hidden="true">Tohle pole nevyplňujte<input name="web" tabindex="-1" autocomplete="off"></label>
<p class="small">Vyplňte prosím telefon nebo e-mail, ať se vám můžeme ozvat. Vaše osobní údaje použijeme pouze pro vyřízení vašeho dotazu (<a href="/cookies/">více</a>).</p>
<p class="msg" role="status" hidden></p>
<button class="btn" type="submit">Odeslat poptávku</button>
</form>`;
}

// {{oblast}} = obce, kde působíme (src/seo.json → oblast; totéž dostane Google jako areaServed)
function oblast() {
  return `<ul class="oblast">${SEO.oblast.map(n => `<li>${esc(n)}</li>`).join('')}</ul>`;
}

// {{dotazy}} = časté dotazy stránky z pole „dotazy“ (otázka + odpověď, odpověď smí obsahovat odkaz).
// Google je dostane i jako strukturovaná data FAQPage (viz strukturovana()).
const platneDotazy = p => (p.dotazy || []).filter(x => x && String(x.otazka || '').trim() && String(x.odpoved || '').trim());
function dotazy(p) {
  const d = platneDotazy(p);
  if (!d.length) return '';
  return `<section class="tight" id="dotazy"><div class="in"><div class="head"><span class="ey">Časté dotazy</span><h2>Na co se nás často ptáte</h2></div>`
    + `<div class="dotazy">${d.map(x => `<details><summary>${esc(x.otazka)}</summary><div class="odp"><p>${x.odpoved}</p></div></details>`).join('')}</div></div></section>`;
}

function vlozky(html) {
  return html
    .replace(/\{\{oblast\}\}/g, oblast)
    .replace(/\{\{tel\}\}/g, TEL)
    .replace(/\{\{telefon\}\}/g, S.telefon)
    .replace(/\{\{email\}\}/g, esc(S.email))
    .replace(/\{\{cenik:([a-z0-9-]+)\}\}/g, (m, k) => cenik(k))
    .replace(/\{\{reference\}\}/g, reference)
    .replace(/\{\{reference-vyber\}\}/g, referenceVyber)
    .replace(/\{\{pujcovna:([a-z0-9-]+)\}\}/g, (m, k) => pujcovnaKat(k))
    .replace(/\{\{pujcovna\}\}/g, pujcovna)
    .replace(/\{\{eu\}\}/g, eu)
    .replace(/\{\{firmy\}\}/g, firmy)
    .replace(/\{\{certifikaty\}\}/g, certifikaty)
    .replace(/\{\{formular(?::([^}]*))?\}\}/g, (m, t) => formular(t || ''));
}

// Popisek fotky (alt) z content/fotky.json se doplní do prázdného alt="" u <img src="{{foto:kod}}">
function fotky(html) {
  html = html.replace(/<img\b[^>]*>/g, tag => {
    const k = (tag.match(/\bsrc="\{\{foto:([a-z0-9_-]+)\}\}"/) || [])[1];
    const a = k && FOTO[k] && FOTO[k].alt;
    return a ? tag.replace(/\balt=""/, `alt="${esc(a)}"`) : tag;
  });
  return html.replace(/\{\{foto:([a-z0-9_-]+)\}\}/g, (m, k) => {
    if (!FOTO[k]) throw new Error('Chybí fotka: ' + k);
    return FOTO[k].foto;
  });
}

// Rychlejší načítání fotek (texty stránek se nemění, upraví se jen výsledné HTML):
// - <img> a dlaždice dostanou menší verzi fotky z dist/foto/m/ (vyrobí se na konci sestavení), odkaz na zvětšení vede na velkou,
// - <img> se načte až při posunu stránky k fotce (loading="lazy"),
// - fotky na pozadí kromě velké nahoře (class="hero") načte site.js až při posunu stránky (atribut data-bg),
// - velkou fotku nahoře prohlížeč stáhne přednostně (preload v hlavičce).
const STREDNI = new Set();
const mensi = u => '/foto/m/' + u.slice(6).replace(/\//g, '-');
const stredni = u => (/^\/foto\/(?:eu\/)?[^/]+\.(jpe?g|png|webp)$/i.test(u) ? (STREDNI.add(u), mensi(u)) : u);

function obrazky(html) {
  const bg = new Set();
  let hero = null;
  html = html.replace(/<img\b[^>]*>/g, tag => {
    tag = tag.replace(/\bsrc="([^"]+)"/, (m, u) => `src="${stredni(u)}"`);
    return /\bloading=/.test(tag) ? tag : tag.replace(/^<img/, '<img loading="lazy" decoding="async"');
  });
  html = html.replace(/<(\w+)\b([^>]*?)\sstyle="([^"]*)"([^>]*)>/g, (tag, el, a1, st, a2) => {
    const m = st.match(/background-image:\s*url\(['"]?([^'")]+)['"]?\);?/);
    if (!m) return tag;
    const cls = ((a1 + a2).match(/\bclass="([^"]*)"/) || [, ''])[1].split(/\s+/);
    if (cls.includes('hero') || cls.includes('duo-p')) { hero = hero || m[1]; return tag; }
    const u = stredni(m[1]);
    bg.add(u);
    const zbytek = st.replace(m[0], '').trim();
    return `<${el}${a1}${zbytek ? ` style="${zbytek}"` : ''} data-bg="${u}"${a2}>`;
  });
  return { html, hero, bg: [...bg] };
}

// Menu: web má dvě půlky (Stavíme a Půjčovna, src/struktura.json → sekce); v menu se zvýrazní půlka, do které stránka patří
const SEKCE = STR.sekce || {};
const sekceStranky = id => Object.keys(SEKCE).find(k => SEKCE[k].some(([i]) => i === id));
function nav(cur) {
  const top = sekceStranky(cur) || cur;
  return '<ul>' + STR.menu.slice(1).map(m => `<li><a href="${url(m[0])}"${m[0] === top ? ` class="on"${m[0] === cur ? ' aria-current="page"' : ''}` : ''}>${m[1]}</a></li>`).join('') + '</ul>';
}
// Podmenu pod hlavičkou na stránkách jedné půlky webu
// Ikony pro přepínač pod hlavičkou (podle adresy stránky; stránka bez ikony ji prostě nemá)
const IKONY = {
  'stavebni-prace': 'M3 11 12 4l9 7M5 9.5V20h5v-6h4v6h5V9.5',
  'zatepleni-fasad': 'M3 4h18v16H3zM3 9.3h18M3 14.7h18M9 4v5.3M15 4v5.3M6 9.3v5.4M12 9.3v5.4M18 9.3v5.4M9 14.7V20M15 14.7V20',
  'zemni-prace': 'M2 20h20M4 20c1-4 3-6 6-6s5 2 6 6M14 4l6 6M17 7l-5 5',
  'drceni-a-material': 'M2 20h20M3 20l4-6 3 2 3-5 3 4 2-1 3 6M8 8h.01M12 5h.01M15 8h.01',
  'pujcovna': 'M2 19a2 2 0 0 1 2-2h8a2 2 0 0 1 0 4H4a2 2 0 0 1-2-2zM4 17v-5h4l2 2v3M10 14l4-8 5 3-1 3M18 12l2 3h-4z',
  'leseni': 'M5 3v18M19 3v18M5 8h14M5 14h14M5 20h14M5 8l14 6M5 14l14 6',
};
const ikona = id => IKONY[id] ? `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${IKONY[id]}"/></svg>` : '';

function podmenu(cur) {
  const s = sekceStranky(cur);
  if (!s) return '';
  const pol = SEKCE[s].map(([i, n, p]) => `<li><a href="${url(i)}"${i === cur ? ' class="on" aria-current="page"' : ''}>${ikona(i)}<span><b>${n}</b>${p ? `<small>${esc(p)}</small>` : ''}</span></a></li>`).join('');
  return `<nav class="sub" aria-label="${esc(jmenoVMenu(s))}"><div class="in"><span class="sub-t">${esc(jmenoVMenu(s))}</span><ul class="n${SEKCE[s].length}">${pol}</ul></div></nav>`;
}

function jmenoVMenu(id) {
  const m = STR.menu.find(m => m[0] === id) || STR.paticka.find(m => m[0] === id);
  return m ? m[1] : null;
}
const jmenoStranky = id => { for (const k in SEKCE) { const m = SEKCE[k].find(([i]) => i === id); if (m) return m[1]; } return jmenoVMenu(id); };

// Strukturovaná data pro vyhledávače (schema.org): na úvodu vizitka stavební firmy, jinde drobečková navigace
function strukturovana(id, p) {
  const D = S.domena;
  const g = [];
  if (id === 'uvod') {
    const adr = S.adresa.split(/<br\s*\/?>/i).map(text).filter(Boolean);
    const psc = (adr[1] || '').match(/^(\d{3}\s?\d{2})\s+(.+)$/);
    const gps = String(S.gps).match(/(-?[\d.]+)\s*([NS])?\s*[,;\s]\s*(-?[\d.]+)\s*([EW])?/i);
    const hlavni = S.firmy[0] || {};
    g.push({ '@type': 'WebSite', '@id': D + '/#web', url: D + '/', name: S.nazev, inLanguage: 'cs', publisher: { '@id': D + '/#firma' } });
    g.push({
      '@type': 'GeneralContractor',
      '@id': D + '/#firma',
      name: S.nazev,
      legalName: hlavni.nazev || undefined,
      url: D + '/',
      description: p.popis || undefined,
      logo: D + '/logo.png',
      image: SEO.fotky.filter(k => FOTO[k]).map(k => D + FOTO[k].foto),
      telephone: S.telefon,
      email: S.email,
      address: { '@type': 'PostalAddress', streetAddress: adr[0], postalCode: psc ? psc[1] : undefined, addressLocality: psc ? psc[2] : adr[1], addressCountry: 'CZ' },
      geo: gps ? { '@type': 'GeoCoordinates', latitude: +gps[1] * (/s/i.test(gps[2] || '') ? -1 : 1), longitude: +gps[3] * (/w/i.test(gps[4] || '') ? -1 : 1) } : undefined,
      areaServed: SEO.oblast.map(n => ({ '@type': 'City', name: n })),
      knowsAbout: SEO.sluzby
    });
  } else {
    const kroky = [['Úvod', D + '/']];
    const par = sekceStranky(id);
    if (par && par !== id) kroky.push([jmenoVMenu(par), D + url(par)]);
    kroky.push([(par === id ? jmenoVMenu(id) : jmenoStranky(id)) || p.nadpis, D + url(id)]);
    g.push({ '@type': 'BreadcrumbList', itemListElement: kroky.map(([name, item], i) => ({ '@type': 'ListItem', position: i + 1, name, item })) });
  }
  const dd = platneDotazy(p);
  if (dd.length && /\{\{dotazy\}\}/.test(p.obsah)) {
    g.push({ '@type': 'FAQPage', mainEntity: dd.map(x => ({ '@type': 'Question', name: x.otazka, acceptedAnswer: { '@type': 'Answer', text: text(vlozky(x.odpoved)) } })) });
  }
  return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': g }).replace(/</g, '\\u003c')}</script>`;
}

// Ověření webu v Google Search Console a Seznam Webmaster: kód z administrace (Kontakty a nastavení).
const kod = v => { const m = String(v || '').match(/content=["']([^"']+)["']/); return (m ? m[1] : String(v || '')).trim(); };
const OVERENI = [['google-site-verification', S.google_overeni], ['seznam-wmt', S.seznam_overeni]]
  .filter(([, v]) => kod(v)).map(([n, v]) => `<meta name="${n}" content="${esc(kod(v))}">`).join('\n');

// Google značka (Google Ads / Analytics) z administrace. Načte ji site.js až po souhlasu návštěvníka v liště.
// Na zkušebním webu se místo kódu předá „test“: lišta jde vyzkoušet, ale nic se od Googlu nenačte.
const ZNACKA = /^(AW|G|GT)-[A-Z0-9]+$/.test(String(S.google_znacka || '').trim()) ? String(S.google_znacka).trim() : '';
const GTAG = ZNACKA ? ` data-gtag="${ZKUSEBNI ? 'test' : ZNACKA}"` : '';

// Písma jsou přímo na webu (public/fonts/), ne z Google Fonts
const PISMA = ['source-sans-3-latin', 'source-sans-3-latin-ext', 'bricolage-latin', 'bricolage-latin-ext'];

// Na zkušební adrese (GitHub Pages) leží web v podsložce: všem odkazům od kořene se přidá předpona
const sBase = html => !BASE ? html : html
  .replace(/(\s(?:href|src|action|data-bg)=")\/(?!\/)/g, `$1${BASE}/`)
  .replace(/url\((['"]?)\/(?!\/)/g, `url($1${BASE}/`);

function page(id, p, opt = {}) {
  const noindex = opt.noindex || ZKUSEBNI;
  const title = id === 'uvod' ? `${S.nazev} – ${p.nadpis}` : `${p.nadpis} · ${S.nazev}${opt.noindex ? '' : ', ' + SEO.misto}`;
  const self = S.domena + url(id);
  const { html: obsah, hero, bg } = obrazky(fotky(vlozky(p.obsah.replace(/\{\{dotazy\}\}/g, () => dotazy(p)))));
  const ogKod = (p.obsah.match(/\{\{foto:[a-z0-9_-]+\}\}/g) || []).map(s => s.slice(7, -2)).find(k => FOTO[k]) || 'hero';
  const notice = S.upozorneni ? `<div class="demo">${S.upozorneni}</div>` : '';
  const test = ZKUSEBNI ? '<div class="demo">Zkušební verze nového webu. Platný web je zatím na <a href="https://eurodejv.cz">eurodejv.cz</a>.</div>' : '';
  const hlava = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(p.popis || '')}">`,
    noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${self}">`,
    ZKUSEBNI ? '' : OVERENI,
    `<meta property="og:site_name" content="${esc(S.nazev)}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(p.popis || '')}">`,
    noindex ? '' : `<meta property="og:url" content="${self}">`,
    `<meta property="og:image" content="${S.domena}${FOTO[ogKod] ? FOTO[ogKod].foto : ''}">`,
    FOTO[ogKod] && FOTO[ogKod].alt ? `<meta property="og:image:alt" content="${esc(FOTO[ogKod].alt)}">` : '',
    '<meta property="og:type" content="website">',
    '<meta property="og:locale" content="cs_CZ">',
    '<meta name="twitter:card" content="summary_large_image">',
    '<meta name="theme-color" content="#a3131d">',
    '<link rel="icon" href="/favicon.svg" type="image/svg+xml">',
    ...PISMA.map(f => `<link rel="preload" href="/fonts/${f}.woff2" as="font" type="font/woff2" crossorigin>`),
    hero ? `<link rel="preload" href="${hero}" as="image" fetchpriority="high">` : '',
    `<link rel="stylesheet" href="/style.css?v=${VERZE}">`,
    bg.length ? `<noscript><style>${bg.map(u => `[data-bg="${u}"]{background-image:url('${u}')}`).join('')}</style></noscript>` : '',
    opt.noindex ? '' : strukturovana(id, p)
  ].filter(Boolean).join('\n');
  const pop = /id="poptavka"/.test(obsah) ? '#poptavka' : '/kontakt/#poptavka';
  const weby = (S.weby_skupiny || []).filter(w => w.odkaz).map(w => `<a href="${esc(w.odkaz)}">${esc(w.nazev)}</a>`).join('<br>');
  const html = `<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
${hlava}
</head>
<body>
${test}${notice}<header><div class="in"><a class="logo" href="/"><img src="/logo.png" alt="${esc(S.nazev)} – ${esc(S.podnazev)}" width="297" height="69"></a><nav id="nav" aria-label="Hlavní menu">${nav(id)}</nav><a class="btn gh tel-h" href="${TEL}">${S.telefon}</a><a class="btn pop-h" href="${pop}">Poptávka<b class="pocet" hidden></b></a><button class="burger" aria-label="Menu" aria-controls="nav" aria-expanded="false"><span></span>Menu</button></div></header>
<main id="app">
${podmenu(id)}${obsah}
</main>
<footer><div class="in">
  <div><h3>Kontakt</h3><p><a href="${TEL}">${S.telefon}</a><br><a href="mailto:${esc(S.email)}">${esc(S.email)}</a><br>${S.adresa}</p></div>
  ${Object.keys(SEKCE).map(k => `<div><h3>${esc(jmenoVMenu(k))}</h3><p>${SEKCE[k].map(([i, n]) => `<a href="${url(i)}">${n}</a>`).join('<br>')}</p></div>`).join('\n  ')}
  <div><h3>Firma</h3><p>${S.firmy.map(f => `${esc(f.nazev)}, IČO ${esc(f.ico)}`).join('<br>')}<br><a href="/kontakt/#firmy">Obchodní údaje</a><br>${STR.paticka.map(([i, n]) => `<a href="${url(i)}">${n}</a>`).join('<br>')}</p>${weby ? `<h3 class="mt">Další weby skupiny</h3><p>${weby}</p>` : ''}</div>
</div><div class="in copy">© ${ROK} ${esc(S.provozovatel)}</div></footer>
<div class="dock"><a href="${TEL}" class="btn gh">Zavolat</a><a href="${pop}" class="btn">Poptávka<b class="pocet" hidden></b></a></div>
<a class="kosik" href="${pop}" hidden>Vybráno z půjčovny: <b>0</b> <span>Poslat poptávku →</span></a>
<script src="/site.js?v=${VERZE}" defer${GTAG}></script>
</body>
</html>`;
  return sBase(html);
}

// Stránka pro neexistující adresy (chyba 404): vyhledávače ji neindexují, nabídne cestu dál
const NENALEZENO = { nadpis: 'Stránka nenalezena', popis: '', obsah: '' };
NENALEZENO.obsah = `<section class="page-top"><div class="in"><span class="ey">Chyba 404</span><h1>Tahle stránka tu není</h1><p class="lead">Adresa se možná změnila nebo obsahuje překlep. Pokračujte některým z odkazů níže, nebo nám rovnou zavolejte na <a href="{{tel}}">{{telefon}}</a>.</p></div></section>`
  + `<section><div class="in"><div class="links">${[...STR.menu, ...Object.values(SEKCE).flat()].filter(([i], k, vse) => vse.findIndex(([j]) => j === i) === k).map(([i, n]) => `<a href="${url(i)}">${n}</a>`).join('')}</div></div></section>`;

// --- sestavení ---
fs.rmSync(DIST, { recursive: true, force: true });
fs.cpSync(path.join(ROOT, 'public'), DIST, { recursive: true });
fs.copyFileSync(path.join(ROOT, 'src/style.css'), path.join(DIST, 'style.css'));
fs.copyFileSync(path.join(ROOT, 'src/site.js'), path.join(DIST, 'site.js'));
fs.mkdirSync(path.join(DIST, 'admin'), { recursive: true });
for (const f of ['index.html', 'config.yml', 'auth.php']) fs.copyFileSync(path.join(ROOT, 'admin', f), path.join(DIST, 'admin', f));
// Poptávkový formulář: e-mail se vezme z nastavení
fs.writeFileSync(path.join(DIST, 'poptavka.php'), fs.readFileSync(path.join(ROOT, 'src/poptavka.php'), 'utf8').replace('__EMAIL__', S.email.replace(/'/g, '')));

const ids = fs.readdirSync(path.join(ROOT, 'content/stranky')).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5));
const sitemap = [];
for (const id of ids) {
  const p = read(`content/stranky/${id}.json`);
  const dir = path.join(DIST, url(id));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), page(id, p));
  sitemap.push(`<url><loc>${S.domena}${url(id)}</loc></url>`);
}
fs.writeFileSync(path.join(DIST, '404.html'), page('404', NENALEZENO, { noindex: true }));
if (ZKUSEBNI) {
  fs.writeFileSync(path.join(DIST, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
  fs.rmSync(path.join(DIST, '.htaccess'), { force: true });
} else {
  fs.writeFileSync(path.join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemap.join('')}</urlset>\n`);
  fs.writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: ${S.domena}/sitemap.xml\n`);
}

// Menší verze fotek (dist/foto/m/, nejvýš 800 px): s ImageMagickem zmenšené, bez něj jen zkopírované (web funguje i tak)
let im = true;
try { execFileSync('convert', ['-version'], { stdio: 'ignore' }); } catch (e) { im = false; }
fs.mkdirSync(path.join(DIST, 'foto/m'), { recursive: true });
for (const u of STREDNI) {
  const src = path.join(ROOT, 'public', u);
  const dst = path.join(DIST, mensi(u).slice(1));
  if (!fs.existsSync(src)) throw new Error('Chybí soubor fotky: ' + u);
  if (im) execFileSync('convert', [src, '-auto-orient', '-resize', '800x800>', '-strip', '-interlace', 'Plane', '-quality', '72', dst]);
  else fs.copyFileSync(src, dst);
}
console.log(`Hotovo: ${ids.length} stránek v dist/${ZKUSEBNI ? ` (zkušební verze, adresa ${BASE || '/'})` : ''}, ${STREDNI.size} menších fotek${im ? '' : ' (bez ImageMagicku jen zkopírované)'}`);
