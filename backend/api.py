from flask import Flask, request, jsonify
from flask_cors import CORS
from translate import ai_migrate
from dotenv import load_dotenv
import os

load_dotenv()
app = Flask(__name__)

# Allow configuration of CORS origins through environment variable
allowed_origins = os.getenv("FRONTEND_ORIGIN", "http://localhost:8080")
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


if __name__ == "__main__":
    app.run(port=5000)
