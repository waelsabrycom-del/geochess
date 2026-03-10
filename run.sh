#!/bin/bash

# ملف تشغيل تلقائي للمشروع
# استخدام: في Windows اضغط نقرتين على الملف أو قم بتشغيل موجه الأوامر وأكتب: npm start

echo "🎮 شطرنج القائد الجغرافي"
echo "========================="
echo ""
echo "📦 التحقق من المكتبات..."

# التحقق من وجود node_modules
if [ ! -d "node_modules" ]; then
    echo "تثبيت المكتبات المطلوبة..."
    npm install
    echo ""
fi

echo "🚀 بدء الخادم..."
echo ""
echo "💡 نصائح:"
echo "   • الرابط: http://localhost:3000"
echo "   • اضغط Ctrl+C لإيقاف الخادم"
echo "   • افتح متصفحك وانتظر قليلاً"
echo ""
echo "🔌 الخادم يعمل..."
echo ""

npm start
