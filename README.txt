MOJE STAVBA — WEBOVA VERZE PRO GITHUB PAGES
=============================================
Verze 276. Stejny kod jako appka pro Android.


KAM TO NAHRAT
==============
Do repozitare MS-premium, do PODSLOZKY "app":

   MS-premium/
      index.html      <- uvodni stranka, NECHAT
      privacy.html    <- zasady, NECHAT (odkaz mas v Play Console)
      terms.html
      delete-data.html
      app/            <- SEM vsechny soubory z tohohle zipu

Adresa:  https://jmdrift.github.io/MS-premium/app/

Data v prohlizeci nepatri slozce, ale CELE ADRESE
jmdrift.github.io - z podslozky tedy uvidis ta sama data
jako stara appka.


PO NAHRANI SI VYNUT NACTENI NOVE VERZE
=======================================
Stara verze si mohla ulozit service worker, ktery by servirovala
stary kod. Na iPhonu:
   Safari -> zavrit vsechny panely s appkou
   Nastaveni -> Safari -> Vymazat historii a data webu
   (POZOR: tohle smaze i data appky! Radeji jen zavri panely
    a znovu otevri - nova verze ma jine cislo mezipameti
    a prevezme si to sama.)


CO SE OPRAVILO PROTI 274
=========================
1. ZOBRAZOVANI SOUBORU
   Neslo otevrit zadny soubor. V kodu bylo
   window.open(url,'_blank'), ktere Safari BLOKUJE jako
   vyskakovaci okno - soubor se nacita z IndexedDB (await),
   takze v okamziku volani uz neplati uzivatelske klepnuti.
   Nove se soubor ukaze v prekryvu primo v appce.

2. HORNI LISTA PREKRYVU (verze 276)
   Kriz na zavreni se schovaval pod stavovy radek iPhonu a
   nesel zmacknout. Lista ted respektuje env(safe-area-inset-top)
   a tlacitko je vetsi (38x38).

3. PDF NESLO PRIBLIZIT (verze 276)
   Safari vykresli PDF v <iframe>, ale gesta si bere ram, takze
   se v nem neda priblizovat. Pod nahledem je proto velke
   tlacitko "Otevrit PDF v prohlizeci" - tam funguje prstove
   priblizovani i vlastni zavreni. Tlacitko klika clovek sam,
   takze u nej gesto plati a Safari ho pusti.

Opraveno na trech mistech: dokumenty v projektu, prilohy
v deniku, nahled PDF deniku.


ZKUSEBNI DOBA MUZE BYT VYPRSENA
================================
Pocita se od zalozeni prvniho projektu. Odemkne se master
kodem v platebni brane:  JAVUREK-RODINA-2026


CO NA WEBU NEFUNGUJE (a je to v poradku)
=========================================
Zamek appky, oznameni a skutecne platby. Vsechno ostatni jede:
denik, finance, zalohy u dodavatele, galerie, dokumenty,
PDF export i zaloha do souboru.


UPOZORNENI K IOS
=================
Safari maze uloziste webum, ktere dlouho neotevres.
Ber to jako ZACHRANU DAT, ne jako trvale reseni. Po prenosu
si hned udelej zalohu do souboru a tu si nech.
