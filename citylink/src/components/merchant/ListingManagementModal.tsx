import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import * as ImagePicker from 'expo-image-picker';
import { D, Radius, Fonts, Shadow } from '../../screens/merchant/components/StitchTheme';
import { Typography, Surface } from '../index';

const { height } = Dimensions.get('window');

interface ListingManagementModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (listing: any) => Promise<void>;
  editingListing?: any;
}

export function ListingManagementModal({
  visible,
  onClose,
  onSave,
  editingListing,
}: ListingManagementModalProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    price: '',
    category: 'Real Estate',
    type: 'Rent',
    description: '',
    location: '',
    bedrooms: '',
    bathrooms: '',
    sqft: '',
  });
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    if (editingListing) {
      setForm({
        title: editingListing.title || '',
        price: String(editingListing.price || ''),
        category: editingListing.category || 'Real Estate',
        type: editingListing.type || 'Rent',
        description: editingListing.description || '',
        location: editingListing.location || '',
        bedrooms: String(editingListing.bedrooms || ''),
        bathrooms: String(editingListing.bathrooms || ''),
        sqft: String(editingListing.sqft || ''),
      });
      setImages(editingListing.images || []);
    } else {
      setForm({
        title: '',
        price: '',
        category: 'Real Estate',
        type: 'Rent',
        description: '',
        location: '',
        bedrooms: '',
        bathrooms: '',
        sqft: '',
      });
      setImages([]);
    }
  }, [editingListing, visible]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImages([...images, ...result.assets.map(a => a.uri)]);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave({ ...form, images });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <Surface variant="lift" style={styles.container}>
          <View style={styles.header}>
            <Typography variant="h2">{editingListing ? 'Edit Listing' : 'New Listing'}</Typography>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={D.sub} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            <SectionTitle title="Basic Info" />
            <Input label="Title" value={form.title} onChangeText={(t: string) => setForm({ ...form, title: t })} placeholder="e.g. Luxury Villa in Bole" />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Input label="Price (ETB)" value={form.price} onChangeText={(t: string) => setForm({ ...form, price: t })} keyboardType="numeric" placeholder="0.00" />
              </View>
              <View style={{ flex: 1 }}>
                <Input label="Listing Type" value={form.type} onChangeText={(t: string) => setForm({ ...form, type: t })} placeholder="Rent/Sale" />
              </View>
            </View>

            <SectionTitle title="Media" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <TouchableOpacity style={styles.addImageBtn} onPress={pickImage}>
                <Ionicons name="camera" size={32} color={D.sub} />
                <Typography variant="hint" color="sub">Add Photo</Typography>
              </TouchableOpacity>
              {images.map((uri, i) => (
                <View key={i} style={styles.imagePreview}>
                  <Image source={{ uri }} style={styles.image} />
                  <TouchableOpacity style={styles.removeImg} onPress={() => setImages(images.filter((_, idx) => idx !== i))}>
                    <Ionicons name="close-circle" size={20} color={D.red} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <SectionTitle title="Specs" />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Input label="Bedrooms" value={form.bedrooms} onChangeText={(t: string) => setForm({ ...form, bedrooms: t })} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Input label="Bathrooms" value={form.bathrooms} onChangeText={(t: string) => setForm({ ...form, bathrooms: t })} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Input label="Area (sqft)" value={form.sqft} onChangeText={(t: string) => setForm({ ...form, sqft: t })} keyboardType="numeric" />
              </View>
            </View>

            <Input label="Description" value={form.description} onChangeText={(t: string) => setForm({ ...form, description: t })} multiline numberOfLines={4} placeholder="Describe the property highlights..." />
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
              {loading ? <ActivityIndicator color={D.ink} /> : <Typography variant="h2" style={{ color: D.ink }}>Publish Listing</Typography>}
            </TouchableOpacity>
          </View>
        </Surface>
      </View>
    </Modal>
  );
}

function Input({ label, ...props }: any) {
  return (
    <View style={styles.inputWrap}>
      <Typography variant="hint" color="sub" style={{ marginBottom: 6 }}>{label.toUpperCase()}</Typography>
      <TextInput
        style={styles.input}
        placeholderTextColor={D.sub}
        {...props}
      />
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Typography variant="h3" style={{ marginVertical: 16, color: D.gold }}>{title}</Typography>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  container: { height: height * 0.9, borderTopLeftRadius: Radius['3xl'], borderTopRightRadius: Radius['3xl'], padding: 24, backgroundColor: D.ink },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  inputWrap: { marginBottom: 16 },
  input: { backgroundColor: D.surface, borderRadius: Radius.lg, padding: 16, color: D.white, fontFamily: Fonts.bold, borderWidth: 1, borderColor: D.edge },
  addImageBtn: { width: 100, height: 100, borderRadius: Radius.lg, borderStyle: 'dashed', borderWidth: 2, borderColor: D.edge, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  imagePreview: { width: 100, height: 100, borderRadius: Radius.lg, marginRight: 12, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  removeImg: { position: 'absolute', top: 4, right: 4 },
  footer: { paddingVertical: 16, borderTopWidth: 1, borderTopColor: D.edge },
  saveBtn: { backgroundColor: D.primary, paddingVertical: 18, borderRadius: Radius.xl, alignItems: 'center', ...Shadow.primary },
});
