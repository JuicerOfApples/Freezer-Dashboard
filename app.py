from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os

app = Flask(__name__)
CORS(app) # Allows your web page to talk to the server
DB_FILE = 'freezer_database.json'

def load_data():
    if not os.path.exists(DB_FILE):
        return []
    with open(DB_FILE, 'r') as f:
        return json.load(f)

def save_data(data):
    with open(DB_FILE, 'w') as f:
        json.dump(data, f, indent=4)

@app.route('/api/inventory', methods=['GET', 'POST'])
def handle_inventory():
    if request.method == 'POST':
        save_data(request.json)
        return jsonify({"status": "success"})
    
    # On GET request, return the database
    return jsonify(load_data())

if __name__ == '__main__':
    # Hosts on all network interfaces on port 5000
    app.run(host='0.0.0.0', port=5000)