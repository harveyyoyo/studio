'use server';
/**
 * @fileOverview A Genkit flow that generates an elaborate, motivational, and official-sounding coupon description
 * based on a free-text student action description.
 *
 * - aiGenerateCouponDescription - A function that handles the generation of the coupon description.
 * - GenerateCouponDescriptionInput - The input type for the aiGenerateCouponDescription function.
 * - GenerateCouponDescriptionOutput - The return type for the aiGenerateCouponDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCouponDescriptionInputSchema = z.object({
  description: z
    .string()
    .describe("A free-text description of the student's action or achievement."),
});
export type GenerateCouponDescriptionInput = z.infer<
  typeof GenerateCouponDescriptionInputSchema
>;

const GenerateCouponDescriptionOutputSchema = z.object({
  elaborateDescription: z
    .string()
    .describe(
      "An elaborate, motivational, and official-sounding description for a coupon."
    ),
});
export type GenerateCouponDescriptionOutput = z.infer<
  typeof GenerateCouponDescriptionOutputSchema
>;

export async function aiGenerateCouponDescription(
  input: GenerateCouponDescriptionInput
): Promise<GenerateCouponDescriptionOutput> {
  return aiGenerateCouponDescriptionFlow(input);
}

const generateCouponDescriptionPrompt = ai.definePrompt({
  name: 'generateCouponDescriptionPrompt',
  input: {schema: GenerateCouponDescriptionInputSchema},
  output: {schema: GenerateCouponDescriptionOutputSchema},
  prompt: `You are an AI assistant specialized in creating motivational and official-sounding descriptions for student reward coupons.
Your task is to take a simple description of a student's action or achievement and transform it into an elaborate, inspiring, and formal phrase suitable for printing on a special recognition coupon. Focus on positive language, highlighting effort, achievement, and positive character traits.

Here is the student's action:
"{{{description}}}"

Based on the above, generate a compelling coupon description. The description should be professional and encouraging.

Example Output:
{
  "elaborateDescription": "Outstanding display of collaborative spirit and leadership during group projects, consistently elevating team performance."
}`,
});

const aiGenerateCouponDescriptionFlow = ai.defineFlow(
  {
    name: 'aiGenerateCouponDescriptionFlow',
    inputSchema: GenerateCouponDescriptionInputSchema,
    outputSchema: GenerateCouponDescriptionOutputSchema,
  },
  async (input) => {
    const {output} = await generateCouponDescriptionPrompt(input);
    return output!;
  }
);
