import { useCallback } from 'react';
import { useAuth } from 'react-oidc-context';
import { ApiError, defaultMessageForStatus, errorCodeForStatus } from '../utilities/apiError';

export function useApiClient() {
  const auth = useAuth();

  const apiFetch = useCallback(async (path, options = {}) => {
    const token = auth.user?.id_token;
    
    if (!token) {
      auth.removeUser();
      window.location.href = '/home';
      return;
    }

    let res;
    try {
      res = await fetch(`${import.meta.env.REACT_APP_API_BASE}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.headers,
        },
      });
    } catch (err) {
      throw new ApiError('Unable to reach the server. Check your connection and try again.', 'NETWORK_ERROR', null);
    }
    
    if (res.status === 401) {
      auth.removeUser();
      window.location.href = '/home';
      return;
    }
    
    const body = await res.json().catch(() => (null));
    
    if (!res.ok) {
      console.error(`Request failed with status ${res.status}`);
      throw new ApiError(
        defaultMessageForStatus(res.status),
        errorCodeForStatus(res.status),
        res.status,
      );
    }
    
    return body;
  }, [auth]);
  
  /**
   * Requests a presigned URL to download the specified file from S3
   * @param {string} key The key of the file to fetch
   * @param {boolean} getUrl If true, only returns the url. If false, the file is automatically downloaded.
   * @returns 
  */
 const downloadFile = useCallback(async (key, bucket, getUrl) => {
   // Step 1: get a presigned download URL from your Lambda
   try {
     const res = await apiFetch('/download', {
       method: 'POST',
       body: JSON.stringify({ key, bucket }),
      });
      
      if (!res || res.notFound) {
        return;
      }
    } catch (err) {
      throw new ApiError('Unable to reach the server. Check your connection and try again.', 'NETWORK_ERROR', null);
    }
    
    const downloadUrl = res.downloadUrl;
    if (getUrl) return downloadUrl;

    // Step 2: fetch the file from S3 and trigger a browser download.
    // Can't just set window.location.href because that would expose
    // the presigned URL in browser history.
    try {
      const fileRes = await fetch(downloadUrl);
      const blob = await fileRes.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = key.split('/').pop() ?? 'download';
      a.click();
  
      // clean up the object URL after the download starts
      URL.revokeObjectURL(url);
    } catch {
      throw new ApiError('File download failed. Please try again.', 'DOWNLOAD_ERROR', null);
    }
  }, [apiFetch]);

  return { apiFetch, downloadFile };
}
