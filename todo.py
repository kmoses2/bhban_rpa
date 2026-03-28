import json, os

FILE = "todos.json"

def load():
    return json.load(open(FILE)) if os.path.exists(FILE) else []

def save(todos):
    json.dump(todos, open(FILE, "w"), ensure_ascii=False, indent=2)

def show(todos):
    if not todos:
        print("할 일이 없습니다.")
        return
    for i, t in enumerate(todos):
        status = "✓" if t["done"] else " "
        print(f"{i+1}. [{status}] {t['title']}")

def main():
    while True:
        todos = load()
        print("\n=== TODO LIST ===")
        show(todos)
        print("\n1.추가  2.완료  3.삭제  4.종료")
        cmd = input("선택: ").strip()

        if cmd == "1":
            title = input("할 일: ").strip()
            if title:
                todos.append({"title": title, "done": False})
                save(todos)
        elif cmd == "2":
            show(todos)
            n = input("번호: ").strip()
            if n.isdigit() and 1 <= int(n) <= len(todos):
                todos[int(n)-1]["done"] = True
                save(todos)
        elif cmd == "3":
            show(todos)
            n = input("번호: ").strip()
            if n.isdigit() and 1 <= int(n) <= len(todos):
                todos.pop(int(n)-1)
                save(todos)
        elif cmd == "4":
            break

if __name__ == "__main__":
    main()
