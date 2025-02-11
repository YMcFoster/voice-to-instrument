import React, { useState, useEffect } from 'react';
import { TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Audio } from 'expo-av';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';

// Environment configuration for the API endpoint.
const API_CONFIG = {
  baseUrl: process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.178:8000',
  endpoints: {
    analyzeAudio: '/analyze-audio',
  },
};

// Recording options based on the HIGH_QUALITY preset with our custom overrides.
const RECORDING_OPTIONS = {
  ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
  extension: '.wav',
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 128000,
  android: {
    ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android,
    extension: '.wav',
    sampleRate: 16000,
    numberOfChannels: 1,
    // Using a supported audio encoder constant. PCM-based encoders aren’t provided, so we use AAC.
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
  },
  ios: {
    ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios,
    extension: '.wav',
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 128000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
};

interface AudioRecorderProps {
  onRecordingComplete?: (uri: string) => void;
  onError?: (error: string) => void;
}

export default function AudioRecorder({ onRecordingComplete, onError }: AudioRecorderProps) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cleanup effect for the sound object when the component unmounts.
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const handleError = (message: string, err: any) => {
    const errorMessage = `${message}: ${err.message || 'Unknown error'}`;
    console.error(errorMessage, err);
    setError(errorMessage);
    if (onError) {
      onError(errorMessage);
    }
    Alert.alert('Error', errorMessage);
  };

  async function startRecording() {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        throw new Error('Permission to record audio was not granted');
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('Starting recording with options:', RECORDING_OPTIONS);
      const { recording } = await Audio.Recording.createAsync(RECORDING_OPTIONS);
      setRecording(recording);
      setIsRecording(true);
      setRecordingUri(null);
      setError(null);
      console.log('Recording started');
    } catch (err) {
      handleError('Failed to start recording', err);
    }
  }

  async function stopRecording() {
    if (!recording) return;
    try {
      console.log('Stopping recording...');
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      setIsRecording(false);
      setRecordingUri(uri || null);
      console.log('Recording stopped and stored at:', uri);

      if (uri) {
        if (onRecordingComplete) {
          onRecordingComplete(uri);
        }
        await processAudio(uri);
      }
    } catch (err) {
      handleError('Failed to stop recording', err);
    }
  }

  async function processAudio(uri: string) {
    try {
      setIsProcessing(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', {
        uri,
        type: 'audio/wav',
        name: 'recording.wav',
      } as any);

      const response = await fetch(
        `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.analyzeAudio}`,
        {
          method: 'POST',
          body: formData,
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }

      if (result.midi) {
        const midiUri = `${FileSystem.documentDirectory}recording.mid`;
        await FileSystem.writeAsStringAsync(midiUri, result.midi, {
          encoding: FileSystem.EncodingType.Base64,
        });
        console.log('MIDI file saved at:', midiUri);
      }
    } catch (err) {
      handleError('Failed to process audio', err);
    } finally {
      setIsProcessing(false);
    }
  }

  async function playSound() {
    if (!recordingUri) return;
    try {
      if (sound) {
        await sound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync({ uri: recordingUri });
      setSound(newSound);
      setIsPlaying(true);
      setError(null);

      await newSound.playAsync();
      newSound.setOnPlaybackStatusUpdate((status) => {
        if ('isLoaded' in status && status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
        }
      });
      console.log('Playback started');
    } catch (err) {
      handleError('Failed to play sound', err);
      setIsPlaying(false);
    }
  }

  async function stopSound() {
    if (!sound) return;
    try {
      await sound.stopAsync();
      setIsPlaying(false);
      console.log('Playback stopped');
    } catch (err) {
      handleError('Failed to stop sound', err);
    }
  }

  return (
    <ThemedView style={styles.container}>
      {error && <ThemedText style={styles.errorText}>{error}</ThemedText>}

      <TouchableOpacity
        style={[styles.recordButton, isRecording && styles.recordingButton]}
        onPress={isRecording ? stopRecording : startRecording}
        disabled={isProcessing}
      >
        <Ionicons name={isRecording ? 'stop' : 'mic'} size={32} color="white" />
      </TouchableOpacity>

      {recordingUri && (
        <TouchableOpacity
          style={[
            styles.playButton,
            isPlaying && styles.playingButton,
            isProcessing && styles.processingButton,
          ]}
          onPress={isPlaying ? stopSound : playSound}
          disabled={isRecording || isProcessing}
        >
          {isProcessing ? (
            <ThemedText>Processing...</ThemedText>
          ) : (
            <Ionicons name={isPlaying ? 'stop' : 'play'} size={32} color="white" />
          )}
        </TouchableOpacity>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    flexDirection: 'column',
    gap: 20,
  },
  errorText: {
    color: '#f44336',
    marginBottom: 10,
    textAlign: 'center',
  },
  recordButton: {
    backgroundColor: '#4CAF50',
    padding: 20,
    borderRadius: 50,
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingButton: {
    backgroundColor: '#f44336',
  },
  playButton: {
    backgroundColor: '#2196F3',
    padding: 20,
    borderRadius: 50,
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playingButton: {
    backgroundColor: '#FFA000',
  },
  processingButton: {
    backgroundColor: '#9E9E9E',
  },
});
