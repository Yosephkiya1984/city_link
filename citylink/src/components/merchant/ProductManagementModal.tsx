import React from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DarkColors as T, Fonts } from '../../theme';
import { t } from '../../utils/i18n';

interface ProductManagementModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  editingProduct: any | null;
  newProduct: {
    name: string;
    price: string;
    category: string;
    stock: string;
    description: string;
    condition: string;
  };
  setNewProduct: (product: any) => void;
  selectedImage: any | null;
  pickImage: () => void;
  removeImage: () => void;
  uploading: boolean;
}

export function ProductManagementModal({
  visible,
  onClose,
  onSave,
  editingProduct,
  newProduct,
  setNewProduct,
  selectedImage,
  pickImage,
  removeImage,
  uploading,
}: ProductManagementModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingProduct ? t('edit_product_title') : t('add_new_product_title')}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={T.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
            <View style={styles.imagePickerContainer}>
              <Text style={styles.inputLabel}>{t('product_photo')}</Text>
              {selectedImage || editingProduct?.image_url ? (
                <View style={styles.imagePreviewContainer}>
                  <Image
                    source={{ uri: selectedImage?.uri || editingProduct?.image_url }}
                    style={styles.imagePreview}
                  />
                  <TouchableOpacity style={styles.removeImageBtn} onPress={removeImage}>
                    <Ionicons name="close-circle" size={24} color={T.red} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage}>
                  <View style={styles.imageIconCircle}>
                    <Ionicons name="camera" size={24} color={T.primary} />
                  </View>
                  <Text style={styles.imagePickerTxt}>{t('tap_upload_photo')}</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>{t('product_name_label')}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Wireless Headphones"
                placeholderTextColor={T.textSub}
                value={newProduct.name}
                onChangeText={(t) => setNewProduct({ ...newProduct, name: t })}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>{t('price_etb_label')}</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="0.00"
                  placeholderTextColor={T.textSub}
                  keyboardType="numeric"
                  value={newProduct.price}
                  onChangeText={(t) => setNewProduct({ ...newProduct, price: t })}
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>{t('stock_label')}</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="10"
                  placeholderTextColor={T.textSub}
                  keyboardType="numeric"
                  value={newProduct.stock}
                  onChangeText={(t) => setNewProduct({ ...newProduct, stock: t })}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>{t('category_label')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {['Electronics', 'Fashion', 'Home', 'Food', 'Other'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.smallBadge,
                      newProduct.category === cat && { backgroundColor: T.primaryL },
                    ]}
                    onPress={() => setNewProduct({ ...newProduct, category: cat })}
                  >
                    <Text
                      style={[
                        styles.smallBadgeText,
                        newProduct.category === cat && { color: T.primary },
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>{t('description_label')}</Text>
              <TextInput
                style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
                placeholder={t('tell_buyers_about')}
                placeholderTextColor={T.textSub}
                multiline
                value={newProduct.description}
                onChangeText={(t) => setNewProduct({ ...newProduct, description: t })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>{t('condition_label')}</Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {['new', 'like-new', 'good'].map((cond) => (
                  <TouchableOpacity
                    key={cond}
                    style={[
                      styles.smallBadge,
                      newProduct.condition === cond && { backgroundColor: T.primaryL },
                    ]}
                    onPress={() => setNewProduct({ ...newProduct, condition: cond })}
                  >
                    <Text
                      style={[
                        styles.smallBadgeText,
                        newProduct.condition === cond && { color: T.primary },
                      ]}
                    >
                      {cond}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[styles.submitBtn, uploading && { opacity: 0.7 }]}
            onPress={onSave}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.submitBtnText}>
                {editingProduct ? t('save_changes') : t('list_product_btn')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: T.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: T.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: T.text,
  },
  imagePickerContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    color: T.textSub,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  imagePickerBtn: {
    height: 120,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.glass,
    gap: 8,
  },
  imageIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: T.primaryL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePickerTxt: {
    color: T.textSub,
    fontSize: 12,
    fontWeight: '600',
  },
  imagePreviewContainer: {
    height: 120,
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
  },
  formGroup: {
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: T.bg,
    borderRadius: 12,
    padding: 14,
    color: T.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: T.border,
  },
  smallBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface,
  },
  smallBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: T.textSub,
  },
  submitBtn: {
    backgroundColor: T.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  submitBtnText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.5,
  },
});
