import { MessageCircle } from "lucide-react";

const WhatsAppFloat = () => {
  const phone = "5500000000000"; // Replace with actual number
  const message = encodeURIComponent("Olá! Vim pelo site Chama Doutora.");

  return (
    <a
      href={`https://wa.me/${phone}?text=${message}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Fale pelo WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-whatsapp shadow-whatsapp transition-transform hover:scale-110"
    >
      <MessageCircle className="h-7 w-7 text-primary-foreground" />
    </a>
  );
};

export default WhatsAppFloat;
