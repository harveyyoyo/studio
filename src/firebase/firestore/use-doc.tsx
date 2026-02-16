'use client';
import { useState, useEffect } from 'react';
import { onSnapshot, DocumentReference } from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

export function useDoc<T>(ref: DocumentReference<T> | null) {
    const [data, setData] = useState<T | undefined>(undefined);
    const [error, setError] = useState<Error | null>(null);
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

    useEffect(() => {
        if (!ref) {
            setData(undefined);
            setStatus('success'); // No ref, so we are "done"
            return;
        }
        
        setStatus('loading');
        const unsubscribe = onSnapshot(ref, 
            (snapshot) => {
                const data = snapshot.data();
                setData(data);
                setStatus('success');
            },
            (err: any) => {
                if (err.code === 'permission-denied') {
                    const permissionError = new FirestorePermissionError({
                        path: ref.path,
                        operation: 'get',
                    });
                    errorEmitter.emit('permission-error', permissionError);
                    setError(permissionError);
                } else {
                    console.error(err);
                    setError(err);
                }
                setStatus('error');
            }
        );

        return () => unsubscribe();
    }, [ref]);

    return { data, error, status };
}
