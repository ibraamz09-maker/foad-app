// Types partagés entre client et serveur — sans dépendances Node.js

export interface LigneDevis {
  description: string;
  prix_unitaire: number;
  quantite: number;
  total: number;
}

export interface Devis {
  id: number;
  numero: string;
  client_nom: string;
  client_adresse: string;
  lignes: LigneDevis[];
  montant_total: number;
  statut: 'brouillon' | 'envoyé' | 'accepté' | 'refusé';
  date_creation: string;
  date_envoi: string | null;
  date_relance: string | null;
  notes: string | null;
}

export interface GmailHistory {
  id: number;
  devis_id: number | null;
  destinataire: string;
  objet: string;
  corps: string;
  date_envoi: string;
}

export interface GoogleTokens {
  access_token: string;
  refresh_token: string;
  token_expiry: string;
}

export interface Rdv {
  id: number;
  google_event_id: string | null;
  titre: string;
  description: string | null;
  date_debut: string;
  date_fin: string;
  client_nom: string | null;
  devis_id: number | null;
  created_at: string;
}
