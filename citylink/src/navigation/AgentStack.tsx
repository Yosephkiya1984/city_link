import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DeliveryAgentDashboard from '../screens/agent/DeliveryAgentDashboard';

const Stack = createNativeStackNavigator();

export function AgentStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AgentDashboard" component={DeliveryAgentDashboard} />
    </Stack.Navigator>
  );
}
