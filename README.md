# Foad Amenzou — Application de gestion professionnelle

Application web hébergée dans le cloud, accessible depuis ton téléphone et ton MacBook, 24h/24 — même quand le Mac est éteint.

**Stack cloud (tout gratuit) :**
- **Vercel** → héberge l'application Next.js
- **Turso** → base de données SQLite dans le cloud
- **Google OAuth2** → Gmail + Calendar

---

## Déploiement en 3 étapes

### Étape 1 — Créer la base de données Turso

1. Va sur **[turso.tech](https://turso.tech)** → Sign up (compte gratuit)
2. Installe la CLI :
   ```bash
   brew install tursodatabase/tap/turso
   turso auth login
   ```
3. Crée une base de données :
   ```bash
   turso db create foad-amenzou
   turso db show foad-amenzou   # copie l'URL (libsql://...)
   turso db tokens create foad-amenzou   # copie le token
   ```
4. Note les deux valeurs — tu en auras besoin plus bas.

---

### Étape 2 — Configurer Google OAuth2

1. Va sur **[console.cloud.google.com](https://console.cloud.google.com)**
2. Crée un projet → **APIs & Services** → **Identifiants**
3. **Créer des identifiants** → **ID client OAuth 2.0** → Type : **Application Web**
4. Dans "URI de redirection autorisés", ajoute :
   ```
   https://votre-app.vercel.app/api/google/callback
   ```
   *(Tu remplaceras `votre-app` par le vrai nom Vercel à l'étape 3)*
5. Active les APIs :
   - **Gmail API**
   - **Google Calendar API**
6. Copie le **Client ID** et le **Client Secret**

---

### Étape 3 — Déployer sur Vercel

1. Crée un compte sur **[vercel.com](https://vercel.com)**

2. Installe la CLI :
   ```bash
   npm install -g vercel
   vercel login
   ```

3. Dans le dossier du projet :
   ```bash
   cd ~/foad-app
   vercel
   ```
   - Vercel te donnera une URL comme `foad-amenzou.vercel.app`

4. Dans le dashboard Vercel → ton projet → **Settings → Environment Variables**, ajoute :

   | Variable | Valeur |
   |---|---|
   | `SESSION_SECRET` | `foad-amenzou-secret-32chars-minimum` |
   | `TURSO_DATABASE_URL` | `libsql://foad-amenzou-xxx.turso.io` |
   | `TURSO_AUTH_TOKEN` | `eyJhb...` |
   | `GOOGLE_CLIENT_ID` | `xxx.apps.googleusercontent.com` |
   | `GOOGLE_CLIENT_SECRET` | `GOCSPX-xxx` |
   | `NEXT_PUBLIC_APP_URL` | `https://foad-amenzou.vercel.app` |

5. Redéploie avec les nouvelles variables :
   ```bash
   vercel --prod
   ```

6. Retourne dans Google Cloud Console → Identifiants → ton OAuth → ajoute l'URI de redirection finale :
   ```
   https://foad-amenzou.vercel.app/api/google/callback
   ```

---

## Utilisation

- **URL** : `https://foad-amenzou.vercel.app` (accessible depuis n'importe où)
- **Mot de passe** : `Foad1974@amz`
- **Session** : persistante 30 jours (pas besoin de se reconnecter)

### Connexion Google
Depuis le dashboard, clique sur **"Connecter Google"** pour autoriser Gmail et Calendar.

---

## Structure

```
src/
├── app/
│   ├── api/          # Routes serveur (auth, devis, gmail, calendar)
│   ├── dashboard/    # Tableau de bord avec stats
│   ├── devis/        # Liste + création + détail + PDF
│   ├── agenda/       # Google Calendar (vue mois/semaine)
│   ├── suivi/        # Suivi statuts + relances
│   └── login/        # Page de connexion
├── components/
│   ├── AppShell.tsx    # Layout + vérification auth
│   ├── Navigation.tsx  # Sidebar desktop / nav mobile
│   ├── PDFGenerator.tsx # PDF côté navigateur (jsPDF)
│   └── GmailModal.tsx  # Modal envoi email avec confirmation
└── lib/
    ├── db.ts      # Turso/SQLite (@libsql/client)
    ├── session.ts # Sessions iron-session (cookie httpOnly)
    └── google.ts  # OAuth2 Gmail + Calendar
```

---

## Dev local (optionnel)

Pour développer en local, tu peux utiliser la même DB Turso :

```bash
cd ~/foad-app
# Remplis TURSO_DATABASE_URL et TURSO_AUTH_TOKEN dans .env.local
npm run dev
# → http://localhost:3000
```

---

## Identité

- Couleur principale : `#1B2A6B` (bleu marine)
- Couleur accent : `#C0392B` (rouge)
- SIRET : 400 140 448 00087
- TVA non applicable — art. 293B du CGI
