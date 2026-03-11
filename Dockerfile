FROM node:18-alpine
ARG CACHEBUST=1
WORKDIR /app

# نسخ ملفات الحزم أولاً للاستفادة من كاش Docker
COPY package*.json ./

# تثبيت الحزم للإنتاج فقط
RUN npm ci --omit=dev

# نسخ ملفات المشروع
COPY . .

# إنشاء مجلدات مطلوبة
RUN mkdir -p database uploads/avatars logs

# تعيين المتغيرات
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# تشغيل الخادم
CMD ["node", "server.js"]
