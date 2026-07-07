import { Redirect, type Href } from 'expo-router';

import { StudentManagementScreen } from '@/features/accountAdmin/StudentManagementScreen';
import { useAuth } from '@/features/auth';
import { TEACHER_STUDENTS_ROUTE, isAdminTeacher } from '@/lib/auth/accountRoutes';

export default function AdminStudentsRoute() {
  const { auth } = useAuth();

  if (!isAdminTeacher(auth)) {
    return <Redirect href={TEACHER_STUDENTS_ROUTE as Href} />;
  }

  return <StudentManagementScreen role="admin" />;
}
