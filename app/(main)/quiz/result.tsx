import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function QuizResultScreen() {
  const { score, total, noteId } = useLocalSearchParams<{
    score: string;
    total: string;
    noteId: string;
  }>();
  const router = useRouter();

  const numScore = parseInt(score ?? '0', 10);
  const numTotal = parseInt(total ?? '10', 10);
  const passed = numScore >= Math.ceil(numTotal * 0.6); // 60% to pass

  // ─── Entry Animations ─────────────────────────────────────────────────────
  const cardAnim = useRef(new Animated.Value(0)).current;
  const scoreAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(cardAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 60,
        friction: 8,
      }),
      Animated.spring(scoreAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 7,
      }),
    ]).start();
  }, []);

  const cardStyle = {
    opacity: cardAnim,
    transform: [
      {
        translateY: cardAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [60, 0],
        }),
      },
    ],
  };

  const scoreStyle = {
    transform: [
      {
        scale: scoreAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.5, 1],
        }),
      },
    ],
    opacity: scoreAnim,
  };

  const handleRetry = () => {
    if (!noteId) {
      router.replace('/(main)/quiz');
      return;
    }
    // Pass a fresh timestamp so questions.tsx's useEffect re-fires
    // even when the noteId hasn't changed.
    router.replace({
      pathname: '/(main)/quiz/questions',
      params: { noteId, retryTs: Date.now().toString() },
    });
  };

  const handleHome = () => {
    router.replace('/(main)');
  };

  const handleSelectTopic = () => {
    router.replace('/(main)/quiz');
  };

  return (
    <LinearGradient
      colors={passed ? ['#e0c3fc', '#c89bfb'] : ['#fce4d6', '#c89bfb']}
      style={styles.gradient}
    >
      <View style={styles.container}>
        <Animated.View style={[styles.card, cardStyle]}>

          {/* Header */}
          <View style={styles.iconRow}>
            <FontAwesome5
              name={passed ? 'trophy' : 'heart-broken'}
              size={48}
              color={passed ? '#f1c40f' : '#e74c3c'}
              solid
            />
          </View>

          <Text style={[styles.resultHeadline, passed ? styles.passHeadline : styles.failHeadline]}>
            {passed ? 'Congratulations!' : 'Better luck next time!'}
          </Text>

          {/* Score Display */}
          <Animated.View style={[styles.scoreContainer, scoreStyle]}>
            <Text style={styles.scoreLabel}>Your Score :</Text>
            <Text style={[styles.scoreValue, passed ? styles.passScore : styles.failScore]}>
              {numScore}/{numTotal}
            </Text>
            <View style={[styles.badge, passed ? styles.passBadge : styles.failBadge]}>
              <Text style={styles.badgeText}>{passed ? 'Passed!' : 'Failed!'}</Text>
            </View>
          </Animated.View>

          {/* Progress ring visual (simple bar) */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${(numScore / numTotal) * 100}%`,
                  backgroundColor: passed ? '#27ae60' : '#e74c3c',
                },
              ]}
            />
          </View>
          <Text style={styles.progressHint}>
            {numScore} out of {numTotal} correct · {Math.round((numScore / numTotal) * 100)}%
          </Text>

          {/* Divider */}
          <View style={styles.divider} />

          {/* CTA */}
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <FontAwesome5 name="redo" size={14} color="#8e44ad" />
            <Text style={styles.retryText}>Take Quiz Again?</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.topicButton} onPress={handleSelectTopic}>
            <FontAwesome5 name="list-ul" size={14} color="#8e44ad" />
            <Text style={styles.topicText}>Choose Different Topic</Text>
          </TouchableOpacity>

        </Animated.View>

        {/* Bottom Nav */}
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navButton} onPress={handleHome}>
            <FontAwesome5 name="home" size={22} color="#8e44ad" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navButton} onPress={handleRetry}>
            <FontAwesome5 name="redo" size={20} color="#8e44ad" />
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#553c7b',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  iconRow: {
    marginBottom: 12,
  },
  resultHeadline: {
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 24,
  },
  passHeadline: { color: '#6a1b9a' },
  failHeadline: { color: '#c0392b' },

  scoreContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#7f8c8d',
    marginBottom: 6,
  },
  scoreValue: {
    fontSize: 56,
    fontWeight: '900',
    lineHeight: 64,
  },
  passScore: { color: '#6a1b9a' },
  failScore: { color: '#c0392b' },

  badge: {
    marginTop: 6,
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 20,
  },
  passBadge: { backgroundColor: '#e8f5e9' },
  failBadge: { backgroundColor: '#fce4e4' },
  badgeText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#553c7b',
  },

  progressTrack: {
    width: '100%',
    height: 10,
    backgroundColor: '#ecf0f1',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressHint: {
    fontSize: 13,
    color: '#95a5a6',
    fontWeight: '600',
    marginBottom: 20,
  },

  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#ecf0f1',
    marginBottom: 20,
  },

  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#8e44ad',
    marginBottom: 12,
    width: '100%',
    justifyContent: 'center',
  },
  retryText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#8e44ad',
  },
  topicButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: 'rgba(142, 68, 173, 0.3)',
    width: '100%',
    justifyContent: 'center',
  },
  topicText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8e44ad',
  },

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
});
