/* ==========================================================
   PLATEBNI BRANA (28.8.2026, prepojeno 31.8.2026)
   Obrazovka uz nesaha na mock stav primo - vsechny nakupy jdou pres
   vrstvu MSBilling (billing.js). Ta sama rozhodne, jestli se ma
   provest skutecny nakup pres Google Play, nebo jen mock. Az se
   vyplni API klic v billing.js, tahle obrazovka se menit nemusi.

   Duvod zobrazeni (parametr "reason") meni jen text nahore:
   - 'trial-expired' (vychozi): zkusebni doba vyprsela nebo predplatne
     neni aktivni - clovek se sem dostane z odznaku na dashboardu nebo
     kdyz appka zablokuje pridani noveho zaznamu.
   - 'extra-project': clovek chce zalozit DALSI stavbu nad ramec toho,
     co ma zaplacene.
   ========================================================== */
const PaywallScreen = (function(){
  function render(container, params){
    const reason = (params && params.reason) || 'trial-expired';
    const dny = msTrialDaysRemaining();
    // (28.8.2026) "jePremium" schvalne zahrnuje i tajny kod
    // (msHasLifetimeUnlock) - odemcena appka uz nepotrebuje nabidku
    // predplatneho ani slevovy kod, presne jako placici uzivatel.
    const jePremium = msIsSubscriptionActive() || msHasLifetimeUnlock();

    const nadpis = reason === 'extra-project'
      ? 'Chceš sledovat další stavbu?'
      : (jePremium ? 'Premium je aktivní' : (dny > 0 ? `Zkušební doba: zbývá ${dny} ${dny===1?'den':(dny<5?'dny':'dní')}` : 'Zkušební doba vypršela'));

    const popis = reason === 'extra-project'
      ? 'Základní předplatné pokrývá jednu stavbu. Další stavbu si můžeš jednorázově dokoupit — zůstane ti navždy, bez ohledu na to, jestli hlavní předplatné později zrušíš.'
      : (jePremium
          ? 'Máš plný přístup ke všem funkcím appky.'
          : 'Appka zůstává plně funkční na prohlížení, generátory (PDF) a export — jen nejde přidávat nová data (zápisy, fotky, výdaje, úkoly), dokud předplatné neaktivuješ.');

    container.innerHTML = `
      <div class="topbar ms-ui-topbar settings-v2-topbar">
        <div class="back-btn" id="backBtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></div>
        <div class="ms-ui-title"><p>Moje Stavba</p><h1>Předplatné</h1></div>
      </div>
      <div class="screen-scroll settings-v2-scroll">
        <div style="border:1px solid var(--line);padding:18px;text-align:center;margin-bottom:16px">
          <b style="display:block;font-size:16px;font-family:var(--font-head);margin-bottom:8px">${msEsc(nadpis)}</b>
          <p style="margin:0;font-size:11.5px;color:var(--muted);line-height:1.6">${msEsc(popis)}</p>
        </div>

        ${!jePremium ? `
        <div style="border:1.5px solid var(--accent);background:color-mix(in srgb, var(--accent) 6%, transparent);padding:16px;margin-bottom:12px">
          <b style="display:block;font-size:14px;margin-bottom:4px">Premium</b>
          <span style="display:block;font-size:20px;font-weight:800;color:var(--accent);margin-bottom:10px">149 Kč <span style="font-size:11px;font-weight:600;color:var(--muted)">/ měsíc</span></span>
          <button id="subscribeBtn" style="width:100%;padding:13px;font-weight:800;font-size:13px;background:linear-gradient(90deg,#25e8ff,#b34cff);color:#04070f;border:0;cursor:pointer;font-family:inherit">Aktivovat</button>
        </div>` : ''}

        ${!msHasLifetimeUnlock() ? (()=>{
          /* (1.9.2026) Strop poctu staveb. Musi byt videt DRIV, nez
             clovek zacne kupovat - jinak dokoupi ctvrtou stavbu a az
             pak zjisti, ze patou uz si nekoupi. */
          const strop = msMaxProjectsCeiling();
          const mam = msMaxAllowedProjects();
          const dalsiJde = msCanBuyAnotherProjectSlot();
          return `
        <div style="border:1px solid var(--line);padding:16px">
          <b style="display:block;font-size:14px;margin-bottom:4px">Další stavba</b>
          <span style="display:block;font-size:20px;font-weight:800;color:var(--text-main);margin-bottom:4px">249 Kč <span style="font-size:11px;font-weight:600;color:var(--muted)">jednorázově</span></span>
          <p style="margin:0 0 10px;font-size:10.5px;color:var(--muted);line-height:1.5">
            ${dalsiJde
              ? 'Teď můžeš vést ' + mam + (mam === 1 ? ' stavbu' : (mam < 5 ? ' stavby' : ' staveb')) + '. Slot zůstává navždy, i kdyby ses později rozhodl(a) hlavní předplatné zrušit. Celkem jich jde mít nejvýš ' + strop + '.'
              : 'Máš maximální počet staveb (' + strop + '). Víc jich aplikace vést neumí.'}
          </p>
          ${dalsiJde ? `<button id="extraSlotBtn" style="width:100%;padding:13px;font-weight:800;font-size:13px;border:1.5px solid var(--accent);background:transparent;color:var(--accent);cursor:pointer;font-family:inherit">Přikoupit ${mam + 1}. stavbu</button>` : ''}
        </div>`;
        })() : ''}

        ${!jePremium ? `
        <div style="margin-top:12px">
          <div id="promoRow" style="text-align:center;font-size:11.5px;color:var(--muted);text-decoration:underline;text-underline-offset:3px;cursor:pointer;padding:8px">Mám slevový kód</div>
          <div id="promoWrap" style="display:none;border:1px solid var(--line);padding:14px">
            <div style="display:flex;gap:8px">
              <input class="f-input" id="promoInput" placeholder="Kód" style="flex:1;text-transform:uppercase"/>
              <button id="promoGoBtn" style="flex:0 0 auto;border:1px solid var(--accent);background:transparent;color:var(--accent);padding:0 14px;cursor:pointer;font-weight:800;font-family:inherit;font-size:12px">Uplatnit</button>
            </div>
            <p id="promoErr" style="margin:8px 0 0;font-size:11px;color:#ff6b6b;min-height:14px"></p>
          </div>
        </div>` : ''}

        ${msIsSubscriptionActive() && !msHasLifetimeUnlock() ? `
        <div style="border:1px solid var(--line);padding:16px;margin-top:12px">
          <b style="display:block;font-size:13px;margin-bottom:4px">Spravovat předplatné</b>
          <p style="margin:0 0 10px;font-size:10.5px;color:var(--muted);line-height:1.5">${MSBilling.isMock() ? 'Testovací režim — zrušení se provede jen v appce.' : 'Zrušení se provádí v Google Play, v sekci Předplatná. Tlačítko tě tam přenese.'}</p>
          <button id="cancelSubBtn" style="width:100%;padding:12px;font-weight:800;font-size:12px;border:1.5px solid #ff7a86;background:transparent;color:#ff7a86;cursor:pointer;font-family:inherit">${MSBilling.isMock() ? 'Zrušit Premium (testovací)' : 'Zrušit předplatné'}</button>
        </div>` : ''}

        ${!msHasLifetimeUnlock() ? `
        <div id="restoreBtn" style="text-align:center;font-size:11.5px;color:var(--muted);text-decoration:underline;text-underline-offset:3px;cursor:pointer;padding:12px;margin-top:8px">Obnovit nákupy</div>` : ''}

        ${MSBilling.isMock() ? `
        <p style="text-align:center;font-size:9px;color:var(--muted);opacity:.6;margin-top:18px">Testovací režim — tlačítka zatím jen nastaví stav v appce, nic se neplatí doopravdy.</p>` : ''}
      </div>
    `;
    container.querySelector('#backBtn').addEventListener('click', ()=> Router.back());

    const cancelBtn = container.querySelector('#cancelSubBtn');
    if(cancelBtn) cancelBtn.addEventListener('click', async ()=>{
      if(!await Layout.confirmDialog('Zrušit Premium? Appka se vrátí do stavu podle zbývající zkušební doby (nebo do zamčeného stavu, pokud už vypršela).', 'Zrušit Premium')) return;
      const res = await MSBilling.cancelSubscription();
      // U skutecneho predplatneho zruseni z appky NEJDE - dela se
      // v Google Play. Vrstva to rekne a my cloveka posleme tam.
      if(res.presmerovatDoObchodu){
        MSBilling.openStoreSubscriptions();
        return;
      }
      if(typeof Layout !== 'undefined' && Layout.showSuccess) Layout.showSuccess('Premium zrušeno');
      render(container, params);
    });

    const promoRow = container.querySelector('#promoRow');
    if(promoRow){
      promoRow.addEventListener('click', ()=>{
        promoRow.style.display = 'none';
        container.querySelector('#promoWrap').style.display = 'block';
        container.querySelector('#promoInput').focus();
      });
      const uplatnitKod = ()=>{
        const input = container.querySelector('#promoInput');
        const errEl = container.querySelector('#promoErr');
        const res = msRedeemPromoCode(input.value);
        if(!res.ok){ errEl.textContent = res.chyba; return; }
        errEl.textContent = '';
        if(typeof Layout !== 'undefined' && Layout.showSuccess){
          Layout.showSuccess(res.lifetime ? 'Appka odemčena natrvalo' : `+${res.extraDays} dní zdarma`);
        }
        render(container, params); // prekreslit - odznak dni i zbytek stavu se aktualizuje
      };
      container.querySelector('#promoGoBtn').addEventListener('click', uplatnitKod);
      container.querySelector('#promoInput').addEventListener('keydown', (e)=>{ if(e.key==='Enter') uplatnitKod(); });
    }

    const subscribeBtn = container.querySelector('#subscribeBtn');
    if(subscribeBtn) subscribeBtn.addEventListener('click', async ()=>{
      subscribeBtn.disabled = true;
      const puvodni = subscribeBtn.textContent;
      subscribeBtn.textContent = 'Čekám na obchod…';
      const res = await MSBilling.purchaseSubscription();
      subscribeBtn.disabled = false;
      subscribeBtn.textContent = puvodni;
      if(res.zrusenoUzivatelem) return;           // uzivatel okno zavrel, mlcet
      if(!res.ok){ Layout.alertDialog(res.chyba || 'Nákup se nepodařilo dokončit.', 'Nákup'); return; }
      if(typeof Layout !== 'undefined' && Layout.showSuccess) Layout.showSuccess('Premium aktivováno');
      Router.go('dashboard');
    });

    const extraSlotBtn = container.querySelector('#extraSlotBtn');
    if(extraSlotBtn) extraSlotBtn.addEventListener('click', async ()=>{
      extraSlotBtn.disabled = true;
      const puvodni = extraSlotBtn.textContent;
      extraSlotBtn.textContent = 'Čekám na obchod…';
      const res = await MSBilling.purchaseExtraProject();
      extraSlotBtn.disabled = false;
      extraSlotBtn.textContent = puvodni;
      if(res.zrusenoUzivatelem) return;
      if(!res.ok){ Layout.alertDialog(res.chyba || 'Nákup se nepodařilo dokončit.', 'Nákup'); return; }
      if(typeof Layout !== 'undefined' && Layout.showSuccess) Layout.showSuccess('Slot přikoupen');
      if(reason === 'extra-project') Router.go('onboarding-project');
      else render(container, params);
    });

    /* (31.8.2026) Obnoveni nakupu. Google to u placenych appek
       vyzaduje: clovek, ktery si vymeni telefon nebo appku
       preinstaluje, musi mit jak se dostat ke svemu predplatnemu
       bez placeni znovu. V mock rezimu tlacitko jen rekne, ze
       nic k obnoveni neni. */
    const restoreBtn = container.querySelector('#restoreBtn');
    if(restoreBtn) restoreBtn.addEventListener('click', async ()=>{
      restoreBtn.disabled = true;
      const puvodni = restoreBtn.textContent;
      restoreBtn.textContent = 'Hledám nákupy…';
      const res = await MSBilling.restore();
      restoreBtn.disabled = false;
      restoreBtn.textContent = puvodni;
      if(!res.ok){ Layout.alertDialog(res.chyba || 'Obnovení se nepodařilo.', 'Obnovit nákupy'); return; }
      if(res.obnoveno){
        if(typeof Layout !== 'undefined' && Layout.showSuccess) Layout.showSuccess('Nákupy obnoveny');
        render(container, params);
      }else{
        Layout.alertDialog('K tomuhle účtu Google jsme žádný dřívější nákup nenašli.', 'Obnovit nákupy');
      }
    });
  }
  return { render };
})();
Router.register('paywall', PaywallScreen);
