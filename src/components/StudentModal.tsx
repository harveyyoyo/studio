import { useEffect, useState } from 'react';
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
import type { Student, Class } from '@/lib/types';
import { useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useArcadeSound } from '@/hooks/useArcadeSound';

interface StudentModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  student: Student | null;
  allStudents: Student[];
  allClasses: Class[];
}

export function StudentModal({ isOpen, setIsOpen, student, allStudents, allClasses }: StudentModalProps) {
  const { addStudent, updateStudent, schoolId } = useAppContext();
  const firestore = useFirestore();
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [points, setPoints] = useState('0');
  const [nfcId, setNfcId] = useState('');
  const [classId, setClassId] = useState('none');
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
      } else { // Create mode
        setFirstName('');
        setMiddleName('');
        setLastName('');
        setNickname('');
        setPoints('0');
        setNfcId(Math.floor(10000000 + Math.random() * 90000000).toString());
        setClassId('none');
      }
    }
  }, [student, isOpen]);

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
        nfcId 
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
          <DialogTitle>{isEditing ? 'Edit Student' : 'New Student'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
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
                {allClasses?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button type="submit" onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
