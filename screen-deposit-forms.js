/* ==========================================================
   FORMULARE PRO ZALOHY  (4.9.2026)
   - deposit-add  : nova zaloha u dodavatele
   - deposit-draw : odpis odberu ze zalohy

   Datum i vyber etapy jsou postavene stejne jako ve formulari
   vydaje (screen-forms.js) - primy prepis + mini kalendar.
   ========================================================== */

const MS_DEP_MONTHS = ['Leden','Únor','Březen','Duben','Květen','Červen','Červenec','Srpen','Září','Říjen','Listopad','Prosinec'];

function msDepFormatDateCz(d){ return `${d.getDate()}. ${d.getMonth()+1}. ${d.getFullYear()}`; }
function msDepIso(d){
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function msDepKc(n){ return Number(n||0).toLocaleString('cs-CZ') + ' Kč'; }

/* Spolecny blok "datum + mini kalendar". Vraci getter na vybrane datum. */
function msDepBindDate(container, initialIso){
  let selected = initialIso ? new Date(initialIso+'T00:00:00') : new Date();
  if(isNaN(selected)) selected = new Date();
  const input = container.querySelector('#fDate');
  const miniCal = container.querySelector('#miniCal');
  let y = selected.getFullYear(), m = selected.getMonth();
  input.value = msDepFormatDateCz(selected);

  function draw(){
    container.querySelector('#mcLabel').textContent = MS_DEP_MONTHS[m] + ' ' + y;
    const grid = container.querySelector('#mcGrid');
    grid.innerHTML = '';
    const first = new Date(y, m, 1);
    let start = first.getDay(); start = start===0?6:start-1;
    const dnu = new Date(y, m+1, 0).getDate();
    for(let i=0;i<start;i++) grid.appendChild(document.createElement('div'));
    for(let d=1; d<=dnu; d++){
      const sel = selected.getFullYear()===y && selected.getMonth()===m && selected.getDate()===d;
      const cell = document.createElement('div');
      cell.style.cssText = `height:26px;display:flex;align-items:center;justify-content:center;font-size:10px;cursor:pointer;border-radius:var(--radius);background:${sel?'#b34cff':'transparent'};color:${sel?'#fff':'#c7cee6'}`;
      cell.textContent = d;
      cell.addEventListener('click', ()=>{
        selected = new Date(y, m, d);
        input.value = msDepFormatDateCz(selected);
        draw();
        miniCal.style.maxHeight = '0';
      });
      grid.appendChild(cell);
    }
  }
  container.querySelector('#mcPrev').addEventListener('click', ()=>{ m--; if(m<0){m=11;y--;} draw(); });
  container.querySelector('#mcNext').addEventListener('click', ()=>{ m++; if(m>11){m=0;y++;} draw(); });
  container.querySelector('#calToggleBtn').addEventListener('click', ()=>{
    const open = miniCal.style.maxHeight !== '0px' && miniCal.style.maxHeight !== '';
    miniCal.style.maxHeight = open ? '0' : '280px';
    if(!open) draw();
  });
  input.addEventListener('change', (e)=>{
    const r = e.target.value.trim().match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})$/);
    if(r){ selected = new Date(Number(r[3]), Number(r[2])-1, Number(r[1])); y=selected.getFullYear(); m=selected.getMonth(); draw(); }
  });
  return ()=> msDepIso(selected);
}

function msDepDateBlockHtml(label){
  return `
    <p class="f-label">${label || 'Datum'}</p>
    <div style="display:flex;gap:8px">
      <input class="f-input" id="fDate" value="" style="flex:1"/>
      <div class="icon-btn" id="calToggleBtn" style="flex:0 0 auto"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="1"/><path d="M8 3v4M16 3v4M3 10h18"/></svg></div>
    </div>
    <div id="miniCal" style="max-height:0;overflow:hidden;transition:max-height .2s ease;margin-bottom:12px">
      <div style="border:1px solid var(--line);background:var(--card-bg-2);border-radius:var(--radius);padding:10px;margin-top:8px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <b id="mcLabel" style="font-size:12px"></b>
          <div style="display:flex;gap:6px">
            <button id="mcPrev" style="width:24px;height:24px;border:1px solid var(--line);background:transparent;color:#fff;cursor:pointer">‹</button>
            <button id="mcNext" style="width:24px;height:24px;border:1px solid var(--line);background:transparent;color:#fff;cursor:pointer">›</button>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);margin-bottom:4px">
          ${['Po','Út','St','Čt','Pá','So','Ne'].map(d=>`<span style="text-align:center;font-size:8.5px;color:var(--muted);font-weight:800">${d}</span>`).join('')}
        </div>
        <div id="mcGrid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px"></div>
      </div>
    </div>`;
}


