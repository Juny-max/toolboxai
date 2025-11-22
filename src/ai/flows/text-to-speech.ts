'use server';

import { z } from 'zod';

const TextToSpeechInputSchema = z.object({
  text: z.string().describe('The text to be converted to speech.'),
  voice: z
    .enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'])
    .describe('The voice to use for the speech synthesis.'),
});
export type TextToSpeechInput = z.infer<typeof TextToSpeechInputSchema>;

const TextToSpeechOutputSchema = z.object({
  audioDataUri: z.string().describe('The generated audio as a Base64 data URI.'),
});
export type TextToSpeechOutput = z.infer<typeof TextToSpeechOutputSchema>;

export async function textToSpeech(input: TextToSpeechInput): Promise<TextToSpeechOutput> {
  const { text, voice } = TextToSpeechInputSchema.parse(input);
  
  // Note: Vercel AI SDK doesn't have a direct TTS utility like Genkit.
  // We'd typically use the OpenAI client directly.
  // For now, returning placeholder to avoid breaking the UI.
  console.log(`Simulating TTS for: "${text}" with voice "${voice}"`);
  
  const silentAudio = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABgAAABkYXRhAAAAAA==";

  return { audioDataUri: silentAudio };
}
