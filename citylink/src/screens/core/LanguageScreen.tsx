import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TopBar from '../../components/TopBar';
import { useAppStore } from '../../store/AppStore';
import { Colors, DarkColors, Radius, Fonts, Shadow } from '../../theme';
import { t } from '../../utils/i18n';

function useTheme() {
  const isDark = useAppStore((s) => s.isDark);
  return isDark ? DarkColors : Colors;
}

export default function LanguageScreen() {
  const C = useTheme();
  const lang = useAppStore((s) => s.lang);
  const setLang = useAppStore((s) => s.setLang);
  const showToast = useAppStore((s) => s.showToast);

  const langs = [
    { code: 'en', label: 'English', sub: 'Universal' },
    { code: 'am', label: 'አማርኛ', sub: 'Amharic' },
    { code: 'or', label: 'Afaan Oromoo', sub: 'Oromo' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <TopBar title={t('language')} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {langs.map((l) => (
          <TouchableOpacity
            key={l.code}
            onPress={() => {
              setLang(l.code);
              showToast(t('lang_changed'), 'success');
            }}
            style={{
              backgroundColor: C.surface,
              borderRadius: Radius.xl,
              borderWidth: 1.5,
              borderColor: lang === l.code ? C.primary : C.edge2,
              padding: 20,
              marginBottom: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              ...Shadow.sm,
            }}
          >
            <View>
              <Text style={{ color: C.text, fontSize: 18, fontFamily: Fonts.black }}>
                {l.label}
              </Text>
              <Text style={{ color: C.sub, fontSize: 13, fontFamily: Fonts.medium, marginTop: 2 }}>
                {l.sub}
              </Text>
            </View>
            {lang === l.code && <Ionicons name="checkmark-circle" size={24} color={C.primary} />}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
