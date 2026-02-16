'use server';

import { aiGenerateCouponDescription as performGeneration } from '@/ai/flows/ai-generate-coupon-description';

type ActionResult = {
  success: boolean;
  message: string;
  data?: any;
};

export async function generateCouponDescriptionAction(
  description: string
): Promise<ActionResult> {
  if (!description) {
    return { success: false, message: 'Description cannot be empty.' };
  }

  try {
    const result = await performGeneration({ description });
    return {
      success: true,
      message: 'Description generated successfully.',
      data: result.elaborateDescription,
    };
  } catch (error) {
    console.error('AI generation error:', error);
    return {
      success: false,
      message: 'Failed to generate description. Please try again.',
    };
  }
}
