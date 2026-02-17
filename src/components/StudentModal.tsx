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
import type { Student } from '@/lib/types';

interface StudentModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  student: Student | null;
}

export function StudentModal({ isOpen, setIsOpen, student }: StudentModalProps) {
  const { db, addStudent, updateStudent } = useAppContext();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [points, setPoints] = useState('0');
  const [nfcId, setNfcId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const { toast } = useToast();

  const isEditing = !!student;
  const canAssignTeacher = true; // Admin can always assign teachers

  useEffect(() => {
    if (isOpen) {
      if (student) { // Edit mode
        setName(student.name);
        setPassword(student.password);
        setPoints(student.points.toString());
        setNfcId(student.nfcId);
        setTeacherId(student.teacherId);
      } else { // Create mode
        setName('');
        setPassword('1234');
        setPoints('0');
        setNfcId('');
        setTeacherId(db.teachers[0]?.id || '');
      }
    }
  }, [student, isOpen, db.teachers]);

  const handleSave = async () => {
    if (!name) {
      toast({ variant: 'destructive', title: 'Student name is required.' });
      return;
    }
    if (!nfcId) {
      toast({ variant: 'destructive', title: 'NFC ID is required.' });
      return;
    }

    if (isEditing && student) {
      const updatedStudent: Student = { ...student, name, password, nfcId, points: parseInt(points) || 0, teacherId };
      await updateStudent(updatedStudent);
      toast({ title: 'Student updated!' });
    } else {
      const newStudent = {
        name, password, nfcId,
        points: parseInt(points) || 0,
        teacherId: teacherId,
      };
      await addStudent(newStudent);
      toast({ title: 'Student added!' });
    }
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Student' : 'New Student'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-1">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input id="password" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="nfcId">NFC ID</Label>
            <Input id="nfcId" value={nfcId} onChange={e => setNfcId(e.target.value)} placeholder="Tap card or enter ID..." />
          </div>
          <div className="space-y-1">
            <Label htmlFor="points">Points</Label>
            <Input id="points" type="number" value={points} onChange={e => setPoints(e.target.value)} />
          </div>
          {canAssignTeacher && (
            <div className="space-y-1">
              <Label htmlFor="teacher">Assign to Teacher</Label>
              <Select value={teacherId} onValueChange={setTeacherId}>
                <SelectTrigger id="teacher"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {db.teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button type="submit" onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
