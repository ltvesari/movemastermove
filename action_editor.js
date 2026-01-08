
/**
 * ==========================================================================================
 *                                  MOVEHERO - AKSİYON EDİTÖRÜ KILAVUZU
 * ==========================================================================================
 * 
 * Bu dosya, oyunun "Senaryosunu" yazar. Aşağıdaki `LEVEL_1_STEPS` listesine yeni aksiyonlar
 * ekleyerek oyunu uzatabilir, zorlaştırabilir veya yeni bir bölüm yaratabilirsiniz.
 * 
 * -------------------
 * MEVCUT AKSİYON TİPLERİ (LEGO PARÇALARI)
 * -------------------
 * 
 * 1. type: 'STEP' (Koşu / Yürüme)
 *    - Amacı: Oyuncuyu hareket ettirmek, nabzı yükseltmek.
 *    - Zorluk Ayarı: 'target' sayısını artırın. (Örn: 20 -> Kolay, 50 -> Orta, 100 -> Zor)
 *    - Örnek: { type: 'STEP', target: 50, instruction: "(Koş!)", icon: '🏃', story: "..." }
 * 
 * 2. type: 'SWING' (Kılıç Savurma - Sağa/Sola)
 *    - Amacı: Kol kaslarını çalıştırmak, seri hareket.
 *    - Zorluk Ayarı: 'target' sayısı.
 *    - Not: Oyuncuya "Sağ el" veya "Sol el" diye hikaye kısmında belirtmelisiniz.
 * 
 * 3. type: 'CHOP' (Kafadan Vuruş - Squat + Swing)
 *    - Amacı: Tüm vücut, çökme ve kalkma. Çok yorucudur.
 *    - Zorluk Ayarı: 'target' sayısını dikkatli artırın. (10 tane bile yorucudur).
 * 
 * 4. type: 'STEALTH' (Gizlilik / Donma)
 *    - Amacı: Kontrol ve denge. Nabzı düşürür ama bacakları yakar.
 *    - Zorluk Ayarı: 'target' (adım sayısı). Adım sayısı arttıkça "Donma" riski artar.
 *    - Mekanik: Her 5-10 adımda bir ejderha uyanır, oyuncu sabit durmalıdır.
 * 
 * 5. type: 'JUMP' (Zıplama - Reaksiyon)
 *    - Amacı: Ani patlayıcı güç ve refleks.
 *    - Süre: Oyuncunun 4 saniyesi vardır.
 *    - Zorluk Ayarı: 'target' (Kaç kere zıplayacağı).
 * 
 * 6. type: 'SHAKE' (Sallama - Hızlı Reaksiyon)
 *    - Amacı: Çok hızlı refleks ölçme.
 *    - Süre: Oyuncunun sadece 1 saniyesi vardır (Gecikme hakkı yok!).
 *    - Zorluk Ayarı: 'target' sayısı.
 * 
 * -------------------
 * ZİNCİRLEME AKSİYONLAR (COMBOS)
 * -------------------
 * Bazı hareketler "Bileşik" (Compound) olarak tasarlanır. Örneğin önce Sağ El, sonra Sol El.
 * Bunu yapmak için aksiyonları alt alta eklemeniz yeterlidir.
 * - Örnek: (ID:2 -> Sağ El Savur) hemen ardından (ID:3 -> Sol El Savur) gelir.
 * - Oyuncu bunu tek bir dövüş gibi hisseder ama teknik olarak iki ayrı adımdır.
 * 
 * -------------------
 * ZORLUK SEVİYESİ NASIL TASARLANIR?
 * -------------------
 * - Başlangıç (Bölüm 1-2): Düşük 'target' sayıları (10-20 adım, 5 vuruş). Bol bol 'STEP' araları.
 * - Orta (Bölüm 3-5): 'STEALTH' ve 'CHOP' mekanikleri eklenir. Reaksiyonlar artar.
 * - Zor (Bölüm 6+): 'JUMP' ve 'SHAKE' sayıları artar. Arka arkaya 'CHOP' konur.
 * 
 * -------------------
 * ZORUNLU BAŞLANGIÇ: İLK ADIM (START)
 * -------------------
 * - Oyunun ilk adımı (ID: 1) MUTLAKA `type: 'STEP'` olmalıdır.
 * - Bu adım oyuncunun sensörleri hazırlaması ve oyuna ısınması için zorunludur.
 * 
 * -------------------
 * ZORUNLU SON: KAZANMA ADIMI (WIN)
 * -------------------
 * - Oyunun en son adımı MUTLAKA `type: 'WIN'` olmalıdır.
 * - Bu adım (ID: 11 örneğindeki gibi) oyuncuya kazandığını söyler ve oyunu bitirir.
 * - Eğer bu adımı koymazsanız oyun sonsuz döngüde kalabilir veya hata verebilir.
 * 
 * ==========================================================================================
 */

