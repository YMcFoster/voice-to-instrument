import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { Ionicons } from '@expo/vector-icons';

interface AudioRecorderProps {
  onRecordingComplete?: (uri: string) => void;
}

export default function AudioRecorder({ onRecordingComplete }: AudioRecorderProps) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);

  async function startRecording() {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
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
      
      if (uri && onRecordingComplete) {
        onRecordingComplete(uri);
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
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
      >
        <Ionicons 
          name={isRecording ? "stop" : "mic"} 
          size={32} 
          color="white" 
        />
      </TouchableOpacity>

      {recordingUri && (
        <TouchableOpacity
          style={[styles.playButton, isPlaying && styles.playingButton]}
          onPress={isPlaying ? stopSound : playSound}
          disabled={isRecording}
        >
          <Ionicons 
            name={isPlaying ? "stop" : "play"} 
            size={32} 
            color="white" 
          />
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
}); 