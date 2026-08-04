<script type="module">
    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
    import { getFirestore, collection, addDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

    // 1. الاستماع للتعليقات وعرضها للحفظ الدائم
    const qComments = query(collection(db, "comments"), orderBy("timestamp", "desc"));
    onSnapshot(qComments, (snapshot) => {
        const list = document.getElementById('commentsList');
        if (list) {
            list.innerHTML = '';
            if(snapshot.empty) {
                list.innerHTML = `<p style="text-align:center; color:#888;">${translations[currentLang].noComments}</p>`;
            } else {
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    const div = document.createElement('div');
                    div.className = 'comment-item';
                    const userPic = data.userPic || 'https://placehold.co/40x40?text=U';
                    div.innerHTML = `
                        <img src="${userPic}" alt="صورة المستخدم" onerror="this.src='https://placehold.co/40x40?text=U'">
                        <div>
                            <strong style="color:var(--primary);">${data.userName || translations[currentLang].member}</strong>
                            <p style="margin-top: 3px;">${data.text}</p>
                        </div>
                    `;
                    list.appendChild(div);
                });
            }
        }
    }, (error) => {
        console.error("خطأ جلب التعليقات:", error);
    });

    // 2. الاستماع لمعرض الصور وعرضه
    const qImages = query(collection(db, "gallery"), orderBy("timestamp", "desc"));
    onSnapshot(qImages, (snapshot) => {
        const gallery = document.getElementById('publicGallery');
        if (gallery) {
            gallery.innerHTML = '';
            if(snapshot.empty) {
                gallery.innerHTML = `<p style="text-align:center; color:#888; grid-column: 1/-1;">${translations[currentLang].emptyLibraryMsg}</p>`;
            } else {
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    let imgUrl = data.url || 'https://placehold.co/800x400?text=No+Image';

                    const card = document.createElement('div');
                    card.className = 'gallery-card';
                    card.onclick = () => window.zoomImage(imgUrl);
                    card.innerHTML = `<img src="${imgUrl}" alt="تصميم" onerror="this.src='https://placehold.co/800x400?text=Image+Error'"><div class="card-title">${translations[currentLang].byUser} ${data.userName || translations[currentLang].member} 🧩</div>`;
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

    // 3. نشر التعليق على الفايربيس بشكل مؤكد
    window.addPublicComment = async function() {
        const input = document.getElementById('commentInput');
        const currentUser = JSON.parse(localStorage.getItem('lego_user'));

        if (!currentUser) {
            alert(currentLang === 'ar' ? 'يجب تسجيل الدخول بحساب جوجل أولاً لنشر التعليق!' : 'Please sign in with Google first to comment!');
            window.openAuthModal();
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

                sendTelegramAlert(`💬 تعليق جديد على الموقع:\n\nالكاتب: ${currentUser.name}\nالتعليق: ${commentText}`);

                input.value = '';
                localStorage.removeItem('lego_comment_draft');
                alert(currentLang === 'ar' ? 'تم نشر التعليق بنجاح وحفظه!' : 'Comment posted successfully!');
            } catch(e) {
                console.error("Firebase Error:", e);
                alert(currentLang === 'ar' ? 'حدث خطأ في قواعد الحماية (Rules) بالفايربيس!' : 'Firebase Security Rules Error!');
            }
        } else {
            alert(translations[currentLang].emptyAlert);
        }
    };

    // 4. رفع المشاريع مع تقليل حجم الصور
    window.uploadPublicProject = function() {
        const fileInput = document.getElementById('projectImageInput');
        const statusMsg = document.getElementById('uploadStatusMsg');
        const file = fileInput ? fileInput.files[0] : null;
        const currentUser = JSON.parse(localStorage.getItem('lego_user'));

        if (!currentUser) {
            alert(currentLang === 'ar' ? 'يجب تسجيل الدخول بحساب جوجل أولاً لرفع المشاريع!' : 'Please sign in with Google first to upload projects!');
            window.openAuthModal();
            return;
        }

        if(file) {
            // فحص حجم الملف (إذا كان أكبر من 1 ميجا)
            if (file.size > 1024 * 1024) {
                alert(currentLang === 'ar' ? 'حجم الصورة كبير جداً! يرجى اختيار صورة أقل من 1 ميجابايت.' : 'Image size is too large! Please choose an image under 1MB.');
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
                    
                    sendTelegramAlert(`🚀 مشروع/صورة جديدة تم رفعها في المكتبة!\n\nبواسطة: ${currentUser.name}`);

                    statusMsg.style.display = 'block';
                    statusMsg.className = 'success-alert';
                    statusMsg.innerText = translations[currentLang].uploadSuccessAlert;
                    
                    fileInput.value = '';
                    
                    setTimeout(() => {
                        statusMsg.style.display = 'none';
                        window.showPage('libraryPage');
                    }, 1500);

                } catch(err) {
                    console.error("Upload error:", err);
                    alert(currentLang === 'ar' ? 'حدث خطأ أثناء رفع الصورة! تأكد من قواعد الحماية في الفايربيس.' : 'Error uploading image!');
                }
            };
            reader.readAsDataURL(file);
        } else {
            alert(translations[currentLang].fileAlert);
        }
    };
</script>