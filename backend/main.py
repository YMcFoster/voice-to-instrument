from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import crepe
import librosa
import numpy as np
import tempfile
import os
from midiutil.MidiFile import MIDIFile
from typing import List

app = FastAPI()

# Add CORS middleware to allow requests from frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8081", "http://localhost:19006", "exp://localhost:19000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def convert_to_midi(frequencies: List[float], confidence: List[float], times: List[float]) -> bytes:
    # Create a new MIDI file with 1 track
    midi = MIDIFile(1)
    track = 0
    time = 0
    midi.addTrackName(track, time, "Voice Track")
    midi.addTempo(track, time, 120)
    
    # Convert frequencies to MIDI notes
    for i, (freq, conf) in enumerate(zip(frequencies, confidence)):
        if conf > 0.5:  # Only use predictions with high confidence
            if freq > 0:
                # Convert frequency to MIDI note number
                midi_number = 69 + 12 * np.log2(freq/440)
                midi_number = round(midi_number)
                
                # Ensure the note is within MIDI bounds (0-127)
                if 0 <= midi_number <= 127:
                    # Add note with duration of time step
                    duration = 0.25  # Quarter note
                    midi.addNote(track, 0, midi_number, times[i], duration, 100)
    
    # Save MIDI to bytes
    with tempfile.NamedTemporaryFile() as temp_file:
        midi.writeFile(temp_file)
        temp_file.seek(0)
        midi_bytes = temp_file.read()
    
    return midi_bytes

@app.post("/analyze-audio")
async def analyze_audio(file: UploadFile = File(...)):
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name

        # Load audio file
        audio, sr = librosa.load(temp_path, sr=16000, mono=True)
        
        # Run pitch detection
        time, frequency, confidence, _ = crepe.predict(audio, sr, viterbi=True)
        
        # Convert to MIDI
        midi_bytes = convert_to_midi(frequency, confidence, time)
        
        # Clean up temp file
        os.unlink(temp_path)
        
        return {
            "frequencies": frequency.tolist(),
            "confidence": confidence.tolist(),
            "times": time.tolist(),
            "midi": midi_bytes
        }
    except Exception as e:
        return {"error": str(e)}

@app.get("/")
async def read_root():
    return {"status": "ready"} 