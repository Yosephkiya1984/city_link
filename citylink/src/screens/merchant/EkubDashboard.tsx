import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/AppStore';
import { useTheme } from '../../hooks/useTheme';
import { Colors, DarkColors, Radius, Spacing, Shadow, Fonts, FontSize } from '../../theme';
import { CButton } from '../../components';

// â”€â”€ Ekub Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function EkubDashboard() {
  const C = useTheme();
  const currentUser = useAppStore((s) => s.currentUser);
  
  return (
    <View style={{ flex: 1, backgroundColor: C.ink, padding: 16 }}>
      <View style={{ 
        backgroundColor: C.surface, 
        borderRadius: Radius['2xl'], 
        padding: 24, 
        marginBottom: 16,
        ...Shadow.lg 
      }}>
        <Text style={{ 
          color: C.text, 
          fontSize: FontSize.xl, 
          fontFamily: Fonts.black, 
          marginBottom: 8 
        }}>
          👥 {currentUser?.business_name || 'Ekub Association'}
        </Text>
        <Text style={{ 
          color: C.sub, 
          fontSize: FontSize.md, 
          fontFamily: Fonts.medium 
        }}>
          Association Management Dashboard
        </Text>
      </View>
      
      <View style={{ 
        backgroundColor: C.surface, 
        borderRadius: Radius['2xl'], 
        padding: 20, 
        ...Shadow.md 
      }}>
        <Text style={{ 
          color: C.text, 
          fontSize: FontSize.lg, 
          fontFamily: Fonts.bold, 
          marginBottom: 16 
        }}>
          📊 Association Overview
        </Text>
        
        <View style={{ gap: 12 }}>
          <View style={{ 
            backgroundColor: C.primary + '20', 
            borderRadius: Radius.lg, 
            padding: 16, 
            borderWidth: 1, 
            borderColor: C.primary + '40' 
          }}>
            <Text style={{ color: C.text, fontSize: FontSize.md, fontFamily: Fonts.medium }}>
              Total Members: <Text style={{ color: C.primary, fontFamily: Fonts.bold }}>156</Text>
            </Text>
          </View>
          
          <View style={{ 
            backgroundColor: C.green + '20', 
            borderRadius: Radius.lg, 
            padding: 16, 
            borderWidth: 1, 
            borderColor: C.green + '40' 
          }}>
            <Text style={{ color: C.text, fontSize: FontSize.md, fontFamily: Fonts.medium }}>
              Active Contributions: <Text style={{ color: C.green, fontFamily: Fonts.bold }}>ETB 45,000</Text>
            </Text>
          </View>
          
          <View style={{ 
            backgroundColor: C.amber + '20', 
            borderRadius: Radius.lg, 
            padding: 16, 
            borderWidth: 1, 
            borderColor: C.amber + '40' 
          }}>
            <Text style={{ color: C.text, fontSize: FontSize.md, fontFamily: Fonts.medium }}>
              Pending Payouts: <Text style={{ color: C.amber, fontFamily: Fonts.bold }}>ETB 12,000</Text>
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
