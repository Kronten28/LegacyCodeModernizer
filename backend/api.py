from flask import Flask, redirect, request, jsonify
from flask_cors import CORS
import requests
from translate import migrate_code_str
from dotenv import load_dotenv
import os
import time
from api_save import save_api_key, delete_api_key, save_token, delete_token
from datetime import datetime
import base64

load_dotenv()
app = Flask(__name__)

allowed_origins = os.getenv("FRONTEND_ORIGIN", "http://localhost:8080")

origins = [o.strip() for o in allowed_origins.split(",") if o.strip()]
CORS(app, resources={r"/*": {"origins": origins}}, supports_credentials=True)



@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint to verify API connectivity and OpenAI status"""
    try:
        # Basic health check
        health_status = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "server": "Legacy Code Modernizer API",
            "version": "1.0.0"
        }
        
        # Check if OpenAI API key is configured
        try:
            from translate import fetch_api_key
            api_key = fetch_api_key("openai")
            if api_key:
                health_status["openai_configured"] = True
            else:
                health_status["openai_configured"] = False
                health_status["warning"] = "OpenAI API key not configured"
        except Exception as e:
            health_status["openai_configured"] = False
            health_status["warning"] = f"OpenAI configuration error: {str(e)}"
        
        # Test basic OpenAI connectivity (optional, commented out to avoid unnecessary API calls)
        # Uncomment if you want to test actual OpenAI connectivity on each health check
        """
        try:
            if health_status["openai_configured"]:
                from openai import OpenAI
                client = OpenAI(api_key=api_key)
                # Simple test request
                response = client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[{"role": "user", "content": "test"}],
                    max_tokens=1
                )
                health_status["openai_api_status"] = "connected"
        except Exception as e:
            health_status["openai_api_status"] = "error"
            health_status["openai_error"] = str(e)
        """
        
        return jsonify(health_status), 200
        
    except Exception as e:
        error_response = {
            "status": "error",
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e)
        }
        return jsonify(error_response), 500
    

@app.route("/api/status", methods=["GET"])
def get_api_status():
    """Get detailed API status including model information"""
    try:
        status = {
            "connected": True,
            "timestamp": datetime.utcnow().isoformat(),
            "models": {
                "available": ["GPT-4.1", "GPT-4o", "GPT-3.5-turbo"],
                "current": "GPT-4.1",  # This would typically come from settings
                "default": "GPT-4.1"
            },
            "features": {
                "code_conversion": True,
                "security_scanning": True,
                "github_integration": True
            }
        }
        
        # Check API key availability
        try:
            from translate import fetch_api_key
            api_key = fetch_api_key("openai")
            status["api_key_configured"] = bool(api_key)
        except Exception:
            status["api_key_configured"] = False
            
        return jsonify(status), 200
        
    except Exception as e:
        return jsonify({
            "connected": False,
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }), 500

@app.route("/migrate", methods=["POST"])
def migrate():
    code = request.json.get("code")
    filename = request.json.get("filename", "code.py")  # Optional filename
    
    if not code:
        return jsonify({"status": "error", "message": "No code given"}), 400
    
    try:
        # migrate_code_str now returns (converted_code, explanation, security_issues)
        result = migrate_code_str(code, filename)
        return jsonify({
            "status": "success", 
            "result": result[0],  # converted code
            "explain": result[1],  # explanation
            "security_issues": result[2]  # security issues
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/save", methods=["POST"])
def api_save():
    provider = request.json.get("provider")
    api = request.json.get("api")
    try:
        save_api_key(provider, api)
        return jsonify({"status": "success"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    

@app.route("/api/gitsave", methods=["POST"])
def git_save():
    provider = request.json.get("provider")
    token = request.json.get("token")
    try:
        save_token(provider, token)
        return jsonify({"status": "success"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    


@app.route("/api/delete", methods=["POST"])
def api_delete():
    provider = request.json.get("provider")
    try:
        delete_api_key(provider)
        return jsonify({"status": "success"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    
@app.route("/api/gitdelete", methods=["POST"])
def git_delete():
    provider = request.json.get("provider")
    try:
        delete_token(provider)
        return jsonify({"status": "success"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/github/commit", methods=["POST", "OPTIONS"])
def github_commit():
    if request.method == "OPTIONS":
        return '', 204

    data = request.get_json()
    from translate import fetch_api_key
    token = fetch_api_key("GitHub")
    repo = data.get("repo")
    files = data.get("files")
    message = data.get("message", "Batch commit of converted files")

    if not all([token, repo, files]) or not isinstance(files, list):
        return jsonify({"error": "Missing or invalid required fields"}), 400

    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github+json"
    }

    branch = "main"
    try:
        repo_info = requests.get(f"https://api.github.com/repos/{repo}", headers=headers)
        if repo_info.status_code == 200:
            branch = repo_info.json().get("default_branch", "main")
    except Exception as e:
        print("Failed to fetch branch info:", e)

    results = []

    for file in files:
        path = file.get("path")
        content = file.get("content")

        if not path or content is None:
            results.append({"path": path, "status": "skipped", "reason": "missing path or content"})
            continue

        get_file_url = f"https://api.github.com/repos/{repo}/contents/{path}"
        sha = None

        try:
            res = requests.get(get_file_url, headers=headers)
            if res.status_code == 200 and isinstance(res.json(), dict):
                sha = res.json().get("sha")
        except Exception as e:
            print(f"Error checking existing file at {path}: {e}")

        encoded_content = base64.b64encode(content.encode("utf-8")).decode("utf-8")
        payload = {
            "message": message,
            "content": encoded_content,
            "branch": branch
        }
        if sha:
            payload["sha"] = sha

        try:
            put_res = requests.put(get_file_url, headers=headers, json=payload)
            if put_res.status_code in [200, 201]:
                results.append({"path": path, "status": "success"})
            else:
                err = put_res.json()
                results.append({"path": path, "status": "error", "details": err})
        except Exception as e:
            results.append({"path": path, "status": "error", "details": str(e)})

    return jsonify({"status": "done", "results": results})




if __name__ == "__main__":
    app.run(port=5000)