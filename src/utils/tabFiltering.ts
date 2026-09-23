import { fileExistsAtPath } from "./fs"

const EXISTENCE_CHECK_CONCURRENCY = 16

/**
 * Filters file paths to exclude deleted files from disk
 * @param filePaths Array of file system paths to filter
 * @returns Promise resolving to array of existing file paths
 */
export async function filterExistingFiles(filePaths: string[]): Promise<string[]> {
	const filteredPaths: string[] = []

	for (let offset = 0; offset < filePaths.length; offset += EXISTENCE_CHECK_CONCURRENCY) {
		const batch = filePaths.slice(offset, offset + EXISTENCE_CHECK_CONCURRENCY)
		const results = await Promise.all(batch.map((filePath) => (filePath ? fileExistsAtPath(filePath) : false)))
		for (let index = 0; index < batch.length; index++) {
			if (results[index]) filteredPaths.push(batch[index])
		}
	}

	return filteredPaths
}
