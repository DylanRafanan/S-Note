import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNotes } from '../../../context/NoteContext';
import { supabase } from '../../../lib/supabase';

interface Question {
  question: string;
  options: string[]; // ['A. ...', 'B. ...', 'C. ...', 'D. ...']
  answer: string;    // 'A', 'B', 'C', or 'D'
}

interface SavedAnswer {
  selected: string;
  state: 'correct' | 'wrong';
}

type AnswerState = 'idle' | 'correct' | 'wrong';

const TOTAL_QUESTIONS = 10;
const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export default function QuizQuestionsScreen() {
  // retryTs is passed by result.tsx when "Take Quiz Again" is pressed.
  // Changing it forces the useEffect to re-run even for the same noteId.
  const { noteId, retryTs } = useLocalSearchParams<{ noteId: string; retryTs?: string }>();
  const router = useRouter();
  const { notes } = useNotes();

  const note = notes.find(n => n.id === noteId);

  const [questions, setQuestions]         = useState<Question[]>([]);
  const [isGenerating, setIsGenerating]   = useState(true);
  const [error, setError]                 = useState('');

  const [currentIndex, setCurrentIndex]   = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answerState, setAnswerState]     = useState<AnswerState>('idle');
  const [score, setScore]                 = useState(0);

  // Stores the answer the user chose for every question index so that
  // pressing Back restores the previously shown result instead of blanking it.
  const [answers, setAnswers] = useState<Record<number, SavedAnswer>>({});

  // Animation for answer feedback
  const feedbackAnim = useRef(new Animated.Value(1)).current;

  const pulseAnimation = () => {
    Animated.sequence([
      Animated.timing(feedbackAnim, { toValue: 1.04, duration: 120, useNativeDriver: true }),
      Animated.timing(feedbackAnim, { toValue: 1,    duration: 120, useNativeDriver: true }),
    ]).start();
  };

  // ─── Generate Questions via Supabase Edge Function ───────────────────────────
  // The Groq API key is a server-side secret — it never reaches the client.
  const generateQuestions = async () => {
    if (!note) return;

    // ── Full state reset before every generation ───────────────────────────
    setCurrentIndex(0);
    setSelectedOption(null);
    setAnswerState('idle');
    setScore(0);
    setQuestions([]);
    setAnswers({});
    setError('');
    setIsGenerating(true);

    try {
      // Call the Supabase Edge Function — GROQ_API_KEY stays on the server
      const { data, error: fnError } = await supabase.functions.invoke('smart-action', {
        body: { noteTitle: note.title, noteContent: note.content },
      });

      if (fnError) throw new Error(fnError.message || 'Edge function call failed.');
      if (!data?.questions) throw new Error('No questions returned from the server.');

      const parsed: Question[] = data.questions;

      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('The AI returned an empty or invalid question list.');
      }

      // Normalize — take up to TOTAL_QUESTIONS
      const normalized = parsed.slice(0, TOTAL_QUESTIONS).map(q => ({
        question: q.question,
        options: q.options,
        answer: q.answer?.trim().toUpperCase().charAt(0),
      }));

      // Fisher-Yates shuffle for random order every run
      for (let i = normalized.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [normalized[i], normalized[j]] = [normalized[j], normalized[i]];
      }

      setQuestions(normalized);
    } catch (e: any) {
      console.error('Quiz generation error:', e);
      setError(e.message || 'Failed to generate questions. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Re-run whenever the note changes OR when retryTs changes (same note, new retry).
  // We use a ref to call the latest version of generateQuestions without making it
  // a dependency itself (avoids the stale-callback trap).
  const generateRef = useRef(generateQuestions);
  useEffect(() => { generateRef.current = generateQuestions; });

  useEffect(() => {
    generateRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId, retryTs]);

  // ─── Navigate to a question, restoring its saved answer ──────────────────────
  const goToQuestion = (index: number) => {
    setCurrentIndex(index);
    const saved = answers[index];
    if (saved) {
      setSelectedOption(saved.selected);
      setAnswerState(saved.state);
    } else {
      setSelectedOption(null);
      setAnswerState('idle');
    }
  };

  // ─── Answer Handling ──────────────────────────────────────────────────────────
  const handleSelectOption = (label: string) => {
    if (answerState !== 'idle' || selectedOption !== null) return;

    const currentQ = questions[currentIndex];
    const isCorrect = label === currentQ.answer;
    const newState: AnswerState = isCorrect ? 'correct' : 'wrong';

    setSelectedOption(label);
    setAnswerState(newState);
    if (isCorrect) setScore(prev => prev + 1);

    // Persist so Back can restore it
    setAnswers(prev => ({ ...prev, [currentIndex]: { selected: label, state: newState } }));

    pulseAnimation();
  };

  const handleNext = () => {
    if (answerState === 'idle') return;

    const nextIndex = currentIndex + 1;
    if (nextIndex >= questions.length) {
      router.replace({
        pathname: '/(main)/quiz/result',
        params: {
          score: score.toString(),
          total: questions.length.toString(),
          noteId: noteId ?? '',
        },
      });
    } else {
      goToQuestion(nextIndex);
    }
  };

  const handleBack = () => {
    if (currentIndex === 0) {
      router.back();
    } else {
      goToQuestion(currentIndex - 1);
    }
  };

  // ─── Style Helpers ────────────────────────────────────────────────────────────
  const getOptionStyle = (label: string) => {
    if (answerState === 'idle') return styles.optionButton;
    const currentQ = questions[currentIndex];
    if (label === currentQ.answer) return [styles.optionButton, styles.optionCorrect];
    if (label === selectedOption)  return [styles.optionButton, styles.optionWrong];
    return [styles.optionButton, styles.optionDimmed];
  };

  const getOptionTextStyle = (label: string) => {
    if (answerState === 'idle') return styles.optionText;
    const currentQ = questions[currentIndex];
    if (label === currentQ.answer) return [styles.optionText, styles.optionTextHighlighted];
    if (label === selectedOption)  return [styles.optionText, styles.optionTextHighlighted];
    return [styles.optionText, styles.optionTextDimmed];
  };

  const progress = questions.length > 0 ? (currentIndex + 1) / questions.length : 0;

  // ─── Render: Loading ──────────────────────────────────────────────────────────
  if (isGenerating) {
    return (
      <LinearGradient colors={['#e0c3fc', '#c89bfb']} style={styles.centered}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#8e44ad" style={{ marginBottom: 16 }} />
          <Text style={styles.loadingTitle}>Generating Quiz…</Text>
          <Text style={styles.loadingSubtitle}>Reading your notes and crafting questions</Text>
        </View>
      </LinearGradient>
    );
  }

  // ─── Render: Error ────────────────────────────────────────────────────────────
  if (error || questions.length === 0) {
    return (
      <LinearGradient colors={['#e0c3fc', '#c89bfb']} style={styles.centered}>
        <View style={styles.errorCard}>
          <FontAwesome5 name="exclamation-circle" size={48} color="#e74c3c" style={{ marginBottom: 16 }} />
          <Text style={styles.errorTitle}>Oops!</Text>
          <Text style={styles.errorText}>{error || 'No questions were generated.'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={generateQuestions}>
            <FontAwesome5 name="redo" size={14} color="#fff" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backTextButton} onPress={() => router.back()}>
            <Text style={styles.backTextButtonText}>← Back to Topics</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  const currentQ = questions[currentIndex];

  // ─── Render: Quiz ─────────────────────────────────────────────────────────────
  return (
    <LinearGradient colors={['#e0c3fc', '#c89bfb']} style={styles.gradient}>
      <View style={styles.container}>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.progressLabel}>
            Question {currentIndex + 1} of {questions.length}
          </Text>
        </View>

        {/* Score badge */}
        <View style={styles.scoreBadge}>
          <FontAwesome5 name="star" size={12} color="#f1c40f" solid />
          <Text style={styles.scoreBadgeText}>{score} pts</Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Question Card */}
          <View style={styles.questionCard}>
            <Text style={styles.questionLabel}>Q{currentIndex + 1}</Text>
            <Text style={styles.questionText}>{currentQ.question}</Text>
          </View>

          {/* Answer Options — 2×2 grid */}
          <View style={styles.optionsGrid}>
            {OPTION_LABELS.map((label, i) => {
              const optionText = currentQ.options[i] ?? `${label}. (missing)`;
              return (
                <TouchableOpacity
                  key={label}
                  style={getOptionStyle(label) as any}
                  onPress={() => handleSelectOption(label)}
                  activeOpacity={answerState === 'idle' ? 0.8 : 1}
                  disabled={answerState !== 'idle'}
                >
                  <Text style={getOptionTextStyle(label) as any}>{optionText}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Feedback message */}
          {answerState !== 'idle' && (
            <View style={[styles.feedbackBanner, answerState === 'correct' ? styles.feedbackCorrect : styles.feedbackWrong]}>
              <FontAwesome5
                name={answerState === 'correct' ? 'check-circle' : 'times-circle'}
                size={16}
                color="#fff"
              />
              <Text style={styles.feedbackText}>
                {answerState === 'correct' ? 'Correct! Well done.' : `Wrong. The answer is ${currentQ.answer}.`}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navButton} onPress={handleBack}>
            <FontAwesome5 name="arrow-left" size={20} color="#8e44ad" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navButton, styles.navCheckButton, answerState === 'idle' && styles.navButtonDisabled]}
            onPress={handleNext}
            disabled={answerState === 'idle'}
          >
            <FontAwesome5 name={currentIndex + 1 >= questions.length ? 'flag-checkered' : 'check'} size={20} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navButton, answerState === 'idle' && styles.navButtonDisabled]}
            onPress={handleNext}
            disabled={answerState === 'idle'}
          >
            <FontAwesome5 name="arrow-right" size={20} color={answerState !== 'idle' ? '#8e44ad' : '#bdc3c7'} />
          </TouchableOpacity>
        </View>

      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  container: { flex: 1 },

  // Loading
  loadingCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#553c7b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  loadingTitle: { fontSize: 20, fontWeight: '800', color: '#553c7b', marginBottom: 8 },
  loadingSubtitle: { fontSize: 14, color: '#9b59b6', textAlign: 'center' },

  // Error
  errorCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#553c7b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  errorTitle: { fontSize: 24, fontWeight: '900', color: '#e74c3c', marginBottom: 12 },
  errorText: { fontSize: 14, color: '#555', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8e44ad',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 50,
    gap: 8,
    marginBottom: 14,
  },
  retryButtonText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  backTextButton: { padding: 8 },
  backTextButtonText: { color: '#9b59b6', fontWeight: '700', fontSize: 14 },

  // Progress
  progressContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  progressTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6a1b9a',
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#553c7b',
    textAlign: 'right',
  },

  // Score badge
  scoreBadge: {
    position: 'absolute',
    top: 16,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 5,
    zIndex: 10,
  },
  scoreBadgeText: { fontSize: 12, fontWeight: '800', color: '#553c7b' },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120, paddingTop: 8 },

  // Question Card
  questionCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#553c7b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  questionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9b59b6',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#34495e',
    lineHeight: 26,
    textAlign: 'center',
  },

  // Options Grid
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  optionButton: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 2,
    borderColor: 'rgba(142, 68, 173, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
    shadowColor: '#553c7b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionCorrect: {
    backgroundColor: '#27ae60',
    borderColor: '#27ae60',
  },
  optionWrong: {
    backgroundColor: '#e74c3c',
    borderColor: '#e74c3c',
  },
  optionDimmed: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderColor: 'rgba(200,200,200,0.3)',
  },
  optionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#34495e',
    textAlign: 'center',
  },
  optionTextHighlighted: { color: '#fff' },
  optionTextDimmed: { color: '#bdc3c7' },

  // Feedback Banner
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    marginBottom: 8,
  },
  feedbackCorrect: { backgroundColor: '#27ae60' },
  feedbackWrong: { backgroundColor: '#e74c3c' },
  feedbackText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },

  // Bottom Nav
  bottomNav: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  navButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
  },
  navCheckButton: {
    backgroundColor: '#8e44ad',
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
});
