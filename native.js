/* ==========================================================
   NATIVNI CHOVANI ANDROIDU  (31.8.2026)
   Dve veci, ktere webova appka resit nemusi, ale zabalena ano.

   1) HARDWAROVE TLACITKO ZPET (a gesto od kraje)
      Doted na nej appka nijak nereagovala. V Capacitoru to
      znamena, ze systemove Zpet appku rovnou UKONCI - i kdyz
      je clovek zanoreny treti obrazovku hluboko v denikú nebo
      ma otevrene okno s detailem vydaje. Recenzenti Google na
      Zpet mackaji skoro vzdy, takze to neni jen nepohodli.

      Nove se Zpet chova podle poradi, ktere lidi cekaji:
        1. je otevrene prekryvne okno? -> zavrit ho
        2. da se v appce jit o obrazovku zpet? -> jit
        3. jsme na dashboardu? -> zeptat se, jestli ukoncit

   2) PRECHOD DO POZADI A ZPET
      Potreba pro zamek appky (viz applock.js) - bez toho by
      se zamykalo jen pri uplnem startu a odemcena appka by
      zustala odemcena i po tydnu v pozadi.

   CO JE POTREBA DOINSTALOVAT
      npm install @capacitor/app
      npx cap sync android        <- sync, ne copy!

   Kdyz plugin chybi, tenhle soubor tise nic neudela a appka
   se chova jako driv.
   ========================================================== */

const MSNative = (function(){

  function plugin(){
    try{
      const cap = window.Capacitor;
      if(!(cap && cap.isNativePlatform && cap.isNativePlatform())) return null;
      return (cap.Plugins && cap.Plugins.App) || null;
    }catch(e){ return null; }
  }

  /* Najde nejvrchnejsi otevrene prekryvne okno. Appka jich pouziva
     vic druhu (detail vydaje, lightbox fotky, potvrzovaci dialog,
     spodni listy ve formularich) - vsechny sdileji tridu
     .ms-overlay, krome potvrzovaciho okna, ktere ma vlastni. */
  function vrchniPrekryv(){
    const zamek = document.getElementById('msLockOverlay');
    if(zamek) return null;   // zamceno - Zpet nesmi delat vubec nic

    const confirmOv = document.querySelector('#confirm-overlay.open');
    if(confirmOv) return { el: confirmOv, druh:'confirm' };

    const seznam = document.querySelectorAll('.ms-overlay');
    if(seznam.length) return { el: seznam[seznam.length - 1], druh:'overlay' };

    return null;
  }

  function zavriPrekryv(p){
    if(!p) return false;
    if(p.druh === 'confirm'){
      // Potvrzovaci okno ma vlastni tlacitko Zrusit - stisknout ho je
      // bezpecnejsi nez okno jen schovat, protoze tim dobehne i
      // Promise, na kterou nekdo ceka.
      const zrus = document.getElementById('confirm-cancel-btn');
      if(zrus){ zrus.click(); return true; }
    }
    // Bezne prekryvy se zaviraji kliknutim na pozadi.
    const zavrit = p.el.querySelector('#txClose, .ms-overlay-close');
    if(zavrit){ zavrit.click(); return true; }
    if(p.el.parentNode){ p.el.parentNode.removeChild(p.el); return true; }
    return false;
  }

  let ptameSeNaUkonceni = false;

  async function obsluhaZpet(){
    // 1. prekryvne okno
    const p = vrchniPrekryv();
    if(p){ zavriPrekryv(p); return; }
    if(document.getElementById('msLockOverlay')) return;

    // 2. o obrazovku zpet
    try{
      if(typeof Router !== 'undefined' && Router.canGoBack && Router.canGoBack()){
        Router.back();
        return;
      }
    }catch(e){}

    // 3. ukoncit appku - ale az po potvrzeni. Nechtene ukonceni
    // uprostred zapisu na stavbe je presne to, co lidi stve.
    if(ptameSeNaUkonceni) return;
    ptameSeNaUkonceni = true;
    let ukoncit = false;
    try{
      ukoncit = await Layout.confirmDialog('Ukončit Moje Stavba?', 'Ukončit', 'Zůstat');
    }catch(e){ ukoncit = false; }
    ptameSeNaUkonceni = false;
    if(ukoncit){
      const p2 = plugin();
      if(p2 && p2.exitApp) p2.exitApp();
    }
  }

  function init(){
    const p = plugin();
    if(!p || !p.addListener) return;

    try{
      p.addListener('backButton', ()=>{ obsluhaZpet(); });
    }catch(e){ console.error('MSNative: backButton se nepodarilo napojit', e); }

    try{
      p.addListener('appStateChange', (stav)=>{
        const aktivni = !!(stav && stav.isActive);
        if(typeof MSAppLock === 'undefined') return;
        if(aktivni) MSAppLock.onPopredi();
        else MSAppLock.onPozadi();
      });
    }catch(e){ console.error('MSNative: appStateChange se nepodarilo napojit', e); }
  }

  return { init };
})();
