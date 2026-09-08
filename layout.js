/* ==========================================================
   LAYOUT
   Vsechno, co je spolecne pro (skoro) kazdou obrazovku, na
   jednom miste: spodni navigace, radialni rychle pridani a
   potvrzovaci dialog (nahrazuje prohlizecovy confirm() - stejny
   vzhled a chovani uplne vsude, misto ruzneho confirm() textu
   kopirovaneho do kazde obrazovky zvlast).
   ========================================================== */
const Layout = (function(){
  const nav = document.getElementById('bottom-nav');

  nav.querySelectorAll('.nav-item[data-route]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      if(btn.dataset.locked === '1'){
        if(typeof msShowAccessDenied === 'function') msShowAccessDenied();
        return;
      }
      setQaOpen(false);
      Router.go(btn.dataset.route);
    });
  });

  function applyNav(activeTab, show){
    nav.hidden = !show;
    nav.querySelectorAll('.nav-item[data-route]').forEach(btn=>{
      btn.classList.toggle('active', btn.dataset.route === activeTab);
      // Prava (2.8.2026) - "zamek misto mizeni": polozky dolni navigace,
      // do kterych pozvany nema pristup, zustavaji na miste (appka bez
      // nich vypada rozbite/nekompletni), ale jsou ztlumene a kliknuti
      // na ne appka nikam neposle, jen ukaze hlasku (viz vyse). Etapy a
      // Domu zustavaji vzdy plne funkcni.
      // Rozsireno (7.8.2026) spolu s dvouradkovou navigaci - v menu
      // je ted devet sekci, takze zamek musi platit i pro ty nove.
      // Domu, Etapy a Sdileni zustavaji vzdy pristupne.
      const routeToSection = { diary:'denik', project:'projekt', finance:'finance',
                               gallery:'fotky', calendar:'kalendar', tasks:'kalendar' };
      const sec = routeToSection[btn.dataset.route];

      if(sec && typeof msCanViewSection === 'function'){
        const locked = !msCanViewSection(sec);
        btn.dataset.locked = locked ? '1' : '0';
        btn.style.opacity = locked ? '.35' : '';
        let badge = btn.querySelector('.nav-lock-badge');
        if(locked && !badge){
          btn.style.position = 'relative';
          badge = document.createElement('span');
          badge.className = 'nav-lock-badge';
          badge.style.cssText = 'position:absolute;top:-2px;right:6px;width:12px;height:12px;color:var(--muted);display:grid;place-items:center';
          badge.innerHTML = (typeof msLockIconSvg === 'function') ? msLockIconSvg(12) : '';
          btn.appendChild(badge);
        } else if(!locked && badge){
          badge.remove();
        }
      }
    });
  }

  /* ---------- rychle pridani (radialni menu) ---------- */
  const qaBackdrop = document.getElementById('quick-add-backdrop');
  const qaRadial = document.getElementById('quick-add-radial');
  const qaSats = [...qaRadial.querySelectorAll('.qa-sat')];
  const R = 108, ANGLES = [-72,-36,0,36,72];
  qaSats.forEach((el,i)=>{
    const rad = ANGLES[i] * Math.PI/180;
    el.style.setProperty('--tx', (R*Math.sin(rad)) + 'px');
    el.style.setProperty('--ty', (-R*Math.cos(rad)) + 'px');
    el.style.transitionDelay = (i*0.03) + 's';
  });
  let qaOpen = false;
  const QA_TARGET_TO_SECTION = { 'expense-add':'finance', 'diary-add':'denik', 'event-add':'kalendar', 'photo-add':'fotky', 'task-add':'kalendar' };
  function setQaOpen(v){
    qaOpen = v;
    qaBackdrop.hidden = false; qaRadial.hidden = false;
    qaBackdrop.classList.toggle('open', v);
    qaRadial.classList.toggle('open', v);
    if(v){
      // Prava (2.8.2026) - "zamek misto mizeni": satelity bez prava
      // pridavat zustavaji na miste, jen ztlumene s male znackou zamku,
      // klik ukaze hlasku misto aby appka poslala na formular, ktery
      // by stejne pri ulozeni tise selhal.
      qaSats.forEach(el=>{
        const sec = QA_TARGET_TO_SECTION[el.dataset.target];
        const allowed = !sec || typeof msCanAddSection !== 'function' || msCanAddSection(sec);
        el.dataset.locked = allowed ? '0' : '1';
        el.style.opacity = allowed ? '' : '.35';
        let badge = el.querySelector('.qa-lock-badge');
        if(!allowed && !badge){
          // OPRAVA (2.8.2026): drivejsi "el.style.position = 'relative'"
          // tady prepisovalo CSS pravidlo .qa-sat{position:absolute},
          // ktere satelitu drzi jeho misto ve vejiri (pocitane pres
          // --tx/--ty). Jakmile appka jednou nastavila 'relative', satelit
          // vypadl z vejire do normalniho toku obsahu - a protoze se to
          // nikde nevracelo zpet, zustal rozbity i po pozdejsim odemknuti.
          // .qa-sat uz ma position:absolute z CSS, takze zamkova ikonka
          // (sama position:absolute) se srovna spravne bez jakehokoli
          // zasahu do pozice samotneho satelitu.
          //
          // VYLEPSENI (2.8.2026): zamek drive byl jen maly odznak v rohu
          // (spatne citelny, tezko rozpoznatelny symbol). Ted prekryva
          // CELE kolecko tlacitko (.qa-btn) - polozen jako jeho DITE (ne
          // ditě .qa-sat), takze nijak neovlivnuje pozici satelitu ve
          // vejiri. .qa-btn samo o sobe nema position:relative v CSS, ale
          // nastavit ho tady je bezpecne - na rozdil od .qa-sat nedrzi
          // .qa-btn zadnou vlastni absolutni pozici, ktera by se tim dala
          // rozbit.
          const btnEl = el.querySelector('.qa-btn');
          if(btnEl) btnEl.style.position = 'relative';
          badge = document.createElement('span');
          badge.className = 'qa-lock-badge';
          badge.style.cssText = 'position:absolute;inset:0;border-radius:50%;background:rgba(2,4,10,.8);color:#fff;display:grid;place-items:center';
          badge.innerHTML = (typeof msLockIconSvg === 'function') ? msLockIconSvg(22) : '';
          (btnEl || el).appendChild(badge);
        } else if(allowed && badge){
          badge.remove();
        }
      });
    }
    qaSats.forEach(el=>{
      el.style.transform = v
        ? 'translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1)'
        : 'translate(-50%,-50%) scale(.3)';
    });
  }
  document.getElementById('navAddBtn').addEventListener('click', ()=> setQaOpen(!qaOpen));
  qaBackdrop.addEventListener('click', ()=> setQaOpen(false));
  qaSats.forEach(el=>{
    el.addEventListener('click', ()=>{
      if(el.dataset.locked === '1'){ if(typeof msShowAccessDenied === 'function') msShowAccessDenied(); return; }
      setQaOpen(false);
      // OPRAVA (2.8.2026): centralni "+" drive vzdy otviralo formular bez
      // jakehokoli kontextu, i kdyz byl clovek prave na detailu konkretni
      // etapy (nebo na Deniku/Galerii/Vydajich filtrovanych na jednu
      // etapu) - zaznam se pak "nepripsal" ke spravne etape. Ted appka
      // pro formulare, kde to dava smysl, preda etapu z aktualni
      // obrazovky dal.
      const STAGE_AWARE_TARGETS = { 'diary-add':1, 'expense-add':1, 'photo-add':1 };
      const target = el.dataset.target;
      const curParams = (typeof Router !== 'undefined' && Router.getParams) ? Router.getParams() : {};
      const curStage = curParams.stage || curParams.key || null;
      const params = (STAGE_AWARE_TARGETS[target] && curStage && curStage !== 'all') ? { stage: curStage } : {};
      Router.go(target, params);
    });
  });

  /* ---------- potvrzovaci dialog (misto prohlizeoveho confirm()) ---------- */
  const confirmOverlay = document.getElementById('confirm-overlay');
  const confirmMessage = document.getElementById('confirm-message');
  const confirmOkBtn = document.getElementById('confirm-ok-btn');
  const confirmCancelBtn = document.getElementById('confirm-cancel-btn');

  function confirmDialog(message, okLabel, cancelLabel){
    return new Promise(resolve=>{
      confirmMessage.textContent = message;
      confirmOkBtn.textContent = okLabel || 'Potvrdit';
      confirmCancelBtn.textContent = cancelLabel || 'Zrušit';
      confirmOverlay.classList.add('open');
      function cleanup(result){
        confirmOverlay.classList.remove('open');
        confirmOkBtn.removeEventListener('click', onOk);
        confirmCancelBtn.removeEventListener('click', onCancel);
        resolve(result);
      }
      function onOk(){ cleanup(true); }
      function onCancel(){ cleanup(false); }
      confirmOkBtn.addEventListener('click', onOk);
      confirmCancelBtn.addEventListener('click', onCancel);
    });
  }

  /* (31.8.2026) Jednotlacitkove okno - jen oznameni, neni co potvrzovat.
     Doted appka pro tenhle pripad nemela nic a pouzival se systemovy
     alert(), ktery v nativni appce vypada cize. Stavi na stejnem
     okne jako confirmDialog, jen schova tlacitko Zrusit. */
  function alertDialog(message, okLabel){
    const puvodniDisplay = confirmCancelBtn.style.display;
    confirmCancelBtn.style.display = 'none';
    return confirmDialog(message, okLabel || 'Rozumím', '').then(v=>{
      confirmCancelBtn.style.display = puvodniDisplay;
      return v;
    });
  }

  /* ZMENA (7.8.2026): svetly motiv "sketch" byl z appky odstranen vcetne
     26 svetlych obrazku etap a house-sketch.jpg (dohromady 6,8 MB).
     Appka je natrvalo tmava. Funkce zustavaji kvuli volajicim, ale
     vraceji vzdy jednu hodnotu - a pripadnou starou volbu ulozenou
     v telefonu prepisou, aby nikdo neuvizl v neexistujicim motivu. */
  function getTheme(){ return 'sketch-dark'; }
  function applyTheme(){
    document.documentElement.setAttribute('data-theme', 'sketch-dark');
    try{ localStorage.setItem('ms_theme_v1', 'sketch-dark'); }catch(e){}
  }

  // Sdilena "sourodá paleta" pro Skica motiv: cerna -> cihlova -> bila
  // podle pozice v rade (idx/total). Puvodne existovala jen na kolotoci
  // etap (screen-stagesWheel.js); ted ji pouziva i seznam etap a mrizka
  // pri zakladani nove etapy, aby vsechny obrazovky s etapami pusobily
  // jako jeden sourody celek a barva se "netrhala" az u fotky v detailu.
  function hexToRgb(hex){ const n=parseInt(hex.replace('#',''),16); return {r:(n>>16)&255,g:(n>>8)&255,b:n&255}; }
  function mixRgb(c1,c2,t){ return `rgb(${Math.round(c1.r+(c2.r-c1.r)*t)},${Math.round(c1.g+(c2.g-c1.g)*t)},${Math.round(c1.b+(c2.b-c1.b)*t)})`; }
  // svetla Skica konci v bile, nocni Skica (zatim skryta, viz app.css)
  // konci v teple jantarove - bila by na tmavem pozadi pusobila cize
  const GRAD_STOPS_LIGHT = ['#1d1e1c', '#a8503c', '#ffffff'].map(hexToRgb);
  const GRAD_STOPS_DARK = ['#1d1a17', '#c8562f', '#e0a05a'].map(hexToRgb);
  function themedGradientColor(idx, total){
    const stops = document.documentElement.dataset.theme === 'sketch-dark' ? GRAD_STOPS_DARK : GRAD_STOPS_LIGHT;
    if(total<=1) return `rgb(${stops[1].r},${stops[1].g},${stops[1].b})`;
    const t = idx/(total-1);
    return t<0.5 ? mixRgb(stops[0], stops[1], t*2) : mixRgb(stops[1], stops[2], (t-0.5)*2);
  }

  /* ============================================================
     PRUH SE STAHOVANIM (11.8.2026)
     Po prijeti pozvanky se stahuje cela stavba. U male stavby je to
     par vterin, u velke (nekolik tisic fotek) klidne desitky minut -
     drzet cloveka na jedne obrazovce a nechat ho cekat nema smysl.
     Appka ho proto puti rovnou dovnitr a stav stahovani ukazuje
     tenhle pruh. Je pripojeny primo na <body>, takze prezije
     prepinani obrazovek i prekresleni.
     Zamerne se necha zavrit: kdo uz to nechce videt, klepne na
     krizek - stahovani bezi dal.
     ============================================================ */
  const SyncBar = (function(){
    let el = null, hideTimer = null, zavreno = false;

    function ensure(){
      if(el && el.isConnected) return el;
      el = document.createElement('div');
      el.id = 'ms-sync-bar';

      // POZOR: #bottom-nav neni fixni, je soucasti flex sloupce. Pruh
      // proto nesmi byt position:fixed u spodni hrany - prekryl by
      // navigaci a clovek by se nikam neproklikal. Vlozime ho jako
      // sourozence TESNE NAD navigaci, at se obsah prirozene posune.
      const nav = document.getElementById('bottom-nav');
      if(nav && nav.parentNode){
        el.style.cssText = [
          'flex:0 0 auto','position:relative','z-index:3',
          'background:var(--card-bg-2)','border-top:1.5px solid var(--accent)',
          'padding:11px 14px','font-family:inherit'
        ].join(';');
        nav.parentNode.insertBefore(el, nav);
      } else {
        // Obrazovky bez navigace (napr. prijeti pozvanky) - tam pruh
        // nic nezakryva, takze muze byt u spodni hrany.
        el.style.cssText = [
          'position:fixed','left:0','right:0','bottom:0','z-index:60',
          'background:var(--card-bg-2)','border-top:1.5px solid var(--accent)',
          'padding:11px 14px calc(11px + min(var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)),34px))',
          'font-family:inherit','box-shadow:0 -6px 18px rgba(0,0,0,.35)'
        ].join(';');
        document.body.appendChild(el);
      }
      return el;
    }

    function show(stav){
      if(zavreno) return;
      const box = ensure();
      const { hotovo = 0, celkem = 0, druh = '' } = stav || {};
      const pct = celkem ? Math.round((hotovo / celkem) * 100) : 0;
      const hotovoVse = celkem > 0 && hotovo >= celkem;

      box.innerHTML = `
        <div style="display:flex;align-items:flex-start;gap:10px">
          <div style="flex:1;min-width:0">
            <b style="display:block;font-size:12px;margin-bottom:3px;color:${hotovoVse ? 'var(--money-pos,#4ec9a0)' : 'var(--accent)'}">
              ${hotovoVse ? 'Stavba je stažená' : 'Stahuji stavbu…'}
            </b>
            <div style="font-size:10.5px;color:var(--muted);margin-bottom:7px;line-height:1.45">
              ${hotovoVse
                ? 'Všechno je v telefonu, můžeš appku klidně zavřít.'
                : (celkem
                    ? (druh ? druh.charAt(0).toUpperCase() + druh.slice(1) + ' — ' : '') + hotovo + ' z ' + celkem + ' · <b style="color:var(--text-main)">nezavírej appku</b>, může to pár minut trvat'
                    : 'Připravuji…')}
            </div>
            <div style="height:4px;background:var(--line);overflow:hidden">
              <div style="height:100%;width:${pct}%;background:${hotovoVse ? 'var(--money-pos,#4ec9a0)' : 'var(--accent)'};transition:width .3s"></div>
            </div>
          </div>
          <span id="msSyncClose" style="flex:0 0 24px;width:24px;height:24px;display:grid;place-items:center;color:var(--muted);cursor:pointer;font-size:17px;line-height:1;margin-top:-2px">×</span>
        </div>`;

      const close = box.querySelector('#msSyncClose');
      if(close) close.addEventListener('click', ()=>{ zavreno = true; hide(); });

      // Az bude hotovo, necha se hlaska chvili videt a pak zmizi sama.
      if(hotovoVse){
        clearTimeout(hideTimer);
        hideTimer = setTimeout(hide, 4000);
      }
    }

    function hide(){
      clearTimeout(hideTimer);
      if(el && el.parentNode) el.parentNode.removeChild(el);
      el = null;
    }

    // Kdyz appka prekresli navigaci, pruh by zustal viset mimo strukturu.
    // Proto se pri kazdem posunu overuje, jestli je jeste na svem miste
    // (viz el.isConnected v ensure) - a kdyz neni, vyrobi se znovu.


    // Nova synchronizace = pruh se smi zase ukazat, i kdyz ho clovek
    // minule zavrel.
    function reset(){ zavreno = false; }

    return { show, hide, reset };
  })();

  /* ============================================================
     POTVRZENI USPESNEHO PRIDANI (14.8.2026, prepracovano na celou
     obrazovku po zpetne vazbe - puvodni maly pruh dole byl snadno
     prehlednutelny/nenapadny). Vzor jako potvrzeni platby na webu:
     kruh se zelenou fajfkou uprostred cele obrazovky, fajfka se
     "kresli" tahem, pak kratce podrzi a zmizi. Klepnutim kamkoliv
     jde zavrit driv (kdyz clovek pridava vic veci rychle za sebou).
     Pouziti se NEMENI: Layout.showSuccess('Zápis uložen'). */
  function showSuccess(text){
    try{
      const stary = document.getElementById('ms-success-toast');
      if(stary) stary.remove();
      const el = document.createElement('div');
      el.id = 'ms-success-toast';
      el.style.cssText = 'position:fixed;inset:0;z-index:97;background:var(--bg-deep,#191919);'
        + 'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;'
        + 'animation:msSuccessFadeIn .18s ease-out;cursor:pointer';
      el.innerHTML = '<span style="width:92px;height:92px;border-radius:50%;background:var(--money-pos,#4ec9a0);'
        + 'display:grid;place-items:center;animation:msSuccessPop .32s cubic-bezier(.2,1.4,.4,1)">'
        + '<svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#04070f" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">'
        + '<path d="M5 13l4 4L19 7" stroke-dasharray="24" stroke-dashoffset="24" style="animation:msSuccessDraw .32s .18s ease-out forwards"/></svg></span>'
        + '<span style="font-size:15px;color:var(--text-main);font-weight:700;text-align:center;padding:0 30px;opacity:0;animation:msSuccessTextIn .25s .3s ease-out forwards">'
        + (typeof msEsc === 'function' ? msEsc(text) : text) + '</span>';
      const zavrit = ()=>{
        if(!el.parentNode) return;
        el.style.transition = 'opacity .25s';
        el.style.opacity = '0';
        setTimeout(()=> el.remove(), 260);
      };
      el.addEventListener('click', zavrit); // klepnutim zavrit driv, kdyz spechame
      document.body.appendChild(el);
      setTimeout(zavrit, 1350);
    }catch(e){}
  }
  try{
    if(!document.getElementById('msSuccessStyle')){
      const st = document.createElement('style');
      st.id = 'msSuccessStyle';
      st.textContent = '@keyframes msSuccessFadeIn{ from{ opacity:0 } to{ opacity:1 } }'
        + '@keyframes msSuccessPop{ from{ transform:scale(.4); opacity:0 } to{ transform:scale(1); opacity:1 } }'
        + '@keyframes msSuccessDraw{ to{ stroke-dashoffset:0 } }'
        + '@keyframes msSuccessTextIn{ from{ opacity:0; transform:translateY(6px) } to{ opacity:1; transform:translateY(0) } }';
      document.head.appendChild(st);
    }
  }catch(e){}

  return { applyNav, confirmDialog, alertDialog, closeQuickAdd(){ setQaOpen(false); }, getTheme, applyTheme, themedGradientColor, SyncBar, showSuccess };
})();


