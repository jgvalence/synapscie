import { ASSO } from '../config';

/**
 * Le formulaire de contact n'existe que si Web3Forms a une clé. Tant qu'elle
 * manque, le site propose l'adresse de courriel à la place : la page Contact
 * sort du menu et du raccourci d'accueil, et l'adresse passe au pied de page,
 * visible partout. Poser `PUBLIC_CLE_FORMULAIRE` rallume le tout d'un coup,
 * sans toucher au code.
 */
export const formulaireActif = Boolean(import.meta.env.PUBLIC_CLE_FORMULAIRE);

/** `mailto:` de repli, ou `null` tant que `courriel` n'est pas renseigné. */
export const lienCourriel = ASSO.courriel ? `mailto:${ASSO.courriel}` : null;
