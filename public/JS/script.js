// DOM elements
const socket = io();
const input = document.querySelector('input');
const scanBtn = document.getElementById('scanBtn');
const cancelBtn = document.getElementById('cancelBtn');
const img = document.getElementById('preview');
const imgBack = document.getElementById('preview-img-back');
const skeleton = document.getElementById('skeleton');
const loaded = document.getElementById('loaded');
const err = document.getElementById('err');
const errText = document.getElementById('err-text');
const title = document.getElementById('title');
const expDate = document.getElementById('exp-date');
const productImg = document.getElementById('product-img');
const tag = document.getElementById('tag');
const dietaryInfo = document.getElementById('dietary-info');
const eco = document.getElementById('eco');
const child = document.getElementById('child');
const adult = document.getElementById('adult');
const elder = document.getElementById('elder');
const desc = document.getElementById('desc');
const sources = document.getElementById('sources');
let file = input.files[0];
let src = null;
let prevData = null;

// Feedback
document.getElementById('feedbackBtn').addEventListener('click', redirectToGmail);
function redirectToGmail() {
    var recipientEmail = 'doodlemessage@gmail.com';
    var subject = 'Feedback';
    var body = '';
    // Construct the mailto link
    var mailtoLink = 'mailto:' + recipientEmail + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    // Redirect to Gmail
    window.location.href = mailtoLink;
}

// Event listeners
scanBtn.addEventListener('click', async () => {
    if (!file) {
        input.click();
    } else if (file) {
        sendFile(file, file.type);
        uiAndValChanges();
        // Hide input section and display scanning progress
        document.querySelector('section').classList.add('hidden');
        document.getElementById('disc').classList.remove('hidden');
        document.getElementById('top_main').classList.add('animate-pulse');
        document.getElementById('top_head').classList.add('animate-pulse');
        scanBtn.querySelector('span').style.display = 'none';
        scanBtn.innerText = 'Scanning...';
        scanBtn.disabled = true;
        file = null;
    }
});

input.addEventListener('change', async () => {
    file = input.files[0];
    if (file) {
        img.src = URL.createObjectURL(file);
        img.classList.remove('hidden');
        scanBtn.innerHTML = `Scan <span class="ml-2 material-symbols-outlined">document_scanner</span>`;
        cancelBtn.classList.remove('hidden');
        imgBack.classList.add('backdrop-blur-lg');
        imgBack.classList.remove('hidden');
    }
});

cancelBtn.addEventListener('click', () => {
    file = null;
    uiAndValChanges();
    scanBtn.innerHTML = `Add Pic <span class="ml-2 material-symbols-outlined">add_photo_alternate</span>`;
});

// Functions
function uiAndValChanges() {
    imgBack.classList.remove('backdrop-blur-lg');
    imgBack.classList.add('hidden');
    input.value = '';
    img.src = '';
    img.classList.add('hidden');
    cancelBtn.classList.add('hidden');
}

function sendFile(file, type) {
    skeleton.classList.remove('hidden');
    loaded.classList.add('hidden');
    src = URL.createObjectURL(file);
    if (type == 'image/png' || type == 'image/jpeg' || type == 'image/webp' || type == 'image/hiec') {
        socket.emit('scan', ({ id, file, type }));
    } else {
        socket.emit('scan', ({ id, file, type: 'image/png' }));
    }
    removeData();
    file = null;
}

socket.on(id, (data) => {
    skeleton.classList.add('hidden');
    scanBtn.disabled = false;
    scanBtn.innerHTML = `Add Pic <span class="ml-2 material-symbols-outlined">add_photo_alternate</span>`;
    if (data.error != "null") {
        errText.innerText = data.error;
        err.classList.remove('hidden');
    } else {
        loaded.classList.remove('hidden');
        appendData(data);
    }
});

function appendData(data) {
    title.innerText = getCorrectData(data.title, 'Not Dectected');
    expDate.innerText = getCorrectData(data.expire_date, 'Not Dectected');
    productImg.src = src;
    tag.innerText = getCorrectData(data.tag, 'No Rating');
    dietaryInfo.innerText = getCorrectData(data.dietary_info, 'Not Identified')
    // Children
    if(data.age_groups && data.age_groups.Children) {
        const childInfo = data.age_groups.Children;
        child.querySelector('h4').innerText = getCorrectData(childInfo.tag, 'No Rating');
        child.querySelector('p').innerText = getCorrectData(childInfo.desc, 'No description');
    } else {
        child.querySelector('h4').innerText = 'N/A';
        child.querySelector('p').innerText = 'Not Available';
    }
    // Adults
    if(data.age_groups && data.age_groups.Adults) {
        const adultsInfo = data.age_groups.Adults;
        adult.querySelector('h4').innerText = getCorrectData(adultsInfo.tag, 'No Rating');
        adult.querySelector('p').innerText = getCorrectData(adultsInfo.desc, 'No description');
    } else {
        adult.querySelector('h4').innerText = 'N/A';
        adult.querySelector('p').innerText = 'Not Available';
    }
    // Elderly
    if(data.age_groups && data.age_groups.Elderly) {
        const elderInfo = data.age_groups.Elderly;
        elder.querySelector('h4').innerText = getCorrectData(elderInfo.tag, 'No Rating');
        elder.querySelector('p').innerText = getCorrectData(elderInfo.desc, 'No description');
    } else {
        elder.querySelector('h4').innerText = 'N/A';
        elder.querySelector('p').innerText = 'Not Available';
    }
    desc.innerText = getCorrectData(data.description, "No Description Available");
    createTable(data);
    appendSources(data.sources);
    coloring(data);
}

