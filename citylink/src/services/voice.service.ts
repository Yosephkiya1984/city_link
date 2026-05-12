import * as FileSystem from 'expo-file-system';
import { useSystemStore } from '../store/SystemStore';

/**
 * VoiceService
 * Hardened for 2026 Municipal environments.
 * Uses Dynamic Loading to prevent 'ExponentAV' missing module errors from crashing the app.
 */
class VoiceService {
  private isRecording = false;
  private recording: any = null;

  /**
   * getAudioModule
   * Safely retrieves the expo-av module at runtime.
   */
  private async getAudioModule() {
    try {
      return require('expo-av').Audio;
    } catch (e) {
      console.warn('[VoiceService] Audio module (expo-av) is not present in this build.');
      return null;
    }
  }

  /**
   * getSpeechModule
   * Safely retrieves the expo-speech module at runtime.
   */
  private async getSpeechModule() {
    try {
      return require('expo-speech');
    } catch (e) {
      console.warn('[VoiceService] Speech module (expo-speech) is not present in this build.');
      return null;
    }
  }

  async speak(text: string) {
    const Speech = await this.getSpeechModule();
    if (!Speech) return;

    try {
      const isReady = await Speech.isSpeakingAsync().catch(() => false);
      if (isReady) await Speech.stop();
      
      const lang = useSystemStore.getState().lang;
      const voiceLang = lang === 'am' ? 'am-ET' : lang === 'om' ? 'om-ET' : 'en-US';

      Speech.speak(text, {
        language: voiceLang,
        pitch: 1.0,
        rate: 0.9,
      });
    } catch (err) {
      console.error('[VoiceService] Speech error:', err);
    }
  }

  async stopSpeaking() {
    const Speech = await this.getSpeechModule();
    if (!Speech) return;
    try {
      await Speech.stop();
    } catch (err) {
      console.error('[VoiceService] Failed to stop speech', err);
    }
  }

  async startListening(): Promise<boolean> {
    const Audio = await this.getAudioModule();
    if (!Audio) {
      console.error('[VoiceService] Hardware not ready: Run npx expo run:android to include native modules.');
      return false;
    }

    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      this.recording = recording;
      this.isRecording = true;
      return true;
    } catch (err) {
      console.error('[VoiceService] Failed to start recording', err);
      return false;
    }
  }

  async stopListening(): Promise<{ uri: string; base64: string } | null> {
    if (!this.recording) return null;

    try {
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      this.recording = null;
      this.isRecording = false;

      if (!uri) return null;

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      return { uri, base64 };
    } catch (err) {
      console.error('[VoiceService] Failed to stop recording', err);
      return null;
    }
  }

  // Aliases and methods expected by UI:
  async requestPermissions(): Promise<boolean> {
    const Audio = await this.getAudioModule();
    if (!Audio) return false;
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      return granted;
    } catch (e) {
      console.error('[VoiceService] Permission request failed', e);
      return false;
    }
  }

  async startRecording(): Promise<boolean> {
    return this.startListening();
  }

  async stopRecording() {
    return this.stopListening();
  }
}

export const voiceService = new VoiceService();
