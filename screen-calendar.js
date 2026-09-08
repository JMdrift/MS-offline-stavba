/* ==========================================================
   KALENDAR
   ========================================================== */
const CalendarScreen = (function(){
  const MONTHS = ['Leden','Únor','Březen','Duben','Květen','Červen','Červenec','Srpen','Září','Říjen','Listopad','Prosinec'];
  function formatDateCz(iso){
    const d = new Date(iso+'T00:00:00');
    return d.getDate()+'. '+(d.getMonth()+1)+'.';
  }

  function render(container){
    const today = new Date();
    let viewYear = today.getFullYear(), viewMonth = today.getMonth();
    let selectedDate = msDateToIso(today);

    container.classList.add('ms-ui-screen','calendar-v2-screen');

    container.innerHTML = `
      <div class="topbar ms-ui-topbar">
        <div class="back-btn" id="backBtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></div>
        <div class="ms-ui-title"><p>Kalendář</p><h1>Přehled termínů</h1></div>
        <div class="ms-ui-actions"><div class="icon-btn" id="addBtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></div></div>
      </div>
      <div class="screen-scroll">
        <div class="calendar-v2-month">
          <div class="calendar-v2-month-head">
            <b id="monthLabel"></b>
            <div class="calendar-v2-nav">
              <button id="prevBtn" aria-label="Předchozí měsíc">‹</button>
              <button id="nextBtn" aria-label="Další měsíc">›</button>
            </div>
          </div>
          <div class="calendar-v2-week">
            ${['Po','Út','St','Čt','Pá','So','Ne'].map(d=>`<span>${d}</span>`).join('')}
          </div>
          <div id="grid" class="calendar-v2-grid"></div>
        </div>
        <div class="calendar-v2-legend" aria-label="Legenda kalendáře">
          <span><i class="calendar-v2-mark event"></i>Událost</span>
          <span><i class="calendar-v2-mark date"></i>Úkol na den</span>
          <span><i class="calendar-v2-mark deadline"></i>Úkol s deadlinem</span>
          <span><i class="calendar-v2-mark planned"></i>Deadline výdaje</span>
          <span class="ms-kind-undated"><b style="font-size:15px;line-height:6px">∞</b>Úkol bez termínu</span>
        </div>
        <div class="ms-ui-section-head" id="eventsLabel"><h2>Události vybraného dne</h2></div>
        <div id="eventGrid" class="calendar-v2-cards"></div>
        <div class="ms-ui-section-head" id="tasksLabel"><h2>Úkoly vybraného dne</h2></div>
        <div id="taskGrid" class="calendar-v2-cards"></div>
        <div class="ms-ui-section-head" id="plannedLabel"><h2>Plánované výdaje s deadlinem</h2></div>
        <div id="plannedGrid" class="calendar-v2-cards"></div>
        <!-- (13.8.2026) Ukoly bez terminu se drive vesely na DNESEK a
             zanasely ho vecmi, ktere k nemu nepatri. Zadny den jim
             nenalezi, takze do mrizky nepatri - ale zmizet taky nemaji.
             Proto tenhle prouzek: je porad na ocich a neprekazi. -->
        <div id="bezTerminu" style="margin-bottom:16px"></div>
        <div class="ms-ui-section-head"><h2>Nadcházející události</h2></div>
        <div id="allEvents"></div>
      </div>
    `;
    container.querySelector('#backBtn').addEventListener('click', ()=> Router.back());
    const calendarAddBtn = container.querySelector('#addBtn');
    if(typeof msCanAddSection === 'function' && !msCanAddSection('kalendar')){ calendarAddBtn.style.display = 'none'; }
    else calendarAddBtn.addEventListener('click', ()=> Router.go('event-add'));
    container.querySelector('#prevBtn').addEventListener('click', ()=>{ viewMonth--; if(viewMonth<0){viewMonth=11;viewYear--;} draw(); });
    container.querySelector('#nextBtn').addEventListener('click', ()=>{ viewMonth++; if(viewMonth>11){viewMonth=0;viewYear++;} draw(); });

    function draw(){
      container.querySelector('#monthLabel').textContent = MONTHS[viewMonth]+' '+viewYear;
      const events = msEvents();
      const tasks = msTasks();
      const plannedExpenses = msExpenses().filter(t=>t.type==='planned' && !t.planClosed && (!t.dateMode || t.dateMode==='deadline') && t.date);
      const grid = container.querySelector('#grid');
      grid.innerHTML = '';
      const firstDay = new Date(viewYear, viewMonth, 1);
      let startWeekday = firstDay.getDay(); startWeekday = startWeekday===0?6:startWeekday-1;
      const daysInMonth = new Date(viewYear, viewMonth+1, 0).getDate();
      for(let i=0;i<startWeekday;i++) grid.appendChild(document.createElement('div'));
      const todayIso = msDateToIso(today);
      for(let d=1; d<=daysInMonth; d++){
        const iso = viewYear+'-'+String(viewMonth+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
        /* ZMENA (13.8.2026): pod dnem byla jedna modra tecka pro cokoliv.
           Nedalo se poznat, jestli ma clovek ten den prijit na kontrolu,
           nebo mu jen konci lhuta. Ted se znacky lisi TVAREM (ne jen
           barvou, at to pozna i ten, kdo je nerozlisuje):
             plny ctverecek = ukol ma byt ten den hotovy
             prazdny obrys  = ten den konci lhuta
             kolecko        = udalost                                    */
        const maUdalost = events.some(e=>e.date===iso);
        const maDen = tasks.some(t=> !t.done && t.dateMode === 'date' && t.date === iso);
        const maLhutu = tasks.some(t=> !t.done && t.dateMode === 'deadline' && t.date === iso);
        const maPlan = plannedExpenses.some(t=>t.date===iso);
        const znacky =
          (maDen ? '<i class="calendar-v2-mark date"></i>' : '') +
          (maLhutu ? '<i class="calendar-v2-mark deadline"></i>' : '') +
          (maPlan ? '<i class="calendar-v2-mark planned"></i>' : '') +
          (maUdalost ? '<i class="calendar-v2-mark event"></i>' : '');
        const cell = document.createElement('div');
        cell.className = 'calendar-v2-day' + (iso===selectedDate?' is-selected':'');
        cell.innerHTML = d + (znacky ? `<span class="calendar-v2-marks">${znacky}</span>` : '<span class="calendar-v2-marks"></span>');
        cell.addEventListener('click', ()=>{ selectedDate = iso; draw(); });
        grid.appendChild(cell);
      }
      const dayEvents = events.filter(e=>e.date===selectedDate).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
      const dayPlanned = plannedExpenses.filter(t=>t.date===selectedDate);
      let dayTasks = tasks.filter(t=>msTaskVisibleOn(t, selectedDate, todayIso).visible);
      // (11.8.2026) V ramci dne razeni podle casu - ukoly s hodinou
      // nahoru, zbytek za nimi v puvodnim poradi.
      dayTasks = dayTasks.slice().sort((a,b)=>{
        const ta = a.time || '', tb = b.time || '';
        if(ta && tb) return ta.localeCompare(tb);
        if(ta) return -1;
        if(tb) return 1;
        return 0;
      });

      const eventsLabel = container.querySelector('#eventsLabel');
      const tasksLabel = container.querySelector('#tasksLabel');
      const plannedLabel = container.querySelector('#plannedLabel');
      const eventGrid = container.querySelector('#eventGrid');
      const taskGrid = container.querySelector('#taskGrid');
      const plannedGrid = container.querySelector('#plannedGrid');

      eventsLabel.style.display = dayEvents.length ? 'block' : 'none';
      eventGrid.style.display = dayEvents.length ? 'grid' : 'none';
      tasksLabel.style.display = dayTasks.length ? 'block' : 'none';
      taskGrid.style.display = dayTasks.length ? 'grid' : 'none';
      plannedLabel.style.display = dayPlanned.length ? 'block' : 'none';
      plannedGrid.style.display = dayPlanned.length ? 'grid' : 'none';

      // Prouzek s ukoly bez terminu - nezavisi na vybranem dni.
      const bezTerminuWrap = container.querySelector('#bezTerminu');
      if(bezTerminuWrap){
        const bez = tasks.filter(t=> !t.done && (!t.date || t.dateMode === 'none'));
        if(!bez.length){
          bezTerminuWrap.innerHTML = '';
        } else {
          const rozbaleno = bezTerminuWrap.dataset.open === '1';
          bezTerminuWrap.innerHTML = `
            <button id="bezTerminuHlava" class="ms-ui-collapsible ms-kind-undated">
              <b style="width:24px;flex:0 0 24px;text-align:center;font-size:19px">∞</b>
              <div style="flex:1;min-width:0">
                <b style="font-size:11.5px;display:block">Bez termínu</b>
                <span style="font-size:10px;color:var(--muted)">${bez.length} ${bez.length===1?'úkol, který':(bez.length<5?'úkoly, které':'úkolů, které')} nikam nespěchá${bez.length===1?'':'jí'}</span>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2.4" stroke-linecap="round" style="transform:rotate(${rozbaleno?90:0}deg);transition:transform .15s"><path d="M9 6l6 6-6 6"/></svg>
            </button>
            ${rozbaleno ? `<div class="calendar-v2-cards" style="margin-top:8px">
              ${bez.map(t=>`
                <div style="position:relative;border:1px solid var(--line);background:var(--card-bg);padding:11px 10px">
                  <span class="task-check" data-id="${t.id}" style="width:18px;height:18px;border:1px solid var(--line);display:grid;place-items:center;cursor:pointer"></span>
                  <b style="display:block;font-size:12px;margin-top:6px;color:#fff">${msEsc(t.title)}</b>
                  ${msTaskZnackaHtml(t, todayIso)}
                </div>`).join('')}
            </div>` : ''}`;
          bezTerminuWrap.querySelector('#bezTerminuHlava').addEventListener('click', ()=>{
            bezTerminuWrap.dataset.open = rozbaleno ? '0' : '1';
            draw();
          });
        }
      }

      function authorBadge(author){
        if(!author || author==='Stavebník') return '';
        return `<span style="display:block;margin-top:5px;border:1px solid #25b7ff;color:#25b7ff;padding:1px 6px;font-size:8.5px;font-weight:700;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;box-sizing:border-box">👤 ${author.replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</span>`;
      }
      function actionBadges(editClass, delClass, id){
        // Kompatibilita se starsimi importy, ve kterych mohl byt projekt
        // oznaceny jen pro cteni.
        if(typeof msCanModifyContent === 'function' && !msCanModifyContent()) return '';
        return `<div style="position:absolute;top:6px;right:6px;display:flex;gap:4px">
          <span class="${editClass}" data-id="${id}" style="width:16px;height:16px;border:1px solid var(--line);border-radius:var(--radius);display:grid;place-items:center;color:var(--add-color);cursor:pointer;background:var(--card-bg-2)">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
          </span>
          <span class="${delClass}" data-id="${id}" style="width:16px;height:16px;border:1px solid var(--line);border-radius:var(--radius);display:grid;place-items:center;color:#ff7a86;cursor:pointer;background:var(--card-bg-2)">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V7"/></svg>
          </span>
        </div>`;
      }

      eventGrid.innerHTML = dayEvents.map(e=>`
        <div class="ms-ui-row calendar-v2-card ms-kind-event">
          <span class="ms-ui-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg></span>
          <div class="ms-ui-row-main">
          <b style="display:block;font-size:12px;margin-top:6px">${msEsc(e.title)}</b>
          <span style="font-size:10px;color:var(--muted)">${e.time?e.time:'Celý den'}</span>
          ${authorBadge(e.author)}
          </div>
          ${actionBadges('edit-ev','del-ev', e.id)}
        </div>`).join('');

      plannedGrid.innerHTML = dayPlanned.map(t=>`
        <div class="ms-ui-row calendar-v2-card ms-kind-planned planned-expense-card" data-id="${t.id}" style="border-left:3px solid var(--ms-planned);cursor:pointer">
          <span class="ms-ui-icon" style="color:var(--ms-planned)">${typeof msStageIconSvg==='function' ? msStageIconSvg(t.stage,18) : '₭'}</span>
          <div class="ms-ui-row-main">
            <b style="display:block;font-size:12px">${msEsc(t.title||'Plánovaný výdaj')}</b>
            <span style="font-size:10px;color:var(--muted)">Deadline · ${Number(t.amount||0).toLocaleString('cs-CZ')} Kč</span>
          </div>
        </div>`).join('');

      plannedGrid.querySelectorAll('.planned-expense-card').forEach(el=>{
        el.addEventListener('click',()=>Router.go('expense-add',{edit:el.dataset.id,back:'calendar'}));
      });

      taskGrid.innerHTML = dayTasks.map(t=>{
        const vis = msTaskVisibleOn(t, selectedDate, todayIso);
        // (13.8.2026) Stejna znacka jako v seznamu Ukolu - pocitana na
        // jednom miste (msTaskZnacka), aby se obe obrazovky nerozesly.
        const znacka = msTaskZnackaHtml(t, todayIso);
        const borderColor = t.done ? 'var(--line)' : msTaskZnacka(t, todayIso).barva;
        const overdue = !t.done && t.date && t.dateMode!=='none' && t.date<todayIso;
        return `
        <div class="ms-ui-row calendar-v2-card ${t.dateMode==='deadline'?'ms-kind-deadline':(t.dateMode==='none'||!t.date?'ms-kind-undated':'ms-kind-date')} ${overdue?'is-overdue':''}" style="${t.done?'opacity:.6':''}">
          <span class="task-check" data-id="${t.id}" style="width:18px;height:18px;border:1px solid ${t.done?'#ff9b32':'var(--line)'};background:${t.done?'#ff9b32':'transparent'};display:grid;place-items:center;cursor:pointer;border-radius:var(--radius)">${t.done?'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#04070f" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>':''}</span>
          <div class="ms-ui-row-main">
          <b style="display:block;font-size:12px;margin-top:6px;text-decoration:${t.done?'line-through':'none'};color:${t.done?'var(--muted)':'#fff'}">${msEsc(t.title)}</b>
          ${znacka}
          ${authorBadge(t.author)}
          </div>
          ${actionBadges('edit-task','del-task', t.id)}
        </div>`;
      }).join('');

      if(dayEvents.length===0 && dayTasks.length===0 && dayPlanned.length===0){
        eventGrid.style.display = 'none'; taskGrid.style.display = 'none'; plannedGrid.style.display='none';
        eventsLabel.style.display = 'none'; tasksLabel.style.display = 'none'; plannedLabel.style.display='none';
        if(!container.querySelector('#dayEmptyMsg')){
          eventsLabel.insertAdjacentHTML('beforebegin', '<p class="empty-msg" id="dayEmptyMsg">Žádné události ani úkoly tento den.</p>');
        }
      } else {
        const old = container.querySelector('#dayEmptyMsg');
        if(old) old.remove();
      }

      container.querySelectorAll('.edit-ev').forEach(el=>{
        el.addEventListener('click', ()=> Router.go('event-add', {eventId: el.dataset.id}));
      });
      container.querySelectorAll('.del-ev').forEach(el=>{
        el.addEventListener('click', async ()=>{
          if(!await Layout.confirmDialog('Smazat tuhle událost?', 'Smazat')) return;
          msDeleteEvent(el.dataset.id); draw();
        });
      });
      container.querySelectorAll('.task-check').forEach(el=>{
        el.addEventListener('click', (e)=>{
          e.stopPropagation();
          // (13.8.2026) Hledalo se jen mezi ukoly VYBRANEHO DNE. Od
          // zavedeni prouzku "Bez termínu" jsou na obrazovce i ukoly,
          // ktere k zadnemu dni nepatri - na tech by odskrtnuti spadlo.
          const t = dayTasks.find(x=>x.id===el.dataset.id) || tasks.find(x=>x.id===el.dataset.id);
          if(!t) return;
          const nowDone = !t.done;
          // OPRAVA (14.8.2026): drive se ukladalo jen doneDate (DEN, bez casu).
          // Aktuality si musely cas SPLNENI odhadovat jako konec dne (23:59) -
          // splneny ukol tak byl v budoucnosti oproti vsemu, co jsi udelal
          // POZDEJI ten samy den, a zustaval navzdy nahore bez ohledu na to,
          // co jsi pak jeste zapsal. doneAt nese presny okamzik.
          msUpdateTask(t.id, { done: nowDone, doneDate: nowDone ? todayIso : null, doneAt: nowDone ? Date.now() : null }); draw();
        });
      });
      container.querySelectorAll('.edit-task').forEach(el=>{
        el.addEventListener('click', ()=> Router.go('task-add', {taskId: el.dataset.id}));
      });
      container.querySelectorAll('.del-task').forEach(el=>{
        el.addEventListener('click', async ()=>{
          if(!await Layout.confirmDialog('Smazat tenhle úkol?', 'Smazat')) return;
          msDeleteTask(el.dataset.id); draw();
        });
      });

      renderAllEvents(events);
    }

    function renderAllEvents(events){
      const wrap = container.querySelector('#allEvents');
      const todayIso = msDateToIso(today);
      const upcoming = events.filter(e=>e.date>=todayIso).sort((a,b)=>a.date.localeCompare(b.date));
      if(upcoming.length===0){ wrap.innerHTML = msEmptyState({icon:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="1"/><path d="M8 2v4M16 2v4M3 10h18"/></svg>`, color:'#25e8ff',
        title:'Žádné nadcházející události',
        text:'Zapiš si sem betonáž, dodávku materiálu nebo kontrolu dozoru, ať na ně nezapomeneš.',
        hints:['Termíny dodávek','Kontroly a revize','Schůzky s řemeslníky']}); return; }
      const nextId = upcoming[0].id;
      wrap.innerHTML = upcoming.map(e=>{
        const d = new Date(e.date+'T00:00:00');
        return `<div class="upcoming-ev" data-date="${e.date}" style="display:flex;align-items:center;gap:10px;border:1px solid var(--line);padding:9px;margin-bottom:6px;cursor:pointer">
          <div style="width:38px;height:38px;border:1px solid #25b7ff;border-radius:var(--radius);display:flex;flex-direction:column;align-items:center;justify-content:center;flex:0 0 auto;color:#25b7ff">
            <b style="font-size:13px;line-height:1">${d.getDate()}</b><span style="font-size:7px;text-transform:uppercase">${MONTHS[d.getMonth()].slice(0,3)}</span>
          </div>
          <div style="flex:1;min-width:0"><b style="display:block;font-size:12px">${msEsc(e.title)}</b><span style="font-size:10px;color:var(--muted)">${e.time?e.time:'Celý den'}</span></div>
          ${e.id===nextId ? '<span style="font-size:8px;font-weight:800;color:#4dffab;border:1px solid #4dffab;padding:2px 5px;border-radius:var(--radius);flex:0 0 auto">Nejbližší</span>' : ''}
        </div>`;
      }).join('');
      wrap.querySelectorAll('.upcoming-ev').forEach(el=>{
        el.addEventListener('click', ()=>{
          const d = new Date(el.dataset.date+'T00:00:00');
          selectedDate = el.dataset.date; viewYear = d.getFullYear(); viewMonth = d.getMonth();
          draw();
          container.closest('.screen-scroll').scrollTop = 0;
        });
      });
    }
    draw();
    return { activeTab:'calendar' };
  }
  return { render };
})();
Router.register('calendar', CalendarScreen);
