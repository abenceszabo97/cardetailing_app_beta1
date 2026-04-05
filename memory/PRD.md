# X-CLEAN Autómosó Menedzsment Rendszer - PRD

## Eredeti probléma leírás
X-CLEAN autómosó menedzsment rendszer fejlesztése Debrecen telephely számára. Magyar nyelvű felület, sötét téma zöld akcentussal.

## Technológia stack
- **Frontend**: React 19, Tailwind CSS, Shadcn UI
- **Backend**: FastAPI, Motor (MongoDB async)
- **Integrations**: Groq (AI), Resend (Email), Cloudinary (Képek)

## Implementált funkciók

### V4.2 - Napzárás, Statisztika mobil, AI Extra ajánló (2026-04-05)
- **Napzárás záró egyenleg**: Tényleges kassza tartalom beviteli mező + eltérés kijelzés (zöld/piros)
- **Nap lezárása** gomb letiltva amíg nincs beírva a záró egyenleg
- **Statistics mobilnézet javítás**: Grid responsive (md:col-span-2, lg:col-span-2), kisebb YAxis szélességek (70/80px)
- **"Made with Emergent" badge**: Elrejtve mindkét index.html-ben (frontend + frontend-admin)
- **AI Extra ajánló**: Automatikus inline javaslatok az extrák listájából, kattintás nélkül megjelenik (nem collapsible)

### V4.1 - Foglalási oldal fejlesztések (2026-04-04)
- Autóméret SVG ikonok (S/M/L/XL/XXL), munkatárs választás step 2-ben

### V4.0 - Adatszinkron (2026-04-04)
- Ügyfél előzmények (customer_id + plate_number), Dashboard→Naptár szinkron, Kétirányú job↔booking szinkron

### Korábbi verziók
- V3.9: Calendar mobil heti nézet, DayManagement expected_closing
- V3.8: Legacy képek, Cloudinary
- V3.7: PDF, Szabadság
- Session 2: Dashboard mobil, Push értesítések, Data Cleanup

## P0 - Sürgős (Tech Debt)
- [ ] Frontend könyvtárstruktúra refaktorálás (frontend vs frontend-admin)

## P1 - Közepes prioritás
- [ ] Google Naptár integráció
- [ ] Billingo számlázás integráció
- [ ] SMS értesítések (Twilio)

## P2 - Alacsony prioritás
- [ ] Kedvezmények rendszer

## Kulcs API végpontok
- `POST /api/jobs` - Munka + booking létrehozás
- `PUT /api/jobs/{job_id}` - Szerkesztés + booking szinkron
- `POST /api/day-records/close` - Napzárás (closing_balance + expected_closing + discrepancy)
- `GET /api/customers/{customer_id}` - Ügyfél + munkák (customer_id ÉS plate_number)
- `GET /api/bookings/available-slots` - Szabad időpontok és dolgozók

## Megjegyzések
- SMS: MOCKED | Frontend duplikáció: manuális szinkron | Dátum: $regex MongoDB
