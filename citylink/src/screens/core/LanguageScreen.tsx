import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TopBar from '../../components/TopBar';
import { useSystemStore } from '../../store/SystemStore';
import { useAuthStore } from '../../store/AuthStore';
import { DarkColors as T, Radius, Fonts } from '../../theme';
import { GlassView } from '../../components/GlassView';
import { t } from '../../utils/i18n';

export default function LanguageScreen() {
  const lang = useSystemStore((s) => s.lang);
  const setLang = useSystemStore((s) => s.setLang);
  const showToast = useSystemStore((s) => s.showToast);
  const { currentUser, setCurrentUser } = useAuthStore();

  const langs = [
    { code: 'en', label: 'English', sub: 'Universal' },
    { code: 'am', label: 'አማርኛ', sub: 'Amharic' },
    { code: 'om', label: 'Afaan Oromoo', sub: 'Oromo' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: T.ink }}>
      <TopBar title={t('language')} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {langs.map((l) => (
          <TouchableOpacity
            key={l.code}
            onPress={() => {
              setLang(l.code);
              if (currentUser) {
                setCurrentUser({ ...currentUser, language: l.code });
              }
              showToast(t('lang_changed'), 'success');
            }}
          >
            <GlassView
              intensity={20}
              style={{
                borderRadius: Radius.xl,
                borderWidth: 1.5,
                borderColor: lang === l.code ? T.primary : T.edge,
                padding: 24,
                marginBottom: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View>
                <Text style={{ color: T.text, fontSize: 20, fontFamily: Fonts.headline }}>
                  {l.label}
                </Text>
                <Text
                  style={{ color: T.textSoft, fontSize: 13, fontFamily: Fonts.body, marginTop: 4 }}
                >
                  {l.sub}
                </Text>
              </View>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: lang === l.code ? T.primary : T.edge,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {lang === l.code && (
                  <View
                    style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: T.primary }}
                  />
                )}
              </View>
            </GlassView>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
