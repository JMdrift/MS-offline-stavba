/* ==========================================================
   MSBilling — VRSTVA MEZI APPKOU A OBCHODEM  (31.8.2026)

   PROC EXISTUJE
   Do teto chvile sahala platebni brana i data.js primo na mock
   funkce v localStorage. Az prijde skutecny RevenueCat, muselo by
   se prepisovat na peti mistech naraz a kazde z nich by slo
   rozbit zvlast. Tenhle modul je jedine misto, ktere o obchodu
   vi. Zbytek appky se pta jen jeho.

   DVA REZIMY
   - 'mock'       : stav je v localStorage, nic se neplati. Pouzije
                    se v prohlizeci a vsude, kde plugin chybi.
                    Chova se PRESNE jako dosud, cte stejne klice,
                    takze tvuj rozehrany testovaci stav zustava.
   - 'revenuecat' : skutecne nakupy pres Google Play. Zapne se sam,
                    kdyz appka bezi nativne A je nainstalovany
                    plugin @revenuecat/purchases-capacitor
                    A je vyplneny API klic nize.

   SYNCHRONNI vs ASYNCHRONNI
   Cela appka se pta synchronne (msCanAddContent() vraci true/false
   hned, uprostred klikani). RevenueCat ale odpovida asynchronne
   pres sit. Reseni: modul si drzi SNAPSHOT posledniho zjisteneho
   stavu v localStorage. Cteni je proto vzdy okamzite, aktualizace
   probiha na pozadi pri startu appky a po kazdem nakupu.

   Dusledek, ktery je potreba znat: kdyz uzivatel zrusi predplatne
   na jinem telefonu, tenhle telefon se to dozvi az pri pristim
   startu. To je u offline appky v poradku a RevenueCat to resi
   stejne.

   CO JE POTREBA DOPLNIT, AZ GOOGLE ODBLOKUJE UCET
   1) npm install @revenuecat/purchases-capacitor
      npx cap sync android          <- POZOR: sync, ne copy!
   2) Vyplnit RC_API_KEY_ANDROID nize (RevenueCat -> Project
      Settings -> API keys -> Google Play, zacina "goog_").
   3) Zkontrolovat, ze se identifikatory nize shoduji s tim, co je
      nastavene v RevenueCat.
   Vic uz nic. Zadny jiny soubor se menit nemusi.
   ========================================================== */

