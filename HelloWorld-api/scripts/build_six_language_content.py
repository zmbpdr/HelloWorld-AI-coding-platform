"""生成六条主推语言的 10 关入门课程。

课程源数据采用本项目实际使用的 JSON 字段；修改关卡模板时可重新运行本脚本。
"""
from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
LESSONS_DIR = ROOT / "HelloWorld-content" / "lessons"

LESSON_META = [
    ("认识变量", "变量", "通过 getAge() 返回变量 age 的值 18。", "get_age", "getAge", "getAge()", "18"),
    ("基本数据类型", "基本数据类型", "实现 add(a, b)，返回两个整数之和。", "add", "add", "add(7, 5)", "12"),
    ("条件判断", "条件判断", "实现 isAdult(age)：年龄大于等于 18 返回 1，否则返回 0。", "is_adult", "isAdult", "isAdult(20)", "1"),
    ("循环入门", "循环", "实现 sumTo(n)，计算从 1 到 n 的和。", "sum_to", "sumTo", "sumTo(5)", "15"),
    ("数组或列表", "数组/列表", "实现 sumArray(numbers)，计算数组所有元素之和。", "sum_array", "sumArray", "sumArray([1, 2, 3, 4])", "10"),
    ("函数基础", "函数", "实现 square(n)，返回 n 的平方。", "square", "square", "square(9)", "81"),
    ("字典、对象或 Map", "映射", "实现 getScore(scores, name)：返回 name 对应的分数，找不到时返回 0。", "get_score", "getScore", "getScore({Ada: 95, Bob: 88}, 'Ada')", "95"),
    ("字符串操作", "字符串", "实现 countVowels(text)，统计字符串中 a/e/i/o/u（不区分大小写）的数量。", "count_vowels", "countVowels", "countVowels('CodeQuest')", "4"),
    ("综合项目：简易计算器", "综合应用", "实现 calculate(a, b, op)，支持 +、-、*、/；除数为 0 或未知运算符返回 0。", "calculate", "calculate", "calculate(8, 2, '*')", "16"),
    ("综合项目：待办事项管理器", "综合应用", "实现 countCompleted(statuses)，统计状态数组中已完成（1 / true）的项目数。", "count_completed", "countCompleted", "countCompleted([true, false, true])", "2"),
]

LANGUAGES = {
    "python": {"name": "Python", "ext": "python"},
    "javascript": {"name": "JavaScript", "ext": "javascript"},
    "typescript": {"name": "TypeScript", "ext": "typescript"},
    "cpp": {"name": "C++", "ext": "cpp"},
    "c": {"name": "C", "ext": "c"},
    "java": {"name": "Java", "ext": "java"},
}


def python_code(kind: str, solution: bool) -> str:
    body = {
        "get_age": "age = 18\n    return age",
        "add": "return a + b",
        "is_adult": "return 1 if age >= 18 else 0",
        "sum_to": "total = 0\n    for value in range(1, n + 1):\n        total += value\n    return total",
        "sum_array": "return sum(numbers)",
        "square": "return n * n",
        "get_score": "return scores.get(name, 0)",
        "count_vowels": "return sum(char.lower() in 'aeiou' for char in text)",
        "calculate": "if op == '+': return a + b\n    if op == '-': return a - b\n    if op == '*': return a * b\n    if op == '/' and b != 0: return a // b\n    return 0",
        "count_completed": "return sum(1 for status in statuses if status)",
    }[kind]
    signatures = {
        "get_age": "def getAge():", "add": "def add(a, b):", "is_adult": "def isAdult(age):",
        "sum_to": "def sumTo(n):", "sum_array": "def sumArray(numbers):", "square": "def square(n):",
        "get_score": "def getScore(scores, name):", "count_vowels": "def countVowels(text):",
        "calculate": "def calculate(a, b, op):", "count_completed": "def countCompleted(statuses):",
    }[kind]
    return f"{signatures}\n    {body}" if solution else f"{signatures}\n    # {body.splitlines()[0]}\n    pass"