/* ==========================================================
   VYSUNUTY VYBER ETAPY (7.8.2026)
   Obrazovky (Denik, Finance, Galerie) si samy prepinaji tridu
   'open' na svem .dd-panel - to zustava. Tady se jen hlida
   ztmavene pozadi a zavirani ťuknutim vedle, aby to nemusela
   resit kazda obrazovka zvlast.
   ========================================================== */
(function(){
  function backdrop(){ return document.getElementById('dd-backdrop'); }

  /* OPRAVA (8.8.2026): panel se vysouval uvnitr #app-content, na kterem
     sedi "zoom" z volby velikosti zobrazeni. Zoom vytvori vlastni
     vykreslovaci vrstvu, takze z-index panelu platil jen uvnitr ni a
     ztmavene pozadi (o uroven vys) mu lezelo pres obsah - ťuknuti na
     etapu trefilo pozadi, panel se zavrel a nic se nestalo.
     Reseni: pri otevreni panel presuneme do #app-frame, tedy ven ze
     zoomovane vrstvy. Obrazovky si na nej drzi odkaz v promenne,
     takze presun v DOM jim nevadi. */
  function liftPanels(){
    const frame = document.getElementById('app-frame');
    if(!frame) return;
    document.querySelectorAll('.dd-panel.open').forEach(p=>{
      if(p.parentNode !== frame) frame.appendChild(p);
    });
  }

  function sync(){
    const bd = backdrop(); if(!bd) return;
    liftPanels();
    const open = !!document.querySelector('.dd-panel.open');
    bd.classList.toggle('open', open);
  }
  function closeAll(){
    document.querySelectorAll('.dd-panel.open').forEach(p=> p.classList.remove('open'));
    const bd = backdrop();
    if(bd) bd.classList.remove('open');
  }

  /* Pri prechodu na jinou obrazovku se stary panel musi z ramu odstranit -
     obrazovka, ktera ho vytvorila, uz neexistuje. */
  function dropOrphanPanels(){
    const frame = document.getElementById('app-frame');
    if(!frame) return;
    frame.querySelectorAll(':scope > .dd-panel').forEach(p=> p.remove());
  }
  document.addEventListener('click', function(e){
    if(e.target === backdrop()){ closeAll(); return; }
    // Po kliknuti uz si obrazovka tridu 'open' prehodila sama, takze se
    // pozadi jen srovna podle skutecneho stavu. Zamerne to nezkoumá, KAM
    // se kliklo - nektere panely (treba prepinac projektu) se zaviraji
    // i jinudy nez pres .dd-item a pozadi by pak zustalo viset.
    setTimeout(sync, 0);
  }, true);
  // pri prechodu na jinou obrazovku nesmi zustat viset ztmavene pozadi
  window.addEventListener('hashchange', ()=>{ closeAll(); dropOrphanPanels(); });
})();


