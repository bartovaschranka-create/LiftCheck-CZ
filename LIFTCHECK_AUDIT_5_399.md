# Audit LiftCheck CZ 5.399

Audit se vztahuje k produkční revizi `7a193a5475d1b0851b9786589ea367df11c3d572`. Veřejný soubor `version.json` a větev `main` při auditu odpovídaly verzi 5.399. Opravy jsou určené ke kontrole v samostatném pull requestu. Testovací prohlížeče používaly syntetické záznamy, lokální server a simulované odpovědi Firebase. Produkční databáze a Storage se při testech nepoužily.

## Nálezy a opravy

| Závažnost | Zjištění a příčina | Provedená změna |
| --- | --- | --- |
| Vysoká | Úprava hotové čtvrtletní kontroly zapisovala celý dokument bez kontroly souběžné změny. Podklad pro úpravu se navíc hledal znovu až při ukládání. | Podklad se zachytí při otevření formuláře. Stávající verzování Firestore používá podmínku `updateTime`, kontroluje výchozí verzi a při konfliktu zachová místní kopii. Druhá fáze obnovy fotografií používá potvrzenou serverovou verzi. Stejný pokus zachovává čas uložení. |
| Vysoká | Automatická aktualizace a událost `controllerchange` mohly obnovit stránku uprostřed práce. Návrh úprav hotového protokolu se do úložiště konceptů běžně nezapisuje. | Aktivní formulář a probíhající ukládání aktualizaci odloží. Nabídka aktualizace zůstane dostupná po dokončení práce. |
| Střední | Tisk revize napřed sestavil externí firmu a adresu, poslední část šablony je ale přepsala běžným provozovatelem. | Externí firmu a adresu vybírá přímo finální šablona tisku a PDF. Historické revize používají stávající zobrazení provozovatele. |
| Střední | Během asynchronního ukládání revize šlo pokračovat v úpravách polí. Úspěšná žádost pak formulář zavřela i s novějšími změnami. | Po dobu finálního ukládání jsou pole dočasně neaktivní. Při neúspěchu se opět zpřístupní. |
| Střední | Předvyplnění doplňovalo výchozí sníženou boční sílu i bez informace o druhé sadě pracovních parametrů. U historické revize mohl rozdíl mezi normalizovaným formulářem a uloženou hodnotou vynechat aktualizaci příznaku při změně varianty. | Snížená síla se předvyplní při doložené druhé sadě nebo dostupné hodnotě. Příznak se odvodí při výslovné změně varianty. |
| Střední | Service worker při aktivaci mazal ostatní cache celého webového původu, který mohou sdílet i další aplikace. | Mazání je omezené na staré cache odpovídající názvu LiftCheck. |
| Nízká | U ukládaných záznamů se v používaných cestách zapisovalo `5.384` nebo `5.358`, přestože aplikace běžela jako 5.399. | Nové zápisy a upravené záznamy uvádějí verzi 5.399. Starší záznamy se kvůli tomu hromadně nepřepisují. |

## Pokrytí auditu

- **Firmy a archiv.** Společný seznam z uložených záznamů, vyhledání v obou formulářích, deduplikace mezer a velikosti písmen, načtení po obnovení stránky, historický záznam bez příznaku a propojení externí firmy s revizí.
- **Protokoly a PDF.** Izolovaný Chromium generuje skutečné PDF z tiskového okna. Test tří stran ověřuje ANO/NE, komentáře, závadu, fotografie z odděleného originu a soubor dohledaný přes simulovaný Storage. Test nedostupného obrázku kontroluje, že tlačítko nespustí neúplný tisk. Revizní výstupy pokrývá šablona externí firmy a existující kontrola čtrnácti rozložení A4.
- **Ukládání.** Uložení z otevřeného kroku, zachování ID, čísla, příloh, původních technických údajů a změna souhrnu norem. Podmíněný zápis byl testován proti zastaralé kopii a opakovanému doručení potvrzeného zápisu. Testy kvóty a výpadku simulují ukládání a obnovu záznamů bez spojení.
- **Údaje stroje.** Opětovné otevření s ručně zadaným `GS-3246DC` a existující testy vyhledávání podle stroje, technických parametrů, nosnosti a norem. Karta stroje a návaznost historie mají samostatné testy.
- **Fotografování.** Simulace kamery bez zoomu kontroluje uvolnění streamu a dostupnost systémového vstupu. Stávající sada ověřuje přílohy poruch, kompresi, opakovaný výběr, selhání dekódování a následnou synchronizaci.
- **Aktualizace.** Ověřena návaznost verze a cache v `index.html`, `version.json`, `sw.js` a `manifest.json`. Simulovaná událost změny správce stránky ověřuje odklad při otevřeném formuláři a trvalost uloženého konceptu. Aktivace service workeru má test zachování cizí cache.
- **Další moduly.** Regresní sada pokrývá opravy, poruchy, díly, historii strojů, lokální kvóty, bezpečné opakování zápisů, chyby REST, archiv a auditní snímky.

## Výsledky testů

Závěrečný úplný běh produkční sady skončil výsledkem **28 z 28 testovacích souborů úspěšných**, bez přeskočených testů. Dřívější běh odhalil nechtěnou sekundární hodnotu v testu externí revize a zastaralé očekávání plošné normalizace historických parametrů. Oběma scénářům se věnuje závěrečný běh. Testy e-mailových připomínek patří do jiné větve a nejsou součástí auditovaného produkčního commitu.

## Zbývající rizika a ověření před nasazením

- Fyzický iPhone Safari a PWA, fyzický Android Chrome a PWA, skutečný zoom ve výsledném snímku, odmítnutí oprávnění, opakované fotografování a HEIC z kamery vyžadují ruční ověření. Mobilní profily Chromium mění emulované zařízení a vstup.
- Ověřit přechod z dřívější instalované PWA na kandidáta s konceptem a dosud nesynchronizovanou fotografií. Starší otevřená stránka obsluhuje vlastní aktualizační událost starým kódem. Automatizace zde ověřuje novou ochranu a zachování uloženého konceptu při jednotlivých krocích.
- Ověřit na odděleném Firebase projektu dva klienty, skutečná oprávnění k fotografiím, obnovu připojení a zobrazení firem po synchronizaci. Otevřený starší klient může při zápisu použít původní neversionovanou cestu. U historických dokumentů bez porovnatelného času zápisu ochrana může vyžadovat ruční porovnání.
- Potvrzení zápisu protokolu a přidání auditní položky probíhají odděleně. Když server dokončí zápis na pozadí po vypršení čekání a formulář se už znovu neuloží, není auditní položka zaručena.
- Ověřit fyzický černobílý tisk s vypnutým pozadím, hromadný duplex, vybrané historické výstupy a stránkování s mimořádně dlouhými poznámkami. Před sloučením přidělit kandidátu nové číslo vydání a novou PWA cache.

## Změněné soubory

- `index.html`, `sw.js`
- `tests/protocol-workflows-browser.test.cjs`, `tests/versioned-sync.test.cjs`, `tests/app-update-cache.test.cjs`
- `tests/quarterly-repaired-protocol-browser.test.cjs`, `tests/revision-envelope-none.test.cjs`
- `LIFTCHECK_AUDIT_5_399.md`
