import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useWalletStore } from '../../store/WalletStore';
import { useSystemStore } from '../../store/SystemStore';
import { verify } from '../../services/payment.service';
import { CButton } from '../../components';

export default function PaymentCallbackScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const C = useTheme();
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function check() {
      const txRef = route.params?.tx_ref;
      if (!txRef) {
        setStatus('failed');
        setError('Missing transaction reference.');
        return;
      }

      try {
        const res = await verify(txRef);
        if (res.status === 'success' && res.data?.status === 'success') {
          setStatus('success');
          // Update local balance
          const { hydrateWallet } = useWalletStore.getState();
          const userId = (await import('../../store/AuthStore')).useAuthStore.getState().currentUser
            ?.id;
          if (userId) await hydrateWallet(userId);
        } else {
          setStatus('failed');
          setError(res.message || 'Verification failed.');
        }
      } catch (e: any) {
        setStatus('failed');
        setError(e.message);
      }
    }
    check();
  }, [route.params]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: C.ink,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 30,
      }}
    >
      {status === 'verifying' ? (
        <>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={{ color: C.text, marginTop: 20, fontSize: 18, fontWeight: '600' }}>
            Verifying Payment...
          </Text>
          <Text style={{ color: C.sub, marginTop: 8, textAlign: 'center' }}>
            Please do not close the app while we confirm your transaction.
          </Text>
        </>
      ) : status === 'success' ? (
        <>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: C.greenL,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}
          >
            <Ionicons name="checkmark-circle" size={50} color={C.green} />
          </View>
          <Text style={{ color: C.text, fontSize: 24, fontWeight: 'bold' }}>
            Payment Successful!
          </Text>
          <Text style={{ color: C.sub, marginTop: 10, textAlign: 'center', marginBottom: 30 }}>
            Your wallet balance has been updated successfully.
          </Text>
          <CButton
            title="Return Home"
            onPress={() => (navigation as any).navigate('CitizenRoot')}
          />
        </>
      ) : (
        <>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: C.redL,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}
          >
            <Ionicons name="close-circle" size={50} color={C.red} />
          </View>
          <Text style={{ color: C.text, fontSize: 24, fontWeight: 'bold' }}>Payment Failed</Text>
          <Text style={{ color: C.red, marginTop: 10, textAlign: 'center', marginBottom: 30 }}>
            {error || 'We could not verify your payment.'}
          </Text>
          <CButton title="Try Again" onPress={() => navigation.goBack()} variant="outline" />
        </>
      )}
    </View>
  );
}