/* ==========================================================
   PRAZDNE STAVY (7.8.2026)
   Appka mela dva druhy prazdna: bohatou kartu (Denik, Projekt)
   a holou sedou vetu ".empty-msg" na patnacti dalsich mistech.
   Prazdna appka pak vypadala jako rozbita, ne jako nova.

   msEmptyState() sjednocuje ten bohatsi tvar do jedne funkce.
   Rozlisuje dva pripady, protoze potrebuji opacnou reakci:
     'new'    - jeste nic nezalozeno -> ikona +, vyzva, napovedy
     'filter' - data existuji, jen je schoval filtr -> nabidnout
                zruseni filtru, NE zakladani noveho zaznamu
   ========================================================== */
function msEmptyState(opt){
  const o = opt || {};
  const kind = o.kind || 'new';
  const color = o.color || 'var(--add-color)';

  if(kind === 'filter'){
    return `<div class="ms-empty" style="text-align:center;padding:34px 20px">
      <div style="width:38px;height:38px;border:1px solid var(--line);color:var(--muted);margin:0 auto 12px;display:grid;place-items:center;border-radius:var(--radius)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h18l-7 8v6l-4 2v-8z"/></svg>
      </div>
      <b style="display:block;font-size:14px;margin-bottom:5px">${msEsc(o.title || 'Nic neodpovídá filtru')}</b>
      <span style="display:block;font-size:11.5px;color:var(--muted);line-height:1.5">${msEsc(o.text || 'Zkus vybrat jinou etapu nebo filtr zrušit.')}</span>
      ${o.actionId ? `<button id="${o.actionId}" style="margin-top:14px;background:none;border:1px solid var(--line);color:var(--text-main);
        font:inherit;font-size:11.5px;font-weight:800;padding:8px 14px;cursor:pointer;border-radius:var(--radius)">${o.actionLabel || 'Zrušit filtr'}</button>` : ''}
    </div>`;
  }

  const hints = (o.hints || []).map(t=>
    `<div style="display:flex;align-items:center;gap:8px;font-size:11px;color:var(--muted)">
       <span style="width:4px;height:4px;border-radius:50%;background:var(--muted);flex:0 0 auto"></span>${t}</div>`).join('');

  return `<div class="ms-empty" style="padding:2px 0">
    <div ${o.actionId ? `id="${o.actionId}"` : ''} style="margin:6px 0;padding:26px 20px 20px;text-align:center;border:1px dashed var(--line);${o.actionId?'cursor:pointer':''};border-radius:var(--radius)">
      <div style="width:44px;height:44px;border:1px solid ${color};color:${color};margin:0 auto 12px;display:grid;place-items:center;border-radius:var(--radius)">
        ${o.icon || '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>'}
      </div>
      <b style="display:block;font-size:15px;margin-bottom:6px">${msEsc(o.title || 'Zatím prázdno')}</b>
      <span style="display:block;font-size:11.5px;color:var(--muted);line-height:1.5">${msEsc(o.text || '')}</span>
    </div>
    ${hints ? `<div style="display:flex;flex-direction:column;gap:6px;margin:12px 0 14px;padding:0 6px">${hints}</div>` : ''}
  </div>`;
}


/* ==========================================================
   UKAZATEL ROZPOCTU NAHRANI (8.8.2026)
   Pruh, ktery se plni, a text, ktery ODPOCITAVA, kolik jeste
   zbyva - jak v MB, tak v pocitu fotek. Kdyz uzivatel nevidi
   dopredu, kde je strop, dozvi se to az hlaskou na konci, coz
   je pozde. Pouzivaji to oba formulare (fotky i denik), proto
   je to tady a ne dvakrat opsane.
   ========================================================== */
function msBudgetGaugeHtml(id){
  return `<div id="${id}" style="margin:0 0 10px">
    <div style="height:5px;background:var(--card-bg-2);border:1px solid var(--line);overflow:hidden">
      <div class="bg-fill" style="height:100%;width:0%;background:var(--money-pos);transition:width .2s ease"></div>
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:10px">
      <span class="bg-left" style="color:var(--muted)"></span>
      <span class="bg-count" style="color:var(--muted)"></span>
    </div>
  </div>`;
}

function msQueueInfoUpdate(root, id, photoCount){
  const box = root.querySelector('#' + id);
  if(!box) return;
  if(!photoCount){
    box.querySelector('.bg-fill').style.width = '0%';
    box.querySelector('.bg-left').textContent = '';
    box.querySelector('.bg-count').textContent = '';
    return;
  }
  const per = msApproxPhotoBytes();
  const totalBytes = photoCount * per;
  // Offline ukladani nema pevny blok ani pocetni limit. Pruh je pouze
  // orientacni informace o pripravenem vyberu, ne varovani pred stropem.
  box.querySelector('.bg-fill').style.width = Math.min(100, 18 + photoCount * 4) + '%';
  box.querySelector('.bg-fill').style.background = 'var(--money-pos)';

  box.querySelector('.bg-left').textContent = 'Celkem ~' + msFormatMb(totalBytes);
  box.querySelector('.bg-count').textContent = 'uloží se postupně bez limitu';
}

/* Ukazatel pro zapis do Deniku - tam fotky patri k jednomu zaznamu,
   takze se meri skutecna velikost a limit davky plati. */
function msDiaryBudgetUpdate(root, id, usedBytes){
  const box = root.querySelector('#' + id);
  if(!box) return;
  const limit = MS_UPLOAD_LIMIT_BYTES;
  const left = Math.max(0, limit - usedBytes);
  const pct = Math.min(100, Math.round(usedBytes / limit * 100));
  const fill = box.querySelector('.bg-fill');
  fill.style.width = pct + '%';
  fill.style.background = pct >= 100 ? '#ff6a6a' : (pct > 85 ? '#ff9b32' : 'var(--money-pos)');
  box.querySelector('.bg-left').textContent = usedBytes
    ? (left > 0 ? 'V tomto zápisu zbývá ' + msFormatMb(left) : 'Limit zápisu vyčerpán') : '';
  box.querySelector('.bg-count').textContent = usedBytes
    ? (left > 0 ? 'vejde se ještě ~' + Math.floor(left / msApproxPhotoBytes()) + ' fotek' : 'ulož a přidej dalším zápisem') : '';
}


/* ==========================================================
   PROHLIZEC FOTEK (8.8.2026)
   Pouziva ho detail zapisu v Deniku (zmenseniny se ťuknutim
   rozbali). Je tady, ne v jedne obrazovce, aby ho mohla vzit
   i dalsi mista - typicky nahledy u vydaje nebo u etapy.
   Prejizdeni prstem mezi fotkami, stipnuti pro priblizeni,
   dvojity ťuk pro rychly zoom.
   ========================================================== */
/* Prohlizec fotek se stipnutim a prejizdenim.
   3. parametr (11.8.2026): nepovinne tlacitko dole - potrebuje ho
   zalozka Projekt, kde se u obrazku nabizi "Sdílet". Drive si Projekt
   kreslil vlastni jednoduchy nahled BEZ priblizeni, takze se do vykresu
   nebo revizni zpravy nedalo zoomovat - a prave tam to clovek potrebuje
   nejvic. Tvar: { label, onClick }. */
function msPhotoLightbox(photos, startIdx, akce){
  const list = (photos || []).map(item=>{
    if(!item) return null;
    return typeof item === 'string' ? {src:item,fullId:null} : {src:item.src||item.thumb||null,fullId:item.fullId||item.id||null};
  }).filter(item=>item && (item.src || item.fullId));
  if(!list.length) return;
  let idx = Math.min(Math.max(0, startIdx || 0), list.length - 1);
  let scale = 1, panX = 0, panY = 0;
  let startDist = 0, startScale = 1, startPanX = 0, startPanY = 0, startX = 0, startY = 0;
  let swipeX = 0, swiping = false;

  const ov = document.createElement('div');
  ov.className = 'ms-overlay';
  ov.style.cssText = 'position:fixed;inset:0;background:#04070f;z-index:96;display:flex;flex-direction:column';
  document.body.appendChild(ov);

  function draw(){
    ov.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:calc(14px + var(--safe-area-inset-top, env(safe-area-inset-top, 0px))) 16px 8px">
        <span style="font-size:11px;color:#94a0bc">${idx+1} / ${list.length}</span>
        <div id="lbClose" style="width:32px;height:32px;border:1px solid rgba(255,255,255,.22);display:grid;place-items:center;color:#fff;cursor:pointer">✕</div>
      </div>
      <div id="lbPort" style="flex:1;overflow:hidden;position:relative;touch-action:none">
        <img id="lbImg" src="${list[idx].src||''}" style="position:absolute;top:50%;left:50%;max-width:100%;max-height:100%;object-fit:contain;transform:translate(-50%,-50%) scale(1);user-select:none;-webkit-user-drag:none"/>
      </div>
      <div style="padding:10px 16px calc(16px + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)));text-align:center">
        <div style="font-size:10.5px;color:#5f636b">${list.length > 1 ? 'přejeď prstem na další · ' : ''}štípnutím přiblížíš</div>
        ${akce && akce.label ? `<button id="lbAction" style="width:100%;margin-top:10px;border:1px solid #25b7ff;background:transparent;color:#25b7ff;padding:11px;cursor:pointer;font-family:inherit;font-weight:800;font-size:12.5px">${akce.label}</button>` : ''}
      </div>`;
    scale = 1; panX = 0; panY = 0;
    ov.querySelector('#lbClose').addEventListener('click', close);
    const akceEl = ov.querySelector('#lbAction');
    if(akceEl && akce && typeof akce.onClick === 'function'){
      akceEl.addEventListener('click', (e)=>{ e.stopPropagation(); akce.onClick(); });
    }
    wire();
    // V seznamech se zobrazuje mala miniatura, ale po otevreni musi prijit
    // skutecny original z IndexedDB. Nacte se jen aktualni fotka, takze ani
    // zapis se stovkou snimku nezaplni pamet telefonu najednou.
    const drawIndex=idx;
    if(list[drawIndex].fullId && typeof msPhotoFull === 'function'){
      msPhotoFull(list[drawIndex].fullId).then(full=>{
        if(!full || idx!==drawIndex || !ov.parentNode) return;
        const img=ov.querySelector('#lbImg');
        if(img) img.src=full;
      }).catch(()=>{});
    }
  }
  function close(){ if(ov.parentNode) document.body.removeChild(ov); }
  function apply(){
    const img = ov.querySelector('#lbImg');
    if(img) img.style.transform = `translate(calc(-50% + ${panX}px), calc(-50% + ${panY}px)) scale(${scale})`;
  }
  function dist(t){ return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY); }

  function wire(){
    const port = ov.querySelector('#lbPort');
    let lastTap = 0;

    port.addEventListener('touchstart', e=>{
      if(e.touches.length === 2){
        startDist = dist(e.touches); startScale = scale;
        startPanX = panX; startPanY = panY; swiping = false;
      } else if(e.touches.length === 1){
        startX = e.touches[0].clientX; startY = e.touches[0].clientY;
        startPanX = panX; startPanY = panY;
        swiping = scale <= 1.01; swipeX = 0;
      }
    }, {passive:true});

    port.addEventListener('touchmove', e=>{
      if(e.touches.length === 2 && startDist){
        scale = Math.min(5, Math.max(1, startScale * (dist(e.touches) / startDist)));
        apply(); e.preventDefault();
      } else if(e.touches.length === 1){
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;
        if(scale > 1.01){
          panX = startPanX + dx; panY = startPanY + dy; apply(); e.preventDefault();
        } else if(swiping){
          swipeX = dx;
          const img = ov.querySelector('#lbImg');
          if(img) img.style.transform = `translate(calc(-50% + ${dx}px), -50%) scale(1)`;
        }
      }
    }, {passive:false});

    port.addEventListener('touchend', e=>{
      if(swiping && Math.abs(swipeX) > 60 && list.length > 1){
        idx = (idx + (swipeX < 0 ? 1 : -1) + list.length) % list.length;
        draw(); return;
      }
      if(swiping) apply();
      // dvojity ťuk = priblizit / vratit
      if(e.touches.length === 0 && Math.abs(swipeX) < 10){
        const now = Date.now();
        if(now - lastTap < 300){ scale = scale > 1.01 ? 1 : 2.5; panX = 0; panY = 0; apply(); }
        lastTap = now;
      }
      swiping = false; startDist = 0;
    }, {passive:true});
  }

  draw();
}


