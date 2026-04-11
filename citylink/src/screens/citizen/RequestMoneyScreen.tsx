import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import TopBar from '../../components/TopBar';
import { useAppStore } from '../../store/AppStore';
import { Colors, LightColors, FontSize, Radius, Spacing, Shadow, Fonts } from '../../theme';
import { CButton, CInput, SectionTitle } from '../../components';
import { fmtETB, fmtDateTime, uid } from '../../utils';
import { t } from '../../utils/i18n';

export default function RequestMoneyScreen() {
  const navigation = useNavigation();
  const isDark = useAppStore((s) => s.isDark);
  const C = isDark ? Colors : LightColors;
  const currentUser = useAppStore((s) => s.currentUser);
  const addTransaction = useAppStore((s) => s.addTransaction);
  const showToast = useAppStore((s) => s.showToast);

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);
  const [showContacts, setShowContacts] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recentRequests, setRecentRequests] = useState([]);

  // Mock contacts
  const contacts = [
    { id: '1', name: 'John Doe', phone: '+251911234567', avatar: 'ðŸ‘¨â€💼' },
    { id: '2', name: 'Sarah Johnson', phone: '+251912345678', avatar: 'ðŸ‘©â€💼' },
    { id: '3', name: 'Mike Wilson', phone: '+251913456789', avatar: 'ðŸ‘¨â€ðŸ’»' },
    { id: '4', name: 'Emma Davis', phone: '+251914567890', avatar: 'ðŸ‘©â€ðŸŽ“' },
    { id: '5', name: 'Alex Brown', phone: '+251915678901', avatar: 'ðŸ‘¨â€🔧' },
  ];

  // Quick amount options
  const quickAmounts = [50, 100, 200, 500, 1000, 2000];

  // Load recent requests
  useEffect(() => {
    loadRecentRequests();
  }, []);

  const loadRecentRequests = () => {
    // Mock recent requests
    setRecentRequests([
      {
        id: uid(),
        from: 'John Doe',
        amount: 500,
        description: 'Lunch payment',
        status: 'pending',
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: uid(),
        from: 'Sarah Johnson',
        amount: 1000,
        description: 'Shared transport',
        status: 'completed',
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
    ]);
  };

  // Send money request
  const sendRequest = async () => {
    const amt = parseFloat(amount);
    
    if (!amt || amt < 10) {
      showToast('Minimum request amount is 10 ETB', 'error');
      return;
    }

    if (!selectedContact) {
      showToast('Please select a contact', 'error');
      return;
    }

    if (!description.trim()) {
      showToast('Please add a description', 'error');
      return;
    }

    setLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Create transaction record
      const transaction = {
        id: uid(),
        amount: amt,
        type: 'debit',
        category: 'request',
        description: `Request from ${selectedContact.name}: ${description}`,
        from: selectedContact.name,
        to: currentUser?.full_name || 'You',
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      addTransaction(transaction);
      
      // Add to recent requests
      const newRequest = {
        id: transaction.id,
        from: selectedContact.name,
        amount: amt,
        description,
        status: 'pending',
        created_at: transaction.created_at,
      };
      
      setRecentRequests([newRequest, ...recentRequests]);
      
      showToast(`Request of ${fmtETB(amt)} sent to ${selectedContact.name}!`, 'success');
      
      // Reset form
      setAmount('');
      setDescription('');
      setSelectedContact(null);
      setLoading(false);
      
      // Go back
      navigation.goBack();
    } catch (error) {
      showToast('Failed to send request. Please try again.', 'error');
      setLoading(false);
    }
  };

  // Share request link
  const shareRequestLink = () => {
    const amt = parseFloat(amount);
    if (!amt || amt < 10) {
      showToast('Please enter a valid amount', 'error');
      return;
    }

    const requestLink = `https://citylink.et/request/${currentUser?.id}?amount=${amt}&desc=${description || 'Payment request'}`;
    
    // In a real app, this would use the Share API
    Alert.alert(
      'Share Request',
      `Share this request link with ${selectedContact?.name || 'your contact'}:\n\n${requestLink}`,
      [
        { text: 'Copy Link', onPress: () => showToast('Link copied to clipboard!', 'success') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <TopBar title="Request Money" />
      
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 20 }}>
        {/* Contact Selection */}
        <SectionTitle title="Select Contact" />
        <TouchableOpacity
          onPress={() => setShowContacts(true)}
          style={{
            backgroundColor: C.surface,
            borderRadius: Radius.xl,
            padding: 16,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: C.border,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            ...Shadow.md,
          }}
        >
          {selectedContact ? (
            <>
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: C.primary + '20',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 20 }}>{selectedContact.avatar}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontSize: 16, fontFamily: Fonts.black }}>
                  {selectedContact.name}
                </Text>
                <Text style={{ color: C.sub, fontSize: 12, fontFamily: Fonts.medium }}>
                  {selectedContact.phone}
                </Text>
              </View>
              <Ionicons name="checkmark-circle" size={20} color={C.green} />
            </>
          ) : (
            <>
              <Ionicons name="person-add" size={24} color={C.sub} />
              <Text style={{ color: C.sub, fontSize: 16, fontFamily: Fonts.medium, flex: 1 }}>
                Choose a contact
              </Text>
              <Ionicons name="chevron-forward" size={20} color={C.hint} />
            </>
          )}
        </TouchableOpacity>

        {/* Amount Input */}
        <SectionTitle title="Amount" />
        <CInput
          label="Amount (ETB)"
          value={amount}
          onChangeText={setAmount}
          placeholder="500"
          keyboardType="numeric"
          iconName="cash-outline"
        />

        {/* Quick Amounts */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {quickAmounts.map(amt => (
            <TouchableOpacity
              key={amt}
              onPress={() => setAmount(String(amt))}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: Radius.lg,
                backgroundColor: amount === String(amt) ? C.primary : C.surface,
                borderWidth: 1.5,
                borderColor: amount === String(amt) ? C.primary : C.edge2,
              }}
            >
              <Text style={{
                color: amount === String(amt) ? C.white : C.sub,
                fontSize: 12,
                fontFamily: Fonts.bold,
              }}>
                {amt} ETB
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Description */}
        <SectionTitle title="Description" />
        <CInput
          label="What's this for?"
          value={description}
          onChangeText={setDescription}
          placeholder="Lunch payment, shared transport, etc."
          iconName="text-outline"
          multiline
        />

        {/* Request Options */}
        <View style={{ marginTop: 20, gap: 12 }}>
          <CButton
            title="Send Request"
            onPress={sendRequest}
            loading={loading}
            disabled={!amount || !selectedContact || !description}
            icon="send"
          />
          
          <CButton
            title="Share Request Link"
            variant="ghost"
            onPress={shareRequestLink}
            icon="share-social"
            disabled={!amount}
          />
        </View>

        {/* Recent Requests */}
        {recentRequests.length > 0 && (
          <>
            <SectionTitle title="Recent Requests" />
            {recentRequests.map(request => (
              <View
                key={request.id}
                style={{
                  backgroundColor: C.surface,
                  borderRadius: Radius.xl,
                  padding: 16,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: C.border,
                  ...Shadow.md,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.text, fontSize: 16, fontFamily: Fonts.black, marginBottom: 4 }}>
                      {request.from}
                    </Text>
                    <Text style={{ color: C.sub, fontSize: 12, fontFamily: Fonts.medium, marginBottom: 4 }}>
                      {request.description}
                    </Text>
                    <Text style={{ color: C.hint, fontSize: 11, fontFamily: Fonts.medium }}>
                      {fmtDateTime(request.created_at)}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: C.text, fontSize: 16, fontFamily: Fonts.black }}>
                      {fmtETB(request.amount)}
                    </Text>
                    <View style={{
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 4,
                      backgroundColor: request.status === 'completed' ? C.green + '20' : C.amber + '20',
                      marginTop: 4,
                    }}>
                      <Text style={{
                        color: request.status === 'completed' ? C.green : C.amber,
                        fontSize: 10,
                        fontFamily: Fonts.bold,
                        textTransform: 'capitalize',
                      }}>
                        {request.status}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Contact Selection Modal */}
      <Modal visible={showContacts} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ 
            backgroundColor: C.surface, 
            marginTop: 'auto', 
            borderTopLeftRadius: 24, 
            borderTopRightRadius: 24, 
            padding: 24 
          }}>
            <Text style={{ color: C.text, fontSize: 20, fontFamily: Fonts.black, marginBottom: 20 }}>
              Select Contact
            </Text>
            
            <ScrollView style={{ maxHeight: 400 }}>
              {contacts.map(contact => (
                <TouchableOpacity
                  key={contact.id}
                  onPress={() => {
                    setSelectedContact(contact);
                    setShowContacts(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    padding: 12,
                    borderRadius: Radius.lg,
                    marginBottom: 8,
                    backgroundColor: selectedContact?.id === contact.id ? C.primary + '20' : C.lift,
                  }}
                >
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: C.primary + '20',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 20 }}>{contact.avatar}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.text, fontSize: 16, fontFamily: Fonts.black }}>
                      {contact.name}
                    </Text>
                    <Text style={{ color: C.sub, fontSize: 12, fontFamily: Fonts.medium }}>
                      {contact.phone}
                    </Text>
                  </View>
                  {selectedContact?.id === contact.id && (
                    <Ionicons name="checkmark-circle" size={20} color={C.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <CButton
              title="Cancel"
              variant="ghost"
              onPress={() => setShowContacts(false)}
              style={{ marginTop: 16 }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
