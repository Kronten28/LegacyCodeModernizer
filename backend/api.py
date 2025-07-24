from flask import Flask, redirect, request, jsonify
from flask_cors import CORS
import requests
from translate import ai_migrate
from dotenv import load_dotenv
import os

load_dotenv()
app = Flask(__name__)

# Allow configuration of CORS origins through environment variable
allowed_origins = os.getenv("FRONTEND_ORIGIN", "http://localhost:8080")

GITHUB_CLIENT_ID = os.getenv("CLIENT_ID")
GITHUB_CLIENT_SECRET = os.getenv("CLIENT_SECRET")
GITHUB_CALLBACK_URL = os.getenv("GITHUB_CALLBACK_URL", "http://localhost:5000/github/callback")


origins = [o.strip() for o in allowed_origins.split(",") if o.strip()]
CORS(app, origins=origins)


@app.route("/migrate", methods=["POST"])
def migrate():
    code = request.json.get("code")
    if not code:
        return jsonify({"status": "error", "message": "No code given"}), 400
    try:
        result = ai_migrate(code)
        return jsonify({"status": "success", "result": result[0], "explain": result[1]})
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

    # This will send the token back to the opener window (your React app)
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
