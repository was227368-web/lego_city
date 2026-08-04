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

    // 1. الاستماع للتعليقات وعرضها مع خيار الحذف للصاحب
    const qComments = query(collection(db, "comments"), orderBy("timestamp", "desc"));
    onSnapshot(qComments, (snapshot) => {
        const list = document.getElementById('commentsList');
        const currentUser = JSON.parse(localStorage.getItem('lego_user'));

        if (list) {
            list.innerHTML = '';
            if(snapshot.empty) {
                list.innerHTML = `<p style="text-align:center; color:#888;">${translations[currentLang].noComments}</p>`;
            } else {
                snapshot.forEach((docSnap) => {
                    const data = docSnap.data();
                    const commentId = docSnap.id;
                    const isOwner = currentUser && (currentUser.email === data.userEmail);

                    const div = document.createElement('div');
                    div.className = 'comment-item';
                    div.style.display = 'flex';
                    div.style.alignItems = 'center';
                    div.style.justifyContent = 'space-between';
                    
                    const userPic = data.userPic || 'https://placehold.co/40x40?text=U';
                    div.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <img src="${userPic}" alt="صورة المستخدم" onerror="this.src='https://placehold.co/40x40?text=U'">
                            <div>
                                <strong style="color:var(--primary);">${data.userName || translations[currentLang].member}</strong>
                                <p style="margin-top: 3px;">${data.text}</p>
                            </div>
                        </div>
                        ${isOwner ? `<button onclick="window.deletePublicComment('${commentId}')" style="background: transparent; border: none; color: #ff4d4d; cursor: pointer; font-size: 16px; padding: 5px;" title="حذف التعليق">🗑️</button>` : ''}
                    `;
                    list.appendChild(div);
                });
            }
        }
    }, (error) => {
        console.error("خطأ جلب التعليقات:", error);
    });

    // 2. الاستماع لمعرض الصور وعرضه مع خيار الحذف للصاحب
    const qImages = query(collection(db, "gallery"), orderBy("timestamp", "desc"));
    onSnapshot(qImages, (snapshot) => {
        const gallery = document.getElementById('publicGallery');
        const currentUser = JSON.parse(localStorage.getItem('lego_user'));

        if (gallery) {
            gallery.innerHTML = '';
            if(snapshot.empty) {
                gallery.innerHTML = `<p style="text-align:center; color:#888; grid-column: 1/-1;">${translations[currentLang].emptyLibraryMsg}</p>`;
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
                        <img src="${imgUrl}" alt="تصميم" onclick="window.zoomImage('${imgUrl}')" onerror="this.src='https://placehold.co/800x400?text=Image+Error'">
                        <div class="card-title">${translations[currentLang].byUser} ${data.userName || translations[currentLang].member} 🧩</div>
                        ${isOwner ? `<button onclick="event.stopPropagation(); window.deletePublicProject('${projectId}')" style="position: absolute; top: 10px; right: 10px; background: rgba(255,0,0,0.8); color: white; border: none; border-radius: 50%; width: 32px; height: 32px; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center;" title="حذف المشروع">🗑️</button>` : ''}
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

    // 3. نشر التعليق على الفايربيس
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

    // 4. حذف التعليق من الفايربيس
    window.deletePublicComment = async function(commentId) {
        const confirmDelete = confirm(currentLang === 'ar' ? 'هل أنت تأكد من رغبتك في حذف هذا التعليق؟' : 'Are you sure you want to delete this comment?');
        if (confirmDelete) {
            try {
                await deleteDoc(doc(db, "comments", commentId));
                alert(currentLang === 'ar' ? 'تم حذف التعليق بنجاح!' : 'Comment deleted successfully!');
            } catch (err) {
                console.error("خطأ حذف التعليق:", err);
                alert(currentLang === 'ar' ? 'فشل حذف التعليق!' : 'Failed to delete comment!');
            }
        }
    };

    // 5. رفع المشاريع مع تقليل حجم الصور
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

    // 6. حذف المشروع/الصورة من الفايربيس
    window.deletePublicProject = async function(projectId) {
        const confirmDelete = confirm(currentLang === 'ar' ? 'هل أنت تأكد من رغبتك في حذف هذا المشروع؟' : 'Are you sure you want to delete this project?');
        if (confirmDelete) {
            try {
                await deleteDoc(doc(db, "gallery", projectId));
                alert(currentLang === 'ar' ? 'تم حذف المشروع بنجاح!' : 'Project deleted successfully!');
            } catch (err) {
                console.error("خطأ حذف المشروع:", err);
                alert(currentLang === 'ar' ? 'فشل حذف المشروع!' : 'Failed to delete project!');
            }
        }
    };
</script>