/* ==========================================================
   DETAIL ETAPY 209 - technicky prehled ve stylu generatoru PDF
   ========================================================== */
const StageDetailScreen = (function(){
  function render(container, params){
    const key = params.key || msGetCurrentStage();
    const s = msStageByKey(key);
    if(!s){ Router.go('stages'); return { showNav:false }; }

    container.innerHTML = `
      <div class="topbar stage-detail-v2-topbar">
        <div class="back-btn" id="backBtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></div>
        <div class="stage-detail-v2-title">
          <p>DETAIL ETAPY</p>
          <h1 id="stageTitle">${msEsc(s.name)}</h1>
        </div>
        <button class="menu-btn" id="menuBtn" aria-label="Akce etapy"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none"/></svg></button>
        <div id="stageMenu" class="stage-detail-v2-menu">
          <div class="mi" data-c="current">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>Nastavit jako aktuální</div>
          <div class="mi" data-c="closed">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="9" width="16" height="11" rx="1"/><path d="M8 9V6a4 4 0 0 1 8 0v3"/></svg><span id="menuClosedLabel">Uzavřít etapu</span></div>
          <div class="mi is-danger" data-c="delete">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>Odstranit etapu</div>
        </div>
      </div>
      <div class="screen-scroll stage-detail-v2-scroll">
        <div class="house-shot stage-detail-v2-hero" style="--stage-color:${s.color}">
          <img id="stageHeroNeon" src="" alt="" class="house-neon" onerror="this.onerror=null;this.src='house.jpg'"/>
          <img id="stageHeroDark" src="" alt="" class="house-dark" onerror="this.onerror=null;this.src='house-dark.jpg'"/>
          <div class="stage-detail-v2-hero-shade"></div>
          <div class="stage-detail-v2-hero-copy">
            <p>PRŮBĚH ETAPY</p>
            <div class="stage-detail-v2-status"><i></i><span id="stageStatusText"></span></div>
            <h2>${msEsc(s.name)}</h2>
            <span id="stageHeroNote">Souhrn všeho, co k etapě patří</span>
          </div>
        </div>
        <div class="stage-detail-v2-stats" id="heroStats"></div>
        <div class="stage-detail-v2-section-head"><div><p>OBSAH ETAPY</p><h2>Fotky, zápisy, finance a soubory</h2></div></div>
        <div class="stage-detail-v2-grid" id="cardsGrid"></div>
      </div>
    `;
    // OPRAVA (2.8.2026) - viz stejna oprava a vysvetleni v screen-dashboard.js
    container.querySelector('#stageHeroNeon').src = 'house.jpg';
    // OPRAVA (2.8.2026) - viz stejna oprava v screen-dashboard.js
    container.querySelector('#stageHeroDark').src = `stage-${key}-dark.jpg`;
    container.querySelector('#backBtn').addEventListener('click', ()=> Router.back());

    const menu = container.querySelector('#stageMenu');
    container.querySelector('#menuBtn').addEventListener('click', (e)=>{
      e.stopPropagation();
      menu.style.maxHeight = menu.style.maxHeight==='0px'||!menu.style.maxHeight ? '156px' : '0';
    });
    // Stejny pripad jako na dashboardu (11.8.2026) - posluchac se
    // pridaval pri kazdem otevreni etapy a nikdy neodpojoval.
    document.addEventListener('click', function outsideClose(e){
      if(!container.isConnected){ document.removeEventListener('click', outsideClose); return; }
      if(!container.contains(e.target)) return;
      if(!e.target.closest('#stageMenu') && e.target.id!=='menuBtn' && !e.target.closest('#menuBtn')) menu.style.maxHeight='0';
    });
    menu.addEventListener('click', async (e)=>{
      const mi = e.target.closest('.mi'); if(!mi) return;
      menu.style.maxHeight = '0';
      if(mi.dataset.c==='current'){
        if(await Layout.confirmDialog(`Nastavit "${s.name}" jako aktuální etapu?`, 'Nastavit')){
          msSetCurrentStage(key); refresh();
        }
      } else if(mi.dataset.c==='delete'){
        const hasData = msStageHasData(key);
        const msg = hasData
          ? `Etapa "${s.name}" už má připojené výdaje, fotky, dokumenty nebo zápisy v deníku. Ty zůstanou uložené, ale nikde se k nim nedostaneš, dokud etapu znovu nezaložíš. Opravdu odstranit?`
          : `Odstranit etapu "${s.name}"? Etapa zatím nemá nic připojeného.`;
        if(await Layout.confirmDialog(msg, 'Odstranit')){
          msDeleteStage(key);
          Router.go('stages');
        }
      } else {
        const isClosed = msIsStageClosed(key);
        if(isClosed){
          if(await Layout.confirmDialog(`Znovu otevřít etapu "${s.name}"?`, 'Otevřít')){
            msSetStageClosed(key, false); refresh();
          }
        } else {
          if(await Layout.confirmDialog(`Uzavřít etapu "${s.name}"? Bude označená jako dokončená, ale dál se do ní dá cokoliv přidávat. Jde to kdykoliv vzít zpět.`, 'Uzavřít')){
            msSetStageClosed(key, true);
            refresh();
            Router.go('celebration', { title:`Etapa "${s.name}" dokončena!`, photos: msStageStats(key).photos, money: msStageStats(key).spent });
          }
        }
      }
    });

    function heroStat(label, val, accent){
      return `<div style="--stat-color:${accent||'var(--text-main)'}">
        <p>${label}</p>
        <b>${val}</b>
      </div>`;
    }

    function card(id, color, iconSvg, title, count, bodyHtml){
      return `<div class="dcard stage-detail-v2-card" data-id="${id}" style="--card-color:${color}">
        <div class="stage-detail-v2-card-head">
          <i><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconSvg}</svg></i>
          <span><b>${title}</b><small>${count}</small></span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>
        </div>
        <div class="stage-detail-v2-card-body">${bodyHtml}</div>
        <em>${id==='offers'||id==='docs'||id==='important' ? 'Otevřít a spravovat →' : 'Zobrazit vše →'}</em>
      </div>`;
    }

    function lockedCard(title){
      return `<div class="dcard ms-locked-card stage-detail-v2-card is-locked">
        <div>${(typeof msLockIconSvg==='function')?msLockIconSvg(17):''}</div>
        <b>${title}</b>
      </div>`;
    }

    function refresh(){
      const statusLabel = msStageStatusLabel(key);
      container.querySelector('#stageStatusText').textContent = statusLabel;
      const isCur = msGetCurrentStage()===key;
      const isClosed = msIsStageClosed(key);
      container.querySelector('.stage-detail-v2-hero').dataset.state = isClosed ? 'closed' : (isCur ? 'current' : 'open');
      container.querySelector('#stageHeroNote').textContent = isClosed
        ? 'Etapa je uzavřená, její obsah zůstává dostupný'
        : (isCur ? 'Právě probíhající etapa stavby' : 'Etapa je připravená v plánu stavby');
      menu.querySelector('[data-c="current"]').style.display = isCur ? 'none' : 'flex';
      menu.querySelector('#menuClosedLabel').textContent = isClosed ? 'Znovu otevřít etapu' : 'Uzavřít etapu';

      const stats = msStageStats(key);
      const zahajeno = msStageZahajeno(key);
      const importantTotal = msProjectItemsForScope('dulezite', key).filter(i=>!i.folderId).length + msProjectFoldersForScope('dulezite', key).length;
      // "Projekt a povolení" je papirova zalezitost, ne fyzicka prace na
      // stavbe - nema smysl u ni pocitat "den etapy" ani "zahajeno" (zadny
      // fyzicky postup se tam nemeri), takze zustava jen castka
      const canSeeFinance = (typeof msCanViewSection !== 'function' || msCanViewSection('finance'));
      if(key==='projekt_povoleni'){
        container.querySelector('#heroStats').innerHTML =
          heroStat('Stav', msEsc(statusLabel), s.color) +
          (canSeeFinance ? heroStat('Utraceno', stats.spent.toLocaleString('cs-CZ')+' Kč', s.color) : '') +
          heroStat('Dokumenty', stats.documents) +
          heroStat('Důležité', importantTotal);
      } else {
        container.querySelector('#heroStats').innerHTML =
          (canSeeFinance ? heroStat('Utraceno', stats.spent.toLocaleString('cs-CZ')+' Kč', s.color) : '') +
          heroStat('Zahájeno', zahajeno ? zahajeno.slice(8,10)+'. '+zahajeno.slice(5,7)+'.' : '—') +
          heroStat('Den etapy', zahajeno ? msStageDenEtapy(key) : '—') +
          heroStat('Stav', msEsc(statusLabel), s.color);
      }

      const lastPhotos = msLastPhotos(key, 2);
      const photosBody = lastPhotos.length===0
        ? '<div class="stage-detail-v2-empty-preview">Zatím žádné fotky</div>'
        : `<div class="stage-detail-v2-photo-preview">${lastPhotos.map(p=>`<div style="${p.thumb?`background-image:url(${p.thumb})`:'background:linear-gradient(135deg,rgba(255,255,255,.1),rgba(255,255,255,.02))'}"><span>${(p.date||'').slice(8,10)}.${(p.date||'').slice(5,7)}.</span></div>`).join('')}</div>`;

      const lastDiary = msLastDiary(key, 1)[0];
      const diaryBody = `<div class="stage-detail-v2-text-preview">${lastDiary ? msEsc(lastDiary.text) : 'Zatím žádné zápisy'}</div>`;

      const lastExpense = msLastExpenses(key, 1)[0];
      const expBody = `<div class="stage-detail-v2-expense-preview">
        <span>${lastExpense ? msEsc(lastExpense.title) : 'Zatím žádné výdaje'}</span>
        ${lastExpense ? `<b>−${Number(lastExpense.amount||0).toLocaleString('cs-CZ')} Kč</b>` : ''}
      </div>`;

      const offers = msLastOffers(key, 99);
      const offersCount = offers.filter(o=>!o.folderId).length + msProjectFoldersForScope('nabidky', key).length;
      const offersBody = `<div class="stage-detail-v2-file-preview">
        <span>${offers[0] ? msEsc(offers[0].name) : 'Zatím žádné nabídky'}</span>
      </div>`;

      const lastDocs = msLastDocuments(key, 3);
      const docsBody = lastDocs.length
        ? `<div class="stage-detail-v2-doc-preview">${lastDocs.map(d=>`<div><span>PDF</span><b>${msEsc(d.name)}</b></div>`).join('')}</div>`
        : '<div class="stage-detail-v2-empty-preview">Zatím žádné dokumenty</div>';

      const lastImportant = msLastImportant(key, 3);
      const importantCount = lastImportant.filter(i=>!i.folderId).length + msProjectFoldersForScope('dulezite', key).length;
      const impBody = lastImportant.length
        ? `<div class="stage-detail-v2-important-preview">${lastImportant.map(i=>`<div><i></i><b>${msEsc(i.name)}</b></div>`).join('')}</div>`
        : '<div class="stage-detail-v2-empty-preview">Zatím nic důležitého</div>';

      const canView = (typeof msCanViewSection === 'function') ? msCanViewSection : ()=>true;
      container.querySelector('#cardsGrid').innerHTML =
        (key==='projekt_povoleni' ? '' : (!canView('fotky') ? lockedCard('Fotografie') : card('photos', '#b34cff', '<rect x="3" y="6" width="18" height="14" rx="1"/><circle cx="12" cy="13" r="3.5"/>', 'Fotografie', stats.photos+' fotografií', photosBody))) +
        (key==='naradi' || key==='projekt_povoleni' ? '' : (!canView('denik') ? lockedCard('Deník') : card('diary', '#ffd35c', '<path d="M6 3h9l3 3v15H6z"/><path d="M9 10h6M9 14h6"/>', 'Deník', stats.diary+' zápisů', diaryBody))) +
        (!canView('finance') ? lockedCard('Výdaje') : card('expenses', '#4dffab', '<path d="M3 7h15a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z"/><path d="M16 12h4"/>', 'Výdaje', stats.expensesCount+' výdajů', expBody)) +
        (key==='naradi' || key==='projekt_povoleni' ? '' : (!canView('etapy') ? lockedCard('Nabídky') : card('offers', '#ff9b32', '<path d="M20.5 12.5L12 21l-9-9V4h8z"/><circle cx="7.5" cy="7.5" r="1.2"/>', 'Nabídky', offersCount+' položek', offersBody))) +
        (!canView('etapy') ? lockedCard('Dokumenty') : card('docs', '#25b7ff', '<path d="M6 3h9l3 3v15H6z"/><path d="M9 10h6M9 14h6"/>', 'Dokumenty', stats.documents+' dokumentů', docsBody)) +
        (!canView('etapy') ? lockedCard('Důležité') : card('important', '#25e8ff', '<path d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z"/>', 'Důležité', importantCount+' položky', impBody));

      container.querySelectorAll('.ms-locked-card').forEach(el=> el.addEventListener('click', ()=> msShowAccessDenied()));

      container.querySelectorAll('.dcard').forEach(el=>{
        el.addEventListener('click', ()=>{
          const id = el.dataset.id;
          if(id==='photos') Router.go('gallery', {stage:key});
          else if(id==='diary') Router.go('diary', {stage:key});
          else if(id==='expenses') Router.go('stage-expenses', {stage:key});
          else if(id==='offers') Router.go('project', {stage:key, scope:'nabidky'});
          else if(id==='docs') Router.go('project', {stage:key});
          else if(id==='important') Router.go('project', {stage:key, scope:'dulezite'});
        });
      });
    }

    refresh();
    return { activeTab:'stages' };
  }
  return { render };
})();
Router.register('stage-detail', StageDetailScreen);
