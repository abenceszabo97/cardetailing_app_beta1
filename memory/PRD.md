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

### V3.9 - Mobil és pénztár javítások (2026-04-04)
- Calendar mobil heti nézet: görgethető napi kártyák (7 nap mind látható)
- DayManagement záró egyenleg logika: `expected_closing` használata az átvételhez
- DayManagement mobil layout javítás

### V3.8 - Legacy kép megjelenítési javítás
- Régi képek (MongoDB base64) megjelenítése javítva
- `/api/images/img_xxx` endpoint mindkét formátumot kezeli (data/data_url)

### V3.7 - Mai fejlesztések
- Jelenléti PDF generálás
- Szabadság/Betegszabadság kezelés
- Naptár átláthatóbbá tétele
- Nap zárás riport bővítése

### Korábbi verziók
- V3.6: Pénztár funkciók (készpénz kivétel, előző nap egyenlege)
- V3.5: Munkások műszakszerkesztés, Statisztika history
- V3.4: Naptár munkásonkénti oszlopnézet
- V3.3-V3.0: Booking page, Dashboard, Cloudinary

### Session 2 fejlesztések (előző fork)
- Cloudinary optimalizáció (auto quality, max 800px, job-specifikus mappák)
- Mobil kép feltöltés javítás (galéria picker)
- Dashboard mobil UI refaktor
- Dashboard munka szerkesztés (ár, szolgáltatás, idő, telefon)
- Booking és Job kétirányú szinkron
- Data Cleanup admin eszköz (Beállítások)
- Statisztika dátum parsing javítás (regex)
- Push értesítések hanggal (notificationService.js)
- Workers heti nézet mobil javítás

## P0 - Sürgős (Tech Debt)
- [ ] Frontend könyvtárstruktúra refaktorálás (frontend vs frontend-admin egyesítése)
- [ ] Backend pytest tesztek

## P1 - Közepes prioritás (Következő feladatok)
- [ ] Google Naptár integráció
- [ ] Billingo számlázás integráció
- [ ] SMS értesítések (Twilio)

## P2 - Alacsony prioritás
- [ ] Kedvezmények rendszer (pl. "Lion Office Center -10%")

## Kulcs API végpontok
- `PUT /api/jobs/{job_id}` - Job szerkesztés + booking szinkron
- `GET /api/stats/orphaned-data` - Árva adatok lekérdezése
- `DELETE /api/stats/cleanup-all-orphaned` - Árva statisztikák törlése
- `POST /api/files/upload` - Cloudinary feltöltés
- `POST /api/day-records/open` - Nap megnyitása
- `POST /api/day-records/close` - Nap lezárása (expected_closing számítással)

## Adatbázis séma
- `jobs`: job_id, booking_id, status, price, date, time_slot, phone, car_type
- `bookings`: Mirror a jobs mezőkkel, Calendar nézethez
- `day_records`: date, location, status, opening_balance, closing_balance, expected_closing, discrepancy

## Megjegyzések
- SMS értesítések: MOCKED
- Frontend duplikáció: frontend és frontend-admin között manuális szinkron szükséges (cp parancs)
- Dátum kezelés MongoDB-ben: `$regex` használata isoformat problémák miatt
