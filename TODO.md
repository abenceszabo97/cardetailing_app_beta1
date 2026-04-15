Foglalási oldal:
-Foglalasi oldalon eltűntek az extrák mint választható opciók.  Kerüljenek vissza csak az ezelőtt említett dolgot tartsd meg hogy ha az akció ki van választva akkor ne lehessen olyan dolgot választani amit az a csomag már tartalmaz. 
-A foglalási oldalon a személyes adatok részen az áfá-s számlánál legyen egy le nyitható fül ikon hogy lássák hogy arra kell kattintani,Ez kell a számlázási integráció miatt is. 
-Kelljen rendszámot is megadni a személyes adatoknál.

Fő app oldal:
-Szolgáltatások menüben, a sima extra menüpont tűnjön el mert az már nincs használatban. 
-Ha kiválasztom a dashboardon a telephelyet akkor csak az adott telephelyhez kapcsolódó dolgok látszódjanak (pl napi munka, naptár, ügyfelek, dolgozók, készlet statisztika, szolgáltatások, napnyitás/zárás stb) (dashboardon nem látszik a Budapest választó neve bal oldalt, illetve felülre is került egy telephely választó ami felesleges, az tűnjön el) a Budapestre vonatkozó összes dolog pl foglalt időpontok, ügyfelek, dolgozok beosztása készlet stb ne latszodjon a Debrecen telephelyen és ugyanez fordítva. Az összes telephely opció eseten latszodjon minden. 
-Statisztika is legyen telephelyenkent választható, Budapest, Debrecen és összes. A statisztikák legyenek így szétbontva.
-A készlet menüpontban legyen az alacsony keszletu termek háttere más színű vagy jelezze ott is megkülönböztető színnel, felkiáltójellel és írással hogy az a termek alacsony keszleten van. 
-Mobilon a skalazas nem jó minden menupontban. Ellenőrizd kérlek.
-Aktuális napi munkához legyen egy plusz feltölthető kép az átadás-átvétel dokumentáció miatt. 
-Szolgáltatások menupontban is legyen elkülönítve Debrecen és Budapest is. 
-Dolgozok menü statisztika, a havi összesítőben van beragadva 2 dolgozó (nagy istvan, Kovács Péter) akik nem tartoznak sehova. Őket töröld kérlek. 
-Statisztika részen ne csak azt számolja és írja hogy hány autót csinált az adott dolgozó hanem hogy hány szolgáltatást végzett el, pl külső+belső takarítás és kárpittisztítás ugyanazon ügyfélnek az már 2 külön szolgáltatás. Ez az alapja a debreceni dolgozók bónuszának. 
-Budapest dolgozók: mivel egyéni vállalkozók ott jó lenne ha másképp számolja statisztikát. Ott %-os jutalek rendszerrel dolgoznak. Fizetések Budapest:
Mivel Budapesten AAM cégen megyünk, ezért nem a nettó, hanem a bruttó bevétel 31,5%-a a fizetésük. Sanyi és Balázs a két dolgozó Budapesten. Kellene az, hogy mennyi autót csinálnak egy hónapban, mekkora a bruttó bevételük, ebből mennyi a készpénz és mennyi a kártya/utalás. Üzemanyag költség térítés is legyen számolva ott, de az csak Sanyinak jár jelenleg, mert Balázs céges autóval jár. Üzemanyag térítés az alábbiak szerint kerül kifizetésre: 500.000 Ft forgalomig 40.000 Ft, 501.000 Ft-tól 700.000 Ft-ig 60.000 Ft, 701.000 Ft fölött 80.000 Ft/hó.


- Az email értesítés foglalás esetén már be van állítva. Kellene egy értesítés küldés emailben az ügyfél részére 24 órával a foglalási időpont előtt, egyfajta emlékeztető email.

- Számlázási integráció:
- A számlázás ha megoldható legyen így: Mivel Debrecen és Budapest 2 külön cégről  számlázódik, Budapest az X-ről, Debrecen magánszemélyeknek Y-ról, Debrecen cégeknek Z-ről, ezért azt kellene valahogy megoldani, hogy ezek így legyenek elküldve a számlázz.-hu által. Hogy az AI felismerje hogy ha kft, bt. vagy egyéb cégmegjelölés van az ügyfél nevében akkor a Z oldalról küldje el a számlát. Ha nem kér áfás számlát, akkor viszont egy normál nyugtát küldjön emailben az ügyfélnek a szolgáltatás elvégzéséről.
   
