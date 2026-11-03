# ClipForge

> 视频工作台插件：贴一个链接，拿到文案，挑一段，出 GIF。

DeepSeek Harness 的侧栏插件。把视频链接（Bilibili / YouTube / X / 播客直链 / 抖音分享文案）变成可以剪辑的素材：解析、下载、转写、截取、拼接、生成 GIF，全程本地。

## 功能

- **解析**：`yt-dlp` 覆盖主流站点；抖音走内置 HTTP 解析（短链展开 → ttwid → 分享页 → 无水印地址），不需要登录、不开浏览器。
- **下载**：可选清晰度；抖音走无水印直链；浏览器嗅探作为兜底（手动触发，会开一次浏览器窗口）。
- **文案**：优先站点字幕，没有则用本地 whisper.cpp 转写；支持逐句双语与说话人分离；翻译手动触发。
- **剪辑**：时间轴选区、关键帧吸附、`I`/`O` 打点、`←/→` 逐帧、试播只播放选中区间。
- **产物**：MP4 截取（快速流拷贝 / 精确重编码）、多段拼接、GIF（按目标体积自动降档，palettegen 调色板）。
- **文稿台**：贴长文或文章链接，生成摘要、金句（必须能溯源到原文段落）与思维导图。

## 安装

```sh
dsh plugin --profile desktop add github:AvenYQ/dsh-clipforge
```

或从插件市场搜索 **ClipForge**。

## 依赖

- `ffmpeg` / `ffprobe`（必须）
- `yt-dlp`（在线视频解析，必须）
- `whisper.cpp` + 模型（无字幕视频转写时使用，可选）

插件会在首次启动时自检，缺少的工具会在界面里提示。

## 数据目录

`~/Movies/DSH工作台/`：`video/`（原片）、`clip/`（截取与拼接）、`gif/`、`tmp/`、`models/`。

文稿缓存：`~/.dsh/reader/cache/`；站点 cookie 与 ttwid：`~/.dsh/workbench/cookies/`。

## 许可

MIT
