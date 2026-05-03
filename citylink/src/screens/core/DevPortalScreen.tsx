import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import TopBar from '../../components/TopBar';
import { useAuthStore } from '../../store/AuthStore';
import { useWalletStore } from '../../store/WalletStore';
import { useSystemStore } from '../../store/SystemStore';
import { Colors, LightColors, Radius, Spacing, Fonts, Shadow } from '../../theme';
import { CButton, SectionTitle } from '../../components';
import { fmtETB } from '../../utils';

export default function DevPortalScreen() {
  const navigation = useNavigation<any>();
  const isDark = useSystemStore((s) => s.isDark);
  const C = isDark ? Colors : LightColors;

  const { currentUser, setUiMode, uiMode, signOut } = useAuthStore();
  const { balance, setBalance, addTransaction } = useWalletStore();
  const { showToast, toggleTheme, lang, setLang, addNotification, setPendingP2PClaim } =
    useSystemStore();

  const [activeTab, setActiveTab] = useState<'nav' | 'mocks' | 'state'>('nav');

  const citizenScreens = [
    { name: 'Home', route: 'CitizenRoot', icon: 'home-outline' },
    { name: 'Wallet', route: 'Wallet', icon: 'wallet-outline' },
    { name: 'Marketplace', route: 'Marketplace', icon: 'cart-outline' },
    { name: 'Food', route: 'Food', icon: 'restaurant-outline' },
    { name: 'Gourmet', route: 'Food', icon: 'restaurant-outline' },
    { name: 'Ekub', route: 'Ekub', icon: 'people-outline' },
    { name: 'Parking', route: 'Parking', icon: 'car-outline' },
    { name: 'Delala', route: 'Delala', icon: 'business-outline' },
  ];

  const merchantScreens = [
    { name: 'Merchant Portal', route: 'MerchantPortal', icon: 'briefcase-outline' },
    { name: 'Shop Dashboard', route: 'ShopDashboard', icon: 'storefront-outline' },
    { name: 'Restaurant', route: 'RestaurantDashboard', icon: 'pizza-outline' },
    { name: 'Delala (Real Estate)', route: 'DelalaDashboard', icon: 'home-outline' },
    { name: 'Parking Lot', route: 'ParkingDashboard', icon: 'car-sport-outline' },
    { name: 'Ekub Admin', route: 'EkubDashboard', icon: 'ribbon-outline' },
  ];

  const agentScreens = [
    { name: 'Agent Dashboard', route: 'AgentDashboard', icon: 'bicycle-outline' },
    { name: 'Become Agent', route: 'BecomeDeliveryAgent', icon: 'person-add-outline' },
  ];

  const adminScreens = [
    { name: 'Admin Panel', route: 'AdminDashboard', icon: 'shield-checkmark-outline' },
    { name: 'Performance', route: 'PerformanceProfiler', icon: 'speedometer-outline' },
  ];

  const renderNavTab = () => (
    <View style={styles.tabContent}>
      <SectionTitle title="Citizen Experience" />
      <View style={styles.grid}>
        {citizenScreens.map((item) => (
          <TouchableOpacity
            key={item.name}
            style={[styles.gridItem, { backgroundColor: C.surface, borderColor: C.edge }]}
            onPress={() => navigation.navigate(item.route)}
          >
            <Ionicons name={item.icon as any} size={24} color={C.primary} />
            <Text style={[styles.gridText, { color: C.text }]}>{item.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <SectionTitle title="Merchant Dashboards" />
      <View style={styles.grid}>
        {merchantScreens.map((item) => (
          <TouchableOpacity
            key={item.name}
            style={[styles.gridItem, { backgroundColor: C.surface, borderColor: C.edge }]}
            onPress={() => navigation.navigate(item.route)}
          >
            <Ionicons name={item.icon as any} size={24} color={C.secondary} />
            <Text style={[styles.gridText, { color: C.text }]}>{item.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <SectionTitle title="Agent & Logistics" />
      <View style={styles.grid}>
        {agentScreens.map((item) => (
          <TouchableOpacity
            key={item.name}
            style={[styles.gridItem, { backgroundColor: C.surface, borderColor: C.edge }]}
            onPress={() => navigation.navigate(item.route)}
          >
            <Ionicons name={item.icon as any} size={24} color={Colors.green} />
            <Text style={[styles.gridText, { color: C.text }]}>{item.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <SectionTitle title="Administrative" />
      <View style={styles.grid}>
        {adminScreens.map((item) => (
          <TouchableOpacity
            key={item.name}
            style={[styles.gridItem, { backgroundColor: C.surface, borderColor: C.edge }]}
            onPress={() => navigation.navigate(item.route)}
          >
            <Ionicons name={item.icon as any} size={24} color={Colors.red} />
            <Text style={[styles.gridText, { color: C.text }]}>{item.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <SectionTitle title="Role Simulation" />
      <View style={styles.row}>
        <CButton
          title="Citizen"
          onPress={() => setUiMode('citizen')}
          variant={uiMode === 'citizen' ? 'primary' : 'outline'}
          style={{ flex: 1 }}
          size="sm"
        />
        <CButton
          title="Merchant"
          onPress={() => setUiMode('merchant')}
          variant={uiMode === 'merchant' ? 'primary' : 'outline'}
          style={{ flex: 1, marginLeft: 8 }}
          size="sm"
        />
      </View>
      <View style={[styles.row, { marginTop: 8 }]}>
        <CButton
          title="Agent"
          onPress={() => setUiMode('agent')}
          variant={uiMode === 'agent' ? 'primary' : 'outline'}
          style={{ flex: 1 }}
          size="sm"
        />
        <CButton
          title="Admin"
          onPress={() => setUiMode('admin')}
          variant={uiMode === 'admin' ? 'primary' : 'outline'}
          style={{ flex: 1, marginLeft: 8 }}
          size="sm"
        />
      </View>
    </View>
  );

  const renderMocksTab = () => (
    <View style={styles.tabContent}>
      <SectionTitle title="Wallet & Finance" />
      <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.edge }]}>
        <Text style={[styles.cardTitle, { color: C.text }]}>Balance: {fmtETB(balance)}</Text>
        <View style={styles.row}>
          <CButton
            title="+1000 ETB"
            onPress={() => setBalance(balance + 1000)}
            size="sm"
            style={{ flex: 1 }}
          />
          <CButton
            title="-500 ETB"
            onPress={() => setBalance(Math.max(0, balance - 500))}
            size="sm"
            style={{ flex: 1, marginLeft: 8 }}
            variant="outline"
          />
        </View>
        <CButton
          title="Mock P2P Claim Alert"
          onPress={() => {
            setPendingP2PClaim({
              id: 'dev-p2p-' + Date.now(),
              sender_id: 'mock-user-1',
              recipient_id: currentUser?.id || 'me',
              amount: 450.5,
              note: 'Payment for Marketplace Order #123',
              status: 'PENDING',
              created_at: new Date().toISOString(),
            });
            showToast('Mock P2P claim triggered!', 'success');
          }}
          size="sm"
          style={{ marginTop: 8 }}
          variant="secondary"
        />
      </View>

      <SectionTitle title="System Interaction Mocks" />
      <View style={styles.row}>
        <CButton
          title="Mock Order Notif"
          onPress={() =>
            addNotification({
              id: 'notif-' + Date.now(),
              user_id: currentUser?.id || 'dev',
              title: 'New Order Received!',
              message: 'Order #MKP-992 from John Doe is awaiting preparation.',
              type: 'order',
              read: false,
              created_at: new Date().toISOString(),
            })
          }
          style={{ flex: 1 }}
          size="sm"
        />
        <CButton
          title="Mock Security Notif"
          onPress={() =>
            addNotification({
              id: 'notif-sec-' + Date.now(),
              user_id: currentUser?.id || 'dev',
              title: 'Security Alert',
              message: 'New login detected from Addis Ababa.',
              type: 'security',
              read: false,
              created_at: new Date().toISOString(),
            })
          }
          variant="outline"
          style={{ flex: 1, marginLeft: 8 }}
          size="sm"
        />
      </View>
      <CButton
        title="Mock System Broadcast"
        onPress={() =>
          addNotification({
            id: 'notif-sys-' + Date.now(),
            user_id: currentUser?.id || 'dev',
            title: 'System Maintenance',
            message: 'Scheduled maintenance tonight at 2:00 AM.',
            type: 'general',
            read: false,
            created_at: new Date().toISOString(),
          })
        }
        variant="ghost"
        style={{ marginTop: 8 }}
        size="sm"
      />
    </View>
  );

  const renderStateTab = () => (
    <View style={styles.tabContent}>
      <SectionTitle title="App State" />
      <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.edge }]}>
        <Text style={[styles.stateRow, { color: C.text }]}>
          User: {currentUser?.full_name || 'Guest'}
        </Text>
        <Text style={[styles.stateRow, { color: C.text }]}>Role: {currentUser?.role || 'N/A'}</Text>
        <Text style={[styles.stateRow, { color: C.text }]}>UI Mode: {uiMode}</Text>
        <Text style={[styles.stateRow, { color: C.text }]}>Language: {lang}</Text>
        <Text style={[styles.stateRow, { color: C.text }]}>Theme: {isDark ? 'Dark' : 'Light'}</Text>
      </View>

      <SectionTitle title="System Actions" />
      <View style={styles.row}>
        <Text style={{ color: C.text, flex: 1, fontSize: 16, fontFamily: Fonts.bold }}>
          Dark Mode
        </Text>
        <Switch value={isDark} onValueChange={() => toggleTheme()} />
      </View>

      <CButton
        title="Logout (Mock)"
        onPress={() =>
          Alert.alert('Logout', 'Are you sure?', [
            { text: 'Cancel' },
            { text: 'Logout', onPress: signOut },
          ])
        }
        variant="outline"
        style={{ marginTop: 24, borderColor: Colors.red }}
        textStyle={{ color: Colors.red }}
      />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <TopBar title="🛠️ Dev Portal" showBack />

      <View style={[styles.tabBar, { borderBottomColor: C.edge }]}>
        {(['nav', 'mocks', 'state'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[
              styles.tab,
              activeTab === tab && { borderBottomColor: C.primary, borderBottomWidth: 3 },
            ]}
          >
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === tab ? C.primary : C.sub },
                activeTab === tab && { fontFamily: Fonts.black },
              ]}
            >
              {tab.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {activeTab === 'nav' && renderNavTab()}
        {activeTab === 'mocks' && renderMocksTab()}
        {activeTab === 'state' && renderStateTab()}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: C.edge }]}>
        <Text style={{ color: C.sub, fontSize: 10, fontFamily: Fonts.medium }}>
          CityLink Dev Build v1.0.0-PROD-AUDIT
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 12,
    fontFamily: Fonts.bold,
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  tabContent: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  gridItem: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: Radius.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  gridText: {
    fontSize: 10,
    marginTop: 8,
    fontFamily: Fonts.bold,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  card: {
    padding: 16,
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginBottom: 16,
    ...Shadow.md,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: Fonts.black,
    marginBottom: 12,
  },
  stateRow: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    marginBottom: 6,
  },
  footer: {
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 1,
  },
});
