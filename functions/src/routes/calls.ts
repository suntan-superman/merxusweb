import { Response } from 'express';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { AuthenticatedRequest } from '../middleware/auth';
import OpenAI from 'openai';

const db = admin.firestore();

// Initialize OpenAI for translation
// Firebase Functions stores config in functions.config(), not process.env
const openai = new OpenAI({
  apiKey: functions.config().openai?.api_key || process.env.OPENAI_API_KEY,
});

export async function getCalls(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      res.status(403).json({ error: 'Restaurant ID required' });
      return;
    }

    const limit = Number(req.query.limit || 50);

    const snap = await db
      .collection('restaurants')
      .doc(restaurantId)
      .collection('calls')
      .orderBy('startedAt', 'desc')
      .limit(limit)
      .get();

    const calls = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(calls);
  } catch (err: any) {
    console.error('Error fetching calls:', err);
    res.status(500).json({ error: 'Failed to fetch calls' });
  }
}

export async function getCallTranscript(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const restaurantId = req.user?.restaurantId;
    const officeId = req.user?.officeId;
    const agentId = req.user?.agentId;
    const tenantId = req.user?.tenantId;
    const tenantType = req.user?.type; // 'restaurant', 'voice', or 'real_estate'
    const { id } = req.params;

    // Debug logging
    console.log('📋 getCallTranscript Debug:', {
      restaurantId,
      officeId,
      agentId,
      tenantId,
      tenantType,
      callId: id,
      userEmail: req.user?.email,
    });

    // Support all tenant types: restaurant, voice, and real estate
    // Calls are stored in callSessions collection at root level
    const callDoc = await db.collection('callSessions').doc(id).get();

    if (!callDoc.exists) {
      res.status(404).json({ error: 'Call not found' });
      return;
    }

    const callData = callDoc.data() || {};
    
    // Verify the user has access to this call
    const callRestaurantId = callData.restaurantId || callData.tenantId;
    const callOfficeId = callData.officeId || callData.tenantId;
    const callAgentId = callData.agentId || callData.tenantId;

    // Check access based on tenant type
    if (tenantType === 'voice' || officeId) {
      // Voice user - must match officeId
      if (callOfficeId !== officeId && callOfficeId !== tenantId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
    } else if (tenantType === 'restaurant' || restaurantId) {
      // Restaurant user - must match restaurantId
      if (callRestaurantId !== restaurantId && callRestaurantId !== tenantId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
    } else if (tenantType === 'real_estate' || agentId) {
      // Real Estate user - must match agentId
      if (callAgentId !== agentId && callAgentId !== tenantId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
    } else {
      // No tenant ID - deny access
      res.status(403).json({ error: 'Tenant ID required' });
      return;
    }

    // Return transcript data
    res.json({
      transcript: callData.transcript || callData.assistantTranscript || callData.callerTranscript || '',
      callerTranscript: callData.callerTranscript || '',
      assistantTranscript: callData.assistantTranscript || '',
      translatedTranscript: callData.translatedTranscript || null,
      translatedCallerTranscript: callData.translatedCallerTranscript || null,
      translatedAssistantTranscript: callData.translatedAssistantTranscript || null,
      detectedLanguage: callData.detectedLanguage || null,
    });
  } catch (err: any) {
    console.error('Error fetching transcript:', err);
    res.status(500).json({ error: 'Failed to fetch transcript' });
  }
}

export async function translateCallTranscript(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const restaurantId = req.user?.restaurantId;
    const officeId = req.user?.officeId;
    const agentId = req.user?.agentId;
    const tenantId = req.user?.tenantId;
    const tenantType = req.user?.type;
    const { id } = req.params;
    const { targetLanguage = 'en' } = req.body;

    // Get call document
    const callDoc = await db.collection('callSessions').doc(id).get();

    if (!callDoc.exists) {
      res.status(404).json({ error: 'Call not found' });
      return;
    }

    const callData = callDoc.data() || {};
    
    // Verify access (same as getCallTranscript)
    const callRestaurantId = callData.restaurantId || callData.tenantId;
    const callOfficeId = callData.officeId || callData.tenantId;
    const callAgentId = callData.agentId || callData.tenantId;

    if (tenantType === 'voice' || officeId) {
      if (callOfficeId !== officeId && callOfficeId !== tenantId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
    } else if (tenantType === 'restaurant' || restaurantId) {
      if (callRestaurantId !== restaurantId && callRestaurantId !== tenantId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
    } else if (tenantType === 'real_estate' || agentId) {
      if (callAgentId !== agentId && callAgentId !== tenantId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
    } else {
      res.status(403).json({ error: 'Tenant ID required' });
      return;
    }

    // Check if already translated
    if (callData.translatedTranscript && callData.translatedLanguage === targetLanguage) {
      res.json({
        translatedTranscript: callData.translatedTranscript,
        translatedCallerTranscript: callData.translatedCallerTranscript,
        translatedAssistantTranscript: callData.translatedAssistantTranscript,
        detectedLanguage: callData.detectedLanguage,
        targetLanguage,
        cached: true,
      });
      return;
    }

    const transcript = callData.transcript || callData.callerTranscript || '';
    const callerTranscript = callData.callerTranscript || '';
    const assistantTranscript = callData.assistantTranscript || '';

    if (!transcript && !callerTranscript && !assistantTranscript) {
      res.status(400).json({ error: 'No transcript to translate' });
      return;
    }

    console.log(`🌐 Translating call ${id} to ${targetLanguage}...`);

    // Use OpenAI to translate and detect language
    const translationPromises = [];
    let detectedLanguage = null;

    // Translate full transcript
    if (transcript) {
      translationPromises.push(
        openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are a professional translator. Translate the following conversation transcript to ${targetLanguage === 'en' ? 'English' : targetLanguage}. Maintain the original structure and format. If the text is already in the target language, return it as-is. Also, detect what language the original text is in.`,
            },
            {
              role: 'user',
              content: transcript,
            },
          ],
          temperature: 0.3,
        }).then(response => ({
          type: 'full',
          translation: response.choices[0]?.message?.content || transcript,
        }))
      );
    }

    // Translate caller transcript
    if (callerTranscript) {
      translationPromises.push(
        openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `Translate this caller's speech to ${targetLanguage === 'en' ? 'English' : targetLanguage}. Keep the same conversational tone. If already in target language, return as-is.`,
            },
            {
              role: 'user',
              content: callerTranscript,
            },
          ],
          temperature: 0.3,
        }).then(response => ({
          type: 'caller',
          translation: response.choices[0]?.message?.content || callerTranscript,
        }))
      );
    }

    // Translate assistant transcript
    if (assistantTranscript) {
      translationPromises.push(
        openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `Translate this AI assistant's speech to ${targetLanguage === 'en' ? 'English' : targetLanguage}. Keep the same professional tone. If already in target language, return as-is.`,
            },
            {
              role: 'user',
              content: assistantTranscript,
            },
          ],
          temperature: 0.3,
        }).then(response => ({
          type: 'assistant',
          translation: response.choices[0]?.message?.content || assistantTranscript,
        }))
      );
    }

    // Detect language
    translationPromises.push(
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Detect the language of this text. Respond with ONLY the language code (e.g., "es" for Spanish, "en" for English, "fr" for French). If multiple languages, return the dominant one.',
          },
          {
            role: 'user',
            content: transcript || callerTranscript || assistantTranscript,
          },
        ],
        temperature: 0,
        max_tokens: 10,
      }).then(response => ({
        type: 'language',
        language: response.choices[0]?.message?.content?.trim().toLowerCase() || 'unknown',
      }))
    );

    const results = await Promise.all(translationPromises);

    const translationData: any = {
      translatedLanguage: targetLanguage,
      translatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    results.forEach((result: any) => {
      if (result.type === 'full' && result.translation) {
        translationData.translatedTranscript = result.translation;
      } else if (result.type === 'caller' && result.translation) {
        translationData.translatedCallerTranscript = result.translation;
      } else if (result.type === 'assistant' && result.translation) {
        translationData.translatedAssistantTranscript = result.translation;
      } else if (result.type === 'language' && result.language) {
        translationData.detectedLanguage = result.language;
        detectedLanguage = result.language;
      }
    });

    // Save translations to Firestore
    await callDoc.ref.update(translationData);

    console.log(`✅ Translation complete for call ${id}. Detected language: ${detectedLanguage}`);

    res.json({
      translatedTranscript: translationData.translatedTranscript || null,
      translatedCallerTranscript: translationData.translatedCallerTranscript || null,
      translatedAssistantTranscript: translationData.translatedAssistantTranscript || null,
      detectedLanguage,
      targetLanguage,
      cached: false,
    });
  } catch (err: any) {
    console.error('Error translating transcript:', err);
    res.status(500).json({ error: 'Failed to translate transcript' });
  }
}

