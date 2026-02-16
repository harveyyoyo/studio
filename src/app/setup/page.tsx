'use client';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/components/AppProvider';

export default function SchoolSetupPage() {
  const [schoolIdInput, setSchoolIdInput] = useState('');
  const { setSchoolId } = useAppContext();

  const handleConnect = () => {
    if (schoolIdInput) {
      setSchoolId(schoolIdInput);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-10">
      <Card className="w-full max-w-md border-t-4 border-primary shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold font-headline">
            Welcome!
          </CardTitle>
          <CardDescription className="text-sm">
            Enter a unique ID for your school to sync data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label
                htmlFor="setupSchoolId"
                className="block text-sm font-bold text-slate-600 mb-1"
              >
                School ID / Code
              </Label>
              <Input
                type="text"
                id="setupSchoolId"
                className="w-full p-3 font-code lowercase"
                placeholder="e.g. lincoln_high_2024"
                value={schoolIdInput}
                onChange={(e) => setSchoolIdInput(e.target.value.trim())}
                onKeyPress={(e) => e.key === 'Enter' && handleConnect()}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Share this ID with other teachers to connect to the same data.
              </p>
            </div>
            <Button
              onClick={handleConnect}
              className="w-full font-bold shadow-lg"
              disabled={!schoolIdInput}
            >
              Connect to School
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
