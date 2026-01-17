import { createClient } from '@/lib/supabase/client'

const BUCKET_NAME = 'trade-screenshots'

/**
 * Upload a trade screenshot to Supabase Storage
 * @param file The image file to upload
 * @param userId The user's ID (used as folder path)
 * @returns The storage path of the uploaded file
 */
export async function uploadTradeScreenshot(file: File, userId: string): Promise<string> {
    const supabase = createClient()

    // Generate unique filename
    const timestamp = Date.now()
    const extension = file.name.split('.').pop() || 'png'
    const fileName = `${userId}/${timestamp}.${extension}`

    const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
        })

    if (error) {
        console.error('[Storage] Upload error:', error)
        throw new Error(`Failed to upload screenshot: ${error.message}`)
    }

    return data.path
}

/**
 * Delete a screenshot from storage
 * @param path The storage path of the file to delete
 */
export async function deleteTradeScreenshot(path: string): Promise<void> {
    const supabase = createClient()

    const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([path])

    if (error) {
        console.error('[Storage] Delete error:', error)
        throw new Error(`Failed to delete screenshot: ${error.message}`)
    }
}

/**
 * Get a public URL for a screenshot
 * @param path The storage path of the file
 * @returns The public URL
 */
export function getScreenshotUrl(path: string): string {
    const supabase = createClient()

    const { data } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(path)

    return data.publicUrl
}

/**
 * Get a signed URL for a private screenshot (valid for 1 hour)
 * @param path The storage path of the file
 * @returns The signed URL
 */
export async function getSignedScreenshotUrl(path: string): Promise<string> {
    const supabase = createClient()

    const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(path, 3600) // 1 hour

    if (error) {
        console.error('[Storage] Signed URL error:', error)
        throw new Error(`Failed to get screenshot URL: ${error.message}`)
    }

    return data.signedUrl
}
