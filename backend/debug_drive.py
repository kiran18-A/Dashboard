import os
import drive_sync

service = drive_sync.get_drive_service()
folder_id = drive_sync.get_folder_id()

print(f"Folder ID: {folder_id}")

try:
    results = service.files().list(
        q=f"'{folder_id}' in parents and trashed = false",
        spaces='drive',
        fields='files(id, name, mimeType)',
        includeItemsFromAllDrives=True,
        supportsAllDrives=True
    ).execute()
    files = results.get('files', [])
    print(f"Found {len(files)} files in folder:")
    for f in files:
        print(f" - {f['name']} (ID: {f['id']}, Mime: {f['mimeType']})")
except Exception as e:
    print(f"Error: {e}")
