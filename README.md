# dsh-writing-remote

DeepSeek Harness（DSH）写作面板的 host 侧数据通道：把 [dsh-tool-writing](https://github.com/x2802490130-prog/dsh-tool-writing) 引擎的项目/书库/检索数据以 Typert remote 的形式暴露给客户端 UI（配合 [dsh-client-ui-writing](https://github.com/x2802490130-prog/dsh-client-ui-writing) 使用）。

## Remote 方法

| 方法 | 作用 |
|---|---|
| `workspaceIndex` | 工作区索引：分卷章节目录（字数/状态/摘要）+ 全书统计 + 情节日志尾部 |
| `projectStatus` | 项目概览：manifest、分卷分组、总字数、章数 |
| `chaptersList` / `chapterText` | 章节列表 / 单章正文预览（截断） |
| `loreList` | 设定文件按分类（characters/world/timeline/foreshadowing/other） |
| `projectSearch` | 项目全文检索（SQLite FTS5） |
| `libraryList` / `librarySearch` | 书库（饲料区）列表 / 检索 |
| `evolutionList` | 设定/人物演化条目（版本 diff 陈旧检测的数据源） |
| `threadGraph` | 多线叙事线索图谱数据 |
| `syncNow` | 章末自动编排（摘要+抽取+演化+伏笔提醒） |
| `scaffoldNow` | 非破坏式铺骨架（幂等）：空目录一键初始化写作工程 |

## 安装

依赖 [dsh-tool-writing](https://www.npmjs.com/package/dsh-tool-writing)（`dsh-tool-writing@0.3.0`）。

```bash
npm install dsh-writing-remote
# 或
dsh plugin add dsh-writing-remote
```

配置项：`libraryRoot`（默认 `$DSH_HOME/writing-library`）。
