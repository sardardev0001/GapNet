# انتشار GapNet در GitHub — راهنمای فارسی

## قبل از انتشار

1. فایل `.env` از این بسته حذف شده است؛ اطلاعات اختصاصی سرورت را هرگز در GitHub منتشر نکن.
2. از تنظیمات `Settings → General → Default branch` برای `main` استفاده کن.
3. **پیشنهاد اولیه: مخزن Private** تا وقتی که تست Docker، احراز هویت و امنیت کامل شود؛ بعد می‌توانی Public کنی.
4. اگر قرار است پروژه واقعاً Open Source باشد، یک License مناسب انتخاب کن؛ گذاشتن کد در یک Repository عمومی به‌تنهایی مجوز استفاده مجدد نمی‌دهد.

## مسیر ساده: نصب GitHub CLI

[Git for Windows](https://git-scm.com/download/win) و [GitHub CLI](https://cli.github.com/) را نصب کن. سپس در PowerShell:

```powershell
cd D:\MY_PROJECT\GapNet\GapNet
# Only once: authenticate through GitHub's official browser flow.
gh auth login
# Create private repository and push main:
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Publish-To-GitHub.ps1 -Repository GapNet
```

برای ساخت مخزن **عمومی** (پس از بررسی فایل‌ها و انتخاب License)، `-Public` را اضافه کن:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Publish-To-GitHub.ps1 -Repository GapNet -Public
```

> اسکریپت بدون اجرای آن، هیچ تغییری در حساب GitHub تو ایجاد نمی‌کند؛ فقط بعد از اجرای آگاهانه دستور، Commit و Push انجام می‌دهد.

## مسیر دستی: Git + مرورگر

در [github.com/new](https://github.com/new) یک مخزن خالی با نام `GapNet` بساز. گزینه‌های ساخت README و `.gitignore` و License را در همان فرم فعال نکن؛ چون این فایل‌ها داخل بسته آماده شده‌اند.

```powershell
cd D:\MY_PROJECT\GapNet\GapNet
git init -b main
git add .
git status --short
git commit -m "chore: publish GapNet"
git remote add origin https://github.com/YOUR_USERNAME/GapNet.git
git push -u origin main
```

`YOUR_USERNAME` را با آیدی GitHub خودت جایگزین کن. برای اولین Commit، اگر Git نام و ایمیل خواست، با `git config --global user.name` و `git config --global user.email` آن‌ها را تنظیم کن.

## اگر قبلاً مخزن Git ساخته شده

با `git remote -v` وضعیت Remote را بررسی کن و به‌جای ساخت مخزن جدید، تغییرات را در همان مخزن Commit و Push کن. هیچ‌وقت برای رفع خطا بدون بررسی `--force` نزن.

## بعد از Push

- در تب **Actions** نتیجه سه دسته بررسی را مشاهده کن: repository / backend / frontend.
- تصویر طراحی در ابتدای README نمایش داده می‌شود.
- Description پیشنهادی: `Persian-first real-time messenger • React, Django, WebSocket, Electron • Minimal light RTL UI`
- Topics پیشنهادی: `react`, `typescript`, `django`, `websocket`, `electron`, `messaging`, `persian`, `rtl`, `docker`.
- در Settings → Security، گزینه **Private vulnerability reporting** را در صورت امکان فعال کن.
- پس از رفع ایرادها و تکمیل چک‌لیست، برای انتشار یک Release در GitHub یک Tag مانند `v2.0.0` بساز.
