// Proxy entre la app Flutter y las APIs de Anthropic y Stripe.
// La app nunca ve la API key de Anthropic ni la clave secreta de Stripe:
// solo habla con este servidor.
const express = require('express');
const cors = require('cors');
const Stripe = require('stripe');
const admin = require('firebase-admin');

const app = express();
app.use(cors());

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';
const PORT = process.env.PORT || 3000;

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

// id de plan (ver lib/models/membership.dart, MembershipTier) -> Price id de Stripe
const STRIPE_PRICE_BY_TIER = {
  pro: process.env.STRIPE_PRICE_PRO,
  premium: process.env.STRIPE_PRICE_PREMIUM,
  native: process.env.STRIPE_PRICE_NATIVE,
};

// URLs a las que Stripe Checkout redirige tras el pago (páginas web simples
// de "vuelve a la app"; no necesitan lógica, solo confirmar visualmente).
const CHECKOUT_SUCCESS_URL = process.env.CHECKOUT_SUCCESS_URL || 'https://example.com/checkout-success';
const CHECKOUT_CANCEL_URL = process.env.CHECKOUT_CANCEL_URL || 'https://example.com/checkout-cancel';

// ---------- Firebase Admin (para escribir la membresía verificada en Firestore) ----------
// FIREBASE_SERVICE_ACCOUNT_JSON = el JSON completo de la cuenta de servicio
// (Firebase Console → Configuración del proyecto → Cuentas de servicio →
// Generar nueva clave privada), codificado en base64 en una sola línea.
let firestore = null;
if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  const serviceAccount = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_JSON, 'base64').toString('utf8')
  );
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  firestore = admin.firestore();
}

function requireFirestore(res) {
  if (!firestore) {
    res.status(500).json({ error: 'FIREBASE_SERVICE_ACCOUNT_JSON no configurada en el servidor' });
    return null;
  }
  return firestore;
}

app.get('/health', (_req, res) => res.json({ ok: true }));

// ---------- Webhook de Stripe ----------
// OJO: necesita el body en crudo (sin parsear) para poder verificar la
// firma, así que este endpoint se registra ANTES de app.use(express.json()).
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    return res.status(500).json({ error: 'Stripe no está configurado en el servidor' });
  }
  const db = requireFirestore(res);
  if (!db) return;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Firma de webhook inválida:', err.message);
    return res.status(400).json({ error: `Firma inválida: ${err.message}` });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const uid = session.metadata && session.metadata.firebaseUid;
        const tier = session.metadata && session.metadata.tier;
        if (uid && tier) {
          await db.collection('memberships').doc(uid).set(
            {
              tier,
              status: 'active',
              stripeCustomerId: session.customer || null,
              stripeSubscriptionId: session.subscription || null,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const uid = subscription.metadata && subscription.metadata.firebaseUid;
        if (uid) {
          const active = subscription.status === 'active' || subscription.status === 'trialing';
          await db.collection('memberships').doc(uid).set(
            {
              tier: active ? subscription.metadata.tier || null : 'none',
              status: subscription.status,
              stripeSubscriptionId: subscription.id,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        }
        break;
      }
      default:
        break; // otros eventos no nos interesan
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Error procesando webhook de Stripe:', err);
    res.status(500).json({ error: 'Error interno procesando el webhook' });
  }
});

// A partir de aquí sí parseamos JSON normal.
app.use(express.json({ limit: '1mb' }));

// ---------- Crear sesión de Stripe Checkout ----------
app.post('/api/create-checkout-session', async (req, res) => {
  if (!stripe) {
    return res.status(500).json({ error: 'STRIPE_SECRET_KEY no configurada en el servidor' });
  }
  const { uid, email, tier } = req.body || {};
  const priceId = STRIPE_PRICE_BY_TIER[tier];
  if (!uid || !tier || !priceId) {
    return res.status(400).json({ error: 'Body inválido: se espera { uid, email, tier } y el precio de ese tier configurado' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: CHECKOUT_SUCCESS_URL,
      cancel_url: CHECKOUT_CANCEL_URL,
      metadata: { firebaseUid: uid, tier },
      subscription_data: { metadata: { firebaseUid: uid, tier } },
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('Error creando sesión de Stripe Checkout:', err);
    res.status(502).json({ error: 'No se pudo crear la sesión de pago' });
  }
});

app.post('/api/roleplay-turn', async (req, res) => {
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY no configurada en el servidor' });
  }

  const { systemPrompt, messages } = req.body || {};
  if (typeof systemPrompt !== 'string' || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Body inválido: se espera { systemPrompt, messages }' });
  }

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 500,
        system: systemPrompt,
        messages,
      }),
    });

    const data = await anthropicRes.json();

    if (!anthropicRes.ok) {
      console.error('Error de Anthropic:', data);
      return res.status(502).json({ error: 'Error al llamar a la API de Anthropic' });
    }

    const text = (data.content || [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');

    res.json({ text });
  } catch (err) {
    console.error('Error en /api/roleplay-turn:', err);
    res.status(502).json({ error: 'No se pudo contactar con la API de Anthropic' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
