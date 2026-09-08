/* ==========================================================
   ZÁLOHOVÁNÍ - samostatná obrazovka (28.8.2026).
   Drive zila cast v Nastaveni (karta nahore + "Zalohovani dat" sekce
   nize) - na zadost je ted VYCLENENA jako vlastni obrazovka, dostupna
   jedine prokliknutim z karty na dashboardu, ne z Nastaveni. Duvod:
   zalohovani je pro appku bez cloudu zasadni vec (jedina ochrana proti
   ztrate dat), tak si zaslouzi vlastni prostor s poradnym vysvetlenim,
   ne byt schovana mezi Predvolbami a Podporou.
   ========================================================== */
const BackupScreen = (function(){
  const LAST_BACKUP_KEY = 'ms_last_backup_at_v1';

  function formatDatumCas(iso){
    if(!iso) return null;
    try{
      const d = new Date(iso);
      const dnes = new Date(); dnes.setHours(0,0,0,0);
      const den = new Date(d); den.setHours(0,0,0,0);
      const rozdilDni = Math.round((dnes - den) / 86400000);
      const cas = d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
      if(rozdilDni === 0) return 'dnes v ' + cas;
      if(rozdilDni === 1) return 'včera v ' + cas;
      return d.getDate()+'. '+(d.getMonth()+1)+'. '+d.getFullYear();
    }catch(e){ return null; }
  }

  function render(container){
    const posledniZaloha = (()=>{ try{ return localStorage.getItem(LAST_BACKUP_KEY); }catch(e){ return null; } })();

    container.innerHTML = `
      <div class="topbar ms-ui-topbar settings-v2-topbar">
        <div class="back-btn" id="backBtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></div>
        <div class="ms-ui-title"><p>Aplikace a data</p><h1>Zálohování</h1></div>
      </div>
      <div class="screen-scroll settings-v2-scroll">

        <div style="border-left:3px solid var(--accent);background:color-mix(in srgb,var(--accent) 5%,transparent);padding:16px;margin-bottom:16px">
          <b style="display:block;font-size:13px;margin-bottom:6px">Jak to funguje</b>
          <p style="margin:0;font-size:11.5px;color:var(--muted);line-height:1.6">Appka nemá cloud — data zůstávají jen v telefonu, a když ho ztratíš nebo rozbiješ bez zálohy, nedají se vrátit. Záloha je jeden soubor se vším; stáhneš ho a uložíš si ho sám, třeba do e-mailu nebo cloudového úložiště telefonu. Obnovení nic nesmaže, jen doplní.</p>
        </div>

        <div style="border:1px solid var(--line);padding:14px;margin-bottom:16px;text-align:center">
          <span style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);display:block;margin-bottom:4px">Poslední záloha</span>
          <b style="font-size:14px" id="lastBackupText">${posledniZaloha ? formatDatumCas(posledniZaloha) : 'Zatím žádná'}</b>
        </div>

        <p class="section-label" style="margin-top:4px">Záloha</p>
        <div style="border:1px solid var(--line)">
          <div class="row-item" id="rowExport" style="padding:12px;cursor:pointer;border-bottom:1px solid var(--line)"><b style="font-size:12.5px">Exportovat zálohu</b><span style="display:block;font-size:10.5px;color:var(--muted)">Stáhne data appky, volitelně i s fotkami a dokumenty</span></div>
          <div class="row-item" id="rowImport" style="padding:12px;cursor:pointer"><b style="font-size:12.5px">Obnovit ze zálohy</b><span style="display:block;font-size:10.5px;color:var(--muted)">Nahraje dříve stažený soubor včetně fotek</span></div>
          <input type="file" id="importFile" accept="application/json" style="display:none"/>
        </div>

        <p style="font-size:10.5px;color:var(--muted);line-height:1.6;margin:14px 2px 0">Doporučujeme zálohu vytvořit po každé důležitější dávce práce — třeba po dokončení etapy nebo po nahrání většího množství fotek.</p>
      </div>
    `;
    container.querySelector('#backBtn').addEventListener('click', ()=> Router.back());

    container.querySelector('#rowExport').addEventListener('click', async ()=>{
      const row = container.querySelector('#rowExport');
      const originalHtml = row.innerHTML;

      const withMedia = await Layout.confirmDialog(
        'Chceš do zálohy zabalit i fotky a dokumenty? Záloha pak bude úplná, ale podstatně větší a bude chvíli trvat. Bez nich vznikne malý soubor, ve kterém budou jen zápisy, výdaje, úkoly a nastavení.',
        'Ano, včetně fotek', 'Jen data'
      );

      row.innerHTML = '<b style="font-size:12.5px">Připravuji zálohu…</b>';
      try{
        const parts = ['{"__msBackup":2,"exported":' + JSON.stringify(new Date().toISOString()) + ',"data":{'];

        const lsPairs = [];
        for(let i=0;i<localStorage.length;i++){
          const k = localStorage.key(i);
          if(k && k.startsWith('ms_')) lsPairs.push(JSON.stringify(k)+':'+JSON.stringify(localStorage.getItem(k)));
        }
        parts.push(lsPairs.join(','));
        parts.push('},"blobs":{');

        if(withMedia){
          const keys = await msIdbAllKeys();
          let written = 0;
          for(let i=0;i<keys.length;i++){
            if(i % 10 === 0) row.innerHTML = `<b style="font-size:12.5px">Balím fotky a dokumenty (${i}/${keys.length})…</b>`;
            let val = MS_BLOB_CACHE.get(keys[i]);
            if(val === undefined){
              try{ val = await msIdbGet(keys[i]); }catch(e){ val = null; }
            }
            if(val == null) continue;
            parts.push((written ? ',' : '') + JSON.stringify(keys[i]) + ':' + JSON.stringify(val));
            written++;
          }
        }
        parts.push('}}');

        const blob = new Blob(parts, {type:'application/json'});
        const filename = 'moje-stavba-zaloha-' + msTodayIso() + (withMedia?'-plna':'-data') + '.json';
        // (30.8.2026) stejna oprava jako u PDF - appka na telefonu
        // "stazeni" pres <a download> neumi, potrebuje skutecny zapis
        // + systemove okno Sdilet/Ulozit.
        let ulozenoNativne = false;
        if(typeof msJeNativniAppka === 'function' && msJeNativniAppka()){
          ulozenoNativne = await msNativniUlozitASdilet(blob, filename, {title: filename, dialogTitle:'Uložit zálohu'});
        }
        if(!ulozenoNativne){
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
        row.innerHTML = originalHtml;

        const ted = new Date().toISOString();
        try{ localStorage.setItem(LAST_BACKUP_KEY, ted); }catch(e){}
        const lastEl = container.querySelector('#lastBackupText');
        if(lastEl) lastEl.textContent = formatDatumCas(ted);

        alert((ulozenoNativne ? 'Záloha je připravená (' : 'Záloha je stažená (') + (blob.size/1024/1024).toFixed(1) + ' MB).' +
              (withMedia ? '' : '\n\nPozor: fotky ani dokumenty v ní nejsou.'));
      }catch(err){
        console.error('export selhal', err);
        row.innerHTML = originalHtml;
        alert('Zálohu se nepodařilo vytvořit. Pokud máš hodně fotek, zkus to znovu bez nich.');
      }
    });

    container.querySelector('#rowImport').addEventListener('click', ()=> container.querySelector('#importFile').click());
    container.querySelector('#importFile').addEventListener('change', (e)=>{
      const file = e.target.files[0]; if(!file) return;
      e.target.value = '';
      // Sdilena logika (layout.js, msRunBackupImportFlow) - stejnou
      // pouziva i obnova z onboardingu, at se casem neroztrhnou.
      const row = container.querySelector('#rowImport');
      const rowHtml = row ? row.innerHTML : '';
      msRunBackupImportFlow(file, {
        onProgress: (text)=>{ if(row) row.innerHTML = `<b style="font-size:12.5px">${text}</b>`; }
      }).finally(()=>{ if(row) row.innerHTML = rowHtml; });
    });
  }
  return { render };
})();
Router.register('backup', BackupScreen);
