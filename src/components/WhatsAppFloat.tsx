import { MessageCircle } from "lucide-react";

const WhatsAppFloat = () => (
  <a
    href="https://w.app/drafernandasarelli"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Fale pelo WhatsApp"
    className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(142,70%,49%)] shadow-[0_10px_20px_rgba(37,211,102,0.3)] transition-transform hover:scale-110"
  >
    <MessageCircle className="h-7 w-7 text-primary-foreground" />
  </a>
);

export default WhatsAppFloat;
