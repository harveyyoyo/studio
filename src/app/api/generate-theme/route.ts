import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const defaultOpenAI = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

export async function POST(req: NextRequest) {
    try {
        const { prompt, model = 'gemini-2.5-flash' } = await req.json();

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        const systemInstruction = `You are an expert UI/UX designer. Your task is to generate a beautiful, modern color palette and typography choice for a student web portal based on the user's prompt.
You MUST reply with a JSON object. Ensure that there is an excellent contrast ratio between the text and background colors so the app remains highly readable and accessible. Avoid muddy, generic colors - use premium, modern hues.
CRITICAL: The 'primary' and 'accent' colors MUST have high contrast against the 'background' color, as they are used for important UI elements like balances and icons.
You must also include a single cohesive 'emoji' that accurately represents the theme, and a 'fontFamily' choosing an appropriate Google Font that fits the theme's vibe (e.g. "Comic Neue", "Creepster", "Press Start 2P", "Space Mono", "Bangers", "Pacifico").

Required schema:
{
  "background": "A hex color for the main page background",
  "text": "A hex color for the main text on the background (ensure high contrast)",
  "primary": "A hex color for primary buttons and main accents (ensure high contrast against background)",
  "cardBackground": "A hex color for content cards that sit on the background",
  "accent": "A secondary accent color for borders or secondary icons (ensure high contrast against background)",
  "emoji": "A single representative emoji (e.g. 🚀, 🌊, 🎨)",
  "fontFamily": "The exact name of a Google Font (e.g. 'Fredoka One')"
}`;

        let responseText = '';

        if (model.startsWith('gpt')) {
            const effectiveKey = process.env.OPENAI_API_KEY;
            if (!effectiveKey) {
                return NextResponse.json({ error: 'OpenAI API key configuration error (Server)' }, { status: 500 });
            }

            const response = await defaultOpenAI.chat.completions.create({
                model: model as any,
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: systemInstruction },
                    { role: 'user', content: `Generate a theme for this prompt: "${prompt}"` }
                ]
            });
            responseText = response.choices[0].message.content || '';
        } else {
            const effectiveKey = process.env.GEMINI_API_KEY;

            if (!effectiveKey) {
                console.error('GEMINI_API_KEY is missing from environment variables (Server)');
                return NextResponse.json({ error: 'API key configuration error' }, { status: 500 });
            }

            const activeModel = genAI.getGenerativeModel({
                model: model,
                generationConfig: {
                    responseMimeType: 'application/json',
                },
                systemInstruction,
            });

            const result = await activeModel.generateContent(`Generate a theme for this prompt: "${prompt}"`);
            responseText = result.response.text();
        }



        try {
            const theme = JSON.parse(responseText);
            return NextResponse.json(theme);
        } catch (parseError) {
            console.error('Failed to parse Gemini response as JSON:', responseText);
            return NextResponse.json({ error: 'Invalid response format from AI' }, { status: 500 });
        }

    } catch (error) {
        console.error('Error in /api/generate-theme:', error);
        return NextResponse.json({ error: 'Failed to generate theme' }, { status: 500 });
    }
}
