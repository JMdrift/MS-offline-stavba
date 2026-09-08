/* ==========================================================
   ZALOHY U DODAVATELE  (4.9.2026)

   Seznam zaloh + detail s rozpisem odberu.
   Vypocty jsou v data.js (msDeposit*), tady je jen zobrazeni.

   Pripominka k tomu, co se snadno splete:
   V seznamu se u zalohy ukazuje NEROZUCTOVANY ZBYTEK, ne puvodni
   castka. Zaloha 100 000 s odberem za 4 000 tedy sviti 96 000 -
   a tech 4 000 uz je videt jako samostatny vydaj u sve etapy.
   Dohromady to porad dela 100 000, nic se nepocita dvakrat.
   ========================================================== */
const DepositsScreen = (function(){

  function kc(n){ return Number(n||0).toLocaleString('cs-CZ') + ' Kč'; }
  function den(iso){
    if(!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    if(isNaN(d)) return iso;
    return d.getDate() + '. ' + (d.getMonth()+1) + '. ' + d.getFullYear();
  }

  function render(container){
    container.classList.add('ms-ui-screen');
    container.innerHTML = `
      <div class="topbar ms-ui-topbar">
        <div class="back-btn" id="backBtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></div>
        <div class="ms-ui-title"><p>FINANCE</p><h1>Zálohy</h1></div>
        <div class="icon-btn" id="addBtn"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></div>
      </div>
      <div class="screen-scroll">
        <div id="depSummary"></div>
        <div id="depList"></div>
      </div>
    `;
    container.querySelector('#backBtn').addEventListener('click', ()=> Router.back());
    const addBtn = container.querySelector('#addBtn');
    if(!msCanAddContent()){
      addBtn.addEventListener('click', ()=> Router.go('paywall', {reason:'locked'}));
    }else{
      addBtn.addEventListener('click', ()=> Router.go('deposit-add'));
    }

    draw();

    function draw(){
      const vse = msDeposits();
      const otevrene = vse.filter(d=>!d.depositClosed);
      const uzavrene = vse.filter(d=>d.depositClosed);
      const zbyva = msTotalDepositsRemaining();

      const sum = container.querySelector('#depSummary');
      sum.innerHTML = vse.length ? `
        <section style="border:1px solid var(--line);border-left:3px solid var(--accent);padding:16px;margin-bottom:12px">
          <p style="margin:0 0 2px;font-size:9px;font-weight:800;letter-spacing:.14em;color:var(--muted)">NEROZÚČTOVÁNO</p>
          <strong style="display:block;font-size:26px;font-weight:800">${kc(zbyva)}</strong>
          <p style="margin:6px 0 0;font-size:10.5px;color:var(--muted);line-height:1.5">
            Peníze, které už jsi zaplatil, ale ještě nevíš, do které etapy patří.
            Odečítají se ze zůstatku hned, protože z účtu už odešly.</p>
        </section>` : '';

      const list = container.querySelector('#depList');
      if(!vse.length){
        list.innerHTML = msEmptyState({kind:'empty', title:'Zatím žádná záloha',
          text:'Když pošleš dodavateli peníze dopředu, založ si zálohu. Pak z ní budeš odepisovat jednotlivé odběry materiálu.'});
        return;
      }

      list.innerHTML =
        radky('AKTIVNÍ', otevrene) +
        (uzavrene.length ? radky('UZAVŘENÉ', uzavrene) : '');

      list.querySelectorAll('[data-dep]').forEach(el=>{
        el.addEventListener('click', ()=> Router.go('deposit-detail', {id: el.dataset.dep}));
      });
    }

    function radky(nadpis, pole){
      if(!pole.length) return '';
      return `<p style="margin:14px 0 6px;font-size:9px;font-weight:800;letter-spacing:.14em;color:var(--muted)">${nadpis}</p>` +
        pole.map(d=>{
          const s = msDepositSummary(d.id);
          const podil = s.total > 0 ? Math.min(100, Math.round(s.drawn / s.total * 100)) : 0;
          return `
          <div data-dep="${d.id}" style="border:1px solid var(--line);padding:14px;margin-bottom:8px;cursor:pointer">
            <div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline">
              <b style="font-size:13.5px">${msEsc(d.title || 'Záloha')}</b>
              <span style="font-size:15px;font-weight:800;white-space:nowrap">${kc(s.remaining)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;gap:10px;margin-top:2px">
              <small style="font-size:10.5px;color:var(--muted)">${msEsc(d.supplier || '')}${d.supplier?' · ':''}${den(d.date)}</small>
              <small style="font-size:10px;color:var(--muted)">z ${kc(s.total)}</small>
            </div>
            <div style="height:3px;background:var(--line);margin-top:9px">
              <div style="height:3px;width:${podil}%;background:var(--accent)"></div>
            </div>
            <small style="display:block;margin-top:6px;font-size:10px;color:var(--muted)">
              ${s.draws.length ? s.draws.length + (s.draws.length===1?' odběr':(s.draws.length<5?' odběry':' odběrů')) + ' · odebráno ' + kc(s.drawn) : 'Zatím bez odběrů'}
              ${d.depositClosed ? ' · uzavřeno' + (d.depositClosedMode==='refunded' ? ', vráceno' : ', zůstatek u dodavatele') : ''}
            </small>
          </div>`;
        }).join('');
    }

    return { showNav:true };
  }
  return { render };
})();
Router.register('deposits', DepositsScreen);


/* ---------- DETAIL ZALOHY ---------- */
const DepositDetailScreen = (function(){

  function kc(n){ return Number(n||0).toLocaleString('cs-CZ') + ' Kč'; }
  function den(iso){
    if(!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    if(isNaN(d)) return iso;
    return d.getDate() + '. ' + (d.getMonth()+1) + '. ' + d.getFullYear();
  }

  function render(container, params){
    const id = params && params.id;
    const s = msDepositSummary(id);
    if(!s){ Router.go('deposits'); return { showNav:true }; }

    container.classList.add('ms-ui-screen');
    container.innerHTML = `
      <div class="topbar ms-ui-topbar">
        <div class="back-btn" id="backBtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></div>
        <div class="ms-ui-title"><p>ZÁLOHA</p><h1 id="depTitle"></h1></div>
      </div>
      <div class="screen-scroll" id="depBody"></div>
    `;
    container.querySelector('#backBtn').addEventListener('click', ()=> Router.go('deposits'));
    container.querySelector('#depTitle').textContent = s.deposit.title || 'Záloha';

    draw();

    function draw(){
      const sum = msDepositSummary(id);
      const body = container.querySelector('#depBody');
      const podil = sum.total > 0 ? Math.min(100, Math.round(sum.drawn / sum.total * 100)) : 0;

      body.innerHTML = `
        <section style="border:1px solid var(--line);border-left:3px solid var(--accent);padding:16px;margin-bottom:12px">
          <p style="margin:0 0 2px;font-size:9px;font-weight:800;letter-spacing:.14em;color:var(--muted)">ZBÝVÁ ROZÚČTOVAT</p>
          <strong style="display:block;font-size:28px;font-weight:800">${kc(sum.remaining)}</strong>
          <div style="height:3px;background:var(--line);margin:10px 0 8px">
            <div style="height:3px;width:${podil}%;background:var(--accent)"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted)">
            <span>Zaplaceno dopředu <b style="color:var(--text-main)">${kc(sum.total)}</b></span>
            <span>Odebráno <b style="color:var(--text-main)">${kc(sum.drawn)}</b></span>
          </div>
          ${sum.deposit.supplier ? `<p style="margin:8px 0 0;font-size:10.5px;color:var(--muted)">${msEsc(sum.deposit.supplier)} · ${den(sum.deposit.date)}</p>` : `<p style="margin:8px 0 0;font-size:10.5px;color:var(--muted)">${den(sum.deposit.date)}</p>`}
        </section>

        ${!sum.closed ? `
        <button id="drawBtn" class="btn-primary" style="width:100%;margin-bottom:8px">Odepsat odběr ze zálohy</button>
        <button id="topUpBtn" style="width:100%;padding:12px;border:1px solid var(--accent);background:transparent;color:var(--accent);font-family:inherit;font-weight:800;font-size:12px;cursor:pointer;margin-bottom:8px">Navýšit zálohu</button>
        <button id="closeBtn" style="width:100%;padding:12px;border:1px solid var(--line);background:transparent;color:var(--muted);font-family:inherit;font-size:12px;cursor:pointer;margin-bottom:14px">Uzavřít zálohu</button>
        ` : `
        <p style="border:1px solid var(--line);padding:12px;margin-bottom:14px;font-size:11px;color:var(--muted);line-height:1.5">
          Záloha je uzavřená${sum.closedMode==='refunded' ? ' a zbytek ti dodavatel vrátil — vratka je mezi vklady.' : '. Zbytek zůstal u dodavatele jako kredit.'}</p>`}

        ${(sum.topUps && sum.topUps.length) ? `
        <p style="margin:0 0 6px;font-size:9px;font-weight:800;letter-spacing:.14em;color:var(--muted)">NAVÝŠENÍ ZÁLOHY</p>
        <div style="margin-bottom:14px">
          ${sum.topUps.map(t=>`<div style="display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-top:1px solid var(--line)">
            <small style="font-size:11px;color:var(--muted)">${den(t.date)}</small>
            <span style="font-size:12.5px;font-weight:700">+ ${kc(t.amount)}</span></div>`).join('')}
        </div>` : ''}

        <p style="margin:0 0 6px;font-size:9px;font-weight:800;letter-spacing:.14em;color:var(--muted)">ODEBRÁNO ZE ZÁLOHY</p>
        <div id="drawList"></div>
      `;

      const dl = body.querySelector('#drawList');
      if(!sum.draws.length){
        dl.innerHTML = `<p style="border:1px dashed var(--line);padding:16px;text-align:center;font-size:11px;color:var(--muted);margin:0">
          Zatím nic. Až si něco odvezeš, odepiš to tady — přiřadí se to k etapě jako běžný výdaj.</p>`;
      }else{
        dl.innerHTML = sum.draws.map((t,i)=>{
          const st = msStageByKey(t.stage);
          return `<div style="display:flex;justify-content:space-between;gap:10px;padding:10px 0;border-top:1px solid var(--line)">
            <div style="min-width:0">
              <b style="display:block;font-size:12.5px">${msEsc(t.title || 'Odběr')}</b>
              <small style="font-size:10px;color:var(--muted)">${den(t.date)}${st ? ' · ' + msEsc(st.name) : ''}</small>
            </div>
            <span style="font-size:13px;font-weight:700;white-space:nowrap">${kc(t.amount)}</span>
          </div>`;
        }).join('');
      }

      const drawBtn = body.querySelector('#drawBtn');
      if(drawBtn) drawBtn.addEventListener('click', ()=>{
        if(!msCanAddContent()){ Router.go('paywall', {reason:'locked'}); return; }
        Router.go('deposit-draw', {id: id});
      });

      const closeBtn = body.querySelector('#closeBtn');
      if(closeBtn) closeBtn.addEventListener('click', ()=> zavrit(sum));

      const topUpBtn = body.querySelector('#topUpBtn');
      if(topUpBtn) topUpBtn.addEventListener('click', ()=> navysit());
    }

    /* Navyseni zalohy = poslal jsi dodavateli dalsi penize. Nezaklada
       novy vydaj - do celkovych vydaju se dostane pres zbytek zalohy,
       stejne jako puvodni castka. */
    function navysit(){
      const ov = document.createElement('div');
      ov.className = 'ms-overlay';
      ov.innerHTML = `
        <div class="ms-sheet" style="padding:18px">
          <b style="display:block;font-size:14px;margin-bottom:4px">Navýšit zálohu</b>
          <p style="margin:0 0 12px;font-size:10.5px;color:var(--muted);line-height:1.5">
            Poslal jsi dodavateli další peníze. Přičtou se k záloze —
            nevznikne nový výdaj, protože záloha se do výdajů počítá celá už teď.</p>
          <div style="display:flex;align-items:baseline;gap:8px;border:1px solid var(--accent);padding:9px 12px;margin-bottom:14px">
            <input id="topUpAmount" inputmode="numeric" placeholder="0" style="border:0;background:transparent;color:var(--accent);font-size:22px;font-weight:800;width:100%;font:inherit;outline:none"/><span style="color:var(--accent);font-weight:800">Kč</span>
          </div>
          <button id="topUpOk" class="btn-primary" style="width:100%;border-color:var(--accent);margin-bottom:8px">Navýšit</button>
          <button id="topUpCancel" style="width:100%;padding:11px;border:1px solid var(--line);background:transparent;color:var(--muted);font-family:inherit;font-size:12px;cursor:pointer">Zrušit</button>
        </div>`;
      document.body.appendChild(ov);
      const zavri = ()=>{ if(ov.parentNode) ov.parentNode.removeChild(ov); };
      ov.addEventListener('click', e=>{ if(e.target===ov) zavri(); });
      ov.querySelector('#topUpCancel').addEventListener('click', zavri);
      const input = ov.querySelector('#topUpAmount');
      setTimeout(()=>{ try{ input.focus(); }catch(e){} }, 60);
      ov.querySelector('#topUpOk').addEventListener('click', ()=>{
        const c = msParseCastka(input.value);
        if(!(c > 0)){ Layout.alertDialog('Zadej částku.', 'Navýšit zálohu'); return; }
        msTopUpDeposit(id, c);
        zavri();
        if(Layout.showSuccess) Layout.showSuccess('Záloha navýšena');
        draw();
      });
    }

    async function zavrit(sum){
      if(sum.remaining <= 0){
        const ok = await Layout.confirmDialog('Záloha je celá rozúčtovaná. Uzavřít ji?', 'Uzavřít', 'Zpět');
        if(!ok) return;
        msCloseDeposit(id, 'kept');
        if(Layout.showSuccess) Layout.showSuccess('Záloha uzavřena');
        draw();
        return;
      }
      /* Zbyva nerozuctovana cast - musime vedet, jestli se penize
         vratily na ucet, nebo zustaly u dodavatele. Na zustatku je
         v tom rozdil, proto se to nesmi hadat. */
      const vraceno = await Layout.confirmDialog(
        'V záloze zbývá ' + kc(sum.remaining) + '.\n\n'
        + 'Vrátil ti dodavatel tyhle peníze zpátky?\n\n'
        + 'Vráceno = založí se vklad a zůstatek se srovná.\n'
        + 'Zůstává u něj = peníze zůstanou vedené jako utracené.',
        'Vráceno na účet', 'Zůstává u dodavatele');
      msCloseDeposit(id, vraceno ? 'refunded' : 'kept');
      if(Layout.showSuccess) Layout.showSuccess('Záloha uzavřena');
      draw();
    }

    return { showNav:true };
  }
  return { render };
})();
Router.register('deposit-detail', DepositDetailScreen);