/* ==========================================================
   ZNACKA UCTENKY (8.8.2026)
   Ucteneka byla videt jen v uplnem seznamu transakci jako maly
   nahled - na Financich ani ve Vydajich etapy nebylo poznat, ze
   u vydaje vubec je. Tahle znacka je mala a jde pouzit vsude.
   ========================================================== */
function msReceiptBadge(size){
  const n = size || 13;
  return `<span class="ms-receipt" title="Účtenka přiložena" style="display:inline-flex;align-items:center;color:var(--accent);flex:0 0 auto">
    <svg width="${n}" height="${n}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/></svg></span>`;
}

/* ==========================================================
   NAHLED VYDAJE (8.8.2026)
   Driv ťuknuti na vydaj vedlo rovnou do editace - clovek se chtel
   jen podivat a rovnou prepisoval formular. Ted se otevre nahled;
   upravit se da odtud tlacitkem.
   ========================================================== */
/* Rozpis splatek planovaneho vydaje (31.8.2026). Vraci prazdny
   retezec u bezneho vydaje, ktery s zadnym planem nesouvisi -
   detail pak vypada presne jako driv. */
function msPlanBreakdownHtml(t){
  const planId = t.planId || (t.type === 'planned' ? t.id : null);
  if(!planId || typeof msPlanSummary !== 'function') return '';
  const sum = msPlanSummary(planId);
  if(!sum || !sum.splatky.length) return '';

  const kc = n => Number(n||0).toLocaleString('cs-CZ') + ' Kč';
  const den = z => {
    if(z.paidAt){ const d = new Date(z.paidAt); return d.getDate()+'. '+(d.getMonth()+1)+'. '+d.getFullYear(); }
    if(z.date){ const d = new Date(z.date+'T00:00:00'); return d.getDate()+'. '+(d.getMonth()+1)+'. '+d.getFullYear(); }
    return '';
  };

  const poradiPlatby = i => {
    const slova = ['První','Druhá','Třetí','Čtvrtá','Pátá','Šestá','Sedmá','Osmá','Devátá','Desátá'];
    return slova[i] || ((i+1) + '.');
  };

  const radky = sum.splatky.map((z,i)=>`
    <div style="display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-top:1px solid var(--line)">
      <span style="font-size:11.5px;color:${z.id===t.id?'var(--accent)':'var(--muted)'}">
        ${z.id===t.id?'▸ ':''}${poradiPlatby(i)} platba · ${den(z)}</span>
      <span style="font-size:12.5px;font-weight:700">${kc(z.amount)}</span>
    </div>`).join('');

  const stav = sum.uzavreno
    ? `<div style="display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-top:1px solid var(--line)">
         <span style="font-size:11.5px;color:var(--muted)">Zbytek škrtnut</span>
         <span style="font-size:12.5px;font-weight:700;color:var(--muted)">${kc(sum.celkem - sum.zaplaceno)}</span></div>`
    : (sum.zbyva > 0
        ? `<div style="display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-top:1px solid var(--line)">
             <span style="font-size:11.5px;color:#ff9b32">Zbývá doplatit</span>
             <span style="font-size:12.5px;font-weight:800;color:#ff9b32">${kc(sum.zbyva)}</span></div>`
        : `<div style="display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-top:1px solid var(--line)">
             <span style="font-size:11.5px;color:var(--money-pos)">Doplaceno</span>
             <span style="font-size:12.5px;font-weight:700;color:var(--money-pos)">✓</span></div>`);

  return `
    <p style="margin:16px 0 2px;font-size:9px;font-weight:800;letter-spacing:.13em;text-transform:uppercase;color:var(--muted)">
      Historie plateb${sum.uzavreno ? ' · plán uzavřen' : ''}</p>
    <div style="border:1px solid var(--line);padding:0 12px 8px">
      <div style="display:flex;justify-content:space-between;gap:10px;padding:9px 0">
        <span style="font-size:11.5px;color:var(--muted)">Plánováno celkem</span>
        <span style="font-size:12.5px;font-weight:700">${kc(sum.celkem)}</span>
      </div>
      ${radky}
      <div style="display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-top:1px solid var(--line)">
        <span style="font-size:11.5px;color:var(--muted)">Zaplaceno celkem</span>
        <span style="font-size:12.5px;font-weight:800">${kc(sum.zaplaceno)}</span>
      </div>
      ${stav}
    </div>`;
}

