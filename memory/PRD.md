# X-CLEAN Autómosó Menedzsment Rendszer - PRD

## Eredeti probléma leírás
X-CLEAN autómosó menedzsment rendszer fejlesztése Debrecen telephely számára. Magyar nyelvű felület, sötét téma zöld akcentussal, Emergent Google Auth hitelesítéssel.

## Fő funkciók
### Megvalósítva
- **Főoldal (Dashboard)**: KPI kártyák (napi/havi autók, készpénz/kártya bontás), napi munkák lista, havi grafikon
- **Haladó analitika (Statisztika oldalon)**: Átl. bevétel/autó, visszatérő ügyfelek, TOP 10 ügyfél, havi összehasonlítás, bevétel dolgozónként/telephelyenként
- **Ügyfelek kezelése**: Lista, részletes profil, előzmények, CRUD
- **Dolgozók kezelése**: Dolgozók CRUD (név, telefon, email, beosztás, telephely) - mindenki számára
- **Dolgozói havi statisztika**: Ledolgozott napok/órák, elkészített autók, bevétel - hónapra szűrhető + PDF export + email küldés
- **Műszakbeosztás**: Heti és havi naptár nézet, műszak hozzáadás/törlés - mindenki számára
- **Készlet kezelés**: Teljes CRUD, alacsony készlet figyelmeztetés - mindenki számára
- **Készlet figyelmeztetések**: Értesítési harang a headerben, alacsony készlet push értesítés valós időben
- **Statisztika**: Grafikonok, dolgozói teljesítmény, szolgáltatás népszerűség, haladó analitika, PDF export
- **Szolgáltatások**: Teljes X-CLEAN árlista, kategória fülekkel, teljes CRUD - mindenki számára
- **Napnyitás/Napzárás**: Teljes flow + PDF export + email küldés, lezárt nap utáni újranyitás, pénzelvitel, kasszaellenőrzés
- **Beállítások**: Felhasználók kezelése (csak admin)
- **Képek**: 9 előtte + 9 utána kép feltöltése munkákhoz
- **Telephely**: Csak Debrecen (Budapest eltávolítva)

### V2 Funkciók - Megvalósítva (2025-12-16)
- **Publikus foglalási oldal** (`/booking`): 4 lépéses wizard bejelentkezés nélkül
  - Lépés 1: Telephely és szolgáltatás választás (kategória szűréssel)
  - Lépés 2: **Naptár szerű időpont választás** - heti nézet, vizuális szabad/foglalt jelzés, dolgozók száma
  - Lépés 3: Személyes adatok + gyors rendszám keresés
  - Lépés 4: Összegzés és foglalás véglegesítése
  - **Modern, gradient-es dizájn** háttér mintával
  - **Rendszám alapú gyors foglalás**: Visszatérő ügyfelek automatikus adatbetöltés
  - **VIP státusz**: 5+ sikeres mosás után VIP badge
- **Foglalási értesítések**: Új foglaláskor automatikus értesítés a menedzsment rendszerbe
  - Értesítési harang két füllel: Foglalások + Készlet figyelmeztetések
  - Olvasottnak jelölés, összes olvasottnak jelölés
  - 15 másodpercenkénti frissítés
- **Foglalási naptár** (`/calendar`): Napi/heti/havi nézet foglalások kezelésére, foglalás módosítás
- **Blacklist/tiltólista**: Problémás ügyfelek kezelése rendszám alapján
- **AI Backend végpontok**: Upsell, fotó elemzés, árajánlat (Gemini) - backend kész, egyenleg feltöltés szükséges

### V2.1 - Éles indulásra kész (2025-12-19)
- **Teszt adatok törölve**: Ügyfelek, dolgozók, foglalások, munkák, műszakok, értesítések törölve
- **Budapest eltávolítva**: Minden UI elemről és statisztikából
- **Szolgáltatások és készlet megmaradt**: 41 szolgáltatás, 7 készlet tétel

### Implementálva de API kulcsok szükségesek
- **SMS értesítés (Twilio)**: Ügyfél értesítés munka elkészüléséről - szükséges: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
- **Email küldés (Resend)**: PDF riportok és foglalás visszaigazolás emailben - szükséges: RESEND_API_KEY

## Technológia stack
- **Frontend**: React 19, Tailwind CSS, Shadcn UI, Recharts, jsPDF, date-fns
- **Backend**: FastAPI, Motor (MongoDB async), Pydantic, Twilio, Resend, emergentintegrations (Gemini)
- **Database**: MongoDB
- **Auth**: Emergent Google OAuth
- **Deployment**: Railway-ready (Procfile, railway.json)

## Tesztelési állapot
- 8. iteráció: Backend 100% (19/19), Frontend 100%
- Utolsó teszt: 2025. december 16.
- Adatbázis tisztítás: 2025. december 19.

## P0 - Következő iteráció (Kiemelt prioritás)
- [x] Foglalás módosítás funkció (naptárban szerkesztés)
- [x] Blacklist/tiltólista kezelés
- [x] Budapest eltávolítása
- [x] Teszt adatok törlése
- [ ] Google Calendar integráció
- [ ] Automatikus PDF napzárás és email küldés
- [ ] AI funkciók frontend felülete (fotó feltöltés, upsell javaslatok)
- [ ] Elkészült autó SMS értesítés (Twilio API kulcs szükséges)

## P1 - Közepes prioritás
- [ ] AI ügyfélszolgálati chatbot
- [ ] server.py refaktorálás (routes/, models/ mappák)

## P2 - Későbbi fejlesztés
- [ ] AI Marketing (SMS/email emlékeztetők, kuponok, hűségprogram)
- [ ] AI Analytics
- [ ] Alternatív bejelentkezés (email/jelszó) - később

## P3 - Backlog
- [ ] Twilio API kulcsok konfigurálása az SMS küldéshez
- [ ] Resend API kulcs konfigurálása az email küldéshez

## Fájl struktúra
```
/app/
├── backend/
│   ├── server.py          # Fő API (2200+ sor)
│   ├── .env               # MONGO_URL, TWILIO, RESEND, EMERGENT_LLM_KEY
│   ├── .env.example       # Sablon produkciós env-hez
│   ├── Procfile           # Railway start command
│   ├── railway.json       # Railway config
│   └── requirements.txt
├── frontend/src/
│   ├── pages/
│   │   ├── BookingPage.jsx   # Publikus foglalás
│   │   ├── Calendar.jsx      # Foglalási naptár
│   │   ├── Dashboard.jsx
│   │   ├── Customers.jsx     # + Blacklist tab
│   │   ├── Workers.jsx
│   │   ├── Statistics.jsx
│   │   ├── DayManagement.jsx # Pénzelvitel, kasszaellenőrzés
│   │   └── ...
│   └── components/
│       ├── Sidebar.jsx
│       ├── NotificationBell.jsx
│       └── ui/
├── DEPLOYMENT.md          # Telepítési útmutató
└── memory/PRD.md
```

## Fontos megjegyzések
- **Emergent LLM Key egyenleg kimerült**: Az AI funkciók (upsell, fotó elemzés, árajánlat) nem működnek, amíg nem töltöd fel az egyenleget a Profil → Universal Key → Add Balance menüpontban.
- **Google Auth marad**: Az alternatív bejelentkezési módot (email/jelszó) későbbre halasztottuk.
