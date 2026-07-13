FROM python:3.11-slim

# 安装多语言运行环境
RUN apt-get update && apt-get install -y --no-install-recommends \
    nodejs \
    npm \
    default-jdk \
    g++ \
    golang-go \
    rustc \
    cargo \
    ruby \
    php-cli \
    lua5.4 \
    bash \
    && rm -rf /var/lib/apt/lists/*

# 全局安装 TypeScript ts-node (用于直接执行 .ts 文件)
RUN npm install -g typescript ts-node

# 设置工作目录
WORKDIR /sandbox

# 复制评测脚本
COPY runner.py .

# 安全限制：禁止网络、限制资源
# 运行时通过 docker run 参数指定：
# --network none
# --memory=256m
# --cpus=1
# --pids-limit=64

CMD ["python", "runner.py"]