window.LEVEL_1_STEPS = [
    {
        id: 1,
        type: 'STEP',
        story: "Ejderha zindanı yolundasın zindana ulaşmak için bar dolana kadar koş",
        instruction: "(Koşmaya Başla)",
        target: 30, // steps
        icon: '🏃'
    },
    // --- COMBO BAŞLANGICI (Kızıl Orklar) ---
    {
        id: 2,
        type: 'SWING',
        story: "Zindanın kapısında Kızıl orklar var önce onları yok etmeliyiz.<br>Kılıcını çek <b>*telefonu sağ eline al*</b> telefon titreyene kadar onları kılıçtan geçir",
        instruction: "(Savur!)",
        target: 10, // swings
        icon: '⚔️'
    },
    {
        id: 3, // Combo devamı (Sol El)
        type: 'SWING',
        story: "Yarısını yok ettin şimdi kılıcını <b>sol eline al</b> ve titreyene kadar onları kılıçtan geçir",
        instruction: "(Sol Elinle Savur!)",
        target: 10,
        icon: '⚔️'
    },
    // --- COMBO BİTİŞİ ---
    {
        id: 4,
        type: 'STEALTH',
        story: "İçeri girdin ileride kristal ejder uyuyor fakat uykusu çok hafif, sen adım attıkça kristal ejdere doğru yaklaşacaksın. <br><br>Eğer gözlerini açarsa hemen çökerek gözlerini kapatana kadar sessizce bekle. Yoksa YANARSIN!",
        instruction: "(Yürü... Göz Açılınca DON!)",
        target: 40,
        icon: '🤫'
    },
    {
        id: 5,
        type: 'CHOP',
        story: "Kristal Ejderin yanına geldin şimdi kılıcını kaldırıp bütün gücünle çökerek vur. <br><b>*telefonu fırlatma*</b> Kılıcın titreyene kadar vurmayı bırakma",
        instruction: "(Kafanın üstünden yere vur!)",
        target: 10,
        icon: '🔨'
    },
    {
        id: 6,
        type: 'JUMP',
        story: "Dikkat Ejder kuyruğuyla sana saldırmak üzere. Ekranda zıpla yazdığında geç kalmadan zıpla.",
        instruction: "(ZIPLA yazısını bekle...)",
        target: 5, // kaç kere zıplanacak?
        icon: '🦘'
    },
    {
        id: 7,
        type: 'CHOP',
        story: "Şimdi kılıcını kaldırıp bütün gücünle çökerek vur. <br><b>*telefonu fırlatma*</b> Kılıcın titreyene kadar vurmayı bırakma",
        instruction: "(Vur!)",
        target: 10,
        icon: '🔨'
    },
    {
        id: 8,
        type: 'SHAKE',
        story: "Ejder sersemledi. Fakat zindanın içinde gölge doğanlar belirdi.<br>Telefonu 2 elinle tut. Ekranda salla yazınca 1 kere salla. Gölge doğanlar hızlıdır çabuk reaksiyon vermelisin.<br>(Gecikme hakkın yok!)",
        instruction: "(SALLA yazınca salla!)",
        target: 8, // kaç kere sallanacak?
        icon: '📳'
    },
    {
        id: 9,
        type: 'JUMP',
        story: "Dikkat Ejder kuyruğuyla sana saldırmak üzere. Ekranda zıpla yazdığında geç kalmadan zıpla.",
        instruction: "(ZIPLA yazısını bekle...)",
        target: 5,
        icon: '🦘'
    },
    {
        id: 10,
        type: 'CHOP',
        story: "Şimdi kılıcını kaldırıp bütün gücünle çökerek vur. <br><b>*telefonu fırlatma*</b> Kılıcın titreyene kadar vurmayı bırakma",
        instruction: "(Bitir işini!)",
        target: 10,
        icon: '🔨'
    },
    {
        id: 11,
        type: 'WIN',
        story: "KAZANDIN! <br> Zindan temizlendi.",
        instruction: "Tebrikler kahraman.",
        target: 0,
        icon: '🏆'
    }
];
