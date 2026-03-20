import { useState } from "react";
import axios from "axios";
import { API } from "../App";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { toast } from "sonner";
import { 
  Sparkles, Camera, Loader2, AlertCircle, 
  TrendingUp, ChevronDown, ChevronUp, Upload, X
} from "lucide-react";

// AI Upsell Suggestions Component
export const AIUpsellSuggestions = ({ carType, currentService, onSelectService }) => {
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState(null);

  const fetchSuggestions = async () => {
    if (!carType || !currentService) {
      toast.error("Autó típus és szolgáltatás szükséges");
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API}/ai/upsell`, {
        car_type: carType,
        current_service: currentService
      }, { withCredentials: true });
      setSuggestions(response.data);
      setExpanded(true);
    } catch (err) {
      const message = err.response?.data?.detail || "AI szolgáltatás nem elérhető";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-purple-500/30 rounded-xl overflow-hidden bg-purple-500/5">
      <button
        onClick={() => expanded ? setExpanded(false) : fetchSuggestions()}
        className="w-full p-4 flex items-center justify-between hover:bg-purple-500/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-left">
            <span className="text-purple-400 font-medium">AI Javaslatok</span>
            <p className="text-slate-500 text-sm">Személyre szabott extra szolgáltatások</p>
          </div>
        </div>
        {loading ? (
          <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
        ) : expanded ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </button>
      
      {expanded && suggestions && (
        <div className="p-4 border-t border-purple-500/20 space-y-3">
          {suggestions.priority_suggestion && (
            <div className="bg-purple-500/10 p-3 rounded-lg border border-purple-500/30">
              <Badge className="bg-purple-500/30 text-purple-300 mb-2">Kiemelt javaslat</Badge>
              <p className="text-white text-sm">{suggestions.priority_suggestion}</p>
            </div>
          )}
          
          {suggestions.suggestions?.map((s, i) => (
            <div 
              key={i} 
              className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg cursor-pointer hover:bg-slate-800/50 transition-colors"
              onClick={() => onSelectService?.(s.service_name)}
            >
              <TrendingUp className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-white font-medium">{s.service_name}</span>
                <p className="text-slate-400 text-sm">{s.reason}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {error && (
        <div className="p-4 border-t border-red-500/20 flex items-center gap-2 text-red-400">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">{error}</span>
        </div>
      )}
    </div>
  );
};

// AI Photo Analysis Component
export const AIPhotoAnalysis = ({ onAnalysisComplete }) => {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error("Csak kép fájl engedélyezett");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Maximum 5MB méret");
        return;
      }
      
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setAnalysis(null);
    }
  };

  const analyzeImage = async () => {
    if (!image) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result.split(',')[1];
        
        try {
          const response = await axios.post(`${API}/ai/photo-analysis`, {
            image_base64: base64
          }, { withCredentials: true });
          
          setAnalysis(response.data);
          onAnalysisComplete?.(response.data);
          toast.success("Elemzés kész!");
        } catch (err) {
          const message = err.response?.data?.detail || "AI elemzés sikertelen";
          setError(message);
          toast.error(message);
        } finally {
          setLoading(false);
        }
      };
      reader.readAsDataURL(image);
    } catch (err) {
      setError("Hiba a kép feldolgozásakor");
      setLoading(false);
    }
  };

  const clearImage = () => {
    setImage(null);
    setPreview(null);
    setAnalysis(null);
    setError(null);
  };

  return (
    <Card className="border-blue-500/30 bg-blue-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-white flex items-center gap-2">
          <Camera className="w-5 h-5 text-blue-400" />
          AI Fotó Elemzés
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!preview ? (
          <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-blue-500/30 rounded-xl cursor-pointer hover:border-blue-500/50 transition-colors">
            <Upload className="w-10 h-10 text-blue-400 mb-3" />
            <span className="text-slate-300">Kattints a feltöltéshez</span>
            <span className="text-slate-500 text-sm mt-1">JPG, PNG max 5MB</span>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleImageChange}
              className="hidden" 
            />
          </label>
        ) : (
          <div className="relative">
            <img src={preview} alt="Preview" className="w-full h-48 object-cover rounded-xl" />
            <button 
              onClick={clearImage}
              className="absolute top-2 right-2 p-2 bg-slate-900/80 rounded-full hover:bg-red-500/80 transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        )}
        
        {preview && !analysis && (
          <Button 
            onClick={analyzeImage}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Elemzés folyamatban...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Elemzés indítása
              </>
            )}
          </Button>
        )}
        
        {analysis && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className={
                analysis.condition === "jó" ? "bg-green-500/30 text-green-300" :
                analysis.condition === "közepes" ? "bg-yellow-500/30 text-yellow-300" :
                "bg-red-500/30 text-red-300"
              }>
                Állapot: {analysis.condition}
              </Badge>
            </div>
            
            {analysis.detected_issues?.length > 0 && (
              <div>
                <span className="text-slate-400 text-sm">Észlelt problémák:</span>
                <ul className="list-disc list-inside text-white text-sm mt-1">
                  {analysis.detected_issues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {analysis.recommended_services?.length > 0 && (
              <div>
                <span className="text-slate-400 text-sm">Javasolt szolgáltatások:</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {analysis.recommended_services.map((svc, i) => (
                    <Badge key={i} className="bg-blue-500/30 text-blue-300">{svc}</Badge>
                  ))}
                </div>
              </div>
            )}
            
            {analysis.estimated_price_range && (
              <div className="bg-slate-800/50 p-3 rounded-lg">
                <span className="text-slate-400 text-sm">Becsült ár:</span>
                <span className="text-green-400 font-bold ml-2">{analysis.estimated_price_range}</span>
              </div>
            )}
            
            {analysis.notes && (
              <p className="text-slate-400 text-sm">{analysis.notes}</p>
            )}
          </div>
        )}
        
        {error && (
          <div className="flex items-center gap-2 text-red-400 p-3 bg-red-500/10 rounded-lg">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">{error}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// AI Quote Generator Component
export const AIQuoteGenerator = ({ carType, condition, services, notes }) => {
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateQuote = async () => {
    if (!carType || !services?.length) {
      toast.error("Autó típus és szolgáltatások szükségesek");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${API}/ai/quote`, {
        car_type: carType,
        condition: condition || "közepes",
        services_requested: services,
        notes: notes
      }, { withCredentials: true });
      
      setQuote(response.data);
    } catch (err) {
      const message = err.response?.data?.detail || "Árajánlat készítés sikertelen";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-green-500/30 bg-green-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-green-400" />
          AI Árajánlat
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={generateQuote}
          disabled={loading || !carType || !services?.length}
          className="w-full bg-green-600 hover:bg-green-500"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Árajánlat készül...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Árajánlat kérése
            </>
          )}
        </Button>
        
        {quote && (
          <div className="space-y-3 p-4 bg-slate-800/30 rounded-xl">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-slate-400">Alapár:</span>
              <span className="text-white text-right">{quote.base_total?.toLocaleString()} Ft</span>
              
              {quote.condition_adjustment !== 0 && (
                <>
                  <span className="text-slate-400">Állapot felár/kedv.:</span>
                  <span className={`text-right ${quote.condition_adjustment > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {quote.condition_adjustment > 0 ? '+' : ''}{quote.condition_adjustment?.toLocaleString()} Ft
                  </span>
                </>
              )}
            </div>
            
            {quote.adjustment_reason && (
              <p className="text-slate-400 text-sm italic">{quote.adjustment_reason}</p>
            )}
            
            <div className="pt-3 border-t border-slate-700 flex justify-between items-center">
              <span className="text-white font-medium">Végső ár:</span>
              <span className="text-green-400 text-xl font-bold">{quote.final_total?.toLocaleString()} Ft</span>
            </div>
            
            {quote.time_estimate_minutes && (
              <p className="text-slate-400 text-sm">
                Becsült időtartam: ~{quote.time_estimate_minutes} perc
              </p>
            )}
            
            {quote.recommendations && (
              <p className="text-slate-400 text-sm">{quote.recommendations}</p>
            )}
          </div>
        )}
        
        {error && (
          <div className="flex items-center gap-2 text-red-400 p-3 bg-red-500/10 rounded-lg">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">{error}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default { AIUpsellSuggestions, AIPhotoAnalysis, AIQuoteGenerator };
