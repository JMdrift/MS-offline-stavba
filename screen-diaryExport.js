/* ==========================================================
   STAVEBNI DENIK — offline export do jednoho tiskoveho PDF.
   Poradi: titul -> obsah -> chronologicke zapisy -> zaver ->
   kontrolni list dozoru -> seznam priloh -> rozbalene prilohy
   (2x A5 na jedne A4 nalezato).
   ========================================================== */
const DiaryExportScreen = (function(){
  const WEATHER = {
    slunecno:'Slunečno', zatazeno:'Zataženo', dest:'Déšť',
    snih:'Sníh', mraz:'Mráz'
  };

  function render(container, params){
    const presetStage = params && params.stage && params.stage !== 'all' && params.stage !== 'naradi' ? params.stage : 'all';
    const allEntries = msDiaryNumbered().filter(entry=> entry.stage !== 'naradi');
    const printedEntryIds = typeof msDiaryPrintedEntryIds === 'function' ? msDiaryPrintedEntryIds() : new Set();
    const unprintedEntries = allEntries.filter(entry=> !printedEntryIds.has(entry.id));
    const presetRange = params && ['new','all','custom'].includes(params.range) ? params.range : (unprintedEntries.length ? 'new' : 'all');
    const initialEntries = presetRange === 'new' ? unprintedEntries : allEntries;
    const dates = initialEntries.map(entry=>entry.date).filter(Boolean).sort();
    const state = {
      range: presetStage !== 'all' ? 'custom' : presetRange,
      from: dates[0] || msTodayISO(),
      to: dates[dates.length - 1] || msTodayISO(),
      stage: presetStage,
      includeContents:true,
      includePhotos:true,
      includeAttachments:true,
      includeConclusion:presetRange !== 'new',
      supervisorSheet:true,
      quality:'print',
      excludedEntries:new Set(),
      excludedAttachments:new Set()
    };

    function metaWithProject(){
      const saved = msDiaryMeta();
      const projects = msLoadProjects();
      const project = projects.find(item=> item.id === msGetActiveProjectId()) || projects[0] || {};
      return Object.assign({}, saved, {
        nazev:saved.nazev || project.name || '',
        misto:saved.misto || project.location || ''
      });
    }

    function metaReady(meta){ return !!(meta.nazev && meta.misto && meta.stavebnik && meta.dozor); }

    function drawMetaEditor(backToSetup){
      const meta = metaWithProject();
      container.innerHTML = `
        <div class="topbar">
          <div class="back-btn" id="backBtn">${backIcon()}</div>
          <div><p class="pdf-step-kicker">Údaje dokumentu</p><h1>Titulní strana</h1></div>
        </div>
        <div class="screen-scroll pdf-form-scroll">
          <div class="pdf-form-intro">
            <span>01</span>
            <div><b>Vyplníš jen poprvé</b><p>Údaje si appka uloží k projektu. Před každým exportem je můžeš upravit.</p></div>
          </div>
          <div class="pdf-form-section">
            <p class="pdf-section-no">STAVBA</p>
            ${field('mNazev','Název stavby *',meta.nazev,'Rodinný dům')}
            ${field('mMisto','Místo stavby *',meta.misto,'Obec, ulice nebo popis místa')}
            <div class="pdf-field-pair">
              ${field('mParcela','Parcelní číslo',meta.parcela,'123/45')}
              ${field('mKatastr','Katastrální území',meta.katastr,'Název k. ú.')}
            </div>
            ${field('mPovoleni','Číslo povolení / spisová značka',meta.povoleni,'Např. SÚ/1234/2026')}
          </div>
          <div class="pdf-form-section">
            <p class="pdf-section-no">OSOBY</p>
            ${field('mStavebnik','Stavebník (svépomoc) *',meta.stavebnik,'Jméno a příjmení')}
            ${field('mDozor','Stavební dozor *',meta.dozor,'Jméno a příjmení')}
            ${field('mDozorAut','Číslo oprávnění / autorizace dozoru',meta.dozorAutorizace,'Volitelné')}
            ${field('mProjektant','Projektant',meta.projektant,'Volitelné')}
          </div>
          <div class="pdf-paper-note">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 3h9l3 3v15H6z"/><path d="M9 11h6M9 15h6"/></svg>
            <p><b>Bez elektronického podpisu.</b> Výstup má připravená místa pro ruční podpisy a otisky razítka stavebního dozoru.</p>
          </div>
        </div>
        <div class="pdf-bottom-bar"><button class="btn-primary" id="saveMetaBtn">Uložit údaje a pokračovat</button></div>`;

      container.querySelector('#backBtn').addEventListener('click', ()=> backToSetup ? drawSetup() : Router.go('diary'));
      container.querySelector('#saveMetaBtn').addEventListener('click', ()=>{
        const value = id=> container.querySelector('#' + id).value.trim();
        if(!value('mNazev') || !value('mMisto') || !value('mStavebnik') || !value('mDozor')){
          alert('Vyplň prosím název, místo, stavebníka a stavební dozor.');
          return;
        }
        msSetDiaryMeta({
          nazev:value('mNazev'), misto:value('mMisto'), stavebnik:value('mStavebnik'),
          dozor:value('mDozor'), dozorAutorizace:value('mDozorAut') || null,
          projektant:value('mProjektant') || null, parcela:value('mParcela') || null,
          katastr:value('mKatastr') || null, povoleni:value('mPovoleni') || null
        });
        drawSetup();
      });
    }

    function drawSetup(){
      const meta = metaWithProject();
      if(!metaReady(meta)){ drawMetaEditor(false); return; }
      const stageOptions = msSelectedStages().filter(stage=> stage.key !== 'naradi');
      container.innerHTML = `
        <div class="topbar">
          <div class="back-btn" id="backBtn">${backIcon()}</div>
          <div><p class="pdf-step-kicker">Generátor PDF</p><h1>Stavební deník</h1></div>
        </div>
        <div class="screen-scroll pdf-form-scroll">
          <div class="pdf-generator-hero">
            <div><p>NASTAVENÍ</p><h2>Připrav tiskový originál</h2></div>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M6 3h9l3 3v15H6z"/><path d="M9 11h6M9 15h6"/><path d="M15 3v4h4"/></svg>
          </div>

          <div class="pdf-project-summary">
            <div class="pdf-project-monogram">${msEsc((meta.nazev || 'S').charAt(0).toUpperCase())}</div>
            <div><b>${msEsc(meta.nazev)}</b><span>${msEsc(meta.misto)} · ${msEsc(meta.stavebnik)}</span><small>Dozor: ${msEsc(meta.dozor)}</small></div>
            <button id="editMetaBtn">Upravit</button>
          </div>

          <div class="pdf-form-section">
            <p class="pdf-section-no">ROZSAH</p>
            <div class="pdf-choice-grid three">
              ${choiceCard('rangeNew','Od posledního tisku',unprintedEntries.length ? `${unprintedEntries.length} nových zápisů` : 'Všechny zápisy jsou vytištěné',state.range === 'new','new')}
              ${choiceCard('rangeAll','Celý deník','Všechny zápisy v časovém pořadí',state.range === 'all','all')}
              ${choiceCard('rangeCustom','Vlastní výběr','Období nebo jedna etapa',state.range === 'custom','custom')}
            </div>
            <div id="customRange" class="pdf-custom-range" ${state.range === 'custom' ? '' : 'hidden'}>
              <div class="pdf-field-pair">
                <label><span>Od</span><input class="f-input" type="date" id="rangeFrom" value="${attr(state.from)}"/></label>
                <label><span>Do</span><input class="f-input" type="date" id="rangeTo" value="${attr(state.to)}"/></label>
              </div>
              <label><span>Etapa</span><select class="f-input" id="rangeStage"><option value="all">Všechny etapy</option>${stageOptions.map(stage=>`<option value="${attr(stage.key)}" ${state.stage === stage.key ? 'selected' : ''}>${msEsc(stage.name)}</option>`).join('')}</select></label>
            </div>
          </div>

          <div class="pdf-form-section">
            <p class="pdf-section-no">OBSAH PDF</p>
            ${toggleRow('includeContents','Obsah deníku','Čísla zápisů a skutečné počáteční strany',state.includeContents,docIcon())}
            ${toggleRow('includePhotos','Fotodokumentace','Všechny fotky u jednoho zápisu, bez limitu počtu',state.includePhotos,photoIcon())}
            ${toggleRow('includeAttachments','Rozbalené přílohy','PDF i obrázky za závěrem, 2× A5 na A4',state.includeAttachments,clipIcon())}
            ${toggleRow('includeConclusion','Samostatný závěr','Nikdy se nespojí s posledním zápisem',state.includeConclusion,checkIcon())}
            <div class="pdf-fixed-content"><i>${stampIcon()}</i><span><b>Prázdný kontrolní list dozoru</b><small>Je v každém PDF; když ho nepotřebuješ, po tisku ho vyndáš</small></span><em>VŽDY</em></div>
          </div>

          <div class="pdf-form-section">
            <p class="pdf-section-no">TISK</p>
            <div class="pdf-format-row"><div><b>Přílohy</b><span>2× A5 na jedné A4 naležato</span></div><span class="pdf-fixed-badge">Doporučeno</span></div>
            <p class="f-label">Kvalita fotek v PDF</p>
            <div class="pdf-choice-grid compact">
              ${choiceCard('qualityPrint','Tisková','Ostřejší, větší soubor',state.quality === 'print','print')}
              ${choiceCard('qualityCompact','Úsporná','Menší PDF pro archiv',state.quality === 'compact','compact')}
            </div>
          </div>

          <div class="pdf-legal-note"><b>Praktická listinná podoba</b><p>Generátor hlídá posloupnost, číslování, oddělený závěr a prostor pro ruční potvrzení. Za věcnou správnost jednotlivých zápisů odpovídá stavebník.</p></div>
        </div>
        <div class="pdf-bottom-bar"><button class="btn-primary" id="reviewBtn">Zkontrolovat obsah →</button></div>`;

      container.querySelector('#backBtn').addEventListener('click', ()=> Router.go('diary'));
      container.querySelector('#editMetaBtn').addEventListener('click', ()=> drawMetaEditor(true));
      bindChoice('range', value=>{
        state.range = value;
        container.querySelector('#customRange').hidden = value !== 'custom';
      });
      bindChoice('quality', value=> state.quality = value);
      container.querySelectorAll('.pdf-toggle').forEach(button=>{
        button.addEventListener('click', ()=>{
          const key = button.dataset.key;
          state[key] = !state[key];
          button.dataset.on = state[key] ? '1' : '0';
          button.setAttribute('aria-pressed', state[key] ? 'true' : 'false');
        });
      });
      container.querySelector('#reviewBtn').addEventListener('click', ()=>{
        if(state.range === 'custom'){
          state.from = container.querySelector('#rangeFrom').value || state.from;
          state.to = container.querySelector('#rangeTo').value || state.to;
          state.stage = container.querySelector('#rangeStage').value || 'all';
          if(state.from > state.to){ alert('Datum „od“ musí být dříve než datum „do“.'); return; }
        }
        drawReview();
      });

      function bindChoice(group, callback){
        container.querySelectorAll(`.pdf-choice[data-group="${group}"]`).forEach(card=>{
          card.addEventListener('click', ()=>{
            container.querySelectorAll(`.pdf-choice[data-group="${group}"]`).forEach(item=>{
              item.dataset.selected = '0';
              const marker = item.querySelector('i');
              if(marker) marker.innerHTML = '';
            });
            card.dataset.selected = '1';
            const marker = card.querySelector('i');
            if(marker) marker.innerHTML = checkIcon();
            callback(card.dataset.value);
          });
        });
      }
    }

    function filteredEntries(){
      return allEntries.filter(entry=>{
        if(state.range === 'new') return !printedEntryIds.has(entry.id);
        if(state.range === 'all') return true;
        if(entry.date < state.from || entry.date > state.to) return false;
        return state.stage === 'all' || entry.stage === state.stage;
      });
    }

    function drawReview(){
      const entries = filteredEntries();
      state.excludedEntries = new Set([...state.excludedEntries].filter(id=> entries.some(entry=>entry.id === id)));
      container.innerHTML = `
        <div class="topbar">
          <div class="back-btn" id="backBtn">${backIcon()}</div>
          <div><p class="pdf-step-kicker">Kontrola</p><h1>Obsah deníku</h1></div>
          <span id="reviewCount" class="pdf-count-chip"></span>
        </div>
        <div class="screen-scroll pdf-form-scroll">
          <div class="pdf-review-note"><b>Jeden zápis zůstává jedním zápisem.</b><p>I když přeteče na další stránku nebo má mnoho fotek, číslo se nezmění. Klepnutím můžeš položku pouze vynechat z tohoto exportu.</p></div>
          ${state.range === 'new' ? `<div class="pdf-print-close-note"><b>Po vytištění můžeš tuto část uzavřít.</b><p>Zahrnuté zápisy se zamknou a příští průběžný export je už nebude znovu generovat. Samotné vytvoření náhledu nic neuzamkne.</p></div>` : ''}
          <div id="reviewList"></div>
        </div>
        <div class="pdf-bottom-bar"><button class="btn-primary" id="generateBtn">Vygenerovat PDF</button></div>`;
      container.querySelector('#backBtn').addEventListener('click', drawSetup);
      const list = container.querySelector('#reviewList');

      function paint(){
        const includedCount = entries.filter(entry=> !state.excludedEntries.has(entry.id)).length;
        container.querySelector('#reviewCount').textContent = `${includedCount} / ${entries.length}`;
        if(!entries.length){
          list.innerHTML = '<p class="empty-msg">Zvolenému rozsahu neodpovídá žádný zápis.</p>';
          return;
        }
        list.innerHTML = entries.map(entry=>{
          const stage = msStageByKey(entry.stage);
          const photoCount = entryPhotoCount(entry);
          const atts = entryAttachmentMetas(entry);
          const included = !state.excludedEntries.has(entry.id);
          return `<article class="pdf-review-entry" data-on="${included?'1':'0'}">
            <button class="pdf-review-check" data-entry="${attr(entry.id)}" aria-label="${included?'Vynechat':'Zahrnout'} zápis">${included ? checkIcon() : '+'}</button>
            <div class="pdf-review-copy">
              <p><span>Č. ${entry.number}</span><b>${formatDateCz(entry.date)}${entry.time ? ' · ' + msEsc(entry.time) : ''}</b><i>${stage ? msEsc(stage.name) : 'Bez etapy'}</i></p>
              <h3>${msEsc(shortText(entry.text || '(zápis bez textu)', 105))}</h3>
              <small>${photoCount ? `${photoCount} ${photoWord(photoCount)}` : 'bez fotek'}${atts.length ? ` · ${atts.length} ${attachmentWord(atts.length)}` : ''}</small>
              ${atts.length && state.includeAttachments ? `<div class="pdf-review-attachments">${atts.map(att=>{
                const key = att.type + ':' + att.id;
                const on = !state.excludedAttachments.has(key);
                return `<button data-att="${attr(key)}" data-on="${on?'1':'0'}">${clipIcon()}<span>${msEsc(att.name)}</span><b>${on?'×':'+'}</b></button>`;
              }).join('')}</div>` : ''}
            </div>
          </article>`;
        }).join('');
        list.querySelectorAll('.pdf-review-check').forEach(button=> button.addEventListener('click', ()=>{
          const id = button.dataset.entry;
          if(state.excludedEntries.has(id)) state.excludedEntries.delete(id); else state.excludedEntries.add(id);
          paint();
        }));
        list.querySelectorAll('[data-att]').forEach(button=> button.addEventListener('click', ()=>{
          const key = button.dataset.att;
          if(state.excludedAttachments.has(key)) state.excludedAttachments.delete(key); else state.excludedAttachments.add(key);
          paint();
        }));
      }
      paint();

      container.querySelector('#generateBtn').addEventListener('click', async ()=>{
        const chosen = entries.filter(entry=> !state.excludedEntries.has(entry.id));
        if(!chosen.length){ alert('Vyber alespoň jeden zápis.'); return; }
        drawGenerating();
        try{
          const pageOffset = state.range === 'new' && typeof msDiaryPrintedPageCount === 'function' ? msDiaryPrintedPageCount() : 0;
          const printPartNumber = state.range === 'new' && typeof msDiaryPrintBatches === 'function' ? msDiaryPrintBatches().length + 1 : null;
          const result = await buildDiaryPdf(Object.assign({}, state, {entries:chosen,pageOffset,printPartNumber}), updateGenerating);
          drawDone(result, chosen);
        }catch(error){
          console.error('Generování deníku selhalo', error);
          drawError(error);
        }
      });
    }

    function drawGenerating(){
      container.innerHTML = `<div class="pdf-generating"><div class="pdf-spinner"></div><p class="pdf-step-kicker">Pracuji místně v zařízení</p><h2>Skládám stavební deník</h2><p id="generateStatus">Připravuji titulní stranu…</p><div><i id="generateBar"></i></div><small>U velkého počtu fotek a PDF příloh to může chvíli trvat.</small></div>`;
    }
    function updateGenerating(done, total, label){
      const status = container.querySelector('#generateStatus');
      const bar = container.querySelector('#generateBar');
      if(status && label) status.textContent = label;
      if(bar) bar.style.width = (total ? Math.max(4, Math.round(done / total * 100)) : 4) + '%';
    }
    function drawError(error){
      container.innerHTML = `<div class="pdf-result"><div class="pdf-result-icon error">!</div><h2>PDF se nepodařilo vytvořit</h2><p>${msEsc(error && error.message ? error.message : 'Neznámá chyba.')}</p><button class="btn-primary" id="retryBtn">Zpět ke kontrole</button><button class="btn-ghost" id="diaryBtn">Zpět do deníku</button></div>`;
      container.querySelector('#retryBtn').addEventListener('click', drawReview);
      container.querySelector('#diaryBtn').addEventListener('click', ()=> Router.go('diary'));
    }
    function drawDone(result, chosenEntries){
      const warning = result.skippedAttachments ? `<div class="pdf-result-warning">${result.skippedAttachments} příloh nešlo rozbalit; zůstaly uvedené v seznamu příloh.</div>` : '';
      const canClose = state.range === 'new' && chosenEntries.some(entry=>!printedEntryIds.has(entry.id));
      container.innerHTML = `<div class="pdf-result"><div class="pdf-result-icon">${checkIcon()}</div><p class="pdf-step-kicker">Hotovo</p><h2>Deník je připravený</h2><p>${result.pageCount} stran · ${result.entryCount} zápisů${result.attachmentSheets ? ` · ${result.attachmentSheets} listů příloh` : ''}${result.pageOffset ? ` · listy ${result.pageOffset+1}-${result.pageOffset+result.pageCount}` : ''}</p>${warning}<button class="btn-ghost" id="previewBtn">Otevřít náhled</button><button class="btn-primary" id="saveBtn">Uložit / sdílet PDF</button>${canClose?`<div class="pdf-close-part"><b>Až bude PDF skutečně vytištěné</b><p>Potvrzením zápisy uzamkneš a další tisk začne až novými zápisy.</p><button id="closePartBtn">Označit jako vytištěné a uzavřít část</button></div>`:''}<button class="btn-ghost" id="doneBtn">Zpět do deníku</button></div>`;
      container.querySelector('#previewBtn').addEventListener('click', async ()=>{
        // (3.9.2026) NAHLED NESMI OTEVIRAT ULOZENI / SDILENI.
        // PDF uz je v teto chvili sestavene presne podle zvolene konfigurace.
        // V Android aplikaci ho zapiseme pouze do docasne cache a otevreme
        // pres systemovy PDF prohlizec. Samostatne tlacitko pod nim zustava
        // jedinou cestou pro "Ulozit / sdilet PDF".
        const blob = MsPdf.toBlob(result);
        if(typeof msJeNativniAppka === 'function' && msJeNativniAppka()){
          const ok = (typeof msNativniOtevritSoubor === 'function')
            ? await msNativniOtevritSoubor(blob, result.filename, 'application/pdf')
            : false;
          if(!ok){
            alert('Náhled PDF se v tomto zařízení nepodařilo otevřít. Zkontroluj, že má telefon aplikaci pro prohlížení PDF.');
          }
        } else {
          // (8.9.2026) Viz komentar v screen-diary.js - window.open
          // Safari na iPhonu blokuje, PDF se ukaze v prekryvu.
          const url = MsPdf.getBlobUrl(result);
          if(typeof msWebFileViewer==='function'){
            msWebFileViewer(url, result.filename || 'denik.pdf', 'application/pdf');
          }else{
            window.open(url, '_blank');
            setTimeout(()=>URL.revokeObjectURL(url), 60000);
          }
        }
      });
      container.querySelector('#saveBtn').addEventListener('click', ()=> MsPdf.saveOrShare(result, result.filename));
      container.querySelector('#doneBtn').addEventListener('click', ()=> Router.go('diary'));
      const closePartBtn = container.querySelector('#closePartBtn');
      if(closePartBtn) closePartBtn.addEventListener('click', async ()=>{
        if(!await Layout.confirmDialog('Potvrď až po skutečném vytištění. Zápisy se uzamknou a nepůjdou upravovat ani mazat.', 'Uzavřít tiskovou část')) return;
        const batch = msCloseDiaryPrintBatch(chosenEntries.map(entry=>entry.id), result.pageCount, {filename:result.filename});
        if(!batch){ alert('Tuto část se nepodařilo uzavřít nebo už byly všechny zápisy vytištěné.'); return; }
        closePartBtn.disabled = true;
        closePartBtn.textContent = `Tisková část č. ${batch.number} uzavřena · listy ${batch.firstPage}-${batch.lastPage}`;
        Layout.showSuccess('Tisková část uzavřena');
      });
    }

    if(metaReady(metaWithProject())) drawSetup(); else drawMetaEditor(false);
    return {showNav:false};
  }

  /* --------------------------- PDF SAZBA --------------------------- */
  async function buildDiaryPdf(options, onProgress){
    const entries = (options.entries || []).slice().sort((a,b)=> a.number - b.number);
    const meta = msDiaryMeta();
    const projects = msLoadProjects();
    const project = projects.find(item=> item.id === msGetActiveProjectId()) || projects[0] || {};
    const report = typeof onProgress === 'function' ? onProgress : ()=>{};
    const doc = MsPdf.newDoc();
    const cur = MsPdf.makeCursor(doc);
    const pageOffset = Math.max(0, Number(options.pageOffset) || 0);
    const dateSpan = entries.length ? `${formatDateCz(entries[0].date)} - ${formatDateCz(entries[entries.length - 1].date)}` : '-';
    const attachments = collectAttachments(entries, options.excludedAttachments || new Set());

    report(1, entries.length + attachments.length + 4, 'Sázím titulní stranu…');
    MsPdf.coverPage(doc, cur, 'STAVEBNÍ DENÍK', meta.nazev || project.name || 'Stavba', [
      ['Místo stavby', meta.misto || project.location],
      ['Parcelní číslo', meta.parcela],
      ['Katastrální území', meta.katastr],
      ['Stavebník (svépomoc)', meta.stavebnik],
      ['Stavební dozor', [meta.dozor, meta.dozorAutorizace].filter(Boolean).join(' / ')],
      ['Projektant', meta.projektant],
      ['Povolení / spisová značka', meta.povoleni],
      ['Tisková část', options.printPartNumber ? `Č. ${options.printPartNumber} / listy od ${pageOffset + 1}` : null],
      ['Rozsah deníku', dateSpan]
    ], `Listinný export obsahuje ${entries.length} ${entryWord(entries.length)} v původním časovém pořadí. Vytvořeno ${formatDateCz(msTodayISO())}.`);

    const tocPages = [];
    if(options.includeContents){
      const count = Math.max(1, Math.ceil(entries.length / 27));
      for(let index=0; index<count; index++){
        doc.addPage(); MsPdf.pageBorder(doc); tocPages.push(doc.internal.getNumberOfPages());
      }
    }

    const entryPages = new Map();
    doc.addPage(); MsPdf.pageBorder(doc); cur.y = MsPdf.MARGIN;

    for(let index=0; index<entries.length; index++){
      const entry = entries[index];
      report(index + 2, entries.length + attachments.length + 4, `Sázím zápis ${index + 1} z ${entries.length}…`);
      cur.setPageBreakHandler(null);
      if(index > 0 && cur.remaining() < 42) cur.addPage({skipHandler:true});
      entryPages.set(entry.id, doc.internal.getNumberOfPages() + pageOffset);
      drawEntryHeader(doc, cur, entry, false);
      cur.setPageBreakHandler(cursor=> drawEntryHeader(doc, cursor, entry, true));

      const stage = msStageByKey(entry.stage);
      if(stage) MsPdf.labelValueRow(doc, cur, 'Etapa', stage.name);
      if(entry.author) MsPdf.labelValueRow(doc, cur, 'Zapsal', entry.author);
      if(entry.worker) MsPdf.labelValueRow(doc, cur, 'Kdo pracoval', entry.worker);
      if(entry.workerCount != null) MsPdf.labelValueRow(doc, cur, 'Počet pracovníků', String(entry.workerCount));
      if(entry.weather){
        const weather = (WEATHER[entry.weather] || entry.weather) + (entry.temperature != null ? `, ${entry.temperature} °C` : '');
        MsPdf.labelValueRow(doc, cur, 'Počasí', weather);
      }
      if(entry.material) MsPdf.labelValueRow(doc, cur, 'Materiál', entry.material);
      cur.y += 1;
      MsPdf.paragraph(doc, cur, entry.text || '(zápis bez textu)', {size:10.1, lineH:5});
      if(entry.issue){
        cur.y += 2;
        MsPdf.paragraph(doc, cur, `Poznámka / problém: ${entry.issue}`, {size:9.2, color:MsPdf.MUTED});
      }

      if(options.includePhotos && entryPhotoCount(entry)){
        cur.ensure(13);
        cur.y += 3;
        smallHeading(doc, cur, `Fotodokumentace (${entryPhotoCount(entry)})`);
        await renderEntryPhotos(doc, cur, entry, options.quality);
      }

      const entryAttachments = attachments.filter(att=> att.entryNumbers.includes(entry.number));
      if(options.includeAttachments && entryAttachments.length){
        cur.ensure(12);
        cur.y += 2;
        smallHeading(doc, cur, 'Přílohy tohoto zápisu');
        entryAttachments.forEach(att=> MsPdf.paragraph(doc, cur, `${att.code}  ${att.name}`, {size:8.8, color:MsPdf.MUTED, lineH:4.2}));
      }

      // Oddělovač je pouze dekorace. Když se nevejde, nesmí kvůli němu
      // vzniknout nová stránka s osiřelou hlavičkou „pokračování“.
      if(cur.remaining() >= 9){
        cur.y += 3;
        doc.setDrawColor(...MsPdf.LINE); doc.setLineWidth(0.35);
        doc.line(MsPdf.MARGIN, cur.y, MsPdf.PAGE_W - MsPdf.MARGIN, cur.y);
        cur.y += 7;
      }
      await nextPaint();
    }

    cur.setPageBreakHandler(null);
    if(options.includeContents) drawContents(doc, tocPages, entries, entryPages);

    if(options.includeConclusion){
      doc.addPage(); MsPdf.pageBorder(doc); cur.y = MsPdf.MARGIN;
      drawConclusion(doc, cur, meta, entries, dateSpan, attachments.length);
    }
    // Dohodnuty papirovy postup: kontrolni list dozoru je soucasti kazdeho
    // vytisku. Neni to volitelna polozka formulare; kdo ho v konkretni
    // tiskove casti nepotrebuje, muze list po vytisteni fyzicky vyndat.
    doc.addPage(); MsPdf.pageBorder(doc); cur.y = MsPdf.MARGIN;
    drawSupervisorSheet(doc, cur, meta);
    if(options.includeAttachments && attachments.length){
      doc.addPage(); MsPdf.pageBorder(doc); cur.y = MsPdf.MARGIN;
      drawAttachmentIndex(doc, cur, attachments);
    }

    report(entries.length + 2, entries.length + attachments.length + 4, 'Připravuji fyzické přílohy…');
    const mainBlob = doc.output('blob');
    const merged = await mergeAttachments(mainBlob, options.includeAttachments ? attachments : [], (done, total, label)=>{
      report(entries.length + 2 + done, entries.length + attachments.length + 4, label);
    }, pageOffset);
    const safeProject = slug(meta.nazev || project.name || 'stavba');
    return {
      blob:merged.blob,
      pageCount:merged.pageCount,
      entryCount:entries.length,
      attachmentSheets:merged.attachmentSheets,
      skippedAttachments:merged.skippedAttachments,
      pageOffset,
      filename:`stavebni-denik-${safeProject}${options.printPartNumber ? '-cast-'+options.printPartNumber : ''}.pdf`
    };
  }

  function drawEntryHeader(doc, cur, entry, continuation){
    const stage = msStageByKey(entry.stage);
    const y = cur.y;
    doc.setFillColor(...MsPdf.DARK);
    doc.roundedRect(MsPdf.MARGIN, y, MsPdf.PAGE_W - MsPdf.MARGIN * 2, 17, 1.3, 1.3, 'F');
    doc.setFillColor(...MsPdf.BRICK);
    doc.rect(MsPdf.MARGIN, y, 3, 17, 'F');
    doc.setFont(MsPdf.font(doc), 'bold'); doc.setFontSize(11.2); doc.setTextColor(248,243,236);
    doc.text(`Zápis č. ${entry.number}${continuation ? ' - pokračování' : ''}`, MsPdf.MARGIN + 7, y + 7);
    doc.setFont(MsPdf.font(doc), 'normal'); doc.setFontSize(8.3); doc.setTextColor(202,193,182);
    doc.text(`${formatDateCz(entry.date)}${entry.time ? ' · ' + entry.time : ''}${stage ? ' · ' + stage.name : ''}`, MsPdf.MARGIN + 7, y + 12.5);
    cur.y = y + 23;
  }

  function smallHeading(doc, cur, text){
    doc.setFont(MsPdf.font(doc), 'bold'); doc.setFontSize(8.2); doc.setTextColor(...MsPdf.BRICK);
    doc.text(MsPdf.sanitize(text).toUpperCase(), MsPdf.MARGIN, cur.y);
    cur.y += 5.5;
  }

  async function renderEntryPhotos(doc, cur, entry, quality){
    const refs = (entry.items || []).filter(item=> item.type === 'photo').map(item=>item.refId);
    const fallback = (entry.photos || []).filter(Boolean);
    const total = refs.length || fallback.length;
    const dimension = quality === 'compact' ? 820 : 1200;
    const jpegQuality = quality === 'compact' ? 0.70 : 0.84;
    for(let start=0; start<total; start+=2){
      const pair = [];
      for(let index=start; index<Math.min(start+2,total); index++){
        let data = null;
        if(refs[index]){
          try{
            const photo = msFindPhotosByRefs([refs[index]])[0];
            data = photo ? await msPhotoFull(photo.id) : null;
            if(data) data = await msResizeDataUrl(data, dimension, jpegQuality);
          }catch(error){ console.warn('Plná fotka do PDF se nepodařila načíst.', error); }
        }
        pair.push(data || fallback[index] || null);
      }
      await MsPdf.photoRow(doc, cur, pair);
      await nextPaint();
    }
  }

  function drawContents(doc, pageNumbers, entries, entryPages){
    const rowsPerPage = 27;
    pageNumbers.forEach((pageNumber, pageIndex)=>{
      doc.setPage(pageNumber);
      let y = 27;
      doc.setFont(MsPdf.font(doc), 'bold'); doc.setFontSize(18); doc.setTextColor(...MsPdf.INK);
      doc.text(pageIndex ? 'Obsah - pokračování' : 'Obsah deníku', MsPdf.MARGIN, y);
      y += 5;
      doc.setDrawColor(...MsPdf.BRICK); doc.setLineWidth(1.1); doc.line(MsPdf.MARGIN, y, MsPdf.MARGIN + 24, y);
      y += 12;
      doc.setFillColor(...MsPdf.DARK); doc.rect(MsPdf.MARGIN, y - 5, MsPdf.PAGE_W - MsPdf.MARGIN * 2, 8, 'F');
      doc.setFont(MsPdf.font(doc), 'bold'); doc.setFontSize(7.5); doc.setTextColor(248,243,236);
      doc.text('ČÍSLO', MsPdf.MARGIN + 3, y); doc.text('DATUM', MsPdf.MARGIN + 24, y);
      doc.text('ETAPA / ZÁPIS', MsPdf.MARGIN + 53, y); doc.text('STR.', MsPdf.PAGE_W - MsPdf.MARGIN - 3, y, {align:'right'});
      y += 8;
      entries.slice(pageIndex * rowsPerPage, (pageIndex + 1) * rowsPerPage).forEach((entry, rowIndex)=>{
        if(rowIndex % 2){ doc.setFillColor(...MsPdf.CREAM); doc.rect(MsPdf.MARGIN, y - 4.5, MsPdf.PAGE_W - MsPdf.MARGIN * 2, 7.2, 'F'); }
        const stage = msStageByKey(entry.stage);
        const summary = `${stage ? stage.name + ' | ' : ''}${shortText(entry.text || 'Bez textu', 54)}`;
        doc.setFont(MsPdf.font(doc), 'normal'); doc.setFontSize(8.4); doc.setTextColor(...MsPdf.INK);
        doc.text(String(entry.number), MsPdf.MARGIN + 3, y);
        doc.text(formatDateCz(entry.date), MsPdf.MARGIN + 24, y);
        doc.text(doc.splitTextToSize(MsPdf.sanitize(summary), 103)[0], MsPdf.MARGIN + 53, y);
        doc.text(String(entryPages.get(entry.id) || '-'), MsPdf.PAGE_W - MsPdf.MARGIN - 3, y, {align:'right'});
        y += 7.2;
      });
    });
    doc.setPage(doc.internal.getNumberOfPages());
  }

  function drawConclusion(doc, cur, meta, entries, dateSpan, attachmentCount){
    MsPdf.heading(doc, cur, 'Závěr stavebního deníku');
    MsPdf.paragraph(doc, cur, `Tento list uzavírá export stavebního deníku v rozsahu ${dateSpan}. Dokument obsahuje ${entries.length} ${entryWord(entries.length)} v souvislé časové řadě${attachmentCount ? ` a ${attachmentCount} ${attachmentWord(attachmentCount)}` : ''}.`, {size:10.2, lineH:5.2});
    cur.y += 7;
    MsPdf.infoPill(doc, MsPdf.MARGIN, cur.y, 'První zápis', entries.length ? formatDateCz(entries[0].date) : '-', 52);
    MsPdf.infoPill(doc, MsPdf.MARGIN + 58, cur.y, 'Poslední zápis', entries.length ? formatDateCz(entries[entries.length-1].date) : '-', 52);
    MsPdf.infoPill(doc, MsPdf.MARGIN + 116, cur.y, 'Počet zápisů', String(entries.length), 40);
    cur.y += 25;
    doc.setFont(MsPdf.font(doc), 'bold'); doc.setFontSize(9); doc.setTextColor(...MsPdf.INK);
    doc.text('PROHLÁŠENÍ STAVEBNÍKA', MsPdf.MARGIN, cur.y); cur.y += 8;
    MsPdf.paragraph(doc, cur, 'Potvrzuji, že tento tisk odpovídá údajům vedeným v aplikaci ke dni vytvoření exportu. Případné ruční doplnění, podpisy a razítka se provedou na vytištěném originálu.', {size:9.4, color:MsPdf.MUTED});
    cur.y += 20;
    signatureArea(doc, MsPdf.MARGIN, cur.y, 74, 'datum a podpis stavebníka', meta.stavebnik || '');
    signatureArea(doc, MsPdf.PAGE_W - MsPdf.MARGIN - 74, cur.y, 74, 'podpis / razítko stavebního dozoru', meta.dozor || '');
    cur.y += 55;
    doc.setFillColor(...MsPdf.CREAM); doc.setDrawColor(...MsPdf.LINE);
    doc.roundedRect(MsPdf.MARGIN, cur.y, MsPdf.PAGE_W - MsPdf.MARGIN * 2, 45, 1.5, 1.5, 'FD');
    doc.setFont(MsPdf.font(doc), 'bold'); doc.setFontSize(8); doc.setTextColor(...MsPdf.MUTED);
    doc.text('ZÁVĚREČNÁ POZNÁMKA / DOPLNĚNÍ', MsPdf.MARGIN + 5, cur.y + 8);
    for(let index=0; index<4; index++){
      doc.setDrawColor(...MsPdf.LINE); doc.line(MsPdf.MARGIN + 5, cur.y + 17 + index * 7, MsPdf.PAGE_W - MsPdf.MARGIN - 5, cur.y + 17 + index * 7);
    }
  }

  function signatureArea(doc, x, y, width, label, name){
    doc.setDrawColor(...MsPdf.LINE); doc.setLineWidth(0.45);
    doc.roundedRect(x, y, width, 42, 1.3, 1.3);
    doc.line(x + 5, y + 27, x + width - 5, y + 27);
    doc.setFont(MsPdf.font(doc), 'normal'); doc.setFontSize(8.2); doc.setTextColor(...MsPdf.MUTED);
    doc.text(MsPdf.sanitize(name), x + 5, y + 33);
    doc.setFont(MsPdf.font(doc), 'bold'); doc.setFontSize(7.4);
    doc.text(MsPdf.sanitize(label).toUpperCase(), x + 5, y + 38);
  }

  function drawSupervisorSheet(doc, cur, meta){
    MsPdf.heading(doc, cur, 'Kontrolní záznamy stavebního dozoru');
    MsPdf.paragraph(doc, cur, 'List je určen pro ruční záznamy při návštěvách stavby. Stavební dozor nemusí používat účet ani elektronický podpis; po vytištění doplní datum, rozsah kontroly, výsledek, podpis a případně otisk razítka.', {size:9.2, color:MsPdf.MUTED, lineH:4.6});
    cur.y += 5;
    for(let index=0; index<5; index++){
      const y = cur.y;
      doc.setDrawColor(...MsPdf.LINE); doc.setLineWidth(0.4);
      doc.roundedRect(MsPdf.MARGIN, y, MsPdf.PAGE_W - MsPdf.MARGIN * 2, 42, 1.3, 1.3);
      doc.setFillColor(...MsPdf.DARK); doc.rect(MsPdf.MARGIN, y, 10, 42, 'F');
      doc.setFont(MsPdf.font(doc), 'bold'); doc.setFontSize(9); doc.setTextColor(248,243,236);
      doc.text(String(index + 1), MsPdf.MARGIN + 5, y + 8, {align:'center'});
      doc.setFont(MsPdf.font(doc), 'bold'); doc.setFontSize(7.1); doc.setTextColor(...MsPdf.MUTED);
      doc.text('DATUM KONTROLY', MsPdf.MARGIN + 15, y + 7);
      doc.text('ROZSAH / KONTROLOVANÉ PRÁCE', MsPdf.MARGIN + 61, y + 7);
      doc.text('PODPIS / RAZÍTKO', MsPdf.PAGE_W - MsPdf.MARGIN - 45, y + 7);
      doc.setDrawColor(...MsPdf.LINE);
      doc.line(MsPdf.MARGIN + 15, y + 14, MsPdf.MARGIN + 55, y + 14);
      doc.line(MsPdf.MARGIN + 61, y + 14, MsPdf.PAGE_W - MsPdf.MARGIN - 51, y + 14);
      doc.line(MsPdf.MARGIN + 15, y + 25, MsPdf.PAGE_W - MsPdf.MARGIN - 51, y + 25);
      doc.line(MsPdf.MARGIN + 15, y + 35, MsPdf.PAGE_W - MsPdf.MARGIN - 51, y + 35);
      doc.rect(MsPdf.PAGE_W - MsPdf.MARGIN - 45, y + 10, 39, 27);
      cur.y += 46;
    }
    doc.setFont(MsPdf.font(doc), 'normal'); doc.setFontSize(8); doc.setTextColor(...MsPdf.MUTED);
    doc.text(`Stavební dozor: ${MsPdf.sanitize(meta.dozor || '-')}${meta.dozorAutorizace ? ' / ' + MsPdf.sanitize(meta.dozorAutorizace) : ''}`, MsPdf.MARGIN, 276);
  }

  function drawAttachmentIndex(doc, cur, attachments){
    MsPdf.heading(doc, cur, 'Seznam příloh');
    MsPdf.paragraph(doc, cur, 'Za tímto seznamem následují rozbalené stránky příloh. Každý list A4 naležato obsahuje dvě tiskové plochy A5. Kód v levém horním rohu odpovídá tomuto seznamu.', {size:9.2, color:MsPdf.MUTED});
    cur.y += 4;
    MsPdf.table(doc, cur,
      [{label:'KÓD / NÁZEV',w:98},{label:'ZÁPIS Č.',w:34},{label:'TYP',w:25},{label:'STAV',w:17,align:'right'}],
      attachments.map(att=>[
        `${att.code}  ${att.name}`,
        att.entryNumbers.join(', '),
        att.mime === 'application/pdf' ? 'PDF' : (att.mime && att.mime.startsWith('image/') ? 'obrázek' : 'soubor'),
        att.hasContent ? 'vložen' : 'index'
      ])
    );
  }

  function collectAttachments(entries, excluded){
    const map = new Map();
    entries.forEach(entry=>{
      entryAttachmentMetas(entry).forEach(meta=>{
        const key = meta.type + ':' + meta.id;
        if(excluded && excluded.has(key)) return;
        if(!map.has(key)) map.set(key, Object.assign({}, meta, {entryNumbers:[]}));
        const target = map.get(key);
        if(!target.entryNumbers.includes(entry.number)) target.entryNumbers.push(entry.number);
      });
    });
    return [...map.values()].map((att, index)=> Object.assign(att, {code:'P-' + String(index + 1).padStart(3,'0')}));
  }

  function entryAttachmentMetas(entry){
    const docs = typeof msDocuments === 'function' ? msDocuments() : [];
    const projectItems = typeof msLoadProjectItems === 'function' ? msLoadProjectItems() : [];
    const out = [];
    (entry.items || []).forEach(item=>{
      if(item.type === 'document'){
        const doc = docs.find(candidate=> candidate.id === item.refId);
        if(doc && !doc.isNote) out.push({
          type:'document', id:doc.id, name:doc.name || 'Dokument', mime:doc.mime || mimeFromData(doc.content),
          // Plny dokument je v IndexedDB a zamerne neni pri startu v RAM.
          hasContent:true,
          getContent:async()=> doc.content || (typeof msDocumentContent==='function' ? await msDocumentContent(doc.id) : await msIdbGet(msBlobKey('doc', doc.id)))
        });
      }else if(item.type === 'projectitem'){
        const projectItem = projectItems.find(candidate=> candidate.id === item.refId);
        if(projectItem && !projectItem.isNote){
          out.push({
            type:'projectitem', id:projectItem.id, name:projectItem.name || 'Soubor projektu',
            mime:projectItem.mime || '', hasContent:true,
            getContent:async()=> typeof msProjectItemContent==='function' ? await msProjectItemContent(projectItem.id) : await msIdbGet(msBlobKey('pitem', projectItem.id))
          });
        }
      }
    });
    return out;
  }

  async function mergeAttachments(mainBlob, attachments, onProgress, pageOffset){
    if(!window.PDFLib){
      return {blob:mainBlob, pageCount:0, attachmentSheets:0, skippedAttachments:attachments.length};
    }
    const {PDFDocument, StandardFonts, rgb} = window.PDFLib;
    const mainBytes = new Uint8Array(await mainBlob.arrayBuffer());
    const output = await PDFDocument.load(mainBytes);
    const labelFont = await output.embedFont(StandardFonts.Helvetica);
    const labelBold = await output.embedFont(StandardFonts.HelveticaBold);
    const A4_LANDSCAPE = [841.89, 595.28];
    const halfWidth = A4_LANDSCAPE[0] / 2;
    let slot = 0;
    let sheet = null;
    let attachmentSheets = 0;
    let skippedAttachments = 0;

    function nextSlot(label){
      if(slot === 0){
        sheet = output.addPage(A4_LANDSCAPE);
        attachmentSheets++;
        sheet.drawLine({start:{x:halfWidth,y:18},end:{x:halfWidth,y:A4_LANDSCAPE[1]-18},thickness:0.6,color:rgb(.72,.69,.65)});
      }
      const x0 = slot * halfWidth;
      const box = {x:x0 + 15, y:22, w:halfWidth - 30, h:A4_LANDSCAPE[1] - 56};
      sheet.drawRectangle({x:x0 + 8,y:12,width:halfWidth - 16,height:A4_LANDSCAPE[1]-24,borderWidth:0.7,borderColor:rgb(.72,.69,.65)});
      sheet.drawRectangle({x:x0 + 8,y:A4_LANDSCAPE[1]-31,width:halfWidth-16,height:19,color:rgb(.12,.11,.10)});
      sheet.drawRectangle({x:x0 + 8,y:A4_LANDSCAPE[1]-31,width:4,height:19,color:rgb(.78,.34,.18)});
      sheet.drawText(ascii(label).slice(0,76), {x:x0 + 18,y:A4_LANDSCAPE[1]-25,size:8,font:labelBold,color:rgb(.96,.94,.91)});
      slot = slot === 0 ? 1 : 0;
      return {page:sheet, box};
    }

    for(let index=0; index<attachments.length; index++){
      const att = attachments[index];
      if(onProgress) onProgress(index + 1, attachments.length, `Rozbaluji přílohu ${index + 1} z ${attachments.length}…`);
      let data = null;
      try{ data = await att.getContent(); }catch(error){}
      if(!data){ skippedAttachments++; continue; }
      const mime = att.mime || mimeFromData(data);
      try{
        if(mime === 'application/pdf'){
          const source = await PDFDocument.load(dataUrlToBytes(data), {ignoreEncryption:true});
          const sourcePages = source.getPages();
          for(let pageIndex=0; pageIndex<sourcePages.length; pageIndex++){
            const embedded = await output.embedPage(sourcePages[pageIndex]);
            const target = nextSlot(`${att.code} | ${att.name} | strana ${pageIndex + 1}/${sourcePages.length}`);
            drawEmbeddedPage(target.page, embedded, target.box);
          }
        }else if(mime === 'image/png' || mime === 'image/jpeg' || mime === 'image/jpg'){
          const bytes = dataUrlToBytes(data);
          const image = mime === 'image/png' ? await output.embedPng(bytes) : await output.embedJpg(bytes);
          const target = nextSlot(`${att.code} | ${att.name}`);
          drawEmbeddedImage(target.page, image, target.box);
        }else skippedAttachments++;
      }catch(error){
        console.warn('Přílohu se nepodařilo rozbalit:', att.name, error);
        skippedAttachments++;
      }
      await nextPaint();
    }

    const pages = output.getPages();
    pages.forEach((page, index)=>{
      const size = page.getSize();
      const label = `List ${Math.max(0, Number(pageOffset) || 0) + index + 1}`;
      page.drawText(label, {x:size.width - 50,y:9,size:7,font:labelFont,color:rgb(.42,.39,.36)});
    });
    const finalBytes = await output.save({useObjectStreams:true});
    return {
      blob:new Blob([finalBytes], {type:'application/pdf'}),
      pageCount:pages.length,
      attachmentSheets,
      skippedAttachments
    };
  }

  function drawEmbeddedPage(page, embedded, box){
    const scale = Math.min(box.w / embedded.width, box.h / embedded.height);
    const width = embedded.width * scale, height = embedded.height * scale;
    page.drawPage(embedded, {x:box.x + (box.w-width)/2,y:box.y + (box.h-height)/2,width,height});
  }
  function drawEmbeddedImage(page, image, box){
    const size = image.scale(1);
    const scale = Math.min(box.w / size.width, box.h / size.height);
    const width = size.width * scale, height = size.height * scale;
    page.drawImage(image, {x:box.x + (box.w-width)/2,y:box.y + (box.h-height)/2,width,height});
  }

  function entryPhotoCount(entry){
    const refs = (entry.items || []).filter(item=> item.type === 'photo').length;
    return refs || (entry.photos || []).filter(Boolean).length;
  }
  function mimeFromData(data){
    const match = String(data || '').match(/^data:([^;,]+)/i);
    return match ? match[1].toLowerCase() : null;
  }
  function dataUrlToBytes(data){
    if(data instanceof Uint8Array) return data;
    if(data instanceof ArrayBuffer) return new Uint8Array(data);
    const value = String(data || '');
    const comma = value.indexOf(',');
    if(comma < 0) throw new Error('Neplatný obsah přílohy.');
    const header = value.slice(0, comma);
    const body = value.slice(comma + 1);
    if(/;base64/i.test(header)){
      const binary = atob(body);
      const bytes = new Uint8Array(binary.length);
      for(let index=0; index<binary.length; index++) bytes[index] = binary.charCodeAt(index);
      return bytes;
    }
    return new TextEncoder().encode(decodeURIComponent(body));
  }
  function ascii(text){
    return String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7E]/g,'-');
  }
  function slug(text){
    return ascii(text).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48) || 'stavba';
  }
  function shortText(text, length){
    const clean = String(text || '').replace(/\s+/g,' ').trim();
    if(clean.length <= length) return clean;
    const cut = clean.slice(0, length);
    return cut.slice(0, Math.max(cut.lastIndexOf(' '), length - 16)) + '…';
  }
  function nextPaint(){ return new Promise(resolve=> setTimeout(resolve, 0)); }
  function formatDateCz(iso){
    if(!iso) return '-';
    const parts = String(iso).split('-');
    return parts.length === 3 ? `${Number(parts[2])}. ${Number(parts[1])}. ${parts[0]}` : iso;
  }
  function entryWord(count){ return count === 1 ? 'zápis' : (count >= 2 && count <= 4 ? 'zápisy' : 'zápisů'); }
  function photoWord(count){ return count === 1 ? 'fotka' : (count >= 2 && count <= 4 ? 'fotky' : 'fotek'); }
  function attachmentWord(count){ return count === 1 ? 'příloha' : (count >= 2 && count <= 4 ? 'přílohy' : 'příloh'); }
  function attr(value){ return String(value == null ? '' : value).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }
  function field(id,label,value,placeholder){ return `<label class="pdf-field"><span>${label}</span><input class="f-input" id="${id}" value="${attr(value || '')}" placeholder="${attr(placeholder || '')}"/></label>`; }
  function choiceCard(id,title,subtitle,selected,value){
    const group = id.startsWith('range') ? 'range' : 'quality';
    return `<button type="button" class="pdf-choice" data-group="${group}" data-value="${value}" data-selected="${selected?'1':'0'}"><i>${selected?checkIcon():''}</i><b>${title}</b><span>${subtitle}</span></button>`;
  }
  function toggleRow(key,title,subtitle,on,icon){
    return `<button type="button" class="pdf-toggle" data-key="${key}" data-on="${on?'1':'0'}" aria-pressed="${on?'true':'false'}"><i>${icon}</i><span><b>${title}</b><small>${subtitle}</small></span><em></em></button>`;
  }
  function backIcon(){ return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>'; }
  function checkIcon(){ return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>'; }
  function docIcon(){ return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 3h9l3 3v15H6z"/><path d="M9 11h6M9 15h6"/></svg>'; }
  function photoIcon(){ return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="6" width="18" height="14"/><circle cx="9" cy="11" r="2"/><path d="M21 16l-5-5L6 20"/></svg>'; }
  function clipIcon(){ return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M21 11.5l-8.8 8.8a5 5 0 0 1-7.1-7.1l9.2-9.2a3.5 3.5 0 0 1 5 5l-9.2 9.2a2 2 0 1 1-2.8-2.8l8.5-8.5"/></svg>'; }
  function stampIcon(){ return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 14h8l2 4H6z"/><path d="M9 14V9a3 3 0 0 1 6 0v5"/><path d="M5 21h14"/></svg>'; }

  return {render, buildDiaryPdf, formatDateCz};
})();
Router.register('diary-export', DiaryExportScreen);
