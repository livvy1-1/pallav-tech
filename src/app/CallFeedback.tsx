import React, { useState, useRef } from 'react';

export default function CallFeedback() {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && (f.type === 'audio/mp3' || f.type === 'audio/wav' || f.type === 'audio/mpeg')) {
      setFile(f);
      setAudioUrl(URL.createObjectURL(f));
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && (f.type === 'audio/mp3' || f.type === 'audio/wav' || f.type === 'audio/mpeg')) {
      setFile(f);
      setAudioUrl(URL.createObjectURL(f));
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleProcess = async () => {
    if (!file) return;
    setProcessing(true);
    const formData = new FormData();
    formData.append('audio', file);
    try {
      const res = await fetch('/api/analyze-call', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('Processing failed');
      const data = await res.json();
      setResult(data);
    } catch (e) {
      alert('Error processing audio. Please try again.');
    }
    setProcessing(false);
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 24 }}>
      <h2>Call Feedback Analyzer</h2>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        style={{ border: '2px dashed #aaa', padding: 32, textAlign: 'center', marginBottom: 16 }}
      >
        <input type="file" accept=".mp3,.wav,audio/*" onChange={handleFileChange} style={{ display: 'none' }} id="audio-upload" />
        <label htmlFor="audio-upload" style={{ cursor: 'pointer' }}>
          {audioUrl ? 'Change Audio File' : 'Click or Drag & Drop .mp3/.wav file here'}
        </label>
      </div>
      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} controls style={{ width: '100%', marginBottom: 16 }} />
      )}
      <button onClick={handleProcess} disabled={!file || processing} style={{ width: '100%', padding: 12, fontSize: 16 }}>
        {processing ? 'Processing...' : 'Process'}
      </button>
      {result && (
        <div style={{ marginTop: 32 }}>
          <h3>Scores</h3>
          <ul>
            {result.scores && Object.entries(result.scores).map(([param, score]) => (
              <li key={param}><b>{param}:</b> {String(score)}</li>
            ))}
          </ul>
          <div style={{ marginTop: 16 }}>
            <label><b>Overall Feedback:</b></label>
            <div style={{ border: '1px solid #ccc', padding: 8, minHeight: 40 }}>{result.overallFeedback}</div>
          </div>
          <div style={{ marginTop: 16 }}>
            <label><b>Observation:</b></label>
            <div style={{ border: '1px solid #ccc', padding: 8, minHeight: 40 }}>{result.observation}</div>
          </div>
        </div>
      )}
    </div>
  );
}