//Author: Erik Marques
import type { System } from './api';
import { appPath } from './paths';

// A identidade visual acompanha o sistema ao qual a versão pertence.
export const systemIcons: Record<System, string> = {
  oriontn: appPath('/assets/oriontn.ico'),
  orionpro: appPath('/assets/OrionPRO.png'),
  orionreg: appPath('/assets/OrionREG.png'),
};

export function VersionIcon({ system }: { system: System }) {
  const source = systemIcons[system];
  return <span className={`version-card-icon${source ? ' version-card-icon--brand' : ''}`} aria-hidden="true">
    {source ? <img src={source} alt="" width={40} height={40} /> :
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 6h16M4 12h16M4 18h10" /><circle cx="18" cy="18" r="3" />
      </svg>}
  </span>;
}
