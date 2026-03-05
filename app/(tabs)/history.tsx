import React, { useContext, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HistoryContext } from '../context/HistoryContext';

export default function HistoryScreen() {
    const historyContext = useContext(HistoryContext);
    const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    if (!historyContext) {
        return null;
    }
    const { history, clearHistory } = historyContext;

    const filteredHistory = history.filter(item => item.time.includes(searchQuery));

    const toggleHistoryExpand = (id: string) => {
        setExpandedHistoryId(expandedHistoryId === id ? null : id);
    };

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

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={['#05695cff', '#0a8d88ff', '#ffffff']}
                style={StyleSheet.absoluteFillObject}
            />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <View style={styles.headerShape}>
                    <TouchableOpacity onPress={() => {/* Navigation handled by tab bar or router.back() if needed */ }} style={styles.backButton}>
                        {/* If we strictly want it to look like a sub-page, we could add a back button, but it's a tab screen. We can leave it simple. */}
                        <MaterialCommunityIcons name="history" size={32} color="#05695c" />
                    </TouchableOpacity>
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerTitle}>RIWAYAT</Text>
                        <Text style={styles.headerSubtitle}>Catatan Pergerakan Jemuran</Text>
                    </View>
                </View>

                {/* History Panel */}
                <View style={styles.historyPanel}>
                    <Text style={styles.historyTitle}>Riwayat Kondisi</Text>

                    {/* Search Input */}
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color="#94a3b8" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Cari berdasarkan jam (misal: 14:30)"
                            placeholderTextColor="#94a3b8"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            keyboardType="numeric"
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={20} color="#94a3b8" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Reset Button (Moved to Top & Minimized) */}
                    {history.length > 0 && (
                        <View style={styles.resetContainer}>
                            <TouchableOpacity
                                style={styles.smallResetButton}
                                onPress={() => {
                                    clearHistory();
                                    setExpandedHistoryId(null);
                                    setSearchQuery('');
                                }}
                            >
                                <MaterialCommunityIcons name="delete-outline" size={20} color="#ef4444" />
                            </TouchableOpacity>
                        </View>
                    )}

                    {filteredHistory.length === 0 ? (
                        <Text style={styles.historyEmpty}>
                            {history.length === 0 ? 'Belum ada riwayat pergerakan jemuran.' : 'Riwayat tidak ditemukan.'}
                        </Text>
                    ) : (
                        filteredHistory.map((item) => {
                            const isExpanded = expandedHistoryId === item.id;
                            return (
                                <View key={item.id} style={styles.historyItemContainer}>
                                    <TouchableOpacity
                                        style={styles.historyRow}
                                        onPress={() => toggleHistoryExpand(item.id)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.historyInfo}>
                                            {item.event === 'Jemuran Keluar' ? (
                                                <Ionicons
                                                    name={getLightIconProps(item.light).name}
                                                    size={20}
                                                    color={getLightIconProps(item.light).color}
                                                />
                                            ) : (
                                                <MaterialCommunityIcons
                                                    name="home-export-outline"
                                                    size={20}
                                                    color="#0284c7"
                                                />
                                            )}
                                            <Text style={styles.historyEventText}>{item.event}</Text>
                                        </View>
                                        <View style={styles.historyTimeContainer}>
                                            <Ionicons name="time-outline" size={14} color="#64748b" />
                                            <Text style={styles.historyTime}>{item.time}</Text>
                                            <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color="#94a3b8" style={{ marginLeft: 4 }} />
                                        </View>
                                    </TouchableOpacity>

                                    {/* Expandable Details */}
                                    {isExpanded && (
                                        <View style={styles.historyDetailsBox}>
                                            <View style={styles.historyDetailItem}>
                                                <MaterialCommunityIcons
                                                    name="thermometer"
                                                    size={16}
                                                    color={getIconColor(item.temp)}
                                                />
                                                <Text style={styles.historyDetailText}>{item.temp}°C</Text>
                                            </View>
                                            <View style={styles.historyDetailItem}>
                                                <Ionicons
                                                    name={getLightIconProps(item.light).name}
                                                    size={16}
                                                    color={getLightIconProps(item.light).color}
                                                />
                                                <Text style={styles.historyDetailText}>{item.light}%</Text>
                                            </View>
                                            <View style={styles.historyDetailItem}>
                                                <MaterialCommunityIcons name="fan" size={16} color={item.fanOn ? "#10b981" : "#94a3b8"} />
                                                <Text style={styles.historyDetailText}>{item.fanOn ? 'ON' : 'OFF'}</Text>
                                            </View>
                                        </View>
                                    )}
                                </View>
                            );
                        })
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 20, paddingBottom: 40 },
    headerShape: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 30,
        marginTop: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
        gap: 16,
    },
    backButton: {
        backgroundColor: '#ffffff',
        padding: 10,
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    headerTextContainer: { flex: 1 },
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
    historyPanel: {
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 24,
        shadowColor: '#0ea5e9',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 6,
    },
    historyTitle: {
        fontSize: 18,
        fontFamily: 'Montserrat_700Bold',
        color: '#1e293b',
        marginBottom: 16,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 20,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 14,
        fontFamily: 'Montserrat_500Medium',
        color: '#0f172a',
    },
    historyEmpty: {
        fontSize: 14,
        color: '#94a3b8',
        fontFamily: 'Montserrat_500Medium',
        textAlign: 'center',
        fontStyle: 'italic',
    },
    historyItemContainer: {
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    historyRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
    },
    historyInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    historyEventText: {
        fontSize: 15,
        fontFamily: 'Montserrat_600SemiBold',
        color: '#0f172a',
    },
    historyTimeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    historyTime: {
        fontSize: 13,
        fontFamily: 'Montserrat_500Medium',
        color: '#64748b',
    },
    historyDetailsBox: {
        flexDirection: 'row',
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        padding: 12,
        marginBottom: 14,
        justifyContent: 'space-around',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    historyDetailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    historyDetailText: {
        fontSize: 13,
        fontFamily: 'Montserrat_600SemiBold',
        color: '#334155',
    },
    resetContainer: {
        alignItems: 'flex-end',
        marginBottom: 16,
        marginTop: -8,
    },
    smallResetButton: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
        backgroundColor: '#fef2f2',
        borderWidth: 1,
        borderColor: '#fecaca',
    }
});
