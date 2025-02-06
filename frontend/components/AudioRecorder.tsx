import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';
import {ThemedText} from './ThemedText';
import {ThemedView} from './ThemedView';

interface AudioRecorderProps {
  onRecordingComplete?: (uri: string) => void;
}

export default function AudioRecorder({ onRecordingComplete }: AudioRecorderProps) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  async function startRecording() {
    try {
      // Request permissions
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
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
      
      if (uri && onRecordingComplete) {
        onRecordingComplete(uri);
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <TouchableOpacity
        style={[styles.button, isRecording && styles.recordingButton]}
        onPress={isRecording ? stopRecording : startRecording}
      >
        <ThemedText style={styles.buttonText}>
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 20,
    borderRadius: 50,
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
  },
}); 