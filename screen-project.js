/* Prohlizec souboru pro web/PWA  (8.9.2026)

   Nahrazuje window.open(url,'_blank'), ktere Safari na iPhonu blokuje
   jako vyskakovaci okno - soubor se nacita z IndexedDB (await), takze
   v okamziku volani uz neplati uzivatelske klepnuti.

   DVE VECI, KTERE SE MUSELY DOLADIT PODLE iPHONU:
   1. Horni lista musi respektovat env(safe-area-inset-top), jinak se
      schova pod stavovy radek a kriz na zavreni je nedosazitelny.
   2. PDF v <iframe> Safari vykresli, ale NEJDE v nem priblizovat -
      gesta si bere ram. Proto je pod nahledem velke tlacitko, ktere
      PDF otevre v samostatnem panelu Safari; tam funguje prstove
      priblizovani i vlastni zavreni. Tlacitko klika clovek sam, takze
      u nej gesto plati a Safari ho pusti. */
function msWebFileViewer(url, name, mime){
  const jeObrazek = /^image\//.test(mime);
  const jePdf = mime === 'application/pdf' || /\.pdf$/i.test(name || '');

  const ov = document.createElement('div');
  ov.className = 'ms-overlay';
  ov.style.cssText = 'position:fixed;inset:0;z-index:9998;background:#0d0d0d;display:flex;flex-direction:column';
  ov.innerHTML = `
    <div style="flex:0 0 auto;padding-top:env(safe-area-inset-top,0px);background:#161616;border-bottom:1px solid rgba(255,255,255,.14)">
      <div style="display:flex;align-items:center;gap:10px;padding:10px 12px">
        <b style="flex:1;min-width:0;font-size:12.5px;color:#f2f2f2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${msEsc(name || 'Soubor')}</b>
        <button id="fvClose" style="flex:0 0 auto;border:1px solid rgba(255,255,255,.28);background:transparent;color:#f2f2f2;width:38px;height:38px;font-size:17px;line-height:1;cursor:pointer;font-family:inherit">✕</button>
      </div>
    </div>
    <div id="fvBody" style="flex:1;min-height:0;overflow:auto;display:flex;align-items:center;justify-content:center;padding:0;-webkit-overflow-scrolling:touch"></div>
    <div id="fvFoot" style="flex:0 0 auto;padding:10px 12px calc(10px + env(safe-area-inset-bottom,0px));background:#161616;border-top:1px solid rgba(255,255,255,.14)"></div>`;

  const body = ov.querySelector('#fvBody');
  const foot = ov.querySelector('#fvFoot');

  function tlacitko(text){
    return `<a href="${url}" target="_blank" rel="noopener"
      style="display:block;text-align:center;border:1.5px solid var(--accent);color:var(--accent);
      padding:13px;font-weight:800;font-size:13px;text-decoration:none;font-family:inherit">${text}</a>`;
  }

  if(jeObrazek){
    body.style.padding = '8px';
    body.innerHTML = `<img src="${url}" alt="" style="max-width:100%;max-height:100%;object-fit:contain"/>`;
    foot.innerHTML = tlacitko('Otevřít v prohlížeči');
  }else if(jePdf){
    body.innerHTML = `<iframe src="${url}" style="width:100%;height:100%;border:0;background:#fff"></iframe>`;
    foot.innerHTML = `<p style="margin:0 0 8px;font-size:10.5px;color:#8a8a8a;line-height:1.45;text-align:center">
        Náhled nejde přibližovat. Pro čtení otevři PDF v prohlížeči.</p>`
      + tlacitko('Otevřít PDF v prohlížeči');
  }else{
    body.style.padding = '24px';
    body.innerHTML = `<p style="text-align:center;color:#c7cee6;font-size:12.5px;line-height:1.6;margin:0;max-width:320px">
      Tenhle typ souboru prohlížeč neumí zobrazit přímo. Můžeš si ho stáhnout a otevřít v aplikaci, která ho zvládne.</p>`;
    foot.innerHTML = `<a href="${url}" download="${msEsc(name || 'soubor')}"
      style="display:block;text-align:center;border:1.5px solid var(--accent);color:var(--accent);
      padding:13px;font-weight:800;font-size:13px;text-decoration:none;font-family:inherit">Stáhnout soubor</a>`;
  }

  function zavri(){
    if(ov.parentNode) ov.parentNode.removeChild(ov);
    // Blob se uvolni az s odstupem - kdyby si ho Safari jeste nacitalo
    // do noveho panelu, predcasne uvolneni by ho shodilo.
    setTimeout(()=>{ try{ URL.revokeObjectURL(url); }catch(e){} }, 120000);
  }
  ov.querySelector('#fvClose').addEventListener('click', zavri);
  document.body.appendChild(ov);
}

/* ==========================================================
   PROJEKT (spravce dokumentu) - 1.8.2026, prestavba na plochou
   strukturu se stalymi ID slozek (misto hledani podle jmena/cesty).
   Slozky zaklada/mate/mize jen VLASTNIK, soubory pridavaji OBA
   smery obousmerne. Tenhle system se ted pouziva i pro Nabidky a
   Dulezite (kazde zvlast pro kazdou etapu, viz params.scope).
   "Dokumenty etap" ma vlastni, oddeleny rezim (kdyz je stage bez
   scope) - nezmeneno, pouziva msDocuments()/msAddDocument(), kvuli
   propojeni na frontu do deniku a export PDF.
   ========================================================== */
