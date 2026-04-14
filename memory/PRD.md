# X-CLEAN Autómosó Menedzsment Rendszer - PRD

## Eredeti probléma leírás
X-CLEAN autómosó menedzsment rendszer fejlesztése Debrecen és Budapest telephelyekhez. Magyar nyelvű felület, sötét téma zöld akcentussal.

## Technológia stack
- **Frontend**: React 19, Tailwind CSS, Shadcn UI
- **Backend**: FastAPI, Motor (MongoDB async)
- **Integrations**: Groq (AI), Resend (Email), Cloudinary (Képek)

## Implementált funkciók

### V5.0 - Budapest telephely + Extrák CRUD (2026-04-14)
- **Budapest telephely**: Új telephely hozzáadva a rendszerhez
- **LocationContext**: Központi telephely kontextus (App.js), admin válthat Összes/Debrecen/Budapest, dolgozó saját telephelyéhez kötött
- **Header telephely választó**: Admin dropdown az összes admin oldalon
- **BookingPage telephely választó**: Debrecen/Budapest gombok a foglalás elején
- **Extrák CRUD**: Szolgáltatások oldalon "Extrák" fül - létrehozás, szerkesztés, törlés, telephely hozzárendelés
- **Location-alapú szűrés**: Extrák, pricing-data, bookings mind telephely szerint szűrhetők
- **Services model bővítés**: `location` mező (Debrecen/Budapest/null=mindenhol)

### V4.2 - Napzárás, Statisztika mobil, AI Extra ajánló (2026-04-05)
- Napzárás záró egyenleg mező + eltérés kijelzés
- Statistics mobilnézet javítás
- AI Extra ajánló (automatikus inline)

### V4.1 - Foglalási oldal fejlesztések (2026-04-04)
- SVG autóikonok, munkatárs választás, "Made with Emergent" badge elrejtése

### V4.0 - Adatszinkron (2026-04-04)
- Ügyfél előzmények, Dashboard→Naptár szinkron, Kétirányú job↔booking szinkron

## Fázis 2 - Számlázás (KÖVETKEZŐ)
- [ ] Számlázz.hu integráció (2 céghez: Debrecen + Budapest)
- [ ] Számla menüpont (nyilvántartás, megnyitás)
- [ ] Számlázási adatok foglaláskor (Salonic stílus)

## Fázis 3 - Foglalás fejlesztések
- [ ] Több szolgáltatás kiválasztása (akciós kizárás)
- [ ] Visszaigazoló email + 24 órás emlékeztető

## Fázis 4 - Riportok & Készlet
- [ ] PDF riportok (napi/heti/havi, dolgozónkénti bontás)
- [ ] Készlet minimum figyelmeztetés

## P0 - Tech Debt
- [ ] Frontend könyvtárstruktúra refaktorálás

## Kulcs API végpontok
- `GET /api/services/locations` - Telephelyek listája
- `GET /api/services/extras?location=X` - Extrák szűrve telephelyre
- `POST/PUT/DELETE /api/services/extras` - Extrák CRUD (admin)
- `GET /api/services/pricing-data?location=X` - Árazás telephely szerint
- `POST /api/jobs` - Munka + booking létrehozás

## Megjegyzések
- SMS: MOCKED | Frontend triplikáció: frontend/frontend-admin/frontend-booking szinkron
- Budapest szolgáltatások: A felhasználó később adja meg
- Számlázz.hu API kulcs: A felhasználónak még nincs
