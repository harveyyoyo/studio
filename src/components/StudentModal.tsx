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
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [points, setPoints] = useState('0');
  const [nfcId, setNfcId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const { toast } = useToast();

  const isEditing = !!student;

  useEffect(() => {
    if (isOpen) {
      if (student) { // Edit mode
        setFirstName(student.firstName);
        setLastName(student.lastName);
        setPoints(student.points.toString());
        setNfcId(student.nfcId);
        setTeacherId(student.teacherId || '');
      } else { // Create mode
        setFirstName('');
        setLastName('');
        setPoints('0');
        setNfcId('');
        setTeacherId(db.teachers[0]?.id || '');
      }
    }
  }, [student, isOpen, db.teachers]);

  const handleSave = async () => {
    if (!firstName || !lastName) {
      toast({ variant: 'destructive', title: 'First and last name are required.' });
      return;
    }
    if (!nfcId) {
      toast({ variant: 'destructive', title: 'NFC ID is required.' });
      return;
    }

    if (isEditing && student) {
      const updatedStudent: Student = { ...student, firstName, lastName, nfcId, points: parseInt(points) || 0, teacherId: teacherId };
      await updateStudent(updatedStudent);
      toast({ title: 'Student updated!' });
    } else {
      const newStudent = {
        firstName, lastName, nfcId,
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
          <div className="space-y-1">
            <Label htmlFor="nfcId">NFC ID</Label>
            <Input id="nfcId" value={nfcId} onChange={e => setNfcId(e.target.value)} placeholder="Tap card or enter ID..." />
          </div>
          <div className="space-y-1">
            <Label htmlFor="points">Points</Label>
            <Input id="points" type="number" value={points} onChange={e => setPoints(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="teacher">Assign to Teacher</Label>
            <Select value={teacherId} onValueChange={setTeacherId}>
              <SelectTrigger id="teacher"><SelectValue /></SelectTrigger>
              <SelectContent>
                {db.teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
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
