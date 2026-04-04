# X-CLEAN Autómosó Menedzsment Rendszer - PRD

## Eredeti probléma leírás
X-CLEAN autómosó menedzsment rendszer fejlesztése Debrecen telephely számára. Magyar nyelvű felület, sötét téma zöld akcentussal.

## Technológia stack
- **Frontend**: React 19, Tailwind CSS, Shadcn UI
- **Backend**: FastAPI, Motor (MongoDB async)
- **Integrations**: Groq (AI), Resend (Email), Cloudinary (Képek)

## Implementált funkciók

### V4.1 - Foglalási oldal fejlesztések (2026-04-04)
- **Autóméret ikonok**: Inline SVG vonalrajz ikonok (S=hatchback, M=sedan, L=kombi, XL=SUV, XXL=kisbusz) átlátszó háttérrel, `currentColor` stroke-al
- **AI Upsell javaslatok**: AIUpsellSuggestions komponens visszahozva a csomag választás után
- **Munkatárs választás**: Step 2-ben időpont után kiválasztható a kívánt dolgozó ("Mindegy" + egyéni dolgozók)
- **"Made with Emergent" badge**: Elrejtve CSS `display: none`-al

### V4.0 - Adatszinkron és UI javítások (2026-04-04)
- Ügyfél előzmények: customer_id ÉS plate_number alapú keresés
- Dashboard→Naptár szinkron: job létrehozás → automatikus booking
- Teljes kétirányú szinkron: státusz/ár/dolgozó/szolgáltatás
- BookingPage pb-20 padding

### Korábbi verziók
- V3.9: Calendar mobil heti nézet, DayManagement záró egyenleg
- V3.8: Legacy kép megjelenítés, Cloudinary optimalizáció
- V3.7: Jelenléti PDF, Szabadság kezelés
- Session 2: Dashboard mobil UI, Push értesítések, Data Cleanup

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
- `PUT /api/jobs/{job_id}` - Munka szerkesztés + booking szinkron
- `GET /api/customers/{customer_id}` - Ügyfél + munkák (customer_id ÉS plate_number)
- `GET /api/bookings/available-slots` - Szabad időpontok és dolgozók

## Megjegyzések
- SMS értesítések: MOCKED
- Frontend duplikáció: frontend/frontend-admin/frontend-booking szinkron szükséges
