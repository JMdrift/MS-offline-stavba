/* ==========================================================
   MSAppLock — zamek aplikace pres vlastni Android Capacitor plugin.

   Nepotrebuje placeny biometricky npm plugin. Android zobrazi
   systemove overeni vlastnika telefonu: biometriku a/nebo
   PIN, gesto ci heslo zarizeni podle moznosti telefonu.
   ========================================================== */

const MSAppLock = (function(){

  const MS_LOCK_GRACE_MS = 30 * 1000;   // do 30 s po odskoceni se znovu neptame
  const LOCK_KEY = 'ms_app_lock_v1';    // stejny klic jako doted (msGetAppLock)

  let plugin = null;
  let podporovano = false;
  let maBiometriku = false;             // jen pro texty, ne pro rozhodovani
  let probehlaKontrola = false;
  let zamceno = false;
  let overovaniBezi = false;
  let odchodDoPozadi = 0;
  let overlay = null;

  function nactiPlugin(){
    try{
      const cap = window.Capacitor;
      if(!(cap && cap.isNativePlatform && cap.isNativePlatform())) return null;
      return (cap.Plugins && cap.Plugins.MSDeviceAuth) || null;
    }catch(e){ return null; }
  }

  /* Zjisti, jestli tenhle telefon zamek vubec umi. Vola se jednou
     pri startu; vysledek si drzime, at se na to neptame porad.

     Podporovano = ma zamek obrazovky (PIN/gesto/heslo) NEBO
     nastavenou biometriku. Kdyz nema ani jedno, telefon neni cim
     overit a zamek by uzivatele jen uveznil. */
  async function probe(){
    if(probehlaKontrola) return podporovano;
    probehlaKontrola = true;
    plugin = nactiPlugin();
    if(!plugin){ podporovano = false; return false; }
    try{
      const r = await plugin.checkAvailability();
      maBiometriku = !!(r && r.biometricAvailable);
      podporovano = !!(r && r.deviceIsSecure && r.isAvailable);
    }catch(e){
      console.error('MSAppLock: kontrola dostupnosti selhala', e);
      podporovano = false;
    }
    return podporovano;
  }

  function isSupported(){ return podporovano; }
  function hasBiometrics(){ return maBiometriku; }

  function isEnabled(){
    if(!podporovano) return false;
    try{ return localStorage.getItem(LOCK_KEY) === 'faceid'; }catch(e){ return false; }
  }

  async function enable(){
    if(!podporovano) return { ok:false, chyba:'Tenhle telefon nemá nastavený zámek obrazovky, takže není čím ověřit.' };
    // Zapnuti se overuje hned - at clovek nezjisti az za tyden, ze
    // mu odemykani nefunguje.
    const ok = await vyzvi('Zapnout zámek aplikace');
    if(!ok) return { ok:false, zrusenoUzivatelem:true };
    try{ localStorage.setItem(LOCK_KEY, 'faceid'); }catch(e){}
    return { ok:true };
  }

  async function disable(){
    if(!isEnabled()){ try{ localStorage.setItem(LOCK_KEY, 'none'); }catch(e){} return { ok:true }; }
    // Vypnout zamek smi jen ten, kdo se umi overit. Jinak by stacilo
    // vzit odemceny telefon a zamek proste vypnout.
    const ok = await vyzvi('Vypnout zámek aplikace');
    if(!ok) return { ok:false, zrusenoUzivatelem:true };
    try{ localStorage.setItem(LOCK_KEY, 'none'); }catch(e){}
    return { ok:true };
  }

  async function vyzvi(titulek){
    if(!plugin) return false;
    try{
      await plugin.authenticate({
        title: titulek || 'Moje Stavba',
        subtitle: 'Ověř svou totožnost stejně jako při odemykání telefonu'
      });
      return true;
    }catch(e){
      return false;
    }
  }

  /* ---------- ZAMYKACI PREKRYV ---------- */

  function ukazPrekryv(){
    if(overlay) return;
    overlay = document.createElement('div');
    overlay.id = 'msLockOverlay';
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:9999;background:#191919;display:flex;'
      + 'flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:24px;text-align:center';
    overlay.innerHTML = `
      <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#ff5b2e" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
        <rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
      <div>
        <p style="margin:0 0 4px;font-size:9px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#8a8a8a">Moje Stavba</p>
        <h1 style="margin:0;font-size:19px;color:#f2f2f2;font-family:Georgia,serif">Aplikace je zamčená</h1>
      </div>
      <p id="msLockMsg" style="margin:0;font-size:12px;color:#8a8a8a;line-height:1.6;max-width:280px">Odemkni ji stejně jako telefon.</p>
      <button id="msLockBtn" style="border:1.5px solid #ff5b2e;background:transparent;color:#ff5b2e;padding:12px 26px;font-weight:800;font-size:13px;font-family:inherit;cursor:pointer">Odemknout</button>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#msLockBtn').addEventListener('click', ()=> zkusOdemknout());
  }

  function skryjPrekryv(){
    if(overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    overlay = null;
  }

  async function zkusOdemknout(){
    if(overovaniBezi) return;
    overovaniBezi = true;
    const btn = overlay && overlay.querySelector('#msLockBtn');
    const msg = overlay && overlay.querySelector('#msLockMsg');
    if(btn){ btn.disabled = true; btn.textContent = 'Ověřuji…'; }
    const ok = await vyzvi('Odemknout Moje Stavba');
    overovaniBezi = false;
    if(btn){ btn.disabled = false; btn.textContent = 'Odemknout'; }
    if(ok){
      zamceno = false;
      skryjPrekryv();
    }else if(msg){
      msg.textContent = 'Ověření se nepodařilo. Zkus to znovu — jde použít i kód telefonu.';
    }
  }

  /* Zamkne appku a hned nabidne odemceni. */
  async function lock(){
    if(!isEnabled()) return;
    zamceno = true;
    ukazPrekryv();
    await zkusOdemknout();
  }

  function isLocked(){ return zamceno; }

  async function init(){
    await probe();
    if(!isEnabled()) return;
    await lock();
  }

  /* Vola se z hlidace stavu appky (viz native.js). */
  function onPozadi(){ odchodDoPozadi = Date.now(); }
  async function onPopredi(){
    if(!isEnabled() || zamceno) return;
    if(!odchodDoPozadi) return;
    if(Date.now() - odchodDoPozadi < MS_LOCK_GRACE_MS) return;
    await lock();
  }

  return {
    init, probe, lock, isLocked, isSupported, isEnabled, hasBiometrics,
    enable, disable, onPozadi, onPopredi
  };
})();
