import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  Dimensions,
  ScrollView,
  Alert,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useAppStore } from '../../store/AppStore';
import { fetchPendingMerchants } from '../../services/admin.service';
import { fetchProfile } from '../../services/profile.service';
import { Radius, Spacing, Fonts, Colors, DarkColors } from '../../theme';
import * as Haptics from 'expo-haptics';

// Admin Components
import AdminSidebar, { AdminTab } from '../../components/admin/AdminSidebar';
import AdminTopBar from '../../components/admin/AdminTopBar';
import AdminBottomNav from '../../components/admin/AdminBottomNav';
import OverviewModule from '../../components/admin/OverviewModule';
import MerchantModule from '../../components/admin/MerchantModule';
import DisputeModule from '../../components/admin/DisputeModule';
import UserModule from '../../components/admin/UserModule';
import AuditModule from '../../components/admin/AuditModule';
import SystemModule from '../../components/admin/SystemModule';
import DeliveryAgentModule from '../../components/admin/DeliveryAgentModule';

export default function AdminScreen() {
  const theme = useTheme();
  const currentUser = useAppStore((s) => s.currentUser);
  const resetStore = useAppStore((s) => s.reset);

  // Responsive State
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const isTablet = useMemo(() => dimensions.width > 768, [dimensions.width]);

  const [activeTab, setActiveTab] = useState<AdminTab | string>('overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(!isTablet);

  // Data State
  const [pendingMerchants, setPendingMerchants] = useState([]);
  const [loadingMerchants, setLoadingMerchants] = useState(false);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  const loadData = useCallback(async () => {
    if (activeTab === 'merchants') {
      setLoadingMerchants(true);
      const { data } = await fetchPendingMerchants();
      if (data) setPendingMerchants(data);
      setLoadingMerchants(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTabChange = async (tabId: AdminTab | string) => {
    if (tabId === 'logout') {
      // Sign out handled by the Nav components' alerts,
      // but if we get here, trigger the actual store reset.
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await resetStore();
    } else {
      setActiveTab(tabId);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewModule />;
      case 'merchants':
        return (
          <MerchantModule
            merchants={pendingMerchants}
            loading={loadingMerchants}
            onRefresh={loadData}
          />
        );
      case 'disputes':
        return <DisputeModule />;
      case 'drivers':
        return <DeliveryAgentModule />;
      case 'users':
        return <UserModule />;
      case 'logs':
        return <AuditModule />;
      case 'systems':
        return <SystemModule />;
      default:
        return <OverviewModule />;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.ink }]}>
      <StatusBar barStyle="light-content" />

      <View style={styles.layout}>
        {/* Sidebar - Only on Tablet */}
        {isTablet && (
          <AdminSidebar
            activeTab={activeTab}
            onTabChange={handleTabChange}
            isCollapsed={isSidebarCollapsed}
            toggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />
        )}

        {/* Main Workspace */}
        <View style={styles.workspace}>
          <AdminTopBar
            title={activeTab === 'overview' ? 'Command Center' : activeTab}
            user={currentUser}
          />

          <View style={[styles.contentArea, !isTablet && { paddingBottom: 70 }]}>
            {renderContent()}
          </View>
        </View>
      </View>

      {/* Bottom Nav - Only on Mobile */}
      {!isTablet && <AdminBottomNav activeTab={activeTab} onTabChange={handleTabChange} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  layout: {
    flex: 1,
    flexDirection: 'row',
  },
  workspace: {
    flex: 1,
    height: '100%',
  },
  contentArea: {
    flex: 1,
  },
});
