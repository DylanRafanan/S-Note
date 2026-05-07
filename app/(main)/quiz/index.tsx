import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNotes, Note } from '../../../context/NoteContext';

const MIN_CONTENT_LENGTH = 100;

export default function QuizTopicScreen() {
  const router = useRouter();
  const { notes, isLoading } = useNotes();
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  // Only show notes that have enough content to generate meaningful questions
  const activeNotes = useMemo(
    () =>
      [...notes]
        .filter(n => n.content.trim().length >= MIN_CONTENT_LENGTH)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [notes]
  );

  const handleProceed = () => {
    if (!selectedNoteId) {
      if (Platform.OS === 'web') {
        window.alert('Please select a topic first.');
      } else {
        Alert.alert('No Topic Selected', 'Please select a note to quiz yourself on.');
      }
      return;
    }

    const note = notes.find(n => n.id === selectedNoteId);
    if (!note) return;

    router.push({ pathname: '/(main)/quiz/questions', params: { noteId: selectedNoteId } });
  };

  const renderNoteCard = (item: Note) => {
    const isSelected = item.id === selectedNoteId;

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.noteCard, isSelected && styles.noteCardSelected]}
        onPress={() => setSelectedNoteId(item.id)}
        activeOpacity={0.8}
      >
        {isSelected && (
          <View style={styles.checkBadge}>
            <FontAwesome5 name="check" size={10} color="#fff" />
          </View>
        )}
        <Text style={[styles.noteTitle, isSelected && styles.noteTitleSelected]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={[styles.noteDate, isSelected && styles.noteDateSelected]}>
          {new Date(item.date).toLocaleDateString([], {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </Text>
        <Text style={[styles.noteContent, isSelected && styles.noteContentSelected]} numberOfLines={2}>
          {item.content}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient colors={['#e0c3fc', '#c89bfb']} style={styles.gradient}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Select Topic :</Text>
          <Text style={styles.headerSubtitle}>Choose a note to generate your quiz</Text>
        </View>

        {/* Note List */}
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View style={styles.emptyContainer}>
              <FontAwesome5 name="spinner" size={32} color="#fff" />
              <Text style={styles.emptyText}>Loading notes...</Text>
            </View>
          ) : notes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <FontAwesome5 name="sticky-note" size={48} color="rgba(255,255,255,0.5)" />
              <Text style={styles.emptyText}>No notes yet!</Text>
              <Text style={styles.emptySubText}>Create some notes first before taking a quiz.</Text>
            </View>
          ) : activeNotes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <FontAwesome5 name="file-alt" size={48} color="rgba(255,255,255,0.5)" />
              <Text style={styles.emptyText}>Notes too short!</Text>
              <Text style={styles.emptySubText}>
                Your notes need at least 100 characters to generate quiz questions. Add more content to your notes first.
              </Text>
            </View>
          ) : (
            activeNotes.map(renderNoteCard)
          )}
        </ScrollView>

        {/* Proceed Button */}
        {activeNotes.length > 0 && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.proceedButton, !selectedNoteId && styles.proceedButtonDisabled]}
              onPress={handleProceed}
              activeOpacity={0.85}
            >
              <Text style={styles.proceedText}>Proceed</Text>
              <FontAwesome5 name="arrow-right" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#553c7b',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#7c4dab',
    marginTop: 2,
  },
  list: { flex: 1 },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    gap: 12,
  },
  noteCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#553c7b',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    position: 'relative',
  },
  noteCardSelected: {
    borderColor: '#8e44ad',
    backgroundColor: '#f5eeff',
    shadowOpacity: 0.3,
    elevation: 8,
  },
  checkBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#8e44ad',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#34495e',
    marginBottom: 4,
    paddingRight: 28,
  },
  noteTitleSelected: { color: '#6a1b9a' },
  noteDate: {
    fontSize: 11,
    color: '#9b59b6',
    fontWeight: '600',
    marginBottom: 6,
  },
  noteDateSelected: { color: '#7b1fa2' },
  noteContent: {
    fontSize: 13,
    color: '#7f8c8d',
    lineHeight: 18,
  },
  noteContentSelected: { color: '#6a5080' },
  shortWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  shortWarningText: {
    fontSize: 11,
    color: '#e67e22',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  emptySubText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    right: 24,
  },
  proceedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8e44ad',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 50,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  proceedButtonDisabled: {
    backgroundColor: 'rgba(142, 68, 173, 0.45)',
    elevation: 0,
    shadowOpacity: 0,
  },
  proceedText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});
