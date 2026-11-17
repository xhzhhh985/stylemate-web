# StyleMate Web

StyleMate 是一个以个人数字衣橱为基础的 Web 穿搭助手。

项目将逐步实现衣物管理、搭配组合、社区分享，以及调用现有 AI API 完成衣物识别和搭配建议。

## 当前阶段

- `v0.1.0`：初始化 Web 项目工程
- `feat/auth-wardrobe`：用户表迁移与可审核的前端页面 Demo（开发中）

## 本地启动

先在 `backend` 文件夹安装 `requirements-dev.txt`、执行 `python -m alembic -c alembic.ini upgrade head`，再运行 `python -m uvicorn app.main:app --reload`。后端默认使用 `backend/stylemate.db`；生产环境需在仓库根目录的 `.env` 设置至少 32 字符的 `AUTH_SECRET_KEY`。

另开终端，在 `frontend` 文件夹运行 `npm install`（首次）和 `npm run dev`，打开终端显示的本地地址。开发服务器会把 `/api` 请求转发给本机 8000 端口的后端。

网页右上角可注册、登录；“我的资料”可以修改账号昵称与退出。用户名为 3–30 位字母、数字或下划线，密码至少 8 位。游客可浏览演示内容，发布到本机演示社区需要登录。

Demo 可录入单件衣物或整套穿搭（整套照片或至少两件衣橱单品），用颜色、品类、季节关键词搜索搭配。穿搭广场分为“我的穿搭”和“社区穿搭”，支持关键词检索；点进任意穿搭会打开独立的左右对比界面。账号与昵称保存在后端数据库；衣橱和穿搭仍只保存在当前浏览器，按游客或登录账号分开（单张图片限 1 MB），不会跨设备同步。其他用户看不到本机发布内容。商品图入口需要手动选择标签；云端存储、跨用户社区和 AI 尚未接入。

验证：在 `backend` 文件夹运行 `python -m unittest discover -s tests -v`；在 `frontend` 文件夹运行 `npm test` 和 `npm run build`。

