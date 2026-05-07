// supabase/functions/generate-quiz/index.ts
// Supabase Edge Function — proxies Groq API so the key never reaches the client.
// Deploy with: npx supabase functions deploy generate-quiz
// Set secret with: npx supabase secrets set GROQ_API_KEY=gsk_...

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const TOTAL_QUESTIONS = 10;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { noteTitle, noteContent } = await req.json();

    if (!noteTitle || !noteContent) {
      return new Response(
        JSON.stringify({ error: 'noteTitle and noteContent are required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // API key lives only on the server — never sent to the client
    const apiKey = Deno.env.get('GROQ_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'GROQ_API_KEY secret is not configured on the server.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = `You are a quiz generator. Create exactly ${TOTAL_QUESTIONS} multiple-choice questions from the note below.

NOTE TITLE: ${noteTitle}
NOTE CONTENT:
${noteContent}

Instructions:
- Base every question strictly on the note content.
- Each question needs exactly 4 options labeled A, B, C, D.
- Only one option is correct per question.
- Output ONLY a raw JSON array with no markdown fences or extra text.

Example of one item in the array:
{"question":"What is the capital of France?","options":["A. Berlin","B. Madrid","C. Paris","D. Rome"],"answer":"C"}

Now produce ${TOTAL_QUESTIONS} items in that same JSON array format.`;

    const groqRes = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.6,
        max_tokens: 2048,
      }),
    });

    const groqData = await groqRes.json();

    if (!groqRes.ok) {
      return new Response(
        JSON.stringify({ error: groqData?.error?.message || 'Groq API request failed.' }),
        { status: groqRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let raw: string = groqData.choices?.[0]?.message?.content || '';

    // Strip markdown code fences if present
    raw = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();

    // Extract the JSON array
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({ error: 'Could not find a valid JSON array in the AI response.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const questions = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify({ questions }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Unexpected server error.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
