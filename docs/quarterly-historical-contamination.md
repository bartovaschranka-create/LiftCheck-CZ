# Znečištění u již hotových čtvrtletních kontrol

Uživatel dne 24. 10. 2026 výslovně schválil použití pravidla také na dříve dokončené čtvrtletní kontroly. Tím pro tento konkrétní bod nahrazuje původní požadavek zachovat historické vyhodnocení popsaný v `production-four-fixes-review.md`.

Samotné `C1 = ANO` (Celkové znečištění) se nepočítá jako závada u nových ani historických čtvrtletních protokolů. Výjimka už nevyžaduje `quarterlyEvaluationVersion: 2`. Ostatní odpovědi a rozhodující závady mají stejné vyhodnocení jako dosud. Logika revizí ZZ se nemění.

Přehledy, karta stroje, náhled a nově generovaný tiskový/PDF podklad používají společné vyhodnocení. Uložené odpovědi, poznámky, fotografie, podpisy ani metadata se nepřepisují. Migrace, zápisy do produkční databáze ani změny Firebase pravidel nejsou potřeba. Dříve stažené PDF soubory se samy nezmění; je nutné protokol znovu otevřít a exportovat.

Ověření: `inline-syntax` a `production-four-fixes` v desktopovém, iPhone a Android profilu Chromium. Regrese zahrnuje starý protokol bez příznaku verze, nejstarší strukturu bez explicitního `cLogic`, tisk bez chybového označení znečištění, zachování skutečné závady a neměnnost původních dat. Síťové požadavky na produkční služby jsou v testu blokované.
