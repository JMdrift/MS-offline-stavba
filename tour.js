/* ==========================================================
   PRUVODCE (uvodni tour) - nahrazuje stary staticky uvitaci carousel.
   Bezi po zalozeni prvniho projektu, pred povinnym nastavenim zamku.

   Princip: seznam kroku (STEPS). Kazdy krok bud:
   - je "special" (welcome) - vlastni cela obrazovka pres Router
   - potrebuje konkretni route (napr. detail nove zalozene etapy) - tour
     tam sama preesmeruje pres Router.go
   - cili na CSS selector existujiciho prvku na aktualni obrazovce a
     vykresli kolem nej "spotlight": zbytek obrazovky ztmaveny a needitovatelny,
     jen cilovy prvek zustava viditelny (a u "action" kroku i klikatelny)

   Dva rezimy kroku:
   - mode:'action'  - cil musi byt fakt klikatelny (napr. "Nova etapa",
     tlacitko "+"), aby uzivatel provedl skutecnou akci. Presko cit je
     porad k dispozici.
   - mode:'manual'  - cil je jen zvyrazneny (needitovatelny), pokracuje
     se tlacitkem "Dalsi" v bublince - pouziva se vsude tam, kde by
     skutecny klik na cil odnavigoval pryc (radialni satelity, spodni nav)

   Kdyz uzivatel cely pruvodce presko ci hned na zacatku (welcome), jde
   rovnou na povinne nastaveni zamku - to jde presko cit jen tim, ze se
   VYBERE jedna z moznosti (i "bez zamku"), ne cely krok.
   ========================================================== */
