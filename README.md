# StyleMate Web

StyleMate 是一个以个人数字衣橱为基础的 Web 穿搭助手。

项目将逐步实现衣物管理、搭配组合、社区分享，以及调用现有 AI API 完成衣物识别和搭配建议。

## 当前阶段

- `v0.1.0`：初始化 Web 项目工程
- `feat/auth-wardrobe`：用户表迁移与可审核的前端页面 Demo（开发中）

## 本地启动

先在 `backend` 文件夹安装 `requirements-dev.txt`、执行 `python -m alembic -c alembic.ini upgrade head`，再运行 `python -m uvicorn app.main:app --reload`。后端默认使用 `backend/stylemate.db`；生产环境需在仓库根目录的 `.env` 设置至少 32 字符的 `AUTH_SECRET_KEY`。

另开终端，在 `frontend` 文件夹运行 `npm install`（首次）和 `npm run dev`，打开终端显示的本地地址。开发服务器会把 `/api` 请求转发给本机 8000 端口的后端。

网页右上角可注册、登录；“我的资料”可以修改账号昵称与退出。用户名为 3–30 位字母、数字或下划线，密码至少 8 位。游客可浏览社区，发布穿搭需要登录。

Demo 可录入单件衣物或整套穿搭（整套照片或至少两件衣橱单品），用颜色、品类、季节关键词搜索搭配。穿搭广场分为“我的穿搭”和“社区穿搭”，支持关键词检索；点进任意穿搭会打开独立的左右对比界面。账号与昵称、公开发布的穿搭保存在后端；同一后端服务上的其他账号可浏览发布内容和图片。私人衣橱和未发布的穿搭仍保存在当前浏览器，不跨设备同步。单张图片限 1 MB。旧版仅保存在浏览器的“已发布”穿搭需要打开详情后重新发布。商品图入口需要手动选择标签；云端部署和 AI 尚未接入。

“智能搭配”还会从当前衣橱挑选真实单品，按季节、完整穿搭结构和类别搭配统计生成候选。类别统计由 [Polyvore Dataset](https://github.com/xthan/polyvore-dataset) 的训练集整理而来，参考 Han 等人 2017 年的 *Learning Fashion Compatibility with Bidirectional LSTMs*。这里仅保存 [轻量统计](frontend/src/data/compatibility.json) 和 [转换脚本](backend/scripts/build_outfit_priors.py)；原始数据、图片不上传，也不作为网站运行时依赖。类别共同出现的频率只用于排序，不代表审美判断或 AI 识图。

如需重新生成统计：从上述数据集下载 `polyvore.tar.gz` 和 `category_id.txt` 到 `backend/data/raw/`，在仓库根目录运行 `python backend/scripts/build_outfit_priors.py backend/data/raw/polyvore.tar.gz backend/data/raw/category_id.txt frontend/src/data/compatibility.json`。

验证：在 `backend` 文件夹运行 `python -m unittest discover -s tests -v`；在 `frontend` 文件夹运行 `npm test` 和 `npm run build`。

