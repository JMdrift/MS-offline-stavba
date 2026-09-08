/* ==========================================================
   NASTAVENI
   ========================================================== */
const SettingsScreen = (function(){
  function escapeHtml(s){ return msEsc(s); } // (13.8.2026) uz jen tenky preklad na sdilenou msEsc z data.js
  function render(container){
    container.innerHTML = `
      <div class="topbar ms-ui-topbar settings-v2-topbar">
        <div class="back-btn" id="backBtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></div>
        <div class="ms-ui-title"><p>Aplikace a data</p><h1>Nastavení</h1></div>
      </div>
      <div class="screen-scroll settings-v2-scroll">
        <p class="section-label" style="margin-top:4px">Projekty</p>
        <div id="projectsCard" class="settings-v2-card settings-v2-projects"></div>

        <p class="section-label">Předvolby</p>
        <div style="border:1px solid var(--line);margin-bottom:14px">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px">
            <div><b style="display:block;font-size:12.5px">Oznámení</b><span id="notifStatus" style="font-size:10.5px;color:var(--muted)">Posílat události přímo jako notifikaci</span></div>
            <div id="notifSwitch" style="width:38px;height:22px;border-radius:11px;border:1px solid var(--line);position:relative;cursor:pointer"><i style="position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:var(--muted)"></i></div>
          </div>
          <div id="rowAppLock" style="display:flex;align-items:center;justify-content:space-between;padding:12px;border-top:1px solid var(--line);cursor:pointer">
            <div><b style="display:block;font-size:12.5px">Zámek appky</b><span style="font-size:10.5px;color:var(--muted)">${(typeof MSAppLock !== 'undefined' && !MSAppLock.isSupported()) ? 'Na tomhle zařízení nedostupné' : (msGetAppLock()==='faceid' ? 'Zapnutý' : 'Bez zámku')}</span></div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2.5" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>
          </div>
          <div style="padding:12px;border-top:1px solid var(--line)">
            <b style="display:block;font-size:12.5px">Velikost zobrazení</b>
            <span style="display:block;font-size:10.5px;color:var(--muted);margin-bottom:9px">Menší volba zmenší písmo i dlaždice, takže se toho na obrazovku vejde víc</span>
            <div id="uiScaleRow" style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">
              ${[['velke','Velké'],['stredni','Střední'],['male','Malé']].map(([k,l])=>`
                <button class="ui-scale-btn" data-scale="${k}" style="padding:9px 4px;font:inherit;font-size:11.5px;font-weight:800;cursor:pointer;
                  border:1px solid ${msGetUiScale()===k?'var(--accent)':'var(--line)'};
                  color:${msGetUiScale()===k?'var(--accent)':'var(--muted)'};background:transparent">${l}</button>`).join('')}
            </div>
          </div>
        </div>

        <!-- (13.8.2026) "Vygenerovat stavební deník" odsud zmizelo - byla
             to duplicita tlačítka, které už dávno je přímo v Deníku
             (#genBtn), a to logičtější místo: dá se tam rovnou omezit na
             aktuální etapu. Router route 'diary-export' zůstává, jen sem
             na ni nevede druhá cesta. -->
        <p class="section-label">Úložiště</p>
        <div style="border:1px solid var(--line)">
          <div style="padding:12px;border-bottom:1px solid var(--line)">
            <div id="storageBar" style="height:6px;background:var(--card-bg-2);border:1px solid var(--line);margin-bottom:8px;overflow:hidden"><div id="storageBarFill" style="height:100%;background:var(--accent);width:0%"></div></div>
            <span id="storageText" style="font-size:11px;color:var(--muted)">Počítám…</span>
          </div>
          <div class="row-item" id="rowCompress" style="padding:12px;cursor:pointer"><b style="font-size:12.5px">Zmenšit uložené fotky a obrázky</b><span style="display:block;font-size:10.5px;color:var(--muted)">Uvolní místo. Fotky a obrazové dokumenty se trvale zmenší na ${MS_SHRINK_PHOTO_DIM} px; PDF, Word, ZIP a další soubory se nemění. Použij jen po záloze.</span></div>
          <div style="padding:12px;border-top:1px solid var(--line)">
            <b style="display:block;font-size:12.5px">Kvalita ukládaných fotek</b>
            <span style="display:block;font-size:10.5px;color:var(--muted);margin-bottom:9px">Platí na nově přidané fotky. Počet fotek v galerii ani v jednom zápisu není omezen; appka je ukládá postupně a limitem je pouze volné místo zařízení.</span>
            <div id="photoQRow" style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">
              ${Object.keys(MS_PHOTO_PRESETS).map(k=>{
                const pr = MS_PHOTO_PRESETS[k]; const on = msGetPhotoQuality()===k;
                return `<button class="photo-q-btn" data-q="${k}" style="padding:8px 4px;font:inherit;font-size:11px;font-weight:800;cursor:pointer;
                  border:1px solid ${on?'var(--accent)':'var(--line)'};color:${on?'var(--accent)':'var(--muted)'};background:transparent">
                  ${pr.label}<span style="display:block;font-size:9px;font-weight:600;color:var(--muted);margin-top:2px">${pr.dim} px · bez limitu počtu</span></button>`;
              }).join('')}
            </div>
          </div>
        </div>

        <p class="section-label">Podpora</p>
        <div style="border:1px solid var(--line)">
          <div class="row-item" id="rowSupport" style="padding:12px;border-bottom:1px solid var(--line);cursor:pointer"><b style="font-size:12.5px">Nápověda a podpora</b><span style="display:block;font-size:10.5px;color:var(--muted)">moje-stavba-app@seznam.cz</span></div>
          <div class="row-item" id="rowDeleteAll" style="padding:12px;cursor:pointer;color:#ff7a86"><b style="font-size:12.5px">Smazat všechna data appky</b><span style="display:block;font-size:10.5px;color:var(--muted)">Nevratné</span></div>
        </div>

        <p class="section-label">O aplikaci</p>
        <div style="border:1px solid var(--line);padding:16px;text-align:center;margin-bottom:14px">
          <b style="display:block;font-size:14px">Moje Stavba</b>
          <span style="font-size:11px;color:var(--muted);display:block;margin:8px 0 4px;line-height:1.5">Vznikla během stavby jednoho rodinného domu, když přestalo stačit zapisovat do sešitu a fotky se ztrácely mezi tisíci dalších. Drží pohromadě deník, výdaje, termíny i fotodokumentaci. Data neopouštějí telefon, takže na zálohu nezapomínej.</span>
          <span style="font-size:11px;color:var(--muted)">Verze ${typeof MS_BUILD_VERSION !== 'undefined' ? MS_BUILD_VERSION : '?'}</span>
        </div>
        <div style="border:1px solid var(--line)">
          <div class="row-item" id="rowPrivacy" style="padding:12px;border-bottom:1px solid var(--line);cursor:pointer"><b style="font-size:12.5px">Zásady ochrany osobních údajů</b></div>
          <div class="row-item" id="rowTerms" style="padding:12px;cursor:pointer"><b style="font-size:12.5px">Podmínky používání</b></div>
        </div>
      </div>
    `;
    container.querySelectorAll('.settings-v2-scroll > div').forEach(el=>{
      if(el.matches('[style*="border:1px solid var(--line)"]')) el.classList.add('settings-v2-card');
    });
    container.querySelector('#backBtn').addEventListener('click', ()=> Router.back());
    container.querySelector('#rowSupport').addEventListener('click', ()=>{
      window.location.href = 'mailto:moje-stavba-app@seznam.cz?subject=' + encodeURIComponent('Moje Stavba - dotaz/podpora');
    });
    container.querySelector('#rowPrivacy').addEventListener('click', ()=> Router.go('privacy-policy'));
    container.querySelector('#rowTerms').addEventListener('click', ()=> Router.go('terms'));

    function renderProjects(){
      const wrap = container.querySelector('#projectsCard');
      const projects = msLoadProjects();
      const activeId = msGetActiveProjectId();
      wrap.innerHTML = projects.map(p=>`
        <div class="proj-row settings-v2-project-row" data-id="${p.id}" style="--project-color:${p.currentStage?p.currentStage.color:'#94a0bc'}">
          <div class="settings-v2-project-mark">${(p.name||'?').trim().charAt(0).toUpperCase()}</div>
          <div class="settings-v2-project-copy"><b>${msEsc(p.name)}</b><span>${p.type?p.type+' · ':''}${msEsc(p.location || '')}</span></div>
          <div class="settings-v2-project-badges">${p.id===activeId?'<span class="is-active">Aktivní</span>':''}</div>
          <div class="settings-v2-project-actions"><button class="edit-btn" data-id="${p.id}">Upravit</button><button class="remove-btn" data-id="${p.id}">Odebrat</button></div>
        </div>
      `).join('') + `<button id="addProjectRow" class="settings-v2-add-project"><span>＋</span>Přidat projekt</button>`;

      wrap.querySelectorAll('.proj-row').forEach(row=>{
        row.addEventListener('click', (e)=>{
          if(e.target.closest('.edit-btn') || e.target.closest('.remove-btn')) return;
          msSetActiveProjectId(row.dataset.id);
          renderProjects();
        });
      });
      // Dvoufazove potvrzeni trvaleho smazani mistniho projektu.
      wrap.querySelectorAll('.remove-btn').forEach(btn=>{
        btn.addEventListener('click', async (e)=>{
          e.stopPropagation();
          const p = projects.find(x=>x.id===btn.dataset.id);
          const ok1 = await Layout.confirmDialog(
            'Opravdu odebrat stavbu "' + p.name + '"? Appka trvale smaže tenhle projekt a všechna jeho data z tohoto zařízení - deník, fotky, výdaje, dokumenty i kalendář. Tenhle krok nejde vrátit zpět.',
            'Ano, chci odebrat', 'Zrušit'
          );
          if(!ok1) return;
          const typed = prompt('Pro potvrzení napiš slovo "odebrat":');
          if(typed === null) return;
          if(typed.trim().toLowerCase() !== 'odebrat'){
            alert('Slovo nesouhlasí, projekt nebyl odebrán.');
            return;
          }
          await msDeleteProject(p.id);
          renderProjects();
        });
      });
      wrap.querySelectorAll('.edit-btn').forEach(btn=>{
        btn.addEventListener('click', (e)=>{
          e.stopPropagation();
          const p = projects.find(x=>x.id===btn.dataset.id);
          const name = prompt('Název projektu:', p.name);
          if(name===null) return;
          const loc = prompt('Místo stavby:', p.location||'');
          if(loc===null) return;
          msUpdateProject(p.id, {name:name.trim()||p.name, location:loc.trim()});
          renderProjects();
        });
      });
      wrap.querySelector('#addProjectRow').addEventListener('click', ()=> Router.go('onboarding-project'));
    }
    renderProjects();

    // notifikace
    const notifSwitch = container.querySelector('#notifSwitch');
    container.querySelector('#rowAppLock').addEventListener('click', ()=> Router.go('app-lock-setup'));
    const notifStatus = container.querySelector('#notifStatus');

    function paintNotif(enabled){
      notifSwitch.style.borderColor = enabled ? 'var(--accent)' : 'var(--line)';
      notifSwitch.querySelector('i').style.left = enabled ? '18px' : '2px';
      notifSwitch.querySelector('i').style.background = enabled ? 'var(--accent)' : 'var(--muted)';
    }
    async function refreshNotif(){
      if(typeof MSNotifications!=='undefined'){
        const st = await MSNotifications.getStatus();
        paintNotif(!!st.enabled);
        if(st.raw==='denied') notifStatus.textContent = 'Zablokováno v nastavení telefonu';
        else if(st.enabled) notifStatus.textContent = st.mode==='native' ? 'Zapnuto · systémové připomínky' : 'Zapnuto v prohlížeči';
        else if(st.mode==='native') notifStatus.textContent = 'Termíny, úkoly a plánované výdaje jako oznámení telefonu';
        else notifStatus.textContent = 'Webová oznámení fungují jen omezeně; v Android aplikaci jsou plnohodnotná';
        return;
      }
      paintNotif(false);
      notifStatus.textContent = 'Oznámení nejsou dostupná';
    }
    notifSwitch.addEventListener('click', async ()=>{
      if(typeof MSNotifications==='undefined'){ alert('Modul oznámení není načtený.'); return; }
      const st = await MSNotifications.getStatus();
      const res = await MSNotifications.setEnabled(!st.wanted);
      if(!res.ok){
        if(res.reason==='permission') alert('Oznámení nejsou povolená. Povol je prosím v nastavení telefonu.');
        else alert('Oznámení na tomto zařízení nejsou dostupná.');
      }
      await refreshNotif();
    });
    refreshNotif();

    // zaloha
    // uloziste - realny odhad primo z prohlizece (pokryva IndexedDB, kde
    // ted zijou fotky/dokumenty - ma mnohem vetsi strop nez drivejsi
    // localStorage, typicky stovky MB az GB podle mista v telefonu)
    async function refreshStorageBar(){
      container.querySelector('#storageText').textContent = 'Počítám…';
      let est = null;
      if(navigator.storage && navigator.storage.estimate){
        try{ est = await navigator.storage.estimate(); }catch(e){}
      }
      if(est && est.quota){
        const usedMb = (est.usage/1024/1024).toFixed(1);
        const quotaMb = (est.quota/1024/1024/1024).toFixed(1);
        const pct = Math.min(100, Math.round(est.usage/est.quota*100));
        container.querySelector('#storageBarFill').style.width = pct+'%';
        container.querySelector('#storageBarFill').style.background = pct>85 ? '#ff6a6a' : 'var(--accent)';
        container.querySelector('#storageText').textContent = `Využito ${usedMb} MB z ~${quotaMb} GB dostupných na telefonu`;
      } else {
        const used = msStorageUsageBytes();
        container.querySelector('#storageBarFill').style.width = '0%';
        container.querySelector('#storageText').textContent = `Drobná data appky: ${(used/1024).toFixed(0)} kB (fotky/dokumenty se počítají zvlášť, telefon jejich přesnou velikost nesděluje)`;
      }
    }
    refreshStorageBar();
    container.querySelector('#rowCompress').addEventListener('click', async ()=>{
      const row = container.querySelector('#rowCompress');
      // ZMENA (8.8.2026): tohle je NEVRATNE - original fotky nikde jinde
      // neni. Driv se to provedlo bez jakehokoli dotazu a popisek jeste
      // tvrdil "bez ztraty obsahu".
      const photoCount = msPhotos().length;
      const ok = await Layout.confirmDialog(
        'Všech ' + photoCount + ' fotek se trvale zmenší na ' + MS_SHRINK_PHOTO_DIM + ' px. ' +
        'Původní velikost už nebude možné vrátit - detaily na štítcích a výkresech se mohou stát nečitelnými. ' +
        'Pokud chceš mít originály uložené, udělej si nejdřív plnou zálohu.',
        'Zmenšit', 'Zruším to');
      if(!ok) return;
      const originalHtml = row.innerHTML;
      row.innerHTML = '<b style="font-size:12.5px">Zmenšuji…</b>';
      const saved = await msCompressExistingMedia((cat, i, n)=>{
        row.innerHTML = `<b style="font-size:12.5px">Zmenšuji ${cat} (${i}/${n})…</b>`;
      });
      row.innerHTML = originalHtml;
      refreshStorageBar();
      alert(saved>0
        ? `Hotovo, uvolnilo se přibližně ${msFormatMb(saved)}.`
        : 'Všechno už bylo v optimální velikosti, nebylo co zmenšit.');
    });

    /* ==========================================================
       EXPORT ZALOHY  (prepsano 7.8.2026)
       ----------------------------------------------------------
       PROC: puvodni export cetl jen localStorage. Jenze fotky,
       dokumenty, uctenky a prilohy projektu od migrace zijou
       v IndexedDB - v zaloze tedy fyzicky nebyly. Vypadala
       kompletne (zaznamy fotek v ni jsou), ale obrazky chybely
       a poznalo se to az ve chvili, kdy je clovek potreboval.

       Novy format ma dve casti:
         { "__msBackup": 2, "data": {...localStorage...},
           "blobs": {...IndexedDB...} }
       Stare zalohy (holy objekt s ms_* klici) se poznaji podle
       chybejiciho __msBackup a nacitaji se dal - viz import.

       Soubor se sklada po kouskach do pole a teprve pak z nej
       vznikne Blob. Jedno velke JSON.stringify pres stovky MB
       fotek by na telefonu spadlo na pameti.
       ========================================================== */
    /* ==========================================================
       KONTROLA FOTEK (8.8.2026)
       Fotka se uklada na dve mista: zaznam (etapa, datum, popis) do
       localStorage a samotny obrazek do IndexedDB. Kdyz selze zapis
       do IndexedDB - coz se na iOS pri vytizeni pameti stava -
       zaznam existuje, ale obrazek k nemu chybi a fotka se tvari,
       ze "nikam nedosla". Tohle to rozliší a rovnou pojmenuje.
       ========================================================== */
    container.querySelectorAll('.photo-q-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        msSetPhotoQuality(btn.dataset.q);
        container.querySelectorAll('.photo-q-btn').forEach(b=>{
          const on = b.dataset.q === btn.dataset.q;
          b.style.borderColor = on ? 'var(--accent)' : 'var(--line)';
          b.style.color = on ? 'var(--accent)' : 'var(--muted)';
        });
      });
    });

    container.querySelectorAll('.ui-scale-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        msSetUiScale(btn.dataset.scale);
        container.querySelectorAll('.ui-scale-btn').forEach(b=>{
          const on = b.dataset.scale === btn.dataset.scale;
          b.style.borderColor = on ? 'var(--accent)' : 'var(--line)';
          b.style.color = on ? 'var(--accent)' : 'var(--muted)';
        });
      });
    });

    // OPRAVA (2.8.2026): dvoufazove potvrzeni stejne jako u odebrani
    // projektu - tohle smaze UPLNE VSECHNO, vsechny projekty najednou,
    // bez moznosti navratu. Faze 1: vysvetleni + potvrzovaci dialog.
    // Faze 2: napsat presne slovo "smazat".
    container.querySelector('#rowDeleteAll').addEventListener('click', async ()=>{
      const ok1 = await Layout.confirmDialog(
        'Opravdu smazat úplně všechna data appky? Tohle nevratně smaže VŠECHNY stavby na tomhle zařízení - deníky, fotky, výdaje, dokumenty i nastavení. Appka nemá žádnou zálohu, tenhle krok nejde vrátit zpět.',
        'Ano, chci smazat', 'Zrušit'
      );
      if(!ok1) return;
      const typed = prompt('Pro potvrzení napiš slovo "smazat":');
      if(typed === null) return;
      if(typed.trim().toLowerCase() !== 'smazat'){
        alert('Slovo nesouhlasí, appka nic nesmazala.');
        return;
      }
      const keys = [];
      for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(k&&k.startsWith('ms_')) keys.push(k); }
      keys.forEach(k=>localStorage.removeItem(k));
      // OPRAVA (29.8.2026): drive se mazal jen localStorage - fotky a
      // dokumenty v IndexedDB zustavaly telefon zabirat dal, appka o
      // nich uz jen nevedela. "Smazat vse" ma smazat opravdu vse.
      if(typeof msIdbClearAll === 'function'){
        try{ await msIdbClearAll(); }catch(e){ console.error('mazani IndexedDB selhalo', e); }
      }
      Router.go('onboarding-project');
    });

    return { activeTab:'', showNav:true };
  }
  return { render };
})();
Router.register('settings', SettingsScreen);
