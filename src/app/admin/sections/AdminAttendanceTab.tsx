'use client';

import React from 'react';
import { Clock, Loader2, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { AttendanceRewardRule } from '@/lib/types';

export function AdminAttendanceTab(props: any) {
  const {
    schoolId,
    teachers,
    selectedAttendanceTeacherId,
    setSelectedAttendanceTeacherId,
    loadTeacherAttendanceLog,
    teacherAttendanceLogLoading,
    teacherAttendanceConfig,
    teacherAttendanceRewardsLoading,
    teacherAttendanceRewards,
    ruleDrafts,
    setRuleDrafts,
    savingRuleId,
    saveTeacherRewardRule,
    deleteTeacherRewardRule,
    classes,
    attendancePeriodsLoading,
    attendancePeriods,
    categories,
    handleSaveTeacherAttendanceConfig,
    teacherAttendanceSaving,
    teacherAttendanceLog,
    setTeacherAttendanceConfigState,
    UniversalPeriodsAdmin,
  } = props;

  return (
    <>
      <Card className="border-t-4 border-chart-4/60 shadow-md">
        <CardHeader className="py-6">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-chart-4" /> Universal Periods
          </CardTitle>
          <CardDescription>Create and manage period time slots used by all teachers for on-time attendance.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <UniversalPeriodsAdmin schoolId={schoolId!} />
        </CardContent>
      </Card>

      <Card className="border-t-4 border-chart-2/60 shadow-md">
        <CardHeader className="py-6">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-chart-2" /> Teacher Attendance (per-teacher)
          </CardTitle>
          <CardDescription>
            View what each teacher created and edit attendance settings on their behalf. Teachers assign periods to their classes in Teacher Portal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <Label>Teacher</Label>
              <Select value={selectedAttendanceTeacherId || '__none__'} onValueChange={setSelectedAttendanceTeacherId}>
                <SelectTrigger className="w-[260px]">
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachers?.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={loadTeacherAttendanceLog} disabled={teacherAttendanceLogLoading || !selectedAttendanceTeacherId}>
              {teacherAttendanceLogLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Refresh teacher log
            </Button>
          </div>

          {teacherAttendanceConfig && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Attendance reward rules created by this teacher</Label>
                {teacherAttendanceRewardsLoading ? (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading reward rules…
                  </p>
                ) : (teacherAttendanceRewards || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No reward rules found for this teacher yet.</p>
                ) : (
                  <div className="space-y-2">
                    {(teacherAttendanceRewards || []).map((rule: any) => {
                      const draft = ruleDrafts[rule.id] ?? {};
                      const effective: AttendanceRewardRule = { ...rule, ...draft };
                      const hasUnsaved = !!ruleDrafts[rule.id];

                      const className = (classes || []).find((c: any) => c.id === effective.classId)?.name ?? 'Unknown class';
                      const periodLabel =
                        effective.periodId
                          ? (attendancePeriods || []).find((p: any) => p.id === effective.periodId)?.label ?? 'Unknown period'
                          : effective.customPeriod?.label
                            ? effective.customPeriod.label
                            : 'From class assignment';

                      return (
                        <div key={rule.id} className="rounded-2xl border bg-muted/30 p-3 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="min-w-[260px]">
                              <p className="font-bold">{className}</p>
                              <p className="text-xs text-muted-foreground">Period: {periodLabel}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <Label className="text-xs">Enabled</Label>
                                <Switch
                                  checked={!!effective.enabled}
                                  onCheckedChange={(checked) => {
                                    setRuleDrafts((prev: any) => ({
                                      ...prev,
                                      [rule.id]: { ...(prev[rule.id] ?? {}), enabled: checked },
                                    }));
                                  }}
                                />
                              </div>
                              <Button size="sm" onClick={() => saveTeacherRewardRule(rule.id)} disabled={!hasUnsaved || savingRuleId === rule.id}>
                                {savingRuleId === rule.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:bg-red-50"
                                onClick={() => deleteTeacherRewardRule(rule.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
                            <div className="lg:col-span-2 space-y-1">
                              <Label className="text-xs">Class</Label>
                              <Select
                                value={effective.classId}
                                onValueChange={(v) =>
                                  setRuleDrafts((prev: any) => ({
                                    ...prev,
                                    [rule.id]: { ...(prev[rule.id] ?? {}), classId: v },
                                  }))
                                }
                              >
                                <SelectTrigger className="h-10 rounded-xl">
                                  <SelectValue placeholder="Select class" />
                                </SelectTrigger>
                                <SelectContent>
                                  {(classes || []).map((c: any) => (
                                    <SelectItem key={c.id} value={c.id}>
                                      {c.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs">Sign-in points</Label>
                              <Input
                                type="number"
                                min={0}
                                value={effective.pointsForSignIn}
                                onChange={(e) =>
                                  setRuleDrafts((prev: any) => ({
                                    ...prev,
                                    [rule.id]: { ...(prev[rule.id] ?? {}), pointsForSignIn: parseInt(e.target.value, 10) || 0 },
                                  }))
                                }
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs">On-time bonus</Label>
                              <Input
                                type="number"
                                min={0}
                                value={effective.pointsForOnTime}
                                onChange={(e) =>
                                  setRuleDrafts((prev: any) => ({
                                    ...prev,
                                    [rule.id]: { ...(prev[rule.id] ?? {}), pointsForOnTime: parseInt(e.target.value, 10) || 0 },
                                  }))
                                }
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs">Window (min)</Label>
                              <Input
                                type="number"
                                min={1}
                                max={120}
                                value={effective.onTimeWindowMinutes}
                                onChange={(e) =>
                                  setRuleDrafts((prev: any) => ({
                                    ...prev,
                                    [rule.id]: { ...(prev[rule.id] ?? {}), onTimeWindowMinutes: parseInt(e.target.value, 10) || 3 },
                                  }))
                                }
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs">Category</Label>
                              <Select
                                value={effective.categoryId || '__none__'}
                                onValueChange={(v) =>
                                  setRuleDrafts((prev: any) => ({
                                    ...prev,
                                    [rule.id]: { ...(prev[rule.id] ?? {}), categoryId: v === '__none__' ? undefined : v },
                                  }))
                                }
                              >
                                <SelectTrigger className="h-10 rounded-xl">
                                  <SelectValue placeholder="None" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">None</SelectItem>
                                  {(categories || []).map((c: any) => (
                                    <SelectItem key={c.id} value={c.id}>
                                      {c.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Universal period override (optional)</Label>
                              <Select
                                value={effective.periodId || '__none__'}
                                onValueChange={(v) =>
                                  setRuleDrafts((prev: any) => ({
                                    ...prev,
                                    [rule.id]: { ...(prev[rule.id] ?? {}), periodId: v === '__none__' ? undefined : v, customPeriod: undefined },
                                  }))
                                }
                                disabled={attendancePeriodsLoading || (attendancePeriods || []).length === 0}
                              >
                                <SelectTrigger className="h-10 rounded-xl">
                                  <SelectValue placeholder="From class assignment" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">From class assignment</SelectItem>
                                  {(attendancePeriods || []).map((p: any) => (
                                    <SelectItem key={p.id} value={p.id}>
                                      {p.label} ({p.startTime}–{p.endTime})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs">Custom period (optional)</Label>
                              <div className="grid grid-cols-3 gap-2">
                                <Input
                                  value={effective.customPeriod?.label ?? ''}
                                  placeholder="Label"
                                  onChange={(e) => {
                                    const nextLabel = e.target.value;
                                    setRuleDrafts((prev: any) => ({
                                      ...prev,
                                      [rule.id]: {
                                        ...(prev[rule.id] ?? {}),
                                        customPeriod: nextLabel
                                          ? {
                                              label: nextLabel,
                                              startTime: effective.customPeriod?.startTime ?? '08:00',
                                              endTime: effective.customPeriod?.endTime ?? '08:45',
                                            }
                                          : undefined,
                                        periodId: undefined,
                                      },
                                    }));
                                  }}
                                />
                                <Input
                                  value={effective.customPeriod?.startTime ?? ''}
                                  placeholder="Start"
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setRuleDrafts((prev: any) => ({
                                      ...prev,
                                      [rule.id]: {
                                        ...(prev[rule.id] ?? {}),
                                        customPeriod: effective.customPeriod
                                          ? { ...effective.customPeriod, startTime: v }
                                          : v
                                            ? { label: 'Custom', startTime: v, endTime: '08:45' }
                                            : undefined,
                                        periodId: undefined,
                                      },
                                    }));
                                  }}
                                />
                                <Input
                                  value={effective.customPeriod?.endTime ?? ''}
                                  placeholder="End"
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setRuleDrafts((prev: any) => ({
                                      ...prev,
                                      [rule.id]: {
                                        ...(prev[rule.id] ?? {}),
                                        customPeriod: effective.customPeriod
                                          ? { ...effective.customPeriod, endTime: v }
                                          : v
                                            ? { label: 'Custom', startTime: '08:00', endTime: v }
                                            : undefined,
                                        periodId: undefined,
                                      },
                                    }));
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Class → Universal period assignments</Label>
                <div className="space-y-2">
                  {((classes || []).filter((c: any) => c.primaryTeacherId === selectedAttendanceTeacherId)).length === 0 ? (
                    <p className="text-sm text-muted-foreground">This teacher has no classes yet. Assign classes in the `Classes` tab.</p>
                  ) : (
                    (classes || [])
                      .filter((c: any) => c.primaryTeacherId === selectedAttendanceTeacherId)
                      .map((c: any) => {
                        const assignedPeriodId = teacherAttendanceConfig.classPeriodAssignments?.[c.id];
                        return (
                          <div key={c.id} className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-muted/50">
                            <div className="min-w-[200px]">
                              <p className="font-bold">{c.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {assignedPeriodId
                                  ? (attendancePeriods || []).find((p: any) => p.id === assignedPeriodId)?.label || 'Unknown period'
                                  : 'No period assigned'}
                              </p>
                            </div>
                            <Select
                              value={assignedPeriodId || '__none__'}
                              onValueChange={(v) => {
                                const next = { ...(teacherAttendanceConfig.classPeriodAssignments || {}) };
                                if (!v || v === '__none__') delete next[c.id];
                                else next[c.id] = v;
                                setTeacherAttendanceConfigState({
                                  ...teacherAttendanceConfig,
                                  classPeriodAssignments: Object.keys(next).length ? next : undefined,
                                });
                              }}
                              disabled={attendancePeriodsLoading || (attendancePeriods || []).length === 0}
                            >
                              <SelectTrigger className="h-10 w-[260px] rounded-xl">
                                <SelectValue placeholder="Select a period..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">No period</SelectItem>
                                {(attendancePeriods || []).map((p: any) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.label} ({p.startTime}–{p.endTime})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              <Button onClick={handleSaveTeacherAttendanceConfig} disabled={teacherAttendanceSaving}>
                {teacherAttendanceSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save class period assignments
              </Button>

              {teacherAttendanceLog.length > 0 && (
                <div className="space-y-2">
                  <Label>Recent sign-ins (teacher)</Label>
                  <ScrollArea className="h-[240px] w-full pr-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="py-2 font-bold">Student</th>
                          <th className="py-2 font-bold">Time</th>
                          <th className="py-2 font-bold">Points</th>
                          <th className="py-2 font-bold">Period</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teacherAttendanceLog.map((entry: any) => (
                          <tr key={entry.id ?? entry.signedInAt} className="border-b border-border/50">
                            <td className="py-2">{entry.studentName || entry.studentId}</td>
                            <td className="py-2 text-muted-foreground">{new Date(entry.signedInAt).toLocaleString()}</td>
                            <td className="py-2">+{entry.pointsAwarded}</td>
                            <td className="py-2 text-muted-foreground">{entry.periodLabel ?? '–'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