/* ---------- NOVA ZALOHA ---------- */
const DepositAddScreen = (function(){
  function render(container){
    container.innerHTML = `
      <div class="topbar form-v2-topbar">
        <div class="back-btn" id="backBtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></div>
        <div class="form-v2-title"><p>Finance</p><h1>Nová záloha</h1></div>
      </div>
      <div class="screen-scroll form-v2-scroll">
        <p style="margin:0 0 14px;font-size:10.5px;color:var(--muted);line-height:1.55;border:1px solid var(--line);padding:11px">
          Záloha jsou peníze, které jsi dodavateli poslal dopředu. Od zůstatku se odečtou hned,
          protože z účtu už odešly. Do etap se rozdělí až tím, jak z ní budeš odepisovat odběry.</p>

        <p class="f-label">Částka zálohy</p>
        <div class="form-v2-amount" style="display:flex;align-items:baseline;gap:8px;border:1px solid var(--accent);padding:9px 12px;margin-bottom:12px">
          <input id="fAmount" value="" inputmode="numeric" pattern="[0-9]*" placeholder="0" style="border:0;background:transparent;color:var(--accent);font-size:22px;font-weight:800;width:100%;font:inherit;outline:none"/><span style="color:var(--accent);font-weight:800">Kč</span>
        </div>

        <p class="f-label">Popis</p>
        <input class="f-input" id="fTitle" value="" placeholder="Např. Záloha na materiál" style="margin-bottom:12px"/>

        <p class="f-label">Dodavatel</p>
        <input class="f-input" id="fSupplier" value="" placeholder="Např. Stavebniny Novák" style="margin-bottom:12px"/>

        ${msDepDateBlockHtml('Datum zaplacení')}
      </div>
      <div class="form-v2-footer">
        <button class="btn-primary" id="saveBtn" style="border-color:var(--accent)">Uložit zálohu</button>
      </div>
    `;
    if(typeof MsFormUi !== 'undefined' && MsFormUi.bind) MsFormUi.bind(container);
    container.querySelector('#backBtn').addEventListener('click', ()=> Router.back());
    const getDate = msDepBindDate(container, msTodayISO());

    const amount = container.querySelector('#fAmount');
    amount.addEventListener('blur', ()=>{
      const v = msParseCastka(amount.value);
      if(v>0) amount.value = new Intl.NumberFormat('cs-CZ',{maximumFractionDigits:2}).format(v);
    });

    container.querySelector('#saveBtn').addEventListener('click', ()=>{
      if(typeof msCanAddContent === 'function' && !msCanAddContent()){
        Router.go('paywall', { reason:'trial-expired' });
        return;
      }
      const castka = msParseCastka(container.querySelector('#fAmount').value);
      if(!(castka > 0)){ Layout.alertDialog('Zadej částku zálohy.', 'Nová záloha'); return; }
      const nazev = container.querySelector('#fTitle').value.trim();
      const dodavatel = container.querySelector('#fSupplier').value.trim();

      msAddDeposit({
        title: nazev || (dodavatel ? 'Záloha — ' + dodavatel : 'Záloha'),
        amount: castka,
        supplier: dodavatel,
        date: getDate()
      });
      if(Layout.showSuccess) Layout.showSuccess('Záloha uložena');
      Router.go('deposits');
    });

    return { showNav:false };
  }
  return { render };
})();
Router.register('deposit-add', DepositAddScreen);


