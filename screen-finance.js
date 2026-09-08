/* ==========================================================
   FINANCE — technicky prehled v designu zbytku aplikace (v211)
   ========================================================== */
const FinanceScreen = (function(){
  const PLANNED_COLOR = '#d99a32';

  function chevron(){
    return '<svg class="finance-v2-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';
  }

  function render(container){
    let typeState = { income:true, expense:true };
    let activeStage = 'all';
    let legendExpanded = false;
    const TOP_N = 5;
    const SEG_GAP = 2.4;

    container.innerHTML = `
      <div class="topbar finance-v2-topbar">
        <div class="back-btn" id="backBtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></div>
        <div class="finance-v2-title"><p>FINANCE</p><h1>Přehled financí</h1></div>
        <div class="icon-btn" id="addBtn"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></div>
      </div>
      <div class="screen-scroll finance-v2-scroll">
        <section class="finance-v2-budget" aria-labelledby="financeBudgetTitle">
          <p>ROZPOČET STAVBY</p>
          <h2 id="financeBudgetTitle">Aktuální zůstatek</h2>
          <strong id="balanceValue">0 Kč</strong>
          <div class="finance-v2-budget-stats" id="summary"></div>
          <div class="finance-v2-after">Po plánovaných výdajích <b id="afterPlannedValue">0 Kč</b></div>
        </section>

        <div class="finance-v2-section-head"><p>VÝDAJE PODLE ETAP</p></div>
        <section class="finance-v2-chart-card" id="pieCard">
          <div class="finance-v2-donut">
            <svg viewBox="0 0 120 120" aria-label="Výdaje podle etap">
              <defs><filter id="pglow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
              <g id="pieSegs" filter="url(#pglow)"></g>
            </svg>
            <div id="pieHole" class="finance-v2-donut-hole"></div>
          </div>
          <div id="legend" class="finance-v2-legend"></div>
        </section>
        <button class="finance-v2-wide-action" id="legendToggle" hidden>ZOBRAZIT VŠECH <span id="legendToggleCount"></span> ETAP →</button>

        <div class="finance-v2-type-checks" id="typeChecks">
          <button data-t="income">✓ Vklady</button>
          <button data-t="expense">✓ Výdaje</button>
        </div>
        <div class="dropdown finance-v2-stage-filter" id="stageDropdown">
          <button class="dd-btn" id="ddBtn"><span class="left"><i id="ddDot"></i><span id="ddLabel">Vše</span><span id="ddCount"></span></span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M6 9l6 6 6-6"/></svg></button>
          <div class="dd-panel" id="ddPanel"></div>
        </div>

        <div id="depositsBlock"></div>

        <div class="finance-v2-list-head"><p>POSLEDNÍ TRANSAKCE</p></div>
        <div class="finance-v2-list" id="txList"></div>
        <button class="finance-v2-wide-action" id="moreBtn">ZOBRAZIT VŠECHNY TRANSAKCE →</button>

        <div class="finance-v2-list-head finance-v2-planned-head">
          <p>PLÁNOVANÉ VÝDAJE</p><span>Celkem <b id="plannedSectionTotal">0 Kč</b></span>
        </div>
        <div class="finance-v2-list finance-v2-planned-list" id="plannedList"></div>
      </div>
    `;

    container.querySelector('#backBtn').addEventListener('click', ()=> Router.back());
    const financeAddBtn = container.querySelector('#addBtn');
    if(typeof msCanAddSection === 'function' && !msCanAddSection('finance')) financeAddBtn.style.display = 'none';
    else financeAddBtn.addEventListener('click', ()=> Router.go('expense-add'));

    container.querySelectorAll('#typeChecks button').forEach(btn=>{
      const type = btn.dataset.t;
      btn.addEventListener('click', ()=>{
        const willBeActive = !typeState[type];
        if(!willBeActive && ((type==='income' && !typeState.expense) || (type==='expense' && !typeState.income))) return;
        typeState[type] = willBeActive;
        refreshTypeButtons();
        renderLists();
      });
    });

    function refreshTypeButtons(){
      container.querySelectorAll('#typeChecks button').forEach(btn=>{
        const type = btn.dataset.t;
        const active = typeState[type];
        btn.classList.toggle('is-active', active);
        btn.style.setProperty('--filter-color', type==='income' ? 'var(--money-pos)' : 'var(--accent)');
        btn.textContent = (active ? '✓ ' : '') + (type==='income' ? 'Vklady' : 'Výdaje');
      });
    }
    refreshTypeButtons();

    const ddBtn = container.querySelector('#ddBtn');
    const ddPanel = container.querySelector('#ddPanel');
    function stageMatches(t){ return activeStage==='all' || t.stage===activeStage; }
    function visibleCountForStage(stageKey){
      return msExpenses().filter(t=>{
        if(stageKey!=='all' && t.stage!==stageKey) return false;
        return t.type==='planned' || (t.type==='income' && typeState.income) || (t.type==='expense' && typeState.expense);
      }).length;
    }
    function buildDropdown(){
      ddPanel.innerHTML = '';
      const addItem = (key, name, color)=>{
        const item = document.createElement('div');
        item.className = 'dd-item' + (activeStage===key ? ' is-active' : '');
        item.style.color = color;
        item.innerHTML = `<i style="background:${color}"></i>${msEsc(name)}<span class="dd-n">${visibleCountForStage(key)}</span>`;
        item.addEventListener('click', ()=>{
          activeStage = key;
          ddLabelUpdate(); buildDropdown(); ddPanel.classList.remove('open'); renderLists();
        });
        ddPanel.appendChild(item);
      };
      addItem('all', 'Vše', 'var(--text-main)');
      msSelectedStages().forEach(stage=> addItem(stage.key, stage.name, stage.color));
    }
    function ddLabelUpdate(){
      const stage = msStageByKey(activeStage);
      container.querySelector('#ddLabel').textContent = stage ? stage.name : 'Všechny etapy';
      const n = visibleCountForStage(activeStage);
      container.querySelector('#ddCount').textContent = n===0 ? 'žádné položky' : (n===1 ? '1 položka' : (n<5 ? n+' položky' : n+' položek'));
      container.querySelector('#ddDot').style.background = stage ? stage.color : 'var(--accent)';
    }
    ddBtn.addEventListener('click', ()=> ddPanel.classList.toggle('open'));

    function renderPie(){
      const stages = msSelectedStages().map(stage=> ({...stage, spent:msSumExpensesByStage(stage.key)}));
      const total = stages.reduce((sum,stage)=>sum+stage.spent,0);
      const withSpend = stages.filter(stage=>stage.spent>0).sort((a,b)=>b.spent-a.spent);
      const seg = container.querySelector('#pieSegs');
      seg.innerHTML = '';
      const r = 50, cx = 60, cy = 60, circumference = 2*Math.PI*r;
      let acc = 0;
      if(total===0){
        const circle = document.createElementNS('http://www.w3.org/2000/svg','circle');
        circle.setAttribute('cx',cx); circle.setAttribute('cy',cy); circle.setAttribute('r',r);
        circle.setAttribute('fill','none'); circle.setAttribute('stroke','var(--line)'); circle.setAttribute('stroke-width','15');
        seg.appendChild(circle);
      }
      withSpend.forEach(stage=>{
        const length = (stage.spent/total)*circumference;
        const drawLength = Math.max(length-SEG_GAP, Math.min(length,1));
        const circle = document.createElementNS('http://www.w3.org/2000/svg','circle');
        circle.setAttribute('cx',cx); circle.setAttribute('cy',cy); circle.setAttribute('r',r);
        circle.setAttribute('fill','none'); circle.setAttribute('stroke',stage.color); circle.setAttribute('stroke-width','15');
        circle.setAttribute('stroke-linecap',withSpend.length>1?'round':'butt');
        circle.setAttribute('stroke-dasharray',`${drawLength} ${circumference-drawLength}`);
        circle.setAttribute('stroke-dashoffset',-acc);
        circle.setAttribute('transform',`rotate(-90 ${cx} ${cy})`);
        seg.appendChild(circle); acc += length;
      });

      const showAll = legendExpanded || withSpend.length<=TOP_N+1;
      const legendData = showAll ? withSpend : [
        ...withSpend.slice(0,TOP_N),
        {name:'Ostatní etapy',color:'#5c6584',spent:withSpend.slice(TOP_N).reduce((sum,stage)=>sum+stage.spent,0),isOther:true}
      ];
      const legend = container.querySelector('#legend');
      legend.innerHTML = '';
      if(!legendData.length) legend.innerHTML = '<span class="finance-v2-empty-line">Zatím žádné výdaje podle etap.</span>';
      legendData.forEach(stage=>{
        const pct = total ? Math.round(stage.spent/total*100) : 0;
        const row = document.createElement('div');
        row.className = 'finance-v2-legend-row' + (stage.isOther?' is-other':'');
        row.innerHTML = `<i style="background:${stage.color}"></i><span>${msEsc(stage.name)}</span><b>${stage.spent.toLocaleString('cs-CZ')} Kč</b><em>${pct}%</em>`;
        if(stage.isOther) row.addEventListener('click', ()=>{ legendExpanded=true; renderPie(); });
        legend.appendChild(row);
      });
      container.querySelector('#pieHole').innerHTML = `<b>${total.toLocaleString('cs-CZ')}</b><span>Kč celkem</span>`;
      const toggle = container.querySelector('#legendToggle');
      if(withSpend.length>TOP_N+1 && !legendExpanded){
        toggle.hidden = false;
        container.querySelector('#legendToggleCount').textContent = withSpend.length;
      } else toggle.hidden = true;
    }
    container.querySelector('#legendToggle').addEventListener('click', ()=>{ legendExpanded=true; renderPie(); });

    function transactionRow(t, isPlanned){
      const stage = msStageByKey(t.stage);
      const stageMark = `<span class="tx-stage${stage?'':' is-none'}" title="${stage?msEsc(stage.name):'Bez etapy'}" style="--sc:${stage?stage.color:'var(--muted)'}">${msStageIconSvg(stage?stage.key:null,18)}</span>`;
      const author = t.author && t.author!=='Stavebník' ? `<span class="finance-v2-author">👤 ${msEsc(t.author)}</span>` : '';
      return `<div class="finance-v2-row${isPlanned?' is-planned':''}" data-id="${t.id}">
        ${stageMark}
        <div class="finance-v2-row-main">
          <b><span>${msEsc(t.title)}</span>${t.hasReceipt?msReceiptBadge(12):''}</b>
          <small>${stage?msEsc(stage.name)+' · ':''}${isPlanned ? ((!t.dateMode || t.dateMode==='deadline') && t.date ? 'Deadline '+msEsc(t.date) : 'Bez termínu') : msEsc(t.date||'bez data')}</small>${author}
        </div>
        ${isPlanned?'<span class="finance-v2-plan-badge">PLÁN</span>':''}
        <strong>${t.type==='income'?'+':'−'}${Number(t.amount).toLocaleString('cs-CZ')} Kč</strong>
        ${chevron()}
      </div>`;
    }

    function openPayDialog(t){
      const overlay = document.createElement('div');
      overlay.className = 'ms-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:80;display:flex;align-items:flex-end;justify-content:center';
      overlay.innerHTML = `<div style="width:100%;max-width:480px;background:var(--card-bg-2);border-top:1px solid var(--line);padding:16px 16px calc(16px + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)))">
        <p style="font-size:13px;font-weight:800;margin:0 0 3px">Kolik jsi zaplatil?</p>
        <p style="font-size:10.5px;color:var(--muted);margin:0 0 12px">${msEsc(t.title)} · naplánováno ${Number(t.amount).toLocaleString('cs-CZ')} Kč</p>
        <div style="display:flex;align-items:baseline;gap:8px;border:1px solid ${PLANNED_COLOR};padding:9px 12px;margin-bottom:6px">
          <input id="paidAmountInput" value="${t.amount}" inputmode="numeric" style="border:0;background:transparent;color:${PLANNED_COLOR};font-size:20px;font-weight:800;width:100%;font:inherit;outline:none"/><span style="color:${PLANNED_COLOR};font-weight:800">Kč</span>
        </div>
        <p id="payHint" style="font-size:10px;color:var(--muted);margin:0 0 14px">Zaplatíš celou částku – přesune se mezi skutečné výdaje.</p>
        <button id="confirmPaidBtn" class="btn-primary" style="border-color:${PLANNED_COLOR}">Potvrdit platbu</button>
        <button id="cancelPaidBtn" style="width:100%;background:transparent;border:0;color:var(--muted);padding:10px;margin-top:4px;font-size:11.5px;cursor:pointer">Zrušit</button>
      </div>`;
      document.body.appendChild(overlay);
      const input = overlay.querySelector('#paidAmountInput');
      const hint = overlay.querySelector('#payHint');
      input.addEventListener('input', ()=>{
        const paid = Number((input.value||'').replace(/\s/g,''))||0;
        if(paid<=0) hint.textContent='Zadej částku větší než 0.';
        else if(paid>=t.amount) hint.textContent='Zaplatíš celou částku – přesune se mezi skutečné výdaje.';
        else hint.textContent=`Zbytek (${(t.amount-paid).toLocaleString('cs-CZ')} Kč) zůstane jako plánovaný výdaj.`;
      });
      overlay.querySelector('#cancelPaidBtn').addEventListener('click',()=>overlay.remove());
      overlay.querySelector('#confirmPaidBtn').addEventListener('click',()=>{
        const paid=Number((input.value||'').replace(/\s/g,''))||0;
        if(paid<=0){ alert('Zadej částku větší než 0.'); return; }
        overlay.remove(); msPayPlanned(t.id,paid); renderAll();
      });
    }

    /* (4.9.2026) Zalohy u dodavatele. Ukazuje se NEROZUCTOVANY zbytek -
       tedy penize, ktere uz odesly z uctu, ale jeste nevis, do ktere
       etapy patri. Odebrana cast uz je videt u sve etapy jako bezny
       vydaj, takze se nic nepocita dvakrat. */
    function renderDeposits(){
      const kc = n => Number(n||0).toLocaleString('cs-CZ') + ' Kč';
      const wrap = container.querySelector('#depositsBlock');
      if(!wrap) return;
      const aktivni = (typeof msDeposits==='function' ? msDeposits() : []).filter(d=>!d.depositClosed);
      const zbyva = typeof msTotalDepositsRemaining==='function' ? msTotalDepositsRemaining() : 0;

      if(!aktivni.length){
        wrap.innerHTML = `
          <div class="finance-v2-list-head"><p>ZÁLOHY</p></div>
          <button class="finance-v2-wide-action" id="depositsOpen">ZALOŽIT ZÁLOHU U DODAVATELE →</button>`;
      }else{
        wrap.innerHTML = `
          <div class="finance-v2-list-head finance-v2-planned-head">
            <p>ZÁLOHY</p><span>Nerozúčtováno <b>${kc(zbyva)}</b></span>
          </div>
          <div class="finance-v2-list">
            ${aktivni.slice(0,3).map(d=>{
              const sm = msDepositSummary(d.id);
              return `<div class="finance-v2-row" data-dep="${d.id}">
                <span class="tx-stage" style="--sc:var(--accent)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="13" rx="1"/><path d="M2 10h20"/></svg></span>
                <div class="finance-v2-row-main">
                  <b><span>${msEsc(d.title || 'Záloha')}</span></b>
                  <small>${d.supplier ? msEsc(d.supplier) + ' · ' : ''}odebráno ${kc(sm.drawn)} z ${kc(sm.total)}</small>
                </div>
                <strong>${kc(sm.remaining)}</strong>
                ${chevron()}
              </div>`;
            }).join('')}
          </div>
          <button class="finance-v2-wide-action" id="depositsOpen">ZOBRAZIT VŠECHNY ZÁLOHY →</button>`;
      }
      const btn = wrap.querySelector('#depositsOpen');
      if(btn) btn.addEventListener('click', ()=> Router.go(aktivni.length ? 'deposits' : 'deposit-add'));
      wrap.querySelectorAll('[data-dep]').forEach(el=>{
        el.addEventListener('click', ()=> Router.go('deposit-detail', {id: el.dataset.dep}));
      });
    }

    function renderSummary(){
      const plannedTotal = msTotalPlanned();
      container.querySelector('#balanceValue').textContent = msBalance().toLocaleString('cs-CZ')+' Kč';
      container.querySelector('#afterPlannedValue').textContent = msBalanceAfterPlanned().toLocaleString('cs-CZ')+' Kč';
      container.querySelector('#summary').innerHTML = `
        <div><span>Vklady</span><b class="is-income">${msTotalIncome().toLocaleString('cs-CZ')} Kč</b></div>
        <div><span>Výdaje</span><b class="is-expense">${msTotalExpenses().toLocaleString('cs-CZ')} Kč</b></div>
        <div><span>Plánováno</span><b class="is-planned">${plannedTotal.toLocaleString('cs-CZ')} Kč</b></div>`;
      container.querySelector('#plannedSectionTotal').textContent = plannedTotal.toLocaleString('cs-CZ')+' Kč';
    }

    function renderLists(){
      const actual = msExpenses().filter(t=>t.type!=='planned' && stageMatches(t) && ((t.type==='income'&&typeState.income)||(t.type==='expense'&&typeState.expense)))
        .sort((a,b)=>(b.date||'').localeCompare(a.date||'')||(b.id||'').localeCompare(a.id||''));
      const planned = msExpenses().filter(t=>t.type==='planned' && !t.planClosed && stageMatches(t))
        .sort((a,b)=>(a.date||'9999-99-99').localeCompare(b.date||'9999-99-99')||(b.id||'').localeCompare(a.id||''));
      const listEl = container.querySelector('#txList');
      const plannedEl = container.querySelector('#plannedList');
      listEl.innerHTML = actual.length ? actual.slice(0,5).map(t=>transactionRow(t,false)).join('') : '<div class="finance-v2-empty-line">Nic neodpovídá zvolenému filtru.</div>';
      plannedEl.innerHTML = planned.length ? planned.map(t=>transactionRow(t,true)).join('') : '<div class="finance-v2-empty-line">Zatím žádné plánované výdaje.</div>';

      listEl.querySelectorAll('.finance-v2-row').forEach(row=>row.addEventListener('click',()=>{
        const tx=actual.find(item=>item.id===row.dataset.id);
        if(tx) msTxDetail(tx,{onEdit:item=>Router.go('expense-add',{edit:item.id,back:'finance'}),onChanged:()=>{ renderSummary(); renderPie(); renderLists(); renderDeposits(); }});
      }));
      plannedEl.querySelectorAll('.finance-v2-row').forEach(row=>row.addEventListener('click',()=>{
        const tx=planned.find(item=>item.id===row.dataset.id);
        if(tx) msTxDetail(tx,{onEdit:item=>Router.go('expense-add',{edit:item.id,back:'finance'}),onPaid:item=>openPayDialog(item),onChanged:()=>{ renderSummary(); renderPie(); renderLists(); renderDeposits(); }});
      }));

      const moreBtn=container.querySelector('#moreBtn');
      moreBtn.hidden=!actual.length;
      moreBtn.onclick=()=>Router.go('transactions',{
        income:typeState.income?1:0,expense:typeState.expense?1:0,
        ...(activeStage!=='all'?{stage:activeStage}:{})
      });
      ddLabelUpdate(); buildDropdown();
    }

    function renderAll(){ renderSummary(); renderPie(); renderLists(); renderDeposits(); }
    renderAll();
    return {activeTab:'finance'};
  }
  return {render};
})();
Router.register('finance',FinanceScreen);
