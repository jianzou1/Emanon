## 核心特性

- **纯前端架构**：无需数据库与后端服务，静态文件托管即可部署
- **Markdown优先**：内置marked解析器，支持标准语法扩展
- **无刷新导航**：集成pjax实现平滑页面切换
- **复古UI**：基于98.css还原Windows 98系统视觉
- **多语言系统**：动态语言切换与文本本地化管理
- **配置驱动**：Excel表格驱动的内容管理，自动化生成JSON配置

## 技术架构

|     模块     | 技术方案 | 版本  |
| :----------: | :------: | :---: |
|   构建工具   | webpack  |  5.x  |
|   路由控制   |   pjax   | 0.2.8 |
| Markdown解析 |  marked  | 15.0+ |
|    UI框架    |  98.css  | 1.2.0 |
|    包管理    |   npm    | 7.0+  |

## 开始使用

### 一、入口文件

#### 1.1 main.js

- 通过`js/main.js`加载各个功能。

#### 1.2 导航栏配置

- 在`js/main.js`中修改`tabData`数组：

  ```
  const tabData = [
    { url: '/', text: 'tab_progress' },
    { url: '/page/article.html', text: 'tab_article' },
    // 其他菜单项...
  ];
  ```

### 二、配置表转换

- 本项目的设计方式与游戏设计的思路相似，想要实现文章、画廊、游戏列表甚至是多语言系统的内容修改，需要对Excel文件进行编辑，并将Excel文件转换为`.json`的程序可识别文件。

- **准备转换工具**
  - 解压缩配置文件包：`cfg/trans_table_tool_v1.2.zip`
- **配置项目路径**
  - 使用文本编辑器打开`git_diff_gen_json.sh`
  - 修改参数：`git_dir="/your/project/path"  # 替换为项目实际根目录路径`
- **执行转换**
  - 脚本将自动检查Excel文件差异变更，生成对应的JSON文件。

### 三、文章功能

#### 3.1 文章内容构建

- Markdown的文章列表存放在`post/_src`文件夹内，新增文章后，使用命令行运行`npm post`即可进行文章内容的构建。
  - 构建后会在`post`下新增一个与Markdown文件名一致的文章文件夹，为了增强可读性，Markdown文件名最好不要命名为中文。
  - 文章页面的`<title>`标签被定义为Markdown文件中的首行，注意填写。

#### 3.2 文章入口编辑

- 想要文章可见，请编辑`article_cfg`的以下字段：

  | 字段 |      描述      |       示例值       |
  | :--: | :------------: | :----------------: |
  |  id  | 排序ID（升序） |        1001        |
  | url  |   文章目录名   | 2023-tech-guide.md |
  | icon |   图标文件名   |    article.svg     |
  | name |    显示标题    |      技术指南      |

### 四、画廊功能

- 新增图片列表，请编辑`gallery_cfg`的以下字段：

  | 字段  | 备注                                       |
  | ----- | ------------------------------------------ |
  | id    | 用作排序，升序排列                         |
  | mark  | 相同的值会被归类到一起，视为单独的图片列表 |
  | url   | 图床链接                                   |
  | page  | 相同mark中，图片展示在第几页               |
  | title | 图片列表的标题名                           |

### 五、游戏列表功能

- 该功能也可以用作“观影记录”或是”读书笔记“等，请编辑`game_time_cfg`的以下字段：

  | 字段                | 备注                                                     |
  | ------------------- | -------------------------------------------------------- |
  | id                  | 用作排序，升序排列                                       |
  | name                | 名称                                                     |
  | sign                | 显示在时长前的标志                                       |
  | time                | 游戏时长                                                 |
  | type                | 游戏类型；可以在`typeName`中编辑类型名称                 |
  | isLoved             | 是否喜爱                                                 |
  | seriesTag           | 系列标签，同系列的会优先展示在一起                       |
  | spacialAchievements | 特殊成就，配置此值，列表会有下拉样式，展示该值字段的内容 |
  | quality             | 评级                                                     |
  | story               | 随机功能的描述内容                                       |

### 六、多语言系统

#### 6.1 新增语言

- 在`dailyPopup.html`的 `<select id="lang-switcher">`标签下新增指定`value`的语言，在`lang_cfg`也要有对应的多语字段。

#### 6.2 新增翻译条目

- 对任意页面的标签，新增`data-lang-id`属性，与`lang_cfg`配置表的主键一一对应，多语言功能在遍历到该属性后，会根据当前语言自动替换文本。

### 七、打包

#### 一、打包指令

- 运行`npm pack`进行生产环境打包，该指令会将`js`与`css`文件夹下的所有内容，根据入口文件在根目录生成`main.js`与`style.css`。

#### 二、热模块替换（HMR）

- 为了避免因`js`或`css`产生改动后需要预览，而产生的频繁打包需求，引入了检测本地差异并实时热更到浏览器的功能。运行`npm start`指令，即可开启浏览器预览热更服务。

