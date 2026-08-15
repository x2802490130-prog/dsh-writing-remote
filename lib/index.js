import z from "@deepseek-ai/schemastery";
import * as path from "node:path";
import * as os from "node:os";
import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { Library } from "dsh-tool-writing/library";
import { NovelEngine } from "dsh-tool-writing/engine";
import { runSync } from "dsh-tool-writing/sync";

const initializers = [];
function markRemote(name) {
  Remote(name)(null, {
    name: name,
    private: false,
    static: false,
    addInitializer(fn) { initializers.push(fn); }
  });
}

class WritingRemote extends TypertRemoteService {
  static inject = [];
  static Config = z.object({ libraryRoot: z.string().default("") });

  constructor(ctx, config) {
    super(ctx, "writing");
    this.config = config || {};
    const home = process.env.DSH_HOME || path.join(os.homedir(), ".dsh");
    this.libraryRoot = this.config.libraryRoot || path.join(home, "writing-library");
    this.library = new Library(this.libraryRoot);
    for (const fn of initializers) fn.call(this);
  }

  engineFor(projectRoot) {
    return new NovelEngine({ projectRoot: projectRoot || process.cwd() }, this.ctx.get("credentials"));
  }

  async libraryList() {
    return this.library.list();
  }

  async librarySearch(query, opts) {
    const r = await this.library.search(query, opts || {});
    return { query: query, total: r.results.length, results: r.results };
  }

  async projectStatus(projectRoot) {
    const engine = this.engineFor(projectRoot);
    let manifest = {};
    try { manifest = await engine.readManifest(); } catch (e) { return null; }
    const chapters = Array.isArray(manifest.chapters) ? manifest.chapters : [];
    const volumes = {};
    for (const c of chapters) {
      const v = c.volume || "（未分卷）";
      (volumes[v] = volumes[v] || []).push(c);
    }
    const totalWords = chapters.reduce(function (s, c) { return s + (c.words || 0); }, 0);
    return { manifest: manifest, volumes: volumes, totalWords: totalWords, chapterCount: chapters.length };
  }

  async projectSearch(projectRoot, query, opts) {
    const engine = this.engineFor(projectRoot);
    const hits = await engine.search(query, opts || {});
    return { query: query, results: hits };
  }

  async loreList(projectRoot) {
    const engine = this.engineFor(projectRoot);
    const files = await engine.listFiles("lore");
    const byCat = {};
    for (const f of files) {
      const cat = f.split("/")[0] || "other";
      (byCat[cat] = byCat[cat] || []).push(f);
    }
    return byCat;
  }

  async chaptersList(projectRoot) {
    const engine = this.engineFor(projectRoot);
    let manifest = {};
    try { manifest = await engine.readManifest(); } catch (e) { return []; }
    return Array.isArray(manifest.chapters) ? manifest.chapters : [];
  }

  async evolutionList(projectRoot, subject) {
    const engine = this.engineFor(projectRoot);
    let data = { entries: [] };
    try { data = JSON.parse(await engine.readText("evolution.json")); } catch (e) { data = { entries: [] }; }
    const entries = Array.isArray(data.entries) ? data.entries : [];
    const s = String(subject || "").trim();
    return s ? entries.filter(function (e) { return e.subject === s; }) : entries;
  }

  async threadGraph(projectRoot) {
    const engine = this.engineFor(projectRoot);
    let data = { threads: [] };
    try { data = JSON.parse(await engine.readText("threads.json")); } catch (e) { data = { threads: [] }; }
    return Array.isArray(data.threads) ? data.threads : [];
  }

  async syncNow(projectRoot, opts) {
    const engine = this.engineFor(projectRoot);
    try {
      const out = await runSync(engine, opts || {});
      return out;
    } catch (e) {
      return { label: "", results: [], error: e.message };
    }
  }

  // 非破坏式铺骨架（幂等）：空目录一键初始化写作工程
  async scaffoldNow(projectRoot) {
    const engine = this.engineFor(projectRoot);
    const r = await engine.scaffold();
    return { created: r.created, manifest: r.manifest };
  }

  // 工作区索引：章节目录（分卷+字数+状态+摘要）+ 全书统计 + 情节日志尾部
  async workspaceIndex(projectRoot) {
    const engine = this.engineFor(projectRoot);
    let manifest = {};
    try { manifest = await engine.readManifest(); } catch (e) { return null; }
    const chapters = Array.isArray(manifest.chapters) ? manifest.chapters : [];
    const volumes = {};
    const volOrder = [];
    for (const c of chapters) {
      const v = c.volume || "（未分卷）";
      if (!volumes[v]) { volumes[v] = []; volOrder.push(v); }
      volumes[v].push(c);
    }
    let foreOpen = 0;
    try {
      const f = JSON.parse(await engine.readText("foreshadowing.json"));
      foreOpen = (f.entries || []).filter(function (x) { return !x.resolvedIn; }).length;
    } catch (e) {}
    let evoCount = 0;
    try {
      const e = JSON.parse(await engine.readText("evolution.json"));
      evoCount = (e.entries || []).length;
    } catch (e) {}
    let plotTail = "";
    try { const p = await engine.readText("lore/other/plot-log.md"); plotTail = p.slice(-2500); } catch (e) {}
    return {
      manifest: manifest,
      chapters: chapters,
      volumes: volOrder.map(function (name) { return { name: name, chapters: volumes[name] }; }),
      chapterCount: chapters.length,
      totalWords: chapters.reduce(function (s, c) { return s + (c.words || 0); }, 0),
      foreOpen: foreOpen,
      evoCount: evoCount,
      plotTail: plotTail
    };
  }

  // 读取一章正文（索引视图预览用，截断）
  async chapterText(projectRoot, chapterId, opts) {
    const engine = this.engineFor(projectRoot);
    let manifest = {};
    try { manifest = await engine.readManifest(); } catch (e) { return null; }
    const chapters = Array.isArray(manifest.chapters) ? manifest.chapters : [];
    const c = chapters.find(function (x) { return x.id === chapterId; });
    if (!c) return null;
    let text = "";
    try { text = await engine.readText(c.path); } catch (e) { text = ""; }
    const cap = (opts && opts.cap) || 12000;
    return {
      id: c.id, title: c.title || "", path: c.path, words: c.words || 0,
      status: c.status || "draft", summary: c.summary || "",
      text: text.slice(0, cap), truncated: text.length > cap
    };
  }

  // —— 写作交互模式：抉择小窗数据通道 ——
  async getChoice(projectRoot) {
    const engine = this.engineFor(projectRoot);
    try { return JSON.parse(await engine.readText(".writing-choice.json")); } catch (e) { return null; }
  }

  async submitChoice(projectRoot, answer) {
    const engine = this.engineFor(projectRoot);
    const c = await this.getChoice(projectRoot);
    if (!c) return { ok: false, error: "没有待抉择" };
    if (c.state === "answered") return { ok: false, error: "该抉择已被回答" };
    c.state = "answered";
    c.answer = answer || null;
    c.answeredAt = new Date().toISOString();
    await engine.writeText(".writing-choice.json", JSON.stringify(c, null, 2));
    return { ok: true };
  }
}

markRemote("libraryList");
markRemote("librarySearch");
markRemote("projectStatus");
markRemote("projectSearch");
markRemote("loreList");
markRemote("chaptersList");
markRemote("evolutionList");
markRemote("threadGraph");
markRemote("syncNow");
markRemote("scaffoldNow");
markRemote("workspaceIndex");
markRemote("chapterText");
markRemote("getChoice");
markRemote("submitChoice");

export { WritingRemote, WritingRemote as default };
