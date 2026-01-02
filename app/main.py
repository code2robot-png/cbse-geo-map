import os
import json
from flask import Flask, request, jsonify, send_from_directory
from app.utils import get_sanitized_topic


# --------------------------------------------------
# Paths
# --------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WWW_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "www"))
DATA_DIR = os.path.join(BASE_DIR, "data")

# --------------------------------------------------
# Flask App
# --------------------------------------------------
app = Flask(__name__, static_folder=WWW_DIR, static_url_path="")  # serve static at root

# --------------------------------------------------
# Load Data (safe for Cloud Run)
# --------------------------------------------------
with open(os.path.join(DATA_DIR, "data.json"), "r", encoding="utf-8") as f:
    DATA = json.load(f)


# --------------------------------------------------
# Frontend
# --------------------------------------------------
@app.route("/")
def index():
    return send_from_directory(WWW_DIR, "index.html")


# --------------------------------------------------
# API: topics list
# --------------------------------------------------
@app.route("/api")
def api_topics():
    return jsonify(
        {"data": [{"id": t["id"], "label": t["label"]} for t in DATA["topics"]]}
    )


# --------------------------------------------------
# API: learn topic
# --------------------------------------------------
@app.route("/api/learn")
def api_learn():
    topic_id = request.args.get("topic")
    if not topic_id:
        return jsonify({"error": "topic required"}), 400

    topic = next((t for t in DATA["topics"] if t["id"] == topic_id), None)
    if not topic:
        return jsonify({"error": "invalid topic"}), 404

    return jsonify({"label": topic["label"], "spots": topic["spots"]})


# --------------------------------------------------
# Local run ONLY
# --------------------------------------------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port, debug=True)
