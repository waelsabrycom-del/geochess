#!/usr/bin/env node
const http = require('http');

function makeRequest(path, method, data) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (method === 'POST') {
            options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(data));
        }

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        body: JSON.parse(body)
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        body: body
                    });
                }
            });
        });

        req.on('error', reject);
        if (method === 'POST') {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function test() {
    console.log('\n=== اختبار Unique Constraint ===\n');
    
    try {
        // إنشاء المباراة الأولى
        console.log('📝 محاولة إنشاء المباراة الأولى...');
        const result1 = await makeRequest('/api/games/create', 'POST', {
            host_id: 1,
            game_name: 'معركة الصحراء',
            map_name: 'desert_map',
            map_size: 'large',
            game_settings: {}
        });
        
        console.log('الحالة:', result1.status);
        console.log('النتيجة:', JSON.stringify(result1.body, null, 2));
        
        if (result1.status === 201 && result1.body.success) {
            console.log('\n✅ نجح إنشاء المباراة الأولى!\n');
            
            // محاولة إنشاء مباراة بنفس الاسم (يجب أن تفشل)
            console.log('📝 محاولة إنشاء مباراة بنفس الاسم (يجب أن تفشل)...');
            const result2 = await makeRequest('/api/games/create', 'POST', {
                host_id: 1,
                game_name: 'معركة الصحراء',
                map_name: 'forest_map',
                map_size: 'medium',
                game_settings: {}
            });
            
            console.log('الحالة:', result2.status);
            console.log('النتيجة:', JSON.stringify(result2.body, null, 2));
            
            if (result2.status === 400 && !result2.body.success && result2.body.message.includes('مستخدم')) {
                console.log('\n✅✅ ممتاز! تم منع الإنشاء المكرر بنجاح!');
            } else {
                console.log('\n❌ فشل! لم يتم منع الإنشاء المكرر');
            }
            
            // محاولة إنشاء مباراة باسم مختلف (يجب أن تنجح)
            console.log('\n📝 محاولة إنشاء مباراة باسم مختلف (يجب أن تنجح)...');
            const result3 = await makeRequest('/api/games/create', 'POST', {
                host_id: 1,
                game_name: 'معركة الجبال',
                map_name: 'mountain_map',
                map_size: 'large',
                game_settings: {}
            });
            
            console.log('الحالة:', result3.status);
            console.log('النتيجة:', JSON.stringify(result3.body, null, 2));
            
            if (result3.status === 201 && result3.body.success) {
                console.log('\n✅ نجح إنشاء مباراة باسم مختلف!');
            } else {
                console.log('\n❌ فشل! لم يتم إنشاء مباراة باسم مختلف');
            }
            
        } else {
            console.log('\n❌ فشل إنشاء المباراة الأولى');
        }
        
    } catch (error) {
        console.error('❌ خطأ:', error.message);
    }
    
    process.exit(0);
}

// انتظر قليلاً ثم ابدأ الاختبار
setTimeout(test, 1000);
