import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';

interface AudioRecorderProps {
  onRecordingComplete?: (uri: string) => void;
}

export default function AudioRecorder({ onRecordingComplete }: AudioRecorderProps) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  async function startRecording() {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync({
        android: {
          extension: '.wav',
          outputFormat: Audio.AndroidOutputFormat.DEFAULT,
          audioEncoder: Audio.AndroidAudioEncoder.ENCODED_PCM_16BIT,
          sampleRate: 16000,
          numberOfChannels: 1,
        },
        ios: {
          extension: '.wav',
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
          bitRate: 128000,
        },
      });
      setRecording(recording);
      setIsRecording(true);
      setRecordingUri(null); // Clear previous recording
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }

  async function stopRecording() {
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      setIsRecording(false);
      setRecordingUri(uri || null);
      
      if (uri) {
        if (onRecordingComplete) {
          onRecordingComplete(uri);
        }
        // Send to backend for processing
        await processAudio(uri);
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  }

  async function processAudio(uri: string) {
    try {
      setIsProcessing(true);

      // Create form data
      const formData = new FormData();
      formData.append('file', {
        uri,
        type: 'audio/wav',
        name: 'recording.wav',
      } as any);

      // Send to backend
      const response = await fetch('http://192.168.0.178:8000/analyze-audio', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      const result = await response.json();
      
      if (result.error) {
        console.error('Backend processing failed:', result.error);
        return;
      }

      // Save MIDI file
      if (result.midi) {
        const midiUri = `${FileSystem.documentDirectory}recording.mid`;
        await FileSystem.writeAsStringAsync(midiUri, result.midi, {
          encoding: FileSystem.EncodingType.Base64,
        });
        console.log('MIDI file saved at:', midiUri);
      }

    } catch (err) {
      console.error('Failed to process audio:', err);
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

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: recordingUri }
      );
      setSound(newSound);
      setIsPlaying(true);
      
      await newSound.playAsync();
      newSound.setOnPlaybackStatusUpdate((status) => {
        if ('isLoaded' in status && status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
        }
      });
    } catch (err) {
      console.error('Failed to play sound', err);
      setIsPlaying(false);
    }
  }

  async function stopSound() {
    if (!sound) return;
    
    try {
      await sound.stopAsync();
      setIsPlaying(false);
    } catch (err) {
      console.error('Failed to stop sound', err);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <TouchableOpacity
        style={[styles.recordButton, isRecording && styles.recordingButton]}
        onPress={isRecording ? stopRecording : startRecording}
        disabled={isProcessing}
      >
        <Ionicons 
          name={isRecording ? "stop" : "mic"} 
          size={32} 
          color="white" 
        />
      </TouchableOpacity>

      {recordingUri && (
        <TouchableOpacity
          style={[
            styles.playButton, 
            isPlaying && styles.playingButton,
            isProcessing && styles.processingButton
          ]}
          onPress={isPlaying ? stopSound : playSound}
          disabled={isRecording || isProcessing}
        >
          {isProcessing ? (
            <ThemedText>Processing...</ThemedText>
          ) : (
            <Ionicons 
              name={isPlaying ? "stop" : "play"} 
              size={32} 
              color="white" 
            />
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
    flexDirection: 'row',
    gap: 20,
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