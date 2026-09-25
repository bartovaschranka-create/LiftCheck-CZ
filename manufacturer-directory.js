(function(root){
 const jlg='https://www.jlg.com/en/about-jlg/corporate-locations';
 const genie='https://manuals.genielift.com/operators/english/1279298.pdf';
 const legal='https://manuals.genielift.com/operators/italian/1329833IT.pdf';
 const rows=[
 ['omme','OMME LIFT A/S','manufacturer/factory','Lægårdsvej 4','Sdr. Omme','7260','','Denmark','https://www.ommelift.com/contact',true],
 ['terex-global','Terex Global GmbH','legalManufacturer','Bleicheplatz 2','Schaffhausen','8200','','Switzerland',legal,true],
 ['genie-eu','Genie Industries B.V.','EURepresentative','Boekerman 5','Oud Gastel','4751 XK','','The Netherlands',legal,true],
 ['terex-changzhou','Terex (Changzhou) Machinery Co., Ltd.','manufacturer/factory','No. 139 Hanjiang Road, Xinbei District','Changzhou','','Jiangsu','China',genie,true],
 ['terex-south-dakota','Terex South Dakota, Inc.','manufacturer/factory','500 Oakwood Road','Watertown','57201','South Dakota','USA',genie,true],
 ['jlg-usa','JLG Industries, Inc.','manufacturer/factory','1 JLG Drive','McConnellsburg','17233','Pennsylvania','USA',jlg,true],
 ['jlg-belgium','JLG Manufacturing Europe BVBA','manufacturer/factory','Industrieterrein Oude Bunders 1034, Breitwaterstraat 12A','Maasmechelen','B-3630','','Belgium','',false],
 ['jlg-emea','JLG EMEA B.V.','serviceCenter','Polaris Avenue 63','Hoofddorp','2132 JH','','The Netherlands',jlg,true],
 ['jlg-logistics','JLG EMEA B.V., c/o Aertssen Logistics','logistics','Steentijdstraat, Haven 1286','Verrebroek','9130','','Belgium','',false],
 ['jlg-china','Oshkosh - JLG Equipment Technology Co., Ltd.','manufacturer/factory','No. 228 Jingsan Road, Tianjin Airport Economic Area','Tianjin','300308','','China',jlg,true],
 ['jlg-france','JLG France SAS','serviceCenter','83 impasse Guillaume Mon Amy, CS 30204','Fauillet','47400','','France',jlg,true]
 ];
 root.LIFTCHECK_MANUFACTURERS=rows.map(([id,legalName,role,street,city,postalCode,region,country,sourceUrl,verified])=>({id,legalName,role,street,city,postalCode,region,country,displayLabel:legalName+' – '+city+', '+country,sourceUrl,sourceCheckedAt:sourceUrl?'2026-09-25':'',verified}));
 // Verification concerns the cited address/role, never assignment to a particular machine.
 root.LIFTCHECK_MANUFACTURERS.find(r=>r.id==='terex-south-dakota').note='Historická adresa z návodu; přiřadit pouze podle štítku/prohlášení daného stroje.';
 root.LIFTCHECK_MANUFACTURERS.find(r=>r.id==='terex-changzhou').note='PSČ 213022 není v citovaném návodu potvrzeno.';
 root.LIFTCHECK_MANUFACTURERS.find(r=>r.id==='jlg-belgium').note='Číslo areálu 1034/1043 je nutné ověřit.';
 root.LIFTCHECK_MANUFACTURERS.find(r=>r.id==='jlg-emea').note='Oficiální zdroj uvádí Sales and Service Operation; výrobní závod ani EU zástupce tím není potvrzen.';
})(window);
