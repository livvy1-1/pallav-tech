// File: src/app/api/analyze-call/route.js
import fs from 'fs';
import path from 'path';
import axios from 'axios';

export async function POST(req) {
  try {

    const formData = await req.formData();
    const file = formData.get('audio');

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file uploaded' }), { status: 400 });
    }


    const uploadsDir = path.join(process.cwd(), 'uploads');
    await fs.promises.mkdir(uploadsDir, { recursive: true });
    const filePath = path.join(uploadsDir, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.promises.writeFile(filePath, buffer);


    const transcription = await transcribeAudio(filePath);


    const { scores, overallFeedback, observation } = analyzeTranscription(transcription);


    try { await fs.promises.unlink(filePath); } catch (e) { console.error('Failed to delete temp file', e); }


    return new Response(JSON.stringify({ scores, overallFeedback, observation }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('API Error:', err);
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: err.message }), { status: 500 });
  }
}

async function transcribeAudio(filePath) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY in environment');

  const audioFile = fs.createReadStream(filePath);

  const { default: FormData } = await import('form-data');
  const form = new FormData();
  form.append('file', audioFile, path.basename(filePath));
  form.append('model', 'whisper-1');

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/audio/transcriptions',
      form,
      {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${apiKey}`,
        },
      }
    );
    return response.data.text;
  } catch (err) {
    if (err.response?.status === 429) {
      throw new Error('Rate limit exceeded. Please wait a moment and try again.');
    }
    throw err;
  }
  
}

function analyzeTranscription(transcription) {
  const parameters = [
    { key: "greeting", weight: 5, inputType: "PASS_FAIL" },
    { key: "collectionUrgency", weight: 15, inputType: "SCORE" },
    { key: "rebuttalCustomerHandling", weight: 15, inputType: "SCORE" },
    { key: "callEtiquette", weight: 15, inputType: "SCORE" },
    { key: "callDisclaimer", weight: 5, inputType: "PASS_FAIL" },
    { key: "correctDisposition", weight: 10, inputType: "PASS_FAIL" },
    { key: "callClosing", weight: 5, inputType: "PASS_FAIL" },
    { key: "fatalIdentification", weight: 5, inputType: "PASS_FAIL" },
    { key: "fatalTapeDiscloser", weight: 10, inputType: "PASS_FAIL" },
    { key: "fatalToneLanguage", weight: 15, inputType: "PASS_FAIL" },
  ];

  const scores = {};
  for (const param of parameters) {
    if (param.inputType === 'PASS_FAIL') {
      scores[param.key] = transcription.toLowerCase().includes(param.key) ? param.weight : 0;
    } else {
      // Random score for demo purposes
      scores[param.key] = Math.floor(Math.random() * (param.weight + 1));
    }
  }

  const overallFeedback = 'The agent was confident and persuasive, though failed to provide disclaimer.';
  const observation = 'Customer raised objections about penalty. Agent managed well but missed tape disclosure.';

  return { scores, overallFeedback, observation };
}
