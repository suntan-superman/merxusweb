// server.js
require('dotenv').config();

const fastify = require('fastify')({ logger: true });
const websocket = require('@fastify/websocket');
const admin = require('firebase-admin');
const { XMLBuilder } = require('fast-xml-parser');

// -------- ENV CHECKS --------
const REQUIRED_ENV = [
  'OPENAI_API_KEY',
  'SERVICE_DOMAIN',
  'FIREBASE_PROJECT_ID',
];
REQUIRED_ENV.forEach((key) => {
  if (!process.env[key]) {
    console.warn(`[WARN] Missing env var: ${key}`);
  }
});

// -------- FIREBASE / FIRESTORE INIT --------
if (!admin.apps.length) {
  admin.initializeApp({
    // Uses GOOGLE_APPLICATION_CREDENTIALS or default credentials
    credential: admin.credential.applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}
const db = admin.firestore();

// -------- FASTIFY / WS INIT --------
fastify.register(websocket);

// Simple health check
fastify.get('/health', async () => ({ ok: true }));

// Utility: fetch restaurant config from Firestore
async function getRestaurantConfig(restaurantId) {
  const ref = db.collection('restaurants').doc(restaurantId);
  const snap = await ref.get();
  if (!snap.exists) {
    return null;
  }
  const data = snap.data();

  return {
    id: restaurantId,
    name: data.name || 'Unknown Restaurant',
    phone: data.phone || '',
    email: data.email || '',
    menuItems: data.menu_items || data.menuItems || [],
    businessHours: data.business_hours || data.businessHours || {},
    location: data.location || '',
    aiModel: data.aiModel || data.ai_model || 'gpt-4o-mini',
    voiceName: data.voiceName || data.voice_name || 'alloy',
    twilioNumberSid: data.twilio_number_sid || '',
  };
}

// -------- 1) INBOUND TWILIO WEBHOOK --------
//
// Twilio: Voice webhook URL
//   https://YOUR_DOMAIN/twilio/voice/inbound/:restaurantId
//
fastify.post('/twilio/voice/inbound/:restaurantId', async (request, reply) => {
  const { restaurantId } = request.params;

  try {
    const restaurant = await getRestaurantConfig(restaurantId);

    if (!restaurant) {
      fastify.log.error(`Restaurant not found: ${restaurantId}`);

      // Fallback: friendly error TwiML
      const builder = new XMLBuilder({ ignoreAttributes: false });
      const xml = builder.build({
        Response: {
          Say: {
            '@_voice': 'alice',
            '#text':
              'We are unable to connect your call at this time. Please try again later.',
          },
          Hangup: {},
        },
      });

      reply.type('text/xml').send(xml);
      return;
    }

    // Build TwiML to connect Twilio Media Stream to our WebSocket endpoint
    const wsUrl = `wss://${process.env.SERVICE_DOMAIN}/twilio/stream?restaurantId=${encodeURIComponent(
      restaurantId
    )}`;

    const builder = new XMLBuilder({ ignoreAttributes: false });
    const xml = builder.build({
      Response: {
        Say: {
          '@_voice': 'alice',
          '#text': `Connecting you to ${restaurant.name}.`,
        },
        Connect: {
          Stream: {
            '@_url': wsUrl,
          },
        },
      },
    });

    reply.type('text/xml').send(xml);
  } catch (err) {
    fastify.log.error(err);

    const builder = new XMLBuilder({ ignoreAttributes: false });
    const xml = builder.build({
      Response: {
        Say: {
          '@_voice': 'alice',
          '#text':
            'An internal error occurred while processing your call. Please try again later.',
        },
        Hangup: {},
      },
    });

    reply.type('text/xml').send(xml);
  }
});

// -------- 2) TWILIO MEDIA STREAM WEBSOCKET --------
//
// Twilio <Stream> will connect to:
//   wss://YOUR_DOMAIN/twilio/stream?restaurantId=XXX
//
fastify.get(
  '/twilio/stream',
  { websocket: true },
  async (connection, request) => {
    const { restaurantId } = request.query || {};

    if (!restaurantId) {
      fastify.log.error('Missing restaurantId in WebSocket query');
      connection.socket.close();
      return;
    }

    let restaurant;
    try {
      restaurant = await getRestaurantConfig(restaurantId);
    } catch (err) {
      fastify.log.error(
        { err, restaurantId },
        'Failed to load restaurant config'
      );
      connection.socket.close();
      return;
    }

    if (!restaurant) {
      fastify.log.error(`Restaurant not found for stream: ${restaurantId}`);
      connection.socket.close();
      return;
    }

    fastify.log.info(
      {
        restaurantId: restaurant.id,
        name: restaurant.name,
        model: restaurant.aiModel,
        voice: restaurant.voiceName,
      },
      'Starting Twilio media stream with restaurant-specific config'
    );

    // Hand off to your existing Twilio <-> OpenAI Realtime bridge
    handleTwilioMediaStream(connection.socket, restaurant);
  }
);

// -------- 3) TWILIO <-> OPENAI REALTIME BRIDGE --------
//
// This is where you plug in your *existing* logic that already works
// for a single restaurant, but now receives a `restaurant` object with
// aiModel, voiceName, menuItems, hours, etc.
//
const WebSocket = require('ws');

function handleTwilioMediaStream(twilioSocket, restaurant) {
  // Example: Build OpenAI Realtime session URL with model
  const openaiUrl = `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(
    restaurant.aiModel || 'gpt-4o-mini'
  )}`;

  const openaiSocket = new WebSocket(openaiUrl, {
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'OpenAI-Beta': 'realtime=v1',
    },
  });

  // --- Helper: build system / instructions message for OpenAI ---
  function buildSystemPrompt() {
    return `
You are the AI phone assistant for ${restaurant.name}.
Location: ${restaurant.location || 'Not specified'}.
Restaurant phone: ${restaurant.phone || 'Not specified'}.
Contact email: ${restaurant.email || 'Not specified'}.

Business hours (JSON): ${JSON.stringify(restaurant.businessHours || {})}.
Menu (JSON): ${JSON.stringify(restaurant.menuItems || [])}.

Behaviors:
- Greet callers as the real host or receptionist of ${restaurant.name}.
- Answer questions about hours, location, and the menu.
- Help callers decide on items based on preferences.
- Be concise, friendly, and professional.
- If you cannot handle a request (e.g., complex complaint), politely say a staff member will follow up.
`;
  }

  // --- OPENAI SOCKET EVENTS ---
  openaiSocket.on('open', () => {
    console.log(
      `OpenAI Realtime connected for restaurant: ${restaurant.id} (${restaurant.name})`
    );

    // Send initial session config / instructions once your Realtime protocol requires it.
    // This is pseudo-structure; adjust to your existing implementation.
    const sessionConfig = {
      type: 'session.update',
      session: {
        instructions: buildSystemPrompt(),
        // If your implementation supports voice name selection:
        voice: restaurant.voiceName || 'alloy',
      },
    };

    openaiSocket.send(JSON.stringify(sessionConfig));
  });

  openaiSocket.on('message', (data) => {
    // Here you handle audio/text from OpenAI and forward audio back to Twilio
    // This should mirror what you already have in your current backend.
    //
    // Example (pseudo-code):
    //
    // const msg = JSON.parse(data.toString());
    // if (msg.type === 'response.audio.delta') {
    //   const base64Audio = msg.audio;
    //   twilioSocket.send(
    //     JSON.stringify({
    //       event: 'media',
    //       media: { payload: base64Audio },
    //     })
    //   );
    // }
  });

  openaiSocket.on('close', () => {
    console.log('OpenAI Realtime socket closed');
    if (twilioSocket.readyState === WebSocket.OPEN) {
      twilioSocket.close();
    }
  });

  openaiSocket.on('error', (err) => {
    console.error('OpenAI Realtime socket error:', err);
    if (twilioSocket.readyState === WebSocket.OPEN) {
      twilioSocket.close();
    }
  });

  // --- TWILIO SOCKET EVENTS ---
  twilioSocket.on('message', (data) => {
    // Twilio Media Streams send JSON messages
    // Example structure:
    // { "event": "media", "media": { "payload": "<base64-encoded>" } }
    //
    // Your existing code already parses these; reuse it and just send
    // the audio frames to OpenAI as you already do.

    try {
      const msg = JSON.parse(data.toString());

      switch (msg.event) {
        case 'start':
          console.log(
            `Twilio stream started for ${restaurant.name} (${restaurant.id})`
          );
          break;
        case 'media':
          // Forward audio from Twilio to OpenAI as required by your Realtime setup.
          // Example (pseudo-structure):
          //
          // openaiSocket.send(
          //   JSON.stringify({
          //     type: 'input_audio_buffer.append',
          //     audio: msg.media.payload, // still base64
          //   })
          // );
          break;
        case 'stop':
          console.log('Twilio stream stopped');
          if (openaiSocket.readyState === WebSocket.OPEN) {
            openaiSocket.close();
          }
          break;
        default:
          break;
      }
    } catch (err) {
      console.error('Error parsing Twilio WS message:', err);
    }
  });

  twilioSocket.on('close', () => {
    console.log('Twilio socket closed');
    if (openaiSocket.readyState === WebSocket.OPEN) {
      openaiSocket.close();
    }
  });

  twilioSocket.on('error', (err) => {
    console.error('Twilio socket error:', err);
    if (openaiSocket.readyState === WebSocket.OPEN) {
      openaiSocket.close();
    }
  });
}

// -------- START SERVER --------
const PORT = process.env.PORT || 8080;
fastify.listen({ port: PORT, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(`Merxus AI backend listening at ${address}`);
});
