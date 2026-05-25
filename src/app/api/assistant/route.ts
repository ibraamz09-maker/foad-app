import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { requireAuth } from '@/lib/session';
import {
  getAllDevis, createDevis, generateNumero, getDevisById,
  updateDevisStatut, createRdv,
} from '@/lib/db';
import { sendEmail, createCalendarEvent, getCalendarEvents } from '@/lib/google';
import { addGmailHistory, updateDevisEnvoi } from '@/lib/db';
import { generateDevisPDFBase64Server } from '@/lib/pdf-server';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = () => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return `Tu es l'assistant IA de Foad Amenzou, auto-entrepreneur basé à Monfavet (84140).
Date et heure actuelles : ${dateStr}, ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.

Tu peux effectuer ces actions :
- Créer des devis (avec lignes de prestation, prix, quantités)
- Envoyer des devis par email avec PDF en pièce jointe
- Créer des événements dans Google Agenda
- Consulter les devis existants et l'agenda

Règles importantes :
- Réponds TOUJOURS en français, sois bref et direct
- Si une adresse client manque pour un devis, utilise "À compléter"
- Pour les dates sans année, utilise 2026
- Pour les heures de RDV sans durée précisée, prévois 1 heure
- Confirme chaque action avec un résumé court
- Si tu as besoin d'info manquante (email du destinataire, etc.), demande-la
- Ne demande pas de confirmation avant d'agir, agis directement`;
};

