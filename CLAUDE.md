# Pravidla pro úpravy webu eurodejv.cz

Popis struktury je v README.md. Navíc:

- Značka je **EuroDejv**. Na webu jsou obě firmy, EuroDejv s.r.o. a EuroDejv Invest s.r.o.
- Ceny jsou bez DPH. Dotace (Nová zelená úsporám) firma už nevyřizuje, na webu je nenabízet.
- Nic nevymýšlej: ceny, parametry strojů, kontakty a texty musí odpovídat tomu, co potvrdil David nebo co bylo na starém webu.
- Administraci `/admin/` (Decap CMS) nerozbij: každé nové pole v `content/*.json` musí být i v `admin/config.yml` (nepovinná pole s `required: false`).
- Půjčovna je jeden katalog v `content/pujcovna.json`; cenu půjčovného neopakuj v textech stránek.
- Fotky jen vlastní (starý web, Davidův Google Disk). Fotky na pozadí piš jako `style="background-image:url('{{foto:kod}}')"`, `build.js` je sám převede na pozdní načítání.
- Zatím jen česky, němčina a angličtina až na konec.
- Ověření: `node build.js` a `ZKUSEBNI=1 BASE=/eurodejv-web node build.js`, pak web z `dist/` v prohlížeči na šířce telefonu i počítače.
- Nahrání na Wedos a přepnutí domény jen s Davidovým souhlasem.
