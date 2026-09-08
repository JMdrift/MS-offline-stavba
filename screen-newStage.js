/* ==========================================================
   NOVA ETAPA
   ========================================================== */
const NewStageScreen = (function(){
  function render(container){
    // OPRAVA (2.8.2026): zalozeni nove etapy je vyhrazene jen
    // vlastnikovi - zamek uz je videt na tlacitku, kterym se sem chodi
    // (viz screen-stagesWheel.js), ale tady je jeste jednou pro jistotu
    // primo v cilove obrazovce, kdyby se sem nekdo dostal jinak (napr.
    // pres historii prohlizece).
    const activeProjForRights = (typeof msActiveProjectForRights === 'function') ? msActiveProjectForRights() : null;
    if(activeProjForRights && activeProjForRights.isShared){
      if(typeof msShowAccessDenied === 'function') msShowAccessDenied();
      Router.go('stages');
      return { activeTab:'stages' };
    }
    const selectedKeys = msSelectedStageKeys();
    const PRESETS = MS_STAGES.filter(s => !selectedKeys.includes(s.key));
    let selectedTile = null;
    let asCurrent = false;
    const CUSTOM_TILE = {key:'vlastni', name:'Vlastní', color:'#f5f7ff', isCustom:true};

    container.classList.add('new-stage-v2-screen');

    container.innerHTML = `
      <div class="topbar new-stage-v2-topbar">
        <div class="back-btn" id="backBtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></div>
        <div class="new-stage-v2-title"><p>Etapy</p><h1>Nová etapa</h1></div>
      </div>
      <div class="screen-scroll new-stage-v2-scroll">
        <section class="new-stage-v2-intro">
          <div><p>NOVÁ ČÁST STAVBY</p><h2>Co bude následovat?</h2><span>Vyber připravený typ, nebo si vytvoř vlastní etapu.</span></div>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 19h16M5 17V9l7-5 7 5v8M9 17v-5h6v5"/></svg>
        </section>

        <div class="new-stage-v2-section"><h2>Základní údaje</h2></div>
        <button id="customTile" class="new-stage-v2-custom">
          <span class="new-stage-v2-custom-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></span>
          <span><b>Vlastní etapa</b><small>Zadej úplně vlastní název</small></span>
          <svg class="new-stage-v2-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><path d="M9 6l6 6-6 6"/></svg>
        </button>
        <label class="new-stage-v2-field"><span>Název etapy</span><input class="f-input" id="nameField" placeholder="Např. Základy"/></label>

        <div class="new-stage-v2-section"><h2>Vyber typ etapy</h2><span id="presetCount">${PRESETS.length} možností</span></div>
        <div id="tileGrid" class="new-stage-v2-grid"></div>

        <button id="currentRow" class="new-stage-v2-current">
          <span class="new-stage-v2-current-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 13l4 4L19 7"/></svg></span>
          <span><b>Nastavit jako aktuální</b><small>Etapa se rovnou zobrazí jako probíhající</small></span>
          <span id="switchEl" class="new-stage-v2-switch"><i></i></span>
        </button>
      </div>
      <div class="new-stage-v2-footer">
        <button class="btn-primary" id="saveBtn" disabled>Uložit etapu</button>
      </div>
    `;
    container.querySelector('#backBtn').addEventListener('click', ()=> Router.back());

    function selectCustomTile(){
      selectedTile = CUSTOM_TILE;
      grid.querySelectorAll('.new-stage-v2-preset').forEach(d=>d.classList.remove('is-selected'));
      customTileEl.classList.add('is-selected');
      const nameField = container.querySelector('#nameField');
      nameField.value=''; nameField.placeholder='Zadej název etapy'; nameField.focus();
      validate();
    }
    const customTileEl = container.querySelector('#customTile');
    customTileEl.addEventListener('click', selectCustomTile);

    const grid = container.querySelector('#tileGrid');
    const themeNameNS = document.documentElement.dataset.theme;
    const themedNS = themeNameNS === 'sketch' || themeNameNS === 'sketch-dark';
    // Stejne jako u seznamu etap - odstinovani do bila na konci mrizky
    // pusobilo spatne, misto toho jednotny tlumeny cihlovy ton pro vsechny.
    const mutedAccentNS = themedNS ? 'color-mix(in srgb, var(--accent) 55%, var(--line))' : null;
    PRESETS.forEach((p)=>{
      const el = document.createElement('button');
      const tileColor = themedNS ? mutedAccentNS : p.color;
      el.type = 'button';
      el.className = 'stage-icon-colored new-stage-v2-preset';
      el.style.setProperty('--stage-color', tileColor);
      el.innerHTML = `<span>${msStageIconSvg(p.key, 22)}</span><b>${msEsc(p.name)}</b>`;
      el.addEventListener('click', ()=>{
        selectedTile = p;
        grid.querySelectorAll('.new-stage-v2-preset').forEach(d=>d.classList.remove('is-selected'));
        customTileEl.classList.remove('is-selected');
        el.classList.add('is-selected');
        container.querySelector('#nameField').value = p.name;
        validate();
      });
      grid.appendChild(el);
    });

    const switchEl = container.querySelector('#switchEl');
    container.querySelector('#currentRow').addEventListener('click', ()=>{
      asCurrent = !asCurrent;
      switchEl.classList.toggle('is-on', asCurrent);
    });

    const saveBtn = container.querySelector('#saveBtn');
    function validate(){
      const nameOk = container.querySelector('#nameField').value.trim().length>0;
      const ok = selectedTile && nameOk;
      saveBtn.disabled = !ok;
      saveBtn.classList.toggle('is-ready', !!ok);
    }
    container.querySelector('#nameField').addEventListener('input', validate);

    saveBtn.addEventListener('click', ()=>{
      if(saveBtn.disabled) return;
      // (28.8.2026) Kontrola naroku - zalozeni nove etapy je vzdy
      // "pridani noveho dat", zadny rezim upravy tu neni.
      if(typeof msCanAddContent === 'function' && !msCanAddContent()){
        Router.go('paywall', { reason:'trial-expired' });
        return;
      }
      let key;
      if(selectedTile.isCustom){
        const name = container.querySelector('#nameField').value.trim();
        const color = MS_STAGES.length ? ['#b34cff','#25e8ff','#4dffab','#ffd35c','#ff9b32','#ff5e7b','#25b7ff'][msCustomStages().length % 7] : '#b34cff';
        const created = msAddCustomStage(name, color);
        if(!created){ alert('Etapu se nepodařilo uložit. Zkontroluj volné místo v zařízení.'); return; }
        key = created.key;
      } else {
        key = selectedTile.key;
      }
      msAddSelectedStage(key);
      if(asCurrent) msSetCurrentStage(key);
      Router.go('stages');
    });

    return { activeTab:'stages' };
  }
  return { render };
})();
Router.register('new-stage', NewStageScreen);
