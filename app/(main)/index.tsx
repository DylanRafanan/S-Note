import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useNotes, Note } from '../../context/NoteContext';

export default function HomeScreen() {
  const router = useRouter();
  const { notes } = useNotes();

  // For the exact mockup look, we'll just sort notes by date descending
  const sortedNotes = useMemo(() => {
    return [...notes].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [notes]);

  const renderNoteItem = (item: Note) => {
    return (
      <TouchableOpacity 
        key={item.id}
        style={styles.noteCard}
        onPress={() => router.push(`/(main)/note/${item.id}`)}
      >
        <Text style={styles.noteTitle}>{item.title}</Text>
        <Text style={styles.noteDate}>
          {new Date(item.date).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </Text>
        <Text style={styles.noteContent} numberOfLines={1}>{item.content}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Title Area */}
      <View style={styles.titleContainer}>
        <Text style={styles.pageTitle}>My Notes</Text>
      </View>

      <ScrollView style={styles.listContainer} contentContainerStyle={{ paddingBottom: 100 }}>
        {sortedNotes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No notes yet. Tap the button below to add one!</Text>
          </View>
        ) : (
          sortedNotes.map(renderNoteItem)
        )}
      </ScrollView>

      {/* Custom FAB matching Mockup */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => router.push('/(main)/note/new')}
      >
        <View style={styles.fabInner}>
          <FontAwesome5 name="file-alt" size={24} color="#4fb6ff" />
          <View style={styles.fabPlusBadge}>
            <FontAwesome5 name="plus" size={10} color="#fff" />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#c89bfb', // Match the mockup solid purple background
  },
  titleContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: '#e0c3fc',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#553c7b',
  },
  listContainer: {
    paddingHorizontal: 20,
  },
  noteCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#553c7b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  noteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#34495e',
    marginBottom: 4,
  },
  noteDate: {
    fontSize: 12,
    color: '#8e44ad',
    fontWeight: 'bold',
    marginBottom: 6,
  },
  noteContent: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  fabInner: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  fabPlusBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: '#4fb6ff',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
