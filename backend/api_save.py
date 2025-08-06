import os
import sys
import subprocess
import json

# Ensure UTF-8 encoding for subprocess calls
os.environ['PYTHONIOENCODING'] = 'utf-8'

def get_resource_path(relative_path):
    """
    Returns the absolute path for a file, handling both
    normal execution and PyInstaller-packed environments.
    """
    try:
        # PyInstaller creates a temp folder and stores path in _MEIPASS
        base_path = sys._MEIPASS
    except Exception:
        # Fallback to the current directory
        base_path = os.path.abspath("./api_manager/target/release/")
    return os.path.join(base_path, relative_path)

def get_api_manager_executable():
    """
    Determines the correct executable name based on the operating system.
    """
    if sys.platform == "win32":
        return "api_manager.exe"
    elif sys.platform == "linux":
        return "api_manager"
    else:
        # Handle other platforms, or raise an error for unsupported ones
        raise OSError(f"Unsupported operating system: {sys.platform}")

def fetch_api_key(provider: str) -> str:
    api_manager_exe = get_api_manager_executable()
    cmd = [get_resource_path(api_manager_exe), "-g", provider]
    try:
        result = subprocess.run(
            cmd, 
            capture_output=True, 
            text=True, 
            encoding='utf-8', 
            errors='replace',
            check=True
        )
    except subprocess.CalledProcessError as e:
        stderr = e.stderr or ""
        raise RuntimeError(
            f"Failed to run api_manager, provider={provider}, stderr: {stderr}"
        ) from e

    try:
        data = json.loads(result.stdout)
    except json.JSONDecodeError as e:
        raise RuntimeError(f"api_manager returned incorrect json format: {result.stdout}, error: {str(e)}")
    
    if data.get("provider") == provider and data.get("status") == "success":
        key = data.get("key")
        if key and key.strip():
            return key
        else:
            return ""

    raise RuntimeError(
        f"Failed to fetch API key for {provider}, output: {result.stdout}"
    )

def save_api_key(provider: str, api: str):
    api_manager_exe = get_api_manager_executable()
    # Path is relative in your original script, but should be handled by get_resource_path
    cmd = [get_resource_path(api_manager_exe), "-s", api, provider] 
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace', check=True)
    except subprocess.CalledProcessError as e:
        stderr = e.stderr or ""
        raise RuntimeError(
            f"Failed to run api_manager, provider={provider}, stderr: {stderr}"
        ) from e

    try:
        data = json.loads(result.stdout)
    except json.JSONDecodeError:
        raise RuntimeError(f"api_manager returned incorrect json format: {result.stdout}")
    if data.get("status") != "success":
        raise RuntimeError(
            f"Failed to set {provider} api_key, output: {result.stdout}"
        )

def save_token(provider: str, token: str):
    api_manager_exe = get_api_manager_executable()
    cmd = [get_resource_path(api_manager_exe), "-s", token, provider]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace', check=True)
    except subprocess.CalledProcessError as e:
        stderr = e.stderr or ""
        raise RuntimeError(
            f"Failed to run api_manager, provider={provider}, stderr: {stderr}"
        ) from e

    try:
        data = json.loads(result.stdout)
    except json.JSONDecodeError:
        raise RuntimeError(f"api_manager returned incorrect json format: {result.stdout}")
    if data.get("status") != "success":
        raise RuntimeError(
            f"Failed to set {provider} api_key, output: {result.stdout}"
        )

def delete_api_key(provider: str):
    api_manager_exe = get_api_manager_executable()
    cmd = [get_resource_path(api_manager_exe), "-d", provider]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace', check=True)
    except subprocess.CalledProcessError as e:
        stderr = e.stderr or ""
        raise RuntimeError(
            f"Failed to run api_manager, provider={provider}, stderr: {stderr}"
        ) from e

    try:
        data = json.loads(result.stdout)
    except json.JSONDecodeError:
        raise RuntimeError(f"api_manager returned incorrect json format: {result.stdout}")
    if data.get("status") != "success":
        raise RuntimeError(
            f"Failed to delete {provider} api_key, output: {result.stdout}"
        )

def delete_token(provider: str):
    api_manager_exe = get_api_manager_executable()
    cmd = [get_resource_path(api_manager_exe), "-d", provider]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace', check=True)
    except subprocess.CalledProcessError as e:
        stderr = e.stderr or ""
        raise RuntimeError(
            f"Failed to run api_manager, provider={provider}, stderr: {stderr}"
        ) from e

    try:
        data = json.loads(result.stdout)
    except json.JSONDecodeError:
        raise RuntimeError(f"api_manager returned incorrect json format: {result.stdout}")
    if data.get("status") != "success":
        raise RuntimeError(
            f"Failed to delete {provider} api_key, output: {result.stdout}"
        )

def main():
    # Example usage:
    # `python api.py google`
    if len(sys.argv) > 2:
        action = sys.argv[1]
        provider = sys.argv[2]
        if action == "fetch":
            key = fetch_api_key(provider)
            print(f"API key for {provider}: {key}")
        elif action == "save":
            if len(sys.argv) > 3:
                api_key = sys.argv[3]
                save_api_key(provider, api_key)
                print(f"API key for {provider} saved successfully.")
            else:
                print("Usage: python api.py save <provider> <api_key>")
    else:
        print("Usage: python api.py <action> <provider> [api_key]")

if __name__ == "__main__":
    main()