def js_code(kind: str, typed: bool, solution: bool) -> str:
    type_suffix = {
        "get_age": "(): number", "add": "(a: number, b: number): number", "is_adult": "(age: number): number",
        "sum_to": "(n: number): number", "sum_array": "(numbers: number[]): number", "square": "(n: number): number",
        "get_score": "(scores: Record<string, number>, name: string): number", "count_vowels": "(text: string): number",
        "calculate": "(a: number, b: number, op: string): number", "count_completed": "(statuses: boolean[]): number",
    }[kind] if typed else None
    names = {"get_age": "getAge", "add": "add", "is_adult": "isAdult", "sum_to": "sumTo", "sum_array": "sumArray", "square": "square", "get_score": "getScore", "count_vowels": "countVowels", "calculate": "calculate", "count_completed": "countCompleted"}
    params = {"get_age": "", "add": "a, b", "is_adult": "age", "sum_to": "n", "sum_array": "numbers", "square": "n", "get_score": "scores, name", "count_vowels": "text", "calculate": "a, b, op", "count_completed": "statuses"}[kind]
    if typed:
        params = {"get_age": "", "add": "a: number, b: number", "is_adult": "age: number", "sum_to": "n: number", "sum_array": "numbers: number[]", "square": "n: number", "get_score": "scores: Record<string, number>, name: string", "count_vowels": "text: string", "calculate": "a: number, b: number, op: string", "count_completed": "statuses: boolean[]"}[kind]
        signature = f"function {names[kind]}({params}): number"
    else:
        signature = f"function {names[kind]}({params})"
    body = {
        "get_age": "const age = 18;\n  return age;", "add": "return a + b;", "is_adult": "return age >= 18 ? 1 : 0;",
        "sum_to": "let total = 0;\n  for (let value = 1; value <= n; value += 1) total += value;\n  return total;",
        "sum_array": "return numbers.reduce((total, value) => total + value, 0);", "square": "return n * n;",
        "get_score": "return scores[name] ?? 0;", "count_vowels": "return [...text].filter(char => 'aeiou'.includes(char.toLowerCase())).length;",
        "calculate": "if (op === '+') return a + b;\n  if (op === '-') return a - b;\n  if (op === '*') return a * b;\n  if (op === '/' && b !== 0) return Math.trunc(a / b);\n  return 0;",
        "count_completed": "return statuses.filter(Boolean).length;",
    }[kind]
    return f"{signature} {{\n  {body}\n}}" if solution else f"{signature} {{\n  // 在这里实现 {names[kind]}\n  return 0;\n}}"


def cpp_code(kind: str, solution: bool) -> str:
    sig = {
        "get_age": "int getAge()", "add": "int add(int a, int b)", "is_adult": "int isAdult(int age)",
        "sum_to": "int sumTo(int n)", "sum_array": "int sumArray(const vector<int>& numbers)", "square": "int square(int n)",
        "get_score": "int getScore(const map<string, int>& scores, const string& name)", "count_vowels": "int countVowels(const string& text)",
        "calculate": "int calculate(int a, int b, char op)", "count_completed": "int countCompleted(const vector<bool>& statuses)",
    }[kind]
    body = {
        "get_age": "int age = 18;\n    return age;", "add": "return a + b;", "is_adult": "return age >= 18 ? 1 : 0;",
        "sum_to": "int total = 0;\n    for (int value = 1; value <= n; ++value) total += value;\n    return total;",
        "sum_array": "int total = 0;\n    for (int value : numbers) total += value;\n    return total;", "square": "return n * n;",
        "get_score": "auto it = scores.find(name);\n    return it == scores.end() ? 0 : it->second;",
        "count_vowels": "int total = 0;\n    for (char ch : text) { ch = tolower(ch); if (string(\"aeiou\").find(ch) != string::npos) ++total; }\n    return total;",
        "calculate": "if (op == '+') return a + b;\n    if (op == '-') return a - b;\n    if (op == '*') return a * b;\n    if (op == '/' && b != 0) return a / b;\n    return 0;",
        "count_completed": "int total = 0;\n    for (bool status : statuses) if (status) ++total;\n    return total;",
    }[kind]
    prefix = "#include <string>\n#include <vector>\n#include <map>\n#include <cctype>\nusing namespace std;\n\n"
    return prefix + (f"{sig} {{\n    {body}\n}}" if solution else f"{sig} {{\n    // 在这里实现函数\n    return 0;\n}}")


