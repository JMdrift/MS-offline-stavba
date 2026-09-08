/* ==========================================================
   OFFLINE ONBOARDING
   Bez uctu, prihlaseni, pozvanek a site. Projekt vznikne pouze
   v tomto zarizeni a uzivatel je hned upozornen na zalohovani.
   ========================================================== */
const OnboardingProjectScreen = (function(){
  const FIXED_TYPE = 'Rodinný dům';

  function render(container){
    const isAdditional = msLoadProjects().length > 0;
    container.innerHTML = `
      <div class="offline-onboarding onboarding-v2-screen">
        <div class="onboarding-v2-card">
        <div class="offline-mark setup-v2-icon">
          <svg width="29" height="29" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>
        </div>
        <p class="offline-kicker setup-v2-kicker">Moje Stavba</p>
        <h1>${isAdditional ? 'Přidat další stavbu' : 'Založ svou první stavbu'}</h1>
        <p class="offline-lead">Etapy, peníze, deník, fotky i dokumenty na jednom místě. Bez účtu a bez cloudu — všechno zůstane jen v tomhle telefonu.</p>

        <div class="offline-form-card">
          <label class="f-label" for="fName">Název projektu *</label>
          <input class="f-input" id="fName" autocomplete="off" placeholder="Např. Rodinný dům Novákovi"/>
          <label class="f-label" for="fLocation">Místo stavby *</label>
          <input class="f-input" id="fLocation" autocomplete="street-address" placeholder="Obec, ulice nebo popis místa"/>
          <div class="offline-note">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8v5M12 17h.01"/><circle cx="12" cy="12" r="9"/></svg>
            <span>Smazání aplikace nebo dat prohlížeče může projekt odstranit. Po prvním nastavení si v Nastavení vytvoř zálohu.</span>
          </div>
        </div>

        <button class="btn-primary" id="continueBtn">${isAdditional ? 'Vytvořit projekt' : 'Vytvořit projekt a pokračovat'}</button>
        <!-- DOPLNENO (28.8.2026): obnova ze zalohy driv zila jen v
             Nastaveni - na cerstvem telefonu ji clovek nemel jak najit,
             musel by nejdriv zalozit PRAZDNY projekt, pak teprve narazit
             na "Obnovit ze zalohy" schovane v Nastaveni. ted je hned tady,
             sdilenou funkci z layout.js (msRunBackupImportFlow), stejnou
             jako pouziva Nastaveni - zadna duplicitni logika. -->
        <button class="btn-ghost" id="restoreBackupBtn">Mám zálohu — obnovit</button>
        <input type="file" id="restoreBackupFile" accept="application/json" style="display:none"/>
        ${isAdditional ? '<button class="btn-ghost" id="cancelBtn">Zrušit</button>' : ''}
        </div>
      </div>`;

    container.querySelector('#restoreBackupBtn').addEventListener('click', ()=> container.querySelector('#restoreBackupFile').click());
    container.querySelector('#restoreBackupFile').addEventListener('change', (e)=>{
      const file = e.target.files[0]; if(!file) return;
      e.target.value = '';
      const btn = container.querySelector('#restoreBackupBtn');
      const puvodniText = btn.textContent;
      msRunBackupImportFlow(file, {
        onProgress: (text)=>{ btn.textContent = text; }
      }).finally(()=>{ btn.textContent = puvodniText; });
    });

    if(isAdditional){
      container.querySelector('#cancelBtn').addEventListener('click', ()=> Router.go('settings'));
    }
    container.querySelector('#continueBtn').addEventListener('click', ()=>{
      const name = container.querySelector('#fName').value.trim();
      const location = container.querySelector('#fLocation').value.trim();
      if(!name || !location){ alert('Vyplň prosím název projektu a místo stavby.'); return; }
      // (28.8.2026) Prvni projekt smi zalozit vzdy - tim zacina zkusebni
      // doba. Kazdy DALSI uz podleha limitu (viz msMaxAllowedProjects
      // v data.js) - bez aktivniho predplatneho nebo dokoupeneho slotu
      // appka posle na platebni branu misto zalozeni.
      if(isAdditional && !msCanCreateAnotherProject()){
        Router.go('paywall', { reason:'extra-project' });
        return;
      }
      msCreateProject({ name, type:FIXED_TYPE, location });
      msSetOnboarded();
      Router.go(isAdditional ? 'dashboard' : 'tour-welcome');
    });
    return { showNav:false };
  }

  return { render };
})();
Router.register('onboarding-project', OnboardingProjectScreen);
