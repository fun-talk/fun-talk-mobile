import { Redirect, type Href } from 'expo-router';

import { StudentCreateScreen } from '@/features/accountAdmin/StudentCreateScreen';
import { useAuth } from '@/features/auth';
import { TEACHER_STUDENTS_ROUTE, isAdminTeacher } from '@/lib/auth/accountRoutes';

export default function AdminStudentCreateRoute() {
  const { auth } = useAuth();

  if (!isAdminTeacher(auth)) {
    return <Redirect href={TEACHER_STUDENTS_ROUTE as Href} />;
  }

  return <StudentCreateScreen role="admin" />;
}
