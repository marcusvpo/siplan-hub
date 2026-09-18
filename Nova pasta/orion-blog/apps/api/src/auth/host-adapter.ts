/*Author: Erik Marques*/
import type { HostIdentityResolver } from './host.js';

/**
 * PONTO DE ACOPLAMENTO com o sistema maior (somente backend).
 * Substitua o corpo por uma chamada à validação REAL de sessão/permissões do hospedeiro.
 * Retorne { subject, email, isAdmin, sessionId } somente após essa validação.
 * Retorne null para sessão ausente, expirada ou revogada. Erros devem lançar exceção.
 * Nunca confie em query strings, localStorage, postMessage ou cabeçalhos isAdmin/userId.
 * Consulte docs/host-integration.md para o contrato e os cenários de integração.
 */
export const resolveHostIdentity: HostIdentityResolver = async (_request) => {
  return null;
};
