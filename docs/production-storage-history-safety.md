# Opravy ostré verze LiftControl CZ – podklady ke kontrole

Datum: 3. 11. 2026. Pracovní větev: `codex/production-storage-history-safety`.
Ověřený výchozí produkční `main`: `002a16a28a16b3854cd3e0de719720ff4cad0a34`.
Aktuálnost byla ověřena čtením GitHub API; místní `HEAD` měl před vytvořením větve stejný obsah. Běžný `git fetch` blokovala systémová politika načítání `libcurl-4.dll`; ověření proto proběhlo konektorem GitHub. Nová větev byla zarovnána na ověřený `origin/main`.

Žádné nasazení, push, migrace, změna Security Rules, přístup do živé databáze, mazání záloh ani změna uložených protokolů. Nesledované složky `artifacts/` a `test-repo/` nebyly zahrnuty do změn aplikace. Verze aplikace, manifest a service worker zůstávají beze změny; toto není vydání určené k okamžitému nasazení.

## A. Potvrzený stav a příčiny

| Oblast | Skutečný stav před úpravou | Změna |
|---|---|---|
| Kvóta dílů | `liftcheck_parts_local` obsahuje celé pole objednávek včetně base64 fotografií, kompatibilní kopie `photo` a `photos`. Celé pole se serializuje při každém zápisu. Velikost roste i s počtem dokumentů. | Zachována data; selhání se nesmí vydávat za místní úspěch. Při potvrzeném cloudu je dostupná správná paměťová kopie. Žádné automatické promazávání nebo přesun dat. |
| Opakování formuláře | Nový požadavek dostal při každém pokusu jiné ID, dokud se formulář úspěšně nezavřel. | ID a původní datum vytvoření se zachovávají i po selhání. Formulář a fotografie zůstávají otevřené, pokud obě úložiště selžou. |
| Potvrzený cloud při plném úložišti | `partsData` se měnilo jen po úspěšném místním zápisu; stará místní pending kopie mohla znovu překrýt potvrzenou paměťovou kopii. | Paměť přijme výsledek nezávisle na místním úspěchu. Potvrzení pro přesný původní obsah zabrání vracení staré místní kopie v této relaci. |
| Souběžné objednávky | Díly používaly nepodmíněný zápis; kontrola časů při retry nezajišťovala atomickou ochranu dvou zařízení. | Používá se již existující podmíněný Firestore commit se serverovou verzí, stejně jako u oprav a revizí. Konflikt zůstane místně, bez automatického přepsání serveru. |
| Fotografie dílů | Pevné `photo_1.jpg` mohlo při pozdější úpravě přepsat starší přílohu. | Nové obrázky používají cestu podle SHA-256 obsahu. Existující upload se před opakováním načte, aby se zbytečně neměnil přístupový token. Původní uložené cesty zůstávají čitelné. |
| Historie bez ID | Náhradní klíč byl sestaven z výrobního čísla, čísla protokolu a data; odlišné dokumenty se stejnými hodnotami mohly splynout. | Dokumenty s ID se slučují podle ID. U starých dat bez ID se zachová celý obsah i počet opakovaných výskytů v archivu; opakované načtení nevytváří další kopie. |
| Starší audit | Nové zápisy ořezávaly místní audit na 300 položek. Běžný auditní přehled načítá jen 80 posledních změn. | Nové místní audity se neořezávají. Karta má samostatné načtení všech stránek auditu a všech pěti zdrojů dokumentů. Běžný přehled posledních 80 událostí není jedinou cestou ke starším změnám. |
| Offline audit | Neodeslané změny neměly frontu pro opakované odeslání; místní chyba byla potlačena. | Nové události mají volitelný příznak `auditPending`, pevné ID a opakované odeslání. Potvrzené události se znovu neodesílají. Neuložené události chrání opuštění stránky. Starý audit se hromadně nepřepisuje. |
| Rozpracovaná kontrola | Uložení metadat mohlo vrátit úspěch i po selhání samostatné cache fotografií. | Výsledek zahrnuje obě části. Neúspěch fotografie nebo metadat vrací chybu a chrání opuštění stránky. |
| Tisk historie | Karta již obsahovala všech pět skupin bez původního limitu osmi položek, ale díly neměly vlastní tisk uložených údajů ani souhrnný tisk s auditem. | Každý řádek má samostatný detail/tisk původních polí; přibyl chronologický souhrn všech dostupných dokumentů a auditů. Původní protokolové tiskové předlohy se nemění. |
| Autor | Obecná funkce bez historie uživatele automaticky vracela konkrétní jméno. | Pevná obecná náhrada byla odstraněna. Požadavek na díl vyžaduje autora; historická jména se nepřepisují. |
| Mobilní přiblížení | Viewport zakazoval zoom. | Zoom je povolen. Stávající velká tlačítka, formuláře a ostatní vzhled zůstávají zachované. |

