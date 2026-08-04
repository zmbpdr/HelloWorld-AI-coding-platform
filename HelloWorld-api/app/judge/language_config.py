"""六种主推语言的本地执行配置。

定义了 Python、JavaScript、Java、C、C++、TypeScript 六种语言的
文件扩展名、编译命令和执行命令，支持本地环境和沙箱环境。
"""
import os
import shutil
from pathlib import Path

# TypeScript 编译器路径（来自前端项目）
TSC_BIN = str(Path(__file__).resolve().parents[3] / "HelloWorld-web" / "node_modules" / "typescript" / "bin" / "tsc")


def _find_java_home() -> str | None:
    """搜索 Java 安装路径（Windows 常见位置）"""
    candidates = [
        r"C:\Program Files\Microsoft",
        r"C:\Program Files\Java",
        r"C:\Program Files\Eclipse Adoptium",
        r"C:\Program Files (x86)\Java",
    ]
    for base in candidates:
        if not os.path.exists(base):
            continue
        for entry in sorted(os.listdir(base), reverse=True):
            full = os.path.join(base, entry)
            javac = os.path.join(full, "bin", "javac.exe")
            if os.path.exists(javac):
                return os.path.join(full, "bin")
    # 回退到 PATH 中的 javac
    javac = shutil.which("javac")
    if javac:
        return os.path.dirname(javac)
    return None


_JAVA_HOME = _find_java_home()
_JAVA = f"{_JAVA_HOME}\\java.exe" if _JAVA_HOME else "java"
_JAVAC = f"{_JAVA_HOME}\\javac.exe" if _JAVA_HOME else "javac"

# 语言 -> 文件扩展名映射
LANGUAGE_EXTENSIONS = {
    "python": ".py", "javascript": ".js", "java": ".java",
    "c": ".c", "cpp": ".cpp", "typescript": ".ts",
}

# 本地执行环境的编译和执行命令
# 格式: (run_command, compile_command) 其中 compile_command 为 None 表示无需编译
LANGUAGE_COMMANDS = {
    "python": (["python", "{file}"], None),
    "javascript": (["node", "{file}"], None),
    "java": ([_JAVA, "-cp", "{dir}", "{classname}"], [_JAVAC, "-encoding", "UTF-8", "{file}"]),
    "c": (["{output}"], ["gcc", "-std=c11", "-o", "{output}", "{file}"]),
    "cpp": (["{output}"], ["g++", "-std=c++17", "-o", "{output}", "{file}"]),
    "typescript": (["node", "{js_output}"], ["node", TSC_BIN, "--target", "ES2020", "--module", "commonjs", "--outDir", "{dir}", "{file}"]),
}

# 沙箱执行环境的编译和执行命令
SANDBOX_LANGUAGE_COMMANDS = {
    "python": (["python3", "/code/user_code.py"], None),
    "javascript": (["node", "/code/user_code.js"], None),
    "java": (["java", "-cp", "/tmp", "Main"], ["javac", "-encoding", "UTF-8", "-d", "/tmp", "/code/user_code.java"]),
    "c": (["/tmp/user_code.out"], ["gcc", "-std=c11", "-o", "/tmp/user_code.out", "/code/user_code.c"]),
    "cpp": (["/tmp/user_code.out"], ["g++", "-std=c++17", "-o", "/tmp/user_code.out", "/code/user_code.cpp"]),
    "typescript": (["npx", "ts-node", "/code/user_code.ts"], None),
}
