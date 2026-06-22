import React, { useEffect, useRef, useContext } from 'react';
import { Animated, StyleSheet, Text, View, Platform, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NotificationContext } from '../context/NotificationContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ToastNotification() {
  const context = useContext(NotificationContext);
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-150)).current;

  if (!context) return null;

  const { notification, hideNotification } = context;

  useEffect(() => {
    if (notification.visible) {
      Animated.spring(slideAnim, {
        toValue: insets.top > 0 ? insets.top + 10 : 40,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -150,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [notification.visible, slideAnim, insets.top]);

  if (!notification.visible && (slideAnim as any)._value === -150) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={hideNotification}
        style={styles.toastContent}
      >
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="bell-ring" size={24} color="#ffffff" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{notification.title}</Text>
          <Text style={styles.message} numberOfLines={2}>
            {notification.message}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    zIndex: 9999,
    elevation: 10,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(5, 105, 92, 0.95)',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  iconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 10,
    borderRadius: 12,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 4,
  },
  message: {
    color: '#e0f2fe',
    fontSize: 13,
    fontFamily: 'Montserrat_500Medium',
  },
});
