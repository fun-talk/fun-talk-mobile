import { StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/features/auth';

export default function CoursesScreen() {
  const { auth } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>课程首页</Text>
      <Text style={styles.subtitle}>
        {auth?.username || auth?.name || '同学'}，Phase 3 将在此展示课程地图
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
