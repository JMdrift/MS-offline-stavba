/* ==========================================================
   OFFLINE BOOT
   Tato osobni verze nema ucet, Google, Supabase ani sitovou
   synchronizaci. Vsechna data zustavaji v localStorage/IndexedDB
   konkretniho prohlizece nebo nainstalovane PWA.
   ========================================================== */
(async function(){
  /* (31.8.2026) Cislo verze uz se na splashi neukazuje - uzivateli nic
     nerika. Zustava jedine v Nastaveni -> O aplikaci, kde ho v pripade
     potreby najde i podpora. Prazdny prvek v index.html schvalne
     zustava, aby se nerozhodila vyska splashe. */

  try{
    if(window.Capacitor && typeof window.Capacitor.getPlatform === 'function' && window.Capacitor.getPlatform() === 'android'){
      document.documentElement.classList.add('is-android-native');
    }
  }catch(e){}

  /* VYSKA APPKY PRI KLAVESNICI - kde to hledat (3.9.2026)
     Neresi se tady. Cely vypocet --app-vh je v index.html v hlavicce,
     schvalne co nejdriv, aby appka mela spravnou vysku jeste driv, nez
     se vykresli prvni obrazovka. Viz komentar tamtez.
     Dvakrat se to zkouselo resit i odsud a pokazde to neco rozbilo -
     tady uz na to prosim nesahat. */

  /* (31.8.2026) Zamek appky se resi jako PRVNI - drive nez se
     vykresli jakakoli obrazovka s daty. Await je tu schvalne:
     dokud se clovek neoveri, nesmi se pod prekryvem nic nacist. */
  try{
    if(typeof MSAppLock !== 'undefined') await MSAppLock.init();
  }catch(e){ console.error('MSAppLock.init selhal', e); }

  try{
    if(typeof MSNative !== 'undefined') MSNative.init();
  }catch(e){ console.error('MSNative.init selhal', e); }

  /* (31.8.2026) Nastartovat platebni vrstvu. Zamerne BEZ await -
     appka na odpoved obchodu cekat nesmi. Do te doby se jede na
     ulozenem snapshotu z minula; jakmile prijde skutecny stav,
     MSBilling.onChange prekresli odznak na dashboardu. */
  try{
    if(typeof MSBilling !== 'undefined'){
      MSBilling.init().catch(err => console.error('MSBilling.init selhal', err));
    }
  }catch(e){ console.error(e); }

  msMigrateLegacyDataToProject();
  await msMigratePhotosDocsToIdb();
  if(typeof msCompactDiaryPhotoCopies === 'function'){
    if(typeof window.__msSplashProgress === 'function') window.__msSplashProgress(1, 3, 'Kontroluji místní úložiště…');
    await msCompactDiaryPhotoCopies();
  }

  let lastProgress = 0;
  await msHydrateBlobCache((done, total)=>{
    const now = Date.now();
    if(done !== total && now - lastProgress < 80) return;
    lastProgress = now;
    if(typeof window.__msSplashProgress === 'function'){
      window.__msSplashProgress(done, total, `Načítám místní náhledy… ${done}/${total}`);
    }
  });

  if(typeof msBuildMissingThumbs === 'function') setTimeout(msBuildMissingThumbs, 1800);
  if(typeof msBuildMissingFileThumbs === 'function') setTimeout(msBuildMissingFileThumbs, 2600);
  Layout.applyTheme(Layout.getTheme());
  if(typeof msApplyUiScale === 'function') msApplyUiScale();
  msEnsureCurrentStageDayRecorded();

  /* Prohlížeč může místní data označit jako trvalá. Ruční záloha
     v Nastavení přesto zůstává nejjistější ochranou. */
  try{
    if(navigator.storage && navigator.storage.persist) await navigator.storage.persist();
  }catch(e){}

  const noRealRoute = !location.hash || location.hash === '#/dashboard' || !location.hash.startsWith('#/');
  const hasProject = msLoadProjects().length > 0;
  if(hasProject && typeof msSetOnboarded === 'function') msSetOnboarded();

  if(!hasProject && noRealRoute){
    location.hash = '#/onboarding-project';
  }
  /* (31.8.2026) Vypadlo tu vynucene presmerovani na obrazovku zamku.
     Appka po prvnim spusteni mirila rovnou na zabezpeceni, coz je
     otazka, na kterou clovek nema jak odpovedet driv, nez vi, co
     v appce vlastne bude mit. Zamek je nove k dispozici v Nastaveni. */

  Router.renderCurrent();
  // Nativni pripominky se po startu znovu sesynchronizuji se skutecnymi
  // daty. Bezi na pozadi, start obrazovky na ne neceka.
  try{
    if(typeof MSNotifications !== 'undefined') MSNotifications.init().catch(e=>console.error('MSNotifications.init selhal',e));
  }catch(e){ console.error(e); }
  if(typeof window.__msSplashDone === 'function') window.__msSplashDone();
})().catch(function(error){
  console.error('Spuštění offline appky selhalo', error);
  if(typeof window.__msSplashDone === 'function') window.__msSplashDone();
});
