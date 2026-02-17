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
  const [classId, setClassId] = useState('');
  const { toast } = useToast();

  const isEditing = !!student;
  const canAssignClass = true;

  useEffect(() => {
    if (isOpen) {
      if (student) { // Edit mode
        setFirstName(student.firstName);
        setLastName(student.lastName);
        setPoints(student.points.toString());
        setNfcId(student.nfcId);
        setClassId(student.classId || '');
      } else { // Create mode
        setFirstName('');
        setLastName('');
        setPoints('0');
        setNfcId('');
        setClassId(db.classes[0]?.id || '');
      }
    }
  }, [student, isOpen, db.classes]);

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
      const updatedStudent: Student = { ...student, firstName, lastName, nfcId, points: parseInt(points) || 0, classId: classId };
      await updateStudent(updatedStudent);
      toast({ title: 'Student updated!' });
    } else {
      const newStudent = {
        firstName, lastName, nfcId,
        points: parseInt(points) || 0,
        classId: classId,
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
          {canAssignClass && (
            <div className="space-y-1">
              <Label htmlFor="class">Assign to Class</Label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger id="class"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {db.classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
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
