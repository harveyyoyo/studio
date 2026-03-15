import { ChangeEvent, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppContext } from '@/components/AppProvider';
import { useToast } from '@/hooks/use-toast';
import type { Student, Class, Teacher, StudentTheme } from '@/lib/types';
import { useFirestore, useFunctions } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useSettings } from '@/components/providers/SettingsProvider';
import { ScrollArea } from './ui/scroll-area';
import { Checkbox } from './ui/checkbox';
import { getStudentNickname } from '@/lib/utils';
import { httpsCallable } from 'firebase/functions';
import { ThemeGeneratorModal } from './ThemeGeneratorModal';
import { Wand2 } from 'lucide-react';

interface StudentModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  student: Student | null;
  allStudents: Student[];
  allClasses: Class[];
  allTeachers: Teacher[];
}

export function StudentModal({ isOpen, setIsOpen, student, allStudents, allClasses, allTeachers }: StudentModalProps) {
  const { addStudent, updateStudent, schoolId } = useAppContext();
  const { settings } = useSettings();
  const firestore = useFirestore();
  const functions = useFunctions();
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [points, setPoints] = useState('0');
  const [nfcId, setNfcId] = useState('');
  const [classId, setClassId] = useState('none');
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  const [theme, setTheme] = useState<StudentTheme | undefined>(undefined);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const { toast } = useToast();
  const playSound = useArcadeSound();

  const isEditing = !!student;

  useEffect(() => {
    if (isOpen) {
      if (student) { // Edit mode
        setFirstName(student.firstName);
        setMiddleName(student.middleName || '');
        setLastName(student.lastName);
        setNickname(student.nickname || '');
        setPoints(student.points.toString());
        setNfcId(student.nfcId || student.id);
        setClassId(student.classId || 'none');
        setSelectedTeacherIds(student.teacherIds || []);
        setTheme(student.theme);
      } else { // Create mode
        setFirstName('');
        setMiddleName('');
        setLastName('');
        setNickname('');
        setPoints('0');
        setNfcId(Math.floor(10000000 + Math.random() * 90000000).toString());
        setClassId('none');
        setSelectedTeacherIds([]);
        setTheme(undefined);
      }
    }
  }, [student, isOpen]);

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!student?.id || !schoolId) {
      playSound('error');
      toast({ variant: 'destructive', title: 'Save the student first, then upload a photo.' });
      e.target.value = '';
      return;
    }
    if (!functions) {
      playSound('error');
      toast({ variant: 'destructive', title: 'Server connection not found.' });
      e.target.value = '';
      return;
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const maxSizeBytes = 2 * 1024 * 1024;
    if (!allowedTypes.includes(file.type)) {
      playSound('error');
      toast({ variant: 'destructive', title: 'Unsupported file type', description: 'Use PNG, JPG, or WebP.' });
      e.target.value = '';
      return;
    }
    if (file.size > maxSizeBytes) {
      playSound('error');
      toast({ variant: 'destructive', title: 'File too large', description: 'Photo must be under 2MB.' });
      e.target.value = '';
      return;
    }

    try {
      setIsPhotoUploading(true);
      const imageBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.includes(',') ? result.split(',')[1] : result;
          resolve(base64 || '');
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });

      const uploadStudentPhoto = httpsCallable<
        { schoolId: string; studentId: string; imageBase64: string; contentType: string },
        { photoUrl: string }
      >(functions, 'uploadStudentPhoto');

      const res = await uploadStudentPhoto({
        schoolId,
        studentId: student.id,
        imageBase64,
        contentType: file.type,
      });

      if (!res.data?.photoUrl) throw new Error('No photo URL returned');
      await updateStudent({ ...student, photoUrl: res.data.photoUrl });
      playSound('success');
      toast({ title: 'Profile photo updated!' });
    } catch (err: any) {
      console.error('Student photo upload failed', err);
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Photo upload failed',
        description: String(err?.message ?? 'Could not upload student photo.'),
      });
    } finally {
      setIsPhotoUploading(false);
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    if (!firstName || !lastName) {
      playSound('error');
      toast({ variant: 'destructive', title: 'First and last name are required.' });
      return;
    }
    if (!nfcId) {
      playSound('error');
      toast({ variant: 'destructive', title: 'Student ID is required.' });
      return;
    }

    // Duplicate check
    const isDuplicate = allStudents.some(s =>
      (s.nfcId === nfcId || s.id === nfcId) && (!isEditing || s.id !== student?.id)
    );

    if (isDuplicate) {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Duplicate Student ID',
        description: `The ID "${nfcId}" is already assigned to another student.`
      });
      return;
    }

    if (!firestore || !schoolId) {
      playSound('error');
      toast({ variant: 'destructive', title: 'Database connection not found.' });
      return;
    }

    const finalClassId = classId === 'none' ? '' : classId;

    if (isEditing && student) {
      const updatedStudent: Student = {
        ...student,
        firstName,
        middleName: middleName || undefined,
        lastName,
        nickname: nickname || undefined,
        points: parseInt(points) || 0,
        classId: finalClassId,
        nfcId,
        teacherIds: selectedTeacherIds,
        theme,
      };
      await updateStudent(updatedStudent);
      playSound('success');
      toast({ title: 'Student updated!' });
    } else {
      const newStudent = {
        nfcId,
        firstName,
        middleName: middleName || undefined,
        lastName,
        nickname: nickname || undefined,
        points: parseInt(points) || 0,
        classId: finalClassId,
        teacherIds: selectedTeacherIds,
        ...(theme ? { theme } : {}),
      };
      await addStudent(newStudent);
      playSound('success');
      toast({ title: 'Student added!' });
    }
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? `Edit ${getStudentNickname(student!)} ${student!.lastName}` : 'New Student'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {isEditing && (
            <div className="space-y-2">
              <Label>Profile Photo</Label>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full overflow-hidden bg-muted border border-border/60 flex items-center justify-center text-xs font-semibold text-muted-foreground">
                  {student?.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={student.photoUrl} alt="Student profile" className={settings.photoDisplayMode === 'cover' ? 'h-full w-full object-cover' : 'h-full w-full object-contain'} />
                  ) : (
                    <span>{(firstName[0] || '')}{(lastName[0] || '')}</span>
                  )}
                </div>
                <div className="flex-1">
                  <Input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handlePhotoUpload}
                    disabled={isPhotoUploading}
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">PNG/JPG/WebP under 2MB.</p>
                </div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="middleName">Middle Name (Optional)</Label>
              <Input id="middleName" value={middleName} onChange={e => setMiddleName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="nickname">Nickname (Optional)</Label>
              <Input id="nickname" value={nickname} onChange={e => setNickname(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="student-id">Student ID (for scanning)</Label>
            <Input id="student-id" value={nfcId} onChange={e => setNfcId(e.target.value)} placeholder="Tap card or enter ID..." />
          </div>
          <div className="space-y-1">
            <Label htmlFor="points">Points</Label>
            <Input id="points" type="number" value={points} onChange={e => setPoints(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="class">Assign to Class</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger id="class"><SelectValue placeholder="Select a class..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {allClasses
                  ?.slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Student Theme (optional)</Label>
            <p className="text-xs text-muted-foreground">
              Use AI to generate a personalized look for this student&apos;s portal and ID card.
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => setIsThemeModalOpen(true)}
              >
                <Wand2 className="w-4 h-4 mr-1 text-purple-500" />
                {theme ? 'Edit Theme' : 'Generate Theme'}
              </Button>
              {theme && (
                <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Theme set
                </span>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <Label>Assign to Teacher(s)</Label>
            <ScrollArea className="h-32 rounded-md border p-2">
              <div className="space-y-2">
                {allTeachers.map(teacher => (
                  <div key={teacher.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`teacher-${teacher.id}`}
                      checked={selectedTeacherIds.includes(teacher.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedTeacherIds(prev => [...prev, teacher.id]);
                        } else {
                          setSelectedTeacherIds(prev => prev.filter(id => id !== teacher.id));
                        }
                      }}
                    />
                    <Label htmlFor={`teacher-${teacher.id}`} className="font-normal">{teacher.name}</Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button type="submit" onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
      {isThemeModalOpen && (
        <ThemeGeneratorModal
          isOpen={isThemeModalOpen}
          onOpenChange={setIsThemeModalOpen}
          studentName={firstName || 'Student'}
          currentTheme={theme}
          onSave={(newTheme) => {
            setTheme(newTheme);
            setIsThemeModalOpen(false);
          }}
        />
      )}
    </Dialog>
  );
}
