import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

const COURSES_ROUTE = '/(app)/courses' as Href;

export function LessonWebViewScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>课时页需要在 iOS / Android 中打开</Text>
      <Text style={styles.subtitle}>
        Web 预览不支持 WebView 课时。请使用 Expo Go 或 dev build 在真机/模拟器上测试。
      </Text>
      <Pressable style={styles.button} onPress={() => router.replace(COURSES_ROUTE)}>
        <Text style={styles.buttonText}>返回课程首页</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#020617',
    gap: 12,
  },
  title: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    marginTop: 8,
    borderRadius: 999,
    backgroundColor: '#1760c4',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
