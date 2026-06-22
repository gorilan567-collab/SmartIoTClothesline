import React, { useState, useEffect, useContext } from 'react';
import { StyleSheet, View, Text, Switch, TouchableOpacity, ScrollView, Animated, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// import * as Notifications from 'expo-notifications';
import { HistoryContext } from '../context/HistoryContext';

// Helper to get notifications module dynamically to prevent Expo Go SDK 53/54 crash on static import
const getNotificationsModule = () => {
  try {
    return require('expo-notifications');
  } catch (e) {
    return null;
  }
};

export default function HomeScreen() {
  const router = useRouter();
  const historyContext = useContext(HistoryContext);
  // Mock Data States
  const [temperature, setTemperature] = useState(28);
  const [lightIntensity, setLightIntensity] = useState(85);
  const [isClotheslineExtended, setIsClotheslineExtended] = useState(false);
  const [isFanOn, setIsFanOn] = useState(false);
  const [isAutoModeOn, setIsAutoModeOn] = useState(true);
  const [rainValue, setRainValue] = useState(4095);
  const [rainPercent, setRainPercent] = useState(0);
  const [isRaining, setIsRaining] = useState(false);

  // Ganti IP ini sesuai dengan IP yang muncul di ipconfig (IPv4 Address)
  const API_URL = 'https://smartiotclothesline.onrender.com/api';

  // Notification tracking state to avoid spam
  const [hasNotifiedLowTemp, setHasNotifiedLowTemp] = useState(false);
  const [hasNotifiedLowLight, setHasNotifiedLowLight] = useState(false);

  // Animated values for temperature icon
  const tempAnim = React.useRef(new Animated.Value(temperature)).current;

  useEffect(() => {
    Animated.timing(tempAnim, {
      toValue: temperature,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [temperature]);

  const iconPositionY = tempAnim.interpolate({
    inputRange: [20, 31, 45],
    outputRange: [15, 0, -15],
    extrapolate: 'clamp'
  });

  const getIconColor = (temp: number) => {
    if (temp >= 45) return '#ef4444'; // merah
    if (temp >= 30) return '#eab308'; // kuning
    return '#3b82f6'; // biru
  };

  const getLightIconProps = (light: number) => {
    if (light < 50) return { name: 'cloudy' as any, color: '#94a3b8' }; // mendung
    if (light < 75) return { name: 'partly-sunny' as any, color: '#f59e0b' }; // berawan
    return { name: 'sunny' as any, color: '#eab308' }; // cerah
  };

  const getTimeString = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
  };

  const sendNotification = async (title: string, body: string) => {
    const Notifications = getNotificationsModule();
    if (!Notifications) return;

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.log("Error scheduling local notification:", error);
    }
  };

  useEffect(() => {
    const Notifications = getNotificationsModule();
    if (!Notifications) return;

    // Set notification handler on mount
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    const registerForLocalNotificationsAsync = async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        return;
      }
    };

    registerForLocalNotificationsAsync();
  }, []);

  // Fetch real data from API
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(`${API_URL}/status`);
        const data = await response.json();
        
        setTemperature(Math.round(data.suhu));
        
        // Convert LDR value to percentage (assuming 0 = dark, 4095 = bright for ESP32)
        // Or just map it roughly
        let lightPercent = 100 - (data.nilaiLDR / 40.95); 
        setLightIntensity(Math.round(Math.max(0, Math.min(100, lightPercent))));
        
        setIsClotheslineExtended(data.jemuranKeluar);
        setIsFanOn(data.kipasMenyala);
        setIsAutoModeOn(data.autoMode);

        // Update rain states
        setRainValue(data.nilaiHujan);
        setIsRaining(data.hujan);
        const maxVal = data.nilaiHujan > 1024 ? 4095 : 1023;
        const percent = Math.round(Math.max(0, Math.min(100, 100 - (data.nilaiHujan / (maxVal / 100)))));
        setRainPercent(percent);

      } catch (error) {
        console.log("Error fetching API:", error);
      }
    };

    // Fetch every 2 seconds
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  // Effect to handle condition-based notifications
  useEffect(() => {
    if (temperature <= 27 && !hasNotifiedLowTemp) {
      sendNotification("Suhu Rendah", `Suhu saat ini mencapai ${temperature}°C. Pakaian mungkin sulit kering.`);
      setHasNotifiedLowTemp(true);
    } else if (temperature > 27 && hasNotifiedLowTemp) {
      setHasNotifiedLowTemp(false); // Reset when temp goes back up
    }

    if (lightIntensity <= 50 && !hasNotifiedLowLight) {
      sendNotification("Cahaya Redup", `Intensitas cahaya turun ke ${lightIntensity}%. Mendung atau malam hari.`);
      setHasNotifiedLowLight(true);
    } else if (lightIntensity > 50 && hasNotifiedLowLight) {
      setHasNotifiedLowLight(false); // Reset when light goes back up
    }
  }, [temperature, lightIntensity]);

  const updateControl = async (command: any) => {
    try {
      await fetch(`${API_URL}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command)
      });
    } catch (error) {
      console.log("Error sending control:", error);
    }
  };

  const handleRetract = () => {
    if (isClotheslineExtended) {
      setIsClotheslineExtended(false);
      updateControl({ jemuranKeluar: false });
      
      addHistoryEvent('Jemuran Tertutup');
      sendNotification("Jemuran Tertutup", "Katup telah ditutup jemuran tidak dalam proses pengeringan.");

      // Auto turn on blower when retracted
      if (!isFanOn) {
        setIsFanOn(true);
        updateControl({ kipasMenyala: true });
        sendNotification("Blower Menyala Otomatis", "Blower menyala karena jemuran tertutup.");
      }
    }
  };

  const handleExtend = () => {
    if (!isClotheslineExtended) {
      setIsClotheslineExtended(true);
      updateControl({ jemuranKeluar: true });
      
      addHistoryEvent('Jemuran Terbuka');
      sendNotification("Jemuran Terbuka", "Katup telah dibuka jemuran dalam proses pengeringan.");
    }
  };

  const addHistoryEvent = (event: string) => {
    if (historyContext) {
      historyContext.addHistoryEvent(event, temperature, lightIntensity, isFanOn);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#05695cff', '#0a8d88ff', '#ffffff']}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Header */}
        <View style={styles.headerShape}>
          <View style={styles.headerIconContainer}>
            <MaterialCommunityIcons name="tshirt-crew" size={32} color="#05695c" />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>JEMURAN OTOMATIS</Text>
            <Text style={styles.headerSubtitle}>Monitoring dan Kontrol</Text>
          </View>
        </View>

        {/* Monitoring Cards */}
        <View style={styles.monitorRow}>
          {/* Temperature Card */}
          <View style={styles.monitorCard}>
            <LinearGradient colors={['#ffffff', '#f8fafc']} style={styles.cardGradient} />
            <Animated.View style={{ transform: [{ translateY: iconPositionY }] }}>
              <MaterialCommunityIcons
                name="thermometer"
                size={36}
                color={getIconColor(temperature)}
              />
            </Animated.View>
            <Text style={styles.monitorValue}>{temperature}°C</Text>
            <Text style={styles.monitorLabel}>Temperatur</Text>
          </View>

          {/* Light Intensity Card */}
          <View style={styles.monitorCard}>
            <LinearGradient colors={['#ffffff', '#f8fafc']} style={styles.cardGradient} />
            <Ionicons
              name={getLightIconProps(lightIntensity).name}
              size={36}
              color={getLightIconProps(lightIntensity).color}
            />
            <Text style={styles.monitorValue}>{lightIntensity}%</Text>
            <Text style={styles.monitorLabel}>Intensitas Cahaya</Text>
          </View>
        </View>

        {/* Rain Card */}
        <TouchableOpacity
          style={styles.rainCard}
          onPress={() => router.push('/rain' as any)}
          activeOpacity={0.8}
        >
          <LinearGradient colors={['#ffffff', '#f8fafc']} style={styles.cardGradient} />
          <View style={styles.rainCardLeft}>
            <View style={[styles.rainIconCircle, { backgroundColor: isRaining ? '#e0f2fe' : '#fef3c7' }]}>
              <MaterialCommunityIcons 
                name={isRaining ? "weather-rainy" : "weather-sunny"} 
                size={28} 
                color={isRaining ? "#0ea5e9" : "#eab308"} 
              />
            </View>
            <View style={styles.rainTextContainer}>
              <Text style={styles.rainCardTitle}>Status Hujan</Text>
              <Text style={styles.rainCardSubtitle}>
                {isRaining ? 'Sedang Hujan' : 'Tidak Hujan'}
              </Text>
            </View>
          </View>
          <View style={styles.rainCardRight}>
            <Text style={[styles.rainPercentValue, { color: isRaining ? '#0ea5e9' : '#eab308' }]}>
              {rainPercent}%
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
          </View>
        </TouchableOpacity>

        {/* Control Section */}
        <View style={styles.section}>
          <View style={styles.controlRow}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                !isClotheslineExtended && !isAutoModeOn && styles.actionButtonActive,
                isAutoModeOn && styles.disabledButton
              ]}
              onPress={handleRetract}
              disabled={isAutoModeOn}
            >
              <MaterialCommunityIcons name="arrow-left-bold" size={24} color={isAutoModeOn ? "#cbd5e1" : (!isClotheslineExtended ? "#fff" : "#0284c7")} />
              <Text style={[
                styles.actionButtonText,
                !isClotheslineExtended && !isAutoModeOn && styles.actionButtonTextActive,
                isAutoModeOn && styles.disabledText
              ]}>
                JEMURAN MASUK
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                isClotheslineExtended && !isAutoModeOn && styles.actionButtonActive,
                isAutoModeOn && styles.disabledButton
              ]}
              onPress={handleExtend}
              disabled={isAutoModeOn}
            >
              <Text style={[
                styles.actionButtonText,
                isClotheslineExtended && !isAutoModeOn && styles.actionButtonTextActive,
                isAutoModeOn && styles.disabledText
              ]}>
                JEMURAN KELUAR
              </Text>
              <MaterialCommunityIcons name="arrow-right-bold" size={24} color={isAutoModeOn ? "#cbd5e1" : (isClotheslineExtended ? "#fff" : "#0284c7")} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Fan & History Control Row */}
        <View style={styles.section}>
          <View style={styles.sideBySideRow}>
            {/* Fan Toggle */}
            <View style={[styles.toggleCard, { flex: 1 }, isAutoModeOn && styles.disabledButton]}>
              <View style={styles.toggleLeft}>
                <MaterialCommunityIcons
                  name="fan"
                  size={32}
                  color={isAutoModeOn ? "#cbd5e1" : (isFanOn ? "#10b981" : "#94a3b8")}
                />
                <View style={styles.toggleTextContainer}>
                  <Text style={[styles.toggleTitle, isAutoModeOn && styles.disabledText]}>BLOWER</Text>
                  <Text style={[styles.toggleStatus, isAutoModeOn && styles.disabledText]}>
                    {isAutoModeOn ? "Otomatis" : (isFanOn ? "Running" : "Stopped")}
                  </Text>
                </View>
              </View>
              <Switch
                trackColor={{ false: "#cbd5e1", true: "#34d399" }}
                thumbColor={isFanOn ? "#ffffff" : "#f8fafc"}
                ios_backgroundColor="#cbd5e1"
                onValueChange={(val) => {
                  setIsFanOn(val);
                  updateControl({ kipasMenyala: val });
                  if (val) {
                    sendNotification("Blower Menyala", "Blower telah diaktifkan.");
                  } else {
                    sendNotification("Blower Mati", "Blower telah dimatikan.");
                  }
                }}
                value={isFanOn}
                disabled={isAutoModeOn}
              />
            </View>

            {/* Auto Mode Toggle Button */}
            <TouchableOpacity
              style={[styles.historyButton, isAutoModeOn && styles.autoButtonActive]}
              onPress={() => {
                const newMode = !isAutoModeOn;
                setIsAutoModeOn(newMode);
                updateControl({ autoMode: newMode });
              }}
            >
              <MaterialCommunityIcons name="brightness-auto" size={28} color={isAutoModeOn ? "#ffffff" : "#05695c"} />
              <Text style={[styles.historyButtonText, isAutoModeOn && { color: "#ffffff" }]}>Auto</Text>
            </TouchableOpacity>

            {/* History Button */}
            <TouchableOpacity
              style={styles.historyButton}
              onPress={() => router.push('/history')}
            >
              <MaterialCommunityIcons name="history" size={28} color="#05695c" />
              <Text style={styles.historyButtonText}>Riwayat</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Summary Panel */}
        <View style={styles.summaryPanel}>
          <Text style={styles.summaryTitle}>Kondisi Keseluruhan</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Temperatur</Text>
              <Text style={styles.summaryItemValue}>{temperature}°C</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Intensitas Cahaya</Text>
              <Text style={styles.summaryItemValue}>{lightIntensity}%</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Intensitas Hujan</Text>
              <Text style={styles.summaryItemValue}>{rainPercent}%</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Status Hujan</Text>
              <Text style={[styles.summaryItemValue, { color: isRaining ? '#ef4444' : '#10b981' }]}>
                {isRaining ? 'HUJAN' : 'AMAN'}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Posisi Jemuran</Text>
              <Text style={[styles.summaryItemValue, { color: isClotheslineExtended ? '#0ea5e9' : '#f59e0b' }]}>
                {isClotheslineExtended ? 'keluar' : 'masuk'}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Blower</Text>
              <Text style={[styles.summaryItemValue, { color: isFanOn ? '#10b981' : '#64748b' }]}>
                {isFanOn ? 'ON' : 'OFF'}
              </Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  headerShape: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 30, // Provides a pill/rounded shape
    marginTop: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    gap: 16,
  },
  headerIconContainer: {
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'Montserrat_800ExtraBold',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#e0f2fe',
    marginTop: 2,
    fontFamily: 'Montserrat_500Medium',
  },
  monitorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 16,
  },
  monitorCard: {
    flex: 1,
    height: 140,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
  },
  monitorValue: {
    fontSize: 24,
    fontFamily: 'Montserrat_700Bold',
    color: '#0f172a',
    marginTop: 12,
  },
  monitorLabel: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    fontFamily: 'Montserrat_600SemiBold',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Montserrat_700Bold',
    color: '#1e293b',
    marginBottom: 16,
    marginLeft: 4,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e0f2fe',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
    gap: 8,
  },
  actionButtonActive: {
    backgroundColor: '#0ea5e9',
    borderColor: '#0ea5e9',
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.25,
  },
  actionButtonText: {
    fontSize: 15,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#0284c7',
  },
  actionButtonTextActive: {
    color: '#ffffff',
  },
  sideBySideRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    gap: 8,
  },
  historyButton: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  historyButtonText: {
    fontSize: 12,
    fontFamily: 'Montserrat_700Bold',
    color: '#05695c',
    marginTop: 4,
  },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  toggleTextContainer: {
    justifyContent: 'center',
  },
  toggleTitle: {
    fontSize: 16,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#0f172a',
  },
  toggleStatus: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
    fontFamily: 'Montserrat_500Medium',
  },
  summaryPanel: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
    marginTop: 8,
  },
  summaryTitle: {
    fontSize: 18,
    fontFamily: 'Montserrat_700Bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  summaryItem: {
    width: '46%',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 16,
  },
  summaryItemLabel: {
    fontSize: 13,
    color: '#64748b',
    fontFamily: 'Montserrat_600SemiBold',
    marginBottom: 6,
  },
  summaryItemValue: {
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
    color: '#0f172a',
  },
  disabledButton: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
    opacity: 0.6,
  },
  disabledText: {
    color: '#94a3b8',
  },
  autoButtonActive: {
    backgroundColor: '#05695c',
  },
  rainCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 18,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
  },
  rainCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  rainIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rainTextContainer: {
    justifyContent: 'center',
  },
  rainCardTitle: {
    fontSize: 15,
    fontFamily: 'Montserrat_700Bold',
    color: '#0f172a',
  },
  rainCardSubtitle: {
    fontSize: 13,
    color: '#64748b',
    fontFamily: 'Montserrat_500Medium',
    marginTop: 2,
  },
  rainCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rainPercentValue: {
    fontSize: 22,
    fontFamily: 'Montserrat_800ExtraBold',
  }
});
