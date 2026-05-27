import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function LessonRoute() {
  const params = useLocalSearchParams<{
    lesson_id?: string;
    web_destination?: string;
    course_number?: string;
  }>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>课程加载中</Text>
      <Text style={styles.subtitle}>WebView 课时页将在 Phase 5 接入</Text>
      {params.lesson_id ? (
        <Text style={styles.meta}>lesson_id: {params.lesson_id}</Text>
      ) : null}
      {params.web_destination ? (
        <Text style={styles.meta} numberOfLines={3}>
          destination: {params.web_destination}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#25b8dd',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1760c4',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
  },
  meta: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
});
