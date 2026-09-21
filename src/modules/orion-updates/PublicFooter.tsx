import { Headphones, Instagram, Linkedin, Facebook, Youtube, ExternalLink } from "lucide-react";
import "./public-footer.css";

const helpDeskLink = {
  label: "Help Desk",
  href: "http://sac.siplancontrolm.com.br/",
  icon: Headphones,
};

const socialLinks = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/siplantecnologia/",
    icon: Instagram,
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/spcm-tecnologia/",
    icon: Linkedin,
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/siplantecnologia",
    icon: Facebook,
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/user/SiplanControlM",
    icon: Youtube,
  },
];

export function PublicFooter() {
  const HelpDeskIcon = helpDeskLink.icon;
  const currentYear = new Date().getFullYear();

  return (
    <footer className="public-footer">
      <div className="container public-footer-container">
        <div className="public-footer-info">
          <div className="public-footer-primary-info">
            <a
              href="https://siplan.com.br/"
              target="_blank"
              rel="noopener noreferrer"
              className="public-footer-brand-link"
              title="Acessar siplan.com.br"
            >
              <strong className="public-footer-brand-name">SIPLAN</strong>
              <span className="public-footer-brand-desc">Tecnologia para Cartórios</span>
              <ExternalLink size={10} className="public-footer-external-icon" aria-hidden="true" />
            </a>
            <span className="public-footer-dot" aria-hidden="true">·</span>
            <span className="public-footer-copyright">
              © {currentYear} Todos os direitos reservados à Siplan.
            </span>
          </div>

          <div className="public-footer-addresses">
            <span className="public-footer-address-item">
              <span className="public-footer-city">São Paulo/SP:</span> Av. Paulista, 1776 – 14º andar · Tel.: (11) 5081-8800
            </span>
            <span className="public-footer-divider" aria-hidden="true">|</span>
            <span className="public-footer-address-item">
              <span className="public-footer-city">Jaboticabal/SP:</span> Rua Juca Quito, 336 – Centro
            </span>
          </div>
        </div>

        <div
          className="public-footer-links"
          role="navigation"
          aria-label="Canais de atendimento e redes sociais Siplan"
        >
          <a
            href={helpDeskLink.href}
            target="_blank"
            rel="noopener noreferrer"
            className="public-footer-link-helpdesk"
            title="Help Desk — Suporte Siplan Tecnologia"
            aria-label="Help Desk — Suporte Siplan Tecnologia"
          >
            <HelpDeskIcon size={14} className="public-footer-icon" aria-hidden="true" />
            <span>Help Desk</span>
          </a>

          <div className="public-footer-socials" aria-label="Redes sociais Siplan">
            {socialLinks.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="public-footer-social-link"
                  title={`${item.label} — Siplan Tecnologia`}
                  aria-label={`${item.label} — Siplan Tecnologia`}
                >
                  <Icon size={15} className="public-footer-icon" aria-hidden="true" />
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </footer>
  );
}
