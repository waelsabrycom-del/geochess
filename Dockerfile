FROM node:18-alpine

# يمنع Docker من استخدام الكاش القديم
ARG CACHEBUST=1

WORKDIR /app

# نسخ ملفات الحزم أولاً للاستفادة من الكاش
COPY package*.json ./

# تثبيت الحزم
RUN npm ci --omit=dev

# نسخ بقية المشروع
COPY . .

# إنشاء المجلدات المطلوبة
RUN mkdir -p database uploads/avatars logs

# متغيرات البيئة
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# تشغيل migration ثم السيرفر
CMD ["sh", "-c", "npm run migrate:pg && node server.js"]
