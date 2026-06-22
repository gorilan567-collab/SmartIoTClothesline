import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Animated, Dimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const API_URL = 'http://192.168.1.24:3000/api';
const SCREEN_WIDTH = Dimensions.get('window').width;

type RainData = {
  timestamp: string;
  value: number;
  percent: number;
  hujan: boolean;
};

export default function RainScreen() {
  const router = useRouter();
  const [currentRainValue, setCurrentRainValue] = useState(4095);
  const [currentRainPercent, setCurrentRainPercent] = useState(0);
  const [isRaining, setIsRaining] = useState(false);
  const [isClotheslineExtended, setIsClotheslineExtended] = useState(true);
  const [rainHistory, setRainHistory] = useState<RainData[]>([]);
  const [selectedBarIndex, setSelectedBarIndex] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(true);

  // Animated values for visual effects
  const dropletAnim = React.useRef(new Animated.Value(0)).current;

  // Rain falling animation loop
  useEffect(() => {
    if (isRaining) {
      dropletAnim.setValue(0);
      Animated.loop(
        Animated.timing(dropletAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      dropletAnim.setValue(0);
    }
  }, [isRaining]);

  // Fetch status from API
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(`${API_URL}/status`);
        const data = await response.json();
        
        setCurrentRainValue(data.nilaiHujan);
        setIsRaining(data.hujan);
        setIsClotheslineExtended(data.jemuranKeluar);
        setIsConnected(true);

        // Hitung persentase intensitas hujan
        const maxVal = data.nilaiHujan > 1024 ? 4095 : 1023;
        const percent = Math.round(Math.max(0, Math.min(100, 100 - (data.nilaiHujan / (maxVal / 100)))));
        setCurrentRainPercent(percent);

        if (data.rainHistory && Array.isArray(data.rainHistory)) {
          setRainHistory(data.rainHistory);
          // Set selection to latest if not selected anything yet
          if (selectedBarIndex === null || selectedBarIndex >= data.rainHistory.length) {
            setSelectedBarIndex(data.rainHistory.length - 1);
          }
        }
      } catch (error) {
        console.log("Error fetching rain API:", error);
        setIsConnected(false);
      }
    };

    // Polling every 2 seconds
    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, [selectedBarIndex]);

  // Translate rain status to Indonesian with appropriate colors
  const getRainStatusInfo = (percent: number) => {
    if (percent <= 15) {
      return { 
        text: 'Cerah / Kering', 
        desc: 'Tidak terdeteksi adanya air hujan di sensor.',
        color: '#eab308', // Amber
        bg: '#fef3c7',
        icon: 'sunny' as any,
        iconType: 'Ionicons'
      };
    }
    if (percent <= 40) {
      return { 
        text: 'Mendung / Gerimis', 
        desc: 'Gerimis ringan atau sensor mulai mendeteksi air.',
        color: '#0ea5e9', // Light Blue
        bg: '#e0f2fe',
        icon: 'weather-rainy' as any,
        iconType: 'MaterialCommunityIcons'
      };
    }
    if (percent <= 75) {
      return { 
        text: 'Hujan Sedang', 
        desc: 'Hujan terdeteksi stabil, jemuran harus aman di dalam.',
        color: '#2563eb', // Blue
        bg: '#dbeafe',
        icon: 'weather-pouring' as any,
        iconType: 'MaterialCommunityIcons'
      };
    }
    return { 
      text: 'Hujan Deras', 
      desc: 'Intensitas air sangat tinggi! Blower otomatis diaktifkan.',
      color: '#4f46e5', // Indigo
      bg: '#e0e7ff',
      icon: 'weather-lightning-rainy' as any,
      iconType: 'MaterialCommunityIcons'
    };
  };

  const rainStatus = getRainStatusInfo(currentRainPercent);

  // Rain droplets translateY animation interpolations
  const drop1 = dropletAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 30] });
  const drop2 = dropletAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 25] });
  const drop3 = dropletAnim.interpolate({ inputRange: [0, 1], outputRange: [-5, 28] });

  // Calculate statistics from history
  const getStats = () => {
    if (rainHistory.length === 0) return { max: 0, min: 0, avg: 0 };
    const percents = rainHistory.map(d => d.percent);
    const max = Math.max(...percents);
    const min = Math.min(...percents);
    const avg = Math.round(percents.reduce((a, b) => a + b, 0) / percents.length);
    return { max, min, avg };
  };

  const stats = getStats();
  const selectedData = selectedBarIndex !== null && rainHistory[selectedBarIndex] ? rainHistory[selectedBarIndex] : null;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#05695cff', '#0a8d88ff', '#ffffff']}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Connection status warning */}
        {!isConnected && (
          <View style={styles.warningBanner}>
            <Ionicons name="warning" size={16} color="#ef4444" />
            <Text style={styles.warningText}>Koneksi server backend terputus</Text>
          </View>
        )}

        {/* Header */}
        <View style={styles.headerShape}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerIconContainer}>
            <Ionicons name="arrow-back" size={24} color="#05695c" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>MONITOR HUJAN</Text>
            <Text style={styles.headerSubtitle}>Grafik & Sensor Real-Time</Text>
          </View>
        </View>

        {/* Main Digital Display Card */}
        <View style={styles.dashboardCard}>
          <LinearGradient colors={['#ffffff', '#f8fafc']} style={styles.cardGradient} />
          
          <View style={styles.dashboardHeader}>
            <Text style={styles.sectionSubtitle}>Pengukuran Digital</Text>
            <View style={[styles.statusBadge, { backgroundColor: rainStatus.bg }]}>
              <Text style={[styles.statusBadgeText, { color: rainStatus.color }]}>
                {rainStatus.text}
              </Text>
            </View>
          </View>

          <View style={styles.mainMeasurementRow}>
            {/* Left: Huge Percentage */}
            <View style={styles.percentContainer}>
              <Text style={[styles.percentNumber, { color: rainStatus.color }]}>
                {currentRainPercent}
                <Text style={styles.percentSymbol}>%</Text>
              </Text>
              <Text style={styles.percentLabel}>Tingkat Kebasahan</Text>
            </View>

            {/* Middle: Divider */}
            <View style={styles.verticalDivider} />

            {/* Right: Icon Animation or Info */}
            <View style={styles.iconAnimationContainer}>
              {isRaining ? (
                <View style={styles.animationFrame}>
                  <MaterialCommunityIcons name="cloud" size={54} color="#64748b" />
                  <View style={styles.dropletsRow}>
                    <Animated.View style={[styles.droplet, { transform: [{ translateY: drop1 }] }]}>
                      <Ionicons name="water" size={14} color="#3b82f6" />
                    </Animated.View>
                    <Animated.View style={[styles.droplet, { transform: [{ translateY: drop2 }], marginHorizontal: 8 }]}>
                      <Ionicons name="water" size={14} color="#3b82f6" />
                    </Animated.View>
                    <Animated.View style={[styles.droplet, { transform: [{ translateY: drop3 }] }]}>
                      <Ionicons name="water" size={14} color="#3b82f6" />
                    </Animated.View>
                  </View>
                </View>
              ) : (
                <View style={styles.animationFrame}>
                  {rainStatus.iconType === 'Ionicons' ? (
                    <Ionicons name={rainStatus.icon} size={54} color={rainStatus.color} />
                  ) : (
                    <MaterialCommunityIcons name={rainStatus.icon} size={54} color={rainStatus.color} />
                  )}
                  <Text style={styles.animationLabel}>Kondisi Stabil</Text>
                </View>
              )}
            </View>
          </View>

          {/* Bottom stats within the card */}
          <View style={styles.digitalReadoutBox}>
            <View style={styles.digitalItem}>
              <Text style={styles.digitalItemLabel}>Nilai ADC Sensor</Text>
              <Text style={styles.digitalItemValue}>{currentRainValue}</Text>
            </View>
            <View style={styles.digitalItem}>
              <Text style={styles.digitalItemLabel}>Status Jemuran</Text>
              <View style={styles.clotheslineStatusRow}>
                <Ionicons 
                  name={isClotheslineExtended ? "sunny-outline" : "home-outline"} 
                  size={16} 
                  color={isClotheslineExtended ? "#eab308" : "#2563eb"} 
                />
                <Text style={[styles.digitalItemValue, { color: isClotheslineExtended ? "#eab308" : "#2563eb", marginLeft: 4 }]}>
                  {isClotheslineExtended ? "KELUAR" : "MASUK"}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.statusDescription}>{rainStatus.desc}</Text>
        </View>

        {/* Graph Card */}
        <View style={styles.graphCard}>
          <Text style={styles.graphCardTitle}>Grafik Riwayat Sensor Hujan</Text>
          <Text style={styles.graphCardSubtitle}>Menampilkan 20 data pengukuran terakhir</Text>

          {rainHistory.length === 0 ? (
            <View style={styles.emptyGraphContainer}>
              <MaterialCommunityIcons name="chart-bell-curve-cumulative" size={48} color="#cbd5e1" />
              <Text style={styles.emptyGraphText}>Menunggu data masuk dari sensor...</Text>
            </View>
          ) : (
            <View>
              {/* Tooltip detail of selected bar */}
              <View style={styles.tooltipContainer}>
                {selectedData ? (
                  <View style={styles.tooltipContent}>
                    <Text style={styles.tooltipTime}>Jam {selectedData.timestamp}</Text>
                    <Text style={styles.tooltipValue}>
                      Intensitas: <Text style={styles.boldText}>{selectedData.percent}%</Text> (ADC: {selectedData.value})
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.tooltipPlaceholder}>Ketuk batang grafik untuk detail</Text>
                )}
              </View>

              {/* Chart Plot Area */}
              <View style={styles.chartContainer}>
                {/* Y-Axis Labels */}
                <View style={styles.yAxis}>
                  <Text style={styles.axisLabel}>100%</Text>
                  <Text style={styles.axisLabel}>75%</Text>
                  <Text style={styles.axisLabel}>50%</Text>
                  <Text style={styles.axisLabel}>25%</Text>
                  <Text style={styles.axisLabel}>0%</Text>
                </View>

                {/* Bars Area */}
                <View style={styles.plotArea}>
                  {/* Grid Lines */}
                  <View style={styles.gridLinesContainer}>
                    <View style={styles.gridLine} />
                    <View style={styles.gridLine} />
                    <View style={styles.gridLine} />
                    <View style={styles.gridLine} />
                    <View style={[styles.gridLine, { borderBottomWidth: 1.5, borderBottomColor: '#94a3b8' }]} />
                  </View>

                  {/* Render Bars */}
                  <View style={styles.barsContainer}>
                    {rainHistory.map((item, index) => {
                      const isSelected = selectedBarIndex === index;
                      // Calculate height relative to 100% (max height 140px)
                      const barHeight = Math.max(4, Math.round((item.percent / 100) * 140));

                      return (
                        <TouchableOpacity
                          key={index}
                          style={styles.barTouchArea}
                          onPress={() => setSelectedBarIndex(index)}
                          activeOpacity={0.8}
                        >
                          <View style={styles.barBackground}>
                            <View 
                              style={[
                                styles.barForeground, 
                                { 
                                  height: barHeight,
                                  backgroundColor: isSelected ? '#4f46e5' : '#0ea5e9',
                                  opacity: isSelected ? 1.0 : 0.65,
                                  borderTopLeftRadius: 6,
                                  borderTopRightRadius: 6,
                                }
                              ]}
                            >
                              <LinearGradient
                                colors={isSelected ? ['#4f46e5', '#818cf8'] : ['#0ea5e9', '#38bdf8']}
                                style={StyleSheet.absoluteFillObject}
                              />
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>

              {/* X-Axis labels (displays start time, middle time, and end time) */}
              <View style={styles.xAxis}>
                <Text style={styles.xAxisLabel}>{rainHistory[0]?.timestamp.substring(0, 5)}</Text>
                <Text style={styles.xAxisLabel}>
                  {rainHistory[Math.floor(rainHistory.length / 2)]?.timestamp.substring(0, 5)}
                </Text>
                <Text style={styles.xAxisLabel}>{rainHistory[rainHistory.length - 1]?.timestamp.substring(0, 5)}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Summary Statistics Card */}
        <View style={styles.summaryGridCard}>
          <Text style={styles.summaryCardTitle}>Statistik Sensor Hari Ini</Text>
          <View style={styles.statsRow}>
            {/* Avg Stat */}
            <View style={styles.statCard}>
              <View style={[styles.statIconCircle, { backgroundColor: '#e0f2fe' }]}>
                <Ionicons name="stats-chart" size={20} color="#0284c7" />
              </View>
              <Text style={styles.statLabel}>Rata-rata</Text>
              <Text style={styles.statValue}>{stats.avg}%</Text>
            </View>

            {/* Max Stat */}
            <View style={styles.statCard}>
              <View style={[styles.statIconCircle, { backgroundColor: '#e0e7ff' }]}>
                <Ionicons name="trending-up" size={20} color="#4f46e5" />
              </View>
              <Text style={styles.statLabel}>Tertinggi</Text>
              <Text style={styles.statValue}>{stats.max}%</Text>
            </View>

            {/* Min Stat */}
            <View style={styles.statCard}>
              <View style={[styles.statIconCircle, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="trending-down" size={20} color="#eab308" />
              </View>
              <Text style={styles.statLabel}>Terendah</Text>
              <Text style={styles.statValue}>{stats.min}%</Text>
            </View>
          </View>
        </View>

        {/* Protection system notice card */}
        <View style={styles.protectionCard}>
          <MaterialCommunityIcons name="shield-check" size={28} color="#05695c" />
          <View style={styles.protectionTextContainer}>
            <Text style={styles.protectionTitle}>Sistem Proteksi Aktif</Text>
            <Text style={styles.protectionDesc}>
              Ketika tingkat kebasahan melewati batas 15%, mode Auto akan segera menarik jemuran masuk ke area pengeringan.
            </Text>
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
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
    padding: 10,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
    gap: 8,
  },
  warningText: {
    color: '#ef4444',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
  },
  headerShape: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 30,
    marginTop: 10,
    marginBottom: 20,
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
  dashboardCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
    marginBottom: 20,
    overflow: 'hidden',
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
  },
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Montserrat_600SemiBold',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 13,
    fontFamily: 'Montserrat_700Bold',
  },
  mainMeasurementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  percentContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  percentNumber: {
    fontSize: 54,
    fontFamily: 'Montserrat_800ExtraBold',
    lineHeight: 56,
  },
  percentSymbol: {
    fontSize: 28,
    fontFamily: 'Montserrat_700Bold',
  },
  percentLabel: {
    fontSize: 13,
    color: '#64748b',
    fontFamily: 'Montserrat_600SemiBold',
    marginTop: 4,
  },
  verticalDivider: {
    width: 1.5,
    height: '80%',
    backgroundColor: '#f1f5f9',
    marginHorizontal: 16,
  },
  iconAnimationContainer: {
    width: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  animationFrame: {
    alignItems: 'center',
  },
  dropletsRow: {
    flexDirection: 'row',
    position: 'absolute',
    top: 50,
  },
  droplet: {
    opacity: 0.8,
  },
  animationLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontFamily: 'Montserrat_600SemiBold',
    marginTop: 6,
  },
  digitalReadoutBox: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 14,
    marginVertical: 16,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  digitalItem: {
    flex: 1,
  },
  digitalItemLabel: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Montserrat_600SemiBold',
    marginBottom: 4,
  },
  digitalItemValue: {
    fontSize: 15,
    fontFamily: 'Montserrat_700Bold',
    color: '#0f172a',
  },
  clotheslineStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDescription: {
    fontSize: 13,
    color: '#64748b',
    fontFamily: 'Montserrat_500Medium',
    lineHeight: 18,
  },
  graphCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
    marginBottom: 20,
  },
  graphCardTitle: {
    fontSize: 17,
    fontFamily: 'Montserrat_700Bold',
    color: '#1e293b',
  },
  graphCardSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    fontFamily: 'Montserrat_500Medium',
    marginTop: 4,
    marginBottom: 16,
  },
  emptyGraphContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyGraphText: {
    fontSize: 14,
    color: '#94a3b8',
    fontFamily: 'Montserrat_500Medium',
    textAlign: 'center',
  },
  tooltipContainer: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tooltipContent: {
    alignItems: 'center',
  },
  tooltipTime: {
    fontSize: 12,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#64748b',
  },
  tooltipValue: {
    fontSize: 13,
    fontFamily: 'Montserrat_500Medium',
    color: '#334155',
    marginTop: 2,
  },
  boldText: {
    fontFamily: 'Montserrat_700Bold',
    color: '#4f46e5',
  },
  tooltipPlaceholder: {
    fontSize: 13,
    color: '#94a3b8',
    fontFamily: 'Montserrat_500Medium',
    fontStyle: 'italic',
  },
  chartContainer: {
    flexDirection: 'row',
    height: 170,
    marginTop: 10,
  },
  yAxis: {
    width: 35,
    height: 140,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 6,
  },
  axisLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontFamily: 'Montserrat_600SemiBold',
  },
  plotArea: {
    flex: 1,
    height: 140,
  },
  gridLinesContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  gridLine: {
    height: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    borderStyle: 'dashed',
  },
  barsContainer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    zIndex: 10,
  },
  barTouchArea: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  barBackground: {
    width: '70%',
    maxWidth: 14,
    height: '100%',
    justifyContent: 'flex-end',
    borderRadius: 6,
  },
  barForeground: {
    width: '100%',
    overflow: 'hidden',
  },
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 35,
    paddingRight: 10,
    marginTop: 8,
  },
  xAxisLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontFamily: 'Montserrat_600SemiBold',
  },
  summaryGridCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
    marginBottom: 20,
  },
  summaryCardTitle: {
    fontSize: 17,
    fontFamily: 'Montserrat_700Bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Montserrat_600SemiBold',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'Montserrat_800ExtraBold',
    color: '#0f172a',
  },
  protectionCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    gap: 14,
  },
  protectionTextContainer: {
    flex: 1,
  },
  protectionTitle: {
    fontSize: 15,
    fontFamily: 'Montserrat_700Bold',
    color: '#05695c',
  },
  protectionDesc: {
    fontSize: 13,
    color: '#ffffff',
    fontFamily: 'Montserrat_500Medium',
    marginTop: 2,
    lineHeight: 18,
  }
});