const ProjectScreen = (function(){
  /* Ikona souboru. (13.8.2026) Byla uvnitr renderFolders, takze na ni
     dokumenty etapy nedosahly - stejna past jako u konstanty na
     Dashboardu. Ted stoji nad obema obrazovkami. */
  function fileIconSvg(mime, color){
    if(mime === 'application/pdf'){
      return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8"><path d="M6 3h9l3 3v15H6z"/><text x="6" y="13" font-size="5.5" fill="${color}" stroke="none" font-weight="800">PDF</text></svg>`;
    }
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8"><path d="M6 3h9l3 3v15H6z"/><path d="M9 10h6M9 14h6"/></svg>`;
  }


  /* OTEVIRANI LIBOVOLNEHO SOUBORU NA ANDROIDU (3.9.2026)
     WebView neumi spolehlive window.open(blob:...) pro PDF/DOCX/XLSX/ZIP...
     Soubor proto zapiseme do cache a nativni plugin ho preda Androidu
     pres ACTION_VIEW. Otevira ho aplikace, kterou ma uzivatel pro dany
     typ nainstalovanou (PDF reader, Word, Excel, spravce archivu...). */
  async function openAnyStoredFile(dataUrl, name, mime){
    try{
      const isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
      const plugs = window.Capacitor && window.Capacitor.Plugins;
      if(isNative && plugs && plugs.Filesystem && plugs.MSFileOpen){
        const raw = String(dataUrl || '');
        const comma = raw.indexOf(',');
        if(comma < 0) throw new Error('Neplatny obsah souboru');
        const safeName = (typeof msBezpecnyNazevSouboru === 'function')
          ? msBezpecnyNazevSouboru(name || 'soubor', 0)
          : String(name || 'soubor').replace(/[\\/:*?"<>|]+/g,'-');
        const written = await plugs.Filesystem.writeFile({
          path: 'otevrit/' + safeName,
          data: raw.slice(comma + 1),
          directory: 'CACHE',
          recursive: true
        });
        await plugs.MSFileOpen.open({
          uri: written.uri,
          name: safeName,
          mime: mime || ''
        });
        return true;
      }
    }catch(err){
      console.error('Nativni otevreni souboru selhalo', err);
      const msg = String((err && (err.message || err.errorMessage)) || '');
      if(/neni nainstalovana|no app|activity/i.test(msg)){
        alert('V telefonu není aplikace, která umí tento typ souboru otevřít. Soubor ale zůstává bezpečně uložený v projektu a můžeš ho sdílet nebo otevřít po instalaci příslušné aplikace.');
        return true;
      }
    }

    /* WEB / PWA  (8.9.2026)
       Driv tu bylo window.open(url,'_blank'). Na iPhonu to Safari
       BLOKUJE jako vyskakovaci okno: soubor se nacita z IndexedDB
       (await), takze v okamziku volani uz neplati uzivatelske
       klepnuti - a Safari otevre nove okno jen okamzite pri doteku.
       Vysledek byl, ze se nestalo vubec nic.

       Reseni: soubor se ukaze v prekryvu primo v appce. Zadne nove
       okno, zadne blokovani. Odkaz "Otevrit v novem panelu" v hlavicce
       uz klika clovek sam, takze u nej gesto plati a projde. */
    try{
      const parts = String(dataUrl || '').split(',');
      const meta = parts[0] || '';
      const b64 = parts.slice(1).join(',');
      const realMime = (meta.match(/data:(.*);base64/)||[])[1] || mime || 'application/octet-stream';
      const bytes = atob(b64);
      const arr = new Uint8Array(bytes.length);
      for(let i=0;i<bytes.length;i++) arr[i] = bytes.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([arr], {type:realMime}));
      msWebFileViewer(url, name || 'Soubor', realMime);
      return true;
    }catch(err){
      console.error('Webove otevreni souboru selhalo', err);
      alert('Soubor je uložený, ale v tomto zařízení ho nejde přímo zobrazit. Zkus ho otevřít přes nabídku Sdílet.');
      return false;
    }
  }



  function render(container, params){
    const scope = (params && params.scope) || ((params && params.stage) ? 'dokumenty' : 'projekt');
    if(scope === 'dokumenty' && params.stage) return renderStageDocs(container, params);
    return renderFolders(container, params, scope);
  }

  /* -------------------- REZIM: Dokumenty konkretni etapy -------------------- */
  function renderStageDocs(container, params){
    const s = msStageByKey(params.stage);
    const activeProjectsSD = msLoadProjects();
    const activeProjectSD = activeProjectsSD.find(p=>p.id===msGetActiveProjectId());
    const isOwnerSD = !(activeProjectSD && activeProjectSD.isShared);
    const canAddHereSD = (typeof msCanAddSection === 'function') ? msCanAddSection('etapy') : true;
    // Slozky pro dokumenty etapy (14.8.2026): dokumenty samotne zustavaji
    // na msDocuments() (viz komentar nahore v souboru), ale slozky, do
    // kterych se daji zaradit, jsou ze STEJNE sdilene tabulky, jakou uz
    // pouzivaji Nabidky a Dulezite - jen s vlastnim scope 'etapa'.
    let pathStackSD = []; // {id, name} od korene dolu
    let searchQuerySD = '';
    function currentFolderIdSD(){ return pathStackSD.length ? pathStackSD[pathStackSD.length-1].id : null; }
    container.innerHTML = `
      <div class="topbar ms-ui-topbar project-v2-topbar stage-docs-v2-topbar">
        <div class="back-btn" id="backBtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></div>
        <div class="ms-ui-title">
          <p>${s ? msEsc(s.name) : 'Obsah etapy'}</p>
          <h1 id="pathTitleSD">Dokumenty</h1>
        </div>
        <div class="ms-ui-actions">
          <button class="project-v2-search-btn" id="projectSearchBtnSD" aria-label="Hledat v této složce">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>
          </button>
        </div>
      </div>
      <div class="project-v2-search" id="projectSearchWrapSD" hidden>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>
        <input id="projectSearchInputSD" type="search" placeholder="Hledat složku nebo dokument…" autocomplete="off" />
        <button id="projectSearchClearSD" aria-label="Zrušit hledání">×</button>
      </div>
      <div class="screen-scroll project-v2-scroll stage-docs-v2-scroll">
        <nav id="projectBreadcrumbsSD" class="project-v2-breadcrumbs" hidden aria-label="Umístění ve složkách"></nav>
        <!-- ZMENA (11.8.2026): drive byla jedna mrizka 3x pro slozky i
             soubory dohromady. Fotka v ni mela ctvercovy nahled pres
             celou sirku dlazdice, takze ROZTAHLA cely radek a vedle ni
             zustalo prazdno; dlouhe nazvy se navic v tretine sirky
             orezaly na "Souhrnná technická ...". Ted maji slozky
             vlastni mrizku (dve v radku, at se nazev vejde) a soubory
             jsou seznam s pevnou vyskou radku - fotka i PDF vypadaji
             stejne velke a na nazev je cela sirka. -->
        <div id="emptyWrap"></div>
        <div id="foldersWrap" style="margin-bottom:14px"></div>
        <div id="filesWrap" style="margin-bottom:12px"></div>
        <div id="grid" style="display:none"></div>
      </div>
      <input type="file" id="fileInput" multiple style="display:none"/>
      <input type="file" id="cameraInputSD" accept="image/*" capture="environment" style="display:none"/>
    `;
    container.querySelector('#backBtn').addEventListener('click', ()=>{
      if(pathStackSD.length>0){ pathStackSD.pop(); searchQuerySD=''; container.querySelector('#projectSearchInputSD').value=''; draw(); }
      else Router.back();
    });
    const searchWrapSD = container.querySelector('#projectSearchWrapSD');
    const searchInputSD = container.querySelector('#projectSearchInputSD');
    container.querySelector('#projectSearchBtnSD').addEventListener('click', ()=>{
      searchWrapSD.hidden = !searchWrapSD.hidden;
      if(!searchWrapSD.hidden) setTimeout(()=>searchInputSD.focus(), 0);
    });
    container.querySelector('#projectSearchClearSD').addEventListener('click', ()=>{
      searchQuerySD=''; searchInputSD.value=''; searchWrapSD.hidden=true; draw();
    });
    searchInputSD.addEventListener('input', ()=>{
      searchQuerySD = searchInputSD.value.trim().toLocaleLowerCase('cs');
      draw();
    });
    let clickTargets = [], deleteTargets = [], renameTargets = [], shareTargets = [], moveTargets = [];
    function tile(name, sub, mime, onClick, onDelete, author, onRename, onShare){
      const idx = clickTargets.length;
      clickTargets.push(onClick); deleteTargets.push(onDelete); renameTargets.push(onRename||null); shareTargets.push(onShare||null);
      const isPdf = mime === 'application/pdf';
      const color = isPdf ? 'var(--add-color)' : '#94a0bc';
      const borderColor = isPdf ? 'var(--add-color)' : 'color-mix(in srgb, var(--muted) 75%, transparent)';
      const authorBadge = (author && author!=='Stavebník') ? `<span style="display:block;margin-top:4px;border:1px solid #25b7ff;color:#25b7ff;padding:1px 6px;font-size:8.5px;font-weight:700;max-width:100%;margin-left:auto;margin-right:auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;box-sizing:border-box">👤 ${author.replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</span>` : '';
      return `<div class="tile-item" data-idx="${idx}" style="position:relative;border:1.5px solid ${borderColor};padding:9px 6px;text-align:center;cursor:${onClick?'pointer':'default'};min-width:0">
        ${(onDelete||onRename||onShare) ? `<span class="tile-menu" data-idx="${idx}" style="position:absolute;top:3px;right:3px;width:20px;height:20px;border:1px solid var(--line);border-radius:var(--radius);display:grid;place-items:center;color:var(--muted);cursor:pointer;background:var(--card-bg-2)">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg>
        </span>` : ''}
        <span class="tile-visual"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8">${isPdf ? `<path d="M6 3h9l3 3v15H6z"/><text x="6" y="13" font-size="5.5" fill="${color}" stroke="none" font-weight="800">PDF</text>` : '<path d="M6 3h9l3 3v15H6z"/><path d="M9 10h6M9 14h6"/>'}</svg></span>
        <b style="display:block;margin-top:5px;font-size:10.5px;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${msEsc(name)}</b>
        <span style="font-size:9.5px;color:var(--muted)">${msEsc(sub)}</span>
        ${authorBadge}
      </div>`;
    }
    /* ZMENA (11.8.2026): tuzka a kos primo na dlazdici zabiraly misto,
       daly se snadno trefit omylem a u malych dlazdic se do rohu spatne
       mirilo. Ted je misto nich jedna nabidka pod tremi teckami.
       Vzhled: puvodne to byl holy seznam radku s carami pres celou
       sirku - pusobil jako tabulka. Ted ma kazda volba ikonu, "Zrusit"
       stoji odsazene zvlast a v hlavicce je ikona te konkretni polozky,
       prevzata primo z dlazdice - nabidka tak navazuje na to, na co
       clovek klepnul. */
    function openTileMenu(idx, anchorName, anchorSub, visualHtml){
      const onRename = renameTargets[idx];
      const onDelete = deleteTargets[idx];
      const onShare  = (typeof shareTargets !== 'undefined') ? shareTargets[idx] : null;
      const onMove   = (typeof moveTargets !== 'undefined') ? moveTargets[idx] : null;
      const overlay = document.createElement('div');
      overlay.className = 'ms-overlay ms-sheet-backdrop';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:80;display:flex;align-items:flex-end;justify-content:center;padding:0 10px calc(10px + min(var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)),34px))';

      const ICON = {
        share: '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M8 8l4-4 4 4"/><path d="M4 14v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5"/></svg>',
        ren:   '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
        del:   '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V7"/><path d="M10 11v6M14 11v6"/></svg>',
        mov:   '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="1"/><path d="M3 7l2-3h6l2 3"/><path d="M12 12v5M9.5 14.5L12 12l2.5 2.5"/></svg>'
      };
      // ZMENA (11.8.2026): misto radku pod sebou (pusobilo jako seznam)
      // jsou akce vedle sebe jako tlacitka - stejny tvar a rec jako
      // dlazdice v samotnem Projektu, jen s ikonou nad popiskem.
      const btn = (id, label, cls)=>
        `<button class="ms-sheet-btn ${cls||''}" data-id="${id}">${ICON[id]||''}<span>${label}</span></button>`;

      overlay.innerHTML = `
        <div class="ms-sheet" style="width:100%;max-width:460px">
          <div style="background:var(--card-bg-2);border:1px solid var(--line);border-left:3px solid var(--accent)">
            <div style="display:flex;align-items:center;gap:11px;padding:13px 16px;border-bottom:1px solid var(--line)">
              <div class="ms-sheet-visual" style="width:38px;height:38px;flex:0 0 38px;border:1px solid var(--line);display:grid;place-items:center;overflow:hidden;background:var(--card-bg)">${visualHtml||''}</div>
              <div style="min-width:0;flex:1">
                <b style="display:block;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${msEsc(anchorName || '')}</b>
                <span style="font-size:10.5px;color:var(--muted)">${msEsc(anchorSub || '')}</span>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(${[onShare,onMove,onRename,onDelete].filter(Boolean).length},minmax(0,1fr));gap:8px;padding:12px">
              ${onShare ? btn('share','Sdílet','is-share') : ''}
              ${onMove ? btn('mov','Přesunout') : ''}
              ${onRename ? btn('ren','Přejmenovat') : ''}
              ${onDelete ? btn('del','Smazat','is-del') : ''}
            </div>
          </div>
          <button class="ms-sheet-cancel" id="sheetCancel">Zrušit</button>
        </div>`;
      document.body.appendChild(overlay);
      const close = ()=>{ try{ document.body.removeChild(overlay); }catch(_){} };
      overlay.addEventListener('click', (e)=>{ if(e.target === overlay) close(); });
      overlay.querySelector('#sheetCancel').addEventListener('click', close);
      overlay.querySelectorAll('.ms-sheet-btn').forEach(r=>{
        r.addEventListener('click', async ()=>{
          const id = r.dataset.id;
          close();
          if(id === 'share' && onShare) onShare();
          else if(id === 'mov' && onMove) onMove();
          else if(id === 'ren' && onRename) onRename();
          else if(id === 'del' && onDelete){
            if(!await Layout.confirmDialog('Smazat tuhle položku? Nedá se to vrátit zpět.', 'Smazat')) return;
            onDelete();
          }
        });
      });
    }

    function bindTileClicks(){
      container.querySelectorAll('.tile-item').forEach(el=>{
        const idx = Number(el.dataset.idx);
        el.addEventListener('click', (e)=>{ if(e.target.closest('.tile-menu')) return; const fn = clickTargets[idx]; if(fn) fn(); });
      });
      container.querySelectorAll('.tile-menu').forEach(el=>{
        el.addEventListener('click', (e)=>{
          e.stopPropagation();
          const idx = Number(el.dataset.idx);
          const tileEl = el.closest('.tile-item');
          const nameEl = tileEl ? tileEl.querySelector('b') : null;
          const subEl = tileEl ? tileEl.querySelector('b + span') : null;
          const visEl = tileEl ? tileEl.querySelector('.tile-visual') : null;
          openTileMenu(idx,
            nameEl ? nameEl.textContent : '',
            subEl ? subEl.textContent : '',
            visEl ? (visEl.innerHTML || visEl.outerHTML) : '');
        });
      });
    }
    /* OPRAVA (13.8.2026): tahle obrazovka kreslila do #grid - jenze pri
       prepracovani Projektu se obsah rozdelil do #foldersWrap a
       #filesWrap a #grid dostal display:none. Dokumenty etapy tim
       zmizely uplne VCETNE tlacitka "+", takze slo pridat uz jen
       poznamku (ta ma vlastni pole mimo mrizku). Ted se kresli do
       #filesWrap a vypada stejne jako soubory v Projektu - radek s
       nahledem, nazvem a nabidkou pod teckami.
       Slozky tady zamerne nejsou: dokumenty etapy jsou ploche a pro
       jednu etapu to staci. */
    function draw(){
      clickTargets = []; deleteTargets = []; renameTargets = []; shareTargets = []; moveTargets = [];
      const foldersWrap = container.querySelector('#foldersWrap');
      const filesWrap = container.querySelector('#filesWrap');
      const emptyWrap = container.querySelector('#emptyWrap');
      const cil = currentFolderIdSD();

      const titleEl = container.querySelector('#pathTitleSD');
      if(titleEl) titleEl.textContent = 'Dokumenty';

      const crumbsSD = container.querySelector('#projectBreadcrumbsSD');
      crumbsSD.hidden = pathStackSD.length===0;
      if(pathStackSD.length){
        crumbsSD.innerHTML = `<button data-depth="-1">Dokumenty</button>` + pathStackSD.map((part, i)=>
          `<span>/</span><button data-depth="${i}"${i===pathStackSD.length-1?' aria-current="page"':''}>${msEsc(part.name)}</button>`
        ).join('');
        crumbsSD.querySelectorAll('button[data-depth]').forEach(btn=>{
          btn.addEventListener('click', ()=>{
            const depth = Number(btn.dataset.depth);
            pathStackSD = depth < 0 ? [] : pathStackSD.slice(0, depth+1);
            searchQuerySD=''; searchInputSD.value=''; draw();
          });
        });
      }

      const vsechnySlozky = msLoadProjectFolders().filter(f=> f.scope==='etapa' && f.stageKey===params.stage);
      const vsechnySlozkyZde = vsechnySlozky.filter(f=> (f.parentId||null) === cil);
      const vsechnyDocsZde = msDocuments().filter(d=> d.stage===params.stage && (d.folderId||null) === cil);
      const slozky = searchQuerySD ? vsechnySlozkyZde.filter(f=>(f.name||'').toLocaleLowerCase('cs').includes(searchQuerySD)) : vsechnySlozkyZde;
      const docs = searchQuerySD ? vsechnyDocsZde.filter(d=>(d.name||'').toLocaleLowerCase('cs').includes(searchQuerySD)) : vsechnyDocsZde;

      foldersWrap.innerHTML = '';
      if(slozky.length){
        let html = `<div class="project-v2-section-head"><b>Složky</b><span>${slozky.length}</span></div><div class="project-v2-folder-grid">`;
        slozky.forEach(f=>{
          const pocet = vsechnySlozky.filter(x=>x.parentId===f.id).length + msDocuments().filter(d=>d.stage===params.stage && d.folderId===f.id).length;
          html += folderTile(f, pocet);
        });
        html += '</div>';
        foldersWrap.innerHTML = html;
      }

      filesWrap.innerHTML = '';
      emptyWrap.innerHTML = '';
      if(docs.length){
        let html = `<div class="project-v2-section-head"><b>Dokumenty</b><span>${docs.length}</span></div><div class="project-v2-file-list">`;
        docs.forEach(d=>{ html += docRow(d); });
        html += '</div>';
        filesWrap.innerHTML = html;
      } else if(!slozky.length){
        emptyWrap.innerHTML = `<div class="project-v2-empty">
          <div style="width:44px;height:44px;border:1px solid var(--add-color);color:var(--add-color);margin:0 auto 12px;display:grid;place-items:center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 7h7l2 2h9v11H3z"/><path d="M3 7l2-3h6l2 3"/></svg>
          </div>
          <b>${searchQuerySD ? 'Nic nenalezeno' : 'Zatím prázdno'}</b>
          <span>${searchQuerySD ? 'Zkus jiný název složky nebo dokumentu.' : 'Přidej revizi, protokol, fotografii, poznámku nebo další složku.'}</span>
        </div>`;
      }

      if(canAddHereSD && !searchQuerySD){
        const addIdx = clickTargets.length;
        // OPRAVA (14.8.2026): drive tu byly DVA oddelene ovladaci prvky
        // (dlazdice "Přidat soubor" + tichy textovy odkaz "+ Nová
        // složka" pod ni) - v Projektu je to jedno tlacitko s nabidkou
        // (soubor/poznamka/slozka). Sjednoceno na stejny vzor, at
        // appka vypada a chova se konzistentne na obou mistech.
        clickTargets.push(()=> onAddClickSD());
        deleteTargets.push(null); renameTargets.push(null); shareTargets.push(null); moveTargets.push(null);
        filesWrap.innerHTML += `<div class="tile-item project-v2-add" data-idx="${addIdx}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--add-color)" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
          <b>Přidat do této složky</b>
        </div>`;
      }
      bindTileClicks();
    }

    /* Sjednocena nabidka (14.8.2026) - stejny tvar jako addSheet() v
       Projektu. Poznamka tu zustava (byla tu uz drive, jen jako
       samostatne pole na obrazovce - to zustava pro rychle psani beze
       zmeny, tohle je jen DALSI cesta ke stejne akci). */
    function addSheetSD(){
      return new Promise(resolve=>{
        const overlay = document.createElement('div');
        overlay.className = 'ms-overlay'; overlay.style.cssText = 'position:fixed;inset:0;background:rgba(2,4,10,.7);z-index:60;display:flex;align-items:flex-end;justify-content:center';
        overlay.innerHTML = `
          <div class="project-v2-add-sheet">
            <div class="project-v2-add-sheet-head"><div><b>Přidat obsah</b><span>${msEsc(pathStackSD.length ? pathStackSD[pathStackSD.length-1].name : 'Dokumenty')}</span></div></div>
            <div class="project-v2-add-grid">
            <div class="mi" data-c="files">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h9l3 3v15H6z"/><path d="M9 10h6M9 14h6"/></svg>
              <b>Nahrát soubor</b><span>Lze vybrat více položek</span>
            </div>
            <div class="mi" data-c="camera">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h4l2-2h4l2 2h4v12H4z"/><circle cx="12" cy="13" r="3"/></svg>
              <b>Vyfotit dokument</b><span>Otevře fotoaparát</span>
            </div>
            <div class="mi" data-c="note">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg>
              <b>Nová poznámka</b><span>Rychlý text bez souboru</span>
            </div>
            ${isOwnerSD ? `<div class="mi" data-c="newFolder">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
              <b>Nová složka</b><span>Vytvoří další úroveň</span>
            </div>` : ''}
            </div>
            <button id="sheetCloseSD" class="project-v2-add-cancel">Zrušit</button>
          </div>`;
        document.body.appendChild(overlay);
        overlay.querySelector('#sheetCloseSD').addEventListener('click', ()=>{ document.body.removeChild(overlay); resolve(null); });
        overlay.querySelectorAll('.mi').forEach(el=>{
          el.addEventListener('click', ()=>{ document.body.removeChild(overlay); resolve(el.dataset.c); });
        });
      });
    }
    async function onAddClickSD(){
      // (28.8.2026) Kontrola naroku - jediny vstupni bod pro VSECHNY
      // zpusoby pridani v teto obrazovce (soubor, foto, poznamka, nova
      // slozka), takze staci zamek jen tady, driv nez se vubec ukaze
      // nabidka moznosti.
      if(typeof msCanAddContent === 'function' && !msCanAddContent()){
        Router.go('paywall', { reason:'trial-expired' });
        return;
      }
      const choice = await addSheetSD();
      if(choice === 'files') container.querySelector('#fileInput').click();
      else if(choice === 'camera') container.querySelector('#cameraInputSD').click();
      else if(choice === 'note'){
        const text = prompt('Text poznámky:');
        if(!text || !text.trim()) return;
        const saved=await msAddDocument({ name:'Poznámka: '+text.trim(), stage:params.stage, isNote:true, folderId:currentFolderIdSD() });
        if(!saved){ alert('Poznámku se nepodařilo uložit. Zkontroluj volné místo v zařízení.'); return; }
        draw();
        Layout.showSuccess('Poznámka přidána');
      } else if(choice === 'newFolder'){
        const name = prompt('Název nové složky:');
        if(!name || !name.trim()) return;
        if(!msAddProjectFolder(name.trim(), currentFolderIdSD(), 'etapa', params.stage)){ alert('Složku se nepodařilo uložit. Zkontroluj volné místo v zařízení.'); return; }
        draw();
      }
    }

    /* Dlazdice slozky - stejny vzhled jako v Projektu (barevny ramecek
       se zari), jen mensi sada akci (prejmenovat/smazat, zadne sdileni -
       slozka sama o sobe nejde "sdilet"). */
    function folderTile(f, pocet){
      const idx = clickTargets.length;
      clickTargets.push(()=>{ pathStackSD.push({id:f.id, name:f.name}); draw(); });
      deleteTargets.push(isOwnerSD ? ()=>{ msDeleteProjectFolder(f.id); draw(); } : null);
      renameTargets.push(isOwnerSD ? ()=>{
        const name = prompt('Nový název složky:', f.name);
        if(!name || !name.trim()) return;
        msRenameProjectFolder(f.id, name.trim());
        draw();
      } : null);
      shareTargets.push(null); moveTargets.push(null);
      return `<div class="tile-item folder-tile project-v2-folder" data-idx="${idx}" data-folder="${f.id}">
        <span class="tile-visual project-v2-folder-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 7h7l2 2h9v11H3z"/><path d="M3 7l2-3h6l2 3"/></svg></span>
        <span class="project-v2-folder-copy">
          <b>${msEsc(f.name)}</b>
          <span>${pocet} ${pocet===1?'položka':(pocet<5?'položky':'položek')}</span>
        </span>
        <span class="tile-menu project-v2-menu" data-idx="${idx}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg>
        </span>
        <svg class="project-v2-folder-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5l7 7-7 7"/></svg>
      </div>`;
    }

    /* Radek dokumentu - stejny tvar jako soubory v Projektu, aby se obe
       obrazovky chovaly a vypadaly stejne. */
    function docRow(d){
      const idx = clickTargets.length;
      clickTargets.push(d.isNote ? ()=>editNote(d) : ()=>openDocContent(d));
      deleteTargets.push(isOwnerSD ? ()=>{ msDeleteDocument(d.id); draw(); } : null);
      renameTargets.push((isOwnerSD && !d.isNote) ? ()=>renameDoc(d) : null);
      shareTargets.push((!d.isNote && msCanExportContent()) ? ()=>shareDocFromMenu(d) : null);
      // Presun do slozky (14.8.2026) - jen vlastnik, jen kdyz v etape
      // uz aspon jedna slozka existuje (jinak neni kam presouvat).
      const maSlozky = msLoadProjectFolders().some(f=> f.scope==='etapa' && f.stageKey===params.stage);
      moveTargets.push((isOwnerSD && maSlozky) ? ()=> pickFolderSheetSD(d) : null);

      const isImage = d.mime && d.mime.startsWith('image/');
      const isPdf = d.mime === 'application/pdf';
      const thumbUrl = isImage ? msDocThumb(d.id) : null;
      const isSheet = !!(d.mime && /(spreadsheet|excel|csv)/i.test(d.mime)) || /\.(xlsx?|csv)$/i.test(d.name||'');
      const isArchive = !!(d.mime && /(zip|compressed|archive)/i.test(d.mime)) || /\.(zip|rar|7z)$/i.test(d.name||'');
      const barva = d.isNote ? 'var(--ms-task-deadline)' : (isPdf ? 'var(--add-color)' : (isImage ? 'var(--folder-color)' : (isSheet ? 'var(--money-pos)' : (isArchive ? 'var(--accent)' : 'var(--muted)'))));
      const vizual = thumbUrl
        ? `<div class="tile-visual" style="width:100%;height:100%;background:url(${thumbUrl}) center/cover"></div>`
        : `<div class="tile-visual" style="display:grid;place-items:center;color:${barva}">${d.isNote
            ? '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 4h14v16l-4-3-3 3-3-3-4 3z"/></svg>'
            : fileIconSvg(d.mime, barva)}</div>`;
      const popis = d.isNote ? 'poznámka'
        : (d.author && d.author !== 'Stavebník' ? d.author : (d.date || (isPdf ? 'PDF' : (isImage ? 'fotka' : 'soubor'))));

      return `<div class="tile-item project-v2-file" data-idx="${idx}" style="--file-color:${barva}">
        <div class="project-v2-file-icon">${vizual}</div>
        <div class="project-v2-file-copy">
          <b>${msEsc(d.name)}</b>
          <span>${msEsc(popis)}</span>
        </div>
        <span class="tile-menu project-v2-menu" data-idx="${idx}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg>
        </span>
      </div>`;
    }
    /* Vyber cilove slozky pro presun dokumentu (14.8.2026). Zamerne
       plochy seznam vsech slozek v ramci teto etapy (ne strom) - u
       dokumentu jedne etapy jich bude malo, plna navigace by tu byla
       zbytecna prekazka navic. */
    function pickFolderSheetSD(d){
      const vsechnySlozky = msLoadProjectFolders().filter(f=> f.scope==='etapa' && f.stageKey===params.stage);
      const overlay = document.createElement('div');
      overlay.className = 'ms-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:82;display:flex;align-items:flex-end;justify-content:center';
      const radek = (id, name, aktivni)=> `<div class="dd-item${aktivni?' is-active':''}" data-folder="${id||''}">${msEsc(name)}</div>`;
      overlay.innerHTML = `
        <div class="ms-sheet" style="width:100%;max-width:460px;padding:0 10px calc(10px + min(var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)),34px))">
          <div class="dd-panel open" data-sheet-title="Přesunout do složky" style="position:static;transform:none;max-height:60vh;overflow:auto">
            ${radek(null, 'Bez složky (kořen)', !d.folderId)}
            ${vsechnySlozky.map(f=> radek(f.id, f.name, d.folderId===f.id)).join('')}
          </div>
        </div>`;
      document.body.appendChild(overlay);
      const close = ()=>{ try{ document.body.removeChild(overlay); }catch(_){} };
      overlay.addEventListener('click', (e)=>{ if(e.target === overlay) close(); });
      overlay.querySelectorAll('.dd-item').forEach(el=>{
        el.addEventListener('click', ()=>{
          const cil = el.dataset.folder || null;
          close();
          if(msMoveDocument(d.id, cil)) draw();
        });
      });
    }

    function editNote(d){
      const text = prompt('Upravit poznámku:', d.name.replace(/^Poznámka: /,''));
      if(text===null) return;
      msUpdateDocument(d.id, { name:'Poznámka: '+text.trim() });
      draw();
    }
    function renameDoc(d){
      const name = prompt('Přejmenovat dokument:', d.name);
      if(!name || !name.trim()) return;
      msUpdateDocument(d.id, { name: name.trim() });
      draw();
    }
    async function openDocContent(d){
      const dataUrl = await msDocumentContent(d.id);
      if(!dataUrl){ alert('Obsah souboru se nepodařilo najít - zkus appku načíst znovu.'); return; }
      if(d.mime && d.mime.startsWith('image/')){
        // Stejny duvod jako u souboru v Projektu (11.8.2026) - obrazek
        // sel jen zobrazit, ne priblizit.
        msPhotoLightbox([dataUrl], 0, msCanExportContent() ? { label: 'Sdílet', onClick: ()=>shareDocFromMenu(d) } : null);
        return;
      }
      await openAnyStoredFile(dataUrl, d.name || 'soubor', d.mime || '');
    }
    // OPRAVA (14.8.2026): tahle funkce kreslila fotku primo na canvas
    // bez cteni EXIF orientace - fotka vyfocena na vysku vysla na bok
    // nebo vzhuru nohama (stejna chyba, jakou uz appka opravila u
    // pridavani fotek do zapisu deniku). msResizeImageFile v data.js uz
    // EXIF cte a otoci spravne.
    function readAsDataURL(file){
      return new Promise(resolve=>{
        if(!file.type.startsWith('image/')){
          const reader = new FileReader();
          reader.onload = ()=> resolve(reader.result);
          reader.onerror = ()=> resolve(null);
          reader.readAsDataURL(file);
          return;
        }
        msResizeImageFile(file, 1400, 0.75).then(resolve).catch(()=> resolve(null));
      });
    }
    // (14.8.2026) Puvodni jednoduche "zpet vzdy na Etapy" uz nahrazuje
    // handler s pathStackSD pridany vyse - tenhle druhy by se spoustel
    // SOUBEZNE s nim (addEventListener druhy posluchac neprepise, jen
    // prida) a pri prochazeni slozkami by "zpet" udelalo dva kroky
    // najednou (o slozku vys a hned pak i z cele obrazovky).
    async function addStageDocuments(selectedFiles){
      const files = [...selectedFiles];
      if(!files.length) return;
      const folderId = currentFolderIdSD();
      const savedIds=[];
      let failed=0;
      // I dokumenty mohou byt velke fotky. Zpracovani po jednom drzi
      // pamet stabilni a stejne jako Galerie nezhodi iPhone pri vetsim vyberu.
      for(const file of files){
        const content=await readAsDataURL(file);
        if(!content){ failed++; continue; }
        const saved=await msAddDocument({name:file.name,mime:file.type||null,stage:params.stage,folderId,content});
        if(saved) savedIds.push(saved.id); else failed++;
        await new Promise(resolve=>setTimeout(resolve,0));
      }
      draw();
      if(savedIds.length) Layout.showSuccess(savedIds.length === 1 ? 'Dokument přidán' : `Přidáno ${savedIds.length} dokumentů`);
      if(failed) alert(`${failed} dokumentů se nepodařilo uložit. Zkontroluj volné místo v zařízení a zkus je znovu.`);
      // (14.8.2026) Uz se neptame, jestli soubor "nabidnout k dalsimu
      // zapisu" - dokument jde pripojit k zapisu primo pri jeho psani,
      // vyberem z existujiciho obsahu. Viz zruseni "Připravit pro další
      // zápis" ve screen-forms.js.
    }
    container.querySelector('#fileInput').addEventListener('change', async (e)=>{
      const files = [...e.target.files]; e.target.value='';
      await addStageDocuments(files);
    });
    container.querySelector('#cameraInputSD').addEventListener('change', async (e)=>{
      const files = [...e.target.files]; e.target.value='';
      await addStageDocuments(files);
    });
    draw();
    return { activeTab:'project' };
  }

  /* -------------------- REZIM: Obecne slozky "Projekt" -------------------- */
  function renderFolders(container, params, scope){
    scope = scope || 'projekt';
    const stageKey = (scope !== 'projekt') ? (params.stage || null) : null;
    const stageInfo = stageKey ? msStageByKey(stageKey) : null;
    const scopeTitles = { projekt:'Projekt', nabidky:'Nabídky', dulezite:'Důležité' };
    const screenTitle = scopeTitles[scope] || 'Projekt';

    const activeProjects = msLoadProjects();
    const activeProject = activeProjects.find(p=>p.id===msGetActiveProjectId());
    const isOwner = !(activeProject && activeProject.isShared);
    // Prava (1.8.2026): "muze zakladat slozky" zustava vzdy jen vlastnik
    // (nemenime), ale "muze pridavat soubory/poznamky" uz zavisi na
    // prideleni prava pro danou sekci (Projekt/Etapy).
    const sectionForRights = scope==='projekt' ? 'projekt' : 'etapy';
    const canAddHere = (typeof msCanAddSection === 'function') ? msCanAddSection(sectionForRights) : true;

    let pathStack = []; // pole {id, name} od korene dolu
    let searchQuery = '';

    container.innerHTML = `
      <div class="topbar ms-ui-topbar project-v2-topbar">
        <div class="back-btn" id="backBtn" style="display:${scope==='projekt'?'none':'grid'}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></div>
        <div class="ms-ui-title">
          <p>${scope==='projekt' ? 'Stavební dokumentace' : (stageInfo ? msEsc(stageInfo.name) : 'Dokumentace')}</p>
          <h1 id="pathTitle">${screenTitle}${stageInfo ? ' – '+stageInfo.name : ''}</h1>
        </div>
        <div class="ms-ui-actions">
          <button class="project-v2-search-btn" id="projectSearchBtn" aria-label="Hledat v této složce">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>
          </button>
        </div>
      </div>
      <div class="project-v2-search" id="projectSearchWrap" hidden>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>
        <input id="projectSearchInput" type="search" placeholder="Hledat složku nebo soubor…" autocomplete="off" />
        <button id="projectSearchClear" aria-label="Zrušit hledání">×</button>
      </div>
      <div class="screen-scroll project-v2-scroll">
        <div id="statsRow" class="project-v2-stats" style="display:${scope==='projekt'?'grid':'none'}">
          <div class="proj-stat" data-field="landArea">
            <span>Pozemek</span>
            <b id="statLand">Doplnit</b>
          </div>
          <div class="proj-stat" data-field="type">
            <span>Typ domu</span>
            <b id="statType">Doplnit</b>
          </div>
          <div class="proj-stat" data-field="builtArea">
            <span>Užitná plocha</span>
            <b id="statBuilt">Doplnit</b>
          </div>
        </div>
        <nav id="projectBreadcrumbs" class="project-v2-breadcrumbs" hidden aria-label="Umístění ve složkách"></nav>
        <!-- ZMENA (11.8.2026): drive byla jedna mrizka 3x pro slozky i
             soubory dohromady. Fotka v ni mela ctvercovy nahled pres
             celou sirku dlazdice, takze ROZTAHLA cely radek a vedle ni
             zustalo prazdno; dlouhe nazvy se navic v tretine sirky
             orezaly na "Souhrnná technická ...". Ted maji slozky
             vlastni mrizku (dve v radku, at se nazev vejde) a soubory
             jsou seznam s pevnou vyskou radku - fotka i PDF vypadaji
             stejne velke a na nazev je cela sirka. -->
        <div id="emptyWrap"></div>
        <div id="foldersWrap" style="margin-bottom:14px"></div>
        <div id="filesWrap" style="margin-bottom:12px"></div>
        <div id="grid" style="display:none"></div>
      </div>
      <input type="file" id="fileInput" multiple style="display:none"/>
      <input type="file" id="cameraInput" accept="image/*" capture="environment" style="display:none"/>
    `;

    const meta = msProjectMeta ? msProjectMeta() : {};
    // ZMENA (29.8.2026): "Doplnit" driv vypadalo uplne stejne jako
    // vyplnena hodnota (stejna barva textu) - nic nerikalo, ze je to
    // ve skutecnosti tlacitko. Prazdny stav ted svit zvyrazenou barvou,
    // at je jasne, ze se na to da tuknout.
    const zobrazStat = (id, hodnota, jednotka)=>{
      const el = container.querySelector(id);
      if(hodnota){ el.textContent = hodnota+(jednotka||''); el.style.color = ''; }
      else { el.textContent = 'Doplnit'; el.style.color = 'var(--accent)'; }
    };
    zobrazStat('#statLand', meta.landArea, ' m²');
    zobrazStat('#statType', meta.type, '');
    zobrazStat('#statBuilt', meta.builtArea, ' m²');
    container.querySelectorAll('.proj-stat').forEach(el=>{
      el.addEventListener('click', ()=> openStatEditSheet(el.dataset.field, meta));
    });

    // DOPLNENO (29.8.2026): puvodne prompt() - nativni dialog
    // prohlizece, ktery neumi cislenou klavesnici (inputmode) a navic
    // pusobi jako soucast appky mnohem min nez vlastni panel. Cisla
    // (plocha pozemku, uzitna plocha) ted maji radne pole s
    // inputmode="decimal", presne jak appka dela uz jinde (napr.
    // slevove kody).
    function openStatEditSheet(field, meta){
      const jeCislo = field !== 'type';
      const label = field==='type' ? 'Typ domu' : (field==='landArea' ? 'Plocha pozemku' : 'Užitná plocha');
      const cur = meta[field] != null ? String(meta[field]) : '';
      const overlay = document.createElement('div');
      overlay.className = 'ms-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.62);z-index:85;display:flex;align-items:flex-end;justify-content:center';
      overlay.innerHTML = `
        <div class="ms-sheet" style="width:100%;max-width:460px">
          <div style="background:var(--card-bg-2);border:1px solid var(--line);border-left:3px solid var(--accent);padding:18px 16px">
            <b style="display:block;font-size:14px;font-family:var(--font-head);margin-bottom:10px">${msEsc(label)}</b>
            <div style="display:flex;align-items:center;gap:8px">
              <input class="f-input" id="statEditInput" value="${msEsc(cur)}" ${jeCislo?'inputmode="decimal"':''} placeholder="${jeCislo?'0':'Např. Rodinný dům'}" style="flex:1"/>
              ${jeCislo ? '<span style="color:var(--muted);font-size:13px;flex:0 0 auto">m²</span>' : ''}
            </div>
            <button id="statEditSave" style="width:100%;margin-top:12px;padding:13px;font-weight:800;font-size:13px;background:linear-gradient(90deg,#25e8ff,#b34cff);color:#04070f;border:0;cursor:pointer;font-family:inherit">Uložit</button>
          </div>
          <button class="ms-sheet-cancel" id="statEditCancel">Zrušit</button>
        </div>`;
      document.body.appendChild(overlay);
      const close = ()=>{ try{ document.body.removeChild(overlay); }catch(e){} };
      overlay.addEventListener('click', (e)=>{ if(e.target===overlay) close(); });
      overlay.querySelector('#statEditCancel').addEventListener('click', close);
      const input = overlay.querySelector('#statEditInput');
      setTimeout(()=> input.focus(), 50);
      const ulozit = ()=>{
        const val = input.value.trim();
        const patch = {};
        patch[field] = jeCislo ? (Number(val.replace(',','.'))||null) : (val||null);
        msSetProjectMeta(patch);
        close();
        render(container, params);
      };
      overlay.querySelector('#statEditSave').addEventListener('click', ulozit);
      input.addEventListener('keydown', (e)=>{ if(e.key==='Enter') ulozit(); });
    }

    const searchWrap = container.querySelector('#projectSearchWrap');
    const searchInput = container.querySelector('#projectSearchInput');
    container.querySelector('#projectSearchBtn').addEventListener('click', ()=>{
      searchWrap.hidden = !searchWrap.hidden;
      if(!searchWrap.hidden) setTimeout(()=>searchInput.focus(), 0);
    });
    container.querySelector('#projectSearchClear').addEventListener('click', ()=>{
      searchQuery = '';
      searchInput.value = '';
      searchWrap.hidden = true;
      draw();
    });
    searchInput.addEventListener('input', ()=>{
      searchQuery = searchInput.value.trim().toLocaleLowerCase('cs');
      draw();
    });

    let clickTargets = [], deleteTargets = [], renameTargets = [], shareTargets = [];
    function tile(opts){
      const { name, sub, isFolder, mime, thumbUrl, onClick, onDelete, onRename, onShare, folderId } = opts;
      const idx = clickTargets.length;
      clickTargets.push(onClick); deleteTargets.push(onDelete||null); renameTargets.push(onRename||null); shareTargets.push(onShare||null);
      const visual = `<span class="tile-visual project-v2-folder-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 7h7l2 2h9v11H3z"/><path d="M3 7l2-3h6l2 3"/></svg></span>`;
      return `<div class="tile-item folder-tile project-v2-folder" data-idx="${idx}"${folderId?` data-folder="${folderId}"`:''}>
        ${visual}
        <span class="project-v2-folder-copy">
          <b>${msEsc(name)}</b>
          <span>${msEsc(sub)}</span>
        </span>
        ${(onDelete||onRename||onShare) ? `<span class="tile-menu project-v2-menu" data-idx="${idx}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg>
        </span>` : ''}
        <svg class="project-v2-folder-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5l7 7-7 7"/></svg>
      </div>`;
    }
    /* Radek souboru (11.8.2026). Nahled fotky je maly ctverec vlevo -
       stejne velky jako ikona PDF, takze fotka uz neroztahuje radek a
       vsechny polozky maji stejnou vysku. Na nazev je tim padem cela
       sirka obrazovky misto tretiny. */
    function fileRow(it){
      const idx = clickTargets.length;
      clickTargets.push(it.isNote ? ()=>editNote(it) : ()=>openItemContent(it));
      deleteTargets.push(isOwner ? ()=>{ msDeleteProjectItem(it.id); draw(); } : null);
      renameTargets.push(isOwner ? ()=>{
        const name = prompt('Nový název:', it.name);
        if(!name || !name.trim()) return;
        msRenameProjectItem(it.id, name.trim());
        draw();
      } : null);
      shareTargets.push((!it.isNote && msCanExportContent()) ? ()=>shareItemFromMenu(it) : null);

      const isImage = it.mime && it.mime.startsWith('image/');
      const thumbUrl = isImage ? msProjectItemThumb(it.id) : null;
      const isPdf = it.mime === 'application/pdf';
      const isSheet = !!(it.mime && /(spreadsheet|excel|csv)/i.test(it.mime)) || /\.(xlsx?|csv)$/i.test(it.name||'');
      const isArchive = !!(it.mime && /(zip|compressed|archive)/i.test(it.mime)) || /\.(zip|rar|7z)$/i.test(it.name||'');
      const barva = it.isNote ? 'var(--ms-task-deadline)' : (isPdf ? 'var(--add-color)' : (isImage ? 'var(--folder-color)' : (isSheet ? 'var(--money-pos)' : (isArchive ? 'var(--accent)' : 'var(--muted)'))));
      const vizual = thumbUrl
        ? `<div class="tile-visual" style="width:100%;height:100%;background:url(${thumbUrl}) center/cover"></div>`
        : `<div class="tile-visual" style="display:grid;place-items:center;color:${barva}">${it.isNote
            ? '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 4h14v16l-4-3-3 3-3-3-4 3z"/></svg>'
            : fileIconSvg(it.mime, barva)}</div>`;
      const popis = it.isNote ? 'poznámka'
        : (it.author && it.author !== 'Stavebník' ? it.author : (isImage ? 'fotka' : (isPdf ? 'PDF' : 'soubor')));

      return `<div class="tile-item file-row project-v2-file" data-idx="${idx}" data-item="${it.id}" style="--file-color:${barva}">
        <div class="project-v2-file-icon">${vizual}</div>
        <div class="project-v2-file-copy">
          <b>${msEsc(it.name)}</b>
          <span>${msEsc(popis)}</span>
        </div>
        <span class="tile-menu project-v2-menu" data-idx="${idx}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg>
        </span>
      </div>`;
    }

    function addTile(){
      const idx = clickTargets.length;
      clickTargets.push(onAddClick); deleteTargets.push(null); renameTargets.push(null); shareTargets.push(null);
      return `<div class="tile-item project-v2-add" data-idx="${idx}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--add-color)" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
        <b>Přidat do této složky</b>
      </div>`;
    }
    /* ZMENA (11.8.2026): tuzka a kos primo na dlazdici zabiraly misto,
       daly se snadno trefit omylem a u malych dlazdic se do rohu spatne
       mirilo. Ted je misto nich jedna nabidka pod tremi teckami.
       Vzhled: puvodne to byl holy seznam radku s carami pres celou
       sirku - pusobil jako tabulka. Ted ma kazda volba ikonu, "Zrusit"
       stoji odsazene zvlast a v hlavicce je ikona te konkretni polozky,
       prevzata primo z dlazdice - nabidka tak navazuje na to, na co
       clovek klepnul. */
    function openTileMenu(idx, anchorName, anchorSub, visualHtml){
      const onRename = renameTargets[idx];
      const onDelete = deleteTargets[idx];
      const onShare  = (typeof shareTargets !== 'undefined') ? shareTargets[idx] : null;
      const overlay = document.createElement('div');
      overlay.className = 'ms-overlay ms-sheet-backdrop';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:80;display:flex;align-items:flex-end;justify-content:center;padding:0 10px calc(10px + min(var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)),34px))';

      const ICON = {
        share: '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M8 8l4-4 4 4"/><path d="M4 14v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5"/></svg>',
        ren:   '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
        del:   '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V7"/><path d="M10 11v6M14 11v6"/></svg>'
      };
      // ZMENA (11.8.2026): misto radku pod sebou (pusobilo jako seznam)
      // jsou akce vedle sebe jako tlacitka - stejny tvar a rec jako
      // dlazdice v samotnem Projektu, jen s ikonou nad popiskem.
      const btn = (id, label, cls)=>
        `<button class="ms-sheet-btn ${cls||''}" data-id="${id}">${ICON[id]||''}<span>${label}</span></button>`;

      overlay.innerHTML = `
        <div class="ms-sheet" style="width:100%;max-width:460px">
          <div style="background:var(--card-bg-2);border:1px solid var(--line);border-left:3px solid var(--accent)">
            <div style="display:flex;align-items:center;gap:11px;padding:13px 16px;border-bottom:1px solid var(--line)">
              <div class="ms-sheet-visual" style="width:38px;height:38px;flex:0 0 38px;border:1px solid var(--line);display:grid;place-items:center;overflow:hidden;background:var(--card-bg)">${visualHtml||''}</div>
              <div style="min-width:0;flex:1">
                <b style="display:block;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${msEsc(anchorName || '')}</b>
                <span style="font-size:10.5px;color:var(--muted)">${msEsc(anchorSub || '')}</span>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(${[onShare,onRename,onDelete].filter(Boolean).length},minmax(0,1fr));gap:8px;padding:12px">
              ${onShare ? btn('share','Sdílet','is-share') : ''}
              ${onRename ? btn('ren','Přejmenovat') : ''}
              ${onDelete ? btn('del','Smazat','is-del') : ''}
            </div>
          </div>
          <button class="ms-sheet-cancel" id="sheetCancel">Zrušit</button>
        </div>`;
      document.body.appendChild(overlay);
      const close = ()=>{ try{ document.body.removeChild(overlay); }catch(_){} };
      overlay.addEventListener('click', (e)=>{ if(e.target === overlay) close(); });
      overlay.querySelector('#sheetCancel').addEventListener('click', close);
      overlay.querySelectorAll('.ms-sheet-btn').forEach(r=>{
        r.addEventListener('click', async ()=>{
          const id = r.dataset.id;
          close();
          if(id === 'share' && onShare) onShare();
          else if(id === 'ren' && onRename) onRename();
          else if(id === 'del' && onDelete){
            if(!await Layout.confirmDialog('Smazat tuhle položku? Nedá se to vrátit zpět.', 'Smazat')) return;
            onDelete();
          }
        });
      });
    }

    function bindTileClicks(){
      container.querySelectorAll('.tile-item').forEach(el=>{
        const idx = Number(el.dataset.idx);
        el.addEventListener('click', (e)=>{ if(e.target.closest('.tile-menu')) return; const fn = clickTargets[idx]; if(fn) fn(); });
      });
      container.querySelectorAll('.tile-menu').forEach(el=>{
        el.addEventListener('click', (e)=>{
          e.stopPropagation();
          const idx = Number(el.dataset.idx);
          const tileEl = el.closest('.tile-item');
          const nameEl = tileEl ? tileEl.querySelector('b') : null;
          const subEl = tileEl ? tileEl.querySelector('b + span') : null;
          const visEl = tileEl ? tileEl.querySelector('.tile-visual') : null;
          openTileMenu(idx,
            nameEl ? nameEl.textContent : '',
            subEl ? subEl.textContent : '',
            visEl ? (visEl.innerHTML || visEl.outerHTML) : '');
        });
      });
    }

    /* PRETAHOVANI SOUBORU DO SLOZKY (13.8.2026)
       Doted slo soubor jen prejmenovat nebo smazat - kdo ho nahral do
       spatne slozky, musel ho smazat a nahrat znovu.

       Na mobilu neexistuje "drag" jako na pocitaci, takze: podrz prst
       na radku ~350 ms, radek se "zvedne" a jde s prstem. Slozky se
       pritom zvyrazni jako mozny cil. Kratke klepnuti otevre soubor
       jako driv, posunuti prstem drive nez za 350 ms normalne scrolluje
       - proto se pri prvnim vetsim pohybu drzeni rusi. */
    let dragStav = null;

    function wireDragToFolder(){
      if(!isOwner) return; // pozvany strukturu nepresouva
      container.querySelectorAll('.file-row').forEach(radek=>{
        radek.addEventListener('pointerdown', (e)=>{
          if(e.target.closest('.tile-menu')) return;
          zacniDrzet(e, radek);
        });
      });
    }

    function zacniDrzet(e, radek){
      const start = { x: e.clientX, y: e.clientY };
      const itemId = radek.dataset.item;
      let casovac = setTimeout(()=> zvednout(radek, itemId, start), 350);

      const pohyb = (ev)=>{
        if(dragStav) return; // uz taha - resi se jinde
        const dx = Math.abs(ev.clientX - start.x), dy = Math.abs(ev.clientY - start.y);
        if(dx > 8 || dy > 8){ clearTimeout(casovac); uklid(); } // scrolluje
      };
      const konec = ()=>{ clearTimeout(casovac); uklid(); };
      const uklid = ()=>{
        document.removeEventListener('pointermove', pohyb);
        document.removeEventListener('pointerup', konec);
        document.removeEventListener('pointercancel', konec);
        window.removeEventListener('hashchange', konec);
      };
      document.addEventListener('pointermove', pohyb);
      document.addEventListener('pointerup', konec);
      document.addEventListener('pointercancel', konec);
      // Stejna pojistka jako u samotneho tazeni (13.8.2026): bez ni by
      // odchod z obrazovky BEHEM cekani na 350ms mohl nechat bezet
      // casovac, ktery by pak vyrobil "ducha" uz na jine obrazovce.
      window.addEventListener('hashchange', konec, { once:true });
    }

    function zvednout(radek, itemId, start){
      if(navigator.vibrate) { try{ navigator.vibrate(15); }catch(e){} }

      const rect = radek.getBoundingClientRect();
      const duch = radek.cloneNode(true);
      duch.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;
        z-index:90;pointer-events:none;opacity:.94;transform:scale(1.03);
        box-shadow:0 10px 26px rgba(0,0,0,.5);border-color:var(--accent)`;
      document.body.appendChild(duch);
      radek.style.opacity = '.35';

      // Slozky se zvyrazni, at je videt, kam to jde pustit.
      const cile = [...container.querySelectorAll('.folder-tile[data-folder]')];
      cile.forEach(c=>{ c.style.transition = 'transform .12s, border-color .12s'; c.style.borderStyle = 'dashed'; });

      // Pruh nahore = presun o uroven vys (ven ze slozky).
      let ven = null;
      if(pathStack.length){
        ven = document.createElement('div');
        ven.id = 'dropOut';
        ven.textContent = '↑ Přesunout o úroveň výš';
        ven.style.cssText = `position:fixed;left:0;right:0;top:0;z-index:89;padding:calc(10px + var(--safe-area-inset-top, env(safe-area-inset-top, 0px))) 14px 12px;
          text-align:center;font-size:12px;font-weight:800;color:var(--accent);
          background:var(--card-bg-2);border-bottom:1.5px dashed var(--accent)`;
        document.body.appendChild(ven);
      }

      dragStav = { radek, itemId, duch, cile, ven, dx: start.x - rect.left, dy: start.y - rect.top, cil: null };

      document.addEventListener('pointermove', tahni, { passive: false });
      document.addEventListener('pointerup', pust);
      document.addEventListener('pointercancel', pust);
      // Pojistka navic (13.8.2026): pointerup/pointercancel se nemusi
      // spolehlive spustit, kdyz clovek odejde jinak nez dotykem (napr.
      // gesto zpet, systemove UI behem drzeni). hashchange se spusti pri
      // KAZDE navigaci v appce (Router.go meni location.hash), takze
      // je to spolehlivejsi pojistka, ktera drag vzdy ukonci.
      window.addEventListener('hashchange', pust, { once:true });
    }

    function tahni(e){
      if(!dragStav) return;
      e.preventDefault(); // at se pod prstem neposouva obrazovka
      dragStav.duch.style.left = (e.clientX - dragStav.dx) + 'px';
      dragStav.duch.style.top = (e.clientY - dragStav.dy) + 'px';

      const pod = document.elementFromPoint(e.clientX, e.clientY);
      const slozka = pod ? pod.closest('.folder-tile[data-folder]') : null;
      const nadVen = pod && dragStav.ven && pod.id === 'dropOut';

      dragStav.cile.forEach(c=>{
        const aktivni = (c === slozka);
        c.style.transform = aktivni ? 'scale(1.06)' : '';
        c.style.borderColor = aktivni ? 'var(--accent)' : '';
        c.style.borderStyle = 'dashed';
      });
      if(dragStav.ven) dragStav.ven.style.background = nadVen ? 'var(--accent)' : 'var(--card-bg-2)';
      if(dragStav.ven) dragStav.ven.style.color = nadVen ? '#fff' : 'var(--accent)';

      dragStav.cil = slozka ? slozka.dataset.folder : (nadVen ? '__ven__' : null);
    }

    function pust(){
      if(!dragStav) return;
      const { radek, itemId, duch, cile, ven, cil } = dragStav;
      document.removeEventListener('pointermove', tahni);
      document.removeEventListener('pointerup', pust);
      document.removeEventListener('pointercancel', pust);
      window.removeEventListener('hashchange', pust);
      try{ document.body.removeChild(duch); }catch(e){}
      if(ven){ try{ document.body.removeChild(ven); }catch(e){} }
      cile.forEach(c=>{ c.style.transform = ''; c.style.borderColor = ''; c.style.borderStyle = ''; });
      radek.style.opacity = '';
      dragStav = null;

      /* OPRAVA (13.8.2026): "duch" (plovouci kopie prave tazeneho radku)
         se vklada do document.body, MIMO container teto obrazovky - je
         to schvalne, jinak by ho container.innerHTML pri prekresleni
         smazal uprostred tazeni. Jenze kdyby clovek behem drzeni odesel
         jinam (zpet, spodni navigace), Router jen prepise #app-content a
         nikoho o tom neinformuje - "duch" by tak zustal navzdy viset
         nad UPLNE JINOU obrazovkou a posluchace na document by uz
         nemely na co reagovat. Kontrola container.isConnected pozna, ze
         uz nejsme na teto obrazovce, a presun dat v tom pripade
         preskoci - uklid vyse (ghost/listenery) uz ale probehl. */
      if(!container.isConnected) return;

      if(!cil) return;
      if(cil === '__ven__'){
        // O uroven vys = do rodicovske slozky te soucasne.
        const nadrazena = pathStack.length > 1 ? pathStack[pathStack.length-2].id : null;
        if(msMoveProjectItem(itemId, nadrazena)) draw();
        return;
      }
      if(msMoveProjectItem(itemId, cil)) draw();
    }

    function currentFolderId(){ return pathStack.length ? pathStack[pathStack.length-1].id : null; }

    function draw(){
      clickTargets = []; deleteTargets = []; renameTargets = []; shareTargets = [];
      const isRoot = pathStack.length===0;
      container.querySelector('.screen-scroll').classList.remove('no-scroll');
      container.querySelector('#backBtn').style.display = (isRoot && scope==='projekt') ? 'none' : 'grid';
      container.querySelector('#pathTitle').textContent = scope==='projekt' ? screenTitle : (isRoot ? (screenTitle + (stageInfo ? ' – '+stageInfo.name : '')) : pathStack[pathStack.length-1].name);
      container.querySelector('#statsRow').style.display = (isRoot && scope==='projekt') ? 'grid' : 'none';

      const crumbs = container.querySelector('#projectBreadcrumbs');
      crumbs.hidden = isRoot;
      if(!isRoot){
        crumbs.innerHTML = `<button data-depth="-1">Projekt</button>` + pathStack.map((part, i)=>
          `<span>/</span><button data-depth="${i}"${i===pathStack.length-1?' aria-current="page"':''}>${msEsc(part.name)}</button>`
        ).join('');
        crumbs.querySelectorAll('button[data-depth]').forEach(btn=>{
          btn.addEventListener('click', ()=>{
            const depth = Number(btn.dataset.depth);
            pathStack = depth < 0 ? [] : pathStack.slice(0, depth+1);
            searchQuery = '';
            searchInput.value = '';
            draw();
          });
        });
      }

      const allFoldersHere = msLoadProjectFolders().filter(f=> f.parentId===currentFolderId() && f.scope===scope && (f.stageKey||null)===(stageKey||null));
      const allItemsHere = msLoadProjectItems().filter(it=> it.folderId===currentFolderId() && it.scope===scope && (it.stageKey||null)===(stageKey||null));
      const folders = searchQuery ? allFoldersHere.filter(f=>(f.name||'').toLocaleLowerCase('cs').includes(searchQuery)) : allFoldersHere;
      const items = searchQuery ? allItemsHere.filter(it=>(it.name||'').toLocaleLowerCase('cs').includes(searchQuery)) : allItemsHere;
      // Prazdny stav ma vlastni misto - #grid uz se nepouziva (zustal
      // jen skryty kvuli starsimu kodu). (13.8.2026)
      const grid = container.querySelector('#emptyWrap');
      grid.innerHTML = '';
      grid.style.display = '';

      // Prazdny stav - jen kdyz v teto slozce fakt nic neni (i uvodni
      // "Projekt" pri prvnim otevreni pusobilo prilis prazdne a strohe).
      // Navrhove "chipy" na zalozeni bezne slozky se objevi JEN v
      // korenu vlastniho "Projekt" - u Nabidek/Dulezite pro konkretni
      // etapu uz kontext dava nadpis, dalsi navrhy by byly matouci.
      if(folders.length===0 && items.length===0){
        grid.innerHTML = `<div class="project-v2-empty" id="emptyProjectCard">
          <div style="width:44px;height:44px;border:1px solid var(--add-color);color:var(--add-color);margin:0 auto 12px;display:grid;place-items:center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 7h7l2 2h9v11H3z"/><path d="M3 7l2-3h6l2 3"/></svg>
          </div>
          <b>${searchQuery ? 'Nic nenalezeno' : (canAddHere ? 'Zatím prázdno' : 'Zatím tu nic není')}</b>
          <span>${searchQuery ? 'Zkus jiný název složky nebo souboru.' : (canAddHere ? 'Nahraj soubory, fotky, poznámky, nebo si založ další složku.' : 'Vlastník sem ještě nic nepřidal.')}</span>
        </div>`;
      }

      const foldersWrap = container.querySelector('#foldersWrap');
      const filesWrap = container.querySelector('#filesWrap');
      foldersWrap.innerHTML = ''; filesWrap.innerHTML = '';
      if(folders.length || items.length) grid.style.display = 'none';

      // --- SLOZKY: mrizka po dvou, at se nazev vejde cely ---
      if(folders.length){
        let html = `<div class="project-v2-section-head"><b>Složky</b><span>${folders.length}</span></div>
          <div class="project-v2-folder-grid">`;
        folders.forEach(f=>{
          const childCount = msLoadProjectFolders().filter(x=>x.parentId===f.id).length + msLoadProjectItems().filter(x=>x.folderId===f.id).length;
          html += tile({
            name: f.name, sub: childCount + (childCount===1?' položka':(childCount<5?' položky':' položek')), isFolder: true,
            folderId: f.id,
            onClick: ()=>{ pathStack.push({id:f.id, name:f.name}); draw(); },
            onDelete: isOwner ? ()=>{ msDeleteProjectFolder(f.id); draw(); } : null,
            onRename: isOwner ? ()=>{
              const name = prompt('Nový název složky:', f.name);
              if(!name || !name.trim()) return;
              msRenameProjectFolder(f.id, name.trim());
              draw();
            } : null,
          });
        });
        html += '</div>';
        foldersWrap.innerHTML = html;
      }

      // --- SOUBORY: seznam s pevnou vyskou radku ---
      if(items.length){
        let html = `<div class="project-v2-section-head"><b>Soubory</b><span>${items.length}</span></div>
          <div class="project-v2-file-list">`;
        items.forEach(it=>{
          html += fileRow(it);
        });
        html += '</div>';
        filesWrap.innerHTML = html;
      }

      if(canAddHere && !searchQuery) filesWrap.innerHTML += addTile();
      bindTileClicks();
      wireDragToFolder();
    }

    function editNote(it){
      if(!isOwner){ openItemContent(it); return; }
      const text = prompt('Upravit poznámku:', it.name.replace(/^Poznámka: /,''));
      if(text===null) return;
      const list = msLoadProjectItems();
      const idx = list.findIndex(x=>x.id===it.id);
      if(idx>-1){ list[idx] = Object.assign({}, list[idx], { name:'Poznámka: '+text.trim() }); msSaveProjectItems(list); }
      draw();
    }

    // Sdileni polozky z nabidky pod teckami (drive jen pres dotaz po
    // klepnuti na soubor).
    async function shareItemFromMenu(it){
      if(!msRequirePremium('Posílání souborů do jiných aplikací')) return;
      const dataUrl = await msProjectItemContent(it.id);
      if(!dataUrl){ alert('Obsah souboru se nepodařilo najít - zkus appku načíst znovu.'); return; }
      const file = msDataUrlToFile(dataUrl, it.name || 'soubor');
      if(!file){ alert('Soubor se nepodařilo připravit k odeslání.'); return; }
      if(msCanShareFiles([file])){
        try{ await navigator.share({ files:[file], title: it.name || 'Soubor ze stavby' }); return; }
        catch(e){ if(e && e.name === 'AbortError') return; }
      }
      const res = await msSaveFilesToDevice([file], it.name || 'Soubor ze stavby');
      if(res === 'unsupported') alert('Tenhle prohlížeč neumí posílat soubory. Zkus appku otevřít jako aplikaci na ploše.');
    }

    async function shareDocFromMenu(d){
      if(!msRequirePremium('Posílání souborů do jiných aplikací')) return;
      const dataUrl = await msDocumentContent(d.id);
      if(!dataUrl){ alert('Obsah souboru se nepodařilo najít - zkus appku načíst znovu.'); return; }
      const file = msDataUrlToFile(dataUrl, d.name || 'soubor');
      if(!file){ alert('Soubor se nepodařilo připravit k odeslání.'); return; }
      if(msCanShareFiles([file])){
        try{ await navigator.share({ files:[file], title: d.name || 'Soubor ze stavby' }); return; }
        catch(e){ if(e && e.name === 'AbortError') return; }
      }
      const res = await msSaveFilesToDevice([file], d.name || 'Soubor ze stavby');
      if(res === 'unsupported') alert('Tenhle prohlížeč neumí posílat soubory. Zkus appku otevřít jako aplikaci na ploše.');
    }

    async function openItemContent(it){
      const dataUrl = await msProjectItemContent(it.id);
      if(!dataUrl){
        if(it.isNote){ alert(it.name); return; }
        alert('Obsah souboru se nepodařilo najít - zkus appku načíst znovu.');
        return;
      }
      // DOPLNENO (8.8.2026): i u souboru v Projektu ma byt "Sdilet" po ruce -
      // typicky vykres nebo revizni zprava, kterou clovek posila remeslnikovi.
      const shareThis = async ()=>{
        if(!msRequirePremium('Posílání souborů do jiných aplikací')) return;
        const file = msDataUrlToFile(dataUrl, it.name || 'soubor');
        if(!file){ alert('Soubor se nepodařilo připravit k odeslání.'); return; }
        if(msCanShareFiles([file])){
          try{ await navigator.share({ files:[file], title: it.name || 'Soubor ze stavby' }); return; }
          catch(e){ if(e && e.name === 'AbortError') return; }
        }
        const res = await msSaveFilesToDevice([file], it.name || 'Soubor ze stavby');
        if(res === 'unsupported') alert('Tenhle prohlížeč neumí posílat soubory. Zkus appku otevřít jako aplikaci na ploše.');
      };

      if(it.mime && it.mime.startsWith('image/')){
        // OPRAVA (11.8.2026): tady se kreslil vlastni jednoduchy nahled s
        // obycejnym <img> - obrazek proto neslo priblizit. Zrovna v
        // Projektu jsou ulozene vykresy, situace a revizni zpravy, kde je
        // priblizeni to hlavni, co clovek potrebuje. Appka pritom uz
        // prohlizec se stipnutim a posouvanim ma (msPhotoLightbox v
        // galerii), jen se tu nepouzival.
        msPhotoLightbox([dataUrl], 0, msCanExportContent() ? { label: 'Sdílet', onClick: shareThis } : null);
        return;
      }
      // ZMENA (11.8.2026): drive se tady appka ptala "Sdilet / Otevrit".
      // Klepnuti na soubor ale znamena "chci ho videt" - ptat se pokazde
      // bylo zdrzeni navic. Sdileni je ted v nabidce pod tremi teckami.
      await openAnyStoredFile(dataUrl, it.name || 'soubor', it.mime || '');
    }

    // OPRAVA (14.8.2026): tahle funkce kreslila fotku primo na canvas
    // bez cteni EXIF orientace - fotka vyfocena na vysku vysla na bok
    // nebo vzhuru nohama (stejna chyba, jakou uz appka opravila u
    // pridavani fotek do zapisu deniku). msResizeImageFile v data.js uz
    // EXIF cte a otoci spravne.
    function readAsDataURL(file){
      return new Promise(resolve=>{
        if(!file.type.startsWith('image/')){
          const reader = new FileReader();
          reader.onload = ()=> resolve(reader.result);
          reader.onerror = ()=> resolve(null);
          reader.readAsDataURL(file);
          return;
        }
        msResizeImageFile(file, 1400, 0.75).then(resolve).catch(()=> resolve(null));
      });
    }

    async function onAddClick(){
      // (28.8.2026) Kontrola naroku - jediny vstupni bod pro VSECHNY
      // zpusoby pridani v teto obrazovce (soubor, foto, poznamka, nova
      // slozka) - stejny vzor jako onAddClickSD v renderStageDocs vyse
      // (tohle je jeji sesterska implementace pro Projekt/Nabidky/
      // Dulezite, viz komentar na zacatku souboru).
      if(typeof msCanAddContent === 'function' && !msCanAddContent()){
        Router.go('paywall', { reason:'trial-expired' });
        return;
      }
      const choice = await addSheet();
      if(choice==='files') container.querySelector('#fileInput').click();
      else if(choice==='camera') container.querySelector('#cameraInput').click();
      else if(choice==='note'){
        const text = prompt('Text poznámky:');
        if(!text || !text.trim()) return;
        const saved=await msAddProjectItem({ name:'Poznámka: '+text.trim(), isNote:true, folderId: currentFolderId(), scope, stageKey });
        if(!saved){ alert('Poznámku se nepodařilo uložit. Zkontroluj volné místo v zařízení.'); return; }
        draw();
      }
      else if(choice==='newFolder'){
        const name = prompt('Název nové složky:');
        if(!name || !name.trim()) return;
        if(!msAddProjectFolder(name.trim(), currentFolderId(), scope, stageKey)){ alert('Složku se nepodařilo uložit. Zkontroluj volné místo v zařízení.'); return; }
        draw();
      }
    }
    function addSheet(){
      return new Promise(resolve=>{
        const overlay = document.createElement('div');
        overlay.className = 'ms-overlay'; overlay.style.cssText = 'position:fixed;inset:0;background:rgba(2,4,10,.7);z-index:60;display:flex;align-items:flex-end;justify-content:center';
        overlay.innerHTML = `
          <div class="project-v2-add-sheet">
            <div class="project-v2-add-sheet-head">
              <div><b>Přidat obsah</b><span>${msEsc(pathStack.length ? pathStack[pathStack.length-1].name : screenTitle)}</span></div>
            </div>
            <div class="project-v2-add-grid">
            <div class="mi" data-c="files">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h9l3 3v15H6z"/><path d="M9 10h6M9 14h6"/></svg>
              <b>Nahrát soubor</b><span>Lze vybrat více položek</span>
            </div>
            <div class="mi" data-c="camera">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h4l2-2h4l2 2h4v12H4z"/><circle cx="12" cy="13" r="3"/></svg>
              <b>Vyfotit dokument</b><span>Otevře fotoaparát</span>
            </div>
            <div class="mi" data-c="note">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg>
              <b>Nová poznámka</b><span>Rychlý text bez souboru</span>
            </div>
            ${isOwner ? `<div class="mi" data-c="newFolder">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
              <b>Nová složka</b><span>Vytvoří další úroveň</span>
            </div>` : ''}
            </div>
            <button id="sheetClose" class="project-v2-add-cancel">Zrušit</button>
          </div>`;
        document.body.appendChild(overlay);
        overlay.querySelector('#sheetClose').addEventListener('click', ()=>{ document.body.removeChild(overlay); resolve(null); });
        overlay.querySelectorAll('.mi').forEach(el=>{
          el.addEventListener('click', ()=>{ document.body.removeChild(overlay); resolve(el.dataset.c); });
        });
      });
    }

    // OPRAVA (10.8.2026): nahravani vetsi davky trvalo desitky vterin a
    // appka po tu dobu nedavala NAJEVO VUBEC NIC (draw() az uplne na
    // konci). Realny nasledek: soubory se vybraly znovu a v Elektru
    // skoncilo 10 PDF dvakrat. Ted je videt prubeh, druhe spusteni se
    // behem nahravani ignoruje a na uz existujici nazvy se appka zepta.
    let _uploadBusy = false;
    async function uploadSelectedFiles(selectedFiles){
      if(_uploadBusy) return;
      let files = [...selectedFiles];
      if(!files.length) return;

      const folderId = currentFolderId();
      const existing = (typeof msLoadProjectItems === 'function' ? msLoadProjectItems() : [])
        .filter(it=> (it.folderId||null) === (folderId||null))
        .map(it=> it.name);
      const dupes = files.filter(f=> existing.indexOf(f.name) >= 0);
      if(dupes.length){
        const seznam = dupes.slice(0,5).map(f=> '· ' + f.name).join('\n')
          + (dupes.length > 5 ? '\n· … a další ' + (dupes.length-5) : '');
        const ok = confirm('V téhle složce už ' + (dupes.length===1 ? 'je soubor se stejným názvem' : 'jsou soubory se stejnými názvy') + ':\n\n' + seznam
          + '\n\nDát je tam podruhé?\n(„Zrušit" je přeskočí a nahraje jen zbytek.)');
        if(!ok){
          files = files.filter(f=> existing.indexOf(f.name) < 0);
          if(!files.length) return;
        }
      }

      _uploadBusy = true;
      const prog = document.createElement('div');
      prog.style.cssText = 'position:fixed;inset:0;background:rgba(2,4,10,.75);z-index:70;display:flex;align-items:center;justify-content:center;padding:24px';
      prog.innerHTML = '<div style="background:var(--card-bg-2);border:1px solid var(--line);border-left:3px solid var(--accent);padding:18px 20px;max-width:320px;width:100%">'
        + '<b id="progTitle" style="font-size:13px;display:block;margin-bottom:8px">Nahrávám…</b>'
        + '<div style="height:4px;background:var(--line);overflow:hidden"><div id="progBar" style="height:100%;width:0%;background:var(--accent);transition:width .2s"></div></div>'
        + '<div style="font-size:10.5px;color:var(--muted);margin-top:8px">Nech appku otevřenou, ať se to stihne nahrát.</div></div>';
      document.body.appendChild(prog);
      const setProg = (i, total, name)=>{
        const t = prog.querySelector('#progTitle');
        const b = prog.querySelector('#progBar');
        if(t) t.textContent = 'Nahrávám ' + i + '/' + total + ' – ' + (name.length > 28 ? name.slice(0,27) + '…' : name);
        if(b) b.style.width = Math.round((i-1)/total*100) + '%';
      };
      try{
        let savedCount=0;
        let failedCount=0;
        for(let i = 0; i < files.length; i++){
          const f = files[i];
          setProg(i+1, files.length, f.name);
          await new Promise(r=> setTimeout(r, 0)); // at se prekresli text
          const content = await readAsDataURL(f);
          if(!content){ failedCount++; continue; }
          const saved=await msAddProjectItem({ name: f.name, mime: f.type||null, folderId, content, scope, stageKey });
          if(saved) savedCount++; else failedCount++;
        }
        if(savedCount) Layout.showSuccess(savedCount === 1 ? 'Soubor přidán' : `Přidáno ${savedCount} souborů`);
        if(failedCount) alert(`${failedCount} souborů se nepodařilo uložit. Zkontroluj volné místo v zařízení a zkus je znovu.`);
      }catch(err){
        console.error('nahrani souboru selhalo', err);
        alert('Něco se nenahrálo: ' + (err && err.message ? err.message : String(err)));
      }finally{
        try{ document.body.removeChild(prog); }catch(_){}
        _uploadBusy = false;
        draw();
      }
    }
    container.querySelector('#fileInput').addEventListener('change', async (e)=>{
      const files = [...e.target.files];
      e.target.value = '';
      await uploadSelectedFiles(files);
    });
    container.querySelector('#cameraInput').addEventListener('change', async (e)=>{
      const files = [...e.target.files];
      e.target.value = '';
      await uploadSelectedFiles(files);
    });

    container.querySelector('#backBtn').addEventListener('click', ()=>{
      if(pathStack.length>0){ pathStack.pop(); searchQuery=''; searchInput.value=''; draw(); }
      else { Router.back(); }
    });

    draw();
    return { activeTab:'project' };
  }

  return { render };
})();
Router.register('project', ProjectScreen);
