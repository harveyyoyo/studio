'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex items-center justify-center min-h-screen p-4 bg-background">
            <Card className="max-w-lg w-full text-center">
                <CardHeader>
                <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit">
                    <AlertCircle className="w-10 h-10 text-destructive" />
                </div>
                <CardTitle className="text-2xl mt-4">Application Error</CardTitle>
                <CardDescription>
                    Something went wrong. You can try to recover by clicking the button below.
                </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button
                        onClick={() => reset()}
                        className="mt-6 w-full"
                    >
                        Try again
                    </Button>
                </CardContent>
            </Card>
        </div>
      </body>
    </html>
  );
}
