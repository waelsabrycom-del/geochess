/**
 * نظام الزوم العام لجميع الصفحات
 * يسمح بالتكبير والتصغير مع الحفاظ على ثبات الـ headers والـ sidebars
 */

let globalZoomLevel = 1;

/**
 * تهيئة نظام الزوم على الصفحة
 * @param {string} contentSelector - محدد CSS للعنصر الرئيسي القابل للزوم (مثل '.chess-grid' أو '.content')
 */
function initializeZoom(contentSelector = '.content, .chess-grid, main') {
    const wheelHandler = (e) => {
        // منع الزوم تماماً إذا كان مفتاح Space مضغوط
        if(typeof isSpacePressed !== 'undefined' && isSpacePressed) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return;
        }
        
        // التحقق من أن المستخدم يضغط على Ctrl
        if (!e.ctrlKey) {
            return; // إذا لم يكن Ctrl مضغوط، لا تفعل شيء
        }

        // منع الـ zoom الافتراضي للصفحة
        e.preventDefault();
        e.stopPropagation();

        // البحث عن عناصر الـ content
        const contentElements = document.querySelectorAll(contentSelector);

        if (contentElements.length > 0) {
            const zoomSpeed = 0.1;

            // تحديث مستوى الـ zoom
            if (e.deltaY < 0) {
                globalZoomLevel += zoomSpeed; // Zoom In
            } else {
                globalZoomLevel = Math.max(0.05, globalZoomLevel - zoomSpeed); // Zoom Out (الحد الأدنى 5%)
            }

            // تطبيق الـ zoom على جميع عناصر الـ content
            contentElements.forEach((element) => {
                // لا تطبق زوم إذا كان مفتاح Space مضغوطاً
                if(typeof isSpacePressed !== 'undefined' && isSpacePressed) {
                    return;
                }
                
                // إذا كان العنصر يحتوي على transform بالفعل (مثل السحب)، احتفظ به
                const existingTransform = element.style.transform;
                if (existingTransform && existingTransform.includes('translate')) {
                    // استخراج القيم من translate الموجودة
                    const translateMatch = existingTransform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
                    if (translateMatch) {
                        const translateX = translateMatch[1];
                        const translateY = translateMatch[2];
                        element.style.transform = `translate(${translateX}px, ${translateY}px) scale(${globalZoomLevel})`;
                    } else {
                        element.style.transform = `scale(${globalZoomLevel})`;
                    }
                } else {
                    element.style.transform = `scale(${globalZoomLevel})`;
                }
                element.style.transformOrigin = 'center center';
                element.style.transition = 'transform 0.1s ease-out';
            });

            // عرض مستوى الـ zoom الحالي (اختياري)
            console.log(`Zoom Level: ${(globalZoomLevel * 100).toFixed(0)}%`);
        }
    };
    
    document.addEventListener('wheel', wheelHandler, { passive: false, capture: true });
}

/**
 * إعادة تعيين مستوى الـ zoom إلى الحالة الأصلية
 * @param {string} contentSelector - محدد CSS للعنصر الرئيسي
 */
function resetZoom(contentSelector = '.content, .chess-grid, main') {
    globalZoomLevel = 1;
    const contentElements = document.querySelectorAll(contentSelector);
    contentElements.forEach((element) => {
        element.style.transform = `scale(1)`;
        element.style.transition = 'transform 0.1s ease-out';
    });
    console.log('تم إعادة تعيين الـ zoom إلى 100%');
}