const TOOLS: Groq.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'creer_devis',
      description: 'Créer un nouveau devis pour un client avec ses prestations',
      parameters: {
        type: 'object',
        properties: {
          client_nom: { type: 'string', description: 'Nom du client ou de la société' },
          client_adresse: { type: 'string', description: 'Adresse complète du client (ou "À compléter" si inconnue)' },
          lignes: {
            type: 'array',
            description: 'Liste des prestations',
            items: {
              type: 'object',
              properties: {
                description: { type: 'string', description: 'Description de la prestation' },
                prix_unitaire: { type: 'number', description: 'Prix unitaire en euros HT' },
                quantite: { type: 'number', description: 'Quantité (jours, heures, unités...)' },
              },
              required: ['description', 'prix_unitaire', 'quantite'],
            },
          },
          notes: { type: 'string', description: 'Notes ou conditions optionnelles' },
        },
        required: ['client_nom', 'client_adresse', 'lignes'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'envoyer_devis_email',
      description: 'Envoyer un devis existant par email avec le PDF en pièce jointe',
      parameters: {
        type: 'object',
        properties: {
          devis_id: { type: 'number', description: 'ID du devis à envoyer' },
          destinataire: { type: 'string', description: 'Adresse email du destinataire' },
          message: { type: 'string', description: 'Corps du message (optionnel, un message par défaut sera utilisé)' },
        },
        required: ['devis_id', 'destinataire'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'creer_et_envoyer_devis',
      description: 'Créer un devis ET l\'envoyer directement par email en une seule action',
      parameters: {
        type: 'object',
        properties: {
          client_nom: { type: 'string' },
          client_adresse: { type: 'string' },
          lignes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                description: { type: 'string' },
                prix_unitaire: { type: 'number' },
                quantite: { type: 'number' },
              },
              required: ['description', 'prix_unitaire', 'quantite'],
            },
          },
          notes: { type: 'string' },
          destinataire_email: { type: 'string', description: 'Email du client pour envoi immédiat' },
        },
        required: ['client_nom', 'client_adresse', 'lignes', 'destinataire_email'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'creer_evenement_agenda',
      description: 'Créer un rendez-vous ou événement dans Google Agenda',
      parameters: {
        type: 'object',
        properties: {
          titre: { type: 'string', description: 'Titre du rendez-vous' },
          date_debut: { type: 'string', description: 'Date et heure de début au format ISO 8601 (ex: 2026-06-10T14:00:00)' },
          date_fin: { type: 'string', description: 'Date et heure de fin au format ISO 8601' },
          description: { type: 'string', description: 'Description ou notes sur le RDV' },
          client_nom: { type: 'string', description: 'Nom du client associé' },
        },
        required: ['titre', 'date_debut', 'date_fin'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'lister_devis',
      description: 'Consulter la liste des devis',
      parameters: {
        type: 'object',
        properties: {
          statut: {
            type: 'string',
            enum: ['tous', 'brouillon', 'envoyé', 'accepté', 'refusé'],
            description: 'Filtrer par statut',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'lister_evenements',
      description: 'Consulter les prochains rendez-vous de l\'agenda',
      parameters: {
        type: 'object',
        properties: {
          jours: { type: 'number', description: 'Nombre de jours à partir d\'aujourd\'hui (défaut: 7)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'changer_statut_devis',
      description: 'Changer le statut d\'un devis (ex: marquer comme accepté)',
      parameters: {
        type: 'object',
        properties: {
          devis_id: { type: 'number' },
          statut: { type: 'string', enum: ['brouillon', 'envoyé', 'accepté', 'refusé'] },
        },
        required: ['devis_id', 'statut'],
      },
    },
  },
];

async function executeTool(name: string, args: any): Promise<string> {
  try {
    if (name === 'creer_devis') {
      const lignes = args.lignes.map((l: any) => ({
        description: l.description,
        prix_unitaire: l.prix_unitaire,
        quantite: l.quantite,
        total: l.prix_unitaire * l.quantite,
      }));
      const montant_total = lignes.reduce((s: number, l: any) => s + l.total, 0);
      const devis = await createDevis({
        numero: await generateNumero(),
        client_nom: args.client_nom,
        client_adresse: args.client_adresse || 'À compléter',
        lignes,
        montant_total,
        statut: 'brouillon',
        date_creation: new Date().toISOString(),
        date_envoi: null,
        date_relance: null,
        notes: args.notes || null,
      });
      return JSON.stringify({ success: true, devis_id: devis.id, numero: devis.numero, montant: devis.montant_total });
    }

    if (name === 'envoyer_devis_email') {
      const devis = await getDevisById(args.devis_id);
      if (!devis) return JSON.stringify({ error: 'Devis introuvable' });

      const pdfBase64 = await generateDevisPDFBase64Server(devis);
      const body = args.message || `Bonjour,\n\nVeuillez trouver ci-joint le devis n° ${devis.numero} d'un montant de ${devis.montant_total.toFixed(2)} € TTC.\n\nN'hésitez pas à me contacter pour toute question.\n\nCordialement,\nFoad Amenzou\n06 67 01 32 48`;

      await sendEmail({
        to: args.destinataire,
        subject: `Devis ${devis.numero} — Foad Amenzou`,
        body,
        attachmentBase64: pdfBase64,
        attachmentName: `${devis.numero}.pdf`,
      });
      await addGmailHistory({ devis_id: devis.id, destinataire: args.destinataire, objet: `Devis ${devis.numero}`, corps: body, date_envoi: new Date().toISOString() });
      await updateDevisEnvoi(devis.id);
      return JSON.stringify({ success: true, numero: devis.numero, destinataire: args.destinataire });
    }

    if (name === 'creer_et_envoyer_devis') {
      const lignes = args.lignes.map((l: any) => ({
        description: l.description,
        prix_unitaire: l.prix_unitaire,
        quantite: l.quantite,
        total: l.prix_unitaire * l.quantite,
      }));
      const montant_total = lignes.reduce((s: number, l: any) => s + l.total, 0);
      const devis = await createDevis({
        numero: await generateNumero(),
        client_nom: args.client_nom,
        client_adresse: args.client_adresse || 'À compléter',
        lignes,
        montant_total,
        statut: 'brouillon',
        date_creation: new Date().toISOString(),
        date_envoi: null,
        date_relance: null,
        notes: args.notes || null,
      });
      const pdfBase64 = await generateDevisPDFBase64Server(devis);
      const body = `Bonjour,\n\nVeuillez trouver ci-joint le devis n° ${devis.numero} d'un montant de ${devis.montant_total.toFixed(2)} € TTC.\n\nN'hésitez pas à me contacter pour toute question.\n\nCordialement,\nFoad Amenzou\n06 67 01 32 48`;
      await sendEmail({
        to: args.destinataire_email,
        subject: `Devis ${devis.numero} — Foad Amenzou`,
        body,
        attachmentBase64: pdfBase64,
        attachmentName: `${devis.numero}.pdf`,
      });
      await addGmailHistory({ devis_id: devis.id, destinataire: args.destinataire_email, objet: `Devis ${devis.numero}`, corps: body, date_envoi: new Date().toISOString() });
      await updateDevisEnvoi(devis.id);
      return JSON.stringify({ success: true, devis_id: devis.id, numero: devis.numero, montant: devis.montant_total, destinataire: args.destinataire_email });
    }

    if (name === 'creer_evenement_agenda') {
      try {
        const event = await createCalendarEvent({
          title: args.titre,
          description: args.description,
          start: args.date_debut,
          end: args.date_fin,
        });
        await createRdv({
          google_event_id: event.id || null,
          titre: args.titre,
          description: args.description || null,
          date_debut: args.date_debut,
          date_fin: args.date_fin,
          client_nom: args.client_nom || null,
          devis_id: null,
          created_at: new Date().toISOString(),
        });
        return JSON.stringify({ success: true, titre: args.titre, debut: args.date_debut });
      } catch (e: any) {
        if (e.message?.includes('Google non connecté')) {
          return JSON.stringify({ error: 'Google Agenda non connecté. Va dans l\'app et connecte Google d\'abord.' });
        }
        throw e;
      }
    }

    if (name === 'lister_devis') {
      const tous = await getAllDevis();
      const filtered = args.statut && args.statut !== 'tous'
        ? tous.filter(d => d.statut === args.statut)
        : tous;
      const resume = filtered.slice(0, 10).map(d =>
        `#${d.id} ${d.numero} — ${d.client_nom} — ${d.montant_total.toFixed(2)}€ — ${d.statut}`
      );
      return JSON.stringify({ total: filtered.length, devis: resume });
    }

    if (name === 'lister_evenements') {
      try {
        const jours = args.jours || 7;
        const now = new Date();
        const fin = new Date(now.getTime() + jours * 24 * 60 * 60 * 1000);
        const events = await getCalendarEvents(now.toISOString(), fin.toISOString());
        const resume = events.slice(0, 10).map((e: any) => ({
          titre: e.summary,
          debut: e.start?.dateTime || e.start?.date,
        }));
        return JSON.stringify({ events: resume });
      } catch {
        return JSON.stringify({ error: 'Google Agenda non connecté' });
      }
    }

    if (name === 'changer_statut_devis') {
      await updateDevisStatut(args.devis_id, args.statut);
      return JSON.stringify({ success: true, devis_id: args.devis_id, nouveau_statut: args.statut });
    }

    return JSON.stringify({ error: 'Outil inconnu' });
  } catch (e: any) {
    return JSON.stringify({ error: e.message });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const { messages } = await req.json();

    const groqMessages: Groq.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT() },
      ...messages,
    ];

    let response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: groqMessages,
      tools: TOOLS,
      tool_choice: 'auto',
      max_tokens: 1024,
    });

    let msg = response.choices[0].message;

    // Execute tool calls in a loop until no more tools are needed
    while (msg.tool_calls && msg.tool_calls.length > 0) {
      groqMessages.push(msg);

      for (const tc of msg.tool_calls) {
        const args = JSON.parse(tc.function.arguments);
        const result = await executeTool(tc.function.name, args);
        groqMessages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: result,
        });
      }

      response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: groqMessages,
        tools: TOOLS,
        tool_choice: 'auto',
        max_tokens: 1024,
      });
      msg = response.choices[0].message;
    }

    return NextResponse.json({ reply: msg.content });
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    console.error('Assistant error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
