/** The normal website has no native bridge and keeps its existing PWA behavior. */
export function isDesktop() {
  return typeof window !== 'undefined' && !!window.__TAURI__?.core;
}

export async function initializeDesktop(ui) {
  if (!isDesktop()) return;
  document.documentElement.dataset.platform = 'desktop';
  try {
    const status = await window.__TAURI__.core.invoke('desktop_status');
    ui.showToast(status.shortcutAvailable
      ? `KeyFlow Desktop · ${status.shortcut} brings you back from any app.`
      : `Global shortcut ${status.shortcut} is unavailable. Another app may be using it.`,
    status.shortcutAvailable ? 'teal' : 'amber');
  } catch (error) {
    console.warn('Desktop shortcut status unavailable:', error);
  }
}

/** Save using a user-selected native path, or the browser's download mechanism. */
export async function saveDownload(blob, filename) {
  try {
    if (isDesktop()) {
      const bytes = Array.from(new Uint8Array(await blob.arrayBuffer()));
      return await window.__TAURI__.core.invoke('save_export', { filename, bytes });
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => { link.remove(); URL.revokeObjectURL(url); }, 1000);
    return true;
  } catch (error) {
    console.error('Export failed:', error);
    window.alert(`Could not save the export: ${String(error)}`);
    return false;
  }
}
