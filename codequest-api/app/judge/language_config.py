"""六种主推语言的本地执行配置。"""
from pathlib import Path

TSC_BIN = str(Path(__file__).resolve().parents[3] / "codequest-web" / "node_modules" / "typescript" / "bin" / "tsc")

LANGUAGE_EXTENSIONS = {
    "python": ".py", "javascript": ".js", "java": ".java",
    "c": ".c", "cpp": ".cpp", "typescript": ".ts",
}

LANGUAGE_COMMANDS = {
    "python": (["python", "{file}"], None),
    "javascript": (["node", "{file}"], None),
    "java": (["java", "-cp", "{dir}", "{classname}"], ["javac", "-encoding", "UTF-8", "{file}"]),
    "c": (["{output}"], ["gcc", "-std=c11", "-o", "{output}", "{file}"]),
    "cpp": (["{output}"], ["g++", "-std=c++17", "-o", "{output}", "{file}"]),
    "typescript": (["node", "{js_output}"], ["node", TSC_BIN, "--target", "ES2020", "--module", "commonjs", "--outDir", "{dir}", "{file}"]),
}

SANDBOX_LANGUAGE_COMMANDS = {
    "python": (["python3", "/code/user_code.py"], None),
    "javascript": (["node", "/code/user_code.js"], None),
    "java": (["java", "-cp", "/tmp", "Main"], ["javac", "-encoding", "UTF-8", "-d", "/tmp", "/code/user_code.java"]),
    "c": (["/tmp/user_code.out"], ["gcc", "-std=c11", "-o", "/tmp/user_code.out", "/code/user_code.c"]),
    "cpp": (["/tmp/user_code.out"], ["g++", "-std=c++17", "-o", "/tmp/user_code.out", "/code/user_code.cpp"]),
    "typescript": (["npx", "ts-node", "/code/user_code.ts"], None),
}
