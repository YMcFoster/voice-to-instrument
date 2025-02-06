import { ThemedView } from '@/components/ThemedView';
import AudioRecorder from '@/components/AudioRecorder';
import { StyleSheet } from 'react-native';

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <AudioRecorder 
        onRecordingComplete={(uri) => {
          console.log('Recording saved at:', uri);
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