const Tour = (function(){
  const STEP_KEY = 'ms_tour_step_v1';
  const NEWKEY_KEY = 'ms_tour_newstage_v1';
  const BASE_KEYS_KEY = 'ms_tour_basekeys_v1';

  // ZJEDNODUSENO (29.8.2026): puvodnich 6 kroku vedlo pres 4 ruzne
  // obrazovky (Etapy -> Detail etapy -> Dashboard -> rychle pridani) a
  // mezi kroky se appka spolehala na krehky mechanismus (porovnani
  // seznamu etap pred/po, aby uhodla "uz jsi to udelal?"). Kdyz tohle
  // v realnem provozu selhalo, pruvodce pusobil, jako by "skoncil" hned
  // po prvnim kroku. Ted jsou jen dva kroky, oba na jedne obrazovce
  // najednou (zadne cross-screen hadani), a zbytek prevezme karta
  // "Začínáme" na dashboardu (uz existuje, testovana, spolehliva -
  // jen kontroluje "existuje uz tenhle typ zaznamu", zadne slozite
  // sledovani mezi obrazovkami).
  const STEPS = [
    { id:'create-stage', route:'stages', selector:'#newStageBtn', mode:'action',
      title:'Založ první etapu', text:'Etapy jsou hlavní stavební kameny appky - třeba Základy, Střecha, Zahrada. Ťukni na "Nová etapa" a založ tu svoji první.' },
    { id:'quick-add-open', route:'dashboard', selector:'#navAddBtn', mode:'action', final:true,
      title:'Rychlé přidání', text:'Tohle prostřední tlačítko je vždycky po ruce - výdaj, zápis, fotka, úkol nebo událost, cokoliv rychle zapíšeš odsud. Zbytek už ti ukáže karta "Začínáme" na hlavní obrazovce.' },
  ];

  function getStepIndex(){ const v = localStorage.getItem(STEP_KEY); return v===null ? -1 : parseInt(v,10); }
  function setStepIndex(i){ localStorage.setItem(STEP_KEY, String(i)); }
  function isActive(){ return getStepIndex() >= 0 && getStepIndex() < STEPS.length; }

  function start(){
    try{ localStorage.setItem(BASE_KEYS_KEY, JSON.stringify(msSelectedStageKeys())); }catch(e){}
    setStepIndex(0);
    goToStep(0);
  }

  /* (31.8.2026) Pruvodce uz NEKONCI obrazovkou zamku. Doted byl zamek
     povinny krok - clovek se pres nej musel prokousat driv, nez vubec
     uvidel, co appka umi, a rozhodoval se o zabezpeceni ve chvili, kdy
     v appce jeste zadna data nemel. Zamek si zapne v Nastaveni, kdyz
     bude chtit. Appka zustava odemcena. */
  function skipAll(){
    finish();
    Router.go('dashboard');
  }

  function finish(){
    localStorage.removeItem(STEP_KEY);
    localStorage.removeItem(NEWKEY_KEY);
    localStorage.removeItem(BASE_KEYS_KEY);
    removeOverlay();
    if(Layout && Layout.closeQuickAdd) Layout.closeQuickAdd();
  }

  function goToStep(i){
    if(i >= STEPS.length){
      setStepIndex(STEPS.length);
      Router.go('dashboard');
      return;
    }
    setStepIndex(i);
    const step = STEPS[i];
    if(step.route){
      const params = (step.route==='stage-detail') ? {key: localStorage.getItem(NEWKEY_KEY)} : {};
      if(Router.getRoute() !== step.route){ Router.go(step.route, params); return; }
    }
    render();
  }

  function next(){ goToStep(getStepIndex()+1); }
  function skipStep(){ next(); }

  function removeOverlay(){
    const old = document.getElementById('tour-overlay');
    if(old) old.remove();
  }

  function render(){
    removeOverlay();
    if(!isActive()) return;
    const step = STEPS[getStepIndex()];
    if(step.route && Router.getRoute() !== step.route) return; // spatna obrazovka - pockej na dalsi navigaci
    const targets = step.selectorAll ? [...document.querySelectorAll(step.selectorAll)] : (document.querySelector(step.selector) ? [document.querySelector(step.selector)] : []);
    if(!targets.length){
      // cil jeste neni v DOM (napr. render jeste probiha) - zkus znovu za chvili,
      // ale jen par pokusu, at to nesmycuje donekonecna na spatne obrazovce
      let tries = 0;
      const stillMissing = ()=> step.selectorAll ? !document.querySelectorAll(step.selectorAll).length : !document.querySelector(step.selector);
      const retry = ()=>{
        tries++;
        if(!isActive() || tries>20) return;
        if(!stillMissing()) { render(); return; }
        requestAnimationFrame(retry);
      };
      requestAnimationFrame(retry);
      return;
    }
    const rects = targets.map(t=>t.getBoundingClientRect());
    const pad = 6;
    const box = {
      top: Math.min(...rects.map(r=>r.top)) - pad,
      left: Math.min(...rects.map(r=>r.left)) - pad,
      right: Math.max(...rects.map(r=>r.right)) + pad,
      bottom: Math.max(...rects.map(r=>r.bottom)) + pad,
    };

    const wrap = document.createElement('div');
    wrap.id = 'tour-overlay';
    wrap.style.cssText = 'position:fixed;inset:0;z-index:9990;pointer-events:none';

    const shade = (t,l,w,h)=>`position:fixed;top:${t}px;left:${l}px;width:${w}px;height:${h}px;background:rgba(4,5,10,.72);pointer-events:auto`;
    const vw = window.innerWidth, vh = window.innerHeight;
    wrap.innerHTML = `
      <div style="${shade(0,0,vw,Math.max(0,box.top))}"></div>
      <div style="${shade(box.bottom,0,vw,Math.max(0,vh-box.bottom))}"></div>
      <div style="${shade(box.top,0,Math.max(0,box.left),box.bottom-box.top)}"></div>
      <div style="${shade(box.top,box.right,Math.max(0,vw-box.right),box.bottom-box.top)}"></div>
      ${step.mode==='manual' ? `<div id="tour-block" style="position:fixed;top:${box.top}px;left:${box.left}px;width:${box.right-box.left}px;height:${box.bottom-box.top}px;pointer-events:auto"></div>` : ''}
      <div style="position:fixed;top:${box.top}px;left:${box.left}px;width:${box.right-box.left}px;height:${box.bottom-box.top}px;border:2px solid var(--accent);box-shadow:0 0 0 3px rgba(168,80,60,.25);pointer-events:none"></div>
      <div id="tour-tooltip" style="position:fixed;left:16px;right:16px;${box.top>vh*0.55?`top:${Math.max(16,box.top-140)}px`:`top:${box.bottom+16}px`};background:var(--card-bg);border:1px solid var(--accent);border-left-width:4px;padding:14px;pointer-events:auto;box-shadow:4px 4px 0 rgba(0,0,0,.16)">
        <b style="display:block;font-size:var(--ms-body-size);margin-bottom:4px">${step.title}</b>
        <p style="margin:0 0 12px;font-size:var(--ms-meta-size);color:var(--muted);line-height:1.5">${step.text}</p>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span id="tour-skip" style="font-size:11.5px;color:var(--muted);cursor:pointer">Přeskočit</span>
          ${step.mode==='manual' ? `<button id="tour-next" class="btn-primary" style="width:auto;padding:8px 18px;font-size:12px">${step.final?'Dokončit':'Další'}</button>` : `<span style="font-size:10.5px;color:var(--accent);font-weight:700">↑ ťukni na zvýrazněné</span>`}
        </div>
      </div>
    `;
    document.body.appendChild(wrap);

    wrap.querySelector('#tour-skip').addEventListener('click', skipStep);
    const nextBtn = wrap.querySelector('#tour-next');
    if(nextBtn) nextBtn.addEventListener('click', next);

    if(step.mode==='action'){
      // skutecny klik na cil appku posune dal - listener navic k tomu, co uz na prvku je
      const target = targets[0];
      target.addEventListener('click', function onceHandler(){
        target.removeEventListener('click', onceHandler);
        if(step.id==='create-stage'){
          // detekce nove etapy probehne az po navratu z 'new-stage' formulare,
          // viz onRouteRendered() nize
        }
        if(step.id==='quick-add-open'){
          setTimeout(next, 260); // pockej na animaci otevreni radialniho menu
        }
      });
    }
  }

  function onRouteRendered(){
    if(!isActive()){ removeOverlay(); return; }
    // detekce: byla mezitim zalozena nova etapa? (krok 'create-stage' cekal)
    if(!localStorage.getItem(NEWKEY_KEY)){
      try{
        const base = JSON.parse(localStorage.getItem(BASE_KEYS_KEY)||'[]');
        const now = msSelectedStageKeys();
        const added = now.find(k=>!base.includes(k));
        if(added && STEPS[getStepIndex()].id==='create-stage'){
          localStorage.setItem(NEWKEY_KEY, added);
          next();
          return;
        }
      }catch(e){}
    }
    render();
  }

  return { start, skipAll, finish, isActive, onRouteRendered, next, skipStep };
})();

const TourWelcomeScreen = (function(){
  function render(container){
    container.innerHTML = `
      <div class="setup-v2-screen tour-welcome-v2-screen">
        <div class="setup-v2-card">
        <div class="setup-v2-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
        </div>
        <p class="setup-v2-kicker">První spuštění</p>
        <h1>Vítej v Moje Stavba</h1>
        <p class="setup-v2-lead">Projdeme aplikaci na několika skutečných krocích. Průvodce můžeš kdykoli přeskočit.</p>
        <button class="btn-primary" id="tourStartBtn">Začít</button>
        <button id="tourSkipAllBtn" class="setup-v2-skip">Přeskočit průvodce</button>
        </div>
      </div>
    `;
    container.querySelector('#tourStartBtn').addEventListener('click', ()=> Tour.start());
    container.querySelector('#tourSkipAllBtn').addEventListener('click', ()=> Tour.skipAll());
    return { showNav:false };
  }
  return { render };
})();
Router.register('tour-welcome', TourWelcomeScreen);
