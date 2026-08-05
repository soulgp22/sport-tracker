/**
 * Tests de la couche d'accès au serveur d'analyse repas : construction des
 * requêtes /health et /v1/chat/completions, extraction du texte de réponse.
 */

import {
  MEAL_SERVER_API_KEY,
  MEAL_SERVER_URL,
  buildAnalysisRequest,
  buildHealthRequest,
  buildTrainingUploadRequest,
  extractCompletionText,
} from '../mealPhotoApi';

describe('mealPhotoApi', () => {
  it('buildHealthRequest cible /health sur le serveur configuré', () => {
    expect(buildHealthRequest().url).toBe(`${MEAL_SERVER_URL}/health`);
  });

  it('buildAnalysisRequest : URL, header Bearer et body OpenAI multimodal', () => {
    const request = buildAnalysisRequest('PROMPT_TEST', 'BASE64_TEST');

    expect(request.url).toBe(`${MEAL_SERVER_URL}/v1/chat/completions?engine=gemini`);
    expect(request.headers['Content-Type']).toBe('application/json');
    expect(request.headers.Authorization).toBe(`Bearer ${MEAL_SERVER_API_KEY}`);

    const body = JSON.parse(request.body) as {
      messages: Array<{ role: string; content: Array<{ type: string; text?: string; image_url?: { url: string } }> }>;
      max_tokens: number;
      temperature: number;
    };
    expect(body.max_tokens).toBe(256);
    expect(body.temperature).toBe(0.1);
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].role).toBe('user');
    const [textPart, imagePart] = body.messages[0].content;
    expect(textPart).toEqual({ type: 'text', text: 'PROMPT_TEST' });
    expect(imagePart).toEqual({
      type: 'image_url',
      image_url: { url: 'data:image/jpeg;base64,BASE64_TEST' },
    });
  });

  it('extractCompletionText retourne le contenu du premier choix', () => {
    expect(
      extractCompletionText({ choices: [{ message: { content: '{"items":[]}' } }] })
    ).toBe('{"items":[]}');
  });

  it('extractCompletionText : null sur réponses inattendues', () => {
    expect(extractCompletionText(null)).toBeNull();
    expect(extractCompletionText({})).toBeNull();
    expect(extractCompletionText({ choices: [] })).toBeNull();
    expect(extractCompletionText({ choices: [{ message: {} }] })).toBeNull();
    expect(extractCompletionText({ choices: [{ message: { content: 42 } }] })).toBeNull();
  });

  it('buildTrainingUploadRequest : route /training/submit, clé Bearer, record + photo', () => {
    const record = { id: 'rec-1', createdAt: '2026-08-02T00:00:00Z', modelItems: [], corrections: [] };
    const request = buildTrainingUploadRequest(record, 'PHOTO_B64');

    expect(request.url).toBe(`${MEAL_SERVER_URL}/training/submit`);
    expect(request.headers.Authorization).toBe(`Bearer ${MEAL_SERVER_API_KEY}`);
    const body = JSON.parse(request.body) as { record: object; photoJpegBase64: string };
    expect(body.record).toEqual(record);
    expect(body.photoJpegBase64).toBe('PHOTO_B64');
  });
});
