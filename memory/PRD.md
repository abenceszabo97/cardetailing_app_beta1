# X-CLEAN Autómosó Menedzsment Rendszer - PRD

## Eredeti probléma leírás
X-CLEAN autómosó menedzsment rendszer fejlesztése Debrecen telephely számára. Magyar nyelvű felület, sötét téma zöld akcentussal.

## Technológia stack
- **Frontend**: React 19, Tailwind CSS, Shadcn UI
- **Backend**: FastAPI, Motor (MongoDB async)
- **Integrations**: Groq (AI), Resend (Email), Cloudinary (Képek)
- **PDF**: jsPDF + jspdf-autotable

## Éles domainok
- **Admin**: https://app.xcleandetailapp.hu
- **Booking**: https://booking.xcleandetailapp.hu
- **API**: https://api.xcleandetailapp.hu

## Implementált funkciók

### V4.0 - Adatszinkron és UI javítások (2026-04-04)
- **Ügyfél előzmények javítás**: Ügyfél részletező oldal most `customer_id` ÉS `plate_number` alapján keres munkákat + foglalásokat is mutat
- **Dashboard→Naptár szinkron**: Munka létrehozásakor automatikusan booking is létrejön, így megjelenik a naptárban
- **Statisztika javítás**: A jobs és bookings közötti kétirányú szinkron biztosítja a pontos statisztikát
- **Teljes kétirányú szinkron**: Státusz, ár, dolgozó, szolgáltatás módosítások a job-ból vissza szinkronizálódnak a booking-ba
- **Autóméret ikonok**: Foglalási oldal SVG ikonok cseréje outline/vonalrajz stílusra (S, M, L, XL, XXL)
- **"Made with Emergent" badge**: BookingPage pb-20 padding hozzáadva, nem takarja el a Tovább gombot

### V3.9 - Mobil és pénztár javítások
- Calendar mobil heti nézet: görgethető napi kártyák
- DayManagement záró egyenleg logika: `expected_closing` használata
- DayManagement mobil layout javítás

### V3.8 - Legacy kép megjelenítési javítás
- Régi képek (MongoDB base64) megjelenítése javítva
- `/api/images/img_xxx` endpoint mindkét formátumot kezeli

### V3.7 - Korábbi fejlesztések
- Jelenléti PDF generálás, Szabadság kezelés
- Naptár átláthatóbbá tétele, Nap zárás riport bővítése

### Session 2 fejlesztések
- Cloudinary optimalizáció, Mobil kép feltöltés javítás
- Dashboard mobil UI refaktor, Dashboard munka szerkesztés
- Booking és Job kétirányú szinkron, Data Cleanup admin eszköz
- Statisztika dátum parsing javítás, Push értesítések hanggal
- Workers heti nézet mobil javítás

## P0 - Sürgős (Tech Debt)
- [ ] Frontend könyvtárstruktúra refaktorálás (frontend vs frontend-admin egyesítése)
- [ ] Backend pytest tesztek (alapjai megvannak: /app/backend/tests/)

## P1 - Közepes prioritás
- [ ] Google Naptár integráció
- [ ] Billingo számlázás integráció
- [ ] SMS értesítések (Twilio)

## P2 - Alacsony prioritás
- [ ] Kedvezmények rendszer (pl. "Lion Office Center -10%")

## Kulcs API végpontok
- `POST /api/jobs` - Munka létrehozás + automatikus booking létrehozás
- `PUT /api/jobs/{job_id}` - Munka szerkesztés + booking szinkron
- `GET /api/customers/{customer_id}` - Ügyfél + munkák (customer_id ÉS plate_number alapján)
- `GET /api/stats/dashboard` - Statisztikák (regex date matching, status=kesz)
- `GET /api/bookings` - Foglalások (Calendar olvas innen)

## Adatbázis séma
- `jobs`: job_id, booking_id, customer_id, status, price, date, time_slot, phone, car_type
- `bookings`: booking_id, customer_name, plate_number, status, price, date, time_slot
- `day_records`: date, location, status, opening_balance, closing_balance, expected_closing, discrepancy

## Megjegyzések
- SMS értesítések: MOCKED
- Frontend duplikáció: frontend és frontend-admin között manuális szinkron szükséges
- Dátum kezelés MongoDB-ben: `$regex` használata isoformat problémák miatt
- Munka létrehozáskor (POST /api/jobs) automatikusan booking is létrejön
