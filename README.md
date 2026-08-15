# dsh-writing-remote

[![npm version](https://img.shields.io/npm/v/dsh-writing-remote)](https://www.npmjs.com/package/dsh-writing-remote)  [![license](https://img.shields.io/npm/l/dsh-writing-remote)](https://github.com/x2802490130-prog/dsh-writing-remote/blob/main/LICENSE)

DeepSeek Harness（DSH）写作三件套的 **host 侧数据通道**：把 [dsh-tool-writing](https://github.com/x2802490130-prog/dsh-tool-writing) 引擎的项目/书库/检索数据，以 [Typert remote](https://www.npmjs.com/package/@deepseek-ai/dsh-typert-protocol) 的形式暴露给客户端 [dsh-client-ui-writing](https://github.com/x2802490130-prog/dsh-client-ui-writing) 面板。

## 为什么单独一个包

引擎跑在 host（Node），面板跑在浏览器，两者之间隔着 Typert 协议。remote 就是那层适配：面板要什么，remote 就提供什么——**只读数据 + 编排触发**，所有写操作仍在 host 侧引擎里完成，不把生成能力暴露给客户端。

## Remote 方法

| 方法 | 返回 | 面板用途 |
|---|---|---|
| `workspaceIndex` | 分卷目录（字数/状态/摘要）+ 全书统计 + 情节日志尾部 | 索引视图、项目 tab |
| `projectStatus` | manifest、分卷分组、总字数、章数 | 项目概览 |
| `chaptersList` / `chapterText` | 章节列表 / 单章正文（截断预览） | 目录与预览 |
| `loreList` | 设定文件按分类（characters/world/timeline/foreshadowing/other） | 设定浏览 |
| `projectSearch` | 项目全文检索（SQLite FTS5） | 搜索 tab |
| `libraryList` / `librarySearch` | 书库列表 / 书库检索 | 书库 tab |
| `evolutionList` | 演化条目（可按主体过滤） | 演化版本链 |
| `threadGraph` | 多线叙事线索图谱数据 | SVG 线程图 |
| `syncNow` | 章末自动编排（摘要+抽取+演化+伏笔提醒） | 「章末编排」按钮 |
| `scaffoldNow` | 非破坏式铺骨架（幂等，空目录一键初始化） | 「一键初始化」按钮 |

所有方法都以 `projectRoot` 为第一参数定位小说工程，面板传当前工作区，host 侧实例化对应引擎。

## 安装与配置

```bash
dsh plugin --profile web add dsh-writing-remote
# 或
npm install dsh-writing-remote
```

依赖：`dsh-tool-writing@0.3.0`（引擎本体）与 `@deepseek-ai/dsh-typert-protocol`（peer）。

配置项只有 `libraryRoot`（默认 `$DSH_HOME/writing-library`），与引擎共享书库根。

## 许可证

MIT。
