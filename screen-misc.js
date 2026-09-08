/* ==========================================================
   OSLAVNA OBRAZOVKA
   ========================================================== */
const CelebrationScreen = (function(){
  function render(container, params){
    const title = params.title || 'Gratulujeme!';
    const colors = ['#4dffab','#b34cff','#25e8ff','#ffd35c','#ff5e7b','#25b7ff'];
    let fireworksHtml = '';
    for(let burst=0; burst<3; burst++){
      const cx = 20 + burst*30 + Math.random()*10;
      const cy = 20 + Math.random()*30;
      const delay = burst*0.35;
      let particles = '';
      for(let i=0;i<14;i++){
        const angle = (360/14)*i;
        const dist = 55 + Math.random()*25;
        const color = colors[(burst+i) % colors.length];
        const dx = Math.cos(angle*Math.PI/180)*dist;
        const dy = Math.sin(angle*Math.PI/180)*dist;
        particles += `<i style="position:absolute;left:${cx}%;top:${cy}%;width:5px;height:5px;border-radius:50%;background:${color};
          box-shadow:0 0 6px ${color};animation:fwPart 1.1s ${delay}s ease-out forwards;--dx:${dx.toFixed(0)}px;--dy:${dy.toFixed(0)}px"></i>`;
      }
      fireworksHtml += particles;
    }
    container.innerHTML = `
      <style>
        @keyframes fwPart{
          0%{ transform:translate(0,0) scale(1); opacity:1; }
          100%{ transform:translate(var(--dx),var(--dy)) scale(.2); opacity:0; }
        }
        @keyframes fwPop{ 0%{transform:scale(.6);opacity:0} 60%{transform:scale(1.08);opacity:1} 100%{transform:scale(1)} }
      </style>
      <div style="position:absolute;inset:0;pointer-events:none;overflow:hidden">${fireworksHtml}</div>
      <div class="celebration-v2-screen">
        <div class="celebration-v2-card">
        <div class="celebration-v2-icon">
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>
        </div>
        <p class="setup-v2-kicker">Stavba dokončena</p>
        <h1>${title}</h1>
        <div class="celebration-v2-stats">
          <div><b>${params.photos||0}</b><span>fotek</span></div>
          <div><b>${Number(params.money||0).toLocaleString('cs-CZ')} Kč</b><span>celkem utraceno</span></div>
        </div>
        <button class="btn-primary" id="contBtn">Pokračovat</button>
        </div>
      </div>
    `;
    container.querySelector('#contBtn').addEventListener('click', ()=> Router.go('dashboard'));
    return { showNav:false };
  }
  return { render };
})();
Router.register('celebration', CelebrationScreen);


/* ==========================================================
   NABIDKY A DULEZITE - jednoduche zastupne obrazovky (stub)
   ========================================================== */
function stubScreen(routeName, title, desc){
  Router.register(routeName, {
    render(container){
      container.innerHTML = `
        <div class="topbar ms-ui-topbar">
          <div class="back-btn" id="backBtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></div>
          <div class="ms-ui-title"><p>Moje Stavba</p><h1>${title}</h1></div>
        </div>
        <div class="stub-v2-screen">
          <div class="stub-v2-card"><span>Připravujeme</span><h2>${title}</h2><p>${desc}</p></div>
        </div>
      `;
      container.querySelector('#backBtn').addEventListener('click', ()=> Router.back());
      return { showNav:true, activeTab:'' };
    }
  });
}
stubScreen('offers', 'Nabídky', 'Porovnávání nabídek od řemeslníků a dodavatelů přijde v další verzi appky.');
