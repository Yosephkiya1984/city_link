import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, LightColors, FontSize, Radius, Spacing, Shadow, Fonts } from '../../theme';
import { useSystemStore } from '../../store/SystemStore';
import { t } from '../../utils/i18n';

interface AIActionHandlerProps {
  action: {
    type: 'SPENDING_INSIGHT' | 'SPLIT_SUGGESTION' | 'BUDGET_ALERT' | 'SAVINGS_TIP';
    data: any;
  };
  onActionComplete?: () => void;
}

export const AIActionHandler: React.FC<AIActionHandlerProps> = ({ action, onActionComplete }) => {
  const isDark = useSystemStore((s) => s.isDark);
  const C = isDark ? Colors : LightColors;

  const renderSpendingInsight = () => {
    const { category, amount, period } = action.data;
    return (
      <View style={[styles.card, { backgroundColor: C.lift, borderColor: C.edge2 }]}>
        <View style={styles.header}>
          <Ionicons name="analytics" size={20} color={C.primary} />
          <Text style={[styles.title, { color: C.text }]}>{t('spending_insights')}</Text>
        </View>
        <Text style={[styles.content, { color: C.sub }]}>
          You spent <Text style={{ color: C.primary, fontFamily: Fonts.bold }}>{amount} ETB</Text>{' '}
          on {category} this {period}.
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: C.primary }]}
          onPress={onActionComplete}
        >
          <Text style={styles.buttonText}>View Details</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderSplitSuggestion = () => {
    const { merchant, amount } = action.data;
    return (
      <View style={[styles.card, { backgroundColor: C.lift, borderColor: C.edge2 }]}>
        <View style={styles.header}>
          <Ionicons name="people" size={20} color={C.green} />
          <Text style={[styles.title, { color: C.text }]}>{t('split_bill')}</Text>
        </View>
        <Text style={[styles.content, { color: C.sub }]}>
          Split {amount} ETB at <Text style={{ fontFamily: Fonts.bold }}>{merchant}</Text>?
        </Text>
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.miniButton, { backgroundColor: C.green }]}
            onPress={onActionComplete}
          >
            <Text style={[styles.buttonText, { color: '#040A05' }]}>Split Now</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.miniButton, { backgroundColor: C.edge2 }]}
            onPress={onActionComplete}
          >
            <Text style={[styles.buttonText, { color: C.sub }]}>Maybe Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderBudgetAlert = () => {
    const { budget, current } = action.data;
    const percent = Math.min(100, Math.round((current / budget) * 100));
    return (
      <View style={[styles.card, { backgroundColor: C.lift, borderColor: C.red + '44' }]}>
        <View style={styles.header}>
          <Ionicons name="warning" size={20} color={C.red} />
          <Text style={[styles.title, { color: C.text }]}>{t('budget_alert')}</Text>
        </View>
        <Text style={[styles.content, { color: C.sub }]}>
          You've used {percent}% of your monthly budget ({current}/{budget} ETB).
        </Text>
        <View style={[styles.progressBar, { backgroundColor: C.edge2 }]}>
          <View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: C.red }]} />
        </View>
      </View>
    );
  };

  switch (action.type) {
    case 'SPENDING_INSIGHT':
      return renderSpendingInsight();
    case 'SPLIT_SUGGESTION':
      return renderSplitSuggestion();
    case 'BUDGET_ALERT':
      return renderBudgetAlert();
    default:
      return null;
  }
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginTop: 12,
    ...Shadow.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: FontSize.md,
    fontFamily: Fonts.black,
  },
  content: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.medium,
    lineHeight: 20,
    marginBottom: 16,
  },
  button: {
    paddingVertical: 10,
    borderRadius: Radius.lg,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bold,
    color: '#fff',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  miniButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
});
