import React, { createContext, useState, useEffect, useContext } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export type NoteStatus = 'To-Do' | 'In Progress' | 'Done';
export type NotePriority = 'High' | 'Medium' | 'Low';

export interface Note {
  id: string;
  title: string;
  content: string;
  date: string; // YYYY-MM-DD format
  status: NoteStatus;
  priority: NotePriority;
}

type NoteContextType = {
  notes: Note[];
  addNote: (note: Note) => Promise<void>;
  updateNote: (note: Note) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  isLoading: boolean;
};

const NoteContext = createContext<NoteContextType | undefined>(undefined);

export function NoteProvider({ children }: { children: React.ReactNode }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadNotes();
    } else {
      setNotes([]);
      setIsLoading(false);
    }
  }, [user]);

  const loadNotes = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      if (data) {
        const fetchedNotes = data.map((n: any) => ({
          ...n,
          status: n.status || 'To-Do',
          priority: n.priority || 'Medium',
        }));
        setNotes(fetchedNotes);
      }
    } catch (e: any) {
      console.error('Error loading notes:', e);
      Alert.alert('Database Error', 'Could not load your notes: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const addNote = async (note: Note) => {
    try {
      const dbNote = {
        user_id: user?.id,
        title: note.title,
        content: note.content,
        date: note.date,
      };
      
      const { data, error } = await supabase.from('notes').insert(dbNote).select().single();
      if (error) throw error;

      const newNote = {
        ...note,
        id: data.id,
      };

      setNotes(prev => [newNote, ...prev]);
    } catch (e: any) {
      console.error('Error adding note:', e);
      throw e;
    }
  };

  const updateNote = async (updatedNote: Note) => {
    try {
      const dbNote = {
        title: updatedNote.title,
        content: updatedNote.content,
        date: updatedNote.date,
      };

      const { error } = await supabase
        .from('notes')
        .update(dbNote)
        .eq('id', updatedNote.id);

      if (error) throw error;

      setNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
    } catch (e: any) {
      console.error('Error updating note:', e);
      throw e;
    }
  };

  const deleteNote = async (id: string) => {
    try {
      const { error } = await supabase.from('notes').delete().eq('id', id);
      if (error) throw error;

      setNotes(prev => prev.filter(n => n.id !== id));
    } catch (e: any) {
      console.error('Error deleting note:', e);
      throw e;
    }
  };

  return (
    <NoteContext.Provider value={{ notes, addNote, updateNote, deleteNote, isLoading }}>
      {children}
    </NoteContext.Provider>
  );
}

export function useNotes() {
  const context = useContext(NoteContext);
  if (context === undefined) {
    throw new Error('useNotes must be used within a NoteProvider');
  }
  return context;
}
