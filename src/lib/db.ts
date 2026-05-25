import { createClient, Client } from '@libsql/client';

let _client: Client | null = null;

function getClient(): Client {
  if (!_client) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url) throw new Error('TURSO_DATABASE_URL manquant dans les variables d\'environnement');

    _client = createClient({
      url,
      authToken: authToken || undefined,
    });
  }
  return _client;
}

let initialized = false;

async function ensureInit(): Promise<void> {
  if (!initialized) {
    const db = getClient();
    await db.executeMultiple(`
      CREATE TABLE IF NOT EXISTS devis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        numero TEXT UNIQUE NOT NULL,
        client_nom TEXT NOT NULL,
        client_adresse TEXT NOT NULL,
        lignes TEXT NOT NULL,
        montant_total REAL NOT NULL,
        statut TEXT DEFAULT 'brouillon',
        date_creation TEXT NOT NULL,
        date_envoi TEXT,
        date_relance TEXT,
        notes TEXT
      );
      CREATE TABLE IF NOT EXISTS gmail_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        devis_id INTEGER,
        destinataire TEXT NOT NULL,
        objet TEXT NOT NULL,
        corps TEXT NOT NULL,
        date_envoi TEXT NOT NULL,
        FOREIGN KEY (devis_id) REFERENCES devis(id)
      );
      CREATE TABLE IF NOT EXISTS google_tokens (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        access_token TEXT,
        refresh_token TEXT,
        token_expiry TEXT,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS rdv (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        google_event_id TEXT,
        titre TEXT NOT NULL,
        description TEXT,
        date_debut TEXT NOT NULL,
        date_fin TEXT NOT NULL,
        client_nom TEXT,
        devis_id INTEGER,
        created_at TEXT NOT NULL,
        FOREIGN KEY (devis_id) REFERENCES devis(id)
      );
    `);
    initialized = true;
  }
}

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

function parseDevisRow(row: Record<string, any>): Devis {
  return { ...row, lignes: JSON.parse(row.lignes as string) } as Devis;
}

// ── Devis ──────────────────────────────────────────────────────
export async function getAllDevis(): Promise<Devis[]> {
  await ensureInit();
  const result = await getClient().execute('SELECT * FROM devis ORDER BY date_creation DESC');
  return result.rows.map(r => parseDevisRow(r as any));
}

export async function getDevisById(id: number): Promise<Devis | null> {
  await ensureInit();
  const result = await getClient().execute({ sql: 'SELECT * FROM devis WHERE id = ?', args: [id] });
  if (result.rows.length === 0) return null;
  return parseDevisRow(result.rows[0] as any);
}

export async function createDevis(data: Omit<Devis, 'id'>): Promise<Devis> {
  await ensureInit();
  const result = await getClient().execute({
    sql: `INSERT INTO devis (numero, client_nom, client_adresse, lignes, montant_total, statut, date_creation, date_envoi, date_relance, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      data.numero, data.client_nom, data.client_adresse,
      JSON.stringify(data.lignes), data.montant_total, data.statut,
      data.date_creation, data.date_envoi ?? null, data.date_relance ?? null, data.notes ?? null,
    ],
  });
  return (await getDevisById(Number(result.lastInsertRowid)))!;
}

export async function updateDevisStatut(id: number, statut: Devis['statut']): Promise<void> {
  await ensureInit();
  await getClient().execute({ sql: 'UPDATE devis SET statut = ? WHERE id = ?', args: [statut, id] });
}

export async function updateDevisEnvoi(id: number): Promise<void> {
  await ensureInit();
  await getClient().execute({
    sql: "UPDATE devis SET statut = 'envoyé', date_envoi = ? WHERE id = ?",
    args: [new Date().toISOString(), id],
  });
}

export async function updateDevisRelance(id: number): Promise<void> {
  await ensureInit();
  await getClient().execute({
    sql: 'UPDATE devis SET date_relance = ? WHERE id = ?',
    args: [new Date().toISOString(), id],
  });
}

export async function generateNumero(): Promise<string> {
  await ensureInit();
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `${year}${month}FA`;
  const result = await getClient().execute({
    sql: "SELECT numero FROM devis WHERE numero LIKE ? ORDER BY numero DESC LIMIT 1",
    args: [`${prefix}%`],
  });
  let seq = 1;
  if (result.rows.length > 0) {
    const lastNum = (result.rows[0].numero as string).slice(prefix.length);
    seq = parseInt(lastNum, 10) + 1;
  }
  return `${prefix}${String(seq).padStart(5, '0')}`;
}

export async function deleteDevis(id: number): Promise<void> {
  await ensureInit();
  await getClient().execute({ sql: 'DELETE FROM devis WHERE id = ?', args: [id] });
}

// ── Gmail history ──────────────────────────────────────────────
export async function addGmailHistory(data: Omit<GmailHistory, 'id'>): Promise<void> {
  await ensureInit();
  await getClient().execute({
    sql: 'INSERT INTO gmail_history (devis_id, destinataire, objet, corps, date_envoi) VALUES (?, ?, ?, ?, ?)',
    args: [data.devis_id ?? null, data.destinataire, data.objet, data.corps, data.date_envoi],
  });
}

export async function getGmailHistory(): Promise<GmailHistory[]> {
  await ensureInit();
  const result = await getClient().execute('SELECT * FROM gmail_history ORDER BY date_envoi DESC');
  return result.rows as any[];
}

// ── Google tokens ──────────────────────────────────────────────
export async function saveGoogleTokens(tokens: GoogleTokens): Promise<void> {
  await ensureInit();
  await getClient().execute({
    sql: 'INSERT OR REPLACE INTO google_tokens (id, access_token, refresh_token, token_expiry, updated_at) VALUES (1, ?, ?, ?, ?)',
    args: [tokens.access_token, tokens.refresh_token, tokens.token_expiry, new Date().toISOString()],
  });
}

export async function getGoogleTokens(): Promise<GoogleTokens | null> {
  await ensureInit();
  const result = await getClient().execute('SELECT * FROM google_tokens WHERE id = 1');
  if (result.rows.length === 0) return null;
  return result.rows[0] as any;
}

export async function clearGoogleTokens(): Promise<void> {
  await ensureInit();
  await getClient().execute('DELETE FROM google_tokens WHERE id = 1');
}

// ── RDV ────────────────────────────────────────────────────────
export async function getTodayRdv(): Promise<Rdv[]> {
  await ensureInit();
  const today = new Date().toISOString().split('T')[0];
  const result = await getClient().execute({
    sql: "SELECT * FROM rdv WHERE date_debut LIKE ? ORDER BY date_debut ASC",
    args: [`${today}%`],
  });
  return result.rows as any[];
}

export async function getAllRdv(): Promise<Rdv[]> {
  await ensureInit();
  const result = await getClient().execute('SELECT * FROM rdv ORDER BY date_debut ASC');
  return result.rows as any[];
}

export async function createRdv(data: Omit<Rdv, 'id'>): Promise<Rdv> {
  await ensureInit();
  const result = await getClient().execute({
    sql: `INSERT INTO rdv (google_event_id, titre, description, date_debut, date_fin, client_nom, devis_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      data.google_event_id ?? null, data.titre, data.description ?? null,
      data.date_debut, data.date_fin, data.client_nom ?? null,
      data.devis_id ?? null, data.created_at,
    ],
  });
  const row = await getClient().execute({
    sql: 'SELECT * FROM rdv WHERE id = ?',
    args: [Number(result.lastInsertRowid)],
  });
  return row.rows[0] as any;
}
