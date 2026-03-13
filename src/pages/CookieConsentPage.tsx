import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Cookie } from "lucide-react";

const CookieConsentPage = () => {
  const navigate = useNavigate();

  const handleAceitar = () => {
    navigate("/lineu-silva", { replace: true });
  };

  return (
    <div
      className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-red-500/20 border-2 border-red-500/40 flex items-center justify-center">
            <Cookie className="w-10 h-10 text-red-500" />
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
          className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-6 rounded-xl text-base"
        >
          Aceitar e continuar
        </Button>
      </div>
    </div>
  );
};

export default CookieConsentPage;
