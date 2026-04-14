import React, { memo } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { COLORS } from './constants';

interface EnhancedTopBarProps {
  activeScreen: string;
  onScreenChange: (screen: string) => void;
  userImage: string;
}

const DelalaTopBar = memo(({
  activeScreen,
  onScreenChange,
  userImage,
}: EnhancedTopBarProps) => {
  return (
    <View style={styles.topBar}>
      <View style={styles.topBarLeft}>
        <Text style={styles.brandName}>Delala</Text>
      </View>

      <View style={styles.topBarRight}>
        <View style={styles.navLinks}>
          {['Listings', 'Inventory', 'Messages'].map((screen) => (
            <TouchableOpacity
              key={screen}
              onPress={() => onScreenChange(screen)}
              style={[styles.navLink, activeScreen === screen && styles.activeNavLink]}
            >
              <Text
                style={[styles.navLinkText, activeScreen === screen && styles.activeNavLinkText]}
              >
                {screen}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.profileContainer}>
          <Image source={{ uri: userImage }} style={styles.profileImage} />
        </View>
      </View>
    </View>
  );
});

export default DelalaTopBar;

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: COLORS['surface-container-low'],
    borderRadius: 20,
    padding: 2,
  },
  navLink: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
  },
  activeNavLink: {
    backgroundColor: COLORS['surface-container-highest'],
  },
  navLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS['on-surface-variant'],
  },
  activeNavLinkText: {
    color: COLORS['on-surface'],
  },
  profileContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: COLORS.outline,
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
});