function removeData() {
    errText.innerText = '';
    err.classList.add('hidden');
    if (prevData == null || prevData.error != 'null') {
        prevData = null;
    } else {
        title.innerText = "";
        expDate.innerText = "";
        productImg.src = "";
        tag.innerText = "";
        dietaryInfo.innerText = "";
        child.querySelector('h4').innerText = "";
        child.querySelector('p').innerText = "";
        adult.querySelector('h4').innerText = "";
        adult.querySelector('p').innerText = "";
        elder.querySelector('h4').innerText = "";
        elder.querySelector('p').innerText = "";
        desc.innerText = "";
        removeTable();
        removeSources();
        removerColor();
    }
}

function createTable(data) {
    // Ingredients table
    if(data.ingredients_table != null && data.ingredients_table.length > 0) {
        for (let i = 0; i < data.ingredients_table.length; i++) {
            const newRow = document.createElement('tr');
            newRow.className += "odd:bg-white odd:dark:bg-gray-900 even:bg-gray-50 even:dark:bg-gray-800 border-b dark:border-gray-700";
            newRow.innerHTML = `
                <th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                    ${data.ingredients_table[i].name}
                </th>
                <td class="px-6 py-4">
                    ${data.ingredients_table[i].simplifiedName}
                </td>
                <td class="px-6 py-4">
                    ${data.ingredients_table[i].amountPerServing}
                </td>
            `;
            document.getElementById('table1').append(newRow);
        }
    }

    // Nutrients table
    if (data.nutritional_information != null && data.nutritional_information.length > 0) {
        document.getElementById('nutrition-caption').innerText = "Nutrition Facts " + data.nutritional_information[0].perAmount;
        for (let i = 1; i < data.nutritional_information.length; i++) {
            const newRow = document.createElement('tr');
            newRow.className += "odd:bg-white odd:dark:bg-gray-900 even:bg-gray-50 even:dark:bg-gray-800 border-b dark:border-gray-700";
            newRow.innerHTML = `
                <th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                    ${data.nutritional_information[i].name}
                </th>
                <td class="px-6 py-4">
                    ${data.nutritional_information[i].amount}
                </td>
            `;
            document.getElementById('table2').append(newRow);
        }
    }
}

function removeTable() {
    document.getElementById('nutrition-caption').innerText = '';
    document.getElementById('table1').innerHTML = '';
    document.getElementById('table2').innerHTML = '';
}

function appendSources(data) {
    for (const source of data) {
        const newSource = document.createElement('a');
        newSource.className = "mb-4 ms-2 inline-flex items-center justify-center p-3 text-base font-medium text-gray-500 rounded-full bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:bg-gray-900 dark:hover:bg-gray-800 dark:hover:text-blue-200";
        newSource.innerHTML = `<span class="material-symbols-outlined me-2 text-blue-800">captive_portal</span><span class="w-full">${source.name}</span>`;
        newSource.href = source.url;
        sources.appendChild(newSource);
    }
}

function removeSources() {
    sources.innerHTML = '';
}

function coloring(data) {
    prevData = data;
    const tagColor = getCorrectColor(data.tag);
    tag.classList.add(tagColor);
    prevData.tag = tagColor;

    const dietaryColor =  getCorrectColor(data.dietary_info);
    dietaryInfo.classList.add(dietaryColor);
    prevData.dietary_info = dietaryColor;

    const ecoColor = getCorrectColor(data.eco)+"-eco";
    eco.classList.add(ecoColor);
    prevData.eco = ecoColor;

    if(data.age_groups) {
        //child
        if(data.age_groups.Children) {
            const childInfo = data.age_groups.Children;
            const childColor = getCorrectColor(childInfo.tag);
            child.querySelector('h4').classList.add(childColor);
            prevData.age_groups.Children.tag = childColor;
        }

        //adult
        if(data.age_groups.Adults) {
            const adultsInfo = data.age_groups.Adults;
            const adultColor = getCorrectColor(adultsInfo.tag);
            adult.querySelector('h4').classList.add(adultColor);
            prevData.age_groups.Adults.tag = adultColor;
        }

        // elder
        if(data.age_groups.Elderly) {
            const elderInfo = data.age_groups.Elderly;
            const elderColor = getCorrectColor(elderInfo.tag);
            elder.querySelector('h4').classList.add(elderColor);
            prevData.age_groups.Elderly.tag = elderColor;
        }
    }
}

function removerColor() {
    tag.classList.remove(prevData.tag);
    dietaryInfo.classList.remove(prevData.dietary_info);
    eco.classList.remove(prevData.eco);

    //child
    if(prevData.age_groups) {
        if(prevData.age_groups.Children) {
            child.querySelector('h4').classList.remove(prevData.age_groups.Children.tag);
        }
            
        //adult
        if(prevData.age_groups.Adults) {
            adult.querySelector('h4').classList.remove(prevData.age_groups.Adults.tag);
        }

        //elder
        if(prevData.age_groups.Elderly) {
            elder.querySelector('h4').classList.remove(prevData.age_groups.Elderly.tag);
        }
    }
    prevData = null;
}

function getCorrectData(data, alt) {
    return data ? data : alt;
}

function getCorrectColor(data) {
    return data ? data.split(/[\/\s]+/).join('') : 'na';
}