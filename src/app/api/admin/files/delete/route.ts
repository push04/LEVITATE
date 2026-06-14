import { NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const { isAuthenticated } = await checkAdminAuth();
        if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { fileId, filePath } = await request.json();

        if (!fileId) {
            return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
        }

        const supabase = getServiceSupabase();

        // 1. Delete from Storage (if filePath provided)
        if (filePath) {
            // Extract the relative path from the full URL if needed, 
            // but usually the DB logic or frontend should provide the storage path.
            // If the URL is full public URL, we need to parse it.
            // Assuming filePath passed from frontend is the path within the bucket.

            // However, the frontend usually has the full URL.
            // Let's rely on the frontend to pass the correct path or extract it here if we know the bucket structure.
            // For now, let's assume the frontend passes the path relative to the bucket or we extract it.

            // If filePath starts with http, try to extract path after 'vault/'
            let storagePath = filePath;
            if (filePath.includes('/vault/')) {
                storagePath = filePath.split('/vault/')[1];
            }

            if (storagePath) {
                const { error: storageError } = await supabase.storage
                    .from('vault')
                    .remove([storagePath]);

                if (storageError) {
                    console.error('Storage Delete Error:', storageError);
                    // Continue to delete metadata even if storage fails? 
                    // promote consistency, but maybe storage failure is temporary.
                    // For now, log and proceed.
                }
            }
        }

        // 2. Delete from DB
        const { error: dbError } = await supabase
            .from('files')
            .delete()
            .eq('id', fileId);

        if (dbError) {
            console.error('DB Delete Error:', dbError);
            return NextResponse.json({ error: 'Failed to delete file record' }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error: unknown) {
        console.error('Delete File API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