def c_code(kind: str, solution: bool) -> str:
    sig = {
        "get_age": "int getAge(void)", "add": "int add(int a, int b)", "is_adult": "int isAdult(int age)",
        "sum_to": "int sumTo(int n)", "sum_array": "int sumArray(const int numbers[], int length)", "square": "int square(int n)",
        "get_score": "int getScore(const char names[][16], const int scores[], int length, const char name[])", "count_vowels": "int countVowels(const char text[])",
        "calculate": "int calculate(int a, int b, char op)", "count_completed": "int countCompleted(const int statuses[], int length)",
    }[kind]
    body = {
        "get_age": "int age = 18;\n    return age;", "add": "return a + b;", "is_adult": "return age >= 18 ? 1 : 0;",
        "sum_to": "int total = 0;\n    for (int value = 1; value <= n; ++value) total += value;\n    return total;",
        "sum_array": "int total = 0;\n    for (int i = 0; i < length; ++i) total += numbers[i];\n    return total;", "square": "return n * n;",
        "get_score": "for (int i = 0; i < length; ++i) if (strcmp(names[i], name) == 0) return scores[i];\n    return 0;",
        "count_vowels": "int total = 0;\n    for (int i = 0; text[i] != '\\0'; ++i) { char ch = tolower((unsigned char)text[i]); if (strchr(\"aeiou\", ch)) ++total; }\n    return total;",
        "calculate": "if (op == '+') return a + b;\n    if (op == '-') return a - b;\n    if (op == '*') return a * b;\n    if (op == '/' && b != 0) return a / b;\n    return 0;",
        "count_completed": "int total = 0;\n    for (int i = 0; i < length; ++i) if (statuses[i]) ++total;\n    return total;",
    }[kind]
    prefix = "#include <string.h>\n#include <ctype.h>\n\n"
    return prefix + (f"{sig} {{\n    {body}\n}}" if solution else f"{sig} {{\n    // 在这里实现函数\n    return 0;\n}}")


def java_code(kind: str, solution: bool) -> str:
    sig = {
        "get_age": "static int getAge()", "add": "static int add(int a, int b)", "is_adult": "static int isAdult(int age)",
        "sum_to": "static int sumTo(int n)", "sum_array": "static int sumArray(int[] numbers)", "square": "static int square(int n)",
        "get_score": "static int getScore(Map<String, Integer> scores, String name)", "count_vowels": "static int countVowels(String text)",
        "calculate": "static int calculate(int a, int b, char op)", "count_completed": "static int countCompleted(boolean[] statuses)",
    }[kind]
    body = {
        "get_age": "int age = 18;\n        return age;", "add": "return a + b;", "is_adult": "return age >= 18 ? 1 : 0;",
        "sum_to": "int total = 0;\n        for (int value = 1; value <= n; value++) total += value;\n        return total;",
        "sum_array": "int total = 0;\n        for (int value : numbers) total += value;\n        return total;", "square": "return n * n;",
        "get_score": "return scores.getOrDefault(name, 0);", "count_vowels": "int total = 0;\n        for (char ch : text.toLowerCase().toCharArray()) if (\"aeiou\".indexOf(ch) >= 0) total++;\n        return total;",
        "calculate": "if (op == '+') return a + b;\n        if (op == '-') return a - b;\n        if (op == '*') return a * b;\n        if (op == '/' && b != 0) return a / b;\n        return 0;",
        "count_completed": "int total = 0;\n        for (boolean status : statuses) if (status) total++;\n        return total;",
    }[kind]
    return "import java.util.*;\n\nclass Solution {\n    " + (f"{sig} {{\n        {body}\n    }}" if solution else f"{sig} {{\n        // 在这里实现函数\n        return 0;\n    }}") + "\n}"


