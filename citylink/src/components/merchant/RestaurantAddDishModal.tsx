import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DarkColors as T, Fonts, Radius } from '../../theme';
import { CButton, CInput } from '../index';
import { t } from '../../utils/i18n';

interface RestaurantAddDishModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (form: any) => void;
  loading?: boolean;
  onPickImage?: () => void;
  selectedImage?: any;
}

const CATEGORIES = ['mains', 'drinks', 'desserts'];

export function RestaurantAddDishModal({
  visible,
  onClose,
  onSubmit,
  loading,
  onPickImage,
  selectedImage,
}: RestaurantAddDishModalProps) {
  const [form, setForm] = useState({ name: '', price: '', category: 'mains', description: '' });

  const handleCreate = () => {
    if (!form.name || !form.price) return;
    onSubmit({ ...form, available: true });
    setForm({ name: '', price: '', category: 'mains', description: '' });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{t('new_gourmet_dish')}</Text>
              <Text style={styles.modalSub}>{t('add_premium_item')}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={T.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Image Picker Area */}
            <TouchableOpacity
              style={styles.imageUploadArea}
              onPress={onPickImage}
              activeOpacity={0.7}
            >
              {selectedImage ? (
                <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="camera-outline" size={32} color={T.textSoft} />
                  <Text style={styles.imagePlaceholderText}>{t('upload_dish_image')}</Text>
                </View>
              )}
              {selectedImage && (
                <View style={styles.changeImageBadge}>
                  <Ionicons name="pencil" size={12} color={T.white} />
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('dish_name_up')}</Text>
              <CInput
                placeholder="e.g. Special Kitfo"
                value={form.name}
                onChangeText={(t: string) => setForm({ ...form, name: t })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('price_etb_label')}</Text>
              <CInput
                placeholder="0.00"
                keyboardType="numeric"
                value={form.price}
                onChangeText={(t: string) => setForm({ ...form, price: t })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('category_label')}</Text>
              <View style={styles.categoryRow}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setForm({ ...form, category: cat })}
                    style={[styles.categoryBtn, form.category === cat && styles.categoryBtnActive]}
                  >
                    <Text
                      style={[
                        styles.categoryBtnTxt,
                        form.category === cat && styles.categoryBtnTxtActive,
                      ]}
                    >
                      {t(cat)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('description_label')}</Text>
              <CInput
                placeholder={t('tell_buyers_about')}
                multiline
                numberOfLines={3}
                value={form.description}
                onChangeText={(t: string) => setForm({ ...form, description: t })}
              />
            </View>

            <View style={styles.footerActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelBtnText}>{t('cancel_btn')}</Text>
              </TouchableOpacity>
              <CButton
                title={t('create_gourmet_item_btn')}
                loading={loading}
                onPress={handleCreate}
                style={styles.submitBtn}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: T.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: T.edge,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  modalTitle: {
    color: T.text,
    fontSize: 22,
    fontFamily: Fonts.black,
  },
  modalSub: {
    color: T.textSoft,
    fontSize: 12,
    fontFamily: Fonts.medium,
    marginTop: 2,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: T.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: T.textSoft,
    fontSize: 10,
    fontFamily: Fonts.bold,
    marginBottom: 8,
    letterSpacing: 1,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  categoryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: T.bg,
    borderWidth: 1,
    borderColor: T.edge,
    alignItems: 'center',
  },
  categoryBtnActive: {
    backgroundColor: T.primaryL,
    borderColor: T.primary,
  },
  categoryBtnTxt: {
    color: T.textSoft,
    fontSize: 11,
    fontFamily: Fonts.bold,
  },
  categoryBtnTxtActive: {
    color: T.primary,
  },
  submitBtn: {
    flex: 2,
    backgroundColor: T.primary,
    height: 56,
    borderRadius: 16,
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.edge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: T.text,
    fontFamily: Fonts.bold,
    fontSize: 14,
  },
  imageUploadArea: {
    width: '100%',
    height: 180,
    borderRadius: 24,
    backgroundColor: T.bg,
    borderWidth: 1,
    borderColor: T.edge,
    borderStyle: 'dashed',
    marginBottom: 24,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholder: {
    alignItems: 'center',
  },
  imagePlaceholderText: {
    color: T.textSoft,
    fontSize: 12,
    fontFamily: Fonts.medium,
    marginTop: 8,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  changeImageBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: T.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: T.surface,
  },
});
