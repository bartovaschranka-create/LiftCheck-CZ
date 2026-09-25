# Revize a synchronizace – 5.393

## Příčiny a rozsah

- Opravy: stejné ID serverového záznamu nesprávně potvrzovalo neodeslanou místní změnu. Potvrzení nyní vyžaduje ověřený obsah.
- Revize: lokální kopie bez kontroly verze mohly přepsat novější záznam. Podmíněný zápis používá revision, serverový čas a Firestore updateTime; konflikt zůstává místně k porovnání. Neobchází se méně bezpečným zápisem přes SDK.
- Mazání: fyzicky smazaný serverový dokument se mohl vrátit ze staré cache. Nové mazání používá tombstone a trvalou frontu v existující IndexedDB.
- Zobrazení: změny v paměti mohly být ztraceny při obnovení seznamu jen z localStorage; navazující plánování zdržovalo překreslení po uložení.
- Mobilní formulář: automatická obnova prázdné aplikace nebrala ohled na otevřený formulář. Test reprodukuje tuto konkrétní cestu, nikoliv pád OS na skutečném Samsungu. IME odkládá našeptávání do dokončení znaku; diagnostika neukládá hodnoty polí ani zprávy obsahující osobní údaje.
- PDF: popis druhých hodnot nerozlišoval provoz uvnitř/venku a pracovní obálku podle zatížení. Nové režimy zachovávají starší hodnoty při načtení. Popisky jsou u jednotlivých hodnot, druh zkoušky respektuje i „Ověřovací“ a okraje jsou nejméně 8 mm.

## Migrace existujících protokolů

Načtení aplikace samo žádné historické cloudové revize neopravuje. Po nasazení lze v konzoli aplikace vytvořit náhled:

```js
const preview = await previewRevisionCorrections();
console.table(preview);
```

Až po kontrole náhledu lze spustit:

```js
await applyRevisionCorrections(preview);
```

Migrace je idempotentní, vyžaduje jedinou přesnou shodu protokolu a výrobního čísla a znovu kontroluje náhled i serverovou verzi. Ostatní pole, počty osob a fotografie zachovává. Konflikt migraci přeruší; již provedené položky se při dalším náhledu neopakují.

Read-only náhled 25. 9. 2026 přečetl 70 záznamů. Navrhl opravy:

| Protokol | Část |
|---|---|
| 180RZ/26 | Výška podlahy 6,13 m |
| 164RZ/26 | Pracovní výška 26,38 m |
| 142RZ/26 | Bateriový pohon, napájení 24 V DC |
| 197RZ/26 | Napájení 12 V DC; odstranit Riso z tohoto pole |
| 151RZ/26, 141RZ/26, 140RZ/26 | Stoupavost – odstranit stupně, ponechat 45 % |
| 185RZ/26 | Stoupavost – odstranit stupně, ponechat 25 % |
| 169RZ/26 | Význam dvojích hodnot; dosahy kontrolovat vůči příslušné nosnosti |

154RZ/26 a 184RZ/26 neměly v tomto náhledu přesnou shodu s výrobním číslem z dodaného PDF; automaticky se nemění. Náhled není dokladem provedené migrace.

## Údaje ponechané k ověření

- ES2632: druhá nosnost 230 kg ze zadání je v rozporu s modelem 230/125 kg v [listu JLG](https://sitecore.jlg.com/dfsmedia/e4042b10c9ce4595b4cc059f1299f079/143012-source). Zachována původní hodnota; rozhoduje štítek/návod konkrétního stroje.
- Duplicitní 189RZ/26; platnost dvojice 161RZ/26 a 178RZ/26; osoby Z-45/25 XC, 660SJ a 1250AJP; přesné obálky 660SJ/860SJ; Toucan 12E/Plus.
- Pohon GS-3369 RT v 163RZ/26; stabilizátory GS-1432m; venkovní výšky GS-2632/ES1530L; boční síly 2646ES/3246ES; chybějící osoby/boční síly GS-3390/4390/5390; venkovní parametry nových ES2632.
- Výrobní závod se nikdy nepřiřazuje odhadem podle značky. Adresy Maasmechelen a Verrebroek zůstávají neověřené; PSČ Changzhou nebylo zdrojem potvrzeno. Hoofddorp je v oficiálním zdroji obchodní/servisní provozovna. Watertown je historická adresa z návodu.

Zdroje adres jsou přímo u položek v manufacturer-directory.js: [JLG](https://www.jlg.com/en/about-jlg/corporate-locations), [Genie – výrobci](https://manuals.genielift.com/operators/english/1279298.pdf), [Genie – právní výrobce a EU zástupce](https://manuals.genielift.com/operators/italian/1329833IT.pdf), [OMME](https://www.ommelift.com/contact).

## Ověření a nasazení

Statická aplikace nemá samostatný build ani package.json. Kontrola syntaxe a cílené testy jsou uvedené v PR. Cloudové zápisy v testech jsou simulované; produkční protokoly nebyly testy přepsány. Skutečný iPhone/iPad a Samsung je nutné ověřit po aktualizaci. Na tomto PC WebKit ukončil proces ještě před načtením aplikace; nelze to označit za úspěšný test Safari.

Před souběžnou prací aktualizovat aplikaci na všech zařízeních. Starší verze aplikace nepoužívají nové kontroly revision/tombstone; bez serverových pravidel nelze zabránit zápisu libovolného starého klienta. Ochrana je ověřena pro nové klienty, nikoli jako změna oprávnění Firestore.

PR obsahuje aplikaci i cache/verzi. Nasazení GitHub Pages navazuje na sloučení do main podle nastavení repozitáře. Cloudová migrace je oddělená od nasazení aplikace.
