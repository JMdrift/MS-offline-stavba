/* ==========================================================
   VYDAJE ETAPY (solo karta, prepinatelna etapa)
   ========================================================== */
const StageExpensesScreen = (function(){
  function render(container, params){
    let stageKey = params.stage || msGetCurrentStage();

    container.innerHTML = `
      <div class="topbar ms-ui-topbar stage-expenses-v2-topbar">
        <div class="back-btn" id="backBtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></div>
        <div class="ms-ui-title"><p>Finance etapy</p><h1>Výdaje</h1></div>
      </div>
      <div class="screen-scroll stage-expenses-v2-scroll">
        <div class="dropdown stage-expenses-v2-picker" id="stageDropdown">
          <button class="dd-btn" id="ddBtn"><span class="left"><i id="ddDot"></i><span id="ddLabel">—</span></span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M6 9l6 6 6-6"/></svg></button>
          <div class="dd-panel" id="ddPanel" data-sheet-title="Vybrat etapu"></div>
        </div>
        <div class="stage-expenses-v2-summary">
          <p>Utraceno v etapě</p>
          <strong id="sumStageSpent"></strong>
          <div><span>Aktuální zůstatek stavby</span><b id="sumBalance"></b></div>
        </div>
        <div class="finance-v2-list-head stage-expenses-v2-list-head"><p>Výdaje</p><span id="txCount"></span></div>
        <div id="txList" class="finance-v2-list"></div>
      </div>
    `;
    container.querySelector('#backBtn').addEventListener('click', ()=> Router.back());

    const ddBtn = container.querySelector('#ddBtn');
    const ddPanel = container.querySelector('#ddPanel');
    const allExpenses = msExpenses();
    MS_STAGES.forEach(s=>{
      const it = document.createElement('div');
      it.className = 'dd-item';
      it.innerHTML = `<i style="background:${s.color};display:inline-block;width:7px;height:7px;margin-right:8px"></i>${msEsc(s.name)}`
        + `<span class="dd-n">${msCountForStage(allExpenses, s.key)}</span>`;
      it.addEventListener('click', ()=>{ stageKey=s.key; updateLabel(); ddPanel.classList.remove('open'); draw(); });
      ddPanel.appendChild(it);
    });
    ddBtn.addEventListener('click', ()=> ddPanel.classList.toggle('open'));
    function updateLabel(){
      const s = msStageByKey(stageKey);
      if(s){
        container.querySelector('#ddLabel').textContent = s.name;
        container.querySelector('#ddDot').style.background = s.color;
        container.querySelector('.stage-expenses-v2-scroll').style.setProperty('--stage-color', s.color);
      }
    }
    updateLabel();

    function draw(){
      container.querySelector('#sumBalance').textContent = msBalance().toLocaleString('cs-CZ')+' Kč';
      const spent = msSumExpensesByStage(stageKey);
      container.querySelector('#sumStageSpent').textContent = spent.toLocaleString('cs-CZ')+' Kč';
      const list = container.querySelector('#txList');
      const txs = msExpenses().filter(t=>t.stage===stageKey && t.type==='expense').sort((a,b)=>(b.date||'').localeCompare(a.date||'') || (b.id||'').localeCompare(a.id||''));
      container.querySelector('#txCount').textContent = txs.length + (txs.length===1?' položka':(txs.length<5?' položky':' položek'));
      if(txs.length===0){ list.innerHTML = '<div class="finance-v2-empty-line">V této etapě zatím nejsou žádné výdaje.</div>'; return; }
      const stage = msStageByKey(stageKey);
      list.innerHTML = txs.map(t=>`
        <div class="tx-row finance-v2-row" data-id="${t.id}">
          <span class="tx-stage" style="--sc:${stage?stage.color:'var(--muted)'}">${msStageIconSvg(stage?stage.key:null,18)}</span>
          <div class="finance-v2-row-main"><b><span>${msEsc(t.title)}</span>${t.hasReceipt ? msReceiptBadge(12) : ''}</b><small>${msEsc(t.date||'bez data')}${t.category?' · '+msEsc(t.category):''}</small>${t.author && t.author !== 'Stavebník' ? `<span class="finance-v2-author">👤 ${msEsc(t.author)}</span>` : ''}</div>
          <strong>−${Number(t.amount).toLocaleString('cs-CZ')} Kč</strong>
          <svg class="finance-v2-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>
        </div>`).join('');
      list.querySelectorAll('.tx-row').forEach(el=>{
        el.addEventListener('click', ()=>{
          const t = txs.find(x=> x.id === el.dataset.id);
          if(t) msTxDetail(t, { onEdit: tx => Router.go('expense-add', {edit:tx.id, back:'stage-expenses'}), onChanged: () => draw() });
        });
      });
    }
    draw();

    return { activeTab:'stages' };
  }
  return { render };
})();
Router.register('stage-expenses', StageExpensesScreen);
