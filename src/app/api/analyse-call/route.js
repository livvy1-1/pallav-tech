import fs from 'fs';
import path from 'path';
import axios from 'axios';

export async function POST(req) {
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

  // Transcribe audio using OpenAI Whisper
  let transcription = '';
  try {
    transcription = await transcribeAudio(filePath);
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Transcription failed', details: e.message }), { status: 500 });
  }


  const { scores, overallFeedback, observation } = analyzeTranscription(transcription);


  try { await fs.promises.unlink(filePath); } catch { }

  return new Response(JSON.stringify({ scores, overallFeedback, observation }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function transcribeAudio(filePath) {
  const apiKey = process.env.OPENAI_API_KEY;
  const audioFile = fs.createReadStream(filePath);
  const form = new (await import('form-data'))();
  form.append('file', audioFile, path.basename(filePath));
  form.append('model', 'whisper-1');

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
}

function analyzeTranscription(transcription) {

  const parameters = [
    { key: "greeting", name: "Greeting", weight: 5, desc: "Call opening within 5 seconds", inputType: "PASS_FAIL" },
    { key: "collectionUrgency", name: "Collection Urgency", weight: 15, desc: "Create urgency, cross-questioning", inputType: "SCORE" },
    { key: "rebuttalCustomerHandling", name: "Rebuttal Handling", weight: 15, desc: "Address penalties, objections", inputType: "SCORE" },
    { key: "callEtiquette", name: "Call Etiquette", weight: 15, desc: "Tone, empathy, clear speech", inputType: "SCORE" },
    { key: "callDisclaimer", name: "Call Disclaimer", weight: 5, desc: "Take permission before ending", inputType: "PASS_FAIL" },
    { key: "correctDisposition", name: "Correct Disposition", weight: 10, desc: "Use correct category with remark", inputType: "PASS_FAIL" },
    { key: "callClosing", name: "Call Closing", weight: 5, desc: "Thank the customer properly", inputType: "PASS_FAIL" },
    { key: "fatalIdentification", name: "Identification", weight: 5, desc: "Missing agent/customer info", inputType: "PASS_FAIL" },
    { key: "fatalTapeDiscloser", name: "Tape Disclosure", weight: 10, desc: "Inform customer about recording", inputType: "PASS_FAIL" },
    { key: "fatalToneLanguage", name: "Tone & Language", weight: 15, desc: "No abusive or threatening speech", inputType: "PASS_FAIL" }
  ];

  // scoring logic 
  const scores = {};
  for (const param of parameters) {
    if (param.inputType === 'PASS_FAIL') {
      scores[param.key] = transcription.toLowerCase().includes(param.key) ? param.weight : 0;
    } else {
      //random score
      scores[param.key] = Math.floor(Math.random() * (param.weight + 1));
    }
  }
  // place holder
  const overallFeedback = 'The agent was confident and persuasive, though failed to provide disclaimer.';
  const observation = 'Customer raised objections about penalty. Agent managed well but missed tape disclosure.';
  return { scores, overallFeedback, observation };
}