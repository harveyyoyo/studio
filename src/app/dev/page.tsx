'use client';

import React from 'react';
import { useAppContext } from '@/components/AppProvider';
import { Button } from '@/components/ui/button';

export default function DevPage() {
  const { 
    migrateStudents, 
    migrateClasses, 
    migrateTeachers, 
    migratePrizes, 
    migrateCoupons, 
    schoolId 
  } = useAppContext();

  const handleMigrateStudents = async () => {
    if (schoolId) {
      await migrateStudents(schoolId);
    }
  };

  const handleMigrateClasses = async () => {
    if (schoolId) {
      await migrateClasses(schoolId);
    }
  };

  const handleMigrateTeachers = async () => {
    if (schoolId) {
      await migrateTeachers(schoolId);
    }
  };

  const handleMigratePrizes = async () => {
    if (schoolId) {
      await migratePrizes(schoolId);
    }
  };

  const handleMigrateCoupons = async () => {
    if (schoolId) {
      await migrateCoupons(schoolId);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Developer Tools</h1>
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Student Migration</h2>
          <p className="text-gray-600 mb-2">
            Migrate students from the main school document to a subcollection.
          </p>
          <Button onClick={handleMigrateStudents} disabled={!schoolId}>
            Migrate Students for Current School
          </Button>
        </div>
        <div>
          <h2 className="text-xl font-semibold">Class Migration</h2>
          <p className="text-gray-600 mb-2">
            Migrate classes from the main school document to a subcollection.
          </p>
          <Button onClick={handleMigrateClasses} disabled={!schoolId}>
            Migrate Classes for Current School
          </Button>
        </div>
        <div>
          <h2 className="text-xl font-semibold">Teacher Migration</h2>
          <p className="text-gray-600 mb-2">
            Migrate teachers from the main school document to a subcollection.
          </p>
          <Button onClick={handleMigrateTeachers} disabled={!schoolId}>
            Migrate Teachers for Current School
          </Button>
        </div>
        <div>
          <h2 className="text-xl font-semibold">Prize Migration</h2>
          <p className="text-gray-600 mb-2">
            Migrate prizes from the main school document to a subcollection.
          </p>
          <Button onClick={handleMigratePrizes} disabled={!schoolId}>
            Migrate Prizes for Current School
          </Button>
        </div>
        <div>
          <h2 className="text-xl font-semibold">Coupon Migration</h2>
          <p className="text-gray-600 mb-2">
            Migrate coupons from the main school document to a subcollection.
          </p>
          <Button onClick={handleMigrateCoupons} disabled={!schoolId}>
            Migrate Coupons for Current School
          </Button>
        </div>
      </div>
    </div>
  );
}
