import { useAuth } from 'react-oidc-context';

export function useApiClient() {
  const auth = useAuth();

  async function apiFetch(path, options = {}) {
    if (auth.user?.expired) {
      await auth.signinSilent();
    }

    let res;
    try {
      res = await fetch(`${process.env.REACT_APP_API_BASE}${path}`, {
        ...options,
        credentials: 'include', // sends httpOnly cookies automatically
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
    } catch (err) {
      throw new Error('Network request failed.')
    }

    if (res.status === 401) {
      await auth.signoutRedirect();
      return;
    }

    const body = await res.json().catch(() => ({ error: 'Unexpected response from server' }));

    if (!res.ok) {
      console.error(`Request failed with status ${res.status}`);
      return { error: 'Request failed.' };
    }

    return body;
  }

  /**
   * Requests a presigned URL to download the specified file from S3
   * @param {string} key The key of the file to fetch
   * @param {boolean} getUrl If true, only returns the url. If false, the file is automatically downloaded.
   * @returns 
   */
  async function downloadFile(key, getUrl) {
    // Step 1: get a presigned download URL from your Lambda
    let downloadUrl;
    try {
      const res = await apiFetch('/download', {
        method: 'POST',
        body: JSON.stringify({ key }),
      });

      if (res.notFound) {
        return;
      }

      downloadUrl = res.downloadUrl;
    } catch (err) {
      // console.error(`Download request failed with status ${res.status}`);
      throw new Error('Failed to fetch file from server.')
    }

    if (getUrl) return downloadUrl;

    // Step 2: fetch the file from S3 and trigger a browser download.
    // Can't just set window.location.href because that would expose
    // the presigned URL in browser history.
    const res = await fetch(downloadUrl);
    const blob = await res.blob();

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = key.split('/').pop() ?? 'download';
    a.click();

    // clean up the object URL after the download starts
    URL.revokeObjectURL(url);
  }

  return { apiFetch, downloadFile };
}