Původní hlášení z konkrétního produkčního zařízení nebylo možné forenzně reprodukovat bez jeho úložiště. Potvrzena je cesta zápisu velkých dat a chování při skutečně vyhozené `QuotaExceededError`, nikoli přesné obsazení daného telefonu.

### Prověření úložišť

- Čtvrtletní protokoly: celý archiv v localStorage, samostatná metadata a fotografie/podpisy rozpracovaného formuláře. Selhání hlavního archivu už vrací výsledek; nově se propaguje také chyba fotografické části draftu.
- Revize ZZ: localStorage a existující trvalá záloha v IndexedDB; již používají serverové preconditions. Databáze ani obnova nebyly měněny.
- Poruchy a opravy: existující IndexedDB pro fotografie, podpisy a uložené formuláře, menší metadata v localStorage. Stávající automatické převody v těchto cestách jsou součástí výchozího kódu; tento patch je nerozšiřuje.
- Náhradní díly: stále původní localStorage. Při plném zařízení a nedostupném cloudu nelze zaručit trvalé uložení; aplikace takový zápis odmítne označit jako úspěšný a chrání formulář. Fyzickou kapacitu úložiště tato etapa nezvětšuje.
- Audit: localStorage se snapshoty před/po změně a samostatná cloudová kolekce. Nová fronta se týká pouze nově označených událostí.
- Drobné preference, návrhy, poslední autor, lokální seznamy smazaných ID a značky aktualizací mají vlastní localStorage/sessionStorage zápisy. Některé best-effort preference stále potlačují výjimky; nejsou důkazem úspěšného uložení obchodního dokumentu. Nebyla provedena plošná změna těchto pomocných cest.
- Service worker ukládá aplikační soubory do Cache Storage; jeho cache není náhradou úložiště dokumentů. V této větvi se nemění.

## B. Historie, detail a tisk

Použití: otevřít kartu stroje → **Načíst úplnou historii**. Aplikace projde všechny stránky kontrol, revizí, poruch, dílů, oprav a auditu, bez pevného počtu položek. Existující REST stránkování již bylo v pořádku; nový test výslovně ověřuje druhou stránku a záznamy za hranicí 100.

Při chybě sítě nebo oprávnění zůstanou dostupné záznamy viditelné a historie je označena jako neúplně ověřená, včetně zdroje chyby. Dokončené načtení potvrzuje průchod zdroji, nikoli skutečnost, že v minulosti žádná data nebyla odstraněna. Úplné načítání spouští uživatel; není přidané do každého startu telefonu.

**Původní údaje / tisk** otevře původní uložený snapshot každého dokumentu včetně neznámých a starších polí. Tím je dostupný i záznam bez ID, který nemůže bezpečně použít původní akci podle ID. Nevyplněné hodnoty nejsou nahrazeny současnými parametry stroje. HTTP(S) odkazy zůstávají otevřitelné; vložené obrázky jsou tisknutelné. Detail načte dostupné místní fotografie a podpisy přes jejich existující IndexedDB klíče. Nedostupná příloha je označena; nepředstírá se její obnova.

**Vytisknout historii stroje** obsahuje všechny dostupné záznamy v chronologickém pořadí a auditní snapshoty změn. Celá doba evidence je výchozí rozsah; nebyl přidán filtr období. Souhrn nenahrazuje samostatné schválené protokoly. Místní přílohy v souhrnu mohou být uvedeny svým uloženým klíčem; plný místní obsah se načítá v samostatném detailu.

Původní náhledy/tisky kontrol, revizí, poruch a oprav zůstaly zachovány. Nový nezávislý výpis je cesta pro přesná uložená pole a typy bez vlastní předlohy. Ve stávajících předlohách nebyly měněny výpočty, doplňování hodnot, podpisy ani obsah.

