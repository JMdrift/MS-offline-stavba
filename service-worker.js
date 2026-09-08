/* Moje Stavba Offline — kompletni app shell bez externich CDN. */
const CACHE_NAME = 'moje-stavba-v276-offline';
const APP_SHELL = [
  './', './index.html', './app.css', './manifest.json', './privacy.html',
  './jspdf.umd.min.js', './pdf-lib.min.js', './pdf-font.js', './pdf-generator.js',
  './applock.js', './native.js', './billing.js', './data.js', './icons.js', './router.js', './notifications.js', './layout.js', './keyboard-manager.js', './tour.js', './main.js',
  './screen-appLock.js', './screen-onboarding.js', './screen-dashboard.js',
  './screen-stagesWheel.js', './screen-stagesList.js', './screen-stageDetail.js',
  './screen-newStage.js', './screen-diary.js', './screen-diaryExport.js',
  './screen-finance.js', './screen-transactions.js', './screen-stageExpenses.js',
  './screen-gallery.js', './screen-calendar.js', './screen-tasks.js', './screen-news.js',
  './screen-project.js', './screen-misc.js', './screen-settings.js', './screen-legal.js',
  './screen-forms.js', './screen-deposits.js', './screen-deposit-forms.js', './screen-backup.js', './screen-paywall.js',
  './icon-192.png', './icon-512.png', './icon-512-maskable.png', './logo-mark.png',
  './mj-production-logo.png', './house.jpg', './house-dark.jpg',
  './stage-bazen-dark.jpg', './stage-chytra_domacnost-dark.jpg',
  './stage-demolice-dark.jpg', './stage-elektro-dark.jpg', './stage-garaz-dark.jpg',
  './stage-hruba-dark.jpg', './stage-interier-dark.jpg', './stage-koupelna-dark.jpg',
  './stage-kuchyne-dark.jpg', './stage-malby_natery-dark.jpg', './stage-naradi-dark.jpg',
  './stage-okna-dark.jpg', './stage-plot-dark.jpg', './stage-podlahy-dark.jpg',
  './stage-posledni_upravy-dark.jpg', './stage-pozemek-dark.jpg',
  './stage-projekt_povoleni-dark.jpg', './stage-rekuperace-dark.jpg',
  './stage-sanace_vlhkosti-dark.jpg', './stage-strecha-dark.jpg',
  './stage-voda-dark.jpg', './stage-vytapeni-dark.jpg', './stage-zahrada-dark.jpg',
  './stage-zaklady-dark.jpg', './stage-zatepleni-dark.jpg', './stage-zemni-dark.jpg'
];

self.addEventListener('install', event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=> cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=> Promise.all(keys.filter(key=> key !== CACHE_NAME).map(key=> caches.delete(key))))
      .then(()=> self.clients.claim())
  );
});

self.addEventListener('fetch', event=>{
  if(event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if(url.origin !== self.location.origin) return;

  // OPRAVA (30.8.2026): puvodni strategie byla "cache-first" - appka
  // se PRVNI zeptala mezipameti, a pokud tam soubor uz byl (z uplne
  // prvniho spusteni), sit uz vubec nekontrolovala. Kazda dalsi
  // aktualizace appky (nova verze data.js, screen-*.js apod.) se tak
  // do bezici appky nikdy nedostala - appka poctive ukazovala tu
  // UPLNE PRVNI nainstalovanou verzi porad dokola, dokud nekdo rucne
  // nesmazal data appky (adb shell pm clear). Ted appka zkousi SIT
  // JAKO PRVNI (u appky zabalene pres Capacitor to nejsou zadna
  // pomala data přes internet - soubory jsou soucasti appky samotne,
  // tak je to porad rychle) a teprve kdyz sit selze (appka je
  // OPRAVDU offline, napr. na stavbe bez signalu), pouzije se to,
  // co uz ma v mezipameti ulozene z minula.
  event.respondWith(
    fetch(event.request).then(response=>{
      if(response && response.ok){
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache=> cache.put(event.request, copy)).catch(()=>{});
      }
      return response;
    }).catch(()=>{
      return caches.match(event.request).then(cached=>{
        if(cached) return cached;
        if(event.request.mode === 'navigate') return caches.match('./index.html');
        return new Response('', {status: 504, statusText: 'Offline a soubor neni v mezipameti'});
      });
    })
  );
});
