import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { MotiView, AnimatePresence } from 'moti';
import { D } from '../../components/hospitality/HospitalityTheme';
import { knowledgeService, KnowledgeItem } from '../../services/knowledge.service';

export const KnowledgeManagerScreen = () => {
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [newContent, setNewContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadKnowledge();
  }, []);

  const loadKnowledge = async () => {
    try {
      setLoading(true);
      const data = await knowledgeService.listKnowledge();
      setKnowledge(data);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newContent.trim()) return;
    try {
      setAdding(true);
      const newItem = await knowledgeService.addKnowledge(newContent, { source: 'Admin Portal' });
      setKnowledge([newItem, ...knowledge]);
      setNewContent('');
    } catch (error: any) {
      Alert.alert('Training Failed', error.message);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Delete Knowledge', 'Are you sure you want the AI to forget this?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await knowledgeService.deleteKnowledge(id);
            setKnowledge(knowledge.filter((k) => k.id !== id));
          } catch (error: any) {
            Alert.alert('Error', error.message);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: KnowledgeItem }) => (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      style={styles.card}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
        <TouchableOpacity onPress={() => handleDelete(item.id)}>
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>
      <Text style={styles.cardContent}>{item.content}</Text>
    </MotiView>
  );

  return (
    <LinearGradient colors={['#0F172A', '#1E1B4B']} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Training Center</Text>
        <Text style={styles.subtitle}>Teach CityLink AI about Addis Ababa</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={D.royal} />
        </View>
      ) : (
        <FlatList
          data={knowledge}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>No knowledge found. Start training!</Text>
          }
        />
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        <BlurView intensity={30} tint="dark" style={styles.inputArea}>
          <TextInput
            style={styles.input}
            placeholder="Tell the AI something new..."
            placeholderTextColor="#94A3B8"
            value={newContent}
            onChangeText={setNewContent}
            multiline
          />
          <TouchableOpacity
            style={[styles.addButton, !newContent.trim() && styles.disabled]}
            onPress={handleAdd}
            disabled={adding || !newContent.trim()}
          >
            {adding ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Ionicons name="sparkles" size={24} color="#FFF" />
            )}
          </TouchableOpacity>
        </BlurView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  list: {
    padding: 20,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardDate: {
    fontSize: 12,
    color: '#64748B',
  },
  cardContent: {
    fontSize: 15,
    color: '#E2E8F0',
    lineHeight: 22,
  },
  inputArea: {
    flexDirection: 'row',
    padding: 20,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 12,
    color: '#FFF',
    fontSize: 16,
    maxHeight: 100,
  },
  addButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    elevation: 5,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  disabled: {
    backgroundColor: '#475569',
    opacity: 0.5,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    color: '#64748B',
    textAlign: 'center',
    marginTop: 40,
  },
});
