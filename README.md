# Web eurodejv.cz

Nový web stavební firmy EuroDejv. Statický web bez databáze: texty a ceny jsou v souborech JSON,
`build.js` z nich sestaví hotové stránky do složky `dist/`.

Web má dvě půlky: **Stavíme** (stavební práce, zateplení, zemní práce, drcení a štěrk) a **Půjčovna**
(katalog strojů a nářadí, lešení). V půjčovně jde u každé věci kliknout na „Přidat do poptávky“
a vybrané věci se samy doplní do poptávkového formuláře.

## Kde co je

| Soubor | Co v něm je |
| --- | --- |
| `content/stranky/*.json` | stránky (nadpis, popis pro Google, obsah v HTML) |
| `content/pujcovna.json` | katalog půjčovny: kategorie, stroje, parametry, ceny |
| `content/ceniky.json` | ceníky služeb (zemní práce, zateplení, drcení, lešení, materiál) |
| `content/reference.json` | reference (skupiny fotek) |
| `content/eu.json` | projekty spolufinancované EU |
| `content/fotky.json` | fotky použité v textech a jejich popisky |
| `content/nastaveni.json` | kontakty, obchodní údaje firem, certifikáty, weby skupiny |
| `src/struktura.json` | menu, podmenu obou půlek webu, patička |
| `src/seo.json` | údaje pro vyhledávače |
| `src/style.css`, `src/site.js` | vzhled a skripty |
| `src/poptavka.php` | odeslání poptávky e-mailem na adresu z nastavení |
| `admin/` | administrace (Decap CMS) na adrese /admin/ |
| `public/` | fotky, dokumenty, písma, logo, `.htaccess` pro Wedos |

V obsahu stránek se vkládají bloky značkami: `{{cenik:klic}}`, `{{pujcovna}}`, `{{pujcovna:klic}}`,
`{{reference}}`, `{{reference-vyber}}`, `{{eu}}`, `{{firmy}}`, `{{certifikaty}}`, `{{formular}}` nebo
`{{formular:Téma}}`, `{{foto:kod}}`, `{{tel}}`, `{{telefon}}`, `{{email}}`.
`{{oblast}}` vloží seznam obcí, kde působíme (`src/seo.json` → `oblast`, totéž dostane Google jako `areaServed`).
`{{dotazy}}` vloží časté dotazy stránky z pole `dotazy` v jejím JSONu (v administraci „Časté dotazy“); Google je dostane
i jako strukturovaná data FAQPage. Odpovědi smí obsahovat odkaz a jen fakta, která jsou jinde na webu nebo je potvrdil David.

## Sestavení a kontrola

```
node build.js                                   # ostrý web do dist/
ZKUSEBNI=1 BASE=/eurodejv-web node build.js     # zkušební verze pro GitHub Pages
php -S 127.0.0.1:8090 -t dist                   # prohlédnutí v prohlížeči
```

## Zveřejnění

- **Zkušební web:** po každé změně v `main` se sám zveřejní na https://david147222.github.io/eurodejv-web/
  (skrytý před vyhledávači, formulář nic neodesílá). Workflow `zkusebni-web.yml`.
- **Wedos (eurodejv.cz):** workflow `nahrat-na-wedos.yml`, zatím jen ručně. Na eurodejv.cz dnes běží starý web
  (WordPress). Přepnutí domény na nový web jen s Davidovým souhlasem, pak se workflow zapne po každé změně v `main`.
  Potřebné údaje (FTP, OAuth pro administraci) patří jen do GitHub Secrets.

## Google značka a cookies

Starý web měl Google značku `AW-17658110042` (Google Ads, přes plugin Site Kit). David 12. 11. 2026 rozhodl, že se na nový web
nepřenáší: nový web nic neměří a lištu se souhlasem nepotřebuje. Pro případ, že by se měření jednou vracelo, je připravené
pole `google_znacka` v `content/nastaveni.json` (v administraci „Google značka – kód“). Po vyplnění se značka načte jen na ostrém webu
a jen tomu, kdo v liště klikne „Souhlasím“ (odeslaná poptávka = `generate_lead`, kliknutí na telefon = `contact`).
Pak je potřeba přepsat i odstavec Cookies na stránce `cookies` a vložit tam tlačítko `<button type="button" class="btn gh cookies-zmenit">Změnit souhlas s cookies</button>`.

## Přepnutí domény eurodejv.cz na nový web (až s Davidovým souhlasem)

Doména i DNS jsou u WEDOSu, starý web běží na webhostingu WEDOS za ochranou WEDOS Global.

1. **Záloha starého webu** (David nebo Claude přes FTP): celý starý WordPress přesunout do složky `_stary-web`
   (`.htaccess` ji zvenku zablokuje) a v administraci WEDOSu stáhnout zálohu databáze.
2. **Údaje do GitHub Secrets** (David, Settings → Secrets and variables → Actions): `FTP_SERVER`, `FTP_USERNAME`,
   `FTP_PASSWORD`, `FTP_DIR` (složka webu eurodejv.cz na hostingu WEDOS).
3. **Přihlášení do administrace** (David): na GitHubu založit OAuth aplikaci (Settings → Developer settings → OAuth Apps,
   adresa `https://eurodejv.cz`, callback `https://eurodejv.cz/admin/auth.php`) a její Client ID a Secret uložit
   jako `OAUTH_CLIENT_ID` a `OAUTH_CLIENT_SECRET`.
4. **Pošta z formuláře** (David, WEDOS → DNS domény eurodejv.cz): TXT záznam SPF na prázdném názvu změnit na
   `v=spf1 include:_spf.previo.app include:_spf.google.com include:_spf.we.wedos.net ~all`
   (přidává se jen `include:_spf.we.wedos.net`, zbytek zůstává). Ověřit, že adresa `info@eurodejv.cz` v Google Workspace existuje.
5. **Nahrání** (Claude): Actions → Nahrát web na Wedos → Run workflow; pak v `nahrat-na-wedos.yml` zapnout nahrávání po každé změně v `main`.
6. **WEDOS Global**: vymazat mezipaměť (cache), ať se neukazuje starý web.
7. **Kontrola** (Claude + David): projít stránky a staré adresy (přesměrování), poslat zkušební poptávku
   a ověřit, že dorazila do schránky a ne do spamu, přihlásit se do `/admin/`.
8. **Google a Seznam**: v Google Search Console a v Seznam Webmaster přidat web (ověření kódem do polí v administraci
   „Kontakty a nastavení“, nebo TXT záznamem v DNS u WEDOSu), odeslat `https://eurodejv.cz/sitemap.xml` a požádat o odstranění
   starých adres, které v indexu zůstaly (`/kosik`, `/eshop`, `/author/admin`, `/index/dotace_v2/` …). Přesměrování v `.htaccess`
   pokrývají všechny staré adresy, které Google a Seznam 12. 11. 2026 znaly (ověřeno na Apache).
