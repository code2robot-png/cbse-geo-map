def get_sanitized_topic(all_data, topic_id, mode="learn"):
    """
    Returns topic data based on mode.
    learn  → full spots (with hints)
    exam   → stripped / restricted data
    """
    topics = all_data.get("topics", [])
    topic = next((t for t in topics if t["id"] == topic_id), None)

    if not topic:
        return None

    if mode == "exam":
        # Example: hide labels / hints
        return {
            "id": topic["id"],
            "label": topic["label"],
            "spots": [{"x": s["x"], "y": s["y"]} for s in topic.get("spots", [])],
        }

    # Learn mode → full topic
    return topic
