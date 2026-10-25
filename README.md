<div align="center">

# DSH 启动动画 · 欢迎回来

**让 DeepSeek Harness 用一段短片迎接你。**

8 段短片 · 随机 / 固定播放 · 片尾淡入 · 分时问候 · 可选欢迎语

[安装](#安装) · [功能与设置](#功能与设置) · [使用手册](MANUAL.md) · [致谢与素材说明](CREDITS.md)

</div>

![内置动画画面预览](docs/images/preview-01.jpg)

为 DeepSeek Harness 桌面端制作的启动动画定制版：打开应用后播放短片，片尾自然淡入工作界面；想提前进入时，沿用现有点击 / 键盘进入方式。支持在控制页面管理素材、切换播放方式，以及单独选择是否播放额外的“欢迎回来”语音。

基于 [lxj5820/dsh-boot-animation](https://github.com/lxj5820/dsh-boot-animation) 定制。保留上游署名与许可，不修改 DSH 本体源码。

## 画面预览

以下为随包视频的真实截帧，用来展示动画素材；不包含个人聊天、账号信息或工作区截图。

| 片段一 | 片段二 | 片段三 |
|:---:|:---:|:---:|
| ![动画素材一](docs/images/preview-01.jpg) | ![动画素材二](docs/images/preview-02.jpg) | ![动画素材三](docs/images/preview-03.jpg) |

## 功能与设置

| 功能 | 说明 |
|---|---|
| 8 段内置短片 | 可随机轮播，也可固定播放指定片段 |
| 片尾过渡 | 支持片尾交叉溶解、播完再淡入、点击进入三种方式 |
| 分时问候 | 按本地时间显示凌晨、早晨、中午、下午或晚间问候 |
| 可选欢迎语 | 新增“播放欢迎语”，默认开启；关闭后不播放额外欢迎音 |
| 原声例外 | `1.mp4` 自带欢迎语时，不再叠加额外欢迎音；影片原声由影片声音设置控制 |
| 素材管理 | 在设置里上传影片、勾选轮播素材、选择固定片段、打开素材目录 |
| 预览与兼容检查 | 可预览单个片段，显示素材时长、兼容性及 MP4 索引提示 |
| 启动保护 | 清单失败、片段不可播放或启动较慢时有兜底处理 |

**保留已调好的播放节奏。** 本次版本移除了容易与欢迎音冲突的“点鼠标直接进入”复选框，保留未勾选时的现有行为；为欢迎音增加播放中的防重入与预览监听清理。

## 安装

需要已安装 DeepSeek Harness，并能在终端使用 `dsh` 命令。

### 从 GitHub 安装

```powershell
dsh plugin --profile desktop add github:BEIDAOU/dsh-boot-animation-custom
```

安装完成后，**完整退出并重新打开 Harness**。在 **设置 → 启动动画** 中配置；部分 DSH 版本也会在插件配置页显示同一张控制卡片。

### 使用打包文件安装

下载发布包 `dsh-boot-animation-custom-0.3.1.tgz`，然后执行：

```powershell
dsh plugin --profile desktop add "C:\path\to\dsh-boot-animation-custom-0.3.1.tgz"
```

命令行 Web profile 用户可将 `desktop` 替换为自己的 profile 名称。

> 请通过插件管理命令安装，使包同时登记到依赖与 bundle 清单。不要仅把文件夹临时塞进 `node_modules`，否则后续包管理操作可能将它清理。

## 声音说明

- **播放影片声音**：沿用原有整体静音行为；关闭时欢迎音也不播放。
- **播放欢迎语**：仅控制额外添加的欢迎音，不删除视频原声里的内容。
- `1.mp4` 已内置欢迎语，沿用特殊处理，不叠加独立欢迎音。
- 浏览器 / Electron 的自动播放策略可能要求先点击；插件不会自行修改系统声音权限或应用启动参数。

## 适配情况

- 已在 **Windows x64 + DeepSeek Harness 0.2.1-rc.2** 的本机桌面环境验证启动。
- Node.js 要求：`^22.19.0 || >=24.0.0`，通常由 Harness 自带运行时提供。
- macOS、Linux 及其他 Harness 版本尚未实机验证，不承诺相同行为。

## 开发与自检

```bash
npm install --ignore-scripts
npm run build
npm test
npm run check
```

`src/client.js` 是设置界面源码，`lib/client.js` 是构建产物。修改设置界面后需重新构建；修改 `entry.js` 后需重启 Harness。`src/boot-screen.js` 在加载启动页时重新读取。

## 卸载

```powershell
dsh plugin --profile desktop remove dsh-boot-animation-custom
```

然后完整退出并重新打开 Harness。卸载前可备份自己添加的视频素材。

## 版本与许可

当前版本 **0.3.1**，变化见 [CHANGELOG.md](CHANGELOG.md)。

代码沿用上游 **MIT** 许可。上游明确按 MIT 分发的 3 段视频保留原声明；其他视频及欢迎音单独列在 [CREDITS.md](CREDITS.md)，不因本仓库代码采用 MIT 而自动获得相同许可。本项目与 DeepSeek 或上游作者不存在官方背书关系。
