import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  StyleSheet,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { DarkColors as T, Fonts, Radius, Spacing, Shadow } from '../../theme';
import { D } from '../../screens/merchant/components/StitchTheme';
import { t } from '../../utils/i18n';
import { Typography, Surface } from '../index';

interface FoodManagementModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (product: any) => void;
  editingProduct: any | null;
  uploading: boolean;
  pickImage: () => void;
  selectedImage: any | null;
}

export function FoodManagementModal({
  visible,
  onClose,
  onSave,
  editingProduct,
  uploading,
  pickImage,
  selectedImage,
}: FoodManagementModalProps) {
  const [form, setForm] = useState({
    name: '',
    price: '',
    category: 'Main Course',
    stock: '99',
    description: '',
    prep_time: '15',
    is_spicy: false,
    spice_level: 0,
    dietary: [] as string[],
    ingredients: '',
    variations: [] as { id: string; name: string; price: string }[],
    extras: [] as { id: string; name: string; price: string }[],
  });

  useEffect(() => {
    if (editingProduct) {
      setForm({
        name: editingProduct.name || editingProduct.title || '',
        price: String(editingProduct.price || ''),
        category: editingProduct.category || 'Main Course',
        stock: String(editingProduct.stock || '99'),
        description: editingProduct.description || '',
        prep_time: String(editingProduct.prep_time || '15'),
        is_spicy: !!editingProduct.is_spicy,
        spice_level: editingProduct.spice_level || 0,
        dietary: editingProduct.dietary || [],
        ingredients: (editingProduct.ingredients || []).join(', '),
        variations: editingProduct.variations || [],
        extras: editingProduct.extras || [],
      });
    } else {
      setForm({
        name: '',
        price: '',
        category: 'Main Course',
        stock: '99',
        description: '',
        prep_time: '15',
        is_spicy: false,
        spice_level: 0,
        dietary: [],
        ingredients: '',
        variations: [],
        extras: [],
      });
    }
  }, [editingProduct, visible]);

  const toggleDietary = (tag: string) => {
    setForm(prev => ({
      ...prev,
      dietary: prev.dietary.includes(tag) 
        ? prev.dietary.filter(t => t !== tag) 
        : [...prev.dietary, tag]
    }));
  };

  const addVariation = () => {
    setForm(prev => ({
      ...prev,
      variations: [...prev.variations, { id: Math.random().toString(), name: '', price: '' }]
    }));
  };

  const addExtra = () => {
    setForm(prev => ({
      ...prev,
      extras: [...prev.extras, { id: Math.random().toString(), name: '', price: '' }]
    }));
  };

  const handleSave = () => {
    onSave({
      ...form,
      id: editingProduct?.id,
      price: parseFloat(form.price) || 0,
      stock: parseInt(form.stock),
      prep_time: parseInt(form.prep_time),
      ingredients: form.ingredients.split(',').map(i => i.trim()).filter(i => i),
      variations: form.variations.filter(v => v.name),
      extras: form.extras.filter(e => e.name),
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <Surface variant="lift" style={styles.container}>
          <View style={styles.header}>
            <View>
              <Typography variant="h2">{editingProduct ? 'Edit Dish' : 'New Dish'}</Typography>
              <Typography variant="hint" color="sub">Chef's Menu Management</Typography>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={D.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Image Picker */}
            <TouchableOpacity style={styles.imageBox} onPress={pickImage}>
              {selectedImage || editingProduct?.image_url ? (
                <Image 
                  source={{ uri: selectedImage?.uri || editingProduct?.image_url }} 
                  style={styles.fullImage} 
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="fast-food-outline" size={40} color={D.primary} />
                  <Typography variant="title" color="primary">Upload Food Photo</Typography>
                </View>
              )}
              <View style={styles.imageOverlay}>
                <Ionicons name="camera" size={20} color="#FFF" />
              </View>
            </TouchableOpacity>

            <View style={styles.formSection}>
              <Typography variant="hint" color="sub" style={styles.label}>DISH NAME</Typography>
              <TextInput
                style={styles.input}
                placeholder="e.g. Signature Kitfo"
                placeholderTextColor={D.edge}
                value={form.name}
                onChangeText={t => setForm({ ...form, name: t })}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.formSection, { flex: 1 }]}>
                <Typography variant="hint" color="sub" style={styles.label}>BASE PRICE (ETB)</Typography>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor={D.edge}
                  value={form.price}
                  onChangeText={t => setForm({ ...form, price: t })}
                />
              </View>
              <View style={[styles.formSection, { flex: 1 }]}>
                <Typography variant="hint" color="sub" style={styles.label}>PREP TIME (MIN)</Typography>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="15"
                  placeholderTextColor={D.edge}
                  value={form.prep_time}
                  onChangeText={t => setForm({ ...form, prep_time: t })}
                />
              </View>
            </View>

            {/* Variations Section */}
            <View style={styles.formSection}>
              <View style={styles.sectionHeader}>
                <Typography variant="hint" color="sub" style={styles.label}>VARIATIONS (E.G. SIZES, TYPES)</Typography>
                <TouchableOpacity onPress={addVariation}>
                  <Typography variant="hint" color="primary">+ ADD</Typography>
                </TouchableOpacity>
              </View>
              {form.variations.map((v, i) => (
                <View key={v.id} style={styles.varRow}>
                   <TextInput
                    style={[styles.input, { flex: 2, marginRight: 8 }]}
                    placeholder="Name (e.g. Large)"
                    placeholderTextColor={D.edge}
                    value={v.name}
                    onChangeText={t => {
                      const newVars = [...form.variations];
                      newVars[i].name = t;
                      setForm({ ...form, variations: newVars });
                    }}
                  />
                  <TextInput
                    style={[styles.input, { flex: 1, marginRight: 8 }]}
                    placeholder="Price"
                    keyboardType="numeric"
                    placeholderTextColor={D.edge}
                    value={v.price}
                    onChangeText={t => {
                      const newVars = [...form.variations];
                      newVars[i].price = t;
                      setForm({ ...form, variations: newVars });
                    }}
                  />
                  <TouchableOpacity onPress={() => setForm({ ...form, variations: form.variations.filter(x => x.id !== v.id) })}>
                    <Ionicons name="trash-outline" size={20} color={D.red} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Extras Section */}
            <View style={styles.formSection}>
              <View style={styles.sectionHeader}>
                <Typography variant="hint" color="sub" style={styles.label}>EXTRAS / ADD-ONS</Typography>
                <TouchableOpacity onPress={addExtra}>
                  <Typography variant="hint" color="primary">+ ADD</Typography>
                </TouchableOpacity>
              </View>
              {form.extras.map((e, i) => (
                <View key={e.id} style={styles.varRow}>
                   <TextInput
                    style={[styles.input, { flex: 2, marginRight: 8 }]}
                    placeholder="Extra (e.g. Cheese)"
                    placeholderTextColor={D.edge}
                    value={e.name}
                    onChangeText={t => {
                      const newExts = [...form.extras];
                      newExts[i].name = t;
                      setForm({ ...form, extras: newExts });
                    }}
                  />
                  <TextInput
                    style={[styles.input, { flex: 1, marginRight: 8 }]}
                    placeholder="+ Price"
                    keyboardType="numeric"
                    placeholderTextColor={D.edge}
                    value={e.price}
                    onChangeText={t => {
                      const newExts = [...form.extras];
                      newExts[i].price = t;
                      setForm({ ...form, extras: newExts });
                    }}
                  />
                  <TouchableOpacity onPress={() => setForm({ ...form, extras: form.extras.filter(x => x.id !== e.id) })}>
                    <Ionicons name="trash-outline" size={20} color={D.red} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <View style={styles.formSection}>
              <Typography variant="hint" color="sub" style={styles.label}>CATEGORY</Typography>
              <View style={styles.tagCloud}>
                {['Appetizer', 'Main Course', 'Dessert', 'Drink', 'Side'].map(cat => (
                  <TouchableOpacity 
                    key={cat}
                    onPress={() => setForm({ ...form, category: cat })}
                    style={[styles.tag, form.category === cat && styles.tagActive]}
                  >
                    <Text style={[styles.tagText, form.category === cat && styles.tagTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formSection}>
              <View style={styles.switchRow}>
                <View>
                  <Typography variant="title">Spicy Dish</Typography>
                  <Typography variant="hint" color="sub">Display chili icon to customers</Typography>
                </View>
                <Switch 
                  value={form.is_spicy} 
                  onValueChange={v => setForm({ ...form, is_spicy: v })}
                  trackColor={{ false: D.lift, true: D.primary }}
                />
              </View>
              {form.is_spicy && (
                <MotiView from={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 60 }} style={styles.spiceLevels}>
                  {[1, 2, 3, 4, 5].map(lvl => (
                    <TouchableOpacity 
                      key={lvl} 
                      onPress={() => setForm({ ...form, spice_level: lvl })}
                      style={[styles.spiceBtn, form.spice_level >= lvl && { backgroundColor: D.red }]}
                    >
                      <Ionicons name="flame" size={16} color={form.spice_level >= lvl ? "#FFF" : D.edge} />
                    </TouchableOpacity>
                  ))}
                </MotiView>
              )}
            </View>

            <View style={styles.formSection}>
              <Typography variant="hint" color="sub" style={styles.label}>DIETARY TAGS</Typography>
              <View style={styles.tagCloud}>
                {['Halal', 'Vegan', 'Vegetarian', 'Gluten-Free', 'Nut-Free'].map(tag => (
                  <TouchableOpacity 
                    key={tag}
                    onPress={() => toggleDietary(tag)}
                    style={[styles.tag, form.dietary.includes(tag) && { borderColor: D.secondary, backgroundColor: D.secondary + '15' }]}
                  >
                    <Text style={[styles.tagText, form.dietary.includes(tag) && { color: D.secondary }]}>{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formSection}>
              <Typography variant="hint" color="sub" style={styles.label}>DESCRIPTION / CHEF'S NOTES</Typography>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                multiline
                placeholder="Briefly describe this dish..."
                placeholderTextColor={D.edge}
                value={form.description}
                onChangeText={t => setForm({ ...form, description: t })}
              />
            </View>
          </ScrollView>


          <TouchableOpacity 
            style={[styles.saveBtn, uploading && { opacity: 0.7 }]} 
            onPress={handleSave}
            disabled={uploading}
          >
            {uploading ? <ActivityIndicator color={D.ink} /> : <Typography variant="h3" style={{ color: D.ink }}>{editingProduct ? 'Update Dish' : 'Add to Menu'}</Typography>}
          </TouchableOpacity>
        </Surface>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
  container: { height: '90%', borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl },
  closeBtn: { padding: 8, backgroundColor: D.lift, borderRadius: 20 },
  imageBox: { height: 180, borderRadius: Radius.l, backgroundColor: D.base, overflow: 'hidden', marginBottom: Spacing.xl, borderWidth: 1, borderColor: D.edge },
  fullImage: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  imageOverlay: { position: 'absolute', bottom: 12, right: 12, backgroundColor: D.primary, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', ...Shadow.primary },
  formSection: { marginBottom: Spacing.xl },
  label: { marginBottom: 8, letterSpacing: 1 },
  input: { backgroundColor: D.base, borderRadius: Radius.l, padding: Spacing.md, color: D.text, fontFamily: Fonts.bold, borderWidth: 1, borderColor: D.edge },
  row: { flexDirection: 'row', gap: Spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  varRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  tagCloud: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.m, borderWidth: 1, borderColor: D.edge, backgroundColor: D.lift },
  tagActive: { backgroundColor: D.primary, borderColor: D.primary },
  tagText: { fontSize: 12, fontFamily: Fonts.bold, color: D.sub },
  tagTextActive: { color: D.ink },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  spiceLevels: { flexDirection: 'row', gap: 8, marginTop: 12, alignItems: 'center' },
  spiceBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: D.base, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: D.edge },
  saveBtn: { backgroundColor: D.primary, padding: Spacing.lg, borderRadius: Radius.l, alignItems: 'center', justifyContent: 'center', ...Shadow.primary },
});
