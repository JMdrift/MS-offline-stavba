/* ==========================================================
   PRAVNI OBSAH - Zasady ochrany osobnich udaju + Podminky pouzivani.
   Aktualizovano podle skutecneho stavu appky: appka je 100% lokalni,
   zadny cloud, zadne prihlasovani, zadne sdileni (viz
   Premium-sdileni-specifikace.md - tyhle funkce se az v budoucnu
   znovu navrhnou a pridaji, zatim v appce vubec nejsou). Google Play
   i App Store vyzaduji verejnou URL se zasadami ochrany osobnich
   udaju - stejny text je proto potreba mit i jako samostatnou
   staticky hostovanou stranku (viz privacy.html), tohle je jen kopie
   uvnitr appky.
   ========================================================== */
function legalScreenShell(container, title, bodyHtml){
  container.innerHTML = `
    <div class="topbar ms-ui-topbar legal-v2-topbar">
      <button class="back-btn" id="backBtn"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></button>
      <div class="ms-ui-title"><p>Moje Stavba</p><h1>${title}</h1></div>
    </div>
    <div class="screen-scroll legal-v2-scroll">
      <article class="legal-v2-paper">${bodyHtml}</article>
    </div>
  `;
  container.querySelector('#backBtn').addEventListener('click', ()=> Router.back());
  return { showNav:false };
}

const PrivacyPolicyScreen = (function(){
  function render(container){
    return legalScreenShell(container, 'Ochrana osobních údajů', `
      <p style="color:var(--muted);font-size:11px">Platné od: 31. 8. 2026</p>

      <p><b>To nejdůležitější shrnuté na začátek:</b> Všechno, co do aplikace zadáš — zápisy do deníku, fotky, dokumenty, výdaje — zůstává uložené pouze v tomto telefonu. Aplikace nemá účet, přihlašování ani cloudové úložiště a tato data nikam neodesílá. Neprodáváme je, nesdílíme je s inzerenty a aplikace neobsahuje žádné reklamní ani sledovací nástroje třetích stran.</p>

      <p><b>Jaká data aplikace ukládá</b><br/>
      Vše, co do ní sám zadáš: název a místo projektu, etapy stavby, výdaje a jejich částky, fotografie, poznámky do deníku, události v kalendáři, úkoly a nahrané dokumenty. Dále si lokálně pamatuje tvoje nastavení, například zvolený motiv nebo zapnutý zámek aplikace.</p>

      <p><b>Kam se tato data ukládají</b><br/>
      Výhradně do úložiště tvého telefonu (localStorage a IndexedDB). Projektová data — zápisy, fotky, dokumenty ani výdaje — se neodesílají na žádný server, protože aplikace žádný server nemá.</p>

      <p><b>Sdílení s třetími stranami</b><br/>
      Data neprodáváme, nesdílíme s inzerenty ani s žádnou třetí stranou. Aplikace neobsahuje reklamy ani analytické či sledovací nástroje.</p>

      <p><b>Fotoaparát a fotografie</b><br/>
      Aplikace si nevyžaduje trvalý přístup k fotoaparátu ani ke galerii telefonu. Když chceš přiložit fotku, otevře se systémový dialog Androidu, ve kterém sám vybereš konkrétní snímky nebo pořídíš nový. Aplikace dostane jen ty soubory, které jí takto předáš — do zbytku galerie nevidí. Vybrané fotografie zůstávají uložené jen v telefonu.</p>

      <p><b>Ukládání a odesílání souborů</b><br/>
      Když si necháš vytvořit PDF deníku, uložíš fotku do telefonu nebo odešleš dokument do jiné aplikace, otevře se systémové okno Androidu, ve kterém sám určíš, kam soubor půjde. Aplikace soubor nikam neposílá sama.</p>

      <p><b>Záloha dat</b><br/>
      V aplikaci si můžeš kdykoli vytvořit ruční zálohu celé stavby jako jeden soubor. Tento soubor vytváříš a spravuješ výhradně ty — aplikace ho nikam sama neodesílá. Automatické zálohování aplikace do tvého účtu Google (Android Auto Backup) je vypnuté, data se tedy nekopírují na Disk Google.</p>

      <p><b>Smazání dat</b><br/>
      Lokální data můžeš kdykoli smazat přímo v aplikaci (Nastavení → Smazat všechna data appky) nebo odinstalováním aplikace z telefonu. Odinstalováním se smaže vše — pokud si chceš stavbu zachovat, udělej si nejdřív zálohu.</p>

      <p><b>Platby a předplatné</b><br/>
      Prvních 30 dní je aplikace bez omezení zdarma. Po uplynutí zkušební doby je pro přidávání nových dat potřeba předplatné. Platby zpracovává výhradně obchod Google Play — aplikace nikdy nevidí ani neukládá číslo tvojí platební karty. Pro ověření platného předplatného používáme službu RevenueCat (RevenueCat, Inc., USA), která od Google Play dostává anonymní identifikátor nákupu a informaci o stavu předplatného. Tato služba nemá přístup k obsahu tvojí stavby.</p>

      <p><b>Zámek aplikace</b><br/>
      Zámek aplikace je nepovinný a zapíná se v Nastavení. Když je zapnutý, ověření provádí operační systém telefonu — otiskem, obličejem nebo kódem telefonu. Aplikace sama nikdy nevidí ani neukládá tvůj kód, otisk prstu ani jiné biometrické údaje.</p>

      <p><b>Děti</b><br/>
      Aplikace není určená dětem a vědomě nesbírá údaje o dětech.</p>

      <p><b>Změny těchto zásad</b><br/>
      Pokud v budoucnu přibude funkce, která pracuje s daty jinak, tahle stránka i text v aplikaci budou aktualizovány a datum na začátku se změní.</p>

      <p><b>Kontakt</b><br/>
      Dotazy ohledně ochrany osobních údajů piš na <b>moje-stavba-app@seznam.cz</b>.</p>
    `);
  }
  return { render };
})();
Router.register('privacy-policy', PrivacyPolicyScreen);

