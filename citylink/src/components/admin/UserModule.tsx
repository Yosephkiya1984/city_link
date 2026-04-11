import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { Radius, Spacing, Fonts, FontSize, Shadow } from '../../theme';
import { supaQuery, getClient } from '../../services/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function UserModule() {
  const theme = useTheme();
  const isMobile = SCREEN_WIDTH < 768;
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchUsers = async () => {
    // Only show loading for the initial fetch to keep UI responsive during real-time updates
    if (users.length === 0) setLoading(true);
    const { data } = await supaQuery((c) =>
      c.from('profiles').select('*').order('created_at', { ascending: false }).limit(100)
    );
    if (data) setUsers(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();

    const client = getClient();
    if (!client) return;

    const subscription = client
      .channel('public:profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchUsers();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const filteredUsers = users.filter(
    (u) =>
      (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.phone || '').includes(search) ||
      (u.id || '').includes(search)
  );

  const renderItem = ({ item, index }) => {
    if (isMobile) {
      return (
        <View
          style={[styles.mobileCard, { backgroundColor: theme.surface, borderColor: theme.rim }]}
        >
          <View style={styles.cardTop}>
            <View style={[styles.avatar, { backgroundColor: theme.primary + '15' }]}>
              <Text style={{ color: theme.primary, fontWeight: '700' }}>
                {item.full_name?.[0] || 'U'}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.userName, { color: theme.text, fontFamily: Fonts.label }]}>
                {item.full_name || 'Anonymous'}
              </Text>
              <Text style={[styles.userId, { color: theme.sub }]}>{item.phone || 'No phone'}</Text>
            </View>
            <View
              style={[
                styles.roleChip,
                { backgroundColor: item.role === 'merchant' ? theme.primary + '15' : theme.rim },
              ]}
            >
              <Text
                style={{
                  color: item.role === 'merchant' ? theme.primary : theme.sub,
                  fontSize: 10,
                  fontWeight: '700',
                }}
              >
                {item.role.toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={[styles.cardDivider, { backgroundColor: theme.rim }]} />
          <View style={styles.cardBottom}>
            <View style={styles.statusBox}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      item.kyc_status === 'VERIFIED' || item.kyc_status === 'APPROVED'
                        ? theme.green
                        : theme.amber,
                  },
                ]}
              />
              <Text style={[styles.statusText, { color: theme.textSoft }]}>
                {item.kyc_status || 'PENDING'}
              </Text>
            </View>
            <TouchableOpacity style={styles.actionBtn}>
              <Text style={{ color: theme.primary, fontSize: 12, fontFamily: Fonts.label }}>
                MANAGE
              </Text>
              <Ionicons name="chevron-forward" size={14} color={theme.primary} />
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.row,
          {
            borderBottomColor: theme.rim,
            backgroundColor: index % 2 === 0 ? 'transparent' : theme.lift,
          },
        ]}
      >
        <View
          style={[styles.cell, { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 12 }]}
        >
          <View style={[styles.avatar, { backgroundColor: theme.primary + '15' }]}>
            <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 13 }}>
              {item.full_name?.[0] || 'U'}
            </Text>
          </View>
          <View>
            <Text style={[styles.userName, { color: theme.text, fontFamily: Fonts.label }]}>
              {item.full_name || 'Anonymous'}
            </Text>
            <Text style={[styles.userId, { color: theme.sub }]}>ID: {item.id.slice(0, 8)}</Text>
          </View>
        </View>
        <View style={[styles.cell, { flex: 1.2 }]}>
          <Text style={[styles.phoneText, { color: theme.textSoft }]}>{item.phone}</Text>
        </View>
        <View style={[styles.cell, { flex: 1 }]}>
          <View
            style={[
              styles.roleChip,
              { backgroundColor: item.role === 'merchant' ? theme.primary + '15' : theme.rim },
            ]}
          >
            <Text
              style={{
                color: item.role === 'merchant' ? theme.primary : theme.sub,
                fontSize: 10,
                fontWeight: '700',
              }}
            >
              {item.role.toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={[styles.cell, { flex: 1 }]}>
          <View style={styles.statusBox}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    item.kyc_status === 'VERIFIED' || item.kyc_status === 'APPROVED'
                      ? theme.green
                      : theme.amber,
                },
              ]}
            />
            <Text style={[styles.statusText, { color: theme.textSoft }]}>
              {item.kyc_status || 'NONE'}
            </Text>
          </View>
        </View>
        <View
          style={[styles.cell, { width: 80, alignItems: 'center', justifyContent: 'flex-end' }]}
        >
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="ellipsis-vertical" size={18} color={theme.sub} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, isMobile && { padding: 16 }]}>
        <View style={styles.searchBox}>
          <View
            style={[
              styles.searchInputWrap,
              { backgroundColor: theme.surface, borderColor: theme.rim },
            ]}
          >
            <Ionicons name="search-outline" size={18} color={theme.sub} />
            <TextInput
              placeholder="Search directory..."
              placeholderTextColor={theme.sub}
              value={search}
              onChangeText={setSearch}
              style={[styles.searchInput, { color: theme.text, fontFamily: Fonts.body }]}
            />
          </View>
        </View>
      </View>

      {!isMobile && (
        <View
          style={[
            styles.tableHeader,
            { backgroundColor: theme.lift, borderBottomColor: theme.rim },
          ]}
        >
          <Text style={[styles.headerCell, { flex: 2 }]}>IDENTITY / USER</Text>
          <Text style={[styles.headerCell, { flex: 1.2 }]}>CONTACT</Text>
          <Text style={[styles.headerCell, { flex: 1 }]}>ROLE</Text>
          <Text style={[styles.headerCell, { flex: 1 }]}>KYC STATUS</Text>
          <Text style={[styles.headerCell, { width: 80, textAlign: 'right' }]}>ACTIONS</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 100, padding: isMobile ? 16 : 0 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 24,
  },
  searchBox: {
    flexDirection: 'row',
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerCell: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  cell: {
    justifyContent: 'center',
  },
  mobileCard: {
    padding: 16,
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardDivider: {
    height: 1,
    marginVertical: 12,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 14,
  },
  userId: {
    fontSize: 11,
    marginTop: 2,
  },
  roleChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
