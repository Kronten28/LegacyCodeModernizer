from flask import Flask, redirect, request, jsonify
from flask_cors import CORS
import requests
from translate import migrate_code_str
from dotenv import load_dotenv
import os
import time
from datetime import datetime

load_dotenv()
app = Flask(__name__)

allowed_origins = os.getenv("FRONTEND_ORIGIN", "http://localhost:8080")

GITHUB_CLIENT_ID = os.getenv("CLIENT_ID")
GITHUB_CLIENT_SECRET = os.getenv("CLIENT_SECRET")
GITHUB_CALLBACK_URL = os.getenv("GITHUB_CALLBACK_URL", "http://localhost:5000/github/callback")

origins = [o.strip() for o in allowed_origins.split(",") if o.strip()]
CORS(app, origins=origins)

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

@app.route("/github/login")
def github_login():
    return redirect(
        f"https://github.com/login/oauth/authorize?client_id={GITHUB_CLIENT_ID}&scope=repo"
    )

@app.route("/github/callback")
def github_callback():
    code = request.args.get("code")
    if not code:
        return "<script>window.close();</script>"

    token_res = requests.post(
        "https://github.com/login/oauth/access_token",
        headers={"Accept": "application/json"},
        data={
            "client_id": GITHUB_CLIENT_ID,
            "client_secret": GITHUB_CLIENT_SECRET,
            "code": code,
        },
    )
    token_data = token_res.json()
    access_token = token_data.get("access_token")

    if not access_token:
        return "<script>window.close();</script>"

    return f"""
    <html>
        <body>
            <script>
                window.opener.postMessage({{
                    type: 'github_token',
                    token: '{access_token}'
                }}, '*');
                window.close();
            </script>
        </body>
    </html>
    """

if __name__ == "__main__":
    app.run(port=5000)