function msTxDetail(t, opts){
  const rozpisPlanu = msPlanBreakdownHtml;
  const o = opts || {};
  const st = (typeof msStageByKey === 'function') ? msStageByKey(t.stage) : null;
  const isPlanned = t.type === 'planned';
  const isIncome  = t.type === 'income';
  const barva = isIncome ? 'var(--money-pos)' : (isPlanned ? '#ff9b32' : 'var(--accent)');
  const castka = (isIncome ? '+' : '-') + Number(t.amount||0).toLocaleString('cs-CZ') + ' Kč';
  const datum = t.date ? (()=>{ const d=new Date(t.date+'T00:00:00');
      return d.getDate()+'. '+(d.getMonth()+1)+'. '+d.getFullYear(); })() : '';

  const radek = (k, v) => v ? `<div style="display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-top:1px solid var(--line)">
      <span style="font-size:11.5px;color:var(--muted);flex:0 0 auto">${k}</span>
      <span style="font-size:12.5px;text-align:right;min-width:0;overflow:hidden;text-overflow:ellipsis">${v}</span></div>` : '';

  const ov = document.createElement('div');
  ov.className = 'ms-overlay';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(2,4,10,.72);z-index:88;display:flex;align-items:flex-end';
  ov.innerHTML = `
    <div style="width:100%;background:var(--card-bg);border-top:1px solid ${barva};max-height:88%;overflow-y:auto;
      padding:16px 16px calc(16px + min(var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)),34px))">
      <p style="margin:0 0 2px;font-size:9px;font-weight:800;letter-spacing:.13em;text-transform:uppercase;color:var(--muted)">
        ${isPlanned ? 'Plánovaná platba' : (isIncome ? 'Vklad' : 'Výdaj')}</p>
      <h2 style="margin:0 0 4px;font-size:18px;font-family:var(--font-head)">${msEsc(t.title || 'Bez názvu')}</h2>
      <div style="font-size:26px;font-weight:800;letter-spacing:-.03em;color:${barva};margin-bottom:12px">${castka}</div>

      ${radek('Etapa', st ? st.name : (t.stage ? t.stage : 'Bez etapy'))}
      ${isPlanned ? radek('Termín', ((!t.dateMode || t.dateMode==='deadline') && datum) ? 'Deadline · '+datum : 'Bez termínu') : radek('Datum', datum)}
      ${radek('Kategorie', t.category)}
      ${radek('Zadal', t.author)}

      ${rozpisPlanu(t)}

      ${t.receipt ? `<p style="margin:14px 0 6px;font-size:9px;font-weight:800;letter-spacing:.13em;text-transform:uppercase;color:var(--muted)">Účtenka</p>
        <img id="txReceipt" src="${t.receipt}" style="width:100%;max-height:230px;object-fit:cover;display:block;border:1px solid var(--line);cursor:pointer"/>
        <span style="display:block;font-size:10px;color:var(--muted);margin-top:4px">ťukni pro zvětšení</span>`
      : (t.hasReceipt ? `<div id="txReceiptLazy" style="margin-top:14px;font-size:11px;color:var(--muted)">Načítám účtenku…</div>`
      : `<p style="margin:14px 0 0;font-size:11px;color:var(--muted)">Bez účtenky</p>`)}

      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:16px">
        ${(isPlanned && !t.planClosed && msCanModifyContent()) ? `<button id="txPaid" style="width:100%;min-width:0;border:1px solid #ff9b32;background:transparent;color:#ff9b32;padding:11px 8px;cursor:pointer;font-family:inherit;font-weight:800;font-size:12px;white-space:normal">Zaplaceno</button>` : ''}
        ${(isPlanned && !t.planClosed && msCanModifyContent()) ? `<button id="txClosePlan" style="width:100%;min-width:0;border:1px solid var(--line);background:transparent;color:var(--muted);padding:11px 8px;cursor:pointer;font-family:inherit;font-size:11.5px;line-height:1.15;white-space:normal">Doplácet nebudu</button>` : ''}
        ${msCanModifyContent() ? `<button id="txEdit" class="btn-primary" style="width:100%;min-width:0;padding:11px 8px">Upravit</button>` : ''}
        <button id="txClose" style="width:100%;min-width:0;border:1px solid var(--line);background:transparent;color:var(--muted);padding:11px 8px;cursor:pointer;font-family:inherit;white-space:normal">Zavřít</button>
      </div>
    </div>`;
  document.body.appendChild(ov);

  const close = ()=>{ if(ov.parentNode) document.body.removeChild(ov); };
  ov.addEventListener('click', e=>{ if(e.target === ov) close(); });
  ov.querySelector('#txClose').addEventListener('click', close);
  const txEditEl = ov.querySelector('#txEdit');
  if(txEditEl) txEditEl.addEventListener('click', ()=>{ close(); if(o.onEdit) o.onEdit(t); });
  const paid = ov.querySelector('#txPaid');
  if(paid) paid.addEventListener('click', ()=>{ close(); if(o.onPaid) o.onPaid(t); });
  const closePlanBtn = ov.querySelector('#txClosePlan');
  if(closePlanBtn) closePlanBtn.addEventListener('click', async ()=>{
    const zbytek = Number(t.amount||0).toLocaleString('cs-CZ');
    const ok = await Layout.confirmDialog(
      'Zbývajících ' + zbytek + ' Kč už doplácet nebudeš?\n\n'
      + 'Plán se uzavře a přestane se počítat mezi plánované výdaje. '
      + 'Co jsi z něj už zaplatil, zůstane i s rozpisem — nic se nemaže.',
      'Uzavřít plán', 'Zpět');
    if(!ok) return;
    msClosePlan(t.id);
    close();
    if(typeof Layout !== 'undefined' && Layout.showSuccess) Layout.showSuccess('Plán uzavřen');
    if(o.onChanged) o.onChanged();
  });
  const img = ov.querySelector('#txReceipt');
  if(img) img.addEventListener('click', ()=> msPhotoLightbox([t.receipt], 0));
  const lazyReceipt = ov.querySelector('#txReceiptLazy');
  if(lazyReceipt && typeof msReceiptContent==='function'){
    msReceiptContent(t.id).then(url=>{
      if(!url || !lazyReceipt.parentNode){ lazyReceipt.textContent='Účtenku se nepodařilo načíst.'; return; }
      lazyReceipt.outerHTML = `<p style="margin:14px 0 6px;font-size:9px;font-weight:800;letter-spacing:.13em;text-transform:uppercase;color:var(--muted)">Účtenka</p>
        <img id="txReceiptLoaded" src="${url}" style="width:100%;max-height:230px;object-fit:cover;display:block;border:1px solid var(--line);cursor:pointer"/>
        <span style="display:block;font-size:10px;color:var(--muted);margin-top:4px">ťukni pro zvětšení</span>`;
      const loaded = ov.querySelector('#txReceiptLoaded');
      if(loaded) loaded.addEventListener('click', ()=> msPhotoLightbox([url],0));
    }).catch(()=>{ if(lazyReceipt.parentNode) lazyReceipt.textContent='Účtenku se nepodařilo načíst.'; });
  }
}


