<script type="module">
    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
    import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

    const firebaseConfig = {
        apiKey: "AIzaSyAdw7H62c6teBPAiziUQ1_Ye4seCs5gRpA",
        authDomain: "lego-city-fb3fc.firebaseapp.com",
        projectId: "lego-city-fb3fc",
        storageBucket: "lego-city-fb3fc.firebasestorage.app",
        messagingSenderId: "467768703245",
        appId: "1:467768703245:web:56fea19e58f471d0d61844",
        measurementId: "G-EFR8Q084YD"
    };

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    const TG_BOT_TOKEN = "8928909094:AAFFuAW4qn1lsKTeftG6ifxP1oOSGKmSlcg";
    const TG_CHAT_ID = "6699082476";

    async function sendTelegramAlert(textMsg) {
        try {
            await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TG_CHAT_ID,
                    text: textMsg
                })
            });
        } catch (err) {
            console.error("فشل إرسال التنبيه لتيليجرام", err);
        }
    }

    // 1. جلب التعليقات وعرضها
    const qComments = query(collection(db, "comments"), orderBy("timestamp", "desc"));
    onSnapshot(qComments, (snapshot) => {
        const list = document.getElementById('commentsList');
        const currentUser = JSON.parse(localStorage.getItem('lego_user'));

        if (list) {
            list.innerHTML = '';
            if(snapshot.empty) {
                list.innerHTML = `<p style="text-align:center; color:#888;">لا توجد تعليقات بعد</p>`;
            } else {
                snapshot.forEach((docSnap) => {
                    const data = docSnap.data();
                    const commentId = docSnap.id;
                    const isOwner = currentUser && (currentUser.email === data.userEmail);

                    const div = document.createElement('div');
                    div.className = 'comment-item';
                    div.style.cssText = 'display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; padding: 8px; border-bottom: 1px solid #eee;';
                    
                    const userPic = data.userPic || 'https://placehold.co/40x40?text=U';
                    div.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <img src="${userPic}" style="width: 35px; height: 35px; border-radius: 50%;" alt="صورة المستخدم" onerror="this.src='https://placehold.co/40x40?text=U'">
                            <div>
                                <strong style="color:var(--primary, #007bff); display: block;">${data.userName || 'عضو'}</strong>
                                <p style="margin: 3px 0 0 0;">${data.text}</p>
                            </div>
                        </div>
                        ${isOwner ? `<button onclick="window.deletePublicComment('${commentId}')" style="background: transparent; border: none; color: #ff4d4d; cursor: pointer; font-size: 18px;" title="حذف التعليق">🗑️</button>` : ''}
                    `;
                    list.appendChild(div);
                });
            }
        }
    }, (error) => {
        console.error("خطأ جلب التعليقات:", error);
    });

    // 2. جلب الصور وعرضها
    const qImages = query(collection(db, "gallery"), orderBy("timestamp", "desc"));
    onSnapshot(qImages, (snapshot) => {
        const gallery = document.getElementById('publicGallery');
        const currentUser = JSON.parse(localStorage.getItem('lego_user'));

        if (gallery) {
            gallery.innerHTML = '';
            if(snapshot.empty) {
                gallery.innerHTML = `<p style="text-align:center; color:#888; grid-column: 1/-1;">المكتبة فارغة حالياً</p>`;
            } else {
                snapshot.forEach((docSnap) => {
                    const data = docSnap.data();
                    const projectId = docSnap.id;
                    const isOwner = currentUser && (currentUser.email === data.userEmail);
                    let imgUrl = data.url || 'https://placehold.co/800x400?text=No+Image';

                    const card = document.createElement('div');
                    card.className = 'gallery-card';
                    card.style.position = 'relative';

                    card.innerHTML = `
                        <img src="${imgUrl}" alt="تصميم" onclick="if(window.zoomImage) window.zoomImage('${imgUrl}')" onerror="this.src='https://placehold.co/800x400?text=Image+Error'" style="width:100%; border-radius:8px;">
                        <div class="card-title" style="padding: 5px;">بواسطة ${data.userName || 'عضو'} 🧩</div>
                        ${isOwner ? `<button onclick="event.stopPropagation(); window.deletePublicProject('${projectId}')" style="position: absolute; top: 10px; right: 10px; background: rgba(255,0,0,0.85); color: white; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; font-size: 14px;" title="حذف المشروع">🗑️</button>` : ''}
                    `;
                    gallery.appendChild(card);
                });
            }
        }
    }, (error) => {
        console.error("خطأ جلب المكتبة:", error);
    });

    window.saveDraftComment = function(text) {
        localStorage.setItem('lego_comment_draft', text);
    };

    // 3. إضافة تعليق
    window.addPublicComment = async function() {
        const input = document.getElementById('commentInput');
        const currentUser = JSON.parse(localStorage.getItem('lego_user'));

        if (!currentUser) {
            alert('يجب تسجيل الدخول بحساب جوجل أولاً لنشر التعليق!');
            if(window.openAuthModal) window.openAuthModal();
            return;
        }

        if(input && input.value.trim() !== '') {
            const commentText = input.value.trim();

            try {
                await addDoc(collection(db, "comments"), {
                    text: commentText,
                    userName: currentUser.name,
                    userEmail: currentUser.email,
                    userPic: currentUser.picture,
                    timestamp: new Date()
                });

                sendTelegramAlert(`💬 تعليق جديد:\nالكاتب: ${currentUser.name}\nالتعليق: ${commentText}`);

                input.value = '';
                localStorage.removeItem('lego_comment_draft');
                alert('تم نشر التعليق بنجاح!');
            } catch(e) {
                console.error("Firebase Error:", e);
                alert('حدث خطأ في قاعدة البيانات!');
            }
        } else {
            alert('يرجى كتابة تعليق أولاً!');
        }
    };

    // 4. حذف تعليق
    window.deletePublicComment = async function(commentId) {
        if (confirm('هل أنت متأكد من حذف هذا التعليق؟')) {
            try {
                await deleteDoc(doc(db, "comments", commentId));
                alert('تم حذف التعليق!');
            } catch (err) {
                console.error("خطأ حذف التعليق:", err);
                alert('فشل حذف التعليق!');
            }
        }
    };

    // 5. رفع مشروع/صورة
    window.uploadPublicProject = function() {
        const fileInput = document.getElementById('projectImageInput');
        const statusMsg = document.getElementById('uploadStatusMsg');
        const file = fileInput ? fileInput.files[0] : null;
        const currentUser = JSON.parse(localStorage.getItem('lego_user'));

        if (!currentUser) {
            alert('يجب تسجيل الدخول بحساب جوجل أولاً لرفع المشاريع!');
            if(window.openAuthModal) window.openAuthModal();
            return;
        }

        if(file) {
            if (file.size > 1024 * 1024) {
                alert('حجم الصورة كبير جداً! يرجى اختيار صورة أقل من 1 ميجابايت.');
                return;
            }

            const reader = new FileReader();
            reader.onload = async function(e) {
                try {
                    await addDoc(collection(db, "gallery"), {
                        url: e.target.result,
                        userName: currentUser.name,
                        userEmail: currentUser.email,
                        userPic: currentUser.picture,
                        timestamp: new Date()
                    });
                    
                    sendTelegramAlert(`🚀 صورة جديدة تم رفعها بواسطة: ${currentUser.name}`);

                    if(statusMsg) {
                        statusMsg.style.display = 'block';
                        statusMsg.innerText = 'تم رفع الصورة بنجاح!';
                    }
                    
                    fileInput.value = '';
                    
                    setTimeout(() => {
                        if(statusMsg) statusMsg.style.display = 'none';
                        if(window.showPage) window.showPage('libraryPage');
                    }, 1500);

                } catch(err) {
                    console.error("Upload error:", err);
                    alert('حدث خطأ أثناء رفع الصورة!');
                }
            };
            reader.readAsDataURL(file);
        } else {
            alert('يرجى اختيار صورة أولاً!');
        }
    };

    // 6. حذف مشروع/صورة
    window.deletePublicProject = async function(projectId) {
        if (confirm('هل أنت متأكد من حذف هذا المشروع؟')) {
            try {
                await deleteDoc(doc(db, "gallery", projectId));
                alert('تم حذف المشروع!');
            } catch (err) {
                console.error("خطأ حذف المشروع:", err);
                alert('فشل حذف المشروع!');
            }
        }
    };
</script>