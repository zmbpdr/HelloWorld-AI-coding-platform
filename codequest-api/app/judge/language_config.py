"""语言配置 - 语言执行命令和文件后缀的单一来源
本文件是 LANGUAGE_EXTENSIONS 和 LANGUAGE_COMMANDS 的唯一定义来源。所有执行环境（直接执行、Docker 沙盒）均从此处导入。
直接执行命令使用主机路径占位符：{file}、{output}、{dir}、{classname}
沙盒执行命令使用 Docker 容器内路径。"""

# 语言文件后缀（6 种语言）
LANGUAGE_EXTENSIONS = {
    "python": ".py",
    "javascript": ".js",
    "java": ".java",
    "c": ".c",
    "cpp": ".cpp",
    "typescript": ".ts",
}

# 直接执行命令 (run_cmd_list, compile_cmd_list_or_None)
# 占位符：{file}=源文件路径, {output}=编译产物路径, {dir}=工作目录, {classname}=Java 类名
LANGUAGE_COMMANDS = {
    "python": (["python", "{file}"], None),
    "javascript": (["node", "{file}"], None),
    "java": (["java", "-cp", "{dir}", "{classname}"], ["javac", "{file}"]),
    "c": (["{output}"], ["gcc", "-o", "{output}", "{file}"]),
    "cpp": (["{output}"], ["g++", "-o", "{output}", "{file}"]),
    "typescript": (["npx", "ts-node", "{file}"], None),
}

# Docker 沙盒执行命令（Docker 容器内路径）
# 支持 14 种语言：Kotlin/Swift 需在镜像中额外安装，未安装时回退到直接执行
SANDBOX_LANGUAGE_COMMANDS = {
    "python": (["python3", "/code/user_code.py"], None),
    "javascript": (["node", "/code/user_code.js"], None),
    "java": (
        ["java", "-cp", "/tmp", "Main"],
        ["javac", "-d", "/tmp", "/code/user_code.java"],
    ),
    "c": (
        ["/tmp/user_code.out"],
        ["gcc", "-o", "/tmp/user_code.out", "/code/user_code.c"],
    ),
    "cpp": (
        ["/tmp/user_code.out"],
        ["g++", "-std=c++17", "-o", "/tmp/user_code.out", "/code/user_code.cpp"],
    ),
    "typescript": (["npx", "ts-node", "/code/user_code.ts"], None),
}
