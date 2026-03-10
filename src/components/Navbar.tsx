import { Menu, X } from "lucide-react";
import { useState } from "react";

const Navbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <header className="w-full bg-background border-b border-border">
      <div className="container mx-auto flex items-center justify-between py-3 px-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <rect width="36" height="36" rx="4" fill="hsl(358, 86%, 52%)" />
            <path d="M10 26V10h4l8 10V10h4v16h-4l-8-10v10h-4z" fill="white" />
          </svg>
          <div className="flex flex-col leading-tight">
            <span className="text-xl font-bold text-foreground tracking-tight">jadlog</span>
            <span className="text-[10px] text-muted-foreground">Sua encomenda na melhor carona.</span>
          </div>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-foreground">
          <a href="#" className="hover:text-primary transition-colors">Início</a>
          <a href="#" className="hover:text-primary transition-colors">Serviços</a>
          <a href="#" className="hover:text-primary transition-colors">Rastreamento</a>
          <a href="#" className="hover:text-primary transition-colors">Contato</a>
        </nav>

        {/* Mobile toggle */}
        <button className="md:hidden text-foreground" onClick={() => setOpen(!open)}>
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Nav */}
      {open && (
        <nav className="md:hidden flex flex-col gap-4 px-6 pb-4 text-sm font-medium text-foreground border-t border-border">
          <a href="#" className="pt-4 hover:text-primary transition-colors">Início</a>
          <a href="#" className="hover:text-primary transition-colors">Serviços</a>
          <a href="#" className="hover:text-primary transition-colors">Rastreamento</a>
          <a href="#" className="hover:text-primary transition-colors">Contato</a>
        </nav>
      )}
    </header>
  );
};

export default Navbar;
