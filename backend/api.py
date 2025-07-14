from flask import Flask, request, jsonify
from flask_cors import CORS
from translate import ai_migrate

app = Flask(__name__)
CORS(app)

@app.route('/migrate', methods=['POST'])
def migrate():
    code = request.json.get('code')
    if not code:
        return jsonify({'status': 'error', 'message': 'No code given'}), 400
    try:
        result = ai_migrate(code)
        return jsonify({'status': 'success', 'result': result[0], 'explain': result[1]})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == "__main__":
    app.run(port=5000)
