/* ==========================================================
   ÚKOLY (7.8.2026)
   Samostatna obrazovka pro polozku "Ukoly" v dolni navigaci.
   Do ted ukoly zily jen uvnitr Kalendare, a to vzdy jen pro
   jeden vybrany den - nebylo kde videt vsechny najednou.

   Zamerne NEDUPLIKUJE logiku: cteni i zapis jde pres uz
   existujici msTasks / msUpdateTask / msDeleteTask, pridavani
   a upravy pres uz existujici obrazovku 'task-add'. Kdyz se
   zmeni chovani ukolu jinde, zmeni se i tady.
   ========================================================== */
const TasksScreen = (function(){

  function formatDateCz(iso){
    const d = new Date(iso+'T00:00:00');
    return d.getDate()+'. '+(d.getMonth()+1)+'. '+d.getFullYear();
  }

  function render(container){
    const canAdd = (typeof msCanAddSection !== 'function') || msCanAddSection('kalendar');

    container.classList.add('ms-ui-screen','tasks-v2-screen');

    container.innerHTML = `
      <div class="topbar ms-ui-topbar">
        <div class="back-btn" id="backBtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></div>
        <div class="ms-ui-title"><p>Úkoly</p><h1>Přehled úkolů</h1></div>
        <div class="ms-ui-actions">
          <div class="icon-btn" id="calBtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="1"/><path d="M8 2v4M16 2v4M3 10h18"/></svg></div>
          <div class="icon-btn" id="addBtn" ${canAdd?'':'style="display:none"'}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></div>
        </div>
      </div>
      <div id="taskStrip"></div>
      <div id="taskMonth" hidden></div>
      <div class="screen-scroll" id="tasksScroll"></div>
    `;

    container.querySelector('#backBtn').addEventListener('click', ()=> Router.back());
    const addBtn = container.querySelector('#addBtn');
    if(addBtn) addBtn.addEventListener('click', ()=> Router.go('task-add'));

    // Vybrany den. null = "vsechny ukoly" (vychozi stav obrazovky).
    let selectedDay = null;
    let monthOpen = false;
    let monthCursor = new Date();

    container.querySelector('#calBtn').addEventListener('click', ()=>{
      monthOpen = !monthOpen;
      container.querySelector('#taskMonth').hidden = !monthOpen;
      if(monthOpen) drawMonth();
    });

    drawStrip();
    draw();

    /* Vodorovny posuvny kalendar: 21 dni dozadu a 60 dopredu. Pod cislem
       dne je tecka, kdyz na nej pripada nejaky ukol - cervena, pokud je
       aspon jeden po terminu. */
    function drawStrip(){
      const strip = container.querySelector('#taskStrip');
      const today = new Date(); today.setHours(0,0,0,0);
      const tIso = msDateToIso(today);
      const tasks = msTasks().filter(t=>!t.done && t.date && t.dateMode !== 'none');
      const byDay = {};
      tasks.forEach(t=>{ (byDay[t.date] = byDay[t.date] || []).push(t); });

      const DNY = ['ne','po','út','st','čt','pá','so'];
      let html = '<div id="stripInner" style="display:flex;gap:5px;overflow-x:auto;padding:8px 14px 10px">';
      html += `<button class="strip-day" data-day="" style="flex:0 0 auto;width:52px;padding:7px 2px;font:inherit;cursor:pointer;background:transparent;
        border:1px solid ${selectedDay===null?'var(--accent)':'var(--line)'};color:${selectedDay===null?'var(--accent)':'var(--muted)'};border-radius:var(--radius)">
        <span style="display:block;font-size:9px;font-weight:700">vše</span>
        <b style="display:block;font-size:14px;line-height:1.2">${tasks.length}</b></button>`;

      for(let i=-21;i<=60;i++){
        const d = new Date(today.getTime() + i*86400000);
        const iso = msDateToIso(d);
        const list = byDay[iso] || [];
        const overdue = list.length && iso < tIso;
        const isToday = iso === tIso;
        const on = selectedDay === iso;
        const dot = list.length
          ? `<i style="display:block;width:4px;height:4px;border-radius:50%;margin:2px auto 0;background:${overdue?'#ff7a86':'#ff9b32'}"></i>`
          : '<i style="display:block;width:4px;height:4px;margin:2px auto 0"></i>';
        html += `<button class="strip-day" data-day="${iso}" style="flex:0 0 auto;width:42px;padding:6px 2px;font:inherit;cursor:pointer;background:transparent;
          border:1px solid ${on?'var(--accent)':(isToday?'color-mix(in srgb, var(--accent) 45%, transparent)':'var(--line)')};
          color:${on?'var(--accent)':(isToday?'#fff':'var(--muted)')};border-radius:var(--radius)">
          <span style="display:block;font-size:9px">${DNY[d.getDay()]}</span>
          <b style="display:block;font-size:14px;line-height:1.2">${d.getDate()}</b>
          ${dot}</button>`;
      }
      html += '</div>';
      strip.innerHTML = html;

      strip.querySelectorAll('.strip-day').forEach(b=>{
        b.addEventListener('click', ()=>{
          const v = b.dataset.day || null;
          selectedDay = (selectedDay === v) ? null : v;   // druhe ťuknutí zruší výběr
          drawStrip(); if(monthOpen) drawMonth(); draw();
        });
      });
      // posunout na dnesek
      const inner = strip.querySelector('#stripInner');
      const todayBtn = strip.querySelector(`.strip-day[data-day="${tIso}"]`);
      if(inner && todayBtn) inner.scrollLeft = Math.max(0, todayBtn.offsetLeft - inner.clientWidth/2 + 21);
    }

    /* Rozbalovaci mesicni kalendar - stejny prehled, jen po mesicich. */
    function drawMonth(){
      const box = container.querySelector('#taskMonth');
      const y = monthCursor.getFullYear(), m = monthCursor.getMonth();
      const first = new Date(y, m, 1);
      const start = (first.getDay() + 6) % 7;           // pondelkem pocinaje
      const days = new Date(y, m+1, 0).getDate();
      const tIso = msTodayIso();
      const tasks = msTasks().filter(t=>!t.done && t.date && t.dateMode !== 'none');
      const byDay = {};
      tasks.forEach(t=>{ (byDay[t.date] = byDay[t.date] || []).push(t); });
      const MES = ['Leden','Únor','Březen','Duben','Květen','Červen','Červenec','Srpen','Září','Říjen','Listopad','Prosinec'];

      let html = `<div style="border-top:1px solid var(--line);padding:10px 14px 12px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <button id="mPrev" style="background:transparent;border:1px solid var(--line);color:var(--muted);padding:5px 9px;font:inherit;cursor:pointer">‹</button>
          <b style="font-size:13px">${MES[m]} ${y}</b>
          <button id="mNext" style="background:transparent;border:1px solid var(--line);color:var(--muted);padding:5px 9px;font:inherit;cursor:pointer">›</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;font-size:9px;color:var(--muted);text-align:center;margin-bottom:3px">
          <span>po</span><span>út</span><span>st</span><span>čt</span><span>pá</span><span>so</span><span>ne</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px">`;
      for(let i=0;i<start;i++) html += '<span></span>';
      for(let d=1;d<=days;d++){
        const iso = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const list = byDay[iso] || [];
        const overdue = list.length && iso < tIso;
        const on = selectedDay === iso;
        html += `<button class="m-day" data-day="${iso}" style="aspect-ratio:1;font:inherit;font-size:11.5px;cursor:pointer;background:transparent;
          border:1px solid ${on?'var(--accent)':(iso===tIso?'color-mix(in srgb, var(--accent) 45%, transparent)':'transparent')};
          color:${on?'var(--accent)':'var(--text-main)'};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px">
          ${d}${list.length?`<i style="width:4px;height:4px;border-radius:50%;background:${overdue?'#ff7a86':'#ff9b32'}"></i>`:''}
        </button>`;
      }
      html += '</div></div>';
      box.innerHTML = html;

      box.querySelector('#mPrev').addEventListener('click', ()=>{ monthCursor = new Date(y, m-1, 1); drawMonth(); });
      box.querySelector('#mNext').addEventListener('click', ()=>{ monthCursor = new Date(y, m+1, 1); drawMonth(); });
      box.querySelectorAll('.m-day').forEach(b=>{
        b.addEventListener('click', ()=>{
          selectedDay = (selectedDay === b.dataset.day) ? null : b.dataset.day;
          drawStrip(); drawMonth(); draw();
        });
      });
    }

    function draw(){
      const scroll = container.querySelector('#tasksScroll');
      const todayIso = msTodayIso();
      // Razeni je spolecne s dlazdici na Dashboardu (msTasksByPriority),
      // aby se poradi nemohlo na dvou mistech rozejit.
      const all = selectedDay
        ? msTasksByPriority().filter(t=> t.date === selectedDay)
        : msTasksByPriority();

      const open = all.filter(t=> !t.done);
      /* (31.8.2026) Splnene ukoly se doted neradily vubec - lezely
         v poradi, v jakem byly zalozene, tedy od nejstarsiho. Ted
         nahore to, co jsi splnil naposled. Ukoly splnene pred
         14.8.2026 znacku doneAt nemaji, takze spadnou na konec. */
      const done = all.filter(t=> t.done).sort((a,b)=>{
        const ca = a.doneAt || (a.doneDate ? new Date(a.doneDate+'T00:00:00').getTime() : 0);
        const cb = b.doneAt || (b.doneDate ? new Date(b.doneDate+'T00:00:00').getTime() : 0);
        return cb - ca;
      });
      const overdue = open.filter(t=> t.date && t.dateMode !== 'none' && t.date < todayIso);
      const today   = open.filter(t=> t.date && t.dateMode !== 'none' && t.date === todayIso);
      const future  = open.filter(t=> t.date && t.dateMode !== 'none' && t.date > todayIso);
      const undated = open.filter(t=> !t.date || t.dateMode === 'none');

      if(all.length === 0){
        scroll.innerHTML = selectedDay
          ? msEmptyState({kind:'filter', title:'Na tenhle den nic nemáš',
        text:'Ťukni na den znovu a uvidíš zase všechny úkoly.'})
          : msEmptyState({icon:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="1"/><path d="M8 12l2.5 2.5L16 9"/></svg>`, color:'#ff9b32',
        title:'Zatím žádné úkoly',
        text:'Úkoly s termínem se ti samy objeví v kalendáři i na přehledu.',
        hints:['Co objednat','Komu zavolat','Co zkontrolovat před zakrytím'],
        actionId:'emptyTasksCard'});
        const ec = scroll.querySelector('#emptyTasksCard');
        if(ec) ec.addEventListener('click', ()=> Router.go('task-add'));
        return;
      }

      let html = '';
      html += group('Po termínu', overdue, '#ff7a86', 'danger');
      html += group('Dnes', today, '#ff9b32', 'date');
      html += group('Nadcházející', future, '#25b7ff', 'date');
      html += group('Bez termínu', undated, '#4dffab', 'undated');
      html += group('Splněné', done, 'var(--line)');
      scroll.innerHTML = html;

      scroll.querySelectorAll('.task-check').forEach(el=>{
        el.addEventListener('click', ()=>{
          const t = all.find(x=> x.id === el.dataset.id);
          if(!t) return;
          const nowDone = !t.done;
          // OPRAVA (14.8.2026): drive se ukladalo jen doneDate (DEN, bez casu).
          // Aktuality si musely cas SPLNENI odhadovat jako konec dne (23:59) -
          // splneny ukol tak byl v budoucnosti oproti vsemu, co jsi udelal
          // POZDEJI ten samy den, a zustaval navzdy nahore bez ohledu na to,
          // co jsi pak jeste zapsal. doneAt nese presny okamzik.
          msUpdateTask(t.id, { done: nowDone, doneDate: nowDone ? todayIso : null, doneAt: nowDone ? Date.now() : null });
          drawStrip(); if(monthOpen) drawMonth(); draw();
        });
      });
      scroll.querySelectorAll('.task-open').forEach(el=>{
        el.addEventListener('click', ()=> Router.go('task-add', { taskId: el.dataset.id }));
      });
      scroll.querySelectorAll('.task-del').forEach(el=>{
        el.addEventListener('click', async (e)=>{
          e.stopPropagation();
          if(!await Layout.confirmDialog('Smazat tenhle úkol?', 'Smazat')) return;
          msDeleteTask(el.dataset.id);
          drawStrip(); if(monthOpen) drawMonth(); draw();
        });
      });
    }

    function group(label, list, color, kind){
      if(list.length === 0) return '';
      return `<section class="tasks-v2-group"><div class="tasks-v2-group-head ${kind?'ms-kind-'+kind:''}"><b>${label}</b><span>${list.length}</span></div><div class="ms-ui-list">` +
             list.map(t=> row(t, color)).join('') + '</div></section>';
    }

    function row(t, color){
      // (13.8.2026) Misto holeho textu barevna znacka - viz msTaskZnacka
      // v data.js. Ramecek ukolu ma stejnou barvu jako znacka, aby se to
      // dalo precist i koutkem oka.
      const znacka = msTaskZnackaHtml(t);
      const barvaZnacky = msTaskZnacka(t).barva;
      if(!t.done) color = barvaZnacky;
      const overdue = !t.done && t.date && t.dateMode!=='none' && t.date<msTodayIso();

      const kind = t.done ? '' : (t.dateMode==='deadline' ? 'ms-kind-deadline' : ((!t.date||t.dateMode==='none') ? 'ms-kind-undated' : 'ms-kind-date'));
      const symbol = t.dateMode==='deadline'
        ? '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2h12M6 22h12M8 2c0 5 8 5 8 10s-8 5-8 10M16 2c0 5-8 5-8 10s8 5 8 10"/></svg>'
        : ((!t.date||t.dateMode==='none') ? '<b style="font-size:19px">∞</b>' : '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16"/><path d="M8 12l3 3 6-7"/></svg>');

      return `
        <div class="ms-ui-row tasks-v2-row ${kind} ${overdue?'is-overdue':''}" style="${t.done?'opacity:.55':''}">
          <span class="ms-ui-icon">${symbol}</span>
          <span class="tasks-v2-check ${msCanModifyContent() ? 'task-check' : ''}" data-id="${t.id}" style="${t.done?'background:var(--ms-planned);border-color:var(--ms-planned)':''}">${t.done?'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#04070f" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>':''}</span>
          <div class="ms-ui-row-main ${msCanModifyContent() ? 'task-open' : ''}" data-id="${t.id}">
            <b style="display:block;font-size:12.5px;text-decoration:${t.done?'line-through':'none'};color:${t.done?'var(--muted)':'#fff'}">${msEsc(t.title)}</b>
            ${znacka}
          </div>
          ${msCanModifyContent() ? `<button class="tasks-v2-delete task-del" data-id="${t.id}" aria-label="Smazat úkol">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V7"/></svg>
          </button>` : ''}
        </div>`;
    }

    return { activeTab:'tasks', showNav:true };
  }

  return { render };
})();

Router.register('tasks', TasksScreen);