/* ============================================================
   DEADLINE PLANOVANYCH VYDAJU (3.9.2026)
   Plan muze byt bez terminu, nebo mit deadline. U deadline se appka
   3 dny pred terminem (a potom i po terminu) jednou denne zepta,
   jestli je plan zaplaceny, ma se posunout, nebo uz se doplacet nebude.
   ============================================================ */
function msCheckPlannedExpenseDeadlines(){
  if(typeof msExpenses!=='function' || typeof msPlannedDeadlineState!=='function') return;
  if(document.querySelector('.ms-plan-deadline-overlay')) return;

  const today = (typeof msTodayISO==='function') ? msTodayISO() : new Date().toISOString().slice(0,10);
  const projectId = (typeof msGetActiveProjectId==='function' && msGetActiveProjectId()) || 'default';
  let seen = {};
  try{ seen = JSON.parse(localStorage.getItem('ms_plan_deadline_prompt_seen_v1') || '{}') || {}; }catch(e){ seen={}; }

  const candidates = msExpenses()
    .filter(t=>{
      const st = msPlannedDeadlineState(t, today);
      if(!st || !(st.approaching || st.overdue)) return false;
      return !seen[projectId+':'+t.id+':'+today];
    })
    .sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')));

  const t = candidates[0];
  if(!t) return;
  const state = msPlannedDeadlineState(t, today);
  const seenKey = projectId+':'+t.id+':'+today;
  seen[seenKey]=1;
  try{ localStorage.setItem('ms_plan_deadline_prompt_seen_v1', JSON.stringify(seen)); }catch(e){}

  const when = state.overdue
    ? `Termín vypršel před ${Math.abs(state.days)} ${msSklonujDny(Math.abs(state.days))}.`
    : state.dueToday ? 'Deadline je dnes.'
    : state.days===1 ? 'Deadline je zítra.'
    : `Do deadline zbývají ${state.days} ${msSklonujDny(state.days)}.`;

  const ov=document.createElement('div');
  ov.className='ms-overlay ms-plan-deadline-overlay';
  ov.style.cssText='position:fixed;inset:0;background:rgba(2,4,10,.76);z-index:96;display:flex;align-items:flex-end;justify-content:center';
  ov.innerHTML=`
    <div style="width:100%;max-width:480px;background:var(--card-bg-2);border-top:1px solid #ff9b32;padding:16px 16px calc(16px + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)))">
      <p style="margin:0 0 3px;font-size:9px;font-weight:800;letter-spacing:.13em;text-transform:uppercase;color:#ff9b32">Plánovaný výdaj · deadline</p>
      <h2 style="margin:0 0 4px;font-size:18px;font-family:var(--font-head)">${msEsc(t.title||'Plánovaný výdaj')}</h2>
      <div style="font-size:23px;font-weight:800;color:#ff9b32;margin-bottom:5px">${Number(t.amount||0).toLocaleString('cs-CZ')} Kč</div>
      <p style="margin:0 0 14px;font-size:11px;color:var(--muted);line-height:1.5">${when}<br/>Je už výdaj vyřešený?</p>

      <button id="planPayNow" class="btn-primary" style="border-color:#ff9b32;color:#fff">Zaplatit / doplatit</button>
      <button id="planExtend" style="width:100%;border:1px solid var(--line);background:transparent;color:var(--text-main);padding:11px;margin-top:8px;font-family:inherit;font-weight:700;cursor:pointer">Prodloužit deadline</button>
      <button id="planClose" style="width:100%;border:1px solid var(--line);background:transparent;color:var(--muted);padding:11px;margin-top:8px;font-family:inherit;cursor:pointer">Doplácet nebudu</button>
      <button id="planLater" style="width:100%;border:0;background:transparent;color:var(--muted);padding:10px;margin-top:3px;font-family:inherit;cursor:pointer">Teď ne</button>
    </div>`;
  document.body.appendChild(ov);

  const close=()=>{ if(ov.parentNode) ov.remove(); };
  const next=()=>setTimeout(()=>msCheckPlannedExpenseDeadlines(),120);

  ov.querySelector('#planLater').addEventListener('click',close);

  ov.querySelector('#planClose').addEventListener('click',async()=>{
    const ok=await Layout.confirmDialog(
      `Zbývajících ${Number(t.amount||0).toLocaleString('cs-CZ')} Kč už doplácet nebudeš?\n\nPlán zůstane v historii, ale přestane se počítat mezi budoucí výdaje.`,
      'Uzavřít plán','Zpět');
    if(!ok) return;
    msClosePlan(t.id);
    close();
    Layout.showSuccess('Plán uzavřen');
    next();
  });

  ov.querySelector('#planExtend').addEventListener('click',()=>{
    const box=ov.querySelector('div');
    box.innerHTML=`
      <p style="margin:0 0 3px;font-size:9px;font-weight:800;letter-spacing:.13em;text-transform:uppercase;color:#ff9b32">Prodloužit deadline</p>
      <h2 style="margin:0 0 12px;font-size:17px;font-family:var(--font-head)">${msEsc(t.title||'Plánovaný výdaj')}</h2>
      <input id="newPlanDeadline" type="date" class="f-input" value="${msEsc(t.date||today)}" style="margin-bottom:12px"/>
      <button id="savePlanDeadline" class="btn-primary" style="border-color:#ff9b32">Uložit nový termín</button>
      <button id="cancelPlanDeadline" style="width:100%;border:0;background:transparent;color:var(--muted);padding:10px;margin-top:3px;font-family:inherit;cursor:pointer">Zrušit</button>`;
    box.querySelector('#cancelPlanDeadline').addEventListener('click',close);
    box.querySelector('#savePlanDeadline').addEventListener('click',()=>{
      const date=box.querySelector('#newPlanDeadline').value;
      if(!date){ alert('Vyber nový deadline.'); return; }
      msUpdateTransaction(t.id,{dateMode:'deadline',date});
      close();
      Layout.showSuccess('Deadline posunut');
      next();
    });
  });

  ov.querySelector('#planPayNow').addEventListener('click',()=>{
    const box=ov.querySelector('div');
    box.innerHTML=`
      <p style="margin:0 0 3px;font-size:9px;font-weight:800;letter-spacing:.13em;text-transform:uppercase;color:#ff9b32">Zaúčtovat plán</p>
      <h2 style="margin:0 0 4px;font-size:17px;font-family:var(--font-head)">${msEsc(t.title||'Plánovaný výdaj')}</h2>
      <p style="font-size:10.5px;color:var(--muted);margin:0 0 10px">Zbývá ${Number(t.amount||0).toLocaleString('cs-CZ')} Kč. Můžeš zadat i jen část.</p>
      <div style="display:flex;align-items:baseline;gap:8px;border:1px solid #ff9b32;padding:9px 12px;margin-bottom:6px">
        <input id="deadlinePaidAmount" value="${Number(t.amount||0)}" inputmode="numeric" style="border:0;background:transparent;color:#ff9b32;font-size:20px;font-weight:800;width:100%;font:inherit;outline:none"/><span style="color:#ff9b32;font-weight:800">Kč</span>
      </div>
      <p id="deadlinePayHint" style="font-size:10px;color:var(--muted);margin:0 0 14px">Celá částka se přesune mezi skutečné výdaje.</p>
      <button id="deadlinePayConfirm" class="btn-primary" style="border-color:#ff9b32">Potvrdit platbu</button>
      <button id="deadlinePayCancel" style="width:100%;border:0;background:transparent;color:var(--muted);padding:10px;margin-top:3px;font-family:inherit;cursor:pointer">Zrušit</button>`;
    const input=box.querySelector('#deadlinePaidAmount');
    const hint=box.querySelector('#deadlinePayHint');
    input.addEventListener('input',()=>{
      const paid=typeof msParseCastka==='function' ? msParseCastka(input.value) : Number(input.value||0);
      if(!(paid>0)) hint.textContent='Zadej částku větší než 0 Kč.';
      else if(paid>=Number(t.amount||0)) hint.textContent='Celá částka se přesune mezi skutečné výdaje.';
      else hint.textContent=`Zaplatí se ${paid.toLocaleString('cs-CZ')} Kč a ${Math.max(0,Number(t.amount||0)-paid).toLocaleString('cs-CZ')} Kč zůstane v plánu.`;
    });
    box.querySelector('#deadlinePayCancel').addEventListener('click',close);
    box.querySelector('#deadlinePayConfirm').addEventListener('click',()=>{
      const paid=typeof msParseCastka==='function' ? msParseCastka(input.value) : Number(input.value||0);
      if(!(paid>0)){ alert('Zadej částku větší než 0 Kč.'); return; }
      msPayPlanned(t.id,paid);
      close();
      Layout.showSuccess(paid>=Number(t.amount||0) ? 'Výdaj zaúčtován' : 'Částečná platba uložena');
      next();
    });
  });
}

