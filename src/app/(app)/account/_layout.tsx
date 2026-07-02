import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect, Stack, type Href } from 'expo-router';

import { useAuth } from '@/features/auth';
import { COURSES_ROUTE, isTeacherAuth } from '@/lib/auth/accountRoutes';

export default function AccountLayout() {
  const { auth, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isTeacherAuth(auth)) {
    return <Redirect href={COURSES_ROUTE as Href} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
