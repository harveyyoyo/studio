const admin = require('firebase-admin');

// Uses Application Default Credentials.
// Configure GOOGLE_APPLICATION_CREDENTIALS or run in a trusted GCP environment.
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

async function updateTeachers() {
    const schoolsSnapshot = await db.collection('schools').get();
    let count = 0;

    console.log("Starting migration of existing teachers...");

    for (const schoolDoc of schoolsSnapshot.docs) {
        const teachersSnapshot = await schoolDoc.ref.collection('teachers').get();

        for (const teacherDoc of teachersSnapshot.docs) {
            const data = teacherDoc.data();
            if (!data.username || !data.passcode) {
                // Create a simple username based on their display name
                let username = (data.name || 'teacher').toLowerCase().replace(/[^a-z0-9]/g, '');
                if (!username) username = `teacher${Math.floor(Math.random() * 1000)}`;

                await teacherDoc.ref.update({
                    username: username,
                    passcode: '1234' // Default passcode
                });

                console.log(`[School: ${schoolDoc.id}] Updated teacher '${data.name}' -> Username: ${username}, Passcode: 1234`);
                count++;
            }
        }
    }

    console.log(`Finished updating ${count} teachers. They can now log in using these credentials! Admins can change these in the dashboard.`);
}

updateTeachers().then(() => process.exit(0)).catch((err) => {
    console.error(err);
    process.exit(1);
});
