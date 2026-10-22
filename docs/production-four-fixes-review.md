# Čtyři opravy produkční verze – podklady k revizi

Změny jsou určené k revizi v samostatném PR. Nebyla provedena změna produkčních dat, Firebase pravidel, přihlašování ani nasazení.

## Rozsah a příčiny

1. Tříměsíční kontrola: C1 sdílelo negativní vyhodnocení s ostatními body obecné kontroly. Nové protokoly mají `quarterlyEvaluationVersion: 2`; samotné C1 = ANO se v této verzi nepočítá mezi závady. Stejná funkce vyhodnocuje formulář, archiv a tiskový podklad. Historické záznamy bez tohoto příznaku zachovávají původní chování, včetně otevření a tisku; nepřepočítávají se zpětně.
2. Karta stroje: každá skupina byla omezena `slice(0,8)`, nebyla společná časová osa a některé zdroje používaly pouze paměť, jiné pouze místní úložiště. Karta nyní slučuje dostupné záznamy podle ID, přesně porovnává normalizované výrobní číslo včetně starších názvů polí a zobrazuje všechny události od nejnovější. Zachovává existující akce pro otevření záznamů a ukazuje provedenou opravu i ze starších názvů polí. Otevřená karta se obnovuje při aktualizaci přehledu. Pět podporovaných zdrojů: čtvrtletní protokoly, revize, poruchy, díly a servisní zápisy/opravné protokoly. Záznamy, které nejsou dostupné aplikaci, nelze touto úpravou obnovit; produkční databáze nebyla prohledávána.
3. Plán práce: text se skládal dynamicky jako `technik` + `ové`. Pro počet 2–4 je nyní `technici`; ostatní počty zůstávají správně skloňované.
4. Objednávky dílů: původní uložení posílalo do cloudu příznaky čekající synchronizace a lokálně aktualizovalo jen jednu ze dvou sad příznaků. Retry navíc vracelo potvrzenou lokální kopii do sloučení se starou čekající kopií v paměti, která měla přednost. Uložení nyní používá jednotné příznaky a aktualizuje i paměť. Kompletní místní kopie vzniká před síťovým požadavkem. Opakované odesílání stejného ID je chráněné proti souběhu v jedné relaci. Staré lokální objednávky bez potvrzení nejsou vyřazeny jen kvůli stáří přes 14 dnů; před odesláním se ověří existence na serveru. Novější serverová verze čekající objednávky se při retry nepřepíše a zůstane zobrazená chyba k porovnání. Nebyla přidána distribuovaná transakce pro souběžné editace mezi zařízeními.

Odstraněno bylo také automatické ořezávání místního archivu dílů na 300 záznamů a zahazování místních fotografií při zaplnění úložiště. Pokud selže místní i cloudové uložení, formulář zůstane otevřený. Nedostupné úložiště fotografií se hlásí jako nepotvrzená synchronizace, fotografie zůstává místně. Chyba oprávnění nebo produkčních pravidel se neobchází; tento PR jejich případnou nesprávnou konfiguraci neopravuje.

## Automatické ověření

Nový test `tests/production-four-fixes.test.cjs` blokuje všechny skutečné vzdálené požadavky. Obsahuje desktopový, iPhone a Android profil v Chromium. Používá dvě oddělené relace se společným falešným Firestore REST serverem: skutečné funkce aplikace zapisují a ověřují dokument, druhá relace ho načte přes funkci pro načítání kolekce.

Scénáře: C1 a rozhodující závada, původní pozitivní/negativní logika, zachovaný historický výsledek, HTML pro tisk; dvě servisní prohlídky + oprava + revize + kontrola, otevření všech pěti správných ID, dalších 12 záznamů, sestupné řazení, oddělení jiného stroje a aktualizace otevřené karty; text plánu; vytvoření, editace, obnovení stránky, čtení ve druhé relaci, offline retry bez duplicit a zbytečného dalšího zápisu, staré místní objednávky bez přepsání existující serverové kopie, lokální uložení fotografie před dokončením uploadu, zachování více než 300 objednávek a zachování fotografie při zaplnění úložiště.

Existující `firestore-partial-update.test.cjs` selhává na `canonicalFirestoreRestFields is not defined` v izolovaném VM testovacím prostředí. Stejný výsledek byl reprodukován na nezměněném základním commitu `75f9981`; nesouvisející test nebyl upraven.

Úspěšně proběhly sady `inline-syntax`, `production-four-fixes`, `machine-card`, `sync-confirmation`, `versioned-sync`, `quarterly-repaired-protocol-browser`, `fault-photo-storage` a `revize-print-review`. Poslední z nich kontroluje čtrnáct rozložení A4. Test opraveného čtvrtletního protokolu byl spuštěn s izolovaným obsloužením místních souborů místo samostatného HTTP serveru, který nebyl z testovacího prohlížeče dostupný; testovací scénář a blokování vzdálené sítě zůstaly stejné. Prošel také `git -c core.whitespace=cr-at-eol diff --check` (soubor používá smíšené původní konce řádků).

## Ruční ověření před schválením nasazení

1. V izolovaném testovacím prostředí se stejnými oprávněními jako produkce přihlásit dva oprávněné uživatele na PC a skutečném iPhonu/Androidu. Použít jednoznačné testovací výrobní číslo. Bez schválení neprovádět testovací zápisy do produkce.
2. Uživatel A vytvoří objednávku s fotografií; potvrdit stav synchronizace. Uživatel B obnoví data, otevře stejnou objednávku a fotografii. A upraví poznámku; B znovu načte a ověří změnu. Oba se odhlásí/přihlásí a ověří dostupnost.
3. A přejde offline, vytvoří objednávku a ověří čekající stav. Obnoví aplikaci, zkontroluje místní kopii a fotografii, připojí síť a nechá doběhnout retry. B musí načíst právě jeden záznam se stejným ID a fotografií. Simulovat zamítnutí zápisu ve vlastním testovacím prostředí a ověřit srozumitelnou chybu bez ztráty místní kopie.
4. Ke stejnému stroji vytvořit dvě servisní prohlídky, jednu opravu se způsobem odstranění závady, jednu revizi a jednu tříměsíční kontrolu. Ověřit pořadí, všech pět kompletních náhledů, historické záznamy a aktualizaci po změně z druhého zařízení.
5. Nová kontrola pouze s C1 = ANO musí vyhovět ve formuláři, po uložení/obnovení i ve výsledném PDF. Další rozhodující závada musí nevyhovět. Porovnat historický protokol před/po aktualizaci bez změny jeho obsahu či výsledku. Ověřit náhled a finální PDF na skutečných zařízeních.

Migrace ani hromadný přepis dat nejsou potřeba. Nový volitelný příznak je uložen pouze u nových kontrol. Žádné změny Firebase pravidel či kolekcí. Produkční oprávnění, reálná zařízení, výsledný stažený PDF soubor a skutečná synchronizace dvou účtů zůstávají ručním ověřením před nasazením.
