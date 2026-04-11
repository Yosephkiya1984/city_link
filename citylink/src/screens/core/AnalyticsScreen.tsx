import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, Animated, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import TopBar from '../../components/TopBar';
import { useAppStore } from '../../store/AppStore';
import { Colors, LightColors, FontSize, Radius, Spacing, Shadow, Fonts } from '../../theme';
import { CButton, SectionTitle } from '../../components';
import { fmtETB, timeAgo, uid, fmtDateTime } from '../../utils';
import { t } from '../../utils/i18n';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Analytics data structure
const ANALYTICS_METRICS = {
  spending: {
    title: 'Spending Overview',
    icon: 'card',
    color: '#6366f1',
    data: [
      { month: 'Jan', amount: 2500 },
      { month: 'Feb', amount: 3200 },
      { month: 'Mar', amount: 2800 },
      { month: 'Apr', amount: 3500 },
      { month: 'May', amount: 4100 },
      { month: 'Jun', amount: 3800 },
    ],
  },
  transport: {
    title: 'Transport Usage',
    icon: 'car',
    color: '#10b981',
    data: [
      { mode: 'LRT', trips: 45, percentage: 35 },
      { mode: 'Bus', trips: 38, percentage: 30 },
      { mode: 'Minibus', trips: 25, percentage: 20 },
      { mode: 'Taxi', trips: 19, percentage: 15 },
    ],
  },
  savings: {
    title: 'Savings Goals',
    icon: 'trending-up',
    color: '#f59e0b',
    data: [
      { category: 'Emergency', target: 10000, current: 7500 },
      { category: 'Travel', target: 5000, current: 3200 },
      { category: 'Education', target: 8000, current: 2100 },
      { category: 'Investment', target: 15000, current: 8900 },
    ],
  },
  activity: {
    title: 'Daily Activity',
    icon: 'pulse',
    color: '#ef4444',
    data: [
      { day: 'Mon', transactions: 12, logins: 5 },
      { day: 'Tue', transactions: 8, logins: 3 },
      { day: 'Wed', transactions: 15, logins: 7 },
      { day: 'Thu', transactions: 10, logins: 4 },
      { day: 'Fri', transactions: 18, logins: 6 },
      { day: 'Sat', transactions: 6, logins: 2 },
      { day: 'Sun', transactions: 4, logins: 2 },
    ],
  },
};

const INSIGHTS = [
  {
    id: 'spending',
    title: 'Spending Trend',
    insight: 'Your spending increased by 15% this month',
    recommendation: 'Consider reviewing your transport expenses',
    type: 'warning',
    icon: 'trending-up',
  },
  {
    id: 'savings',
    title: 'Savings Progress',
    insight: 'You\'re 75% towards your emergency fund goal',
    recommendation: 'Keep up the great work!',
    type: 'success',
    icon: 'checkmark-circle',
  },
  {
    id: 'transport',
    title: 'Transport Efficiency',
    insight: 'LRT is your most cost-effective transport option',
    recommendation: 'Consider monthly pass for additional savings',
    type: 'info',
    icon: 'subway',
  },
];

