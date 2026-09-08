/* ==========================================================
   VSECHNY TRANSAKCE - seznam + sbalitelny kalendarni filtr podle dne
   ========================================================== */
const TransactionsScreen = (function(){
  const MONTHS = ['Leden','Únor','Březen','Duben','Květen','Červen','Červenec','Srpen','Září','Říjen','Listopad','Prosinec'];

  function render(container, params){
    let showExpense = params.expense !== '0';
    let showIncome = params.income === '1';
    let showPlanned = params.planned === '1';
    const stageFilter = params.stage || null;
    /* (4.9.2026) Filtr podle data umi dva rezimy:
       'day'   - jeden konkretni den (puvodni chovani)
       'range' - obdobi od-do, prvni klepnuti urci zacatek, druhe konec
       Rezim se prepina tlacitkem nad kalendarem. */
    let dateMode = 'day';
    let selectedDate = null;
    let rangeFrom = null, rangeTo = null;
    const today = new Date();
    let viewYear = today.getFullYear(), viewMonth = today.getMonth();

    let labelParts = [];
    if(showExpense) labelParts.push('výdaje');
    if(showIncome) labelParts.push('vklady');
    if(stageFilter){ const s = msStageByKey(stageFilter); if(s) labelParts.push(s.name); }

    container.classList.add('ms-ui-screen','transactions-v2-screen');

    container.innerHTML = `
      <div class="topbar ms-ui-topbar">
        <div class="back-btn" id="backBtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></div>
        <div class="ms-ui-title"><p>Finance</p><h1>Všechny transakce</h1></div>
      </div>
      <div class="screen-scroll">
        <div id="typeFilterRow" class="ms-ui-filter-grid">
          <button class="tf-chip ms-ui-filter ms-kind-danger" data-t="expense">Výdaje</button>
          <button class="tf-chip ms-ui-filter ms-kind-undated" data-t="income">Vklady</button>
          <button class="tf-chip ms-ui-filter ms-kind-planned" data-t="planned">Plánované</button>
        </div>
        <button id="calToggleBtn" class="ms-ui-collapsible transactions-v2-calendar-toggle">
          <span class="ms-ui-icon ms-kind-date"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16"/><path d="M8 3v4M16 3v4M3 10h18"/></svg></span>
          <div><b>Filtrovat podle data</b><small id="dateFilterLabel">Všechny dny${labelParts.length?' · '+msEsc(labelParts.join(' + ')):''}</small></div>
          <svg class="ms-ui-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M9 6l6 6-6 6"/></svg>
        </button>
        <div id="miniCalWrap" style="max-height:0;overflow:hidden;transition:max-height .2s ease">
          <div style="border:1px solid var(--line);background:var(--card-bg-2);border-radius:var(--radius);padding:10px;margin-bottom:8px">
            <div id="dateModeToggle" class="form-v2-segment" style="grid-template-columns:1fr 1fr;margin-bottom:10px">
              <button data-m="day" type="button" style="height:32px;border:1px solid var(--accent);color:var(--accent);background:color-mix(in srgb,var(--accent) 8%,transparent);font-weight:800;cursor:pointer;font-size:11px">Konkrétní den</button>
              <button data-m="range" type="button" style="height:32px;border:1px solid var(--line);color:var(--muted);background:transparent;font-weight:800;cursor:pointer;font-size:11px">Období od–do</button>
            </div>
            <p id="rangeHint" style="display:none;margin:0 0 8px;font-size:10px;color:var(--muted);line-height:1.45"></p>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
              <b id="calMonthLabel" style="font-size:12px"></b>
              <div style="display:flex;gap:6px">
                <button id="calPrev" style="width:24px;height:24px;border:1px solid var(--line);background:transparent;color:#fff;cursor:pointer">‹</button>
                <button id="calNext" style="width:24px;height:24px;border:1px solid var(--line);background:transparent;color:#fff;cursor:pointer">›</button>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(7,1fr);margin-bottom:4px">
              ${['Po','Út','St','Čt','Pá','So','Ne'].map(d=>`<span style="text-align:center;font-size:8.5px;color:var(--muted);font-weight:800">${d}</span>`).join('')}
            </div>
            <div id="calGrid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px"></div>
            <p id="clearDay" style="display:none;text-align:center;font-size:10.5px;color:var(--accent);margin:8px 0 0;cursor:pointer">Zrušit výběr ✕</p>
          </div>
        </div>
        <div id="txList"></div>
      </div>
    `;
    container.querySelector('#backBtn').addEventListener('click', ()=> Router.back());

    const miniCalWrap = container.querySelector('#miniCalWrap');
    container.querySelector('#calToggleBtn').addEventListener('click', ()=>{
      const isOpen = miniCalWrap.style.maxHeight !== '0px' && miniCalWrap.style.maxHeight !== '';
      miniCalWrap.style.maxHeight = isOpen ? '0' : '320px';
      if(!isOpen) renderCalendar();
    });

    function getFilteredTx(){
      return msExpenses().filter(t=>{
        if(stageFilter && t.stage!==stageFilter) return false;
        if(t.type==='expense') return showExpense;
        if(t.type==='income') return showIncome;
        if(t.type==='planned') return showPlanned && !t.planClosed;
        return false;
      });
    }
    function txOnDay(iso){ return getFilteredTx().filter(t=>t.date===iso); }

    function refreshChips(){
      container.querySelectorAll('.tf-chip').forEach(chip=>{
        const t = chip.dataset.t;
        const active = (t==='expense'&&showExpense) || (t==='income'&&showIncome) || (t==='planned'&&showPlanned);
        const color = t==='expense'?'#ff7a86':(t==='income'?'#4dffab':'#ff9b32');
        chip.classList.toggle('is-active', active);
      });
    }
    container.querySelectorAll('.tf-chip').forEach(chip=>{
      chip.addEventListener('click', ()=>{
        const t = chip.dataset.t;
        if(t==='expense') showExpense = !showExpense;
        else if(t==='income') showIncome = !showIncome;
        else showPlanned = !showPlanned;
        refreshChips(); renderCalendar(); renderList();
      });
    });
    refreshChips();

    /* Spada datum do aktualniho filtru? Prazdny filtr = vse. */
    function vFiltru(iso){
      if(dateMode === 'day') return !selectedDate || iso === selectedDate;
      if(!rangeFrom) return true;
      const konec = rangeTo || rangeFrom;
      return iso >= rangeFrom && iso <= konec;
    }
    function cz(iso){ return iso ? iso.split('-').reverse().join('. ') : ''; }
    function popisFiltru(){
      if(dateMode === 'day') return selectedDate ? 'Vybráno ' + cz(selectedDate) : null;
      if(!rangeFrom) return null;
      if(!rangeTo) return 'Od ' + cz(rangeFrom) + ' — vyber konec';
      return cz(rangeFrom) + ' – ' + cz(rangeTo);
    }
    function jeVybrany(iso){
      if(dateMode === 'day') return iso === selectedDate;
      if(!rangeFrom) return false;
      if(!rangeTo) return iso === rangeFrom;
      return iso >= rangeFrom && iso <= rangeTo;
    }
    function jeKraj(iso){
      return dateMode === 'range' && (iso === rangeFrom || iso === rangeTo);
    }
    function vyberDen(iso){
      if(dateMode === 'day'){
        selectedDate = (selectedDate === iso) ? null : iso;
        return;
      }
      // Rozsah: prvni klepnuti = zacatek, druhe = konec, treti zacina znovu.
      if(!rangeFrom || (rangeFrom && rangeTo)){ rangeFrom = iso; rangeTo = null; return; }
      if(iso < rangeFrom){ rangeTo = rangeFrom; rangeFrom = iso; }
      else rangeTo = iso;
    }
    function zrusVyber(){ selectedDate = null; rangeFrom = null; rangeTo = null; }

    container.querySelectorAll('#dateModeToggle button').forEach(b=>{
      b.addEventListener('click', ()=>{
        if(dateMode === b.dataset.m) return;
        dateMode = b.dataset.m;
        zrusVyber();
        container.querySelectorAll('#dateModeToggle button').forEach(x=>{
          const aktivni = x.dataset.m === dateMode;
          x.style.borderColor = aktivni ? 'var(--accent)' : 'var(--line)';
          x.style.color = aktivni ? 'var(--accent)' : 'var(--muted)';
          x.style.background = aktivni ? 'color-mix(in srgb,var(--accent) 8%,transparent)' : 'transparent';
        });
        renderCalendar(); renderList();
      });
    });

    function renderCalendar(){
      container.querySelector('#calMonthLabel').textContent = MONTHS[viewMonth] + ' ' + viewYear;
      const grid = container.querySelector('#calGrid');
      grid.innerHTML = '';
      const firstDay = new Date(viewYear, viewMonth, 1);
      let startWeekday = firstDay.getDay(); startWeekday = startWeekday===0?6:startWeekday-1;
      const daysInMonth = new Date(viewYear, viewMonth+1, 0).getDate();
      for(let i=0;i<startWeekday;i++) grid.appendChild(document.createElement('div'));
      for(let d=1; d<=daysInMonth; d++){
        const iso = viewYear+'-'+String(viewMonth+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
        const has = txOnDay(iso).length>0;
        const cell = document.createElement('div');
        /* V rezimu obdobi se da klepnout i na den bez transakci - jinak
           by sel vybrat jen rozsah zacinajici a koncici dnem, kdy se
           neco delo, coz je pri hledani "od 1. do 30." k nicemu. */
        const klikatelny = has || dateMode === 'range';
        const vyb = jeVybrany(iso);
        const kraj = jeKraj(iso);
        cell.style.cssText = `height:26px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:10px;border-radius:var(--radius);
          cursor:${klikatelny?'pointer':'default'};background:${kraj?'#b34cff':(vyb?'color-mix(in srgb,#b34cff 28%,transparent)':'transparent')};color:${vyb?'#fff':(has?'#c7cee6':'#5c6584')}`;
        cell.innerHTML = d + (has?'<i style="width:3px;height:3px;background:currentColor;border-radius:50%;display:block;margin-top:1px"></i>':'');
        if(klikatelny){ cell.addEventListener('click', ()=>{ vyberDen(iso); renderCalendar(); renderList(); }); }
        grid.appendChild(cell);
      }
      const popis = popisFiltru();
      container.querySelector('#clearDay').style.display = popis ? 'block' : 'none';
      const hint = container.querySelector('#rangeHint');
      if(hint){
        hint.style.display = dateMode === 'range' ? 'block' : 'none';
        hint.textContent = !rangeFrom ? 'Klepni na první den období.'
          : (!rangeTo ? 'Teď klepni na poslední den.' : 'Dalším klepnutím začneš vybírat znovu.');
      }
      const filterLabel = container.querySelector('#dateFilterLabel');
      if(filterLabel) filterLabel.textContent = popis || `Všechny dny${labelParts.length?' · '+labelParts.join(' + '):''}`;
    }
    container.querySelector('#calPrev').addEventListener('click', ()=>{ viewMonth--; if(viewMonth<0){viewMonth=11;viewYear--;} renderCalendar(); });
    container.querySelector('#calNext').addEventListener('click', ()=>{ viewMonth++; if(viewMonth>11){viewMonth=0;viewYear++;} renderCalendar(); });
    container.querySelector('#clearDay').addEventListener('click', ()=>{ zrusVyber(); renderCalendar(); renderList(); });

    function renderList(){
      const wrap = container.querySelector('#txList');
      const list = getFilteredTx().filter(t=> vFiltru(t.date||'')).sort((a,b)=>(b.date||'').localeCompare(a.date||'') || (b.id||'').localeCompare(a.id||''));
      if(list.length===0){ wrap.innerHTML = msEmptyState({kind:'filter', title:'Nic neodpovídá filtru',
        text:'Zkus vybrat jinou etapu nebo přepnout na Vše.'}); return; }
      let lastDate = '';
      wrap.innerHTML = list.map(t=>{
        const s = msStageByKey(t.stage);
        const isPlanned = t.type==='planned';
        // Znacka etapy - ikona v barve etapy, at je z rady hned videt,
        // kam vydaj patri (drive slo poznat jen z drobneho radku pod nazvem).
        const stageMark = `<span class="tx-stage${s?'':' is-none'}" title="${s?s.name:'Bez etapy'}" style="--sc:${s?s.color:'var(--muted)'};margin-right:9px">${msStageIconSvg(s?s.key:null, 18)}</span>`;
        const dateKey = t.date || '__undated__';
        const d = t.date ? new Date(t.date+'T00:00:00') : null;
        const dateHead = dateKey !== lastDate
          ? (t.date
            ? `<div class="transactions-v2-date"><b>${d.toLocaleDateString('cs-CZ',{weekday:'long',day:'numeric',month:'long'})}</b><span>${t.date}</span></div>`
            : `<div class="transactions-v2-date"><b>Bez termínu</b><span>plánované</span></div>`)
          : '';
        lastDate = dateKey;
        return `${dateHead}<div class="ms-ui-row transactions-v2-row tx-row ${isPlanned?'ms-kind-planned':''}" data-id="${t.id}" style="${isPlanned?'border-left:3px solid var(--ms-planned)':''}">
          ${stageMark}
          <div class="ms-ui-row-main"><b style="display:flex;align-items:center;gap:6px"><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${msEsc(t.title)}</span>${t.hasReceipt ? msReceiptBadge(12) : ''}</b><small>${isPlanned?((!t.dateMode || t.dateMode==='deadline')&&t.date?'Deadline · ':'Bez termínu · '):''}${s?s.name+' · ':''}${t.author && t.author !== 'Stavebník'?'👤 '+msEsc(t.author):''}</small></div>
          <b class="transactions-v2-amount" style="color:${t.type==='income'?'var(--money-pos)':(isPlanned?'#ff9b32':'var(--accent)')}">${t.type==='income'?'+':'-'}${Number(t.amount).toLocaleString('cs-CZ')} Kč</b>
          ${(isPlanned && msCanModifyContent())?`<span class="mark-paid" data-id="${t.id}" style="border:1px solid #ff9b32;color:#ff9b32;padding:5px 8px;font-size:10px;cursor:pointer;margin-left:8px;white-space:nowrap">Zaplaceno</span>`:''}
          <svg class="ms-ui-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>
        </div>`;
      }).join('');
      wrap.querySelectorAll('.tx-row').forEach(el=>{
        el.addEventListener('click', (e)=>{
          if(e.target.closest('.mark-paid')) return;   // ma vlastni obsluhu
          const t = list.find(x=> x.id === el.dataset.id);
          if(!t) return;
          msTxDetail(t, {
            onEdit: tx => Router.go('expense-add', {edit:tx.id, back:'transactions'}),
            onPaid: tx => openPayDialog(tx),
            onChanged: () => renderList()
          });
        });
      });
      wrap.querySelectorAll('.mark-paid').forEach(el=>{
        el.addEventListener('click', ()=>{
          const t = list.find(x=>x.id===el.dataset.id);
          if(t) openPayDialog(t);
        });
      });
    }
    renderList();

    function openPayDialog(t){
      const overlay = document.createElement('div');
      overlay.className = 'ms-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:80;display:flex;align-items:flex-end;justify-content:center';
      overlay.innerHTML = `
        <div style="width:100%;max-width:480px;background:var(--card-bg-2);border-top:1px solid var(--line);padding:16px 16px calc(16px + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)))">
          <p style="font-size:13px;font-weight:800;margin:0 0 3px">Kolik jsi zaplatil?</p>
          <p style="font-size:10.5px;color:var(--muted);margin:0 0 12px">${msEsc(t.title)} · naplánováno ${Number(t.amount).toLocaleString('cs-CZ')} Kč</p>
          <div style="display:flex;align-items:baseline;gap:8px;border:1px solid #ff9b32;padding:9px 12px;margin-bottom:6px">
            <input id="paidAmountInput" value="${t.amount}" inputmode="numeric" style="border:0;background:transparent;color:#ff9b32;font-size:20px;font-weight:800;width:100%;font:inherit;outline:none"/><span style="color:#ff9b32;font-weight:800">Kč</span>
          </div>
          <p id="payHint" style="font-size:10px;color:var(--muted);margin:0 0 14px">Zaplatíš celou částku - přesune se rovnou mezi skutečné výdaje.</p>
          <button id="confirmPaidBtn" class="btn-primary" style="border-color:#ff9b32;color:#fff">Potvrdit platbu</button>
          <button id="cancelPaidBtn" style="width:100%;background:transparent;border:0;color:var(--muted);padding:10px;margin-top:4px;font-size:11.5px;cursor:pointer">Zrušit</button>
        </div>`;
      document.body.appendChild(overlay);
      const input = overlay.querySelector('#paidAmountInput');
      const hint = overlay.querySelector('#payHint');
      input.addEventListener('input', ()=>{
        const paid = Number((input.value||'').replace(/\s/g,'')) || 0;
        if(paid<=0) hint.textContent = 'Zadej částku větší než 0.';
        else if(paid>=t.amount) hint.textContent = 'Zaplatíš celou částku - přesune se rovnou mezi skutečné výdaje.';
        else hint.textContent = `Zbytek (${(t.amount-paid).toLocaleString('cs-CZ')} Kč) zůstane jako plánovaný výdaj.`;
      });
      overlay.querySelector('#cancelPaidBtn').addEventListener('click', ()=> document.body.removeChild(overlay));
      overlay.querySelector('#confirmPaidBtn').addEventListener('click', ()=>{
        const paid = Number((input.value||'').replace(/\s/g,'')) || 0;
        if(paid<=0){ alert('Zadej částku větší než 0.'); return; }
        document.body.removeChild(overlay);
        msPayPlanned(t.id, paid);
        renderList();
      });
    }

    return { activeTab:'finance' };
  }
  return { render };
})();
Router.register('transactions', TransactionsScreen);
