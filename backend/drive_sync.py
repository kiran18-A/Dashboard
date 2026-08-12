import os
import io
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload, MediaIoBaseDownload
from dotenv import load_dotenv

load_dotenv()

SCOPES = ['https://www.googleapis.com/auth/drive']

def get_drive_service():
    creds_json = os.getenv('GOOGLE_CREDENTIALS')
    
    if creds_json:
        import json
        try:
            creds_info = json.loads(creds_json)
            creds = service_account.Credentials.from_service_account_info(
                creds_info, scopes=SCOPES)
            service = build('drive', 'v3', credentials=creds)
            return service
        except Exception as e:
            print(f"Error authenticating with GOOGLE_CREDENTIALS from .env: {e}")

    client_email = os.getenv('GOOGLE_CLIENT_EMAIL')
    private_key = os.getenv('GOOGLE_PRIVATE_KEY')
    if client_email and private_key:
        try:
            creds_info = {
                "client_email": client_email.strip('"\' '),
                "private_key": private_key.strip('"\' ').replace('\\n', '\n'),
                "token_uri": "https://oauth2.googleapis.com/token"
            }
            creds = service_account.Credentials.from_service_account_info(
                creds_info, scopes=SCOPES)
            service = build('drive', 'v3', credentials=creds)
            return service
        except Exception as e:
            print(f"Error authenticating with GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY: {e}")

    creds_path = 'credentials.json'
    if not os.path.exists(creds_path):
        print("Warning: credentials.json not found and GOOGLE_CREDENTIALS not in .env. Google Drive sync will fail.")
        return None
    try:
        creds = service_account.Credentials.from_service_account_file(
            creds_path, scopes=SCOPES)
        service = build('drive', 'v3', credentials=creds)
        return service
    except Exception as e:
        print(f"Error authenticating to Google Drive: {e}")
        return None

def get_folder_id():
    return os.getenv('DRIVE_FOLDER_ID') or os.getenv('GOOGLE_DRIVE_FOLDER_ID')

def get_file_id(service, folder_id, filename):
    if not service or not folder_id:
        return None
    try:
        query = f"'{folder_id}' in parents and name = '{filename}' and trashed = false"
        results = service.files().list(q=query, spaces='drive', fields='files(id, name)', includeItemsFromAllDrives=True, supportsAllDrives=True).execute()
        files = results.get('files', [])
        if files:
            return files[0].get('id')
        return None
    except Exception as e:
        print(f"Error finding file ID for {filename}: {e}")
        return None

def upload_stream(filename, stream, is_public=False, mimetype='application/octet-stream'):
    service = get_drive_service()
    folder_id = get_folder_id()
    if not service or not folder_id:
        return None

    try:
        file_id = get_file_id(service, folder_id, filename)
        file_metadata = {'name': filename}
        media = MediaIoBaseUpload(stream, mimetype=mimetype, resumable=True)

        if file_id:
            # Update existing file
            file = service.files().update(
                fileId=file_id,
                media_body=media,
                fields='id, webViewLink, webContentLink',
                supportsAllDrives=True
            ).execute()
        else:
            # Create new file
            file_metadata['parents'] = [folder_id]
            file = service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id, webViewLink, webContentLink',
                supportsAllDrives=True
            ).execute()
            
        if is_public:
            try:
                service.permissions().create(
                    fileId=file.get('id'),
                    body={'type': 'anyone', 'role': 'reader'},
                    supportsAllDrives=True
                ).execute()
            except Exception as perm_e:
                print(f"Could not set public permission: {perm_e}")

        return file.get('id')
    except Exception as e:
        print(f"Error uploading {filename}: {e}")
        return None

def download_stream(filename):
    service = get_drive_service()
    folder_id = get_folder_id()
    if not service or not folder_id:
        return None

    try:
        file_id = get_file_id(service, folder_id, filename)
        if not file_id:
            return None

        request = service.files().get_media(fileId=file_id)
        fh = io.BytesIO()
        downloader = MediaIoBaseDownload(fh, request)
        done = False
        while done is False:
            status, done = downloader.next_chunk()
        
        fh.seek(0)
        return fh
    except Exception as e:
        print(f"Error downloading {filename}: {e}")
        return None
