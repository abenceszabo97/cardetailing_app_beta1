import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";

// Pages
import BookingPage from "./pages/BookingPage";
import ModifyBooking from "./pages/ModifyBooking";
import ReviewPage from "./pages/ReviewPage";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// App Router - Public Booking Only
function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<BookingPage />} />
      <Route path="/booking" element={<BookingPage />} />
      <Route path="/modify/:token" element={<ModifyBooking />} />
      <Route path="/review/:token" element={<ReviewPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRouter />
      <Toaster
        position="top-right"
        richColors
        theme="dark"
        toastOptions={{
          style: {
            background: 'hsl(222 47% 7%)',
            border: '1px solid hsl(217 33% 17%)',
          }
        }}
      />
    </BrowserRouter>
  );
}

export default App;
