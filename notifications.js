/* ==========================================================
   NATIVNI LOKALNI OZNAMENI (4.9.2026)
   Android/Capacitor: @capacitor/local-notifications
   - udalosti
   - ukoly s datumem/deadlinem
   - deadline planovanych vydaju (3 dny predem + v den terminu)

   Oznamení jsou zamerne INEXACT: nepotrebujeme specialni Android
   opravneni pro presny budik. System muze cas o trochu posunout.
   ========================================================== */
const MSNotifications = (function(){
  const ENABLED_KEY = 'ms_notifications_enabled_v1';
  const CHANNEL_ID = 'ms_reminders';
  let syncTimer = null;
  let initialized = false;
  let listenerInstalled = false;
  let hooksInstalled = false;
  let lifecycleInstalled = false;

  function nativePlugin(){
    try{
      if(!window.Capacitor || typeof window.Capacitor.getPlatform !== 'function') return null;
      if(window.Capacitor.getPlatform() === 'web') return null;
      return window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications
        ? window.Capacitor.Plugins.LocalNotifications : null;
    }catch(e){ return null; }
  }
  function isNativeAvailable(){ return !!nativePlugin(); }
  function enabled(){ try{ return localStorage.getItem(ENABLED_KEY)==='1'; }catch(e){ return false; } }
  function setLocalEnabled(on){ try{ localStorage.setItem(ENABLED_KEY,on?'1':'0'); }catch(e){} }

  function hashId(input){
    let h = 2166136261;
    const s = String(input||'');
    for(let i=0;i<s.length;i++){
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    // Android vyzaduje 32-bit integer; nula si nechavame jako rezervu.
    return (h >>> 0) % 2147483000 + 1;
  }

  function projectName(pid){
    try{
      const list = JSON.parse(localStorage.getItem('ms_projects_v1')||'[]');
      const p = list.find(x=>x.id===pid);
      return p && p.name ? p.name : 'Moje Stavba';
    }catch(e){ return 'Moje Stavba'; }
  }
  function projectList(){
    try{ return JSON.parse(localStorage.getItem('ms_projects_v1')||'[]'); }catch(e){ return []; }
  }
  function readProject(base,pid){
    let raw = null;
    try{
      raw = localStorage.getItem(base+'__'+pid);
      // Pojistka pro velmi starou jedinou stavbu pred migraci projektu.
      if(raw===null && projectList().length===1) raw = localStorage.getItem(base);
      return raw ? JSON.parse(raw) : [];
    }catch(e){ return []; }
  }
  function atLocal(iso, time){
    if(!iso) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if(!m) return null;
    const tm = /^(\d{1,2}):(\d{2})$/.exec(time||'09:00');
    const h = tm ? Number(tm[1]) : 9, min = tm ? Number(tm[2]) : 0;
    const d = new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),h,min,0,0);
    return isNaN(d.getTime()) ? null : d;
  }
  function minusDays(iso,n){
    const d=atLocal(iso,'09:00'); if(!d) return null;
    d.setDate(d.getDate()-n); return d;
  }
  function future(d){ return d && d.getTime() > Date.now()+15000; }

  function item({id,title,body,when,projectId,route,type,itemId}){
    if(!future(when)) return null;
    return {
      id: hashId(id), title, body,
      schedule:{ at:when, allowWhileIdle:true },
      isExactNotification:false,
      channelId:CHANNEL_ID,
      extra:{ projectId, route, type, itemId }
    };
  }

  function buildSchedule(){
    const out=[];
    projectList().forEach(p=>{
      const pid=p.id, pname=projectName(pid);
      const events=readProject('ms_events_v1',pid);
      events.forEach(ev=>{
        const when=atLocal(ev.date,ev.time||'09:00');
        const n=item({
          id:`${pid}:event:${ev.id}`, title:ev.title||'Událost',
          body:`${pname} · ${ev.time ? 'dnes v '+ev.time : 'celodenní událost'}`,
          when, projectId:pid, route:'calendar', type:'event', itemId:ev.id
        }); if(n) out.push(n);
      });

      const tasks=readProject('ms_tasks_v1',pid);
      tasks.filter(t=>!t.done && t.date && t.dateMode!=='none').forEach(t=>{
        const when=atLocal(t.date,(t.dateMode==='date' && t.time) ? t.time : '09:00');
        const n=item({
          id:`${pid}:task:${t.id}`, title:t.title||'Úkol',
          body:`${pname} · ${t.dateMode==='deadline'?'deadline':'úkol'}`,
          when, projectId:pid, route:'tasks', type:'task', itemId:t.id
        }); if(n) out.push(n);
      });

      const expenses=readProject('ms_expenses_v1',pid);
      expenses.filter(t=>t.type==='planned' && !t.planClosed && t.date && (!t.dateMode || t.dateMode==='deadline')).forEach(t=>{
        const three=minusDays(t.date,3);
        const due=atLocal(t.date,'09:00');
        const amount=Number(t.amount||0).toLocaleString('cs-CZ')+' Kč';
        const a=item({
          id:`${pid}:planned:${t.id}:pre3`, title:'Blíží se plánovaný výdaj',
          body:`${t.title||'Plánovaný výdaj'} · ${amount} · za 3 dny`,
          when:three, projectId:pid, route:'finance', type:'planned', itemId:t.id
        }); if(a) out.push(a);
        const b=item({
          id:`${pid}:planned:${t.id}:due`, title:'Deadline plánovaného výdaje',
          body:`${t.title||'Plánovaný výdaj'} · ${amount}. Je už vyřešený?`,
          when:due, projectId:pid, route:'finance', type:'planned', itemId:t.id
        }); if(b) out.push(b);
      });
    });
    return out;
  }

  async function ensureChannel(){
    const p=nativePlugin(); if(!p || !p.createChannel) return;
    try{ await p.createChannel({ id:CHANNEL_ID, name:'Připomínky', description:'Termíny, úkoly a plánované výdaje', importance:4 }); }catch(e){}
  }
  async function permission(){
    const p=nativePlugin();
    if(!p) return {mode:'web', granted: typeof Notification!=='undefined' && Notification.permission==='granted'};
    try{
      const r=await p.checkPermissions();
      return {mode:'native', granted:r && r.display==='granted', raw:r && r.display};
    }catch(e){ return {mode:'native',granted:false,raw:'error'}; }
  }
  async function getStatus(){
    const perm=await permission();
    return { enabled:enabled() && perm.granted, wanted:enabled(), granted:perm.granted, mode:perm.mode, raw:perm.raw||null };
  }

  async function sync(){
    const p=nativePlugin();
    if(!p || !enabled()) return false;
    const perm=await permission();
    if(!perm.granted) return false;
    await ensureChannel();
    try{ if(p.cancelAll) await p.cancelAll(); }catch(e){}
    const notifications=buildSchedule();
    // Android ma prakticke limity na pocet naplanovanych alarmu. Pro bezny
    // projekt se sem ani nepriblizime, ale chrani to appku pred omylem.
    const batch=notifications
      .sort((a,b)=>{
        const ta=a && a.schedule && a.schedule.at ? new Date(a.schedule.at).getTime() : Infinity;
        const tb=b && b.schedule && b.schedule.at ? new Date(b.schedule.at).getTime() : Infinity;
        return ta-tb;
      })
      .slice(0,400);
    if(batch.length){
      try{ await p.schedule({notifications:batch}); }
      catch(e){ console.error('Naplanovani lokalnich notifikaci selhalo',e); return false; }
    }
    return true;
  }
  function queueSync(){
    if(!enabled()) return;
    if(syncTimer) clearTimeout(syncTimer);
    syncTimer=setTimeout(()=>{ syncTimer=null; sync().catch(e=>console.error(e)); },450);
  }

  async function setEnabled(on){
    const p=nativePlugin();
    if(p){
      if(!on){
        setLocalEnabled(false);
        try{ if(p.cancelAll) await p.cancelAll(); }catch(e){}
        return {ok:true,enabled:false};
      }
      let r=null;
      try{ r=await p.checkPermissions(); }catch(e){}
      if(!r || r.display!=='granted'){
        try{ r=await p.requestPermissions(); }catch(e){ return {ok:false,reason:'permission'}; }
      }
      if(!r || r.display!=='granted'){
        setLocalEnabled(false); return {ok:false,reason:'permission'};
      }
      setLocalEnabled(true);
      await sync();
      // Jednorazove potvrzeni, aby uzivatel hned videl, ze nativni vrstva funguje.
      try{
        await p.schedule({notifications:[{
          id:hashId('ms-notifications-enabled-confirmation'), title:'Moje Stavba',
          body:'Oznámení jsou zapnutá.', channelId:CHANNEL_ID,
          schedule:{at:new Date(Date.now()+1200),allowWhileIdle:true},
          isExactNotification:false,
          extra:{route:'settings'}
        }]});
      }catch(e){}
      return {ok:true,enabled:true};
    }

    // Web/PWA fallback. Prohlizec umi jen okamzite Notification, nikoli
    // spolehlive lokalni planovani po zavreni appky.
    if(typeof Notification==='undefined') return {ok:false,reason:'unsupported'};
    if(!on){ setLocalEnabled(false); return {ok:true,enabled:false}; }
    const r=await Notification.requestPermission();
    if(r!=='granted'){ setLocalEnabled(false); return {ok:false,reason:'permission'}; }
    setLocalEnabled(true);
    try{ new Notification('Moje Stavba',{body:'Oznámení jsou zapnutá.'}); }catch(e){}
    return {ok:true,enabled:true};
  }

  function installActionListener(){
    const p=nativePlugin(); if(!p || listenerInstalled || !p.addListener) return;
    listenerInstalled=true;
    p.addListener('localNotificationActionPerformed', action=>{
      try{
        const extra=action && action.notification && action.notification.extra || {};
        if(extra.projectId) localStorage.setItem('ms_active_project_v1',extra.projectId);
        const go=()=>{ try{ if(window.Router && extra.route) Router.go(extra.route); }catch(e){} };
        setTimeout(go,120);
      }catch(e){}
    }).catch(()=>{});
  }

  function installLifecycleHooks(){
    if(lifecycleInstalled) return; lifecycleInstalled=true;

    // Po navratu do aplikace prepocitame plan. Pomaha po zmene casoveho
    // pasma, po obnove dat a po delsim uspani telefonu. Sync je debounce
    // a probiha jen tehdy, kdyz ma uzivatel oznameni zapnuta.
    document.addEventListener('visibilitychange', ()=>{
      if(document.visibilityState === 'visible') queueSync();
    });

    try{
      const app = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
      if(app && app.addListener){
        app.addListener('appStateChange', state=>{ if(state && state.isActive) queueSync(); }).catch(()=>{});
      }
    }catch(e){}
  }

  function installMutationHooks(){
    if(hooksInstalled) return; hooksInstalled=true;
    [
      'msAddEvent','msUpdateEvent','msDeleteEvent',
      'msAddTask','msUpdateTask','msDeleteTask',
      'msAddTransaction','msUpdateTransaction','msDeleteTransaction',
      'msCreateProject','msUpdateProject','msDeleteProject'
    ].forEach(name=>{
      const original=window[name];
      if(typeof original!=='function' || original.__msNotifHook) return;
      const wrapped=function(){
        const result=original.apply(this,arguments);
        if(result && typeof result.then==='function') result.then(()=>queueSync()).catch(()=>{});
        else queueSync();
        return result;
      };
      wrapped.__msNotifHook=true;
      window[name]=wrapped;
    });
  }

  async function init(){
    if(initialized) return; initialized=true;
    installMutationHooks(); installActionListener(); installLifecycleHooks();
    if(enabled()) await sync();
  }

  return { init, sync, queueSync, setEnabled, getStatus, isNativeAvailable };
})();
