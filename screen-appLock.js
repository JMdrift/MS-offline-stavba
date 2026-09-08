/* ==========================================================
   ZAMEK APPKY  (prepojeno na skutecne overovani 31.8.2026)
   Doted tahle obrazovka volbu jen ULOZILA a nic nezamykala - viz
   komentar v applock.js. Ted jde vsechno pres MSAppLock, ktery
   zamek doopravdy vynucuje.

   Kdyz appka zamek vynutit NEUMI (bezi v prohlizeci, chybi plugin,
   telefon nema ani PIN), moznost se vubec nenabidne a obrazovka to
   rovnou rekne. Radeji nenabidnout nic nez slibit ochranu, ktera
   neexistuje.

   (31.8.2026) Uz to NENI krok uvodniho pruvodce. Doted byl zamek
   povinna zastavka driv, nez clovek vubec videl, co appka umi -
   rozhodoval se o zabezpeceni dat, ktera jeste nemel. Ted se sem
   chodi vyhradne z Nastaveni.
   ========================================================== */
const AppLockScreen = (function(){
  function render(container, params){
    const current = msGetAppLock();
    const umime = (typeof MSAppLock !== 'undefined') && MSAppLock.isSupported();

    container.innerHTML = `
      <div class="setup-v2-screen app-lock-v2-screen">
        <div class="setup-v2-card">
        <div class="setup-v2-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12l2 2 4-4"/><rect x="3" y="4" width="18" height="17" rx="2"/></svg>
        </div>
        <p class="setup-v2-kicker">Zabezpečení</p>
        <h1>Zamkni aplikaci</h1>
        <p class="setup-v2-lead">${umime
          ? 'Rozpočty, faktury a osobní poznámky může chránit zabezpečení telefonu. Volbu kdykoli změníš v Nastavení.'
          : 'Zámek na tomhle zařízení nejde zapnout — chybí otisk, obličej i kód telefonu, kterými by se dal ověřit.'}</p>
        <div class="setup-v2-actions">
          ${umime ? `<button class="btn-primary" id="lockFaceIdBtn" style="display:flex;align-items:center;justify-content:center;gap:8px">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v4M15 3h4a2 2 0 0 1 2 2v4M9 21H5a2 2 0 0 1-2-2v-4M15 21h4a2 2 0 0 0 2-2v-4"/><path d="M9 10v1a3 3 0 0 0 6 0v-1"/></svg>
            ${current === 'faceid' ? 'Zámek je zapnutý' : 'Zamknout aplikaci'}
          </button>` : ''}
          <button class="btn-ghost" id="lockNoneBtn">${umime ? (current === 'faceid' ? 'Vypnout zámek' : 'Bez zámku') : 'Zpět'}</button>
        </div>
        <p class="setup-v2-note">${umime
          ? 'Odemyká se stejně jako telefon — otiskem, obličejem nebo jeho kódem. Chrání proti tomu, kdo telefon zvedne ze stolu; není to ochrana proti někomu, kdo má telefon rozebraný a čas.'
          : 'Data zůstávají v telefonu. Zámek aplikace půjde zapnout, jakmile si na telefonu nastavíš PIN, gesto nebo otisk.'}</p>
        </div>
      </div>
    `;

    function dal(){ Router.go('settings'); }

    const faceBtn = container.querySelector('#lockFaceIdBtn');
    if(faceBtn) faceBtn.addEventListener('click', async ()=>{
      if(current === 'faceid'){ dal(); return; }   // uz je zapnuty
      faceBtn.disabled = true;
      // Zapnuti se rovnou overi - at clovek nezjisti az za tyden,
      // ze mu odemykani na tomhle telefonu nefunguje.
      const res = await MSAppLock.enable();
      faceBtn.disabled = false;
      if(!res.ok){
        if(res.zrusenoUzivatelem) return;
        Layout.alertDialog(res.chyba || 'Zámek se nepodařilo zapnout.', 'Zámek aplikace');
        return;
      }
      if(typeof Layout !== 'undefined' && Layout.showSuccess) Layout.showSuccess('Zámek zapnut');
      dal();
    });

    const noneBtn = container.querySelector('#lockNoneBtn');
    if(noneBtn) noneBtn.addEventListener('click', async ()=>{
      if(typeof MSAppLock !== 'undefined' && MSAppLock.isEnabled()){
        // Vypnout zamek smi jen ten, kdo se umi overit.
        const res = await MSAppLock.disable();
        if(!res.ok) return;
        if(typeof Layout !== 'undefined' && Layout.showSuccess) Layout.showSuccess('Zámek vypnut');
      }else{
        msSetAppLock('none');
      }
      dal();
    });

    return { showNav:false };
  }
  return { render };
})();
Router.register('app-lock-setup', AppLockScreen);
