'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/components/AppProvider';
import { useRouter } from 'next/navigation';

export default function TeacherLoginPage() {
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const { db, loginTeacher, isInitialized, schoolId } = useAppContext();
  const router = useRouter();
  
  useEffect(() => {
    if (isInitialized && !schoolId) {
      router.replace('/setup');
    }
  }, [schoolId, isInitialized, router]);

  if (!isInitialized || !schoolId) {
    return <p>Loading...</p>;
  }

  const handleLogin = () => {
    const teacher = db.teachers.find((t) => t.id === selectedTeacherId);
    if (teacher) {
      loginTeacher(teacher);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-10">
      <Card className="w-full max-w-md border-t-4 border-indigo-500 shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold font-headline">
            Teacher Login
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label
                htmlFor="teacher-select"
                className="block text-sm font-bold text-slate-600 mb-1"
              >
                Select Your Name
              </Label>
              <Select
                value={selectedTeacherId}
                onValueChange={setSelectedTeacherId}
              >
                <SelectTrigger id="teacher-select">
                  <SelectValue placeholder="-- Choose Teacher --" />
                </SelectTrigger>
                <SelectContent>
                  {db.teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleLogin}
              className="w-full font-bold shadow-lg shadow-indigo-200"
              disabled={!selectedTeacherId}
            >
              Enter Station
            </Button>
            <p className="text-center text-xs text-muted-foreground mt-4">
              Don't see your name? Ask an Admin to add you.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
