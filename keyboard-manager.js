/*
 * Moje Stavba - sprava klavesnice / IME (build 267)
 * ---------------------------------------------------
 * Android WebView muze pri otevrene klavesnici zmensit pouze visualViewport,
 * zatimco fixed bottom-sheet zustane ukotveny ke spodku layout viewportu.
 * Vysledek: formular je fyzicky za klavesnici a scrollIntoView nema kam rolovat.
 *
 * Reseni:
 *  1) pri focusu zjistime skutecnou viditelnou plochu pres visualViewport,
 *  2) fixed overlay, ve kterem je aktivni pole, docasne zmensime PRESNE na
 *     visualViewport (top + height),
 *  3) bottom-sheet se tak diky align-items:flex-end prirozene posadi nad IME,
 *  4) pokud je panel vyssi nez dostupna plocha, dostane max-height + scroll,
 *  5) po zavreni klavesnice se vse vrati na puvodni hodnoty.
 *
 * Neni tu zadny odhad pevne vysky klavesnice. Funguje i pro SwiftKey/Gboard,
 * ruzne vysky IME a orientaci displeje.
 */
(function(){
  'use strict';

  const MIN_KEYBOARD_DELTA = 90;
  const EDGE_GAP = 8;
  const saved = new WeakMap();
  let baselineHeight = 0;
  let raf = 0;
  let lastHost = null;
  let lastSheet = null;

  function vv(){ return window.visualViewport || null; }

  function isEditable(el){
    if(!el || el.nodeType !== 1) return false;
    if(el.isContentEditable) return true;
    const tag = (el.tagName || '').toLowerCase();
    if(tag === 'textarea') return true;
    if(tag !== 'input') return false;
    const type = (el.type || 'text').toLowerCase();
    return !['button','submit','reset','checkbox','radio','range','color','file','hidden','image'].includes(type);
  }

  function remember(el, props){
    if(!el || saved.has(el)) return;
    const state = {};
    props.forEach(p=> state[p] = el.style[p] || '');
    saved.set(el, state);
  }

  function restore(el){
    if(!el) return;
    const state = saved.get(el);
    if(!state) return;
    Object.keys(state).forEach(p=>{ el.style[p] = state[p]; });
    saved.delete(el);
  }

  function restoreCurrent(){
    restore(lastSheet);
    restore(lastHost);
    lastSheet = null;
    lastHost = null;
  }

  function findFixedHost(el){
    let n = el;
    while(n && n !== document.body && n !== document.documentElement){
      const cs = getComputedStyle(n);
      if(cs.position === 'fixed'){
        const r = n.getBoundingClientRect();
        // Chceme fullscreen / modal overlay, ne nahodne male fixed tlacitko.
        const wideEnough = r.width >= Math.min(window.innerWidth * 0.75, 320);
        const tallEnough = r.height >= Math.min(window.innerHeight * 0.45, 260);
        if(wideEnough && tallEnough) return n;
      }
      n = n.parentElement;
    }
    return null;
  }

  function findSheet(active, host){
    if(!active || !host) return null;
    const selectors = [
      '.ms-sheet', '.confirm-sheet', '.diary-v2-detail', '.stage-overview-sheet',
      '.modal-sheet', '.bottom-sheet', '[role="dialog"]'
    ];
    for(const sel of selectors){
      const hit = active.closest(sel);
      if(hit && host.contains(hit) && hit !== host) return hit;
    }
    // Fallback: prvni potomek overlaye na ceste k aktivnimu prvku.
    let n = active;
    let child = active;
    while(n && n !== host){ child = n; n = n.parentElement; }
    return n === host ? child : null;
  }

  function nearestScrollable(el, stopAt){
    let n = el && el.parentElement;
    while(n && n !== document.body && n !== stopAt){
      const cs = getComputedStyle(n);
      const oy = cs.overflowY;
      if((oy === 'auto' || oy === 'scroll') && n.scrollHeight > n.clientHeight + 2) return n;
      n = n.parentElement;
    }
    if(stopAt){
      const cs = getComputedStyle(stopAt);
      if((cs.overflowY === 'auto' || cs.overflowY === 'scroll') || stopAt.scrollHeight > stopAt.clientHeight + 2) return stopAt;
    }
    return null;
  }

  function ensureVisible(active, visualTop, visualBottom, sheet){
    if(!active || !document.documentElement.contains(active)) return;
    const r = active.getBoundingClientRect();
    const topLimit = visualTop + EDGE_GAP;
    const bottomLimit = visualBottom - EDGE_GAP;
    if(r.top >= topLimit && r.bottom <= bottomLimit) return;

    const scroller = nearestScrollable(active, sheet) || sheet;
    if(scroller && scroller !== active){
      const sr = scroller.getBoundingClientRect();
      if(r.bottom > bottomLimit){
        scroller.scrollTop += (r.bottom - bottomLimit) + 12;
      }else if(r.top < topLimit){
        scroller.scrollTop -= (topLimit - r.top) + 12;
      }
    }

    // Druha pojistka po prepoctu layoutu. nearest block funguje lepe nez
    // center - pole skonci tesne nad klavesnici a panel zbytecne neskace.
    setTimeout(()=>{
      try{ active.scrollIntoView({block:'nearest', inline:'nearest', behavior:'auto'}); }catch(e){}
    }, 0);
  }

  function schedule(){
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(sync);
  }

  function sync(){
    const visual = vv();
    const active = document.activeElement;

    if(!visual){
      restoreCurrent();
      return;
    }

    // Kdyz se nepise, nejvetsi pozorovana vyska je nase "klavesnice zavrena" zakladna.
    if(!isEditable(active)){
      baselineHeight = Math.max(baselineHeight, visual.height);
      restoreCurrent();
      return;
    }

    if(!baselineHeight) baselineHeight = Math.max(visual.height, window.innerHeight || 0);
    const keyboardOpen = (baselineHeight - visual.height) >= MIN_KEYBOARD_DELTA;

    // Nektere WebView pri adjustResize zmeni zaroven layout i visual viewport tak,
    // ze rozdil proti baseline je stale nejspolehlivejsi signal. Pokud ale aktivni
    // pole uz lezi pod viditelnou hranou, bereme IME jako otevrene i bez prahu.
    const activeRect = active.getBoundingClientRect();
    const visualTop = visual.offsetTop || 0;
    const visualBottom = visualTop + visual.height;
    const occluded = activeRect.bottom > visualBottom - 2;

    if(!keyboardOpen && !occluded){
      restoreCurrent();
      return;
    }

    const host = findFixedHost(active);
    if(host){
      if(lastHost && lastHost !== host) restoreCurrent();
      lastHost = host;
      const sheet = findSheet(active, host);
      lastSheet = sheet;

      remember(host, ['top','bottom','height','maxHeight']);
      // DULEZITE: nehybeme inputem ani sheetem transformaci. Menime hranice
      // samotneho fixed overlaye na SKUTECNE viditelnou plochu.
      host.style.top = visualTop + 'px';
      host.style.bottom = 'auto';
      host.style.height = visual.height + 'px';
      host.style.maxHeight = visual.height + 'px';

      if(sheet && sheet !== host){
        remember(sheet, ['maxHeight','overflowY','overscrollBehavior']);
        sheet.style.maxHeight = Math.max(120, visual.height - (EDGE_GAP * 2)) + 'px';
        sheet.style.overflowY = 'auto';
        sheet.style.overscrollBehavior = 'contain';
      }

      requestAnimationFrame(()=> ensureVisible(active, visualTop, visualBottom, sheet));
      return;
    }

    // Bez modalu: respektujeme existujici scroll kontejner obrazovky.
    // Nic neposouvame natvrdo; pouze zajistime viditelnost aktivniho pole.
    ensureVisible(active, visualTop, visualBottom, nearestScrollable(active, null));
  }

  document.addEventListener('focusin', function(e){
    if(!isEditable(e.target)) return;
    schedule();
    // Android/SwiftKey meni viewport v nekolika krocich.
    setTimeout(schedule, 60);
    setTimeout(schedule, 180);
    setTimeout(schedule, 360);
  }, true);

  document.addEventListener('focusout', function(){
    setTimeout(function(){
      if(!isEditable(document.activeElement)) restoreCurrent();
      else schedule();
    }, 120);
  }, true);

  visualViewport && visualViewport.addEventListener('resize', schedule);
  visualViewport && visualViewport.addEventListener('scroll', schedule);
  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', function(){
    restoreCurrent();
    baselineHeight = 0;
    setTimeout(function(){
      const visual = vv();
      if(visual && !isEditable(document.activeElement)) baselineHeight = visual.height;
    }, 350);
  });

  window.addEventListener('load', function(){
    const visual = vv();
    if(visual) baselineHeight = visual.height;
  });
})();
