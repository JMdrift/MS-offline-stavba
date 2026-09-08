/* ==========================================================
   DENÍK 206 - přehled ve stejném tiskovém designu jako generátor.
   ========================================================== */
const DiaryScreenV2 = (function(){
  const WEATHER = {slunecno:'Slunečno',zatazeno:'Zataženo',dest:'Déšť',snih:'Sníh',mraz:'Mráz'};

  function render(container, params){
    const state = {
      stage:params && params.stage ? params.stage : 'all',
      mode:'all', query:'', from:'', to:'', filtersOpen:false
    };

    container.innerHTML = `
      <div class="topbar diary-v2-topbar">
        <div><p class="pdf-step-kicker">Stavební dokumentace</p><h1>Stavební deník</h1></div>
        <button class="diary-v2-top-action" id="filterBtn" aria-label="Filtrovat zápisy">${filterIcon()}</button>
        <button class="diary-v2-pdf-action" id="genBtn">PDF</button>
        <button class="diary-v2-top-action is-primary" id="addBtn" aria-label="Nový zápis">${plusIcon()}</button>
      </div>
      <div class="screen-scroll diary-v2-scroll">
        <section class="diary-v2-hero">
          <div><p>PRŮBĚH STAVBY</p><h2>Zápisy z realizace</h2><span id="heroSummary"></span></div>
          ${bookIcon()}
        </section>

        <section class="diary-v2-print" id="printCard">
          <div class="diary-v2-print-icon">${printIcon()}</div>
          <div><p id="printKicker"></p><h3 id="printTitle"></h3><span id="printText"></span></div>
          <button id="printBtn">Připravit tisk →</button>
        </section>

        <section class="diary-v2-filter-panel" id="filterPanel" hidden>
          <p class="pdf-section-no">FILTROVÁNÍ</p>
          <label class="diary-v2-search">${searchIcon()}<input id="searchInput" placeholder="Hledat v zápisech, materiálu nebo přílohách"/></label>
          <div class="diary-v2-filter-grid">
            <label><span>Etapa</span><select id="stageSelect"><option value="all">Všechny etapy</option>${msSelectedStages().filter(stage=>stage.key!=='naradi').map(stage=>`<option value="${attr(stage.key)}" ${stage.key===state.stage?'selected':''}>${msEsc(stage.name)}</option>`).join('')}</select></label>
            <label><span>Od</span><input id="dateFrom" type="date"/></label>
            <label><span>Do</span><input id="dateTo" type="date"/></label>
          </div>
          <button class="diary-v2-clear" id="clearFilters">Zrušit filtry</button>
        </section>

        <div class="diary-v2-chips" role="group" aria-label="Rychlé filtry">
          <button data-mode="all" data-on="1">Všechny</button>
          <button data-mode="new" data-on="0">K vytištění <span id="newCount"></span></button>
          <button data-mode="supervisor" data-on="0">Kontrola dozoru <span id="supervisorCount"></span></button>
          <button data-mode="warning" data-on="0">Ke kontrole <span id="warningCount"></span></button>
        </div>

        <div class="diary-v2-list" id="entries"></div>
      </div>`;

    container.querySelector('#addBtn').addEventListener('click', ()=> Router.go('diary-add', state.stage!=='all'?{stage:state.stage}:{}));
    container.querySelector('#genBtn').addEventListener('click', ()=> Router.go('diary-export',{range:msDiaryUnprintedEntries().length?'new':'all',stage:state.stage}));
    container.querySelector('#printBtn').addEventListener('click', ()=> Router.go('diary-export',{range:msDiaryUnprintedEntries().length?'new':'all',stage:state.stage}));
    container.querySelector('#filterBtn').addEventListener('click', ()=>{
      state.filtersOpen = !state.filtersOpen;
      container.querySelector('#filterPanel').hidden = !state.filtersOpen;
      container.querySelector('#filterBtn').dataset.on = state.filtersOpen?'1':'0';
    });

    container.querySelector('#searchInput').addEventListener('input', event=>{ state.query=event.target.value.trim().toLocaleLowerCase('cs'); draw(); });
    container.querySelector('#stageSelect').addEventListener('change', event=>{ state.stage=event.target.value; draw(); });
    container.querySelector('#dateFrom').addEventListener('change', event=>{ state.from=event.target.value; draw(); });
    container.querySelector('#dateTo').addEventListener('change', event=>{ state.to=event.target.value; draw(); });
    container.querySelector('#clearFilters').addEventListener('click', ()=>{
      state.stage='all'; state.query=''; state.from=''; state.to='';
      container.querySelector('#stageSelect').value='all';
      container.querySelector('#searchInput').value='';
      container.querySelector('#dateFrom').value='';
      container.querySelector('#dateTo').value='';
      draw();
    });
    container.querySelectorAll('.diary-v2-chips button').forEach(button=> button.addEventListener('click', ()=>{
      state.mode=button.dataset.mode;
      container.querySelectorAll('.diary-v2-chips button').forEach(item=> item.dataset.on=item===button?'1':'0');
      draw();
    }));

    function allEntries(){ return msDiaryNumbered().filter(entry=>entry.stage!=='naradi'); }
    function draw(){
      const entries = allEntries();
      const printed = msDiaryPrintedEntryIds();
      const newEntries = entries.filter(entry=>!printed.has(entry.id));
      const supervisor = entries.filter(entry=>entry.important && !entry.supervisorConfirmedAt);
      const warnings = entries.filter(entry=>entryWarnings(entry).length);
      const batches = msDiaryPrintBatches();
      const lastBatch = batches[batches.length-1] || null;
      container.querySelector('#heroSummary').textContent = `${entries.length} ${entryWord(entries.length)} · ${entries.reduce((sum,entry)=>sum+photoCount(entry),0)} fotografií`;
      container.querySelector('#newCount').textContent = newEntries.length;
      container.querySelector('#supervisorCount').textContent = supervisor.length;
      container.querySelector('#warningCount').textContent = warnings.length;
      container.querySelector('#printKicker').textContent = newEntries.length ? 'OD POSLEDNÍHO TISKU' : 'TISKOVÉ ČÁSTI';
      container.querySelector('#printTitle').textContent = newEntries.length ? `${newEntries.length} ${newEntries.length===1?'nový zápis':(newEntries.length<5?'nové zápisy':'nových zápisů')}` : 'Vše je vytištěné';
      container.querySelector('#printText').textContent = lastBatch ? `Poslední část č. ${lastBatch.number} · listy ${lastBatch.firstPage}-${lastBatch.lastPage}` : 'Zatím nebyla uzavřena žádná tisková část';
      container.querySelector('#printBtn').textContent = newEntries.length ? 'Připravit tisk →' : 'Otevřít generátor →';

      let visible = entries.filter(entry=>{
        if(state.stage!=='all' && entry.stage!==state.stage) return false;
        if(state.from && entry.date<state.from) return false;
        if(state.to && entry.date>state.to) return false;
        if(state.mode==='new' && printed.has(entry.id)) return false;
        if(state.mode==='supervisor' && (!entry.important || entry.supervisorConfirmedAt)) return false;
        if(state.mode==='warning' && !entryWarnings(entry).length) return false;
        if(state.query && !searchText(entry).includes(state.query)) return false;
        return true;
      });
      visible = visible.sort((a,b)=>(b.number||0)-(a.number||0));
      const wrap = container.querySelector('#entries');
      if(!visible.length){
        wrap.innerHTML = `<div class="diary-v2-empty">${entries.length?filterIcon():bookIcon()}<h3>${entries.length?'Filtru nic neodpovídá':'Zatím žádný zápis'}</h3><p>${entries.length?'Zkus zrušit některý filtr.':'Přidej první skutečný záznam z průběhu stavby.'}</p>${entries.length?'':`<button id="emptyAdd">Přidat první zápis</button>`}</div>`;
        const emptyAdd=wrap.querySelector('#emptyAdd'); if(emptyAdd) emptyAdd.addEventListener('click',()=>Router.go('diary-add'));
        return;
      }
      const groups = new Map();
      visible.forEach(entry=>{ if(!groups.has(entry.date)) groups.set(entry.date,[]); groups.get(entry.date).push(entry); });
      wrap.innerHTML = [...groups.entries()].map(([date,items])=>`
        <section class="diary-v2-day">
          <header><div><span>${weekday(date)}</span><h3>${formatDate(date)}</h3></div><b>${items.length} ${entryWord(items.length)}</b></header>
          ${items.map(entry=> entryCard(entry, printed.has(entry.id))).join('')}
        </section>`).join('');
      wrap.querySelectorAll('.diary-v2-entry').forEach(card=> card.addEventListener('click', event=>{
        if(event.target.closest('[data-edit]')) return;
        const entry=msDiaryEntryById(card.dataset.id); if(entry) showDetail(entry);
      }));
      wrap.querySelectorAll('[data-edit]').forEach(button=> button.addEventListener('click', event=>{
        event.stopPropagation(); Router.go('diary-add',{edit:button.dataset.edit});
      }));
    }

    function entryCard(entry, locked){
      const stage=msStageByKey(entry.stage);
      const photos=entryPhotos(entry);
      const attachments=entryAttachments(entry);
      const warnings=entryWarnings(entry);
      const meta=[];
      if(entry.worker) meta.push(entry.worker);
      if(entry.workerCount!=null) meta.push(`${entry.workerCount} ${entry.workerCount===1?'pracovník':'pracovníci'}`);
      if(entry.weather) meta.push(`${WEATHER[entry.weather]||entry.weather}${entry.temperature!=null?' · '+entry.temperature+' °C':''}`);
      if(entry.material) meta.push(entry.material);
      return `<article class="diary-v2-entry" data-id="${attr(entry.id)}" style="--entry-color:${stage?stage.color:'var(--muted)'}">
        <div class="diary-v2-entry-head">
          <span class="diary-v2-number">Č. ${entry.number}</span>
          <b>${stage?msEsc(stage.name):'Bez etapy'}</b>
          <time>${entry.time||''}</time>
          ${locked?`<span class="diary-v2-lock">${lockIcon()} Vytištěno</span>`:''}
          ${!locked?`<button data-edit="${attr(entry.id)}" aria-label="Upravit zápis">${pencilIcon()}</button>`:''}
        </div>
        ${entry.important?`<div class="diary-v2-supervisor" data-done="${entry.supervisorConfirmedAt?'1':'0'}">${stampIcon()} <span>${entry.supervisorConfirmedAt?'Potvrzeno dozorem na papíře':'Vyžaduje kontrolu stavebního dozoru'}</span></div>`:''}
        ${entry.title?`<h3>${msEsc(entry.title)}</h3>`:''}
        <p class="diary-v2-excerpt">${msEsc(shortText(entry.text||'(zápis bez textu)',190))}</p>
        ${meta.length?`<div class="diary-v2-meta">${meta.slice(0,4).map(value=>`<span>${msEsc(value)}</span>`).join('')}</div>`:''}
        ${photos.length?`<div class="diary-v2-photos">${photos.slice(0,3).map(photo=>`<i style="background-image:url('${safeCssUrl(photo)}')"></i>`).join('')}${photos.length>3?`<i class="is-more">+${photos.length-3}</i>`:''}</div>`:''}
        <footer>
          <span>${photoIcon()} ${photos.length} fotek</span>
          <span>${clipIcon()} ${attachments.length} příloh</span>
          ${warnings.length?`<span class="is-warning">${alertIcon()} ${warnings[0]}</span>`:''}
          <b>Detail →</b>
        </footer>
      </article>`;
    }

    function showDetail(entry){
      const current=msDiaryEntryById(entry.id) || entry;
      const locked=msDiaryEntryIsPrinted(current.id);
      const stage=msStageByKey(current.stage);
      const photos=entryPhotos(current);
      const attachments=entryAttachments(current);
      const overlay=document.createElement('div'); overlay.className='diary-v2-overlay';
      overlay.innerHTML=`<div class="diary-v2-detail">
        <header><div><p class="pdf-step-kicker">Zápis č. ${current.number||msDiaryNumbered().find(item=>item.id===current.id)?.number||''}</p><h2>${formatDate(current.date)}</h2></div><button id="detailClose">×</button></header>
        <div class="diary-v2-detail-stage" style="--entry-color:${stage?stage.color:'var(--muted)'}"><span>${stage?msEsc(stage.name):'Bez etapy'}</span><time>${current.time||''}</time>${locked?`<b>${lockIcon()} Uzavřený zápis</b>`:''}</div>
        ${current.important?`<button class="diary-v2-supervisor-action" id="supervisorToggle" data-done="${current.supervisorConfirmedAt?'1':'0'}">${stampIcon()}<span><b>${current.supervisorConfirmedAt?'Potvrzeno na papíře':'Čeká na kontrolu dozorem'}</b><small>${current.supervisorConfirmedAt?'Klepnutím vrátíš mezi čekající':'Po orazítkování fyzického listu označ jako potvrzené'}</small></span></button>`:''}
        <section><p class="pdf-section-no">ZÁZNAM</p>${current.title?`<h2>${msEsc(current.title)}</h2>`:''}<p class="diary-v2-fulltext">${msEsc(current.text||'(zápis bez textu)')}</p>${current.issue?`<p class="diary-v2-issue"><b>Poznámka:</b> ${msEsc(current.issue)}</p>`:''}</section>
        <section><p class="pdf-section-no">PODMÍNKY A PRÁCE</p><dl>${detailRow('Zapsal',current.author)}${detailRow('Kdo pracoval',current.worker)}${detailRow('Počet pracovníků',current.workerCount)}${detailRow('Počasí',current.weather?`${WEATHER[current.weather]||current.weather}${current.temperature!=null?', '+current.temperature+' °C':''}`:null)}${detailRow('Materiál',current.material)}</dl></section>
        ${photos.length?`<section><p class="pdf-section-no">FOTODOKUMENTACE · ${photos.length}</p><div class="diary-v2-detail-photos">${photos.slice(0,12).map((photo,index)=>`<button data-photo="${index}" style="background-image:url('${safeCssUrl(photo)}')"></button>`).join('')}</div>${photos.length>12?`<button class="diary-v2-show-all" id="showAllPhotos">Zobrazit všech ${photos.length} fotografií</button>`:''}</section>`:''}
        ${attachments.length?`<section><p class="pdf-section-no">PŘÍLOHY · ${attachments.length}</p><div class="diary-v2-detail-files">${attachments.map((att,index)=>`<button class="diary-v2-detail-file" data-attachment="${index}" ${att.available?'':'disabled'}>${clipIcon()}<span>${msEsc(att.name)}</span><small>${att.available?'Otevřít →':'Chybí v zařízení'}</small></button>`).join('')}</div></section>`:''}
        <div class="diary-v2-detail-actions">${locked?'':`<button class="btn-primary" id="detailEdit">Upravit zápis</button>`}<button class="btn-ghost" id="detailDone">Zavřít</button></div>
      </div>`;
      document.body.appendChild(overlay);
      const close=()=>overlay.remove();
      overlay.addEventListener('click',event=>{if(event.target===overlay) close();});
      overlay.querySelector('#detailClose').addEventListener('click',close);
      overlay.querySelector('#detailDone').addEventListener('click',close);
      const edit=overlay.querySelector('#detailEdit'); if(edit) edit.addEventListener('click',()=>{close();Router.go('diary-add',{edit:current.id});});
      const supervisorToggle=overlay.querySelector('#supervisorToggle');
      if(supervisorToggle) supervisorToggle.addEventListener('click',()=>{
        msSetDiarySupervisorConfirmed(current.id,!current.supervisorConfirmedAt); close(); draw();
      });
      wirePhotoButtons(overlay,current);
      overlay.querySelectorAll('[data-attachment]').forEach(button=>button.addEventListener('click',()=>openEntryAttachment(attachments[Number(button.dataset.attachment)])));
      const showAll=overlay.querySelector('#showAllPhotos');
      if(showAll) showAll.addEventListener('click',()=>{
        const grid=overlay.querySelector('.diary-v2-detail-photos');
        grid.innerHTML=photos.map((photo,index)=>`<button data-photo="${index}" style="background-image:url('${safeCssUrl(photo)}')"></button>`).join('');
        showAll.remove(); wirePhotoButtons(overlay,current);
      });
    }

    function wirePhotoButtons(scope,entry){
      const sources=entryPhotoSources(entry);
      scope.querySelectorAll('[data-photo]').forEach(button=>button.addEventListener('click',()=>msPhotoLightbox(sources,Number(button.dataset.photo))));
    }
    async function openEntryAttachment(attachment){
      if(!attachment || !attachment.id) return;
      const key=msBlobKey(attachment.type==='projectitem'?'pitem':'doc',attachment.id);
      let dataUrl=MS_BLOB_CACHE.get(key);
      if(!dataUrl){
        try{ dataUrl=await msIdbGet(key); }
        catch(error){}
      }
      if(!dataUrl){ alert('Obsah přílohy už v tomto zařízení není dostupný.'); return; }
      const detectedMime=(String(dataUrl).match(/^data:([^;,]+)/)||[])[1]||attachment.mime||'';
      if(detectedMime.startsWith('image/')){ msPhotoLightbox([dataUrl],0); return; }
      try{
        const file=msDataUrlToFile(dataUrl,attachment.name||'priloha');
        if(!file) throw new Error('Soubor se nepodařilo připravit.');

        // V Android/Capacitoru nezkousime PDF/DOCX/XLSX/ZIP otevirat
        // pres blob: URL ve WebView. Predame je nativne Androidu stejne
        // jako soubory v Projektu.
        if(typeof msNativniOtevritSoubor==='function'){
          const openedNative = await msNativniOtevritSoubor(file, attachment.name||'priloha', detectedMime||attachment.mime||file.type);
          if(openedNative) return;
        }

        /* (8.9.2026) Driv window.open - Safari na iPhonu ho blokuje,
           protoze se vola az po nacteni prilohy z IndexedDB a v tu chvili
           uz neplati uzivatelske klepnuti. Priloha se proto ukaze
           v prekryvu primo v appce. */
        const url=URL.createObjectURL(file);
        if(typeof msWebFileViewer==='function'){
          msWebFileViewer(url, attachment.name||'Příloha', detectedMime||attachment.mime||file.type||'');
        }else{
          const opened=window.open(url,'_blank');
          setTimeout(()=>URL.revokeObjectURL(url),60000);
          if(!opened) alert('Prohlížeč zablokoval otevření přílohy. Povol vyskakovací okna a zkus to znovu.');
        }
      }catch(error){
        console.error('Otevreni prilohy deniku selhalo', error);
        alert('Soubor je uložený, ale v tomto zařízení ho nejde přímo otevřít. Zkus ho otevřít přes nabídku Sdílet nebo nainstaluj aplikaci pro tento typ souboru.');
      }
    }
    function detailRow(label,value){ return value!==null && value!==undefined && value!==''?`<div><dt>${label}</dt><dd>${msEsc(String(value))}</dd></div>`:''; }
    function searchText(entry){ return [entry.number,entry.title,entry.text,entry.worker,entry.material,entry.issue,entry.author,...entryAttachments(entry).map(att=>att.name)].filter(Boolean).join(' ').toLocaleLowerCase('cs'); }
    function entryAttachments(entry){
      const docs=msDocuments(); const projectItems=typeof msLoadProjectItems==='function'?msLoadProjectItems():[];
      return (entry.items||[]).map(item=>{
        if(item.type==='document'){
          const doc=docs.find(value=>value.id===item.refId); return doc?{type:'document',id:doc.id,name:doc.name||'Dokument',mime:doc.mime||'',available:true}: {type:'document',id:item.refId,name:'Chybějící dokument',mime:'',available:false};
        }
        if(item.type==='projectitem'){
          const value=projectItems.find(projectItem=>projectItem.id===item.refId); return value?{type:'projectitem',id:value.id,name:value.name||'Soubor projektu',mime:value.mime||'',available:true}:{type:'projectitem',id:item.refId,name:'Chybějící soubor projektu',mime:'',available:false};
        }
        return null;
      }).filter(Boolean);
    }
    function entryWarnings(entry){ const warnings=[]; if(!String(entry.text||'').trim()) warnings.push('Chybí text'); if(entryAttachments(entry).some(att=>!att.available)) warnings.push('Chybí příloha'); return warnings; }
    function entryPhotoSources(entry){
      const refs=(entry.items||[]).filter(item=>item.type==='photo').map(item=>item.refId);
      const gallery=typeof msFindPhotosByRefs==='function'?msFindPhotosByRefs(refs):[];
      const fallback=entry.photos||[];
      const resolved=refs.map((ref,index)=>{
        const photo=gallery[index]||null;
        const src=(photo&&photo.thumb)||fallback[index]||null;
        return (src || photo) ? {src,fullId:photo&&photo.id} : null;
      }).filter(Boolean);
      for(let index=refs.length;index<fallback.length;index++) if(fallback[index]) resolved.push({src:fallback[index],fullId:null});
      return resolved.length?resolved:fallback.filter(Boolean).map(src=>({src,fullId:null}));
    }
    function entryPhotos(entry){ return entryPhotoSources(entry).map(photo=>photo.src).filter(Boolean); }
    function photoCount(entry){ const refs=(entry.items||[]).filter(item=>item.type==='photo').length; return refs||entryPhotos(entry).length; }
    function formatDate(iso){ const date=new Date(iso+'T00:00:00'); return `${date.getDate()}. ${date.getMonth()+1}. ${date.getFullYear()}`; }
    function weekday(iso){ return new Intl.DateTimeFormat('cs-CZ',{weekday:'long'}).format(new Date(iso+'T00:00:00')).toLocaleUpperCase('cs'); }
    function entryWord(count){ return count===1?'zápis':(count>=2&&count<=4?'zápisy':'zápisů'); }
    function shortText(text,max){ const value=String(text||'').replace(/\s+/g,' ').trim(); return value.length>max?value.slice(0,max-1).trim()+'…':value; }
    function attr(value){ return msEsc(String(value==null?'':value)); }
    function safeCssUrl(value){ return String(value||'').replace(/["'()\\\n\r]/g,''); }

    draw();
    return {activeTab:'diary'};
  }

  function plusIcon(){return '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>';}
  function gridIcon(){return '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><rect x="14" y="14" width="6" height="6"/></svg>';}
  function filterIcon(){return '<svg viewBox="0 0 24 24"><path d="M4 6h16M7 12h10M10 18h4"/></svg>';}
  function searchIcon(){return '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>';}
  function bookIcon(){return '<svg viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v17H6.5A2.5 2.5 0 0 0 4 22zM20 5.5A2.5 2.5 0 0 0 17.5 3H13v17h4.5A2.5 2.5 0 0 1 20 22z"/></svg>';}
  function printIcon(){return '<svg viewBox="0 0 24 24"><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v7H6z"/></svg>';}
  function pencilIcon(){return '<svg viewBox="0 0 24 24"><path d="m4 20 4.5-1 10-10a2 2 0 0 0-3-3l-10 10zM14 7l3 3"/></svg>';}
  function lockIcon(){return '<svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>';}
  function stampIcon(){return '<svg viewBox="0 0 24 24"><path d="M8 14h8l-1-4a3 3 0 0 0-6 0zM6 14h12v4H6zM5 21h14"/></svg>';}
  function photoIcon(){return '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16"/><circle cx="9" cy="10" r="2"/><path d="m4 18 5-5 4 4 3-3 5 4"/></svg>';}
  function clipIcon(){return '<svg viewBox="0 0 24 24"><path d="m21 11-8.5 8.5a6 6 0 0 1-8.5-8.5L14 1a4 4 0 0 1 6 6L9.5 17.5a2 2 0 0 1-3-3L16 5"/></svg>';}
  function alertIcon(){return '<svg viewBox="0 0 24 24"><path d="M12 3 2 21h20zM12 9v5M12 18h.01"/></svg>';}

  return {render};
})();
Router.register('diary', DiaryScreenV2);

/* ==========================================================
   K ZAPISU - sprava fronty pripravenych veci mimo samotne
   vytvareni zapisu. Odsud jde neco natrvalo odebrat, aniz by
   se to muselo resit primo ve formulari na novy zapis (tam uz
   klepnuti jen prepina, jestli se to ma zahrnout DO tohoto
   zapisu, ne jestli to ma zmizet navzdy).
   ========================================================== */
const DiaryQueueScreen = (function(){
  const ICONS = {
    photo: '<rect x="3" y="6" width="18" height="14" rx="1"/><circle cx="12" cy="13" r="3.5"/>',
    document: '<path d="M6 3h9l3 3v15H6z"/><path d="M9 10h6M9 14h6"/>',
    event: '<rect x="3" y="5" width="18" height="16" rx="1"/><path d="M8 3v4M16 3v4M3 10h18"/>',
    stage_complete: '<path d="M5 13l4 4L19 7"/>',
  };
  const TYPE_LABEL = { photo:'Fotka', document:'Dokument', event:'Událost', stage_complete:'Dokončená etapa' };

  function render(container){
    function draw(){
      const items = msDiaryQueueResolved();
      container.innerHTML = `
        <div class="topbar ms-ui-topbar queue-v2-topbar">
          <div class="back-btn" id="backBtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></div>
          <div class="ms-ui-title"><p>Stavební deník</p><h1>K zápisu</h1></div>
        </div>
        <div class="screen-scroll queue-v2-scroll">
          <div class="queue-v2-info"><b>Čeká na příští zápis</b><span>Odeber věci, které už do deníku přidat nechceš.</span></div>
          <div id="qList" class="queue-v2-list"></div>
        </div>
      `;
      container.querySelector('#backBtn').addEventListener('click', ()=> Router.go('diary'));
      const list = container.querySelector('#qList');
      if(items.length===0){
        list.innerHTML = '<p class="empty-msg">Zatím nic nečeká na zápis.</p>';
        return;
      }
      list.innerHTML = items.map((it,i)=>`
        <div class="queue-v2-row">
          <div class="queue-v2-icon" style="${it.preview?`background-image:url(${it.preview});background-size:cover`:''}">
            ${it.preview ? '' : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[it.type]||ICONS.document}</svg>`}
          </div>
          <div class="queue-v2-copy">
            <b>${msEsc(it.label)}</b>
            <span>${TYPE_LABEL[it.type]||''}${it.stage && msStageByKey(it.stage) ? ' · '+msStageByKey(it.stage).name : ''}</span>
          </div>
          <button class="q-remove" data-i="${i}" aria-label="Odebrat">✕</button>
        </div>
      `).join('');
      list.querySelectorAll('.q-remove').forEach(el=>{
        el.addEventListener('click', ()=>{
          const it = items[Number(el.dataset.i)];
          msUnqueueFromDiary(it.type, it.refId);
          draw();
        });
      });
    }
    draw();
    return { activeTab:'diary' };
  }
  return { render };
})();
Router.register('diary-queue', DiaryQueueScreen);
