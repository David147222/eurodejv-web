// EuroDejv – skripty webu (menu, pozdní načítání fotek, zvětšení fotek, výběr z půjčovny, poptávkový formulář)
(function () {
  // Mobilní menu
  var burger = document.querySelector('.burger');
  if (burger) burger.addEventListener('click', function () {
    var open = document.body.classList.toggle('mo');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  // Fotky na pozadí (dlaždice) se načtou, až se k nim stránka přiblíží – build.js je dává do data-bg
  var bgs = document.querySelectorAll('[data-bg]');
  var ukazBg = function (el) { el.style.backgroundImage = "url('" + el.getAttribute('data-bg') + "')"; el.removeAttribute('data-bg'); };
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); ukazBg(e.target); } });
    }, { rootMargin: '600px 0px' });
    bgs.forEach(function (el) { io.observe(el); });
  } else bgs.forEach(ukazBg);

  // Zvětšení fotky po kliknutí (odkazy s data-lb); šipky a přejetí prstem listují fotkami ve stejné galerii
  var lb = null, seznam = [], pos = 0;
  var zobraz = function () {
    var a = seznam[pos], img = lb.querySelector('img');
    img.src = a.getAttribute('href');
    var i = a.querySelector('img'); img.alt = i ? i.alt : '';
    lb.querySelector('.lb-n').textContent = seznam.length > 1 ? (pos + 1) + ' / ' + seznam.length : '';
  };
  var posun = function (d) { if (seznam.length > 1) { pos = (pos + d + seznam.length) % seznam.length; zobraz(); } };
  var zavri = function () { if (lb) { lb.remove(); lb = null; document.body.classList.remove('lb-on'); } };
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-lb]');
    if (!a) return;
    e.preventDefault();
    var box = a.closest('.gal, .eu') || a.parentElement;
    seznam = Array.prototype.slice.call(box.querySelectorAll('a[data-lb]'));
    pos = Math.max(0, seznam.indexOf(a));
    lb = document.createElement('div');
    lb.className = 'lb';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-label', 'Zvětšená fotka');
    lb.innerHTML = '<img alt=""><button class="lb-x" aria-label="Zavřít">×</button>'
      + (seznam.length > 1 ? '<button class="lb-p" aria-label="Předchozí">‹</button><button class="lb-d" aria-label="Další">›</button>' : '')
      + '<span class="lb-n"></span>';
    lb.addEventListener('click', function (ev) {
      if (ev.target.classList.contains('lb-p')) posun(-1);
      else if (ev.target.classList.contains('lb-d')) posun(1);
      else zavri();
    });
    var x0 = null;
    lb.addEventListener('touchstart', function (ev) { x0 = ev.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (ev) {
      if (x0 === null) return;
      var dx = ev.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) posun(dx < 0 ? 1 : -1);
    });
    document.body.appendChild(lb);
    document.body.classList.add('lb-on');
    zobraz();
    lb.querySelector('.lb-x').focus();
  });
  document.addEventListener('keydown', function (e) {
    if (!lb) return;
    if (e.key === 'Escape') zavri();
    else if (e.key === 'ArrowLeft') posun(-1);
    else if (e.key === 'ArrowRight') posun(1);
  });

  // Výběr z půjčovny: tlačítka „Přidat do poptávky“, lišta s počtem a seznam ve formuláři.
  // Prohlížeč si výběr pamatuje do zavření okna, takže jde vybírat na více stránkách.
  var KLIC = 'eurodejv-vyber', vyber = [];
  try { vyber = JSON.parse(sessionStorage.getItem(KLIC) || '[]'); if (!Array.isArray(vyber)) vyber = []; } catch (e) { vyber = []; }
  var uloz = function () { try { sessionStorage.setItem(KLIC, JSON.stringify(vyber)); } catch (e) { /* bez paměti funguje výběr jen na stránce */ } };
  var kosik = document.querySelector('.kosik');
  var obnov = function () {
    document.querySelectorAll('button.add').forEach(function (b) {
      var on = vyber.indexOf(b.getAttribute('data-item')) > -1, it = b.closest('.item');
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.textContent = on ? '✓ V poptávce' : 'Přidat do poptávky';
      if (it) it.classList.toggle('vybrano', on);
    });
    if (kosik) { kosik.hidden = !vyber.length; kosik.querySelector('b').textContent = vyber.length; }
    document.querySelectorAll('.pocet').forEach(function (b) { b.hidden = !vyber.length; b.textContent = vyber.length; });
    document.body.classList.toggle('ma-vyber', vyber.length > 0);
    document.querySelectorAll('form.form').forEach(function (f) {
      var box = f.querySelector('.vyber');
      if (!box) return;
      var ul = box.querySelector('ul');
      box.hidden = !vyber.length;
      ul.textContent = '';
      vyber.forEach(function (n) {
        var li = document.createElement('li'), x = document.createElement('button');
        li.textContent = n;
        x.type = 'button'; x.className = 'del'; x.textContent = '×';
        x.setAttribute('data-item', n); x.setAttribute('aria-label', 'Odebrat: ' + n);
        li.appendChild(x); ul.appendChild(li);
      });
      f.polozky.value = vyber.map(function (n) { return '- ' + n; }).join('\n');
      f.zprava.required = !vyber.length; // s vybranými věcmi stačí jméno a kontakt
    });
  };
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('button.add, button.del');
    if (!b) return;
    var n = b.getAttribute('data-item'), i = vyber.indexOf(n);
    if (i > -1) vyber.splice(i, 1);
    else if (b.classList.contains('add')) vyber.push(n);
    uloz(); obnov();
  });
  if (/odeslano=1/.test(location.search)) { vyber = []; uloz(); }
  obnov();
  // Když je formulář na obrazovce, lišta s výběrem by ho jen zakrývala
  var form = document.getElementById('poptavka');
  if (kosik && form && 'IntersectionObserver' in window) new IntersectionObserver(function (es) { kosik.classList.toggle('skryt', es[0].isIntersecting); }).observe(form);

  // Poptávkový formulář: návrat na stránku, kontrola telefonu nebo e-mailu, zpráva po odeslání
  document.querySelectorAll('form.form').forEach(function (f) {
    var msg = f.querySelector('.msg');
    var ukaz = function (t, chyba) { msg.textContent = t; msg.hidden = false; msg.classList.toggle('err', !!chyba); };
    var zpet = f.querySelector('[name="zpet"]');
    if (zpet) {
      var cesta = location.pathname;
      var base = (f.getAttribute('action') || '').replace(/\/poptavka\.php$/, '');
      if (base && cesta.indexOf(base) === 0) cesta = cesta.slice(base.length) || '/';
      zpet.value = cesta;
    }
    var q = location.search;
    if (/odeslano=1/.test(q)) ukaz('Děkujeme, poptávku jsme dostali. Ozveme se vám co nejdřív.');
    else if (/chyba=1/.test(q)) ukaz('Poptávku se nepodařilo odeslat. Zkontrolujte prosím jméno, zprávu a telefon nebo e-mail.', true);
    else if (/chyba=2/.test(q)) ukaz('Poptávku se nepodařilo odeslat. Zavolejte nám prosím, nebo napište e-mail.', true);
    f.addEventListener('submit', function (e) {
      var tel = f.telefon.value.trim(), mail = f.email.value.trim();
      if (!tel && !mail) { e.preventDefault(); ukaz('Vyplňte prosím telefon nebo e-mail, ať se vám můžeme ozvat.', true); f.telefon.focus(); return; }
      if (f.hasAttribute('data-test')) { e.preventDefault(); ukaz('Tohle je zkušební verze webu, formulář zatím nic neodesílá.', true); }
    });
  });

  // Souhlas s cookies a Google značka (Google Ads). Značka se načte jen na ostrém webu a jen po souhlasu v liště.
  // Kód je v administraci (Kontakty a nastavení → Google značka); build.js ho dá do data-gtag u tohoto skriptu.
  // Na zkušebním webu je v data-gtag „test“: lišta funguje, ale od Googlu se nic nenačte.
  var skript = document.querySelector('script[data-gtag]');
  var GID = skript ? skript.getAttribute('data-gtag') : '';
  var SKLIC = 'eurodejv-cookies', lista = null, nacteno = false;
  var ck = document.querySelector('a[href$="/cookies/"]');
  var cookiesUrl = ck ? ck.getAttribute('href') : '/cookies/';
  var volba = function () { try { return localStorage.getItem(SKLIC); } catch (e) { return null; } };
  var zapamatuj = function (v) { try { localStorage.setItem(SKLIC, v); } catch (e) { /* bez paměti se lišta ukáže znovu na další stránce */ } };
  var nactiGoogle = function () {
    if (nacteno || !/^(AW|G|GT)-[A-Z0-9]+$/.test(GID)) return;
    nacteno = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'granted' });
    window.gtag('js', new Date());
    window.gtag('config', GID);
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GID);
    document.head.appendChild(s);
    // Odeslaná poptávka (návrat z formuláře s ?odeslano=1) se Googlu ohlásí jako získaný zájemce
    if (/odeslano=1/.test(location.search)) window.gtag('event', 'generate_lead', { method: 'poptavka' });
  };
  var smazGoogleCookies = function () {
    var dom = location.hostname.replace(/^www\./, '');
    document.cookie.split(';').forEach(function (c) {
      var n = c.split('=')[0].trim();
      if (/^_(gcl|ga|gid)/.test(n)) ['', '; domain=' + dom, '; domain=.' + dom].forEach(function (d) { document.cookie = n + '=; Max-Age=0; path=/' + d; });
    });
  };
  var schovejListu = function () { if (lista) { lista.remove(); lista = null; } document.body.classList.remove('ma-souhlas'); };
  var ukazListu = function () {
    if (lista || !GID) return;
    lista = document.createElement('div');
    lista.className = 'souhlas';
    lista.setAttribute('role', 'region');
    lista.setAttribute('aria-label', 'Souhlas s cookies');
    lista.innerHTML = '<p>Se souhlasem použijeme cookies Googlu, abychom věděli, jestli k nám reklama přivádí zákazníky. <a href="' + cookiesUrl + '">Podrobnosti</a></p>'
      + '<div class="souhlas-bt"><button type="button" class="btn gh" data-volba="ne">Odmítnout</button><button type="button" class="btn" data-volba="ano">Souhlasím</button></div>';
    document.body.appendChild(lista);
    document.body.classList.add('ma-souhlas');
  };
  if (!GID) document.querySelectorAll('.cookies-zmenit').forEach(function (b) { b.hidden = true; });
  document.addEventListener('click', function (e) {
    if (!e.target.closest) return;
    var tel = e.target.closest('a[href^="tel:"]');
    if (tel && nacteno) window.gtag('event', 'contact', { method: 'telefon' });
    if (e.target.closest('.cookies-zmenit')) { ukazListu(); return; }
    var b = e.target.closest('[data-volba]');
    if (!b) return;
    var v = b.getAttribute('data-volba');
    zapamatuj(v);
    schovejListu();
    if (v === 'ano') nactiGoogle();
    else { smazGoogleCookies(); if (nacteno) location.reload(); } // odvolaný souhlas: běžící značku zastaví až nové načtení stránky
  });
  var v0 = volba();
  if (v0 === 'ano') nactiGoogle();
  else if (v0 !== 'ne') ukazListu();
})();
