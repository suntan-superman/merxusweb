/**
 * Voice Portal Prompt Library
 * Generated from merxus_voice_bilingual_75.json
 * Supports hierarchical selection: Category → Industry → Template
 * Bilingual support: English and Spanish prompts
 */

// Import JSON data
import voicePromptsData from './merxus_voice_bilingual_75.json';

// Flatten the hierarchical structure into a searchable library
export const VOICE_PROMPT_LIBRARY = [];

// Process each category
Object.keys(voicePromptsData.categories).forEach((categoryName) => {
  const industries = voicePromptsData.categories[categoryName];
  
  industries.forEach((industry) => {
    const industryName = industry.industry;
    
    // English prompt
    if (industry.english) {
      VOICE_PROMPT_LIBRARY.push({
        id: `${categoryName.toLowerCase().replace(/\s+/g, '_')}_${industryName.toLowerCase().replace(/\s+/g, '_')}_en`,
        category: categoryName,
        industry: industryName,
        language: 'en',
        name: `${industryName} (English)`,
        greeting: industry.english.greeting || '',
        intentOptions: industry.english.intent_options || [],
        followupQuestions: industry.english.followup_questions || [],
        // Build full prompt from components
        prompt: buildPromptFromComponents(industry.english, industryName, 'en'),
      });
    }
    
    // Spanish prompt
    if (industry.spanish) {
      VOICE_PROMPT_LIBRARY.push({
        id: `${categoryName.toLowerCase().replace(/\s+/g, '_')}_${industryName.toLowerCase().replace(/\s+/g, '_')}_es`,
        category: categoryName,
        industry: industryName,
        language: 'es',
        name: `${industryName} (Español)`,
        greeting: industry.spanish.saludo || '',
        intentOptions: industry.spanish.opciones_intencion || [],
        followupQuestions: industry.spanish.preguntas_seguimiento || [],
        // Build full prompt from components
        prompt: buildPromptFromComponents(industry.spanish, industryName, 'es'),
      });
    }
  });
});

/**
 * Build a full AI prompt from the structured components
 */
function buildPromptFromComponents(langData, industryName, language) {
  const isSpanish = language === 'es';
  
  const greeting = isSpanish ? langData.saludo : langData.greeting;
  const intentOptions = isSpanish ? langData.opciones_intencion : langData.intent_options;
  const followupQuestions = isSpanish ? langData.preguntas_seguimiento : langData.followup_questions;
  
  let prompt = `${greeting}\n\n`;
  
  if (isSpanish) {
    prompt += `Eres el asistente de IA telefónico para ${industryName}.\n`;
    prompt += `Tu trabajo es saludar a los llamadores, responder preguntas con precisión y ayudar profesionalmente.\n\n`;
    prompt += `OPCIONES DE INTENCIÓN:\n`;
    intentOptions.forEach((option, idx) => {
      prompt += `${idx + 1}. ${option}\n`;
    });
    prompt += `\nPREGUNTAS DE SEGUIMIENTO:\n`;
    followupQuestions.forEach((question, idx) => {
      prompt += `${idx + 1}. ${question}\n`;
    });
    prompt += `\nREGLAS:\n`;
    prompt += `- Habla claramente, con calidez y de manera concisa.\n`;
    prompt += `- Mantén la conversación fluida.\n`;
    prompt += `- Haz preguntas aclaratorias solo cuando sea necesario.\n`;
    prompt += `- NO proporciones asesoramiento médico, nutricional o legal.\n`;
    prompt += `- Transfiere a un humano cuando el llamador lo solicite.\n`;
    prompt += `\nTu tono debe ser amigable, profesional y servicial.`;
  } else {
    prompt += `You are the AI phone assistant for ${industryName}.\n`;
    prompt += `Your job is to greet callers, answer questions accurately, and help professionally.\n\n`;
    prompt += `INTENT OPTIONS:\n`;
    intentOptions.forEach((option, idx) => {
      prompt += `${idx + 1}. ${option}\n`;
    });
    prompt += `\nFOLLOW-UP QUESTIONS:\n`;
    followupQuestions.forEach((question, idx) => {
      prompt += `${idx + 1}. ${question}\n`;
    });
    prompt += `\nRULES:\n`;
    prompt += `- Speak clearly, warmly, and concisely.\n`;
    prompt += `- Keep the conversation moving.\n`;
    prompt += `- Ask clarifying questions only when needed.\n`;
    prompt += `- Do NOT provide medical, nutritional, or legal advice.\n`;
    prompt += `- Transfer to a human when the caller demands it.\n`;
    prompt += `\nYour tone should be friendly, professional, and helpful.`;
  }
  
  return prompt;
}

/**
 * Get all unique categories
 */
export function getCategories() {
  return [...new Set(VOICE_PROMPT_LIBRARY.map(p => p.category))].sort();
}

/**
 * Get industries for a specific category
 */
export function getIndustriesForCategory(category) {
  return [...new Set(
    VOICE_PROMPT_LIBRARY
      .filter(p => p.category === category)
      .map(p => p.industry)
  )].sort();
}

/**
 * Get prompts for a specific category and industry
 */
export function getPromptsForIndustry(category, industry) {
  return VOICE_PROMPT_LIBRARY.filter(
    p => p.category === category && p.industry === industry
  );
}

/**
 * Get a prompt by ID
 */
export function getPromptById(id) {
  return VOICE_PROMPT_LIBRARY.find(p => p.id === id);
}

/**
 * Get default prompt (first English prompt)
 */
export function getDefaultPrompt() {
  const defaultPrompt = VOICE_PROMPT_LIBRARY.find(p => p.language === 'en');
  return defaultPrompt?.prompt || '';
}

