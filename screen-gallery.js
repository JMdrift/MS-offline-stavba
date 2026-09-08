/* ==========================================================
   GALERIE
   ========================================================== */
const GalleryScreen = (function(){
  const MONTHS = ['Leden','Únor','Březen','Duben','Květen','Červen','Červenec','Srpen','Září','Říjen','Listopad','Prosinec'];
  const DAYS = ['Neděle','Pondělí','Úterý','Středa','Čtvrtek','Pátek','Sobota'];

  function galleryPhotoCount(n){
    return n === 0 ? 'žádné fotografie' : (n === 1 ? '1 fotografie' : (n < 5 ? n + ' fotografie' : n + ' fotografií'));
  }

  function galleryDateInfo(value){
    if(!value) return { day:'Bez data', date:'Nezařazené fotografie' };
    const parts = value.split('-').map(Number);
    const d = new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
    return {
      day: DAYS[d.getDay()] || '',
      date: (parts[2] || 1) + '. ' + (parts[1] || 1) + '. ' + parts[0]
    };
  }

  function render(container, params){
    let activeStage = params.stage || 'all';
    let viewMode = params.view === 'stages' ? 'stages' : 'timeline';

    container.innerHTML = `
      <div class="topbar gallery-v2-topbar">
        <div class="back-btn" id="backBtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></div>
        <div class="gallery-v2-title">
          <p>Fotodokumentace</p>
          <h1>Galerie</h1>
        </div>
        <div class="gallery-v2-top-actions">
          ${msCanExportContent() ? `<button id="selectBtn" class="gallery-v2-select-btn" title="Označit fotky">Označit</button>` : ''}
          <div class="icon-btn" id="addBtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></div>
        </div>
      </div>
      <div class="screen-scroll gallery-v2-scroll">
        <section class="gallery-v2-hero">
          <div>
            <p>Archiv stavby</p>
            <h2 id="galleryTotalLabel">Žádné fotografie</h2>
            <small id="galleryStageTotal">Průběh stavby na jednom místě</small>
          </div>
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4l1.4 2H20a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h4.1l1.4-2h5z"/><circle cx="12" cy="13" r="3.5"/></svg>
        </section>
        <button class="gallery-v2-current" id="currentStageBtn" hidden>
          <span class="gallery-v2-current-icon"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="14" height="18"/><path d="M8 8h6M8 12h6M8 16h3"/><path d="M15 17l2 2 4-5"/></svg></span>
          <span class="gallery-v2-current-copy"><small>Aktuální etapa</small><b id="currentStageName"></b><em id="currentStageCount"></em></span>
          <span class="gallery-v2-current-link">Ukázat →</span>
        </button>
        <div class="gallery-v2-controls">
          <div class="gallery-v2-tabs">
            <button id="timelineViewBtn" data-view="timeline">Chronologie</button>
            <button id="stagesViewBtn" data-view="stages">Podle etap</button>
          </div>
        </div>
        <div class="dropdown gallery-v2-stage-filter" id="stageDropdown">
          <button class="dd-btn" id="ddBtn"><span class="left"><i id="ddDot"></i><span id="ddLabel">Vše</span><span id="ddCount"></span></span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M6 9l6 6 6-6"/></svg></button>
          <div class="dd-panel" id="ddPanel"></div>
        </div>
        <div id="months"></div>
      </div>
      <!-- Lista hromadnych akci - ukaze se jen v rezimu vyberu -->
      <div id="selBar" class="gallery-v2-selection" hidden>
        <div class="gallery-v2-selection-head">
          <b id="selInfo">Vybráno 0</b>
          <span id="selAll">Vybrat vše</span>
        </div>
        <div class="gallery-v2-selection-actions">
          <button class="sel-act" id="actShare">Sdílet</button>
          <button class="sel-act" id="actSave">Do telefonu</button>
          <button class="sel-act" id="actMove">Přesunout</button>
          <button class="sel-act is-danger" id="actDel">Smazat</button>
        </div>
      </div>
    `;
    container.querySelector('#backBtn').addEventListener('click', ()=> Router.back());
    const galleryAddBtn = container.querySelector('#addBtn');
    if(typeof msCanAddSection === 'function' && !msCanAddSection('fotky')){ galleryAddBtn.style.display = 'none'; }
    else galleryAddBtn.addEventListener('click', ()=> Router.go('photo-add', activeStage!=='all' ? {stage: activeStage} : {}));

    const ddBtn = container.querySelector('#ddBtn');
    const ddPanel = container.querySelector('#ddPanel');
    function buildDropdown(){
      const allPhotos = msPhotos();
      ddPanel.innerHTML = '';
      const allItem = document.createElement('div');
      allItem.className = 'dd-item' + (activeStage==='all'?' is-active':'');
      allItem.innerHTML = `<i style="background:#fff;display:inline-block;width:8px;height:8px;margin-right:7px"></i>Vše`
        + `<span class="dd-n">${allPhotos.length}</span>`;
      allItem.addEventListener('click', ()=>{ activeStage='all'; ddLabelUpdate(); if(selectMode) setSelectMode(false); ddPanel.classList.remove('open'); draw(); });
      ddPanel.appendChild(allItem);
      msSelectedStages().forEach(s=>{
        const count = allPhotos.filter(p=>p.stage===s.key).length;
        const it = document.createElement('div');
        it.className = 'dd-item' + (activeStage===s.key?' is-active':'');
        it.style.color = s.color;
        it.innerHTML = `<i style="background:${s.color};display:inline-block;width:8px;height:8px;margin-right:7px"></i>${msEsc(s.name)}`
          + `<span class="dd-n">${count}</span>`;
        it.addEventListener('click', ()=>{ activeStage=s.key; ddLabelUpdate(); if(selectMode) setSelectMode(false); ddPanel.classList.remove('open'); draw(); });
        ddPanel.appendChild(it);
      });
    }
    function ddLabelUpdate(){
      const st = msStageByKey(activeStage);
      container.querySelector('#ddLabel').textContent = st ? st.name : 'Vše';
      const n = msPhotos().filter(p=> activeStage==='all' || p.stage===activeStage).length;
      container.querySelector('#ddCount').textContent = galleryPhotoCount(n);
      const dot = container.querySelector('#ddDot');
      dot.style.background = st ? st.color : 'var(--text-main)';
    }
    ddBtn.addEventListener('click', ()=> ddPanel.classList.toggle('open'));

    function updateViewControls(){
      container.querySelectorAll('[data-view]').forEach(btn=>{
        const on = btn.dataset.view === viewMode;
        btn.classList.toggle('is-active', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }

    container.querySelectorAll('[data-view]').forEach(btn=> btn.addEventListener('click', ()=>{
      if(viewMode === btn.dataset.view) return;
      viewMode = btn.dataset.view;
      if(selectMode) setSelectMode(false);
      updateViewControls();
      draw();
    }));

    const currentStageBtn = container.querySelector('#currentStageBtn');
    currentStageBtn.addEventListener('click', ()=>{
      const key = msGetCurrentStage();
      if(!key) return;
      activeStage = key;
      viewMode = 'timeline';
      if(selectMode) setSelectMode(false);
      updateViewControls();
      ddPanel.classList.remove('open');
      draw();
    });

    function wireEmpty(){
      const el = container.querySelector('#emptyGalleryCard');
      if(el) el.addEventListener('click', ()=> Router.go('photo-add'));
    }

    function updateSummary(allPhotos){
      container.querySelector('#galleryTotalLabel').textContent = galleryPhotoCount(allPhotos.length);
      const usedStages = new Set(allPhotos.map(p=>p.stage).filter(Boolean)).size;
      container.querySelector('#galleryStageTotal').textContent =
        usedStages ? galleryPhotoCount(allPhotos.length) + ' · ' + usedStages + (usedStages === 1 ? ' etapa' : (usedStages < 5 ? ' etapy' : ' etap')) : 'Průběh stavby na jednom místě';

      const currentKey = msGetCurrentStage();
      const current = msStageByKey(currentKey);
      if(!current){
        currentStageBtn.hidden = true;
        return;
      }
      const currentCount = allPhotos.filter(p=>p.stage===currentKey).length;
      currentStageBtn.hidden = false;
      currentStageBtn.style.setProperty('--stage-color', current.color || 'var(--accent)');
      container.querySelector('#currentStageName').textContent = current.name;
      container.querySelector('#currentStageCount').textContent = galleryPhotoCount(currentCount);
    }

    function emptyGallery(wrap){
      wrap.innerHTML = msEmptyState({icon:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="15" rx="1"/><circle cx="12" cy="12" r="3.5"/></svg>`, color:'#25b7ff',
        title:'Zatím žádné fotky',
        text:'Fotky ze stavby se samy řadí podle data a etapy - najdeš je pak i u konkrétní etapy.',
        hints:['Postup prací den po dni','Co dorazilo na plac','Detaily, které se pak zakryjí'],
        actionId:'emptyGalleryCard'});
      wireEmpty();
    }

    function draw(){
      buildDropdown(); ddLabelUpdate();
      const wrap = container.querySelector('#months');
      const allPhotos = msPhotos();
      updateSummary(allPhotos);
      updateViewControls();

      const photos = allPhotos
        .filter(p=> activeStage==='all' || p.stage===activeStage)
        .sort((a,b)=>(b.date||'').localeCompare(a.date||''));
      if(!photos.length){ emptyGallery(wrap); return; }

      if(viewMode === 'timeline'){
        const byDate = {};
        photos.forEach(p=>{ (byDate[p.date || '__without_date__'] = byDate[p.date || '__without_date__'] || []).push(p); });
        const dateKeys = Object.keys(byDate).sort((a,b)=>{
          if(a === '__without_date__') return 1;
          if(b === '__without_date__') return -1;
          return b.localeCompare(a);
        });

        wrap.innerHTML = dateKeys.map((key, groupIndex)=>{
          const info = galleryDateInfo(key === '__without_date__' ? '' : key);
          const stageCounts = {};
          byDate[key].forEach(p=>{ stageCounts[p.stage || '__none__'] = (stageCounts[p.stage || '__none__'] || 0) + 1; });
          const stageSummary = Object.keys(stageCounts).map(stageKey=>{
            const stage = msStageByKey(stageKey);
            const color = stage ? stage.color : 'var(--muted)';
            return `<span style="--stage-color:${color}"><i></i>${msEsc(stage ? stage.name : 'Bez etapy')} · ${stageCounts[stageKey]}</span>`;
          }).join('');
          return `<section class="gallery-v2-date-group">
            <div class="gallery-v2-date-head">
              <div><p>${msEsc(info.day)}</p><h2>${msEsc(info.date)}</h2></div>
              <span>${galleryPhotoCount(byDate[key].length)}</span>
            </div>
            <div class="gallery-v2-grid" data-group="${groupIndex}"></div>
            <div class="gallery-v2-stage-summary">${stageSummary}</div>
          </section>`;
        }).join('');

        dateKeys.forEach((key, groupIndex)=>{
          const grid = wrap.querySelector(`.gallery-v2-grid[data-group="${groupIndex}"]`);
          byDate[key].forEach(p=> grid.appendChild(photoCell(p, photos, photos.indexOf(p))));
        });
        return;
      }

      const currentKey = msGetCurrentStage();
      const byStage = {};
      photos.forEach(p=>{ (byStage[p.stage || '__none__'] = byStage[p.stage || '__none__'] || []).push(p); });
      const stageKeys = Object.keys(byStage).sort((a,b)=>{
        if(a===currentKey) return -1;
        if(b===currentKey) return 1;
        const lastA = byStage[a][0] ? byStage[a][0].date || '' : '';
        const lastB = byStage[b][0] ? byStage[b][0].date || '' : '';
        return lastB.localeCompare(lastA);
      });

      wrap.innerHTML = stageKeys.map((key, groupIndex)=>{
        const stage = msStageByKey(key);
        const color = stage ? stage.color : 'var(--muted)';
        const last = byStage[key][0] ? galleryDateInfo(byStage[key][0].date).date : '';
        return `<section class="gallery-v2-stage-group${key===currentKey?' is-current':''}" style="--stage-color:${color}">
          <div class="gallery-v2-stage-head">
            <span class="gallery-v2-stage-index">${String(groupIndex+1).padStart(2,'0')}</span>
            <span class="gallery-v2-stage-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="15"/><path d="M8 5l1.5-2h5L16 5"/><circle cx="12" cy="12.5" r="3.5"/></svg></span>
            <span class="gallery-v2-stage-copy"><b>${msEsc(stage ? stage.name : 'Bez etapy')}</b><small>${galleryPhotoCount(byStage[key].length)} · ${msEsc(last)}</small></span>
            ${key===currentKey?'<em>Aktuální</em>':'<svg class="gallery-v2-stage-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M9 5l7 7-7 7"/></svg>'}
          </div>
          <div class="gallery-v2-grid" data-stage-group="${groupIndex}"></div>
        </section>`;
      }).join('');

      stageKeys.forEach((key, groupIndex)=>{
        const grid = wrap.querySelector(`.gallery-v2-grid[data-stage-group="${groupIndex}"]`);
        byStage[key].forEach(p=> grid.appendChild(photoCell(p, photos, photos.indexOf(p))));
      });
    }

    /* ==========================================================
       HROMADNY VYBER (8.8.2026)
       Rezim se zapne tlacitkem v liste nebo podrzenim fotky. V nem
       ťuknuti fotku oznaci misto otevreni - jinak by se dva zpusoby
       ovladani bily. Vybrane fotky drzime podle id, ne podle poradi,
       aby vyber prezil prekresleni po zmene etapy nebo mazani.
       ========================================================== */
    let selectMode = false;
    let selected = new Set();

    function setSelectMode(on){
      selectMode = on;
      if(!on) selected.clear();
      container.classList.toggle('gallery-v2-selecting', on);
      container.querySelector('#selBar').hidden = !on;
      const sb = container.querySelector('#selectBtn');
      if(sb){
        sb.textContent = on ? 'Hotovo' : 'Označit';
        sb.classList.toggle('is-active', on);
      }
      draw();
      updateSelInfo();
    }
    function updateSelInfo(){
      const n = selected.size;
      container.querySelector('#selInfo').textContent = n ? 'Vybráno ' + n : 'Ťukni na fotky';
      container.querySelectorAll('.sel-act').forEach(b=>{ b.disabled = !n; b.style.opacity = n ? '1' : '.45'; });
    }
    function visiblePhotos(){
      const all = msPhotos();
      return activeStage === 'all' ? all : all.filter(p=> p.stage === activeStage);
    }

    const selectBtnEl = container.querySelector('#selectBtn');
    if(selectBtnEl) selectBtnEl.addEventListener('click', ()=> setSelectMode(!selectMode));
    container.querySelector('#selAll').addEventListener('click', ()=>{
      const vis = visiblePhotos();
      if(selected.size === vis.length) selected.clear();
      else vis.forEach(p=> selected.add(p.id));
      draw(); updateSelInfo();
    });

    /* ---------- hromadne akce ---------- */
    function selectedPhotos(){ return msPhotos().filter(p=> selected.has(p.id)); }

    async function selectedFiles(){
      const out = [];
      const list = selectedPhotos();
      for(let i = 0; i < list.length; i++){
        const p = list[i];
        // Do zpravy i do telefonu patri PLNA fotka, ne nahled ze seznamu.
        const full = await msPhotoFull(p.id);
        if(!full) continue;
        const st = msStageByKey(p.stage);
        const name = ['moje-stavba', st ? st.name.replace(/[^\p{L}\d]+/gu,'-').toLowerCase() : 'foto', p.date || '', (i+1)]
          .filter(Boolean).join('-');
        const f = msDataUrlToFile(full, name);
        if(f) out.push(f);
      }
      return out;
    }


    container.querySelector('#actShare').addEventListener('click', async ()=>{
      if(!msRequirePremium('Posílání fotek do jiných aplikací')) return;
      const files = await selectedFiles();
      if(!files.length){ alert('U vybraných fotek chybí obrázek, není co poslat.'); return; }
      const res = await msShareFiles(files, 'Fotky ze stavby');
      if(res === 'unsupported'){
        alert('Tenhle prohlížeč neumí posílat soubory do jiných aplikací. Zkus appku otevřít jako aplikaci na ploše (Přidat na plochu), tam to funguje.');
      }
    });

    container.querySelector('#actSave').addEventListener('click', async ()=>{
      if(!msRequirePremium('Ukládání fotek do telefonu')) return;
      const files = await selectedFiles();
      if(!files.length){ alert('U vybraných fotek chybí obrázek, není co uložit.'); return; }
      const res = await msSaveFilesToDevice(files, 'Fotky ze stavby');
      if(res === 'shared'){
        // na iPhonu se ukládá právě takhle - přes systémové okno
      } else if(res === 'downloaded'){
        alert(files.length + ' fotek uloženo do složky Stahování.');
      } else if(res === 'unsupported'){
        alert('Uložení do telefonu tenhle prohlížeč neumí. Otevři fotku a použij podržení prstem → Uložit obrázek.');
      }
    });

    container.querySelector('#actMove').addEventListener('click', ()=>{
      const list = selectedPhotos();
      if(!list.length) return;
      const stages = msSelectedStages();
      if(!stages.length){ alert('Nejdřív si přidej aspoň jednu etapu.'); return; }

      const ov = document.createElement('div');
      ov.style.cssText = 'position:fixed;inset:0;background:rgba(2,4,10,.7);z-index:95;display:flex;align-items:flex-end';
      ov.innerHTML = `<div style="width:100%;background:var(--card-bg);border-top:1px solid var(--line);max-height:70%;overflow-y:auto;padding-bottom:calc(10px + min(var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)),34px))">
        <div style="padding:14px 16px 11px;border-bottom:1px solid var(--line);font-family:var(--font-head);font-size:15px;font-weight:700">Přesunout ${list.length} fotek do etapy</div>
        ${stages.map(st=>`<div class="mv" data-key="${st.key}" style="display:flex;align-items:center;gap:10px;padding:13px 16px;border-bottom:1px solid var(--line);cursor:pointer">
          <i style="width:9px;height:9px;background:${st.color};flex:0 0 9px"></i><span style="font-size:13.5px">${msEsc(st.name)}</span></div>`).join('')}
      </div>`;
      document.body.appendChild(ov);
      ov.addEventListener('click', e=>{ if(e.target === ov) ov.remove(); });
      ov.querySelectorAll('.mv').forEach(el=> el.addEventListener('click', ()=>{
        const key = el.dataset.key;
        list.forEach(p=> msUpdatePhoto(p.id, { stage: key }));
        ov.remove();
        setSelectMode(false);
        const st = msStageByKey(key);
        alert(list.length + ' fotek přesunuto do etapy ' + (st ? st.name : key) + '.');
      }));
    });

    container.querySelector('#actDel').addEventListener('click', async ()=>{
      const list = selectedPhotos();
      if(!list.length) return;
      const ok = await Layout.confirmDialog(
        'Smazat ' + list.length + ' fotek? Zmizí i ze zápisů deníku, ve kterých jsou použité. Tohle nelze vzít zpět.',
        'Smazat', 'Zruším to');
      if(!ok) return;
      list.forEach(p=> msDeletePhoto(p.id));
      setSelectMode(false);
      alert(list.length + ' fotek smazáno.');
    });

    function photoCell(p, list, idx){
      const s = msStageByKey(p.stage);
      const bg = p.thumb ? `background-image:url(${p.thumb});background-size:cover;background-position:center` : `background:color-mix(in srgb, ${s?s.color:'#94a0bc'} 15%, #0b0f1c)`;
      const cell = document.createElement('div');
      cell.className = 'gallery-photo gallery-v2-photo';
      const isSel = selected.has(p.id);
      cell.classList.toggle('is-selected', isSel);
      cell.style.cssText = `--stage-color:${s?s.color:'var(--muted)'};${bg}`;
      let badgesHtml = '<i class="gallery-v2-photo-stage"></i>';
      if(selectMode){
        badgesHtml += `<span class="gallery-v2-photo-check">${isSel?'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>':''}</span>`;
      }
      cell.innerHTML = badgesHtml;

      cell.addEventListener('click', ()=>{
        if(selectMode){
          if(selected.has(p.id)) selected.delete(p.id); else selected.add(p.id);
          draw(); updateSelInfo();
        } else openPhoto(list, idx);
      });
      // podrzeni fotky rezim rovnou zapne a fotku oznaci
      let holdTimer = null;
      cell.addEventListener('touchstart', ()=>{
        holdTimer = setTimeout(()=>{
          if(!selectMode){ selected.add(p.id); setSelectMode(true); }
        }, 450);
      }, {passive:true});
      ['touchend','touchmove','touchcancel'].forEach(ev=>
        cell.addEventListener(ev, ()=>{ if(holdTimer) clearTimeout(holdTimer); }, {passive:true}));
      return cell;
    }

    // Prohlizec fotek - swipe doleva/doprava mezi fotkami (jako v systemove
    // Galerii), pinch-zoom a double-tap zoom na jedne fotce. Cistý JS bez
    // knihovny: pri zoomu (scale>1) swipe funguje jako posun (pan), ne
    // prechod na dalsi fotku - pri scale===1 je horizontalni tazeni prechod.
    function openPhoto(list, startIdx){
      let idx = startIdx;
      const overlay = document.createElement('div');
      overlay.className = 'ms-overlay'; overlay.style.cssText = 'position:fixed;inset:0;background:var(--bg-deep);z-index:70;display:flex;flex-direction:column';
      document.body.appendChild(overlay);

      let scale=1, panX=0, panY=0;
      let startDist=0, startScale=1, startPanX=0, startPanY=0, startTouchX=0, startTouchY=0;
      let swiping=false, swipeStartX=0, dragDX=0;

      function drawFrame(){
        const p = list[idx];
        const s = msStageByKey(p.stage);
        overlay.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:calc(14px + var(--safe-area-inset-top, env(safe-area-inset-top, 0px))) 16px 8px">
            <span style="font-size:11px;color:var(--muted)">${idx+1} / ${list.length}</span>
            <div id="closePhoto" style="width:32px;height:32px;border:1px solid var(--line);border-radius:var(--radius);display:grid;place-items:center;color:var(--text-main);cursor:pointer">✕</div>
          </div>
          <div id="photoViewport" style="flex:1;overflow:hidden;position:relative;touch-action:none">
            <img id="photoImg" src="${p.thumb||''}" data-full="${p.id}" style="position:absolute;top:50%;left:50%;max-width:100%;max-height:100%;width:auto;height:auto;transform:translate(-50%,-50%) scale(1);transform-origin:center;user-select:none;-webkit-user-drag:none"/>
          </div>
          <div style="padding:14px 16px calc(20px + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)))">
            ${s ? `<p style="margin:0 0 4px;font-size:11px;color:${s.color};font-weight:800">${msEsc(s.name)}</p>` : ''}
            <p style="margin:0 0 8px;font-size:11px;color:var(--muted)">${p.date || ''}</p>
            <textarea id="capField" ${msCanModifyContent() ? "" : "readonly"} class="f-textarea" placeholder="Přidat popisek…" style="min-height:50px">${msEsc(p.caption || '')}</textarea>
            <div style="display:flex;gap:8px;margin-top:8px">
              ${msCanExportContent() ? `<button id="sharePhotoBtn" style="flex:0 0 auto;border:1px solid #25b7ff;background:transparent;color:#25b7ff;padding:11px 16px;cursor:pointer;font-family:inherit;font-weight:800;font-size:12px">Sdílet</button>` : ''}
              ${msCanModifyContent() ? `<button id="saveCapBtn" class="btn-primary" style="border-color:${s?s.color:'#b34cff'}">Uložit popisek</button>
              <button id="delPhotoBtn" class="btn-ghost" style="color:#ff7a86;flex:0 0 auto;width:auto;padding:11px 14px">Smazat</button>` : ''}
            </div>
          </div>
        `;
        scale=1; panX=0; panY=0;
        /* ZMENA (9.8.2026): dlazdice i tenhle prohlizec kreslily plnou
           fotku (1800 px). Ted se nejdriv ukaze nahled, ktery uz je v
           pameti, a plna verze se dotahne hned potom - obraz naskoci
           okamzite a doostri se. */
        (async ()=>{
          const full = await msPhotoFull(p.id);
          const el = overlay.querySelector('#photoImg');
          if(full && el && el.isConnected) el.src = full;
        })();
        overlay.querySelector('#closePhoto').addEventListener('click', ()=> document.body.removeChild(overlay));
        const saveCapEl = overlay.querySelector('#saveCapBtn');
        if(saveCapEl) saveCapEl.addEventListener('click', ()=>{
          const caption = overlay.querySelector('#capField').value.trim();
          msUpdatePhoto(p.id, { caption });
          document.body.removeChild(overlay);
          draw();
        });
        const sharePhotoEl = overlay.querySelector('#sharePhotoBtn');
        if(sharePhotoEl) sharePhotoEl.addEventListener('click', async ()=>{
          if(!msRequirePremium('Posílání fotek do jiných aplikací')) return;
          const full = await msPhotoFull(p.id);
          if(!full){ alert('U téhle fotky chybí obrázek, není co poslat.'); return; }
          const st = msStageByKey(p.stage);
          const name = ['moje-stavba', st ? st.name.replace(/[^\p{L}\d]+/gu,'-').toLowerCase() : 'foto', p.date || ''].filter(Boolean).join('-');
          const file = msDataUrlToFile(full, name);
          const text = [st ? 'Etapa: ' + st.name : '', p.date || '', p.caption || ''].filter(Boolean).join(' · ');
          if(file && msCanShareFiles([file])){
            try{ await navigator.share({ files:[file], text, title:'Fotka ze stavby' }); return; }
            catch(e){ if(e && e.name === 'AbortError') return; }
          }
          const res = await msSaveFilesToDevice([file], 'Fotka ze stavby');
          if(res === 'unsupported') alert('Tenhle prohlížeč neumí posílat soubory. Zkus appku otevřít jako aplikaci na ploše.');
        });
        const delPhotoEl = overlay.querySelector('#delPhotoBtn');
        if(delPhotoEl) delPhotoEl.addEventListener('click', async ()=>{
          if(!await Layout.confirmDialog('Smazat tuhle fotku? Nedá se to vrátit zpět.', 'Smazat')) return;
          msDeletePhoto(p.id);
          document.body.removeChild(overlay);
          draw();
        });
        wireGestures();
      }

      function applyTransform(){
        const img = overlay.querySelector('#photoImg');
        if(img) img.style.transform = `translate(calc(-50% + ${panX}px), calc(-50% + ${panY}px)) scale(${scale})`;
      }

      function dist(t0,t1){ return Math.hypot(t1.clientX-t0.clientX, t1.clientY-t0.clientY); }

      function wireGestures(){
        const vp = overlay.querySelector('#photoViewport');
        vp.addEventListener('touchstart', (e)=>{
          if(e.touches.length===2){
            startDist = dist(e.touches[0], e.touches[1]);
            startScale = scale;
          } else if(e.touches.length===1){
            startTouchX = e.touches[0].clientX; startTouchY = e.touches[0].clientY;
            startPanX = panX; startPanY = panY;
            swipeStartX = e.touches[0].clientX; dragDX = 0;
            swiping = scale<=1.02;
          }
        }, {passive:true});
        vp.addEventListener('touchmove', (e)=>{
          if(e.touches.length===2){
            const d = dist(e.touches[0], e.touches[1]);
            scale = Math.min(4, Math.max(1, startScale * (d/startDist)));
            applyTransform();
          } else if(e.touches.length===1){
            const dx = e.touches[0].clientX - startTouchX;
            const dy = e.touches[0].clientY - startTouchY;
            if(scale>1.02){
              panX = startPanX + dx; panY = startPanY + dy;
              applyTransform();
            } else if(swiping){
              dragDX = e.touches[0].clientX - swipeStartX;
              overlay.querySelector('#photoViewport').style.transform = `translateX(${dragDX}px)`;
              overlay.querySelector('#photoViewport').style.opacity = String(1 - Math.min(0.5, Math.abs(dragDX)/600));
            }
          }
        }, {passive:true});
        vp.addEventListener('touchend', ()=>{
          if(swiping && scale<=1.02){
            const vpEl = overlay.querySelector('#photoViewport');
            vpEl.style.transition = 'transform .18s ease, opacity .18s ease';
            if(dragDX < -60 && idx < list.length-1){ idx++; drawFrame(); }
            else if(dragDX > 60 && idx > 0){ idx--; drawFrame(); }
            else { vpEl.style.transform = 'translateX(0)'; vpEl.style.opacity = '1'; setTimeout(()=>{ if(vpEl) vpEl.style.transition=''; }, 200); }
          }
          if(scale < 1){ scale = 1; applyTransform(); }
        }, {passive:true});
        // double-tap = rychly zoom in/out
        let lastTap = 0;
        vp.addEventListener('touchend', ()=>{
          const now = Date.now();
          if(now - lastTap < 280){
            scale = scale>1 ? 1 : 2.5;
            panX=0; panY=0;
            applyTransform();
          }
          lastTap = now;
        }, {passive:true});
      }

      drawFrame();
    }

    draw();
    return { activeTab:'gallery' };
  }
  return { render };
})();
Router.register('gallery', GalleryScreen);