1. Foglalás lezárásakor
[Foglalás lezárva]/Kész gomb megnyomása után:
(felugrik egy ablak)
┌─────────────────────────────────┐
│  Számla kiállítása?             │
│                                 │
│  Ügyfél: Kiss János             │
│  Adószám: 12345678-1-11  ✓      │
│  Cím: Budapest, Fő u. 1.  ✓     │
│                                 │
│  Tétel: Teljes körű kozmetika   │
│  + Motortér tisztítás extra     │
│  Összeg: 45.000 Ft              │
│                                 │
│  [Számla kiállítása] [Kihagyás] │
└─────────────────────────────────┘
→ Egy kattintás, és a számla automatikusan megjelenik a Számlázz.hu fiókodban is, és küldi az ügyfél által megadott email címre.

2. Egy új "Számlák" menüpont az adminban (telephely választható itt is)
📄 Számlák
─────────────────────────────────────
Telephely: [Budapest ▼]   [2025. április ▼]

#2025-042  Kiss János      45.000 Ft  ✅ Fizetve
#2025-041  Nagy Péter      32.000 Ft  ⏳ Fizetésre vár
#2025-040  Kovács Bt.      78.000 Ft  ✅ Fizetve

[Számla megnyitása] [PDF letöltés] [Email küldés]
─────────────────────────────────────
Havi bevétel: 155.000 Ft

3. Ügyfélkártyán az ügyfeleknél az előzményeknél is megjelenik a kiállított számla.
👤 Kiss János
Autó: ABC-123, BMW 3-as
─────────────────────
Foglalások: 8
Számlák:    8    → [Megtekintés]
Összes költés: 320.000 Ft

Mit tud az integráció:
✅ Számla automatikus kiállítása foglalás lezárásakor
✅ Számlák listája az adminban (szűrve telephelyenként)
✅ PDF letöltés közvetlenül
✅ Email küldés az ügyfélnek egy gombbal
✅ Fizetve/fizetésre vár státusz szinkron
✅ Céges ügyfeleknek (adószámmal) automatikusan céges számla
✅ Sztornó számla kiállítása ha lemondják)

Egyéb javítások/módosítások a programban:
-Frontend: a három külön frontend helyett egy Next.js app ahol route-alapon van szétválasztva az admin és a booking oldal – sokkal könnyebb karbantartani
 / Párhuzamos frontend mappák (frontend vs frontend-booking vs frontend-admin) – hosszú távon érdemes lenne egységesíteni egy monorepo struktúrába
 -made with emergent feliratok tűnjenek el a mai appban is és a foglalási oldalon is.
 -Fejlécben is legyen saját felirat, pl booking oldalon xClean időpont foglalás, saját logóval. FŐ appban pedig xClean menedzsment app saját logóval.
 -Statisztika részen ha egy bizonyos telephely van kiválasztva akkor ne látszódjon a "bevétel telephelyenként" és "Telephely bontás" ablakok, az csak az összes telephely kiválasztásakor látszódjon. 
 -Dolgozók statisztikáknál az "összes elkészített autó" maradjon, legyen mellette egy "összes elkészült szolgáltatás". az "összes ledolgozott óra" és "összes ledolgozott nap" nem kell oda.
 -Az ügyfeleknél ha rákattintunk az előzményeire Legyen ott az email címe is látható.

Ami felesleges vagy elhagyható:
- A memory mappa – ez az Emergent AI belső működési fájlja, a saját projektedbe nem kellene
- A .emergent mappa – ugyanez
- Párhuzamos frontend mappák (frontend vs frontend-booking vs frontend-admin) – hosszú távon érdemes lenne egységesíteni egy monorepo struktúrába

Opcionális: Gépjármű átadás-átvételi lap – papír helyett digitálisan, a sérülésekről feltölthető képekkel, az ügyfél előzményekbe mentve ezt is. ez versenyelőny lenne

Később: 
-Sms értesítés elkészült autó esetén
-Google naptár szinkronizáció
-saját mobil app


