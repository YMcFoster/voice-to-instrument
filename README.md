# AI-Powered Voice-to-Instrument App 🎤➡️🎹

Transform hummed melodies into full musical arrangements with AI! This app simplifies music creation for novices by abstracting technical complexities using AI.

## 🌟 Features
- **Voice-to-MIDI**: Convert hummed melodies into MIDI notes.
- **AI Chord Generation**: Auto-generate harmonies based on your melody.
- **Instrument Transformation**: Render melodies as piano, guitar, synths, etc.
- **TikTok-Style UI**: Intuitive mobile-first interface for rapid iteration.

## 🛠️ Tech Stack
### Frontend (Mobile)
- **React Native** + **Expo** (cross-platform app)
- **Tone.js** (audio playback)
- **React Native Audio Recorder** (voice capture)

### Backend (Python)
- **FastAPI** (REST API)
- **CREPE** (pitch detection)
- **Librosa** (audio analysis)
- **Magenta** (AI chord generation - optional)

## 🚀 Setup Guide (Using Cursor)
### Prerequisites
- **Node.js** (v18+)
- **Python** (3.8–3.10)
- **Git**
- **Cursor** (with [AI features enabled](https://cursor.sh/))

### 1. Clone the Repository
```bash
git clone https://github.com/YMcFoster/voice-to-instrument.git
cd voice-to-instrument