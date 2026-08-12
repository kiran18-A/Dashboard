import io
import drive_sync

service = drive_sync.get_drive_service()
folder_id = drive_sync.get_folder_id()

print(f"Folder ID: {folder_id}")

filename = "users.xlsx"
file_id = drive_sync.get_file_id(service, folder_id, filename)

if file_id:
    print(f"Found file_id for {filename}: {file_id}")
    try:
        print("Attempting to update the file...")
        stream = io.BytesIO(b"dummy content")
        from googleapiclient.http import MediaIoBaseUpload
        media = MediaIoBaseUpload(stream, mimetype='application/octet-stream', resumable=True)
        file = service.files().update(
            fileId=file_id,
            media_body=media,
            fields='id, webViewLink, webContentLink',
            supportsAllDrives=True
        ).execute()
        print("Update successful!")
    except Exception as e:
        print(f"Error updating file: {e}")
else:
    print(f"Could not find {filename}")
