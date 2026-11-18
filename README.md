# StyleMate Web

StyleMate 是一个以个人数字衣橱为基础的 Web 穿搭助手。

项目将逐步实现衣物管理、搭配组合、社区分享，以及调用现有 AI API 完成衣物识别和搭配建议。

## 当前阶段

- `v0.1.0`：初始化 Web 项目工程
- `feat/auth-wardrobe`：用户表迁移与可审核的前端页面 Demo（开发中）

## 本地启动

Windows 上可以在 `web` 文件夹双击 `start-local.cmd`：脚本会检查已安装的依赖、更新本地数据库、启动前后端，并打开浏览器。结束测试时双击 `stop-local.cmd`。重复双击启动不会重复开服务。运行记录和日志保存在被 Git 忽略的 `.local-run/`，脚本只停止它自己启动的进程。首次使用仍需先安装下述前后端依赖。

先在 `backend` 文件夹安装 `requirements-dev.txt`、执行 `python -m alembic -c alembic.ini upgrade head`，再运行 `python -m uvicorn app.main:app --reload`。后端默认使用 `backend/stylemate.db`；生产环境需在仓库根目录的 `.env` 设置至少 32 字符的 `AUTH_SECRET_KEY`。

另开终端，在 `frontend` 文件夹运行 `npm install`（首次）和 `npm run dev`，打开终端显示的本地地址。开发服务器会把 `/api` 请求转发给本机 8000 端口的后端。

网页右上角可注册、登录；“我的资料”可以修改账号昵称与退出。用户名为 3–30 位字母、数字或下划线，密码至少 8 位。游客可浏览社区，发布穿搭需要登录。

Demo 可录入单件衣物或整套穿搭（整套照片或至少两件衣橱单品），用颜色、品类、季节关键词搜索搭配。穿搭广场分为“我的穿搭”和“社区穿搭”，支持关键词检索；点进任意穿搭会打开独立的左右对比界面。账号与昵称、公开发布的穿搭保存在后端；同一后端服务上的其他账号可浏览发布内容和图片。私人衣橱和未发布的穿搭仍保存在当前浏览器，不跨设备同步。单张图片限 1 MB。旧版仅保存在浏览器的“已发布”穿搭需要打开详情后重新发布。商品图入口需要手动选择标签；云端部署和 AI 尚未接入。

游客演示含 33 件四季衣物和 13 套示例穿搭。注册账号从空衣橱开始；旧账号中未修改的演示衣物会一次性清理，个人录入或修改过的衣物保留。衣橱、搭配选择和录入整套穿搭时的衣物列表可按品类展开或收起。搭配推荐可同时选择多件衣物，结果必须包含全部选中单品；季节或基础品类冲突会提示调整。对比页右侧既可按来源、季节、衣物品类和关键词筛选已有整套，也可从当前衣橱即时自定义一套进行实时对比；临时组合不会自动保存。

“智能搭配”还会从当前衣橱挑选真实单品，按季节、完整穿搭结构和类别搭配统计生成候选。类别统计由 [Polyvore Dataset](https://github.com/xthan/polyvore-dataset) 的训练集整理而来，参考 Han 等人 2017 年的 *Learning Fashion Compatibility with Bidirectional LSTMs*。这里仅保存 [轻量统计](frontend/src/data/compatibility.json) 和 [转换脚本](backend/scripts/build_outfit_priors.py)；原始数据、图片不上传，也不作为网站运行时依赖。类别共同出现的频率只用于排序，不代表审美判断或 AI 识图。

如需重新生成统计：从上述数据集下载 `polyvore.tar.gz` 和 `category_id.txt` 到 `backend/data/raw/`，在仓库根目录运行 `python backend/scripts/build_outfit_priors.py backend/data/raw/polyvore.tar.gz backend/data/raw/category_id.txt frontend/src/data/compatibility.json`。

验证：在 `backend` 文件夹运行 `python -m unittest discover -s tests -v`；在 `frontend` 文件夹运行 `npm test` 和 `npm run build`。

