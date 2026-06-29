import { Redirect, type Href } from 'expo-router';

import { TeacherManagementScreen } from '@/features/accountAdmin/TeacherManagementScreen';
import { useAuth } from '@/features/auth';
import { TEACHER_STUDENTS_ROUTE, isAdminTeacher } from '@/lib/auth/accountRoutes';

export default function AdminTeachersRoute() {
  const { auth } = useAuth();

  if (!isAdminTeacher(auth)) {
    return <Redirect href={TEACHER_STUDENTS_ROUTE as Href} />;
  }

  return <TeacherManagementScreen />;
}
