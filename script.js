
// PAGE NAVIGATION
const navLinks = document.querySelectorAll(".nav-link");
const pageSections = document.querySelectorAll(".page-section");

function showPage(targetId) {

    pageSections.forEach(section => {
        section.classList.remove("active");
    });

    navLinks.forEach(link => {
        link.classList.remove("active");
    });

    const targetSection = document.getElementById(targetId);

    if (targetSection) {
        targetSection.classList.add("active");
    }

    const activeLink = document.querySelector(
        `.nav-link[href="#${targetId}"]`
    );

    if (activeLink) {
        activeLink.classList.add("active");
    }
}

navLinks.forEach(link => {
    link.addEventListener("click", function(event) {

        event.preventDefault();

        const targetId = this.getAttribute("href").substring(1);

        showPage(targetId);

    });
});

// DASHBOARD CARD LINKS
document.querySelectorAll('a[href="#profile"], a[href="#device"]').forEach(link => {

    link.addEventListener("click", function(event) {

        event.preventDefault();

        const targetId = this.getAttribute("href").substring(1);

        showPage(targetId);

    });

});

const profileForm = document.getElementById("profileForm");

function displayProfile(user) {
    document.getElementById("previewName").textContent = user.name;
    document.getElementById("previewAvatar").textContent =
        user.name.charAt(0).toUpperCase();

    document.getElementById("previewAge").textContent =
        user.age + (Number(user.age) === 1 ? " year old" : " years old");

    document.getElementById("previewLanguage").textContent = user.language;

    document.getElementById("previewPreferences").textContent =
        user.preferences || "Not added";

    document.getElementById("profileStatus").textContent = "Profile saved";
}

if (profileForm) {
    profileForm.addEventListener("submit", function(event) {
        event.preventDefault();

        const user = {
            name: document.getElementById("userName").value.trim(),
            age: document.getElementById("userAge").value,
            language: document.getElementById("userLanguage").value,
            preferences: document.getElementById("userPreferences").value.trim()
        };

        localStorage.setItem("careRingUser", JSON.stringify(user));
        displayProfile(user);

        alert("Profile saved successfully!");
    });
}

const savedProfile = localStorage.getItem("careRingUser");

if (savedProfile) {
    try {
        const user = JSON.parse(savedProfile);

        document.getElementById("userName").value = user.name || "";
        document.getElementById("userAge").value = user.age || "";
        document.getElementById("userLanguage").value = user.language || "";
        document.getElementById("userPreferences").value =
            user.preferences || "";

        displayProfile(user);
    } catch (error) {
        console.error("Error loading profile:", error);
    }
}
