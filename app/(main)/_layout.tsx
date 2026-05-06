import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { Drawer } from 'expo-router/drawer';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Href } from 'expo-router';

function CustomDrawerContent(props: any) {
  const router = useRouter();
  const { signOut, user } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const menuItems = [
    { label: 'Notes', route: '/(main)' },
    { label: 'Archives', route: '/(main)/archives' },
    { label: 'Quiz', route: '/(main)/quiz' },
    { label: 'Trash', route: '/(main)/trash' },
    { label: 'Settings', route: '/(main)/settings' },
  ];

  return (
    <LinearGradient
      colors={['#c89bfb', '#9b5de5']}
      style={styles.drawerGradient}
    >
      <SafeAreaView style={styles.drawerContainer}>
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.menuPill}
              onPress={() => {
                setShowProfileMenu(false);
                router.push(item.route as Href);
              }}
            >
              <Text style={styles.menuText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.bottomProfileContainer}>
          {showProfileMenu && (
            <View style={styles.profileMenu}>
              <TouchableOpacity style={styles.profileMenuItem} onPress={() => {
                setShowProfileMenu(false);
              }}>
                <FontAwesome5 name="user-edit" size={16} color="#553c7b" />
                <Text style={styles.profileMenuText}>Edit Profile</Text>
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.profileMenuItem} onPress={signOut}>
                <FontAwesome5 name="sign-out-alt" size={16} color="#e74c3c" />
                <Text style={[styles.profileMenuText, { color: '#e74c3c' }]}>Logout</Text>
              </TouchableOpacity>
            </View>
          )}
          
          <TouchableOpacity 
            style={styles.profileIconContainer} 
            onPress={() => setShowProfileMenu(!showProfileMenu)}
          >
            <FontAwesome5 name="user" size={24} color={user ? "#3498db" : "#bdc3c7"} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

export default function MainLayout() {
  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: '#e0c3fc', elevation: 0, shadowOpacity: 0 },
        headerTintColor: '#553c7b',
        headerTitleAlign: 'center',
        headerTitleStyle: { fontWeight: '900', fontSize: 24, color: '#8e44ad' },
        drawerStyle: {
          width: '75%',
          backgroundColor: 'transparent',
        },
      }}
    >
      <Drawer.Screen name="index" options={{ title: 'S-NOTE' }} />
      <Drawer.Screen name="archives" options={{ title: 'S-NOTE' }} />
      <Drawer.Screen name="quiz/index" options={{ title: 'S-NOTE' }} />
      <Drawer.Screen name="trash" options={{ title: 'S-NOTE' }} />
      <Drawer.Screen name="settings" options={{ title: 'S-NOTE' }} />
      <Drawer.Screen name="note/[id]" options={{ drawerItemStyle: { display: 'none' }, title: 'S-NOTE' }} />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  drawerGradient: { flex: 1 },
  drawerContainer: {
    flex: 1,
    paddingTop: 100,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  menuContainer: { flex: 1, marginTop: 50 },
  menuPill: {
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 10,
    marginBottom: 15,
    alignItems: 'flex-start',
  },
  menuText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  bottomProfileContainer: {
    paddingBottom: 40,
    paddingLeft: 10,
    position: 'relative',
  },
  profileMenu: {
    position: 'absolute',
    bottom: 100,
    left: 10,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 10,
    width: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  profileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  profileMenuText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#553c7b',
  },
  divider: {
    height: 1,
    backgroundColor: '#ecf0f1',
    marginVertical: 5,
  },
  profileIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
});
