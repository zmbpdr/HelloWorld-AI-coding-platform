FROM python:3.12-slim

# 安装所有语言运行时
RUN apt-get update && apt-get install -y --no-install-recommends \
    # C++ 编译
    g++ \
    # Java 编译运行
    default-jdk \
    # Node.js
    nodejs \
    npm \
    # Go (可选)
    golang-go \
    && rm -rf /var/lib/apt/lists/*

# 创建非 root 用户用于安全执行
RUN useradd -m -s /bin/bash sandbox

# 工作目录
WORKDIR /code

# 确保工作目录可写
RUN chown sandbox:sandbox /code

USER sandbox
