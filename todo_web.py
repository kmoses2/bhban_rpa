from flask import Flask, request, redirect, jsonify
import json, os

app = Flask(__name__)
FILE = "todos.json"

def load():
    return json.load(open(FILE)) if os.path.exists(FILE) else []

def save(todos):
    json.dump(todos, open(FILE, "w"), ensure_ascii=False, indent=2)

@app.route("/")
def index():
    todos = load()
    items = "".join(
        f'<li style="padding:10px;font-size:18px;{"text-decoration:line-through;color:#aaa" if t["done"] else ""}">'
        f'<a href="/done/{i}" style="margin-right:8px">✓</a>'
        f'{t["title"]}'
        f'<a href="/delete/{i}" style="margin-left:12px;color:red">✕</a></li>'
        for i, t in enumerate(todos)
    )
    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>TODO</title></head>
<body style="max-width:480px;margin:auto;padding:20px;font-family:sans-serif">
<h2>TODO LIST</h2>
<form method="post" action="/add">
  <input name="title" placeholder="할 일 입력" style="width:70%;padding:8px;font-size:16px">
  <button style="padding:8px 12px;font-size:16px">추가</button>
</form>
<ul style="list-style:none;padding:0;margin-top:20px">{items}</ul>
</body></html>"""

@app.route("/add", methods=["POST"])
def add():
    title = request.form.get("title", "").strip()
    if title:
        todos = load()
        todos.append({"title": title, "done": False})
        save(todos)
    return redirect("/")

@app.route("/done/<int:i>")
def done(i):
    todos = load()
    if 0 <= i < len(todos):
        todos[i]["done"] = True
        save(todos)
    return redirect("/")

@app.route("/delete/<int:i>")
def delete(i):
    todos = load()
    if 0 <= i < len(todos):
        todos.pop(i)
        save(todos)
    return redirect("/")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