const MSBilling = (function(){

  /* ---------- NASTAVENI (jedine, co se doplnuje rucne) ---------- */

  // Verejny Google klic z RevenueCat (Project Settings -> API keys ->
  // Google Play). Zacina "goog_".
  //
  // POZOR (1.9.2026): klic zacinajici "test_" je TESTOVACI a nakupy
  // proti Google Play s nim neprojdou. Kdyby se takovy klic dostal do
  // buildu, appka by se tvarila, ze uctuje, a nakupy by tise
  // selhavaly. Modul proto takovy klic odmitne a zustane v mock
  // rezimu - viz zjistiBackend().
  const RC_API_KEY_ANDROID = '';

  // Narok na predplatne tak, jak je zalozeny v RevenueCat.
  const ENTITLEMENT_PREMIUM = 'premium';
  const PACKAGE_MESICNI = 'monthly';

  /* ---------- SLOTY NA DALSI STAVBY (1.9.2026) ----------

     PROC ZEBRIK MISTO JEDNOHO OPAKOVANE KUPOVANEHO PRODUKTU

     Aby sel jeden a tyz produkt koupit vickrat, musel by byt v Play
     zalozeny jako SPOTREBNI. RevenueCat ale u aplikaci BEZ
     PRIHLASOVANI spotrebni produkty spotrebuje a od verze SDK 9.0.0
     uz se nedaji obnovit; Google Play Billing 8 k tomu odstranil
     rozhrani pro dotaz na spotrebovane jednorazove produkty.

     Moje Stavba zadny ucet nema. Clovek, ktery si koupi tri sloty a
     pak prejde na novy telefon, by o zaplacene penize nenavratne
     prisel.

     Reseni: kazdy slot je SAMOSTATNY NESPOTREBNI produkt. Ty jdou
     obnovit naporad i bez uctu. "Chci treti stavbu" = koupit
     extra_project_3.

     Strop je 5 staveb celkem: jedna zakladni (krytá zkusebni dobou
     nebo predplatnym) + ctyri prikoupene. Pokryje to i clovka, ktery
     resi dum, byt, garaz, zahradu a chatu naráz. Strop je zamerne
     viditelny i v appce, at nikdo neceka, ze si muze koupit slotu
     kolik chce.
     ------------------------------------------------------- */

  // Poradi je zavazne - kupuje se vzdy nejnizsi jeste nevlastneny.
  // Nazvy musi presne sedet s product ID v Play Console I s nazvy
  // naroku (entitlements) v RevenueCat.
  const SLOT_LADDER = ['extra_project_2', 'extra_project_3', 'extra_project_4', 'extra_project_5'];

  // Kolik staveb smi mit clovek celkem, kdyz dokoupi uplne vsechno.
  const MS_MAX_PROJECTS = 1 + SLOT_LADDER.length;   // = 5

  /* ---------- MOCK KLICE (zustavaji stejne jako dosud) ---------- */
  const MOCK_SUB_KEY = 'ms_subscription_active_mock_v1';
  const MOCK_SLOTS_KEY = 'ms_extra_project_slots_v1';

  /* ---------- SNAPSHOT (pro rychle synchronni cteni) ---------- */
  const SNAPSHOT_KEY = 'ms_billing_snapshot_v1';

  let rezim = 'mock';
  let pluginPurchases = null;
  let inicializovano = false;
  const posluchaci = [];

  function nactiSnapshot(){
    try{
      const raw = localStorage.getItem(SNAPSHOT_KEY);
      if(!raw) return { subscriptionActive:false, extraSlots:0, aktualizovano:null };
      const o = JSON.parse(raw);
      return {
        subscriptionActive: !!o.subscriptionActive,
        extraSlots: parseInt(o.extraSlots, 10) || 0,
        aktualizovano: o.aktualizovano || null
      };
    }catch(e){
      return { subscriptionActive:false, extraSlots:0, aktualizovano:null };
    }
  }

  let snapshot = nactiSnapshot();

  function ulozSnapshot(novy){
    const zmena = novy.subscriptionActive !== snapshot.subscriptionActive
               || novy.extraSlots !== snapshot.extraSlots;
    snapshot = {
      subscriptionActive: !!novy.subscriptionActive,
      extraSlots: parseInt(novy.extraSlots, 10) || 0,
      aktualizovano: new Date().toISOString()
    };
    try{ localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot)); }catch(e){}
    if(zmena) ohlasZmenu();
  }

  function ohlasZmenu(){
    posluchaci.slice().forEach(fn => { try{ fn(); }catch(e){ console.error(e); } });
  }


  /* ============================================================
     BACKEND: MOCK
     ============================================================ */
  const backendMock = {
    nazev: 'mock',
    async init(){ /* nic k pripraveni */ },
    async nactiStav(){
      let sub = false, slots = 0;
      try{ sub = localStorage.getItem(MOCK_SUB_KEY) === '1'; }catch(e){}
      try{ slots = parseInt(localStorage.getItem(MOCK_SLOTS_KEY) || '0', 10) || 0; }catch(e){}
      return { subscriptionActive: sub, extraSlots: slots };
    },
    async koupitPredplatne(){
      try{ localStorage.setItem(MOCK_SUB_KEY, '1'); }catch(e){}
      return { ok:true };
    },
    async koupitDalsiStavbu(){
      try{
        const soucasne = parseInt(localStorage.getItem(MOCK_SLOTS_KEY) || '0', 10) || 0;
        if(soucasne >= SLOT_LADDER.length) return { ok:false, chyba:'Máš už maximální počet staveb.' };
        localStorage.setItem(MOCK_SLOTS_KEY, String(soucasne + 1));
      }catch(e){}
      return { ok:true };
    },
    async obnovitNakupy(){
      return { ok:true, obnoveno:false };
    },
    async zrusitPredplatne(){
      try{ localStorage.setItem(MOCK_SUB_KEY, '0'); }catch(e){}
      return { ok:true };
    }
  };


  /* ============================================================
     BACKEND: REVENUECAT
     ============================================================ */
  const backendRevenueCat = {
    nazev: 'revenuecat',

    async init(){
      await pluginPurchases.configure({ apiKey: RC_API_KEY_ANDROID });
      // Kdyz se stav zmeni jinde (napr. uzivatel zrusi predplatne
      // primo v Play Store a vrati se do appky), RevenueCat nam to
      // rekne sam - snapshot pak nemusi cekat na restart.
      try{
        await pluginPurchases.addCustomerInfoUpdateListener((info)=>{
          try{ ulozSnapshot(prelozCustomerInfo(info && info.customerInfo ? info.customerInfo : info)); }
          catch(e){ console.error('MSBilling: listener selhal', e); }
        });
      }catch(e){ /* starsi verze pluginu listener mit nemusi */ }
    },

    async nactiStav(){
      const res = await pluginPurchases.getCustomerInfo();
      return prelozCustomerInfo(res && res.customerInfo ? res.customerInfo : res);
    },

    async koupitPredplatne(){
      const balicek = await najdiBalicek(PACKAGE_MESICNI);
      if(!balicek) return { ok:false, chyba:'Nabídka předplatného se nenačetla. Zkus to prosím za chvíli.' };
      return await proved(()=> pluginPurchases.purchasePackage({ packageToPurchase: balicek }));
    },

    async koupitDalsiStavbu(){
      // Kupuje se vzdy nejnizsi jeste nevlastneny stupen zebriku.
      // Nejdriv se proto zeptame, co uz clovek ma - snapshot muze byt
      // starsi (treba po obnoveni nakupu na jinem telefonu).
      let info = null;
      try{
        const res = await pluginPurchases.getCustomerInfo();
        info = (res && res.customerInfo) ? res.customerInfo : res;
      }catch(e){
        return { ok:false, chyba:'Nepodařilo se spojit s obchodem. Zkontroluj připojení.' };
      }
      const stupen = dalsiSlotKKoupi(info);
      if(!stupen) return { ok:false, chyba:'Máš už maximální počet staveb (' + MS_MAX_PROJECTS + ').' };

      const balicek = await najdiBalicek(stupen);
      if(!balicek) return { ok:false, chyba:'Nabídka se nenačetla. Zkus to prosím za chvíli.' };
      return await proved(()=> pluginPurchases.purchasePackage({ packageToPurchase: balicek }));
    },

    async obnovitNakupy(){
      try{
        const res = await pluginPurchases.restorePurchases();
        const stav = prelozCustomerInfo(res && res.customerInfo ? res.customerInfo : res);
        return { ok:true, obnoveno: stav.subscriptionActive || stav.extraSlots > 0, stav };
      }catch(err){
        return { ok:false, chyba: popisChyby(err) };
      }
    },

    async zrusitPredplatne(){
      // Zrusit predplatne nejde z appky - dela se to v Play Store.
      // Vraci se pokyn, ktery obrazovka ukaze uzivateli.
      return { ok:false, presmerovatDoObchodu:true };
    }
  };

  function prelozCustomerInfo(info){
    const aktivni = (info && info.entitlements && info.entitlements.active) || {};
    // Kazdy stupen zebriku je vlastni nespotrebni produkt s vlastnim
    // narokem. Pocet slotu = kolik jich clovek vlastni. Schvalne se
    // NEpocita jen "nejvyssi vlastneny" - kdyby nekdy vypadl
    // prostredni nakup (refundace), ma se pocet snizit, ne zustat.
    let sloty = 0;
    for(let i = 0; i < SLOT_LADDER.length; i++){
      if(aktivni[SLOT_LADDER[i]]) sloty++;
    }
    return {
      subscriptionActive: !!aktivni[ENTITLEMENT_PREMIUM],
      extraSlots: Math.min(sloty, SLOT_LADDER.length)
    };
  }

  /* Ktery stupen zebriku se ma koupit jako dalsi. Vraci null, kdyz uz
     clovek vlastni vsechno. */
  function dalsiSlotKKoupi(info){
    const aktivni = (info && info.entitlements && info.entitlements.active) || {};
    for(let i = 0; i < SLOT_LADDER.length; i++){
      if(!aktivni[SLOT_LADDER[i]]) return SLOT_LADDER[i];
    }
    return null;
  }

  async function najdiBalicek(identifikator){
    try{
      const res = await pluginPurchases.getOfferings();
      const nabidka = res && res.current;
      if(!nabidka || !nabidka.availablePackages) return null;
      return nabidka.availablePackages.find(p => p.identifier === identifikator)
          || nabidka.availablePackages.find(p => (p.packageType || '').toLowerCase() === identifikator)
          || null;
    }catch(e){
      console.error('MSBilling: nacteni nabidky selhalo', e);
      return null;
    }
  }

  async function proved(akce){
    try{
      const res = await akce();
      const stav = prelozCustomerInfo(res && res.customerInfo ? res.customerInfo : res);
      return { ok:true, stav };
    }catch(err){
      if(jeZruseniUzivatelem(err)) return { ok:false, zrusenoUzivatelem:true };
      return { ok:false, chyba: popisChyby(err) };
    }
  }

  function jeZruseniUzivatelem(err){
    if(!err) return false;
    if(err.userCancelled === true || err.userCanceled === true) return true;
    const t = String(err.message || err.errorMessage || err.code || '');
    return /cancel/i.test(t);
  }

  function popisChyby(err){
    const t = String((err && (err.message || err.errorMessage)) || '');
    if(/network|connect|timeout/i.test(t)) return 'Nepodařilo se spojit s obchodem. Zkontroluj připojení k internetu.';
    if(/already|owned/i.test(t)) return 'Tenhle nákup už na účtu máš. Zkus „Obnovit nákupy“.';
    return 'Nákup se nepodařilo dokončit. Zkus to prosím znovu.';
  }


  /* ============================================================
     VOLBA BACKENDU
     ============================================================ */
  function zjistiBackend(){
    try{
      if(!RC_API_KEY_ANDROID) return backendMock;
      // (1.9.2026) Testovaci klic z RevenueCat zacina "test_". S nim
      // nakupy proti Google Play neprojdou - appka by se tvarila, ze
      // uctuje, a nakupy by tise selhavaly. Radeji zustat v mocku.
      if(/^test_/i.test(RC_API_KEY_ANDROID)){
        console.warn('MSBilling: RC_API_KEY_ANDROID je TESTOVACI klic (test_). Zustavam v mock rezimu. Pred vydanim doplnit produkcni klic zacinajici goog_.');
        return backendMock;
      }
      const cap = window.Capacitor;
      if(!(cap && cap.isNativePlatform && cap.isNativePlatform())) return backendMock;
      const plug = cap.Plugins && cap.Plugins.Purchases;
      if(!plug) return backendMock;
      pluginPurchases = plug;
      return backendRevenueCat;
    }catch(e){
      return backendMock;
    }
  }

  let backend = backendMock;


  /* ============================================================
     VEREJNE ROZHRANI
     ============================================================ */

  /* Zavola se jednou pri startu appky (z main.js). Nikdy nevyhodi
     vyjimku - kdyz se neco pokazi, appka jede dal na snapshotu
     a nejhur nabidne nakup, ktery uzivatel uz ma. */
  async function init(){
    if(inicializovano) return;
    inicializovano = true;
    backend = zjistiBackend();
    rezim = backend.nazev;
    try{
      await backend.init();
      await refresh();
    }catch(err){
      console.error('MSBilling: inicializace selhala, jede se na uloženém stavu', err);
    }
  }

  /* Znovu zjisti skutecny stav a prepise snapshot. */
  async function refresh(){
    try{
      const stav = await backend.nactiStav();
      ulozSnapshot(stav);
      return true;
    }catch(err){
      console.error('MSBilling: nacteni stavu selhalo', err);
      return false;
    }
  }

  /* Synchronni cteni - tohle vola zbytek appky. */
  function isSubscriptionActive(){ return snapshot.subscriptionActive; }
  function extraProjectSlots(){ return Math.min(snapshot.extraSlots, SLOT_LADDER.length); }
  /* Strop poctu staveb. Cte se i v data.js a na platebni brane, at je
     cislo na jednom miste a nemusi se hlidat na peti. */
  function maxProjects(){ return MS_MAX_PROJECTS; }
  function canBuyAnotherSlot(){ return extraProjectSlots() < SLOT_LADDER.length; }

  async function purchaseSubscription(){
    const vysledek = await backend.koupitPredplatne();
    if(vysledek.ok) await refresh();
    return vysledek;
  }

  async function purchaseExtraProject(){
    const vysledek = await backend.koupitDalsiStavbu();
    if(vysledek.ok) await refresh();
    return vysledek;
  }

  async function restore(){
    const vysledek = await backend.obnovitNakupy();
    if(vysledek.ok) await refresh();
    return vysledek;
  }

  async function cancelSubscription(){
    const vysledek = await backend.zrusitPredplatne();
    if(vysledek.ok) await refresh();
    return vysledek;
  }

  /* Otevre spravu predplatneho v Google Play. */
  function openStoreSubscriptions(){
    try{ window.open('https://play.google.com/store/account/subscriptions', '_blank'); }
    catch(e){}
  }

  function onChange(fn){ if(typeof fn === 'function') posluchaci.push(fn); }
  function mode(){ return rezim; }
  function isMock(){ return rezim === 'mock'; }

  return {
    init, refresh, onChange, mode, isMock,
    isSubscriptionActive, extraProjectSlots, maxProjects, canBuyAnotherSlot,
    purchaseSubscription, purchaseExtraProject, restore,
    cancelSubscription, openStoreSubscriptions
  };
})();