def test_expression(language: str, kind: str) -> str:
    expressions = {
        "get_age": {"python": "getAge()", "javascript": "getAge()", "typescript": "getAge()", "cpp": "getAge()", "c": "getAge()", "java": "Solution.getAge()"},
        "add": {"python": "add(7, 5)", "javascript": "add(7, 5)", "typescript": "add(7, 5)", "cpp": "add(7, 5)", "c": "add(7, 5)", "java": "Solution.add(7, 5)"},
        "is_adult": {"python": "isAdult(20)", "javascript": "isAdult(20)", "typescript": "isAdult(20)", "cpp": "isAdult(20)", "c": "isAdult(20)", "java": "Solution.isAdult(20)"},
        "sum_to": {"python": "sumTo(5)", "javascript": "sumTo(5)", "typescript": "sumTo(5)", "cpp": "sumTo(5)", "c": "sumTo(5)", "java": "Solution.sumTo(5)"},
        "sum_array": {"python": "sumArray([1, 2, 3, 4])", "javascript": "sumArray([1, 2, 3, 4])", "typescript": "sumArray([1, 2, 3, 4])", "cpp": "sumArray(vector<int>{1, 2, 3, 4})", "c": "sumArray((int[]){1, 2, 3, 4}, 4)", "java": "Solution.sumArray(new int[]{1, 2, 3, 4})"},
        "square": {"python": "square(9)", "javascript": "square(9)", "typescript": "square(9)", "cpp": "square(9)", "c": "square(9)", "java": "Solution.square(9)"},
        "get_score": {"python": "getScore({'Ada': 95, 'Bob': 88}, 'Ada')", "javascript": "getScore({Ada: 95, Bob: 88}, 'Ada')", "typescript": "getScore({Ada: 95, Bob: 88}, 'Ada')", "cpp": "getScore(map<string, int>{{\"Ada\", 95}, {\"Bob\", 88}}, \"Ada\")", "c": "getScore((char [][16]){\"Ada\", \"Bob\"}, (int[]){95, 88}, 2, \"Ada\")", "java": "Solution.getScore(Map.of(\"Ada\", 95, \"Bob\", 88), \"Ada\")"},
        "count_vowels": {"python": "countVowels('CodeQuest')", "javascript": "countVowels('CodeQuest')", "typescript": "countVowels('CodeQuest')", "cpp": "countVowels(\"CodeQuest\")", "c": "countVowels(\"CodeQuest\")", "java": "Solution.countVowels(\"CodeQuest\")"},
        "calculate": {"python": "calculate(8, 2, '*')", "javascript": "calculate(8, 2, '*')", "typescript": "calculate(8, 2, '*')", "cpp": "calculate(8, 2, '*')", "c": "calculate(8, 2, '*')", "java": "Solution.calculate(8, 2, '*')"},
        "count_completed": {"python": "countCompleted([True, False, True])", "javascript": "countCompleted([true, false, true])", "typescript": "countCompleted([true, false, true])", "cpp": "countCompleted(vector<bool>{true, false, true})", "c": "countCompleted((int[]){1, 0, 1}, 3)", "java": "Solution.countCompleted(new boolean[]{true, false, true})"},
    }
    return expressions[kind][language]


def make_code(language: str, kind: str, solution: bool) -> str:
    if language == "python": return python_code(kind, solution)
    if language == "javascript": return js_code(kind, False, solution)
    if language == "typescript": return js_code(kind, True, solution)
    if language == "cpp": return cpp_code(kind, solution)
    if language == "c": return c_code(kind, solution)
    return java_code(kind, solution)


def build_lessons(language: str) -> list[dict]:
    display = LANGUAGES[language]["name"]
    lessons = []
    for order, (title, knowledge, description, kind, _name, _example, expected) in enumerate(LESSON_META, start=1):
        expression = test_expression(language, kind)
        lessons.append({
            "title": title,
            "slug": f"{language}-{order:02d}-{kind.replace('_', '-')}",
            "description": description,
            "content": f"# {title}\n\n本关使用 **{display}** 学习「{knowledge}」。\n\n## 任务\n{description}\n\n## 要求\n- 保持函数名和参数不变。\n- 返回计算结果，不要自行编写测试入口。\n- 通过下方测试后即可通关。",
            "order": order,
            "difficulty": "beginner" if order <= 6 else "intermediate",
            "xp_reward": 10 if order <= 8 else 20,
            "starter_code": make_code(language, kind, False),
            "solution_code": make_code(language, kind, True),
            "test_cases": [{"input": expression, "expected_output": expected, "description": f"{title}：基础用例"}],
            "hint": f"先把「{knowledge}」的核心逻辑拆成一两步，再处理边界情况。",
        })
    return lessons


def main() -> None:
    LESSONS_DIR.mkdir(parents=True, exist_ok=True)
    for language in LANGUAGES:
        target = LESSONS_DIR / f"{language}.json"
        target.write_text(json.dumps(build_lessons(language), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"已生成 {target.name}: 10 关")


if __name__ == "__main__":
    main()
