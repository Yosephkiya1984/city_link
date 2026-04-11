import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Animated } from 'react-native';
import { Svg, Circle, Path } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';
import { Spacing, FontSize, Fonts } from '../../theme';

export function TransactionChart({ transactions }) {
  const C = useTheme();
  const [animValue] = useState(new Animated.Value(0));
  
  useEffect(() => {
    Animated.timing(animValue, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: true,
    }).start();
  }, []);

  const chartData = useMemo(() => {
    const last7Days = (transactions || []).slice(-7);
    return last7Days.map((tx, index) => ({
      id: tx.id || index,
      amount: tx.amount,
      type: tx.type,
      category: tx.category || 'default',
      day: new Date(tx.created_at).toLocaleDateString('en', { weekday: 'short' }),
      color: tx.type === 'credit' ? C.green : C.red,
      height: Math.min((tx.amount / 1000) * 60, 120), // Scale height based on amount
    }));
  }, [transactions, C]);

  return (
    <View style={{ marginVertical: Spacing.md }}>
      <Text style={{ 
        color: C.text, 
        fontSize: FontSize.md, 
        fontFamily: Fonts.bold, 
        marginBottom: Spacing.md 
      }}>
        Recent Activity
      </Text>
      
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'flex-end', 
        justifyContent: 'space-between', 
        height: 140,
        paddingHorizontal: Spacing.sm
      }}>
        {chartData.map((item, index) => (
          <Animated.View
            key={item.id}
            style={{
              flex: 1,
              alignItems: 'center',
              transform: [
                {
                  translateY: animValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
                {
                  scale: animValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            }}
          >
            <View
              style={{
                width: '70%',
                height: item.height || 1,
                backgroundColor: item.color,
                borderRadius: 4,
                marginBottom: 4,
                shadowColor: item.color,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 3,
              }}
            />
            <Text
              style={{
                color: C.sub,
                fontSize: FontSize.xs,
                fontFamily: Fonts.medium,
                textAlign: 'center',
                marginTop: 4,
              }}
            >
              {item.day}
            </Text>
          </Animated.View>
        ))}
      </View>
      
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'center', 
        gap: Spacing.lg, 
        marginTop: Spacing.md 
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: C.green }} />
          <Text style={{ color: C.sub, fontSize: FontSize.xs, fontFamily: Fonts.medium }}>Income</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: C.red }} />
          <Text style={{ color: C.sub, fontSize: FontSize.xs, fontFamily: Fonts.medium }}>Expenses</Text>
        </View>
      </View>
    </View>
  );
}
