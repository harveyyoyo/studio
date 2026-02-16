'use client';
import { useState, useEffect } from 'react';
import { onSnapshot, Query, CollectionReference } from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

export function useCollection<T>(query: Query<T> | CollectionReference<T> | null) {
    const [data, setData] = useState<T[]>([]);
    const [error, setError] = useState<Error | null>(null);
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

    useEffect(() => {
        if (!query) {
            setData([]);
            setStatus('success');
            return;
        }

        setStatus('loading');
        const unsubscribe = onSnapshot(query, 
            (snapshot) => {
                const data = snapshot.docs.map(doc => ({...doc.data(), id: doc.id}));
                setData(data as T[]);
                setStatus('success');
            },
            (err: any) => {
                 if (err.code === 'permission-denied') {
                    const path = 'path' in query ? query.path : 'Unknown collection path';
                    const permissionError = new FirestorePermissionError({
                        path: path,
                        operation: 'list',
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
    }, [query]);

    return { data, error, status };
}