U zcela totožných starých kopií bez ID ve více nezávislých zdrojích nelze dokázat, zda jde o dvě listiny nebo o dvě kopie jedné listiny. Implementace zachovává maximální doložený počet shodných výskytů v jednotlivém archivu, nevytváří ID ani nemění historické dokumenty. Nejasnosti patří do ručního posouzení před případnou migrací.

## C. Návrh IndexedDB – samostatná etapa, neprovedeno

1. Samostatné úložiště dokumentů dílů, immutable blobs a fronta podle stávajícího ID dokumentu. Síťový požadavek teprve po potvrzení transakce pro celý dokument i přílohy. Oddělené výsledky zařízení/cloud.
2. Nejprve pouze kopírování schváleného exportu do stínového úložiště v izolovaném prostředí. Porovnat počet dokumentů, multiset identit a hash úplných původních payloadů i příloh. Chybné a nejasné záznamy nesmějí být automaticky přeskočeny.
3. Dual-read; při přechodu ponechat všechny původní localStorage hodnoty. Žádné `removeItem`, automatické promazání archivu ani přepis identifikací. Zápisy nové vrstvy musí mít ověření dokončené transakce, retry a konfliktní stavy.
4. Prověřit iOS eviction, quota obou úložišť, restart uprostřed přechodu, neplatný JSON, chybějící blob, dvě záložky a návrat ke staré aplikaci. Rollback smí změnit čtecí cestu, nesmí ztratit nové čekající dokumenty.
5. Pro návrat připravit export všech nových dokumentů a příloh; starší aplikace novou frontu nezná. Nestačí pouze vrátit starý HTML soubor. Teprve po úplné kontrole a samostatném schválení rozhodnout o aktivaci.

V této větvi se migrace úložišť nespouští. Není přidané nové IndexedDB schéma ani přenos starých dílů do nové databáze.

## D. Návrh vazeb – samostatná etapa, neprovedeno

Aktuální přiřazení je převážně podle normalizovaného výrobního čísla. Závada → požadavek na díl a oprava → díl přebírají především formulářová data a text; to není důkaz trvalé vazby `faultId`/`repairId`. Shodné výrobní číslo ani podobný popis nejsou dostatečný podklad k automatickému propojení historických dokumentů.

Navržená volitelná pole pro nové zápisy: `machineId`, `faultId`, `repairId`, případně pole konkrétních ID požadavků. Každá listina si ponechá vlastní ID, původní výrobní číslo, autora a datum. Uzavření závady je nová auditní událost; starší událost se nesmaže. Staré dokumenty se dále zobrazují přes původní identifikaci. Vazba se má zobrazovat jen při doloženém ID; nejasná asociace nemá vytvářet navigaci na domnělý dokument.

`tools/history-link-dry-run.cjs` pouze čte výslovně předaný lokální JSON a vypíše návrh, bez síťových funkcí a zápisů. Vstup má podobu `{ "kolekce": [ { "id": "...", "serial": "..." } ] }`. Výstup rozlišuje návrhy od konfliktů výrobce/modelu, opakovaných ID a chybějících výrobních čísel či ID. I nekonfliktní návrh vyžaduje kontrolu; hash výrobního čísla sám o sobě nedokazuje identitu stroje. Spuštěn byl pouze unit test se syntetickými daty, nikoli preview nad ostrou databází nebo provozními zálohami.

Firebase Auth a revizní profily jsou samostatný návrh: vyžadovat přihlášenou identitu, role a výběr správného oprávnění, zachovat uloženého historického autora. Ve výchozím kódu je také konkrétní pevný revizní profil se jménem a osvědčeními; tento profil ani historické podpisy se zde nepřepisují a nebylo dokázáno, že patří jiné osobě. Jeho oddělení od přihlášené identity musí být posouzeno společně s osvědčeními, nikoli pouhou výměnou jména.

## Bezpečnost a nedostupné ověření

