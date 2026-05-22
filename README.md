# Starry Nexus Official Website

这是 Starry Nexus 官方网站的可部署静态站点快照。

线上地址：https://www.starrynexus.com/

## 网站内容

Starry Nexus 是一支来自上海的男女双主唱前卫后核乐队。网站包含乐队简介、现场照片、演出海报、已发布作品、成员介绍、官方社媒链接和演出合作联系方式。

## 本地预览

可以直接打开 `index.html` 做快速预览，也可以在当前目录启动静态文件服务：

```bash
python -m http.server 8080
```

然后访问：

```text
http://localhost:8080
```

## 文件说明

- `index.html`：官网首页入口，包含已生成的 SEO head 信息。
- `site.config.js`：公开站点内容配置。
- `styles*.css`：页面样式。
- `ui*.js`、`main*.js`：前端交互和内容渲染逻辑。
- `assets/`：站点使用的图片、图标、下载文件和优化后的媒体资源。
- `sitemap.xml`：公开首页和核心图片的 sitemap。
- `robots.txt`：爬虫规则和 sitemap 声明。
- `llms.txt`：供 AI 系统理解站点内容的摘要和重要链接。

带时间戳的 CSS、JavaScript 文件是首页当前引用的版本化资源，用于降低浏览器继续使用旧缓存的概率。

## 搜索与分享

当前站点已经包含：

- canonical URL、标题、描述、关键词等基础 SEO 信息；
- Open Graph 分享信息；
- 乐队、网站、首页和公开成员资料的 JSON-LD 结构化数据；
- `sitemap.xml`、`robots.txt`、`llms.txt` 等搜索和引用辅助文件。

## 开发说明

这个仓库公开的是可直接部署的静态产物。内容配置集中在 `site.config.js`，页面不依赖后端服务即可运行。

## 授权说明

源码授权范围以仓库中实际提供的开源许可声明为准。乐队名称、Logo、照片、演出海报、音乐封面、PDF 和社交平台素材等内容资源，除非另有明确说明，不会因为源码公开而自动获得复用授权。
