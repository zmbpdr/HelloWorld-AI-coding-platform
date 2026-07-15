# 六语言运行环境与判题说明

| 语言 | 编译/运行工具 |
| --- | --- |
| Python | `python` |
| JavaScript | `node` |
| Java | `javac` + `java` |
| C | `gcc -std=c11` |
| C++ | `g++ -std=c++17` |
| TypeScript | 项目内 `codequest-web/node_modules/typescript/bin/tsc`，再交给 Node 执行 |

本地演示前应确认对应运行时在 PATH 中。Java 需要安装 JDK；TypeScript 不依赖全局 `ts-node`。开发环境直接使用 subprocess 执行代码，生产环境应采用隔离执行方案。