- Produkční zdroj deklaruje projekt `doctype-test`, kolekce `protokoly_test`, `revize_zz_test` a další provozní kolekce. Název „test“ není důkaz oddělení od provozu.
- Nesledovaná místní složka `test-repo` deklaruje stejný projekt, ale před aplikací načítá `assets/test-isolation.js`, který blokuje Firebase a odděluje localStorage. Z této kopie nelze potvrdit stav nasazeného TESTu ani produkčních dat. Složka nebyla upravována.
- `protokoly_backup.json` je verzovaný a obsahuje 55 záznamů s ID, výrobním číslem, místem a kontrolními poli. `liftcontrol-backup-data.js` je také verzovaný a je součástí aplikačního shellu. Historie jejich přidání zůstává v Gitu. Obsah nebyl měněn, přesouván ani mazán; do zprávy nejsou kopírovány reálné osobní údaje.
- V repozitáři nejsou dostupné autoritativní Firestore/Storage Security Rules. Z klientského API klíče nelze vyvozovat oprávnění. Nebyla testována veřejná dostupnost produkčních dokumentů ani příloh.
- Změny pravidel, účtů, oddělení projektů, odstranění publikovaných záloh, přepis Git historie a nasazení vyžadují samostatné rozhodnutí. API klíč klientské aplikace sám o sobě není náhradou Security Rules.
- Nelze ověřit skutečnou úplnost produkční historie, dostupnost každého starého obrázku, oprávnění skutečných účtů, limity a zbývající prostor konkrétních telefonů. Již dříve ztracené/ořezané lokální události tato větev neobnoví, pokud není dostupná jiná kopie.

## Ověření a soubory

Automatické testy běží výhradně na syntetických datech. Browser testy zachytávají všechny požadavky a povolují jen lokální soubory nebo falešný server. Edge vyžadoval spuštění mimo omezený sandbox; nejde o testování ostré aplikace. Profily iPhone/Android jsou emulace v Chromium, nikoli fyzická zařízení ani Safari.

Nové scénáře: 143 historických dokumentů a 125 auditních událostí, nejstarší/nejnovější, čtyři dokumenty bez ID, různé dokumenty se stejným výrobním číslem a datem, všechny typy detailu/tisku, více než 100 dokumentů z REST stránek, částečné/offline načtení, cloudový úspěch při zaplněném localStorage, odmítnutí staré verze, lokální offline fronta, ztracené potvrzení commitu bez dalšího zápisu, stabilní ID i datum při opakování formuláře, ochrana opuštění, selhání fotografické cache draftu, zachování více než 300 auditů, opakované odeslání auditu, zachování snapshotů před/po, oddělené/recyklované uploady bez přepsání fotografií. Skutečné tiskové okno má ověřené původní údaje, bezpečné escapování, vložený obrázek, šířku a generování PDF.

Rozšířená původní sada používá dva oddělené browser contexts se společným podmíněným falešným serverem, včetně souběžné editace stejné verze. Původní VM test částečného Firestore zápisu byl opraven tak, aby načetl skutečnou závislost `canonicalFirestoreRestFields`; dříve selhával kvůli neúplnému testovacímu prostředí. Kontroly produkčního kódu nebyly vypnuty. Automatické spouštění retry je v příslušných testech zastaveno a retry se spouští řízeně, aby do scénářů nezasahoval nesouvisející startovací časovač.

Výsledky: 15 regresních sad prošlo společným během; samostatně prošel test read-only návrhu vazeb. Existující kontrola tisku potvrdila 14 rozložení A4 bez přetékání a kolize se zápatím. Po doplnění závěrečného testu dvou souběžných kontextů je zopakována dotčená sada. `git diff --check` se spouští s `core.whitespace=cr-at-eol` kvůli původním smíšeným koncům řádků.

Změněné soubory:

- `index.html`: uvedené opravy a nové ovládání historie.
- `tests/production-storage-history-safety.test.cjs`: nové behaviorální scénáře a skutečné tiskové okno.
- `tests/production-four-fixes.test.cjs`: podmíněný falešný server, řízené retry/uploady a souběh dvou kontextů.
- `tests/firestore-partial-update.test.cjs`: oprava chybějící závislosti testovacího VM.
- `tools/history-link-dry-run.cjs` a `tests/history-link-dry-run.test.cjs`: pouze lokální read-only návrh, bez migrace.
- Tento dokument.

Před případným schválením nasazení zbývá kontrola změn, izolovaná zkouška s odpovídajícími Firebase Rules a oprávněními, fyzický iPhone/Safari a Android, finální tisk/PDF a samostatné rozhodnutí o etape C/D. Nastavení produkční infrastruktury ani obsah historických protokolů se nemají měnit v rámci tohoto schválení opravy.
