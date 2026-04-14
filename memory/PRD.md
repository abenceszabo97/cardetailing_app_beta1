# X-CLEAN Autómosó Menedzsment Rendszer - PRD

## Eredeti probléma leírás
X-CLEAN autómosó menedzsment rendszer fejlesztése Debrecen és Budapest telephelyekhez. Magyar nyelvű felület, sötét téma zöld akcentussal.

## Technológia stack
- **Frontend**: React 19, Tailwind CSS, Shadcn UI
- **Backend**: FastAPI, Motor (MongoDB async)
- **Integrations**: Groq (AI), Resend (Email), Cloudinary (Képek)

## Implementált funkciók

### V6.0 - PDF Riportok + Készlet Riasztás (2026-04-14)
- **Statisztika PDF riportok**: Napi/Heti/Havi bontás, dolgozónkénti autószám, szolgáltatásszám, bevétel, készpénz/kártya
- **Backend /api/stats/report**: Új endpoint, period (daily/weekly/monthly), date, location paraméterekkel
- **Riport generálás UI**: Statistics oldalon Napi/Heti/Havi választó, dátumválasztó, PDF Letöltés gomb
- **Készlet minimum riasztás**: Dashboard-on alacsony készlet kártya, severity szintek (critical/warning)
- **Budapest hozzáadva a Készlet telephelyekhez**: Szűrő, létrehozás, szerkesztés dialógusokban
- **Notifikáció severity**: /notifications/low-stock most severity mezőt is ad vissza

### V5.0 - Budapest telephely + Extrák CRUD (2026-04-14)
- **Budapest telephely**: Új telephely hozzáadva a rendszerhez
- **LocationContext**: Központi telephely kontextus (App.js), admin válthat Összes/Debrecen/Budapest
- **Extrák CRUD**: Szolgáltatások oldalon "Extrák" fül
- **Location-alapú szűrés**: Extrák, pricing-data, bookings mind telephely szerint

### V4.2 - Napzárás, Statisztika mobil, AI Extra ajánló (2026-04-05)
- Napzárás záró egyenleg mező + eltérés kijelzés
- Statistics mobilnézet javítás
- AI Extra ajánló (automatikus inline)

### V4.1 - Foglalási oldal fejlesztések (2026-04-04)
- SVG autóikonok, munkatárs választás, "Made with Emergent" badge elrejtése

### V4.0 - Adatszinkron (2026-04-04)
- Ügyfél előzmények, Dashboard→Naptár szinkron, Kétirányú job↔booking szinkron

## Következő feladatok

### Fázis 3 - Foglalás fejlesztések (KÖVETKEZŐ)
- [ ] Több szolgáltatás kiválasztása (akciós kizárás extráknál) - részben kész
- [ ] Visszaigazoló email + 24 órás emlékeztető - részben kész (backend kód megvan)

### Fázis 4 - Számlázás
- [ ] Számlázz.hu integráció (2 céghez: Debrecen + Budapest) - API kulcs később
- [ ] Számla menüpont (nyilvántartás, megnyitás)
- [ ] Számlázási adatok foglaláskor (Salonic stílus)

## Jövőbeli feladatok
- [ ] Google Naptár integráció
- [ ] Twilio SMS integráció (jelenleg MOCKED)
- [ ] Kedvezmény rendszer (-10% akciók)

## Tech Debt
- [ ] Frontend könyvtárstruktúra refaktorálás (frontend/frontend-admin/frontend-booking szinkron)

## Kulcs API végpontok
- `GET /api/stats/report?period=daily|weekly|monthly&date=YYYY-MM-DD&location=X` - Riport adatok
- `GET /api/services/locations` - Telephelyek listája
- `GET /api/services/extras?location=X` - Extrák szűrve telephelyre
- `GET /api/notifications/low-stock` - Alacsony készlet (severity: critical/warning)
- `POST /api/jobs` - Munka + booking létrehozás

## Megjegyzések
- SMS: MOCKED | Frontend triplikáció: frontend/frontend-admin/frontend-booking szinkron
- Számlázz.hu API kulcs: A felhasználónak még nincs
