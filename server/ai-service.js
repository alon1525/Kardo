import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";

const token = process.env.GITHUB_TOKEN;
const endpoint = "https://models.github.ai/inference";
const model = "meta/Llama-4-Scout-17B-16E-Instruct";

/**
 * Initialize the AI client
 */
function getAIClient() {
  if (!token) {
    throw new Error("GITHUB_TOKEN environment variable is not set");
  }
  
  return ModelClient(
    endpoint,
    new AzureKeyCredential(token),
  );
}

/**
 * Get AI suggestions for flashcards based on deck context
 * @param {string} deckName - Name of the deck
 * @param {string} language - Language of the deck
 * @param {Array} existingCards - Array of existing cards
 * @param {number} numSuggestions - Number of suggestions to generate
 * @returns {Promise<Array>} Array of suggested card objects
 */
export async function getAISuggestions(deckName, language, existingCards = [], numSuggestions = 5) {
  try {
    const client = getAIClient();
    
    // Build context from existing cards
    const cardContext = existingCards.length > 0
      ? existingCards.slice(0, 5).map((card, idx) => {
          const front = typeof card.front === 'string' ? card.front : card.front?.content || '';
          const back = typeof card.back === 'string' ? card.back : card.back?.content || '';
          return `${idx + 1}. ${front} → ${back}`;
        }).join('\n')
      : 'No existing cards yet.';

    const systemPrompt = `You are an expert language learning assistant. Your task is to suggest high-quality flashcards for language learning.

Context:
- Deck Name: ${deckName}
- Language: ${language}
- Existing Cards (examples):
${cardContext}

Generate ${numSuggestions} new flashcard suggestions that:
1. Are appropriate for learning ${language}
2. Complement the existing cards
3. Are useful for vocabulary, grammar, or phrases
4. Follow the format: Front (question/word) → Back (answer/translation/explanation)

Format your response as a JSON array where each object has "front" and "back" properties.`;

    const userPrompt = `Please suggest ${numSuggestions} flashcards for the "${deckName}" deck (${language}). Make them educational and practical.`;

    const response = await client.path("/chat/completions").post({
      body: {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.8,
        top_p: 0.9,
        max_tokens: 2048,
        model: model
      }
    });

    if (isUnexpected(response)) {
      throw new Error(response.body.error?.message || 'AI API error');
    }

    const content = response.body.choices[0]?.message?.content || '';
    
    // Try to parse JSON from the response
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*(\[[\s\S]*?\])/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      const suggestions = JSON.parse(jsonString);
      
      // Validate and format suggestions
      if (Array.isArray(suggestions)) {
        return suggestions
          .filter(s => s.front && s.back)
          .slice(0, numSuggestions)
          .map(s => ({
            front: String(s.front).trim(),
            back: String(s.back).trim()
          }));
      }
    } catch (parseError) {
      console.warn('Failed to parse JSON, trying to extract from text:', parseError);
      
      // Fallback: Try to extract card pairs from text
      const lines = content.split('\n').filter(line => line.trim());
      const extracted = [];
      
      for (let i = 0; i < lines.length && extracted.length < numSuggestions; i++) {
        const line = lines[i];
        // Look for patterns like "Front → Back" or "Front: Back"
        const match = line.match(/(.+?)(?:\s*[→:]\s*|->\s*)(.+)/);
        if (match) {
          extracted.push({
            front: match[1].trim().replace(/^\d+\.\s*/, ''), // Remove numbering
            back: match[2].trim()
          });
        }
      }
      
      if (extracted.length > 0) {
        return extracted;
      }
    }

    // If all parsing fails, return a default message
    return [{
      front: "Unable to parse AI suggestions",
      back: "Please try again or add cards manually"
    }];
    
  } catch (error) {
    console.error('Error getting AI suggestions:', error);
    throw error;
  }
}

/**
 * Get AI explanation for a specific card
 * @param {string} front - Front of the card
 * @param {string} back - Back of the card
 * @param {string} language - Language context
 * @returns {Promise<string>} AI-generated explanation
 */
export async function getCardExplanation(front, back, language) {
  try {
    const client = getAIClient();
    
    const systemPrompt = `You are an expert language learning assistant. Provide helpful explanations and learning tips for flashcards.`;

    const userPrompt = `For a ${language} flashcard:
Front: ${front}
Back: ${back}

Provide a brief, helpful explanation (2-3 sentences) that would help a learner understand this card better.`;

    const response = await client.path("/chat/completions").post({
      body: {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 500,
        model: model
      }
    });

    if (isUnexpected(response)) {
      throw new Error(response.body.error?.message || 'AI API error');
    }

    return response.body.choices[0]?.message?.content || 'No explanation available.';
    
  } catch (error) {
    console.error('Error getting card explanation:', error);
    throw error;
  }
}