/* ---------- ODBER ZE ZALOHY ---------- */
const DepositDrawScreen = (function(){
  function render(container, params){
    const id = params && params.id;
    const s = msDepositSummary(id);
    if(!s){ Router.go('deposits'); return { showNav:false }; }

    let stageKey = msGetCurrentStage();

    container.innerHTML = `
      <div class="topbar form-v2-topbar">
        <div class="back-btn" id="backBtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></div>
        <div class="form-v2-title"><p>${msEsc(s.deposit.title || 'Záloha')}</p><h1>Odběr ze zálohy</h1></div>
      </div>
      <div class="screen-scroll form-v2-scroll">
        <p style="margin:0 0 14px;font-size:11px;color:var(--muted);line-height:1.55;border:1px solid var(--line);padding:11px">
          V záloze zbývá <b style="color:var(--text-main)">${msDepKc(s.remaining)}</b>.
          Odběr peníze neodečítá znovu — jen říká, do které etapy už zaplacená částka patří.</p>

        <p class="f-label">Částka odběru</p>
        <div class="form-v2-amount" style="display:flex;align-items:baseline;gap:8px;border:1px solid #ff7a86;padding:9px 12px;margin-bottom:6px">
          <input id="fAmount" value="" inputmode="numeric" pattern="[0-9]*" placeholder="0" style="border:0;background:transparent;color:#ff9aa3;font-size:22px;font-weight:800;width:100%;font:inherit;outline:none"/><span style="color:#ff9aa3;font-weight:800">Kč</span>
        </div>
        <p id="overHint" style="display:none;margin:0 0 12px;font-size:10.5px;color:#ff9b32;line-height:1.5"></p>

        <p class="f-label">Co jsi odebral</p>
        <input class="f-input" id="fTitle" value="" placeholder="Např. 20 pytlů cementu" style="margin-bottom:12px"/>

        <p class="f-label">Etapa</p>
        <div class="dropdown" id="stageDropdown" style="margin-bottom:12px">
          <button class="dd-btn" id="stageDdBtn"><span class="left"><i id="stageDdDot"></i><span id="stageDdLabel">—</span></span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></button>
          <div class="dd-panel" id="stageDdPanel" data-sheet-title="Zařadit do etapy"></div>
        </div>

        ${msDepDateBlockHtml('Datum odběru')}

        <p class="f-label">Poznámka</p>
        <textarea class="f-input" id="fNote" rows="2" placeholder="Nepovinné" style="margin-bottom:12px;resize:vertical"></textarea>
      </div>
      <div class="form-v2-footer">
        <button class="btn-primary" id="saveBtn" style="border-color:#ff7a86">Odepsat ze zálohy</button>
      </div>
    `;
    if(typeof MsFormUi !== 'undefined' && MsFormUi.bind) MsFormUi.bind(container);
    container.querySelector('#backBtn').addEventListener('click', ()=> Router.back());
    const getDate = msDepBindDate(container, msTodayISO());

    /* Vyber etapy - stejny vzor jako u vydaje. */
    const ddBtn = container.querySelector('#stageDdBtn');
    const ddPanel = container.querySelector('#stageDdPanel');
    const etapy = msSelectedStages();
    etapy.forEach(st=>{
      const it = document.createElement('div');
      it.className = 'dd-item';
      it.innerHTML = `<i style="background:${st.color};display:inline-block;width:7px;height:7px;margin-right:8px"></i>${msEsc(st.name)}`;
      it.addEventListener('click', ()=>{
        stageKey = st.key;
        container.querySelector('#stageDdLabel').textContent = st.name;
        container.querySelector('#stageDdDot').style.background = st.color;
        ddPanel.classList.remove('open');
      });
      ddPanel.appendChild(it);
    });
    ddBtn.addEventListener('click', ()=> ddPanel.classList.toggle('open'));
    const prvni = msStageByKey(stageKey) || etapy[0];
    if(prvni){
      stageKey = prvni.key;
      container.querySelector('#stageDdLabel').textContent = prvni.name;
      container.querySelector('#stageDdDot').style.background = prvni.color;
    }

    /* Upozorneni na precerpani se ukazuje UZ PRI PSANI, ne az po ulozeni -
       rozdeleni na vydaj + nedoplatek by jinak bylo prekvapeni. */
    const amount = container.querySelector('#fAmount');
    const hint = container.querySelector('#overHint');
    /* Zalohu nejde precerpat, tak to rekneme uz pri psani castky -
       ne az po klepnuti na Ulozit. */
    function prepocti(){
      const v = msParseCastka(amount.value);
      const zbyva = msDepositRemaining(id);
      const pres = v > 0 && v > zbyva;
      hint.style.display = pres ? 'block' : 'none';
      if(pres){
        hint.textContent = 'V záloze zbývá jen ' + msDepKc(zbyva)
          + '. Zálohu nejde přečerpat — buď sniž částku, nebo zálohu nejdřív navyš.';
      }
      const btn = container.querySelector('#saveBtn');
      if(btn){
        btn.disabled = pres;
        btn.style.opacity = pres ? '.45' : '1';
      }
    }
    amount.addEventListener('input', prepocti);
    amount.addEventListener('blur', ()=>{
      const v = msParseCastka(amount.value);
      if(v>0) amount.value = new Intl.NumberFormat('cs-CZ',{maximumFractionDigits:2}).format(v);
      prepocti();
    });

    container.querySelector('#saveBtn').addEventListener('click', ()=>{
      if(typeof msCanAddContent === 'function' && !msCanAddContent()){
        Router.go('paywall', { reason:'trial-expired' });
        return;
      }
      const castka = msParseCastka(container.querySelector('#fAmount').value);
      if(!(castka > 0)){ Layout.alertDialog('Zadej částku odběru.', 'Odběr ze zálohy'); return; }

      const vysledek = msAddDepositDraw(id, {
        title: container.querySelector('#fTitle').value.trim() || 'Odběr',
        amount: castka,
        stage: stageKey,
        date: getDate(),
        note: container.querySelector('#fNote').value.trim()
      });

      if(!vysledek || !vysledek.ok){
        if(vysledek && vysledek.duvod === 'prekroceno'){
          Layout.alertDialog('V záloze zbývá jen ' + msDepKc(vysledek.zbyva)
            + '. Sniž částku, nebo zálohu nejdřív navyš v jejím detailu.', 'Odběr ze zálohy');
        }else{
          Layout.alertDialog('Odběr se nepodařilo uložit.', 'Odběr ze zálohy');
        }
        return;
      }

      if(Layout.showSuccess) Layout.showSuccess('Odepsáno ze zálohy');
      Router.go('deposit-detail', {id: id});
    });

    return { showNav:false };
  }
  return { render };
})();
Router.register('deposit-draw', DepositDrawScreen);
