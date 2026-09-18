//Author: Erik Marques
import { NotaryIllustration } from './NotaryIllustration';
import './blog-signature.css';

export function BlogSignature() {
  return <div className="blog-signature">
    <NotaryIllustration className="blog-signature-illustration" />
    <p className="blog-signature-text"><span>Conectado com você</span><strong>Próximo do seu cartório.</strong></p>
  </div>;
}
