import { DriveFileInfo } from './types';

// Google Drive API Root V3
const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';

/**
 * Creates a generic helper to make authenticated requests to Google Drive REST API.
 */
async function driveFetch(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<any> {
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${DRIVE_API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Google Drive API Error Response:', errText);
    throw new Error(`Google Drive API error: ${response.statusText} (${response.status})`);
  }

  // Some operations (like delete) return no content
  if (response.status === 204) {
    return true;
  }

  return response.json();
}

/**
 * Find a folder by name and optional parent.
 */
export async function findFolder(
  token: string,
  folderName: string,
  parentFolderId?: string
): Promise<string | null> {
  let query = `name = '${folderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  if (parentFolderId) {
    query += ` and '${parentFolderId}' in parents`;
  }

  const url = `/files?q=${encodeURIComponent(query)}&fields=files(id,name)`;
  const result = await driveFetch(url, token, { method: 'GET' });
  
  if (result.files && result.files.length > 0) {
    return result.files[0].id;
  }
  return null;
}

/**
 * Create a folder in Google Drive. If parentFolderId is provided, nests it.
 */
export async function createFolder(
  token: string,
  folderName: string,
  parentFolderId?: string
): Promise<string> {
  const body: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };

  if (parentFolderId) {
    body.parents = [parentFolderId];
  }

  const result = await driveFetch('/files?fields=id,name', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  return result.id;
}

/**
 * Get or create the main folder "Paint CRM Projects" at root.
 */
export async function getOrCreateMainCRMFolder(token: string): Promise<string> {
  const existingId = await findFolder(token, 'Paint CRM Projects');
  if (existingId) {
    return existingId;
  }
  return createFolder(token, 'Paint CRM Projects');
}

/**
 * Get or create a folder for a specific client.
 */
export async function getOrCreateClientFolder(
  token: string,
  clientName: string,
  parentFolderId: string
): Promise<string> {
  const folderName = `Client - ${clientName}`;
  const existingId = await findFolder(token, folderName, parentFolderId);
  if (existingId) {
    return existingId;
  }
  return createFolder(token, folderName, parentFolderId);
}

/**
 * List files within a folder.
 */
export async function listFolderFiles(
  token: string,
  folderId: string
): Promise<DriveFileInfo[]> {
  const query = `'${folderId}' in parents and trashed = false`;
  const url = `/files?q=${encodeURIComponent(query)}&orderBy=name&fields=files(id,name,mimeType,webViewLink,iconLink,thumbnailLink,size)&pageSize=100`;
  const result = await driveFetch(url, token, { method: 'GET' });
  return result.files || [];
}

/**
 * Upload a text/markdown/HTML file representing an Estimate into a folder.
 */
export async function uploadEstimateToDrive(
  token: string,
  folderId: string,
  fileName: string,
  fileContent: string,
  mimeType: string = 'text/markdown'
): Promise<DriveFileInfo> {
  // We use multipart upload so we can send metadata AND body content together
  const boundary = '314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: fileName,
    mimeType: mimeType,
    parents: [folderId],
  };

  const multipartBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}; charset=UTF-8\r\n\r\n` +
    fileContent +
    closeDelimiter;

  const response = await fetch(`${DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,iconLink,thumbnailLink,size`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Multipart upload error:', errText);
    throw new Error(`Google Drive Upload API error: ${response.statusText} (${response.status})`);
  }

  return response.json();
}

/**
 * Upload a binary file (e.g. photos of room pre-paint / post-paint) using FormData.
 */
export async function uploadFileToDrive(
  token: string,
  folderId: string,
  file: File
): Promise<DriveFileInfo> {
  const boundary = '314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  // Reader to get raw data
  const metadata = {
    name: file.name,
    parents: [folderId],
  };

  const fileReader = new FileReader();
  
  const fileArrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    fileReader.onload = () => resolve(fileReader.result as ArrayBuffer);
    fileReader.onerror = reject;
    fileReader.readAsArrayBuffer(file);
  });

  const metadataPart = delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`;

  const footerPart = closeDelimiter;

  // Combine headers and files into array buffer
  const encoder = new TextEncoder();
  const metadataBuffer = encoder.encode(metadataPart);
  const footerBuffer = encoder.encode(footerPart);

  const finalBuffer = new Uint8Array(
    metadataBuffer.byteLength + fileArrayBuffer.byteLength + footerBuffer.byteLength
  );
  
  finalBuffer.set(metadataBuffer, 0);
  finalBuffer.set(new Uint8Array(fileArrayBuffer), metadataBuffer.byteLength);
  finalBuffer.set(footerBuffer, metadataBuffer.byteLength + fileArrayBuffer.byteLength);

  const response = await fetch(`${DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,iconLink,thumbnailLink,size`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: finalBuffer,
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Binary multipart upload error:', errText);
    throw new Error(`Google Drive Upload API error: ${response.statusText} (${response.status})`);
  }

  return response.json();
}

/**
 * Delete a file in Google Drive. Requires confirmation!
 */
export async function deleteDriveFile(token: string, fileId: string): Promise<boolean> {
  return driveFetch(`/files/${fileId}`, token, {
    method: 'DELETE',
  });
}
