#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, WindowEvent};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct DesktopStatus {
    shortcut: String,
    shortcut_available: bool,
}

#[tauri::command]
fn desktop_status(status: tauri::State<'_, DesktopStatus>) -> DesktopStatus {
    status.inner().clone()
}

// Async commands run outside the UI thread. The only writable path comes from
// the native save dialog, never from JavaScript.
#[tauri::command]
async fn save_export(
    app: tauri::AppHandle,
    filename: String,
    bytes: Vec<u8>,
) -> Result<bool, String> {
    if bytes.len() > 32 * 1024 * 1024 {
        return Err("Export exceeds 32 MB".into());
    }
    let filename = filename
        .rsplit(['/', '\\'])
        .next()
        .unwrap_or("keyflow-export.json");
    let selected = app
        .dialog()
        .file()
        .set_file_name(filename)
        .blocking_save_file();
    let Some(selected) = selected else {
        return Ok(false);
    };
    let path = selected.into_path().map_err(|e| e.to_string())?;
    std::fs::write(path, bytes).map_err(|e| e.to_string())?;
    Ok(true)
}

fn show_main(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            show_main(app)
        }))
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _, event| {
                    if event.state() == ShortcutState::Pressed {
                        show_main(app);
                    }
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![desktop_status, save_export])
        .setup(|app| {
            // A collision must not prevent users from opening their saved lessons.
            let shortcut = "CommandOrControl+Shift+K";
            let result = app.global_shortcut().register(shortcut);
            if let Err(error) = &result {
                eprintln!("KeyFlow global shortcut unavailable: {error}");
            }
            app.manage(DesktopStatus {
                shortcut: if cfg!(target_os = "macos") {
                    "⌘⇧K".into()
                } else {
                    "Ctrl+Shift+K".into()
                },
                shortcut_available: result.is_ok(),
            });
            Ok(())
        })
        .on_window_event(|window, event| {
            // Closing a Mac window keeps the app and shortcut alive. Cmd+Q quits.
            if cfg!(target_os = "macos") {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    if window.label() == "main" {
                        if window.hide().is_ok() {
                            api.prevent_close();
                        }
                    }
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("failed to build KeyFlow")
        .run(|app, event| {
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Reopen { .. } = event {
                show_main(app);
            }
            #[cfg(not(target_os = "macos"))]
            let _ = (app, event);
        });
}