/* ============================================================
   OBNOVENI ZE ZALOHY - sdilena funkce (28.8.2026)
   Puvodne zila cela tahle logika jenom v Nastaveni (#rowImport), takze
   ji clovek na cerstvem telefonu nemel jak najit - musel nejdriv
   zalozit prazdny projekt, teprve pak narazit na Nastaveni. Vytazeno
   sem (layout.js se nacita pred VSEMI obrazovkami), aby to slo volat
   stejne z onboardingu i z Nastaveni, beze zmeny chovani.

   Vraci Promise<void> - o zpravu pro uzivatele (alert) i navigaci na
   dashboard se postara sama, volajici obrazovka nemusi nic dalsiho
   resit.
   ============================================================ */
function msRunBackupImportFlow(file, opts){
  opts = opts || {};
  return new Promise((resolve)=>{
    const reader = new FileReader();
    reader.onload = async ()=>{
      let parsed;
      try{ parsed = JSON.parse(reader.result); }
      catch(err){ alert('Tenhle soubor se nepodařilo přečíst jako zálohu.'); resolve(false); return; }

      const pocetProjektu = (()=>{
        try{ return JSON.parse((parsed.__msBackup >= 2 ? (parsed.data||{}) : parsed)['ms_projects_v1'] || '[]').length; }
        catch(e){ return 0; }
      })();
      const pocetBlobu = (parsed.__msBackup >= 2 && parsed.blobs) ? Object.keys(parsed.blobs).length : 0;
      const okObnovit = await Layout.confirmDialog(
        'Obnovit ze zálohy?\n\n'
        + 'V souboru je ' + (pocetProjektu ? pocetProjektu + (pocetProjektu === 1 ? ' stavba' : (pocetProjektu < 5 ? ' stavby' : ' staveb')) : 'neznámý počet staveb')
        + (pocetBlobu ? ' a ' + pocetBlobu + ' fotek/dokumentů' : ' (bez fotek a dokumentů)') + '.\n\n'
        + 'Data v telefonu se přepíšou tím, co je v záloze. Stavby, které v záloze nejsou, ze seznamu nezmizí — zůstanou vedle.',
        'Obnovit', 'Zrušit');
      if(!okObnovit){ resolve(false); return; }

      const isV2 = parsed && parsed.__msBackup >= 2;
      const data = isV2 ? (parsed.data || {}) : parsed;
      const blobs = isV2 ? (parsed.blobs || {}) : {};
      const blobKeys = Object.keys(blobs);
      const hlasitPrubeh = (text)=>{ if(opts.onProgress) opts.onProgress(text); };
      hlasitPrubeh('Obnovuji…');

      const LIST_TYPES = { 'ms_photos_v1':'thumb', 'ms_documents_v1':'content', 'ms_expenses_v1':null, 'ms_diary_v1':null, 'ms_events_v1':null, 'ms_tasks_v1':null };
      const CONTENT_KEY = {
        'ms_photos_v1': x => [x.stage||'', x.date||'', (x.caption||'')].join('|'),
        'ms_documents_v1': x => [x.stage||'', (x.name||'')].join('|'),
        /* (4.9.2026) depositId je v klici schvalne. Bez nej by se dva
           STEJNE odbery z RUZNYCH zaloh (napr. "Cement 4 000 Kc 8. 9."
           z Materialu i ze Zelezarstvi) povazovaly za duplicitu a jeden
           by se pri obnove zahodil - prislusna zaloha by pak vypadala,
           ze z ni bylo odebrano min. Stejne tak depositDebtFor a
           depositRefundFor, at se nesloucily zaznamy patrici k jinym
           zaloham. */
        'ms_expenses_v1': x => [(x.title||x.name||'').trim().toLowerCase(), Number(x.amount||0), x.date||'', x.type||'', x.depositId||'', x.depositDebtFor||'', x.depositRefundFor||''].join('|'),
        'ms_diary_v1': x => [(x.title||'').trim().toLowerCase(), (x.text||x.content||'').trim().toLowerCase(), x.date||''].join('|'),
        'ms_events_v1': x => [(x.title||'').trim().toLowerCase(), x.date||'', x.time||''].join('|'),
        'ms_tasks_v1': x => [(x.title||'').trim().toLowerCase(), x.date||'', x.dateMode||''].join('|'),
      };
      const failedKeys = [];

      Object.keys(data).forEach(k=>{
        if(!k.startsWith('ms_')) return;
        if(Object.keys(LIST_TYPES).some(base => k===base || k.startsWith(base+'__'))) return;
        if(k === 'ms_projects_v1') return;
        try{ localStorage.setItem(k, data[k]); }catch(err){ failedKeys.push(k); }
      });

      try{
        let zalohaProjekty = [];
        try{ zalohaProjekty = JSON.parse(data['ms_projects_v1'] || '[]'); }catch(e){}
        let stavajici = [];
        try{ stavajici = JSON.parse(localStorage.getItem('ms_projects_v1') || '[]'); }catch(e){}
        const podleId = {};
        stavajici.forEach(p=>{ if(p && p.id) podleId[p.id] = p; });
        zalohaProjekty.forEach(p=>{ if(p && p.id) podleId[p.id] = p; });
        const slouceno = Object.keys(podleId).map(k=> podleId[k]);
        if(slouceno.length) localStorage.setItem('ms_projects_v1', JSON.stringify(slouceno));
        const aktivni = localStorage.getItem('ms_active_project_v1');
        if(slouceno.length && (!aktivni || !slouceno.some(p=> p.id === aktivni))){
          localStorage.setItem('ms_active_project_v1', slouceno[0].id);
        }
      }catch(err){ failedKeys.push('ms_projects_v1'); }

      const activeId = localStorage.getItem('ms_active_project_v1');
      const scopedSuffix = activeId ? '__'+activeId : '';
      for(const [base, blobField] of Object.entries(LIST_TYPES)){
        const scopedKey = base + scopedSuffix;
        let scopedList = [], orphanList = [];
        try{ scopedList = data[scopedKey] ? JSON.parse(data[scopedKey]) : []; }catch(e){}
        try{ orphanList = data[base] ? JSON.parse(data[base]) : []; }catch(e){}
        if(scopedList.length===0 && orphanList.length===0) continue;
        const keyFn = CONTENT_KEY[base];
        const seenKeys = new Set(scopedList.map(keyFn));
        const merged = scopedList.concat(orphanList.filter(x=>!seenKeys.has(keyFn(x))));
        for(const item of merged){
          if(blobField && item[blobField]){
            const blobKey = msBlobKey(base==='ms_photos_v1' ? 'photo' : 'doc', item.id);
            try{
              await msIdbSet(blobKey, item[blobField]);
              MS_BLOB_CACHE.set(blobKey, item[blobField]);
              delete item[blobField];
            }catch(err){ /* zustane rovnou v zaznamu, radeji pomalejsi nez ztraceny */ }
          }
        }
        try{ localStorage.setItem(scopedKey, JSON.stringify(merged)); }catch(err){ failedKeys.push(scopedKey); }
      }

      let blobsOk = 0, blobsFailed = 0;
      for(let i=0;i<blobKeys.length;i++){
        if(i % 10 === 0) hlasitPrubeh(`Obnovuji fotky a dokumenty (${i}/${blobKeys.length})…`);
        const k = blobKeys[i];
        try{
          await msIdbSet(k, blobs[k]);
          MS_BLOB_CACHE.set(k, blobs[k]);
          blobsOk++;
        }catch(err){ blobsFailed++; }
      }

      let msg = 'Záloha byla obnovena.';
      if(blobKeys.length) msg += `\n\nFotky a dokumenty: ${blobsOk} obnoveno` + (blobsFailed?`, ${blobsFailed} se nevešlo (došlo místo v telefonu)`:'') + '.';
      else if(isV2) msg += '\n\nTahle záloha byla bez fotek a dokumentů, obnovila se jen data.';
      if(failedKeys.length) msg += '\n\nTohle se nepovedlo uložit: ' + failedKeys.join(', ');
      alert(msg);
      Router.go('dashboard');
      resolve(true);
    };
    reader.readAsText(file);
  });
}

