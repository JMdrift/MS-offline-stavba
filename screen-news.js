/* ==========================================================
   AKTUALITY (7.8.2026)
   Samostatna obrazovka se seznamem poslednich ukonu na stavbe.
   Zdrojem je msRecentActivity() z data.js - tentyz vypocet, jaky
   pouziva dlazdice na Dashboardu, aby si to nemohlo odporovat.
   Vetsina radku se sklada z existujicich dat; zmeny stavu etap maji
   navic malou vlastni historii, protoze jinak nemaji zadny casovy zaznam.
   ========================================================== */
const NewsScreen = (function(){

  const FILTERS = [
    { key:'vse',      label:'Vše' },
    { key:'Deník',    label:'Deník' },
    { key:'Galerie',  label:'Fotky' },
    { key:'penize',   label:'Peníze' },
    { key:'Kalendář', label:'Kalendář' },
    { key:'Úkol',     label:'Úkoly' },
    { key:'Etapa',    label:'Etapy' },
  ];
  let activeFilter = 'vse';

  function dayLabel(iso){
    if(!iso) return 'Bez data';
    const today = new Date(); today.setHours(0,0,0,0);
    const d = new Date(iso+'T00:00:00');
    const diff = Math.round((today - d) / 86400000);
    if(diff === 0) return 'Dnes';
    if(diff === 1) return 'Včera';
    if(diff > 1 && diff < 7) return 'Před ' + diff + ' dny';
    return d.getDate()+'. '+(d.getMonth()+1)+'. '+d.getFullYear();
  }
  function dateCz(iso){
    if(!iso) return '';
    const d = new Date(iso+'T00:00:00');
    return d.getDate()+'. '+(d.getMonth()+1)+'. '+d.getFullYear();
  }

  function render(container){
    container.innerHTML = `
      <div class="topbar ms-ui-topbar news-v2-topbar">
        <div class="back-btn" id="backBtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></div>
        <div class="ms-ui-title"><p>Přehled změn</p><h1>Aktuality</h1></div>
      </div>
      <div class="screen-scroll news-v2-scroll">
        <div class="news-v2-hero">
          <div><p>Co se děje na stavbě</p><h2>Poslední změny</h2><span>Deník, fotky, finance i termíny na jednom místě</span></div>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>
        </div>
        <div id="newsFilters" class="news-v2-filters"></div>
        <div id="newsList"></div>
      </div>
    `;

    container.querySelector('#backBtn').addEventListener('click', ()=> Router.back());
    drawFilters();
    draw();

    function drawFilters(){
      const bar = container.querySelector('#newsFilters');
      bar.innerHTML = FILTERS.map(f=>`
        <button class="news-filter${activeFilter===f.key?' is-active':''}" data-key="${f.key}">${f.label}</button>`).join('');
      bar.querySelectorAll('.news-filter').forEach(b=>{
        b.addEventListener('click', ()=>{ activeFilter = b.dataset.key; drawFilters(); draw(); });
      });
    }

    function draw(){
      const list = container.querySelector('#newsList');
      let items = msRecentActivity();

      if(activeFilter === 'penize'){
        items = items.filter(i => i.kind === 'Výdaj' || i.kind === 'Vklad');
      } else if(activeFilter !== 'vse'){
        items = items.filter(i => i.kind === activeFilter);
      }

      if(!items.length){
        list.innerHTML = (activeFilter === 'vse'
        ? msEmptyState({icon:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h13v14H4z"/><path d="M17 9h3v8a2 2 0 0 1-3 1.7"/><path d="M7 9h7M7 13h7"/></svg>`, color:'var(--add-color)',
            title:'Zatím se nic nestalo',
            text:'Jakmile něco zapíšeš - výdaj, fotku, zápis v deníku - objeví se to tady.',
            hints:['Poslední zápisy z deníku','Přidané fotky','Výdaje a vklady']})
        : msEmptyState({kind:'filter', title:'V téhle kategorii nic není',
            text:'Zkus přepnout na jiný filtr nebo na Vše.'}));
        return;
      }

      // seskupeni po dnech, at je videt rytmus stavby
      let html = '', lastDay = null;
      /* (31.8.2026) Castka u financnich polozek. V datech uz byla
         (viz msNewsItems v data.js), jen ji tenhle vypis ignoroval -
         clovek videl "Vydaj: Beton" a musel klikat, aby zjistil za
         kolik. Vklad se znamenkem plus a zelene, vydaj s minusem. */
      const castka = (i)=>{
        const c = Number(i.amount||0);
        if(!c) return '';
        const barva = i.income ? 'var(--money-pos)' : 'var(--muted)';
        const znak = i.income ? '+' : '−';
        return ` <span style="color:${barva};font-weight:700">· ${znak}${c.toLocaleString('cs-CZ')} Kč</span>`;
      };

      items.forEach(i=>{
        const day = i.date || '';
        if(day !== lastDay){
          lastDay = day;
          html += `<div class="news-v2-day"><b>${dayLabel(day)}</b><span>${dateCz(day)}</span></div>`;
        }
        html += `
          <div class="news-row news-v2-row" data-route="${i.route}" style="--news-color:${i.color}">
            <span class="news-v2-kind"><i></i></span>
            <div class="news-v2-copy">
              <b>${msEsc(i.text)}</b>
              <span>${i.kind}${castka(i)}</span>
            </div>
            <svg class="news-v2-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>
          </div>`;
      });
      list.innerHTML = html;

      list.querySelectorAll('.news-row').forEach(el=>{
        el.addEventListener('click', ()=> Router.go(el.dataset.route));
      });
    }

    return { activeTab:'', showNav:true };
  }

  return { render };
})();

Router.register('news', NewsScreen);
