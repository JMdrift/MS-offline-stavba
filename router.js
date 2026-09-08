/* ==========================================================
   ROUTER
   Appka je jedna stranka (index.html). "Navigace" mezi
   obrazovkami = zmena #hashe v adrese + prekresleni #app-content.
   Zadne nove nacitani stranky, zadne kopirovani topbaru/menu do
   kazdeho souboru - kazda obrazovka je jeden JS soubor, ktery umi
   vykreslit svuj obsah do dodaneho kontejneru.
   ========================================================== */
const Router = (function(){
  const routes = {};
  let stack = []; // vlastni historie appky (pro tlacitko zpet a gesto)

  function register(name, screenModule){
    routes[name] = screenModule;
  }

  function parseHash(){
    const raw = location.hash.slice(1) || '/dashboard';
    const clean = raw.replace(/^\/+/, '');
    const [route, queryString] = clean.split('?');
    const params = {};
    if(queryString){
      new URLSearchParams(queryString).forEach((v,k)=>{ params[k] = v; });
    }
    return { route: route || 'dashboard', params };
  }

  function go(route, params){
    params = params || {};
    const qs = new URLSearchParams(params).toString();
    const hash = '#/' + route + (qs ? '?' + qs : '');
    if(location.hash === hash){
      renderCurrent(); // stejna trasa se stejnymi parametry - preresli i tak (napr. znovunacteni dat)
    } else {
      location.hash = hash;
    }
  }

  function back(){
    // odstran aktualni zaznam, vrat se na predchozi z VLASTNI historie appky
    stack.pop();
    const prev = stack.pop();
    if(prev){
      go(prev.route, prev.params);
    } else {
      go('dashboard');
    }
  }

  function renderCurrent(silent){
    const { route, params } = parseHash();
    const screen = routes[route] || routes['dashboard'];
    const container = document.getElementById('app-content');
    if(!screen){
      container.innerHTML = '<div class="topbar"><div class="back-btn" onclick="Router.back()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></div><h1>Připravujeme</h1></div><p class="empty-msg">Obrazovka „' + route + '“ zatím čeká na přestěhování do nové verze appky.</p>';
      Layout.applyNav('', true);
      return;
    }
    // Tichy rezim prekresli obsah na miste bez noveho zaznamu v historii
    // a bez znovuspusteni vstupni animace.
    if(silent !== true){
      stack.push({ route, params });
      if(stack.length > 40) stack.shift();
    }

    // OPRAVA: overlaye/spodni listy jako chat s Martinem, "Pridat soubor"
    // sheety nebo menu etapy se pripojuji primo k <body>, mimo #app-content,
    // takze je predchozi krok ("container.innerHTML='' ") vubec nevidel.
    // Pokud uzivatel odesel z obrazovky (zpet, spodni menu, jiny odkaz)
    // BEZ toho, aby overlay explicitne zavrel, zustal navzdy viset nad
    // dalsi obrazovkou a neviditelne blokoval kliky. Pri kazde navigaci
    // proto uklidime cokoliv takhle zapomenuteho.
    document.querySelectorAll('body > .ms-overlay').forEach(el => el.remove());
    if(typeof Layout !== 'undefined' && Layout.closeQuickAdd) Layout.closeQuickAdd();

    container.innerHTML = '';
    // Obrazovkove tridy nesmeji zustat na spolecnem #app-content po
    // prechodu jinam. Samotne komponenty jsou globalni, tyto tri tridy
    // jen omezuji specialni rozlozeni konkretni obrazovky.
    container.classList.remove('ms-ui-screen','calendar-v2-screen','tasks-v2-screen','transactions-v2-screen','new-stage-v2-screen','form-v2-screen');
    if(silent !== true){
      container.classList.remove('enter');
      void container.offsetWidth; // vynuti restart animace
      container.classList.add('enter');
    }

    const navConfig = screen.render(container, params) || {};
    Layout.applyNav(navConfig.activeTab, navConfig.showNav !== false);
    if(typeof msInitReadableTypography === 'function') msInitReadableTypography(container);
    container.scrollTop = 0;
    if(typeof Tour !== 'undefined') Tour.onRouteRendered();
  }

  window.addEventListener('hashchange', renderCurrent);

  return {
    register,
    go,
    back,
    renderCurrent,
    getParams(){ return parseHash().params; },
    getRoute(){ return parseHash().route; },
    /* (31.8.2026) Pro hardwarove tlacitko Zpet na Androidu - musi
       poznat, jestli je kam se vratit, nebo jestli dalsi stisk uz
       ma appku ukoncit. */
    canGoBack(){ return stack.length > 1; },
  };
})();
