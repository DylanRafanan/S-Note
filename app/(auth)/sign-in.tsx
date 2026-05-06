import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

export default function SignInScreen() {
  const [isSignIn, setIsSignIn] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errors, setErrors] = useState<{ email?: string, password?: string, confirmPassword?: string }>({});

  const validate = () => {
    let newErrors: { email?: string, password?: string, confirmPassword?: string } = {};
    let isValid = true;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      newErrors.email = 'Invalid email format';
      isValid = false;
    }

    if (!isSignIn) {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
      if (!passwordRegex.test(password)) {
        newErrors.password = 'Must be at least 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 symbol';
        isValid = false;
      }

      if (password !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleAuth = async () => {
    if (loading) return;
    
    setErrorMessage('');
    if (!validate()) return;

    setLoading(true);
    setErrors({});
    
    try {
      if (isSignIn) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setErrors({ email: ' ', password: ' ' }); // Red border only for inputs
            setErrorMessage('Invalid credentials. Please try again.');
            setPassword(''); // clear password
          } else {
            setErrorMessage(error.message);
          }
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: { username: username.trim() },
          },
        });
        if (error) {
          setErrorMessage(error.message);
        }
        else {
          await supabase.auth.signOut();
          const msg = 'Account created successfully! Please sign in.';
          Alert.alert('Success', msg);
          setIsSignIn(true);
          setEmail('');
          setPassword('');
          setConfirmPassword('');
          setUsername('');
          setErrors({});
        }
      }
    } catch (e: any) {
      setErrorMessage(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#e0c3fc', '#8ec5fc']}
        style={styles.gradient}
      >
        <View style={styles.responsiveWrapper}>
          <View style={styles.content}>
            
            <View style={styles.logoContainer}>
              <View style={styles.logoIconBg}>
                <FontAwesome5 name="snowflake" size={50} color="#fff" />
              </View>
              <View style={styles.titleContainer}>
                <Text style={styles.titleTextSNO}>S-NO</Text>
                <Text style={styles.titleTextTE}>TE</Text>
              </View>
            </View>

            <Text style={styles.formTitle}>{isSignIn ? 'Sign-in' : 'Sign-up'}</Text>

            {!isSignIn && (
              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor="#888"
                value={username}
                onChangeText={setUsername}
              />
            )}

            <TextInput
              style={[styles.input, errors.email ? styles.inputError : null]}
              placeholder="Email"
              placeholderTextColor="#888"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={(text) => { setEmail(text); setErrors(prev => ({...prev, email: undefined})); }}
            />
            {errors.email && errors.email.trim() !== '' ? <Text style={styles.fieldErrorText}>{errors.email}</Text> : null}

            <TextInput
              style={[styles.input, errors.password ? styles.inputError : null]}
              placeholder="Password"
              placeholderTextColor="#888"
              secureTextEntry
              value={password}
              onChangeText={(text) => { setPassword(text); setErrors(prev => ({...prev, password: undefined})); }}
            />
            {errors.password && errors.password.trim() !== '' ? <Text style={styles.fieldErrorText}>{errors.password}</Text> : null}

            {!isSignIn && (
              <>
                <TextInput
                  style={[styles.input, errors.confirmPassword ? styles.inputError : null]}
                  placeholder="Confirm Password"
                  placeholderTextColor="#888"
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={(text) => { setConfirmPassword(text); setErrors(prev => ({...prev, confirmPassword: undefined})); }}
                />
                {errors.confirmPassword && errors.confirmPassword.trim() !== '' ? <Text style={styles.fieldErrorText}>{errors.confirmPassword}</Text> : null}
              </>
            )}

            <TouchableOpacity 
              onPress={() => {
                setIsSignIn(!isSignIn);
                setErrors({});
                setErrorMessage('');
                // Optionally clear inputs when toggling
                // setEmail('');
                // setPassword('');
                // setConfirmPassword('');
                // setUsername('');
              }} 
              style={styles.toggleTextContainer}
            >
              <Text style={styles.toggleText}>
                {isSignIn ? "Doesn't have account? " : "Already have account? "}
              </Text>
              <Text style={styles.toggleTextLink}>click here</Text>
            </TouchableOpacity>

            {errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}

          </View>

          <TouchableOpacity style={styles.submitButton} onPress={handleAuth} disabled={loading}>
            <LinearGradient
              colors={['#fff', '#f0f0f0']}
              style={styles.submitButtonInner}
            >
              {loading ? (
                <ActivityIndicator color="#4fb6ff" />
              ) : (
                <FontAwesome5 name="arrow-right" size={24} color="#4fb6ff" />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  responsiveWrapper: {
    flex: 1,
    width: '100%',
    maxWidth: 450,
    alignSelf: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    position: 'relative',
  },
  content: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoIconBg: {
    width: 100,
    height: 100,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  titleContainer: {
    flexDirection: 'row',
  },
  titleTextSNO: {
    fontSize: 40,
    fontWeight: '900',
    color: '#8e44ad',
  },
  titleTextTE: {
    fontSize: 40,
    fontWeight: '900',
    color: '#3498db',
  },
  formTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#553c7b',
    marginBottom: 30,
    alignSelf: 'center',
  },
  input: {
    width: '100%',
    height: 55,
    backgroundColor: '#fff0eb',
    borderRadius: 20,
    paddingHorizontal: 20,
    fontSize: 16,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: '#e74c3c',
    borderWidth: 1,
  },
  fieldErrorText: {
    color: '#e74c3c',
    alignSelf: 'flex-start',
    marginLeft: 10,
    marginTop: -10,
    marginBottom: 15,
    fontSize: 12,
    fontWeight: 'bold',
  },
  toggleTextContainer: {
    flexDirection: 'row',
    marginTop: 10,
  },
  toggleText: {
    color: '#553c7b',
    fontWeight: 'bold',
  },
  toggleTextLink: {
    color: '#fff',
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  errorText: {
    color: '#e74c3c',
    marginTop: 15,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  submitButton: {
    position: 'absolute',
    bottom: 50,
    right: 30,
    width: 70,
    height: 70,
    borderRadius: 35,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  submitButtonInner: {
    flex: 1,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