const TermsScreen = (function(){
  function render(container){
    return legalScreenShell(container, 'Podmínky používání', `
      <p style="color:var(--muted);font-size:11px">Platné od: 2026</p>

      <p>Používáním appky Moje Stavba souhlasíš s těmito podmínkami.</p>

      <p><b>Co appka je</b><br/>
      Moje Stavba je osobní nástroj na sledování průběhu vlastní stavby nebo rekonstrukce - etapy, výdaje, stavební deník, fotky, kalendář a dokumenty. Appka je poskytována tak, jak je ("as is"), bez záruky nepřetržité bezchybné funkčnosti.</p>

      <p><b>Tvoje data, tvoje odpovědnost</b><br/>
      Aplikace ukládá data výhradně v tvém telefonu (viz Zásady ochrany osobních údajů) a automatické zálohování do účtu Google je vypnuté - za zálohování tak odpovídáš ty sám. Aplikace k tomu nabízí funkci ruční zálohy, doporučujeme ji používat pravidelně. Při ztrátě, poškození nebo výměně telefonu bez vytvořené zálohy může dojít ke ztrátě dat - autor aplikace za takovou ztrátu neodpovídá.</p>

      <p><b>Přesnost údajů</b><br/>
      Appka je pomocný nástroj pro evidenci - za správnost zadaných částek, dat a informací (např. pro účely daňové evidence či komunikace s úřady) odpovídá výhradně uživatel.</p>

      <p><b>Zkušební doba a předplatné</b><br/>
      Prvních 30 dní od založení prvního projektu je aplikace bez omezení zdarma. Po uplynutí zkušební doby je pro přidávání nových dat potřeba předplatné; ke stávajícím datům máš přístup i nadále a můžeš je upravovat. Předplatné se sjednává a hradí přes obchod Google Play a spravuje se v jeho nastavení, kde ho lze také kdykoli zrušit.</p>

      <p><b>Změny appky</b><br/>
      Appka se může v čase měnit a vyvíjet (nové funkce, opravy). Podstatné změny těchto podmínek budou uvedeny s novým datem platnosti výše.</p>

      <p><b>Ukončení používání</b><br/>
      Appku můžeš kdykoli přestat používat a odinstalovat. Smazání appky z telefonu trvale odstraní i všechna lokálně uložená data, pokud sis předtím nevytvořil zálohu.</p>

      <p><b>Kontakt</b><br/>
      Dotazy piš na <b>moje-stavba-app@seznam.cz</b>.</p>
    `);
  }
  return { render };
})();
Router.register('terms', TermsScreen);
