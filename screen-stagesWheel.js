/* ==========================================================
   ETAPY 208 - jednotný přehled místo carouselu.
   ========================================================== */
const StagesOverviewV2 = (function(){
  function render(container){
    let reorderMode = false;
    let dragState = null;

    const projects = msLoadProjects();
    const activeProject = projects.find(project=>project.id===msGetActiveProjectId()) || projects[0] || null;
    const stageAddLocked = !!(activeProject && activeProject.isShared);
    const noStagesAccess = typeof msCanViewSection === 'function' && !msCanViewSection('etapy');
    const canView = section => typeof msCanViewSection !== 'function' || msCanViewSection(section);

    container.innerHTML = `
      <div class="topbar stage-overview-topbar">
        <div class="stage-overview-title"><p>PŘEHLED STAVBY</p><h1>Etapy</h1></div>
        <button class="stage-overview-new" id="newStageBtn" aria-label="Přidat novou etapu">${plusIcon()}<span>Nová etapa</span></button>
        <button class="stage-overview-settings" id="settingsBtn" aria-label="Nastavení">${settingsIcon()}</button>
      </div>
      <div class="screen-scroll stage-overview-scroll">
        <section id="currentStageHero"></section>
        <section class="stage-overview-summary" id="stageSummary"></section>
        <div class="stage-overview-section-head" id="listHead">
          <div><p>VŠECHNY ETAPY</p><h2 id="stageCount"></h2></div>
          <button id="reorderBtn">Upravit pořadí</button>
        </div>
        <p class="stage-overview-reorder-note" id="reorderNote" hidden>Etapy přesuneš tažením za úchyt vpravo. Aktuální etapa přitom zůstane beze změny.</p>
        <div class="stage-overview-list" id="stageList"></div>
      </div>`;

    container.querySelector('#settingsBtn').addEventListener('click', ()=>Router.go('settings'));
    const newStageBtn = container.querySelector('#newStageBtn');
    if(stageAddLocked) newStageBtn.dataset.locked = '1';
    newStageBtn.addEventListener('click', ()=>{
      if(stageAddLocked){ alert('Novou etapu může založit jen vlastník stavby.'); return; }
      Router.go('new-stage');
    });

    const reorderBtn = container.querySelector('#reorderBtn');
    reorderBtn.addEventListener('click', ()=>{
      if(noStagesAccess || stageAddLocked){ if(typeof msShowAccessDenied==='function') msShowAccessDenied(); return; }
      reorderMode = !reorderMode;
      reorderBtn.textContent = reorderMode ? 'Hotovo' : 'Upravit pořadí';
      reorderBtn.dataset.on = reorderMode ? '1' : '0';
      container.querySelector('#reorderNote').hidden = !reorderMode;
      drawList();
    });

    refresh();

    function refresh(){
      const keys = msOrderedStageKeys();
      const stages = keys.map(msStageByKey).filter(Boolean);
      container.querySelector('#stageCount').textContent = `${stages.length} ${stageWord(stages.length)}`;

      if(!stages.length){
        container.querySelector('#currentStageHero').innerHTML = `<div class="stage-overview-empty">${layersIcon()}<h2>Zatím žádná etapa</h2><p>Etapy jsou kostra stavby. Přidej první etapu a začni k ní řadit zápisy, fotografie, dokumenty a výdaje.</p><button id="emptyAdd">${stageAddLocked?'Jen vlastník může přidat etapu':'Přidat první etapu'}</button></div>`;
        container.querySelector('#stageSummary').hidden = true;
        container.querySelector('#listHead').hidden = true;
        container.querySelector('#stageList').innerHTML = '';
        container.querySelector('#emptyAdd').addEventListener('click', ()=>{
          if(stageAddLocked){ alert('Novou etapu může založit jen vlastník stavby.'); return; }
          Router.go('new-stage');
        });
        return;
      }

      container.querySelector('#stageSummary').hidden = false;
      container.querySelector('#listHead').hidden = false;
      drawHero(stages);
      drawSummary(keys);
      drawList();
    }

    function drawHero(stages){
      const currentKey = msGetCurrentStage();
      const stage = stages.find(item=>item.key===currentKey) || stages[0];
      if(!stage) return;
      const stats = msStageStats(stage.key);
      const started = msStageZahajeno(stage.key);
      const day = started ? msStageDenEtapy(stage.key) : 0;
      const status = msStageStatusLabel(stage.key);
      const imageKey = encodeURIComponent(stage.key);
      container.querySelector('#currentStageHero').innerHTML = `
        <article class="stage-overview-hero" data-key="${attr(stage.key)}">
          <div class="stage-overview-hero-copy">
            <p>AKTUÁLNÍ ETAPA</p>
            <h2>${msEsc(stage.name)}</h2>
            <span><b>${msEsc(status)}</b>${day?` · ${day}. den etapy`:''}</span>
            ${canView('finance')?`<span>Utraceno <strong>${stats.spent.toLocaleString('cs-CZ')} Kč</strong></span>`:''}
            <button id="openCurrentStage">Otevřít detail →</button>
          </div>
          <img src="stage-${imageKey}-dark.jpg" alt="" onerror="this.onerror=null;this.src='house-dark.jpg'"/>
        </article>`;
      container.querySelector('#openCurrentStage').addEventListener('click', event=>{
        event.stopPropagation();
        if(noStagesAccess){ if(typeof msShowAccessDenied==='function') msShowAccessDenied(); return; }
        Router.go('stage-detail', {key:stage.key});
      });
      container.querySelector('.stage-overview-hero').addEventListener('click', ()=>{
        if(noStagesAccess){ if(typeof msShowAccessDenied==='function') msShowAccessDenied(); return; }
        Router.go('stage-detail', {key:stage.key});
      });
    }

    function drawSummary(keys){
      const completed = keys.filter(key=>msStageStatus(key)==='uzavrena').length;
      const running = keys.filter(key=>['aktualni','probiha'].includes(msStageStatus(key))).length;
      const waiting = keys.filter(key=>msStageStatus(key)==='nezahajeno').length;
      container.querySelector('#stageSummary').innerHTML = `
        <div class="is-complete"><span>DOKONČENÉ</span><b>${completed}</b></div>
        <div class="is-running"><span>PROBÍHÁ</span><b>${running}</b></div>
        <div><span>ČEKAJÍ</span><b>${waiting}</b></div>`;
    }

    function drawList(){
      const list = container.querySelector('#stageList');
      const keys = msOrderedStageKeys();
      list.innerHTML = '';

      keys.forEach((key,index)=>{
        const stage = msStageByKey(key);
        if(!stage) return;
        const stats = msStageStats(key);
        const status = msStageStatus(key);
        const statusLabel = status==='uzavrena' ? 'Dokončeno' : status==='aktualni' ? 'Aktuální' : status==='probiha' ? 'Probíhá' : 'Čeká';
        const row = document.createElement('article');
        row.className = `stage-overview-row is-${status}${reorderMode?' is-reordering':''}${noStagesAccess?' is-locked':''}`;
        row.dataset.key = key;
        row.style.setProperty('--stage-color', stage.color || 'var(--accent)');

        const statItems = [
          canView('denik') ? statButton('diary', diaryIcon(), stats.diary, countWord(stats.diary,'zápis','zápisy','zápisů')) : '',
          canView('fotky') ? statButton('gallery', cameraIcon(), stats.photos, countWord(stats.photos,'fotka','fotky','fotek')) : '',
          canView('etapy') ? statButton('project', documentIcon(), stats.documents, 'dok.') : '',
          canView('finance') ? statButton('stage-expenses', walletIcon(), stats.expensesCount, countWord(stats.expensesCount,'výdaj','výdaje','výdajů')) : '',
        ].join('');

        row.innerHTML = `
          <span class="stage-overview-index">${String(index+1).padStart(2,'0')}</span>
          <span class="stage-overview-stage-icon">${msStageIconSvg(key,20)}</span>
          <div class="stage-overview-row-main">
            <div class="stage-overview-row-title"><h3>${msEsc(stage.name)}</h3><span>${statusLabel}</span></div>
            <div class="stage-overview-row-sub">${canView('finance')?`<b>${stats.spent?stats.spent.toLocaleString('cs-CZ')+' Kč':'0 Kč'}</b>`:''}</div>
            <div class="stage-overview-row-stats">${statItems}</div>
          </div>
          ${reorderMode?`<button class="stage-overview-drag" aria-label="Přesunout etapu">${dragIcon()}</button>`:`<div class="stage-overview-row-actions"><button class="stage-overview-open" aria-label="Otevřít detail">${arrowIcon()}</button><button class="stage-overview-menu" aria-label="Správa etapy">${moreIcon()}</button></div>`}`;

        if(reorderMode){
          attachDrag(row, row.querySelector('.stage-overview-drag'), list);
        }else{
          row.addEventListener('click', event=>{
            if(event.target.closest('button')) return;
            if(noStagesAccess){ if(typeof msShowAccessDenied==='function') msShowAccessDenied(); return; }
            Router.go('stage-detail', {key});
          });
          row.querySelector('.stage-overview-open').addEventListener('click', ()=>{
            if(noStagesAccess){ if(typeof msShowAccessDenied==='function') msShowAccessDenied(); return; }
            Router.go('stage-detail', {key});
          });
          row.querySelector('.stage-overview-menu').addEventListener('click', ()=>openStageMenu(key));
          row.querySelectorAll('.stage-overview-stat').forEach(button=>button.addEventListener('click', ()=>openStageSection(button.dataset.route,key)));
        }
        list.appendChild(row);
      });
    }

    function attachDrag(row, handle, list){
      handle.addEventListener('pointerdown', event=>{
        event.preventDefault();
        dragState = {row,startY:event.clientY,moved:false};
        row.classList.add('is-dragging');
        handle.setPointerCapture(event.pointerId);
      });
      handle.addEventListener('pointermove', event=>{
        if(!dragState || dragState.row!==row) return;
        const dy = event.clientY-dragState.startY;
        if(Math.abs(dy)>5) dragState.moved=true;
        if(!dragState.moved) return;
        row.style.transform=`translateY(${dy}px)`;
        const over = document.elementFromPoint(event.clientX,event.clientY)?.closest('.stage-overview-row');
        if(over && over!==row && list.contains(over)){
          const rows=[...list.children];
          const from=rows.indexOf(row), to=rows.indexOf(over);
          if(to<from) list.insertBefore(row,over); else list.insertBefore(row,over.nextSibling);
          row.style.transform='';
          dragState.startY=event.clientY;
        }
      });
      const finish=()=>{
        if(!dragState || dragState.row!==row) return;
        row.style.transform=''; row.classList.remove('is-dragging');
        if(dragState.moved) msSetStageOrder([...list.children].map(item=>item.dataset.key));
        dragState=null;
      };
      handle.addEventListener('pointerup',finish);
      handle.addEventListener('pointercancel',finish);
    }

    async function openStageMenu(key){
      if(noStagesAccess || stageAddLocked){ if(typeof msShowAccessDenied==='function') msShowAccessDenied(); return; }
      const stage = msStageByKey(key); if(!stage) return;
      const isCurrent = msGetCurrentStage()===key;
      const isClosed = msIsStageClosed(key);
      const choice = await stageMenuChoice(stage,isCurrent,isClosed);
      if(choice==='current'){
        if(await Layout.confirmDialog(`Nastavit „${stage.name}“ jako aktuální etapu?`, 'Nastavit')){
          msSetCurrentStage(key); refresh();
        }
      }else if(choice==='closed'){
        const message = isClosed ? `Znovu otevřít etapu „${stage.name}“?` : `Uzavřít etapu „${stage.name}“? Bude označená jako dokončená, ale její obsah zůstane dostupný.`;
        if(await Layout.confirmDialog(message,isClosed?'Otevřít':'Uzavřít')){
          msSetStageClosed(key,!isClosed); refresh();
        }
      }else if(choice==='delete'){
        const hasData = msStageHasData(key);
        const message = hasData
          ? `Etapa „${stage.name}“ už obsahuje zápisy, fotografie, dokumenty nebo výdaje. Data se nesmažou, ale bez opětovného přidání etapy k nim nepůjde přistupovat. Opravdu ji odstranit?`
          : `Odstranit etapu „${stage.name}“?`;
        if(await Layout.confirmDialog(message,'Odstranit')){
          msDeleteStage(key); refresh();
        }
      }
    }

    function stageMenuChoice(stage,isCurrent,isClosed){
      return new Promise(resolve=>{
        const overlay=document.createElement('div'); overlay.className='ms-overlay stage-overview-overlay';
        overlay.innerHTML=`<div class="stage-overview-sheet"><header><p>SPRÁVA ETAPY</p><h2>${msEsc(stage.name)}</h2></header>
          ${isCurrent?'':`<button data-choice="current">${currentIcon()}<span><b>Nastavit jako aktuální</b><small>Začne se počítat další aktivní den etapy</small></span></button>`}
          <button data-choice="closed">${isClosed?unlockIcon():checkIcon()}<span><b>${isClosed?'Znovu otevřít etapu':'Označit jako dokončenou'}</b><small>${isClosed?'Etapa se vrátí mezi rozpracované':'Obsah etapy zůstane dostupný'}</small></span></button>
          <button data-choice="delete" class="is-danger">${trashIcon()}<span><b>Odstranit etapu</b><small>Připojená data se fyzicky nesmažou</small></span></button>
          <button data-choice="cancel" class="is-cancel">Zrušit</button></div>`;
        document.body.appendChild(overlay);
        overlay.addEventListener('click',event=>{
          const button=event.target.closest('[data-choice]');
          if(!button && event.target!==overlay) return;
          const choice=button?button.dataset.choice:null;
          overlay.remove(); resolve(choice==='cancel'?null:choice);
        });
      });
    }

    function openStageSection(route,key){
      if(route==='project') Router.go('project',{stage:key});
      else Router.go(route,{stage:key});
    }

    return {activeTab:'stages'};
  }

  function attr(value){ return String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char])); }
  function stageWord(n){ return n===1?'etapa':(n>=2&&n<=4?'etapy':'etap'); }
  function countWord(n,one,few,many){ return n===1?one:(n>=2&&n<=4?few:many); }
  function statButton(route,icon,count,label){ return `<button class="stage-overview-stat" data-route="${route}">${icon}<span>${count} ${label}</span></button>`; }
  function svg(path,extra=''){ return `<svg viewBox="0 0 24 24" aria-hidden="true" ${extra}>${path}</svg>`; }
  function plusIcon(){ return svg('<path d="M12 5v14M5 12h14"/>'); }
  function settingsIcon(){ return svg('<circle cx="12" cy="12" r="3"/><path d="M19 14.5l2 1.2-2 3.5-2.1-1a8 8 0 0 1-2.3 1.3L14.4 22h-4.8l-.2-2.5A8 8 0 0 1 7.1 18L5 19.2l-2-3.5 2-1.2a8 8 0 0 1 0-2.8L3 10.5 5 7l2.1 1.1a8 8 0 0 1 2.3-1.4L9.6 4h4.8l.2 2.7a8 8 0 0 1 2.3 1.4L19 7l2 3.5-2 1.2a8 8 0 0 1 0 2.8z"/>'); }
  function arrowIcon(){ return svg('<path d="M9 5l7 7-7 7"/>'); }
  function moreIcon(){ return svg('<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>'); }
  function dragIcon(){ return svg('<path d="M8 7h8M8 12h8M8 17h8"/>'); }
  function diaryIcon(){ return svg('<path d="M6 3h9l3 3v15H6z"/><path d="M9 10h6M9 14h6"/>'); }
  function cameraIcon(){ return svg('<rect x="3" y="6" width="18" height="14"/><circle cx="12" cy="13" r="3"/><path d="M8 6l1-2h6l1 2"/>'); }
  function documentIcon(){ return svg('<path d="M6 3h9l3 3v15H6z"/><path d="M9 11h6M9 15h6"/>'); }
  function walletIcon(){ return svg('<path d="M4 6h14a3 3 0 0 1 3 3v9H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h10"/><path d="M16 11h5"/>'); }
  function layersIcon(){ return svg('<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>'); }
  function currentIcon(){ return svg('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>'); }
  function checkIcon(){ return svg('<path d="M5 13l4 4L19 7"/>'); }
  function unlockIcon(){ return svg('<rect x="5" y="10" width="14" height="10"/><path d="M9 10V7a4 4 0 0 1 7-2"/>'); }
  function trashIcon(){ return svg('<path d="M4 6h16M9 6V4h6v2M18 6l-1 14H7L6 6"/>'); }

  return {render};
})();
Router.register('stages', StagesOverviewV2);
