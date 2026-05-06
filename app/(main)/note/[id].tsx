import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { useNotes, Note, NoteStatus, NotePriority } from '../../../context/NoteContext';

export default function NoteEditorScreen() {
  const { id } = useLocalSearchParams();
  const isNew = id === 'new';
  const router = useRouter();
  const navigation = useNavigation();
  const { notes, addNote, updateNote, deleteNote } = useNotes();

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 20, padding: 5 }}>
          <FontAwesome5 name="arrow-left" size={20} color="#553c7b" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, router]);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<NoteStatus>('To-Do');
  const [priority, setPriority] = useState<NotePriority>('Medium');

  const [recording, setRecording] = useState<Audio.Recording | undefined>();
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Failed to start recording.');
    }
  }

  async function stopRecording() {
    if (!recording) return;
    setRecording(undefined);
    await recording.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    const uri = recording.getURI();
    if (uri) {
      transcribeAudio(uri);
    }
  }

  async function transcribeAudio(uri: string) {
    const apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;
    if (!apiKey) {
      Alert.alert(
        'API Key Missing', 
        'Please add EXPO_PUBLIC_GROQ_API_KEY to your .env file.'
      );
      setContent(prev => prev + (prev ? '\n' : '') + '[Mock Transcribed Audio]');
      return;
    }

    setIsTranscribing(true);
    try {
      const formData = new FormData();

      if (Platform.OS === 'web') {
        // On web, we must fetch the blob and attach it directly
        const res = await fetch(uri);
        const blob = await res.blob();
        formData.append('file', blob, 'audio.webm');
      } else {
        // On native, we can pass the URI directly in React Native FormData
        const fileType = uri.split('.').pop() || 'm4a';
        formData.append('file', {
          uri,
          type: `audio/${fileType}`,
          name: `audio.${fileType}`,
        } as any);
      }

      // Groq's whisper model is super fast!
      formData.append('model', 'whisper-large-v3-turbo');

      const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (data.text) {
        setContent(prev => prev + (prev ? ' ' : '') + data.text);
      } else {
        console.error(data);
        Alert.alert('Error', 'Transcription failed.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'An error occurred during transcription.');
    } finally {
      setIsTranscribing(false);
    }
  }

  useEffect(() => {
    if (isNew) {
      setTitle('');
      setContent('');
      setStatus('To-Do');
      setPriority('Medium');
    } else {
      const existingNote = notes.find(n => n.id === id);
      if (existingNote) {
        setTitle(existingNote.title);
        setContent(existingNote.content);
        setStatus(existingNote.status);
        setPriority(existingNote.priority);
      }
    }
  }, [id, isNew, notes]);

  const handleSave = async () => {
    if (isSaving) return;
    setErrorMessage('');
    if (!title.trim() || !content.trim()) {
      setErrorMessage('Title and content cannot be empty');
      return;
    }

    setIsSaving(true);
    const noteData: Note = {
      id: isNew ? Date.now().toString() : (id as string),
      title,
      content,
      date: new Date().toISOString(),
      status,
      priority,
    };

    try {
      if (isNew) {
        await addNote(noteData);
      } else {
        await updateNote(noteData);
      }
      router.replace('/(main)');
    } catch (e: any) {
      setErrorMessage(e.message || 'Failed to save note');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setErrorMessage('');
    
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to delete this note?');
      if (confirmed) {
        try {
          setIsSaving(true);
          await deleteNote(id as string);
          router.replace('/(main)');
        } catch (e: any) {
          setErrorMessage(e.message || 'Failed to delete note');
          setIsSaving(false);
        }
      }
    } else {
      Alert.alert(
        'Delete Note',
        'Are you sure you want to delete this note?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Delete', 
            style: 'destructive', 
            onPress: async () => {
              try {
                setIsSaving(true);
                await deleteNote(id as string);
                router.replace('/(main)');
              } catch (e: any) {
                setErrorMessage(e.message || 'Failed to delete note');
                setIsSaving(false);
              }
            } 
          }
        ]
      );
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Title</Text>
        <TextInput 
          style={styles.input} 
          value={title} 
          onChangeText={setTitle} 
          placeholder="Note Title" 
        />
      </View>


      <View style={styles.formGroup}>
        <View style={styles.contentHeader}>
          <Text style={styles.label}>Content</Text>
          <TouchableOpacity 
            style={[styles.micButton, recording && styles.micButtonRecording]} 
            onPress={recording ? stopRecording : startRecording}
            disabled={isTranscribing}
          >
            {isTranscribing ? (
              <ActivityIndicator size="small" color="#8e44ad" />
            ) : (
              <FontAwesome5 
                name="microphone" 
                size={14} 
                color={recording ? "#fff" : "#8e44ad"} 
              />
            )}
            <Text style={[
              styles.micText, 
              recording && styles.micTextRecording,
              isTranscribing && { color: "#bdc3c7" }
            ]}>
              {recording ? 'Stop' : (isTranscribing ? 'Transcribing...' : 'Record Voice')}
            </Text>
          </TouchableOpacity>
        </View>
        <TextInput 
          style={[styles.input, styles.textArea]} 
          value={content} 
          onChangeText={setContent} 
          placeholder="Write your note here..." 
          multiline 
          textAlignVertical="top"
        />
      </View>

      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}

      <TouchableOpacity style={[styles.saveButton, isSaving && { opacity: 0.7 }]} onPress={handleSave} disabled={isSaving}>
        <Text style={styles.saveButtonText}>
          {isSaving ? 'Saving...' : 'Save Note'}
        </Text>
      </TouchableOpacity>

      {!isNew && (
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>Delete Note</Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34495e',
  },
  micButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0e6fa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  micButtonRecording: {
    backgroundColor: '#e74c3c',
  },
  micText: {
    color: '#8e44ad',
    fontWeight: 'bold',
    fontSize: 12,
  },
  micTextRecording: {
    color: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9fafa',
  },
  textArea: {
    minHeight: 150,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  badge: {
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  badgeSelected: {
    backgroundColor: '#8e44ad',
    borderColor: '#8e44ad',
  },
  badgeText: {
    color: '#7f8c8d',
    fontWeight: 'bold',
  },
  badgeTextSelected: {
    color: '#fff',
  },
  saveButton: {
    backgroundColor: '#8e44ad',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e74c3c',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  deleteButtonText: {
    color: '#e74c3c',
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#e74c3c',
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
});