/* ============================================================
   ULOZENI/SDILENI SOUBORU - funguje v appce na webu i v appce
   nainstalovane na telefonu (30.8.2026)

   PRICINA PUVODNIHO PROBLEMU: appka na ulozeni/nahled souboru
   pouzivala cisty webovy trik (<a download> na blob: odkaz, prip.
   window.open(blob:...)) - to funguje v prohlizeci, ale appka
   zabalena pres Capacitor bezi v tzv. WebView, ktere nema adresni
   radek ani stahovaci centrum prohlizece, takze tenhle trik tise
   selhal nebo nic neudelal. Appka navic zkousela navigator.share()
   (webove sdileni), coz v mnoha Android WebView vubec neni
   podporovane.

   RESENI: v appce nainstalovane na telefonu appka soubor SKUTECNE
   zapise na telefon (Capacitor Filesystem) a pak nabidne systemove
   okno „Sdilet/Otevrit/Ulozit" (Capacitor Share) - presne tak, jak
   se tohle na telefonu standardne resi. V appce na webu zustava
   puvodni chovani (navigator.share, pak <a download>) beze zmeny.
   ============================================================ */
function msJeNativniAppka(){
  try{ return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); }
  catch(e){ return false; }
}
function msBlobNaBase64(blob){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onload = ()=>{
      // FileReader.readAsDataURL vraci "data:application/pdf;base64,AAAA..."
      // - Filesystem chce jen cast za carkou.
      const vysledek = String(reader.result || '');
      const carka = vysledek.indexOf(',');
      resolve(carka >= 0 ? vysledek.slice(carka+1) : vysledek);
    };
    reader.onerror = ()=> reject(reader.error || new Error('Cteni souboru selhalo'));
    reader.readAsDataURL(blob);
  });
}
// Vraci true, pokud se povedlo zapsat a otevrit systemove okno Sdilet.
// Vraci false, kdyz appka bezi jako nativni, ale pluginy chybi nebo
// zápis/sdileni selhaly - volajici pak ma zkusit puvodni webovou cestu.
async function msNativniUlozitASdilet(blob, filename, opts){
  opts = opts || {};
  if(!msJeNativniAppka()) return false;
  const plug = window.Capacitor && window.Capacitor.Plugins;
  if(!plug || !plug.Filesystem || !plug.Share) return false;
  try{
    const base64 = await msBlobNaBase64(blob);
    const zapis = await plug.Filesystem.writeFile({
      path: filename,
      data: base64,
      directory: 'CACHE',
      recursive: true
    });
    await plug.Share.share({
      title: opts.title || filename,
      url: zapis.uri,
      dialogTitle: opts.dialogTitle || 'Uložit nebo otevřít'
    });
    return true;
  }catch(err){
    console.error('nativni ulozeni/sdileni souboru selhalo', err);
    return false;
  }
}

// (3.9.2026) SKUTECNY NAHLED SOUBORU V NATIVNI APPCE.
// Na rozdil od msNativniUlozitASdilet neotevira Share sheet a nic po
// uzivateli nechce ukladat. Soubor zapise jen do docasne CACHE a preda ho
// Androidu pres MSFileOpen / ACTION_VIEW. Pro PDF se tak otevre bezny PDF
// prohlizec telefonu a tlacitko "Otevrit nahled" dela opravdu nahled.
async function msNativniOtevritSoubor(blob, filename, mime){
  if(!msJeNativniAppka()) return false;
  const plug = window.Capacitor && window.Capacitor.Plugins;
  if(!plug || !plug.Filesystem || !plug.MSFileOpen) return false;
  try{
    const base64 = await msBlobNaBase64(blob);
    const safeName = (typeof msBezpecnyNazevSouboru === 'function')
      ? msBezpecnyNazevSouboru(filename || 'nahled.pdf', 0)
      : String(filename || 'nahled.pdf').replace(/[\/:*?"<>|]+/g,'-');
    const zapis = await plug.Filesystem.writeFile({
      path: 'nahled/' + safeName,
      data: base64,
      directory: 'CACHE',
      recursive: true
    });
    await plug.MSFileOpen.open({
      uri: zapis.uri,
      name: safeName,
      mime: mime || (blob && blob.type) || 'application/pdf'
    });
    return true;
  }catch(err){
    console.error('nativni nahled souboru selhal', err);
    return false;
  }
}
