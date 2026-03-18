import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Cookie } from "lucide-react";
import { initFacebookPixel } from "@/lib/facebook-pixel";

// Destino após aceitar cookies: por pathname ou ?to=
const getRedirectTo = (pathname: string, search: string): string => {
  const params = new URLSearchParams(search);
  const to = params.get("to");
  if (to) return `/${to.replace(/^\//, "")}`;
  if (pathname === "/entrar-rei") return "/rei-dos-vazados";
  return "/lineu-silva";
};

const CookieConsentPage = () => {
  useEffect(() => {
    initFacebookPixel();
  }, []);
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const redirectTo = getRedirectTo(pathname, search);
  const isRei = redirectTo === "/rei-dos-vazados";

  const handleAceitar = () => {
    navigate(redirectTo, { replace: true });
  };

  return (
    <div
      className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-8">
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${
            isRei ? "bg-red-600/25 border-2 border-red-600/50" : "bg-red-500/20 border-2 border-red-500/40"
          }`}>
            <Cookie className={`w-10 h-10 ${isRei ? "text-red-500" : "text-red-500"}`} />
          </div>
        </div>
        <h1
          className="text-2xl md:text-3xl font-bold text-white mb-4"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Utilizamos cookies
        </h1>
        <p className="text-gray-400 text-base md:text-lg mb-8 leading-relaxed">
          Este site utiliza cookies para melhorar sua experiência, personalizar conteúdo e garantir o funcionamento das funcionalidades. Ao continuar, você concorda com nossa política de cookies.
        </p>
        <Button
          onClick={handleAceitar}
          className={`w-full text-white font-semibold py-6 rounded-xl text-base ${
            isRei ? "bg-red-600 hover:bg-red-700 shadow-lg shadow-red-900/30" : "bg-red-500 hover:bg-red-600"
          }`}
        >
          Aceitar e continuar
        </Button>
      </div>
    </div>
  );
};

export default CookieConsentPage;