export default function AnalyticsScreen() {
  const isDark = useAppStore((s) => s.isDark);
  const C = isDark ? Colors : LightColors;
  const balance = useAppStore((s) => s.balance);
  const transactions = useAppStore((s) => s.transactions);
  const showToast = useAppStore((s) => s.showToast);

  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedMetric, setSelectedMetric] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [animatedValues, setAnimatedValues] = useState({});

  // Initialize animated values
  useEffect(() => {
    const values = {};
    Object.keys(ANALYTICS_METRICS).forEach(key => {
      values[key] = new Animated.Value(0);
    });
    setAnimatedValues(values);

    // Animate charts on mount
    Object.values(values).forEach((value, index) => {
      Animated.timing(value, {
        toValue: 1,
        duration: 1000,
        delay: index * 200,
        useNativeDriver: true,
      }).start();
    });
  }, []);

  // Calculate analytics data
  const analyticsData = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthTransactions = (transactions || []).filter(t => {
      const date = new Date(t.created_at);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const spendingByCategory = monthTransactions.reduce((acc, t) => {
      if (t.type === 'debit') {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
      }
      return acc;
    }, {});

    const totalSpending = Object.values(spendingByCategory).reduce((sum, amount) => sum + amount, 0);
    const averageTransaction = monthTransactions.length > 0 ? totalSpending / monthTransactions.length : 0;

    return {
      totalSpending,
      averageTransaction,
      transactionCount: monthTransactions.length,
      spendingByCategory,
      balance,
    };
  }, [transactions, balance]);

  const renderOverviewCard = (key, metric) => {
    const animatedValue = animatedValues[key];
    if (!animatedValue) return null;

    return (
      <Animated.View
        style={{
          opacity: animatedValue,
          transform: [{ translateY: Animated.multiply(animatedValue, -20) }],
        }}
      >
        <TouchableOpacity
          onPress={() => setSelectedMetric(key)}
          style={{
            backgroundColor: C.surface,
            borderRadius: Radius.xl,
            padding: 16,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: C.edge,
            ...Shadow.md,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: metric.color + '20',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Ionicons name={metric.icon} size={20} color={metric.color} />
            </View>
            <Text style={{ color: C.text, fontSize: 18, fontFamily: Fonts.black, flex: 1 }}>
              {metric.title}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={C.hint} />
          </View>

          {/* Mini chart preview */}
          {key === 'spending' && (
            <View style={{ height: 60, flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
              {metric.data.slice(-6).map((item, index) => (
                <View
                  key={index}
                  style={{
                    flex: 1,
                    height: (item.amount / Math.max(...metric.data.map(d => d.amount))) * 50,
                    backgroundColor: metric.color,
                    borderRadius: 4,
                  }}
                />
              ))}
            </View>
          )}

          {key === 'transport' && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {metric.data.slice(0, 3).map((item, index) => (
                <View key={index} style={{ alignItems: 'center' }}>
                  <Text style={{ color: C.text, fontSize: 16, fontFamily: Fonts.black }}>
                    {item.trips}
                  </Text>
                  <Text style={{ color: C.sub, fontSize: 10, fontFamily: Fonts.medium }}>
                    {item.mode}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {key === 'savings' && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: C.text, fontSize: 14, fontFamily: Fonts.medium }}>
                Total Progress
              </Text>
              <Text style={{ color: metric.color, fontSize: 16, fontFamily: Fonts.black }}>
                {fmtETB(metric.data.reduce((sum, item) => sum + item.current, 0))}
              </Text>
            </View>
          )}

          {key === 'activity' && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: C.text, fontSize: 14, fontFamily: Fonts.medium }}>
                Weekly Transactions
              </Text>
              <Text style={{ color: metric.color, fontSize: 16, fontFamily: Fonts.black }}>
                {metric.data.reduce((sum, item) => sum + item.transactions, 0)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderDetailedChart = () => {
    const metric = ANALYTICS_METRICS[selectedMetric];
    if (!metric) return null;

    if (selectedMetric === 'spending') {
      return (
        <View>
          <Text style={{ color: C.text, fontSize: 20, fontFamily: Fonts.black, marginBottom: 16 }}>
            {metric.title}
          </Text>
          {/* Custom Line Chart */}
          <View style={{ backgroundColor: C.surface, borderRadius: 16, padding: 16, ...Shadow.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              {metric.data.map((item, index) => (
                <Text key={index} style={{ color: C.sub, fontSize: 10, fontFamily: Fonts.medium, textAlign: 'center', flex: 1 }}>
                  {item.month}
                </Text>
              ))}
            </View>
            <View style={{ height: 120, flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
              {metric.data.map((item, index) => (
                <View key={index} style={{ flex: 1, alignItems: 'center' }}>
                  <View
                    style={{
                      width: '80%',
                      height: (item.amount / Math.max(...metric.data.map(d => d.amount))) * 100,
                      backgroundColor: metric.color,
                      borderRadius: 4,
                    }}
                  />
                  <Text style={{ color: C.text, fontSize: 8, fontFamily: Fonts.medium, marginTop: 4 }}>
                    {fmtETB(item.amount)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      );
    }

    if (selectedMetric === 'transport') {
      return (
        <View>
          <Text style={{ color: C.text, fontSize: 20, fontFamily: Fonts.black, marginBottom: 16 }}>
            {metric.title}
          </Text>
          {/* Custom Bar Chart */}
          <View style={{ backgroundColor: C.surface, borderRadius: 16, padding: 16, ...Shadow.md }}>
            {metric.data.map((item, index) => (
              <View key={index} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={{ color: C.text, fontSize: 14, fontFamily: Fonts.medium }}>
                    {item.mode}
                  </Text>
                  <Text style={{ color: metric.color, fontSize: 14, fontFamily: Fonts.black }}>
                    {item.trips} trips
                  </Text>
                </View>
                <View style={{ height: 8, backgroundColor: C.edge, borderRadius: 4 }}>
                  <View
                    style={{
                      height: 8,
                      width: `${item.percentage * 3}%`,
                      backgroundColor: metric.color,
                      borderRadius: 4,
                    }}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>
      );
    }

    if (selectedMetric === 'savings') {
      return (
        <View>
          <Text style={{ color: C.text, fontSize: 20, fontFamily: Fonts.black, marginBottom: 16 }}>
            {metric.title}
          </Text>
          {metric.data.map((item, index) => (
            <View key={index} style={{ backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 12, ...Shadow.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: C.text, fontSize: 16, fontFamily: Fonts.black }}>
                  {item.category}
                </Text>
                <Text style={{ color: metric.color, fontSize: 16, fontFamily: Fonts.black }}>
                  {fmtETB(item.current)} / {fmtETB(item.target)}
                </Text>
              </View>
              <View style={{ height: 12, backgroundColor: C.edge, borderRadius: 6 }}>
                <View
                  style={{
                    height: 12,
                    width: `${Math.min((item.current / item.target) * 100, 100)}%`,
                    backgroundColor: metric.color,
                    borderRadius: 6,
                  }}
                />
              </View>
              <Text style={{ color: C.sub, fontSize: 12, fontFamily: Fonts.medium, marginTop: 4 }}>
                {Math.round((item.current / item.target) * 100)}% Complete
              </Text>
            </View>
          ))}
        </View>
      );
    }

    if (selectedMetric === 'activity') {
      return (
        <View>
          <Text style={{ color: C.text, fontSize: 20, fontFamily: Fonts.black, marginBottom: 16 }}>
            {metric.title}
          </Text>
          {/* Custom Activity Chart */}
          <View style={{ backgroundColor: C.surface, borderRadius: 16, padding: 16, ...Shadow.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ color: C.text, fontSize: 14, fontFamily: Fonts.black }}>Day</Text>
              <Text style={{ color: C.text, fontSize: 14, fontFamily: Fonts.black }}>Transactions</Text>
              <Text style={{ color: C.text, fontSize: 14, fontFamily: Fonts.black }}>Logins</Text>
            </View>
            {metric.data.map((item, index) => (
              <View key={index} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ color: C.text, fontSize: 14, fontFamily: Fonts.medium, flex: 1 }}>
                  {item.day}
                </Text>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <View style={{ 
                    width: 30, 
                    height: 30, 
                    borderRadius: 15, 
                    backgroundColor: metric.color + '20', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    <Text style={{ color: metric.color, fontSize: 12, fontFamily: Fonts.black }}>
                      {item.transactions}
                    </Text>
                  </View>
                </View>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <View style={{ 
                    width: 30, 
                    height: 30, 
                    borderRadius: 15, 
                    backgroundColor: C.primary + '20', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    <Text style={{ color: C.primary, fontSize: 12, fontFamily: Fonts.black }}>
                      {item.logins}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      );
    }

    return null;
  };

  const renderInsights = () => (
    <View>
      <SectionTitle title="AI Insights" />
      {INSIGHTS.map((insight) => (
        <TouchableOpacity
          key={insight.id}
          style={{
            backgroundColor: C.surface,
            borderRadius: Radius.xl,
            padding: 16,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: C.edge,
            ...Shadow.md,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <View style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: insight.type === 'success' ? C.green + '20' : 
                             insight.type === 'warning' ? C.amber + '20' : C.primary + '20',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Ionicons
                name={insight.icon}
                size={16}
                color={insight.type === 'success' ? C.green : 
                       insight.type === 'warning' ? C.amber : C.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.text, fontSize: 16, fontFamily: Fonts.black, marginBottom: 4 }}>
                {insight.title}
              </Text>
              <Text style={{ color: C.sub, fontSize: 14, fontFamily: Fonts.medium, marginBottom: 8 }}>
                {insight.insight}
              </Text>
              <Text style={{ color: C.primary, fontSize: 12, fontFamily: Fonts.bold }}>
                {insight.recommendation}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <TopBar title="📊 Analytics" right={
        <TouchableOpacity onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          showToast('Analytics refreshed!', 'success');
        }}
          style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.lg,
            backgroundColor: C.primaryL, borderWidth: 1, borderColor: C.edge2 }}>
          <Text style={{ color: C.primary, fontSize: FontSize.xs, fontWeight: '700' }}>Refresh</Text>
        </TouchableOpacity>
      } />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 20 }}>
        {/* Summary Cards */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
          <View style={{ flex: 1, backgroundColor: C.surface, borderRadius: Radius.xl, padding: 16, ...Shadow.md }}>
            <Text style={{ color: C.sub, fontSize: 12, fontFamily: Fonts.medium, marginBottom: 4 }}>
              Total Balance
            </Text>
            <Text style={{ color: C.text, fontSize: 24, fontFamily: Fonts.black }}>
              {fmtETB(balance)}
            </Text>
          </View>
          <View style={{ flex: 1, backgroundColor: C.surface, borderRadius: Radius.xl, padding: 16, ...Shadow.md }}>
            <Text style={{ color: C.sub, fontSize: 12, fontFamily: Fonts.medium, marginBottom: 4 }}>
              Monthly Spending
            </Text>
            <Text style={{ color: C.text, fontSize: 24, fontFamily: Fonts.black }}>
              {fmtETB(analyticsData.totalSpending)}
            </Text>
          </View>
        </View>

        {/* Period Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, marginBottom: 20 }}>
          {['week', 'month', 'quarter', 'year'].map((period) => (
            <TouchableOpacity
              key={period}
              onPress={() => setSelectedPeriod(period)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: Radius.lg,
                backgroundColor: selectedPeriod === period ? C.primary : C.surface,
                borderWidth: 1,
                borderColor: selectedPeriod === period ? C.primary : C.edge,
              }}
            >
              <Text style={{
                color: selectedPeriod === period ? C.white : C.text,
                fontSize: FontSize.sm,
                fontFamily: Fonts.bold,
                textTransform: 'capitalize',
              }}>
                {period}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Overview or Detailed Chart */}
        {selectedMetric === 'overview' ? (
          <View>
            <SectionTitle title="Overview" />
            {Object.entries(ANALYTICS_METRICS).map(([key, metric]) => renderOverviewCard(key, metric))}
          </View>
        ) : (
          <View>
            <TouchableOpacity
              onPress={() => setSelectedMetric('overview')}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}
            >
              <Ionicons name="arrow-back" size={20} color={C.primary} />
              <Text style={{ color: C.primary, fontSize: 16, fontFamily: Fonts.bold }}>
                Back to Overview
              </Text>
            </TouchableOpacity>
            {renderDetailedChart()}
          </View>
        )}

        {/* AI Insights */}
        {renderInsights()}

        {/* Export Options */}
        <View style={{ marginTop: 20 }}>
          <SectionTitle title="Export Data" />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <CButton
              title="Export PDF"
              variant="ghost"
              onPress={() => showToast('PDF export coming soon!', 'info')}
              icon="document-text"
              style={{ flex: 1 }}
            />
            <CButton
              title="Export CSV"
              variant="ghost"
              onPress={() => showToast('CSV export coming soon!', 'info')}
              icon="document"
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
