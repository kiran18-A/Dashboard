import os
import io

LOCAL_STORAGE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'local_storage')

if not os.path.exists(LOCAL_STORAGE_DIR):
    os.makedirs(LOCAL_STORAGE_DIR)

def get_drive_service():
    return None

def get_folder_id():
    return None

def get_file_id(service, folder_id, filename):
    return None

def upload_stream(filename, stream, is_public=False, mimetype='application/octet-stream'):
    """
    Saves the stream locally instead of Google Drive to bypass quota errors.
    Returns the filename as the 'file_id'.
    """
    try:
        file_path = os.path.join(LOCAL_STORAGE_DIR, filename)
        
        # Make sure the stream is at the beginning
        if hasattr(stream, 'seek'):
            stream.seek(0)
            
        with open(file_path, 'wb') as f:
            f.write(stream.read())
            
        print(f"Successfully saved {filename} locally.")
        return filename
    except Exception as e:
        print(f"Error saving {filename} locally: {e}")
        return None

def download_stream(filename):
    """
    Reads the file from local storage and returns an io.BytesIO stream.
    """
    try:
        file_path = os.path.join(LOCAL_STORAGE_DIR, filename)
        if not os.path.exists(file_path):
            return None
            
        with open(file_path, 'rb') as f:
            content = f.read()
            
        fh = io.BytesIO(content)
        fh.seek(0)
        return fh
    except Exception as e:
        print(f"Error reading {filename} locally: {e}")
        return None

