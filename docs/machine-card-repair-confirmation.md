# Potvrzená oprava čtvrtletního protokolu v kartě stroje

Tlačítko Opraveno už vytváří navazující protokol a ukládá vazbu, datum a osobu potvrzení. Karta stroje tyto údaje dosud nezobrazovala a aktuální stav stále považoval původní, již vyřešenou závadu za otevřenou.

Karta nově u obou souvisejících protokolů ukazuje potvrzení odstranění závad, datum, osobu a původní závady včetně poznámek. Existující akce otevřou původní protokol nebo navazující protokol po opravě. Nové navazující protokoly ukládají do existujícího pole `repairSourceIssues` také konkrétní poznámky k závadám. Starší potvrzení se zobrazí z již uložené vazby a zachovaného původního protokolu; není potřeba je přepisovat.

Aktuální stav stroje ignoruje původní závadu pouze tehdy, když existuje příslušný navazující protokol bez závad. Jiná nevyřešená závada, porucha či požadavek na díly zůstává rozhodující. Historie dál obsahuje všechny dostupné události ze všech podporovaných zdrojů a původní záznamy zůstávají zachované. Potvrzení opravy obnoví i otevřenou kartu stroje. Pro řazení navazujícího protokolu se použije přesný čas potvrzení.

Prošly `machine-card-repair-confirmation`, `machine-card`, `production-four-fixes` (desktop/iPhone/Android profily Chromium), `quarterly-repaired-protocol-browser` a `inline-syntax`. Testy blokují skutečné produkční požadavky; scénář zahrnuje skutečnou akci Opraveno, neměnnost původního záznamu, oba odkazy, obnovení stránky, starší navazující protokol, chybějící zdrojový protokol, HTML escapování a jinou nevyřešenou závadu. Test původního tlačítka běžel přes izolované obsloužení místních souborů.

Bez migrace, hromadného přepisu dat a změn Firebase pravidel. Před nasazením je třeba schválit PR; nasazení není součástí této přípravy.
