import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, API } from "../App";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Car, Sparkles, Lock, User, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

export const Login = () => {
  const { user, loading, setUser } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user && !loading) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, loading, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.error("Felhasználónév és jelszó megadása kötelező");
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(
        `${API}/auth/login`,
        { username, password },
        { withCredentials: true }
      );
      setUser(response.data);
      toast.success("Sikeres bejelentkezés!");
      navigate("/dashboard", { replace: true });
    } catch (error) {
      console.error("Login error:", error);
      const message = error.response?.data?.detail || "Bejelentkezési hiba";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white">Betöltés...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-radial from-green-900/20 via-transparent to-transparent" />
      
      {/* Background image overlay */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1759673735031-b6eabfc82261?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTJ8MHwxfHNlYXJjaHw0fHxsdXh1cnklMjBjYXIlMjB3YXNoJTIwZGV0YWlsaW5nJTIwZGFyayUyMGFlc3RoZXRpY3xlbnwwfHx8fDE3NzI2MTI1NjF8MA&ixlib=rb-4.1.0&q=85)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />

      <div className="relative z-10 w-full max-w-md px-4 sm:px-0">
        {/* Logo */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 sm:w-28 sm:h-28 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl sm:rounded-2xl mb-3 sm:mb-4 shadow-lg shadow-green-500/30 p-2">
            <img 
              src="https://customer-assets.emergentagent.com/job_80351f3f-7954-46a7-9193-7dcbfbf56786/artifacts/lnbybw8y_59e55ae7-d1bd-2941-05b0-2eeff82c6764.png" 
              alt="X-CLEAN Logo" 
              className="w-full h-full object-contain mix-blend-multiply"
              data-testid="login-logo"
            />
          </div>
          <p className="text-slate-400 mt-2 flex items-center justify-center gap-2 text-sm sm:text-base">
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" />
            <span>Garantált Tisztaság</span>
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" />
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-xl sm:rounded-2xl p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-white text-center mb-2 font-['Manrope']">
            Bejelentkezés
          </h2>
          <p className="text-slate-400 text-center text-sm mb-6">
            Jelentkezz be a menedzsment rendszerbe
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-300">
                Felhasználónév
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Felhasználónév"
                  className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 h-12"
                  data-testid="username-input"
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">
                Jelszó
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Jelszó"
                  className="pl-10 pr-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 h-12"
                  data-testid="password-input"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-green-500 hover:bg-green-600 text-slate-900 font-semibold py-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-500/20"
              data-testid="login-btn"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Bejelentkezés...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  Bejelentkezés
                </>
              )}
            </Button>
          </form>

          <p className="text-slate-500 text-xs text-center mt-6">
            A bejelentkezéshez kérj hozzáférést az adminisztrátortól
          </p>
        </div>

        {/* Footer */}
        <p className="text-slate-600 text-xs text-center mt-8">
          © 2025 X-CLEAN. Minden jog fenntartva.
        </p>
      </div>
    </div>
  );
};
