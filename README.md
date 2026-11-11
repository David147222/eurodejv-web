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
