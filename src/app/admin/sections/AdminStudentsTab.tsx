'use client';

import { Award, Edit, History, LayoutDashboard, Plus, Printer, Trash2, UploadCloud, Users, Wand2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Helper } from '@/components/ui/helper';
import { cn } from '@/lib/utils';
import type { Class, Student, Teacher } from '@/lib/types';

export function AdminStudentsTab({
  settings,
  classes,
  students,
  filteredStudents,
  studentCsvInputRef,
  onStudentCsvFileChange,
  handleStudentCsvUpload,
  selectionMode,
  setSelectionMode,
  selectedStudentIds,
  setSelectedStudentIds,
  isAllFilteredSelected,
  toggleSelectAllFiltered,
  studentSearchTerm,
  setStudentSearchTerm,
  studentSortOption,
  setStudentSortOption,
  studentFilterClass,
  setStudentFilterClass,
  setStudentsToPrint,
  handleDtcPrintClick,
  getClassName,
  handleOpenStudentModal,
  handleOpenActivityModal,
  setThemeStudent,
  setBadgesStudent,
  deleteStudent,
  setStudentToPurge,
}: {
  settings: { photoDisplayMode?: 'cover' | 'contain'; enableBadges?: boolean };
  classes: Class[] | null | undefined;
  students: Student[] | null | undefined;
  filteredStudents: Student[];
  studentCsvInputRef: React.RefObject<HTMLInputElement>;
  onStudentCsvFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleStudentCsvUpload: () => void;
  selectionMode: boolean;
  setSelectionMode: (v: boolean) => void;
  selectedStudentIds: Set<string>;
  setSelectedStudentIds: (updater: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  isAllFilteredSelected: boolean;
  toggleSelectAllFiltered: () => void;
  studentSearchTerm: string;
  setStudentSearchTerm: (v: string) => void;
  studentSortOption: string;
  setStudentSortOption: (v: string) => void;
  studentFilterClass: string;
  setStudentFilterClass: (v: string) => void;
  setStudentsToPrint: (args: { students: Student[]; classes: Class[]; printerType?: 'dtc4500e' }) => void;
  handleDtcPrintClick: () => void;
  getClassName: (id: string) => string;
  handleOpenStudentModal: (s: Student | null) => void;
  handleOpenActivityModal: (s: Student) => void;
  setThemeStudent: (s: Student) => void;
  setBadgesStudent: (s: Student) => void;
  deleteStudent: (studentId: string) => void;
  setStudentToPurge: (s: Student) => void;
}) {
  return (
    <Card className="border-t-4 border-destructive shadow-md overflow-hidden">
      <CardHeader className="bg-primary/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-8">
        <Helper content="Manage your enrollments, view student activity, and print ID cards. Points are awarded from the Teacher Portal.">
          <CardTitle className="text-2xl flex items-center gap-2">
            <Users className="text-destructive w-6 h-6" /> Students
          </CardTitle>
        </Helper>
        <CardDescription>Manage your enrollments and view student activity.</CardDescription>
        <div className="flex flex-wrap gap-2 w-full pb-1 sm:pb-0">
          <Button onClick={handleStudentCsvUpload} variant="outline" className="rounded-xl px-4">
            <UploadCloud className="mr-2 h-4 w-4" /> Import CSV
          </Button>
          {selectionMode && (
            <Button
              type="button"
              variant="outline"
              onClick={toggleSelectAllFiltered}
              className={cn(
                'rounded-xl px-3 h-11 whitespace-nowrap',
                isAllFilteredSelected ? 'bg-secondary/40' : 'bg-orange-50 text-orange-800 border-orange-200'
              )}
            >
              {isAllFilteredSelected ? 'Deselect All' : 'Select All'}
            </Button>
          )}
          <Button
            onClick={() => {
              const filtered = filteredStudents;

              if (selectionMode && selectedStudentIds.size > 0) {
                const selected = students?.filter((s) => selectedStudentIds.has(s.id)) || [];
                setStudentsToPrint({ students: selected, classes: classes || [] });
              } else {
                setStudentsToPrint({ students: filtered, classes: classes || [] });
              }
            }}
            variant={(selectionMode && selectedStudentIds.size >= 1) || studentFilterClass !== 'all' ? 'default' : 'outline'}
            className={cn(
              'rounded-xl px-4',
              ((selectionMode && selectedStudentIds.size >= 1) || studentFilterClass !== 'all') && 'bg-orange-500 hover:bg-orange-600 font-bold'
            )}
          >
            <Printer className="mr-2 h-4 w-4" />
            {selectionMode && selectedStudentIds.size >= 1
              ? `Print Selected (${selectedStudentIds.size})`
              : studentFilterClass !== 'all'
                ? `Print Class (${students?.filter((s) => s.classId === studentFilterClass).length || 0})`
                : 'Bulk ID Print'}
          </Button>
          <Button
            onClick={handleDtcPrintClick}
            disabled={selectionMode && selectedStudentIds.size > 1}
            variant={selectionMode && selectedStudentIds.size === 1 ? 'default' : 'outline'}
            className={cn(
              'rounded-xl px-4',
              selectionMode && selectedStudentIds.size === 1
                ? 'bg-amber-500 hover:bg-amber-600 font-bold'
                : 'bg-orange-50 hover:bg-orange-100 text-orange-800 border-orange-200'
            )}
          >
            <Printer className="mr-2 h-4 w-4" />
            {selectionMode && selectedStudentIds.size === 1 ? 'Print Selected (DTC)' : 'DTC Card Print'}
          </Button>
          <Button onClick={() => handleOpenStudentModal(null)} className="rounded-xl">
            <Plus className="mr-2 h-4 w-4" /> Add Student
          </Button>
          <input type="file" ref={studentCsvInputRef} onChange={onStudentCsvFileChange} className="hidden" accept=".csv" />
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-grow">
            <Input
              placeholder="Search by name, nickname, or ID..."
              value={studentSearchTerm}
              onChange={(e) => setStudentSearchTerm(e.target.value)}
              className="rounded-full pl-10 h-11"
            />
            <LayoutDashboard className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <Select value={studentSortOption} onValueChange={setStudentSortOption}>
              <SelectTrigger className="w-[180px] rounded-xl h-11">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lastNameAsc">Last Name (A-Z)</SelectItem>
                <SelectItem value="lastNameDesc">Last Name (Z-A)</SelectItem>
                <SelectItem value="firstNameAsc">First Name (A-Z)</SelectItem>
                <SelectItem value="firstNameDesc">First Name (Z-A)</SelectItem>
                <SelectItem value="pointsDesc">Points (High - Low)</SelectItem>
                <SelectItem value="pointsAsc">Points (Low - High)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={studentFilterClass} onValueChange={setStudentFilterClass}>
              <SelectTrigger className="w-[180px] rounded-xl h-11">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 bg-secondary/30 px-4 h-11 rounded-xl border">
              <Label htmlFor="selection-mode" className="text-sm font-bold opacity-70">
                Select
              </Label>
              <Switch
                id="selection-mode"
                checked={selectionMode}
                onCheckedChange={(checked) => {
                  setSelectionMode(checked);
                  if (!checked) setSelectedStudentIds(new Set());
                }}
              />
            </div>
          </div>
        </div>

        <ScrollArea className="h-[500px]">
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-4">
            {filteredStudents.map((s) => (
              <li
                key={s.id}
                className={cn(
                  'flex flex-col sm:flex-row justify-between sm:items-center gap-4 p-4 rounded-2xl border transition-all hover:bg-background shadow-sm',
                  selectionMode && 'cursor-pointer',
                  selectedStudentIds.has(s.id)
                    ? 'bg-primary/5 border-primary/40 ring-1 ring-primary/20'
                    : 'bg-secondary/20 border-transparent'
                )}
                onClick={() => {
                  if (!selectionMode) return;
                  setSelectedStudentIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(s.id)) next.delete(s.id);
                    else next.add(s.id);
                    return next;
                  });
                }}
              >
                <div className="flex items-center gap-3">
                  {selectionMode && (
                    <Checkbox
                      checked={selectedStudentIds.has(s.id)}
                      onCheckedChange={(checked) => {
                        const next = new Set(selectedStudentIds);
                        if (checked) next.add(s.id);
                        else next.delete(s.id);
                        setSelectedStudentIds(next);
                      }}
                      className="mr-2"
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-primary/10 border border-border/40 flex items-center justify-center font-bold text-primary flex-shrink-0">
                    {s.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.photoUrl}
                        alt={`${s.firstName} ${s.lastName}`}
                        className={settings.photoDisplayMode === 'cover' ? 'h-full w-full object-cover' : 'h-full w-full object-contain'}
                      />
                    ) : (
                      <span>
                        {(s.firstName[0] || '')}
                        {(s.lastName[0] || '')}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-lg">
                      {s.lastName}, {s.firstName}
                    </p>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5">
                      {getClassName(s.classId || '')} | ID: <span className="font-code">{s.nfcId || '---'}</span>
                    </p>
                    <p className="text-primary font-bold text-xs mt-1">{s.points} pts accumulated</p>
                  </div>
                </div>
                <div className="flex gap-1.5 self-end sm:self-center" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-full"
                    onClick={() => setThemeStudent(s)}
                    title="Generate AI Theme"
                  >
                    <Wand2 className="w-4 h-4 text-purple-500" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={() => handleOpenActivityModal(s)}>
                    <History className="w-4 h-4" />
                  </Button>
                  {settings.enableBadges && (
                    <Button
                      variant="outline"
                      size="icon"
                      className={cn('h-9 w-9 rounded-full', (!s.earnedBadges || s.earnedBadges.length === 0) && 'opacity-40')}
                      disabled={!s.earnedBadges || s.earnedBadges.length === 0}
                      onClick={() => setBadgesStudent(s)}
                      title="View badges for this student"
                    >
                      <Award
                        className={cn(
                          'w-4 h-4',
                          !s.earnedBadges || s.earnedBadges.length === 0 ? 'text-muted-foreground' : 'text-amber-500'
                        )}
                      />
                    </Button>
                  )}
                  <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={() => handleOpenStudentModal(s)}>
                    <Edit className="w-4 h-4 text-blue-500" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-full text-amber-600 hover:bg-amber-50"
                    title="Purge points & badges"
                    onClick={() => setStudentToPurge(s)}
                  >
                    <Zap className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-full text-red-500 hover:bg-red-50"
                    onClick={() => deleteStudent(s.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

