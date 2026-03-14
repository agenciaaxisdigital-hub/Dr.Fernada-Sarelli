import { Link } from "react-router-dom";
import { Heart } from "lucide-react";

const Footer = () => (
  <footer className="border-t bg-secondary">
    <div className="container py-10">
      <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
        <Link to="/" className="text-lg font-bold text-primary">
          Chama Doutora
        </Link>
        <nav className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
          <Link to="/sobre" className="hover:text-primary transition-colors">Sobre</Link>
          <Link to="/agenda" className="hover:text-primary transition-colors">Agenda</Link>
          <Link to="/redes-sociais" className="hover:text-primary transition-colors">Redes Sociais</Link>
          <Link to="/contato" className="hover:text-primary transition-colors">Contato</Link>
        </nav>
      </div>
      <div className="mt-8 flex items-center justify-center gap-1 text-xs text-muted-foreground">
        <span>Feito com</span>
        <Heart className="h-3 w-3 fill-primary text-primary" />
        <span>por Fernanda Sarelli</span>
      </div>
    </div>
  </footer>
);

export default Footer;
